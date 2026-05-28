import { query, run, get } from './database';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Função auxiliar de log para o SyncEngine
const logSync = (msg: string) => {
  try {
    const LOG_FILE = path.join(app.getPath('userData'), 'error.log');
    const time = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[SYNC ${time}] ${msg}\n`);
  } catch (e) {}
};

export class SyncEngine {
  private static isSyncing = false;
  private static supabase: any = null;
  private static imagesDir: string = '';
  private static repairImagesDir: string = '';

  static init() {
    try {
      const envPath = app.isPackaged 
        ? path.join(process.resourcesPath, '.env') 
        : path.join(process.cwd(), '.env');
      
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        logSync(`Configuração carregada de ${envPath}`);
      }

      this.imagesDir = path.join(app.getPath('userData'), 'product_images');
      if (!fs.existsSync(this.imagesDir)) {
        fs.mkdirSync(this.imagesDir, { recursive: true });
        logSync(`Diretório criado: ${this.imagesDir}`);
      }

      this.repairImagesDir = path.join(app.getPath('userData'), 'repair_images');
      if (!fs.existsSync(this.repairImagesDir)) {
        fs.mkdirSync(this.repairImagesDir, { recursive: true });
        logSync(`Diretório criado: ${this.repairImagesDir}`);
      }
      
      const url = process.env.SUPABASE_URL || '';
      const key = process.env.SUPABASE_ANON_KEY || '';

      if (url && key && url !== 'SUA_URL_DO_SUPABASE_AQUI' && url !== '') {
        this.supabase = createClient(url, key);
        logSync('Cliente Supabase instanciado com sucesso.');
      } else {
        logSync('ERRO: Supabase não configurado ou chaves inválidas no .env. Sincronização em nuvem desativada.');
      }
    } catch (err: any) {
      logSync(`ERRO NA INICIALIZAÇÃO: ${err.message}`);
    }
  }

  static async start() {
    this.init();
    await this.pullFromCloud();

    setInterval(() => {
      if (!this.isSyncing) {
        this.pushToCloud();
        // Esperamos um pequeno delay antes de puxar, para dar tempo da nuvem processar o push
        setTimeout(() => this.pullFromCloud(), 5000);
      }
    }, 60000); // Aumentado para 60 segundos para maior estabilidade
    
    this.pushToCloud();
  }

  private static async downloadImageLocally(url: string, targetDir: string) {
    try {
      const fileName = path.basename(url.split('?')[0]);
      const filePath = path.join(targetDir, fileName);

      if (fs.existsSync(filePath)) return; // Já existe

      logSync(`[SUPER-SYNC] Baixando arquivo para cache local: ${fileName}`);
      const { net } = require('electron');
      const request = net.request(url);

      return new Promise((resolve, reject) => {
        request.on('response', (response) => {
          if (response.statusCode !== 200) {
            logSync(`[SUPER-SYNC] Erro no download (${fileName}): Status ${response.statusCode}`);
            resolve(false);
            return;
          }
          const chunks: any[] = [];
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(filePath, buffer);
            logSync(`[SUPER-SYNC] Arquivo baixado com sucesso: ${fileName}`);
            resolve(true);
          });
        });
        request.on('error', (err) => {
          logSync(`[SUPER-SYNC] Erro na rede ao baixar ${fileName}: ${err.message}`);
          resolve(false);
        });
        request.end();
      });
    } catch (err: any) {
      logSync(`[SUPER-SYNC] Falha ao processar download: ${err.message}`);
    }
  }

  static async pushToCloud() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      logSync('Iniciando PUSH total para a nuvem...');

      // 1. Sincronizar Lojas Pendentes
      const stores = await query('SELECT * FROM stores');
      if (stores.length > 0) {
        const payload = stores.map(s => ({
          id: s.id, 
          name: String(s.name).trim().toUpperCase(), 
          archived: s.archived == 1 ? 1 : 0 
        }));
        
        const { error: err } = await this.supabase.from('stores').upsert(payload);
        if (err) {
          console.error('[SYNC ERROR] Erro PUSH lojas:', err);
          logSync(`Erro PUSH lojas: ${err.message}`);
        } else {
          console.log('[SYNC SUCCESS] Lojas sincronizadas.');
        }
      }

      // 2. Sincronizar Usuários
      const users = await query('SELECT * FROM users');
      if (users.length > 0) {
        const payload = [];
        for (const u of users) {
          let cloudPhotoUrl = u.photo_url;
          if (u.photo_url && !u.photo_url.startsWith('http')) {
            const filePath = path.join(this.imagesDir, u.photo_url);
            if (fs.existsSync(filePath)) {
              const { error: uploadError } = await this.supabase.storage
                .from('product-images')
                .upload(`users/${u.photo_url}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });
              
              if (!uploadError) {
                const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`users/${u.photo_url}`);
                cloudPhotoUrl = publicUrl;
                await run('UPDATE users SET photo_url = ? WHERE id = ?', [cloudPhotoUrl, u.id]);
                logSync(`Foto do usuário ${u.name} sincronizada.`);
              } else {
                logSync(`Erro upload foto usuário ${u.name}: ${uploadError.message}`);
              }
            } else {
              logSync(`AVISO: Foto do usuário ${u.name} não encontrada localmente: ${u.photo_url}`);
            }
          }
          payload.push({ id: u.id, name: u.name, password: u.password, role: u.role, photo_url: cloudPhotoUrl });
        }

        const { error: err } = await this.supabase.from('users').upsert(payload);
        if (err) {
          logSync(`Erro PUSH usuários (DB): ${err.message}`);
        }
      }

      // 3. Sincronizar Configurações
      const settings = await query('SELECT * FROM settings');
      if (settings.length > 0) {
        const { error: err } = await this.supabase.from('settings').upsert(settings.map(s => ({
          key: s.key, 
          value: String(s.value || '')
        })));
        if (err) {
          console.error('[SYNC ERROR] Erro PUSH settings:', err);
          logSync(`Erro PUSH settings: ${err.message}`);
        } else {
          console.log('[SYNC SUCCESS] Configurações sincronizadas.');
        }
      }

      // 4. Sincronizar Produtos e Imagens
      const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
      for (const prod of pendingProducts) {
        await this.syncSingleProduct(prod);
      }

      // 5. Sincronizar Manutenções Pendentes
      const pendingRepairs = await query('SELECT * FROM maintenance_orders WHERE synced = 0');
      for (const repair of pendingRepairs) {
        await this.syncSingleRepair(repair);
      }

      // 6. Sincronizar Estoque (Inventory) - Agora com CHUNKING para evitar timeouts
      await this.syncInventoryInChunks();

      // 7. Sincronizar Vendas Pendentes
      const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
      for (const sale of pendingSales) {
        const success = await this.realCloudAPI(sale);
        if (success) await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
      }

      // 8. Sincronizar Clientes Pendentes (CRM)
      const pendingCustomers = await query('SELECT * FROM customers WHERE synced = 0');
      for (const customer of pendingCustomers) {
        const success = await this.syncSingleCustomer(customer);
        if (success) await run('UPDATE customers SET synced = 1 WHERE id = ?', [customer.id]);
      }

      // 9. Sincronizar Tarefas/Processos Pendentes
      const pendingTasks = await query('SELECT * FROM tasks WHERE synced = 0');
      for (const task of pendingTasks) {
        const success = await this.syncSingleTask(task);
        if (success) await run('UPDATE tasks SET synced = 1 WHERE id = ?', [task.id]);
      }

      // 10. Sincronizar Transações Financeiras Pendentes
      const pendingTransactions = await query('SELECT * FROM financial_transactions WHERE synced = 0');
      for (const trans of pendingTransactions) {
        const success = await this.syncSingleTransaction(trans);
        if (success) await run('UPDATE financial_transactions SET synced = 1 WHERE id = ?', [trans.id]);
      }

      // 11. Sincronizar Comissões
      const commissions = await query('SELECT * FROM commissions');
      if (commissions.length > 0) {
        await this.supabase.from('commissions').upsert(commissions.map(c => ({
          id: c.id, sale_id: c.sale_id, vendedor: c.vendedor, value: c.value, percentage: c.percentage, status: c.status, created_at: c.created_at
        })));
      }

      // 12. Sincronizar Biblioteca Global
      const pendingLibrary = await query('SELECT * FROM global_library WHERE synced = 0');
      for (const item of pendingLibrary) {
        const success = await this.syncSingleLibraryItem(item);
        if (success) await run('UPDATE global_library SET synced = 1 WHERE id = ?', [item.id]);
      }

      logSync('PUSH total concluído.');
    } catch (e: any) {
      logSync(`FALHA NO PUSH TOTAL: ${e.message}`);
      console.error('[SYNC FATAL] Falha no push total:', e);
    }
    this.isSyncing = false;
  }

  private static async syncInventoryInChunks() {
    try {
      const inventory = await query('SELECT * FROM inventory');
      if (inventory.length === 0) return;

      const chunkSize = 50; // Sincronizar de 50 em 50 para estabilidade
      for (let i = 0; i < inventory.length; i += chunkSize) {
        const chunk = inventory.slice(i, i + chunkSize);
        const { error: invErr } = await this.supabase.from('inventory').upsert(chunk.map(item => ({
          product_id: item.product_id, 
          store_id: item.store_id || '1', 
          quantity: Number(item.quantity || 0), 
          min_stock: Number(item.min_stock || 0), 
          sale_tolerance_days: Number(item.sale_tolerance_days || 0)
        })));

        if (invErr) {
          console.error(`[SYNC ERROR] Erro no chunk de estoque (${i}-${i + chunkSize}):`, invErr);
          logSync(`Erro PUSH estoque chunk: ${invErr.message}`);
        }
      }
      console.log('[SYNC SUCCESS] Estoque sincronizado (em chunks).');
    } catch (err: any) {
      console.error('[SYNC FATAL] Erro ao processar estoque:', err);
    }
  }

  static async uploadProductImageToCloud(fileName: string): Promise<string | null> {
    if (!this.supabase) return null;
    try {
      const filePath = path.join(this.imagesDir, fileName);
      if (!fs.existsSync(filePath)) return null;

      const { error: uploadError } = await this.supabase.storage
        .from('product-images')
        .upload(`products/${fileName}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });

      if (uploadError) {
        logSync(`Erro upload imediato produto: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`products/${fileName}`);
      return publicUrl;
    } catch (e: any) {
      logSync(`Exceção upload imediato produto: ${e.message}`);
      return null;
    }
  }

  static async uploadUserPhotoToCloud(fileName: string): Promise<string | null> {
    if (!this.supabase) return null;
    try {
      const filePath = path.join(this.imagesDir, fileName);
      if (!fs.existsSync(filePath)) return null;

      const { error: uploadError } = await this.supabase.storage
        .from('product-images')
        .upload(`users/${fileName}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });

      if (uploadError) {
        logSync(`Erro upload imediato usuário: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`users/${fileName}`);
      return publicUrl;
    } catch (e: any) {
      logSync(`Exceção upload imediato usuário: ${e.message}`);
      return null;
    }
  }

  static async uploadRepairImageToCloud(fileName: string): Promise<string | null> {
    if (!this.supabase) return null;
    try {
      const filePath = path.join(this.repairImagesDir, fileName);
      if (!fs.existsSync(filePath)) return null;

      const { error: uploadError } = await this.supabase.storage
        .from('repair-images')
        .upload(`repairs/${fileName}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });

      if (uploadError) {
        logSync(`Erro upload imediato reparo: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = this.supabase.storage.from('repair-images').getPublicUrl(`repairs/${fileName}`);
      return publicUrl;
    } catch (e: any) {
      logSync(`Exceção upload imediato reparo: ${e.message}`);
      return null;
    }
  }

  private static async syncSingleProduct(prod: any) {
    try {
      let cloudImageUrl = prod.image;
      
      // SUPER-UPLOAD: Se a imagem é local, sobe para o Supabase e atualiza o banco local com o link da nuvem
      if (prod.image && !prod.image.startsWith('http') && !prod.image.startsWith('icon:')) {
        const filePath = path.join(this.imagesDir, prod.image);
        if (fs.existsSync(filePath)) {
          logSync(`[SUPER-SYNC] Enviando imagem local do produto: ${prod.name}`);
          const uploadedUrl = await this.uploadProductImageToCloud(prod.image);
          if (uploadedUrl) {
            cloudImageUrl = uploadedUrl;
            // MUITO IMPORTANTE: Grava o link da nuvem no banco local
            await run('UPDATE products SET image = ? WHERE id = ?', [cloudImageUrl, prod.id]);
          }
        }
      }

      const payload = {
        id: prod.id,
        barcode: String(prod.barcode || ''),
        name: String(prod.name || ''),
        price: Number(prod.price || 0),
        image: cloudImageUrl,
        archived: prod.archived == 1 ? 1 : 0, 
        category_id: prod.category_id || null
      };

      const { error } = await this.supabase.from('products').upsert(payload);

      if (error) {
        logSync(`Erro Supabase Produto ${prod.id}: ${error.message}`);
        return false;
      }
      
      await run('UPDATE products SET synced = 1 WHERE id = ?', [prod.id]);
      return true;
    } catch (err: any) {
      logSync(`Exceção ao sincronizar produto ${prod.id}: ${err.message}`);
      return false;
    }
  }

  private static async syncSingleRepair(repair: any) {
    try {
      let cloudImageUrl = repair.photo_url;

      // SUPER-UPLOAD para Reparos
      if (repair.photo_url && !repair.photo_url.startsWith('http')) {
        const filePath = path.join(this.repairImagesDir, repair.photo_url);
        if (fs.existsSync(filePath)) {
          logSync(`[SUPER-SYNC] Enviando imagem local da OS: ${repair.id}`);
          const uploadedUrl = await this.uploadRepairImageToCloud(repair.photo_url);
          if (uploadedUrl) {
            cloudImageUrl = uploadedUrl;
            await run('UPDATE maintenance_orders SET photo_url = ? WHERE id = ?', [cloudImageUrl, repair.id]);
          }
        }
      }

      const payload = {
        id: repair.id,
        customer_name: repair.customer_name,
        customer_phone: repair.customer_phone,
        device_brand: repair.device_brand,
        device_model: repair.device_model,
        issue_description: repair.issue_description,
        photo_url: cloudImageUrl,
        price: Number(repair.price || 0),
        entry_store_id: repair.entry_store_id,
        maintenance_store_id: repair.maintenance_store_id,
        current_store_id: repair.current_store_id,
        status: repair.status,
        payment_status: repair.payment_status || 'pending',
        created_at: repair.created_at,
        updated_at: repair.updated_at
      };

      const { error } = await this.supabase.from('maintenance_orders').upsert(payload);

      if (error) {
        logSync(`Erro Supabase OS ${repair.id}: ${error.message}`);
        return false;
      }
      
      await run('UPDATE maintenance_orders SET synced = 1 WHERE id = ?', [repair.id]);
      return true;
    } catch (err: any) {
      logSync(`Exceção ao sincronizar OS ${repair.id}: ${err.message}`);
      return false;
    }
  }

  static async pullFromCloud() {
    if (!this.supabase) return;
    try {
      logSync('Iniciando PULL da nuvem...');

      // 1. Lojas
      const { data: cloudStores, error: se } = await this.supabase.from('stores').select('*');
      if (se) console.error('[SYNC ERROR] Erro Pull Lojas:', se);
      if (cloudStores) {
        for (const s of cloudStores) {
          await run('INSERT OR REPLACE INTO stores (id, name, archived) VALUES (?, ?, ?)', [s.id, s.name, s.archived ? 1 : 0]);
        }
      }

      // 2. Usuários
      const { data: cloudUsers, error: ue } = await this.supabase.from('users').select('*');
      if (ue) console.error('[SYNC ERROR] Erro Pull Usuários:', ue);
      if (cloudUsers) {
        for (const u of cloudUsers) {
          if (u.photo_url && u.photo_url.startsWith('http')) {
            await this.downloadImageLocally(u.photo_url, this.imagesDir);
          }
          await run('INSERT OR REPLACE INTO users (id, name, password, role, photo_url) VALUES (?, ?, ?, ?, ?)', 
            [u.id, u.name, u.password, u.role, u.photo_url]);
        }
      }

      // 3. Produtos e Download de Imagens
      const { data: cloudProds, error: pe } = await this.supabase.from('products').select('*');
      if (pe) console.error('[SYNC ERROR] Erro Pull Produtos:', pe);
      if (cloudProds) {
        for (const p of cloudProds) {
          if (p.image && p.image.startsWith('http')) {
            await this.downloadImageLocally(p.image, this.imagesDir);
          }

          // Atualiza sempre o link da imagem local com o da nuvem para garantir consistência
          await run('INSERT OR REPLACE INTO products (id, barcode, name, price, image, archived, synced) VALUES (?, ?, ?, ?, ?, ?, 1)', 
            [p.id, p.barcode, p.name, p.price, p.image, p.archived ? 1 : 0]);
        }
      }

      // 4. Manutenções e Download de Fotos de Reparo
      const { data: cloudRepairs, error: re } = await this.supabase.from('maintenance_orders').select('*');
      if (re) console.error('[SYNC ERROR] Erro Pull OS:', re);
      if (cloudRepairs) {
        for (const r of cloudRepairs) {
          if (r.photo_url && r.photo_url.startsWith('http')) {
            await this.downloadImageLocally(r.photo_url, this.repairImagesDir);
          }

          await run('INSERT OR REPLACE INTO maintenance_orders (id, customer_name, customer_phone, device_brand, device_model, issue_description, photo_url, price, entry_store_id, maintenance_store_id, current_store_id, status, synced, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)', 
            [r.id, r.customer_name, r.customer_phone, r.device_brand, r.device_model, r.issue_description, r.photo_url, r.price, r.entry_store_id, r.maintenance_store_id, r.current_store_id, r.status, r.created_at, r.updated_at]);
        }
      }

      // 5. Estoque
      const { data: cloudInv, error: ie } = await this.supabase.from('inventory').select('*');
      if (ie) console.error('[SYNC ERROR] Erro Pull Estoque:', ie);
      if (cloudInv) {
        for (const i of cloudInv) {
          await run('INSERT OR REPLACE INTO inventory (product_id, store_id, quantity, min_stock, sale_tolerance_days) VALUES (?, ?, ?, ?, ?)',
            [i.product_id, i.store_id, i.quantity, i.min_stock, i.sale_tolerance_days]);
        }
      }

      // 6. Clientes (CRM)
      const { data: cloudCustomers, error: ce } = await this.supabase.from('customers').select('*');
      if (ce) console.error('[SYNC ERROR] Erro Pull Clientes:', ce);
      if (cloudCustomers) {
        for (const c of cloudCustomers) {
          await run(`INSERT OR REPLACE INTO customers (id, name, phone, email, address, cpf, rg, birth_date, city, origin, notes, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [c.id, c.name, c.phone, c.email, c.address, c.cpf, c.rg, c.birth_date, c.city, c.origin, c.notes]);
        }
      }

      // 7. Tarefas (Processos)
      const { data: cloudTasks, error: te } = await this.supabase.from('tasks').select('*');
      if (te) console.error('[SYNC ERROR] Erro Pull Tarefas:', te);
      if (cloudTasks) {
        for (const t of cloudTasks) {
          await run(`INSERT OR REPLACE INTO tasks (id, title, assignee_type, assignee_id, status, due_date, is_routine, proof_required, photo_proof, justification, completed_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [t.id, t.title, t.assignee_type, t.assignee_id, t.status, t.due_date, t.is_routine, t.proof_required, t.photo_proof, t.justification, t.completed_at]);
        }
      }

      // 8. Biblioteca Global
      const { data: cloudLib, error: le } = await this.supabase.from('global_library').select('*');
      if (le) console.error('[SYNC ERROR] Erro Pull Biblioteca:', le);
      if (cloudLib) {
        for (const item of cloudLib) {
          if (item.image_url && item.image_url.startsWith('http')) {
            await this.downloadImageLocally(item.image_url, this.imagesDir);
          }
          await run('INSERT OR REPLACE INTO global_library (id, name, image_url, category, synced) VALUES (?, ?, ?, ?, 1)', 
            [item.id, item.name, item.image_url, item.category]);
        }
      }

      logSync('PULL finalizado com sucesso.');
    } catch (err: any) {
      logSync(`FALHA NO PULL: ${err.message}`);
      console.error('[SYNC FATAL] Falha no pull:', err);
    }
  }

  static async syncPendingProducts() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingProducts = await query('SELECT * FROM products WHERE synced = 0');
      if (pendingProducts.length > 0) {
        for (const prod of pendingProducts) {
          await this.syncSingleProduct(prod);
        }
      }
      await this.syncInventoryInChunks();
    } catch (err: any) {
      console.error('[SYNC FATAL] Falha ao sincronizar produtos pendentes:', err);
    }
    this.isSyncing = false;
  }

  static async syncPendingRepairs() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingRepairs = await query('SELECT * FROM maintenance_orders WHERE synced = 0');
      if (pendingRepairs.length > 0) {
        for (const repair of pendingRepairs) {
          await this.syncSingleRepair(repair);
        }
      }
    } catch (err: any) {
      console.error('[SYNC FATAL] Falha ao sincronizar OS pendentes:', err);
    }
    this.isSyncing = false;
  }

  static async syncPendingTasks() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingTasks = await query('SELECT * FROM tasks WHERE synced = 0');
      for (const task of pendingTasks) {
        const success = await this.syncSingleTask(task);
        if (success) await run('UPDATE tasks SET synced = 1 WHERE id = ?', [task.id]);
      }
    } catch (err: any) {
      console.error('[SYNC FATAL] Falha ao sincronizar tarefas pendentes:', err);
    }
    this.isSyncing = false;
  }

  private static async syncSingleTask(t: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const payload = {
        id: t.id,
        title: String(t.title).toUpperCase(),
        assignee_type: t.assignee_type,
        assignee_id: t.assignee_id,
        status: t.status,
        due_date: t.due_date,
        is_routine: t.is_routine == 1 ? 1 : 0,
        proof_required: t.proof_required == 1 ? 1 : 0,
        photo_proof: t.photo_proof,
        justification: t.justification,
        completed_at: t.completed_at,
        created_at: t.created_at
      };

      const { error } = await this.supabase.from('tasks').upsert(payload);

      if (error) {
        console.error(`[SYNC ERROR] Erro Supabase Tarefa ${t.id}:`, error);
        logSync(`Erro Supabase Tarefa: ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Erro Rede Tarefa ${t.id}:`, err);
      return false;
    }
  }

  static async syncPendingCustomers() {
    if (!this.supabase || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pendingCustomers = await query('SELECT * FROM customers WHERE synced = 0');
      for (const customer of pendingCustomers) {
        const success = await this.syncSingleCustomer(customer);
        if (success) await run('UPDATE customers SET synced = 1 WHERE id = ?', [customer.id]);
      }
    } catch (err: any) {
      console.error('[SYNC FATAL] Falha ao sincronizar clientes pendentes:', err);
    }
    this.isSyncing = false;
  }

  private static async syncSingleCustomer(c: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const payload = {
        id: c.id,
        name: String(c.name || '').trim().toUpperCase(),
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        cpf: c.cpf || '',
        rg: c.rg || '',
        birth_date: c.birth_date || '',
        city: String(c.city || 'ALMENARA').trim().toUpperCase(),
        origin: String(c.origin || '').trim().toUpperCase(),
        notes: c.notes || '',
        created_at: c.created_at
      };

      const { error } = await this.supabase.from('customers').upsert(payload);

      if (error) {
        console.error(`[SYNC ERROR] Erro Supabase Cliente ${c.id}:`, error);
        logSync(`Erro Supabase Cliente: ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Erro Rede Cliente ${c.id}:`, err);
      return false;
    }
  }

  static async syncPendingSales() {
    if (!this.supabase || this.isSyncing) return;
    
    const pendingSales = await query('SELECT * FROM sales WHERE synced = 0');
    if (pendingSales.length === 0) return;

    this.isSyncing = true;
    logSync(`Sincronizando ${pendingSales.length} vendas pendentes...`);

    for (const sale of pendingSales) {
      try {
        const success = await this.realCloudAPI(sale);
        if (success) {
          await run('UPDATE sales SET synced = 1 WHERE id = ?', [sale.id]);
          logSync(`Venda ${sale.id} sincronizada.`);
        }
      } catch (error: any) {
        logSync(`Falha ao sincronizar venda ${sale.id}: ${error.message}`);
      }
    }

    this.isSyncing = false;
  }

  private static async syncSingleTransaction(t: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const payload = {
        id: t.id,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: Number(t.amount || 0),
        date: t.date,
        payment_method: t.payment_method,
        store_id: t.store_id,
        reference_id: t.reference_id,
        created_at: t.created_at
      };

      const { error } = await this.supabase.from('financial_transactions').upsert(payload);
      if (error) {
        console.error(`[SYNC ERROR] Erro Supabase Transação ${t.id}:`, error);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Erro Rede Transação ${t.id}:`, err);
      return false;
    }
  }

  private static async realCloudAPI(sale: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const items = JSON.parse(sale.items);
      const { error } = await this.supabase
        .from('sales')
        .insert([{
          id: sale.id, store_id: sale.store_id, vendedor: sale.vendedor,
          total: sale.total, discount: sale.discount, payment_method: sale.payment_method,
          items: items, created_at: sale.created_at
        }]);

      if (error) {
        console.error(`[SYNC ERROR] Erro Supabase Venda ${sale.id}:`, error);
        logSync(`Erro Supabase Venda: ${error.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[SYNC FATAL] Erro Rede Venda ${sale.id}:`, err);
      logSync(`Erro Rede Venda: ${err.message}`);
      return false;
    }
  }

  private static async syncSingleLibraryItem(item: any): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      let cloudImageUrl = item.image_url;
      
      // Se for imagem local (base64 ou filename), faz upload pro storage
      if (item.image_url && !item.image_url.startsWith('http')) {
        const filePath = path.join(this.imagesDir, item.image_url);
        if (fs.existsSync(filePath)) {
          const { error: uploadError } = await this.supabase.storage
            .from('product-images')
            .upload(`library/${item.image_url}`, fs.readFileSync(filePath), { upsert: true, contentType: 'image/png' });
          
          if (!uploadError) {
            const { data: { publicUrl } } = this.supabase.storage.from('product-images').getPublicUrl(`library/${item.image_url}`);
            cloudImageUrl = publicUrl;
          }
        }
      }

      const { error } = await this.supabase.from('global_library').upsert({
        id: item.id,
        name: item.name,
        image_url: cloudImageUrl,
        category: item.category
      });

      if (error) return false;
      
      await run('UPDATE global_library SET synced = 1, image_url = ? WHERE id = ?', [cloudImageUrl, item.id]);
      return true;
    } catch (e) {
      return false;
    }
  }
}
