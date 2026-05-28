import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { initDatabase, get, run, query } from './database';
import { PrinterModule } from './PrinterModule';
import { generateRepairReceiptHTML, generateReceiptHTML } from './ReceiptTemplate';
import { SyncEngine } from './SyncEngine';
import { GuardianProtocol } from './GuardianProtocol';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente o mais cedo possível
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env') 
  : path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// --- CONFIGURAÇÃO DE PROTOCOLO DE IMAGEM ---
protocol.registerSchemesAsPrivileged([{ 
  scheme: 'local-img', 
  privileges: { standard: true, secure: true, supportFetchAPI: true } 
}]);

// --- CONTROLES DE JANELA ---
ipcMain.on('window-minimize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.minimize();
});
ipcMain.on('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});
ipcMain.on('window-close', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.close();
});
ipcMain.on('window-set-zoom', (e, factor) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) {
    win.webContents.setZoomFactor(factor);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200, height: 800, frame: false, titleBarStyle: 'hidden',
    webPreferences: { 
      nodeIntegration: false, 
      contextIsolation: true, 
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false 
    }
  });

  // Aplica o zoom salvo se existir
  get("SELECT value FROM settings WHERE key = 'app_zoom'").then(setting => {
    if (setting && setting.value) {
      const factor = parseFloat(setting.value);
      if (!isNaN(factor)) win.webContents.setZoomFactor(factor);
    }
  }).catch(() => {});

  if (!app.isPackaged) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'index.html'));
  }
}

app.whenReady().then(async () => {
  protocol.handle('local-img', async (request) => {
    const fileName = path.basename(decodeURIComponent(request.url.replace('local-img://', '')));
    
    // Lista de caminhos para busca local
    const possiblePaths = [
      path.join(app.getPath('userData'), 'product_images', fileName),
      path.join(app.getPath('userData'), 'repair_images', fileName),
      path.join(process.cwd(), fileName),
      path.join(process.cwd(), 'product_images', fileName),
      path.join(process.cwd(), 'public', fileName),
      path.join(process.cwd(), 'dist', 'client', fileName),
      path.join(__dirname, '..', 'public', fileName),
      path.join(__dirname, '..', 'renderer', fileName)
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString());
      }
    }

    // Fallback para Supabase se não achar local
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl && fileName && fileName !== 'undefined' && fileName !== 'null') {
      // Tenta em diferentes baldes e pastas
      const attempts = [
        { bucket: 'product-images', folder: 'products', dir: 'product_images' },
        { bucket: 'product-images', folder: 'users', dir: 'product_images' },
        { bucket: 'product-images', folder: 'library', dir: 'product_images' },
        { bucket: 'repair-images', folder: 'repairs', dir: 'repair_images' }
      ];

      for (const attempt of attempts) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${attempt.bucket}/${attempt.folder}/${fileName}`;
        try {
          const response = await net.fetch(publicUrl);
          if (response.ok) {
            // Salva localmente em segundo plano para futuras requisições
            const localTarget = path.join(app.getPath('userData'), attempt.dir, fileName);
            if (!fs.existsSync(path.dirname(localTarget))) fs.mkdirSync(path.dirname(localTarget), { recursive: true });
            
            response.clone().arrayBuffer().then(buffer => {
              fs.writeFile(localTarget, Buffer.from(buffer), (err) => {
                if (!err) console.log(`[IMAGE] Baixada e salva em ${attempt.dir}: ${fileName}`);
              });
            }).catch(() => {});

            return response;
          }
        } catch (e) {}
      }
    }
    
    return new Response('Not Found', { status: 404 });
  });

  await initDatabase();
  createWindow();
  SyncEngine.start();

  // Verifica atualizações 3 segundos após o boot
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 3000);
});

// --- PRODUTOS E ESTOQUE ---
ipcMain.handle('get-all-products', async (_, inc) => {
  const products = inc ? await query('SELECT * FROM products ORDER BY name ASC') : await query('SELECT * FROM products WHERE archived = 0 ORDER BY name ASC');
  const inventory = await query('SELECT * FROM inventory');
  for (const p of products) {
    p.stocks = {};
    p.minStocks = {};
    p.staleDays = {};
    const productInventory = inventory.filter((i: any) => i.product_id === p.id);
    for (const inv of productInventory) {
      p.stocks[inv.store_id] = inv.quantity;
      p.minStocks[inv.store_id] = inv.min_stock;
      p.staleDays[inv.store_id] = inv.sale_tolerance_days;
    }
  }
  return products;
});
ipcMain.handle('get-product-by-barcode', async (_, barcode) => await get('SELECT * FROM products WHERE barcode = ? OR extra_barcodes LIKE ?', [barcode, `%"${barcode}"%`]));

ipcMain.handle('upload-product-image', async (_, { barcode, base64Data }) => {
  try {
    const dir = path.join(app.getPath('userData'), 'product_images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return { success: false, error: 'Formato de imagem inválido' };

    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
    const fileName = `${barcode}_${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(matches[2], 'base64'));

    // Upload imediato para nuvem
    const cloudUrl = await SyncEngine.uploadProductImageToCloud(fileName);
    return { success: true, fileName: cloudUrl || fileName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('upload-library-image', async (_, { name, base64Data }) => {
  try {
    const dir = path.join(app.getPath('userData'), 'product_images'); // Reusa a pasta de produtos
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return { success: false, error: 'Formato de imagem inválido' };

    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `lib_${sanitizedName}_${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(matches[2], 'base64'));

    // Upload imediato para nuvem (reusa bucket de produtos)
    const cloudUrl = await SyncEngine.uploadProductImageToCloud(fileName);
    return { success: true, fileName: cloudUrl || fileName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('upload-user-photo', async (_, { userId, base64Data }) => {
  try {
    const dir = path.join(app.getPath('userData'), 'product_images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return { success: false, error: 'Formato de imagem inválido' };

    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
    const fileName = `user_${userId.substring(0,8)}_${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(matches[2], 'base64'));

    // Upload imediato para nuvem
    const cloudUrl = await SyncEngine.uploadUserPhotoToCloud(fileName);
    return { success: true, fileName: cloudUrl || fileName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('get-library-items', async () => await query('SELECT * FROM global_library ORDER BY created_at DESC'));

ipcMain.handle('save-library-item', async (_, item) => {
  const id = item.id || randomUUID();
  await run('INSERT OR REPLACE INTO global_library (id, name, image_url, category, synced) VALUES (?, ?, ?, ?, 0)',
    [id, item.name, item.image_url, item.category || 'GERAL']);
  return { success: true, id };
});

ipcMain.handle('upload-repair-image', async (_, { id, base64Data }) => {
  try {
    const dir = path.join(app.getPath('userData'), 'repair_images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return { success: false, error: 'Formato de imagem inválido' };
    
    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
    const fileName = `${id}_${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(dir, fileName), Buffer.from(matches[2], 'base64'));
    
    return { success: true, fileName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-manual-product', async (_, p) => {
  const id = p.id || randomUUID();
  await run(`INSERT OR REPLACE INTO products (id, barcode, name, price, cost_price, image, archived, synced, extra_barcodes) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [id, p.barcode, p.name.toUpperCase(), p.price, p.cost_price || 0, p.image || null, JSON.stringify(p.extra_barcodes || [])]);
  return { success: true, id };
});

ipcMain.handle('import-xml-products', async (_, xmlData, storeId) => {
  try {
    const parsed = GuardianProtocol.parseXML(xmlData, storeId);
    const validated = GuardianProtocol.validate(parsed);
    return await GuardianProtocol.bulkInsert(validated);
  } catch (e: any) {
    console.error('[IMPORT] Erro ao importar XML:', e);
    throw e;
  }
});
ipcMain.handle('update-inventory-quantity', async (_, { productId, storeId, quantity, minStock, saleToleranceDays }) => {
  const sId = storeId || '1';
  await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)', 
    [productId, sId, quantity, minStock ?? 2, saleToleranceDays ?? 30]);
  return { success: true };
});
ipcMain.handle('archive-product', async (_, { id, archived }) => {
  try {
    await run(`UPDATE products SET archived = ? WHERE id = ?`, [archived ? 1 : 0, id]);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// --- VENDAS ---
ipcMain.handle('save-sale', async (_, sale) => {
  try {
    const id = sale.id || randomUUID();
    await run(`INSERT INTO sales (id, total, payment_method, vendedor, store_id, customer_id, items, discount, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, sale.total, sale.payment_method, sale.vendedor, sale.store_id, sale.customer_id || null, JSON.stringify(sale.items), sale.discount || 0]);
    for (const item of sale.items) { 
      await run('UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND store_id = ?', [item.qtd, item.id, sale.store_id]); 
    }
    await run(`INSERT INTO financial_transactions (id, type, category, description, amount, payment_method, store_id, reference_id) VALUES (?, 'INFLOW', 'VENDA', ?, ?, ?, ?, ?)`,
      [randomUUID(), `VENDA PDV - ${sale.vendedor}`, sale.total, sale.payment_method, sale.store_id, id]);
    return { success: true, id };
  } catch (e: any) { return { success: false, error: e.message }; }
});

// --- TAREFAS E CLIENTES ---
ipcMain.handle('get-tasks', async () => await query('SELECT * FROM tasks ORDER BY created_at DESC'));

ipcMain.handle('save-task', async (_, task) => {
  try {
    const id = task.id || randomUUID();
    await run(`INSERT OR REPLACE INTO tasks (id, title, assignee_type, assignee_id, status, due_date, is_routine, proof_required, photo_proof, justification, completed_at, synced) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, task.title, task.assignee_type, task.assignee_id, task.status || 'pending', task.due_date, 
       task.is_routine ? 1 : 0, task.proof_required ? 1 : 0, task.photo_proof || null, task.justification || null, 
       task.completed_at || null]);
    return { success: true, id };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('delete-task', async (_, id) => {
  try {
    await run('DELETE FROM tasks WHERE id = ?', [id]);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('toggle-task', async (_, { id, status }) => {
  try {
    await run('UPDATE tasks SET status = ?, synced = 0 WHERE id = ?', [status, id]);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('complete-task', async (_, { id, photo, justification }) => {
  try {
    await run('UPDATE tasks SET status = ?, photo_proof = ?, justification = ?, completed_at = CURRENT_TIMESTAMP, synced = 0 WHERE id = ?',
      ['completed', photo || null, justification || null, id]);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});
ipcMain.handle('get-customers', async () => await query('SELECT * FROM customers ORDER BY name ASC'));
ipcMain.handle('get-sales-by-customer', async (_, customerId) => await query('SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC', [customerId]));
ipcMain.handle('get-repairs-by-customer', async (_, customerId) => {
  const customer = await get('SELECT phone FROM customers WHERE id = ?', [customerId]);
  if (!customer?.phone) return [];
  const cleanPhone = customer.phone.replace(/\D/g, '');
  return await query(`SELECT * FROM maintenance_orders 
    WHERE REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ? 
    ORDER BY created_at DESC`, [`%${cleanPhone}%`]);
});
ipcMain.handle('save-customer', async (_, c) => {
  const id = c.id || randomUUID();
  await run(`INSERT OR REPLACE INTO customers (id, name, phone, email, address, cpf, city, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [id, c.name.toUpperCase(), c.phone || '', c.email || '', c.address || '', c.cpf || '', c.city || 'ALMENARA', c.notes || '']);
  return { success: true, id };
});
ipcMain.handle('get-stores', async (_, inc) => inc ? await query('SELECT * FROM stores ORDER BY archived ASC, name ASC') : await query('SELECT * FROM stores WHERE archived = 0 ORDER BY name ASC'));
ipcMain.handle('save-store', async (_, store) => {
  const id = store.id || randomUUID();
  try {
    await run(`INSERT OR REPLACE INTO stores (id, name) VALUES (?, ?)`, [id, store.name.toUpperCase()]);
    return { success: true, id };
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) return { success: false, error: 'JÁ EXISTE UMA LOJA COM ESTE NOME' };
    return { success: false, error: err.message };
  }
});
ipcMain.handle('archive-store', async (_, { id, archived }) => {
  try {
    await run(`UPDATE stores SET archived = ? WHERE id = ?`, [archived ? 1 : 0, id]);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// --- CONFIGURAÇÕES E DASHBOARD ---
ipcMain.handle('get-settings', async () => await query('SELECT * FROM settings'));
ipcMain.handle('save-settings', async (_, s) => {
  for (const item of s) await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
  return { success: true };
});
ipcMain.handle('get-dashboard-stats', async () => {
  const sales = await get('SELECT SUM(total) as total FROM sales');
  const orders = await get('SELECT count(*) as count FROM maintenance_orders');
  const lowStock = await get('SELECT count(*) as count FROM inventory WHERE quantity <= min_stock');
  return { totalSales: sales?.total || 0, activeOrders: orders?.count || 0, lowStockItems: lowStock?.count || 0 };
});
ipcMain.handle('get-low-stock-items', async () => await query('SELECT p.name, i.quantity, i.min_stock FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.quantity <= i.min_stock LIMIT 10'));
ipcMain.handle('get-sync-status', async () => {
  const pS = await get('SELECT count(*) as count FROM sales WHERE synced = 0');
  const pP = await get('SELECT count(*) as count FROM products WHERE synced = 0');
  const pR = await get('SELECT count(*) as count FROM maintenance_orders WHERE synced = 0');
  return { pending: (pS?.count || 0) + (pP?.count || 0) + (pR?.count || 0), total: (await get('SELECT count(*) as count FROM sales'))?.count || 0 };
});
ipcMain.handle('get-financial-summary', async () => {
  const inflow = await get("SELECT SUM(amount) as total FROM financial_transactions WHERE type = 'INFLOW'");
  const outflow = await get("SELECT SUM(amount) as total FROM financial_transactions WHERE type = 'OUTFLOW'");
  
  // Busca o histórico unificado (Ledger)
  const ledger = await query(`
    SELECT id, date, description, category as type, amount as value, payment_method, type as trans_type 
    FROM financial_transactions 
    ORDER BY date DESC LIMIT 100
  `);

  return { 
    totalInflow: inflow?.total || 0, 
    totalOutflow: outflow?.total || 0, 
    ledger: ledger || [],
    trends: [] 
  };
});

ipcMain.handle('get-detailed-reports', async (_, filters: any) => {
  const { startDate, endDate, storeId, seller } = filters;
  let whereClauses = [];
  let params = [];

  if (startDate) {
    whereClauses.push('date(date) >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('date(date) <= ?');
    params.push(endDate);
  }
  if (storeId && storeId !== 'all') {
    whereClauses.push('store_id = ?');
    params.push(storeId);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Transações Financeiras (Inflow/Outflow)
  const transactions = await query(`
    SELECT * FROM financial_transactions 
    ${whereString} 
    ORDER BY date ASC
  `, params);

  // 2. Vendas Específicas (para filtros de vendedor)
  let salesWhere = [];
  let salesParams = [];
  if (startDate) { salesWhere.push('date(created_at) >= ?'); salesParams.push(startDate); }
  if (endDate) { salesWhere.push('date(created_at) <= ?'); salesParams.push(endDate); }
  if (storeId && storeId !== 'all') { salesWhere.push('store_id = ?'); salesParams.push(storeId); }
  if (seller && seller !== 'all') { salesWhere.push('vendedor = ?'); salesParams.push(seller); }

  const salesWhereString = salesWhere.length > 0 ? `WHERE ${salesWhere.join(' AND ')}` : '';
  const sales = await query(`
    SELECT * FROM sales 
    ${salesWhereString} 
    ORDER BY created_at ASC
  `, salesParams);

  // Consolidar resultados
  const totalInflow = transactions.filter((t: any) => t.type === 'INFLOW').reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalOutflow = transactions.filter((t: any) => t.type === 'OUTFLOW').reduce((sum: number, t: any) => sum + t.amount, 0);
  
  // Se houver filtro de vendedor, a receita vem apenas das vendas filtradas
  const sellerRevenue = seller && seller !== 'all' ? sales.reduce((sum: number, s: any) => sum + s.total, 0) : null;

  return {
    transactions,
    sales,
    summary: {
      totalInflow: sellerRevenue !== null ? sellerRevenue : totalInflow,
      totalOutflow,
      netProfit: (sellerRevenue !== null ? sellerRevenue : totalInflow) - totalOutflow
    }
  };
});

ipcMain.handle('get-expenses', async () => await query('SELECT e.*, c.name as category_name FROM expenses e LEFT JOIN expense_categories c ON e.category_id = c.id ORDER BY e.date DESC'));

ipcMain.handle('save-expense', async (_, exp: any) => {
  const id = exp.id || randomUUID();
  try {
    // 1. Salva na tabela de despesas detalhada
    await run(`INSERT OR REPLACE INTO expenses (id, description, category_id, value, date, payment_method, store_id, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, exp.description, exp.category_id, exp.value, exp.date || new Date().toISOString(), exp.payment_method, exp.store_id]);

    // 2. Salva na tabela de transações financeiras unificada (usada no resumo/ledger)
    const categoryName = await get('SELECT name FROM expense_categories WHERE id = ?', [exp.category_id]);
    await run(`INSERT INTO financial_transactions (id, type, category, description, amount, date, payment_method, store_id, reference_id)
      VALUES (?, 'OUTFLOW', ?, ?, ?, ?, ?, ?, ?)`,
      [id, categoryName?.name || 'OUTROS', exp.description, exp.value, exp.date || new Date().toISOString(), exp.payment_method, exp.store_id, id]);

    return { success: true };
  } catch (e: any) {
    console.error('[DATABASE] Erro ao salvar despesa:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-budgets', async () => await query('SELECT * FROM budgets'));

ipcMain.handle('save-budget', async (_, b: any) => {
  const id = b.id || randomUUID();
  await run(`INSERT OR REPLACE INTO budgets (id, category_id, amount, period) VALUES (?, ?, ?, ?)`, [id, b.category_id, b.amount, b.period]);
  return { success: true };
});

// --- IMPRESSÃO (TODOS OS HANDLERS) ---
ipcMain.handle('export-report-pdf', async (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false };

  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar Relatório em PDF',
    defaultPath: `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!filePath) return { success: false };

  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #334155; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; }
          .meta { font-size: 12px; color: #64748b; margin-top: 5px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .card { padding: 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .card-label { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; }
          .card-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; color: #94a3b8; padding: 12px; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .positive { color: #10b981; }
          .negative { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Relatório Financeiro Detalhado</div>
          <div class="meta">Período: ${data.filters.startDate} até ${data.filters.endDate} | Gerado em: ${new Date().toLocaleString()}</div>
        </div>
        <div class="summary">
          <div class="card">
            <div class="card-label">Receita Total</div>
            <div class="card-value positive">R$ ${data.summary.totalInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-label">Despesa Total</div>
            <div class="card-value negative">R$ ${data.summary.totalOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-label">Resultado Líquido</div>
            <div class="card-value">R$ ${data.summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Vendedor</th>
              <th>Pagamento</th>
              <th class="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${data.sales.map((s: any) => `
              <tr>
                <td>${new Date(s.created_at).toLocaleString()}</td>
                <td>${s.vendedor}</td>
                <td>${s.payment_method}</td>
                <td class="text-right positive">R$ ${s.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWin = new BrowserWindow({ show: false });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const pdf = await printWin.webContents.printToPDF({
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    pageSize: 'A4',
    printBackground: true
  });

  fs.writeFileSync(filePath, pdf);
  printWin.close();
  return { success: true, filePath };
});

ipcMain.handle('export-report-excel', async (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false };

  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar para Excel (CSV)',
    defaultPath: `Planilha_Vendas_${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (!filePath) return { success: false };

  // Cabeçalho e Dados
  let csvContent = "\ufeff"; // BOM para o Excel entender UTF-8 (acentos)
  csvContent += "Data/Hora;Vendedor;Forma Pagamento;Total (R$)\n";
  
  data.sales.forEach((s: any) => {
    const date = new Date(s.created_at).toLocaleString();
    const vendedor = s.vendedor.toUpperCase();
    const pgto = s.payment_method.toUpperCase();
    const total = s.total.toFixed(2).replace('.', ','); // Padrão brasileiro
    csvContent += `${date};${vendedor};${pgto};${total}\n`;
  });

  // Linhas de Resumo
  csvContent += `\nRESUMO FINANCEIRO\n`;
  csvContent += `Receita Total;R$ ${data.summary.totalInflow.toFixed(2).replace('.', ',')}\n`;
  csvContent += `Despesa Total;R$ ${data.summary.totalOutflow.toFixed(2).replace('.', ',')}\n`;
  csvContent += `Resultado Líquido;R$ ${data.summary.netProfit.toFixed(2).replace('.', ',')}\n`;

  fs.writeFileSync(filePath, csvContent);
  return { success: true, filePath };
});

ipcMain.handle('print-usb', async (_, { vid, pid, data }) => await PrinterModule.printUSB(vid, pid, data));
ipcMain.handle('test-printer', async () => await PrinterModule.printUSB(0x28E9, 0x0289, "TESTE DE IMPRESSAO\nOK!"));

ipcMain.handle('print-receipt', async (_, { sale, storeName }) => {
  return await PrinterModule.printUSB(0x28E9, 0x0289, { 
    type: 'SALE', storeName, items: sale.items.map((i:any) => ({name: i.nome, qtd: i.qtd, total: i.preco * i.qtd})), total: sale.total, id: sale.id?.substring(0,8)
  });
});
ipcMain.handle('print-repair-receipt', async (_, { repair, storeName, logo }) => {
  try {
    const html = generateRepairReceiptHTML(repair, storeName, logo);
    
    // Busca a impressora nas configurações
    const printerSetting = await get("SELECT value FROM settings WHERE key = 'printer_interface'");
    let printerName = '';
    
    if (printerSetting?.value?.startsWith('printer:')) {
      printerName = printerSetting.value.replace('printer:', '');
    }

    console.log(`[PRINT] IMPRESSÃO DIRETA ATIVADA: "${printerName || 'PADRÃO DO SISTEMA'}"`);

    const printWin = new BrowserWindow({ 
      show: false, 
      webPreferences: { 
        nodeIntegration: false,
        contextIsolation: true
      } 
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    // Aguarda o render
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Promise((resolve) => {
      printWin.webContents.print({
        silent: true, // SEMPRE SILENCIOSO
        printBackground: true,
        deviceName: printerName || undefined // Se vazio, usa a padrão do SO
      }, (success, failureReason) => {
        printWin.close();
        if (!success) {
          console.error('[PRINT] Falha na impressão direta:', failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          console.log('[PRINT] OS impressa com sucesso.');
          resolve({ success: true });
        }
      });
    });
  } catch (error: any) {
    console.error('[PRINT] Erro ao processar OS:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-printer-setup', async () => {
  const { exec } = require('child_process');
  const scriptPath = path.join(process.cwd(), 'setup-impressora.sh');
  return new Promise((resolve) => {
    exec(`chmod +x "${scriptPath}" && "${scriptPath}"`, async (error: any, stdout: string) => {
      if (!error) {
        const match = stdout.match(/Encontrada: ([0-9a-fA-F]+):([0-9a-fA-F]+)/);
        if (match) {
          await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['printer_interface', `USB:${match[1]}:${match[2]}`]);
          await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['printer_type', 'escpos']);
          try { await PrinterModule.printUSB(parseInt(match[1], 16), parseInt(match[2], 16), "SISTEMA ATIVADO\n" + new Date().toLocaleString()); } catch (e) {}
        }
      }
      resolve({ success: !error, output: stdout, error: error?.message });
    });
  });
});

// Outros
ipcMain.handle('login', async (_, { username, password }) => {
  console.log(`[LOGIN] Tentativa de login: ${username}`);
  if (!password || password.trim() === '') {
    console.warn(`[LOGIN] Bloqueado: Tentativa de login sem senha.`);
    return null;
  }
  const user = await get('SELECT id, name, role FROM users WHERE name = ? AND password = ?', [username, password]);
  if (user) {
    console.log(`[LOGIN] Sucesso: ${username}`);
    return user;
  } else {
    console.warn(`[LOGIN] Falha: ${username} - Senha incorreta ou usuário não encontrado.`);
    return null;
  }
});

ipcMain.handle('get-users', async () => await query('SELECT id, name, role, photo_url FROM users ORDER BY name ASC'));

ipcMain.handle('save-user', async (_, u) => {
  try {
    const id = u.id || randomUUID();
    await run(`INSERT OR REPLACE INTO users (id, name, password, role, photo_url) VALUES (?, ?, ?, ?, ?)`,
      [id, u.name, u.password, u.role || 'vendedor', u.photo_url || null]);
    return { success: true, id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});ipcMain.handle('get-expense-categories', async () => await query('SELECT * FROM expense_categories ORDER BY name ASC'));
ipcMain.handle('list-usb-devices', async () => {
  const usb = require('usb');
  return usb.getDeviceList().map((d: any) => ({ vendorId: d.deviceDescriptor.idVendor, productId: d.deviceDescriptor.idProduct }));
});
ipcMain.handle('get-app-title', async () => 'SDG CONTROLE');
ipcMain.handle('is-cloud-configured', async () => true);

ipcMain.handle('get-repairs', async () => await query('SELECT * FROM maintenance_orders ORDER BY created_at DESC'));

ipcMain.handle('get-repair-history', async (_, repairId) => {
  return await query('SELECT * FROM repair_history WHERE repair_id = ? ORDER BY created_at DESC', [repairId]);
});

ipcMain.handle('verify-user-password', async (_, { userName, password }) => {
  if (!password) return { success: false, error: 'Senha vazia!' };
  console.log(`[AUTH] Tentando validar: ${userName} com senha de ${password.length} dígitos`);
  // Busca pelo nome ignorando maiúsculas/minúsculas para evitar erros de digitação
  const user = await get('SELECT id, name FROM users WHERE UPPER(name) = UPPER(?) AND password = ?', [userName, password]);
  if (user) console.log(`[AUTH] Sucesso: ${user.name} autenticado.`);
  else console.log(`[AUTH] Falha: Usuário ou senha incorretos.`);
  return user ? { success: true, user } : { success: false, error: 'Senha incorreta!' };
});

ipcMain.handle('add-repair-log', async (_, { repairId, userId, userName, action, notes }) => {
  try {
    const id = randomUUID();
    await run(`INSERT INTO repair_history (id, repair_id, user_id, user_name, action, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, repairId, userId || 'USER', userName || 'SISTEMA', action, notes || null]);
    return { success: true };
  } catch (e: any) {
    console.error('[DATABASE] Erro ao adicionar log da OS:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('update-repair-status', async (_, { id, status, userName }) => {
  try {
    const actualName = userName || 'SISTEMA';

    await run('UPDATE maintenance_orders SET status = ?, updated_at = CURRENT_TIMESTAMP, synced = 0 WHERE id = ?', [status, id]);
    
    const logId = randomUUID();
    // Registra no histórico usando o nome que veio do frontend direto
    await run(`INSERT INTO repair_history (id, repair_id, user_id, user_name, action) VALUES (?, ?, ?, ?, ?)`,
      [logId, id, 'USER', actualName, `MUDOU STATUS PARA: ${status.toUpperCase()}`]);

    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('update-repair-notes', async (_, { id, notes, price, userName }) => {
  try {
    const actualName = userName || 'SISTEMA';

    await run('UPDATE maintenance_orders SET technical_notes = ?, price = ?, updated_at = CURRENT_TIMESTAMP, synced = 0 WHERE id = ?', [notes, price, id]);
    
    const logId = randomUUID();
    await run(`INSERT INTO repair_history (id, repair_id, user_id, user_name, action, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [logId, id, 'USER', actualName, 'ATUALIZOU NOTAS TECNICAS / ORÇAMENTO', `NOVO VALOR: R$ ${price}`]);

    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('update-repair-payment', async (_, { id, payment_status }) => {
  try {
    await run('UPDATE maintenance_orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP, synced = 0 WHERE id = ?', [payment_status, id]);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('save-repair', async (_, repair: any) => {
  try {
    const id = repair.id || randomUUID();
    await run(`INSERT OR REPLACE INTO maintenance_orders (
      id, customer_name, customer_phone, customer_phone_secondary, customer_email,
      device_brand, device_model, serial_number, device_password, visual_condition, 
      issue_description, technical_notes, checklist, priority, price, delivery_date, 
      entry_store_id, maintenance_store_id, return_store_id, current_store_id, status, photo_url, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`, 
      [
        id, repair.customer_name, repair.customer_phone, repair.customer_phone_secondary || '', repair.customer_email || '',
        repair.device_brand, repair.device_model, repair.serial_number || '', repair.device_password || '', repair.visual_condition || '', 
        repair.issue_description, repair.technical_notes || '', repair.checklist || '', 
        repair.priority || 'normal', repair.price || 0, repair.delivery_date || '',
        repair.entry_store_id, repair.maintenance_store_id, repair.return_store_id, repair.current_store_id || repair.entry_store_id,
        repair.status || 'Na Loja', repair.photo_url || null
      ]);
    return { success: true, id };
  } catch (e: any) { 
    console.error('[DATABASE] Erro ao salvar OS:', e);
    return { success: false, error: e.message }; 
  }
});

ipcMain.handle('get-printers', async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    return win ? await win.webContents.getPrintersAsync() : [];
  } catch (e) { return []; }
});

// --- CONTROLE DE CAIXA ---
ipcMain.handle('get-current-register', async (_, { storeId }) => {
  return await get("SELECT * FROM cash_registers WHERE store_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1", [storeId]);
});

ipcMain.handle('open-register', async (_, { storeId, userName, openingBalance }) => {
  const id = randomUUID();
  await run("INSERT INTO cash_registers (id, store_id, user_name, opening_balance, status) VALUES (?, ?, ?, ?, 'open')",
    [id, storeId, userName, openingBalance]);
  return { success: true, id };
});

ipcMain.handle('get-register-data', async (_, { storeId, openedAt }) => {
  // Busca vendas desde a abertura
  const sales = await query('SELECT total, payment_method, discount, items, vendedor FROM sales WHERE store_id = ? AND created_at >= ?', [storeId, openedAt]);
  const expenses = await query('SELECT value FROM expenses WHERE store_id = ? AND date >= ?', [storeId, openedAt]);

  const totals = {
    sales: sales.reduce((acc, s) => acc + s.total, 0),
    cash: sales.filter(s => s.payment_method === 'DINHEIRO').reduce((acc, s) => acc + s.total, 0),
    card: sales.filter(s => ['CREDITO', 'DEBITO', 'CARTAO'].includes(s.payment_method)).reduce((acc, s) => acc + s.total, 0),
    pix: sales.filter(s => s.payment_method === 'PIX').reduce((acc, s) => acc + s.total, 0),
    expenses: expenses.reduce((acc, e) => acc + e.value, 0),
    discounts: sales.reduce((acc, s) => acc + (s.discount || 0), 0)
  };

  // Agrupa produtos vendidos
  const productsMap: Record<string, { nome: string, qtd: number }> = {};
  // Agrupa vendas por vendedor
  const employeesMap: Record<string, number> = {};

  for (const s of sales) {
    employeesMap[s.vendedor] = (employeesMap[s.vendedor] || 0) + s.total;
    
    try {
      const items = JSON.parse(s.items);
      for (const item of items) {
        if (!productsMap[item.id]) {
          productsMap[item.id] = { nome: item.nome, qtd: 0 };
        }
        productsMap[item.id].qtd += item.qtd;
      }
    } catch(e) {}
  }

  // Pega os 5 produtos mais vendidos
  const topProducts = Object.values(productsMap)
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  const salesByEmployee = Object.entries(employeesMap).map(([name, total]) => ({ name, total }));

  return { totals, topProducts, salesByEmployee };
});

ipcMain.handle('close-register', async (_, { id, closingBalance, reportedBalance, totals, notes, storeId, userName }) => {
  try {
    // 1. Atualiza o status do caixa para fechado (Usando aspas simples para 'closed')
    await run(`UPDATE cash_registers SET 
      closed_at = CURRENT_TIMESTAMP, 
      closing_balance = ?, 
      reported_balance = ?, 
      total_sales = ?, 
      total_cash = ?, 
      total_card = ?, 
      total_pix = ?, 
      total_expenses = ?, 
      status = 'closed', 
      notes = ? 
      WHERE id = ?`, 
      [closingBalance, reportedBalance, totals.sales, totals.cash, totals.card, totals.pix, totals.expenses, notes, id]);

    // 2. Registra automaticamente a Retirada (Sangria) no financeiro se houver valor relatado
    const valRelatado = parseFloat(reportedBalance);
    if (!isNaN(valRelatado) && valRelatado > 0) {
      const transactionId = randomUUID();
      await run(`INSERT INTO financial_transactions (id, type, category, description, amount, payment_method, store_id, reference_id)
        VALUES (?, 'OUTFLOW', 'SANGRIA', ?, ?, 'DINHEIRO', ?, ?)`,
        [transactionId, `RETIRADA DE FECHAMENTO - OPERADOR: ${userName}`, valRelatado, storeId, id]);
    }

    return { success: true };
  } catch (e: any) {
    console.error('[DATABASE] Erro ao fechar caixa:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-register-history', async () => {
  return await query("SELECT * FROM cash_registers WHERE status = 'closed' ORDER BY closed_at DESC LIMIT 50");
});

// --- ATUALIZAÇÕES ---
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('[UPDATE] Atualização disponível:', info.version);
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[UPDATE] Download concluído:', info.version);
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-downloaded', info);
  
  dialog.showMessageBox({
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Uma nova versão foi baixada. O sistema será reiniciado para aplicar.',
    buttons: ['Reiniciar Agora']
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
