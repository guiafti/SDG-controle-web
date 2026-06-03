import { app, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { PrinterModule } from './PrinterModule';
import { generateRepairReceiptHTML, generateReceiptHTML } from './ReceiptTemplate';
import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente o mais cedo possível
const loadEnv = () => {
  try {
    const resourcesEnv = app.isPackaged 
      ? path.join(process.resourcesPath, '.env') 
      : path.join(process.cwd(), '.env');
    
    let userDataEnv = '';
    try {
      userDataEnv = path.join(app.getPath('userData'), '.env');
    } catch (e) {
      console.log('[ENV] app.getPath(userData) ainda não disponível.');
    }
    
    if (userDataEnv && fs.existsSync(userDataEnv)) {
      dotenv.config({ path: userDataEnv });
      console.log('[ENV] Carregado de userData:', userDataEnv);
    } else if (fs.existsSync(resourcesEnv)) {
      dotenv.config({ path: resourcesEnv });
      console.log('[ENV] Carregado de resources:', resourcesEnv);
    } else {
      console.warn('[ENV] Nenhum arquivo .env encontrado para carregar.');
    }
  } catch (err) {
    console.error('[ENV] Erro crítico ao carregar variáveis de ambiente:', err);
  }
};

loadEnv();

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

  if (!app.isPackaged) {
    win.loadURL('http://127.0.0.1:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'index.html'));
  }
}

app.whenReady().then(async () => {
  // Configura os protocolos primeiro
  protocol.handle('local-img', async (request) => {
    let rawUrl = request.url.replace('local-img://', '');
    if (rawUrl.endsWith('/')) rawUrl = rawUrl.slice(0, -1);
    const fileName = path.basename(decodeURIComponent(rawUrl));
    
    const possiblePaths = [
      path.join(app.getPath('userData'), 'product_images', fileName),
      path.join(app.getPath('userData'), 'repair_images', fileName),
      path.join(process.cwd(), fileName),
      path.join(process.cwd(), 'product_images', fileName),
      path.join(process.cwd(), 'public', fileName),
      path.join(__dirname, '..', 'public', fileName)
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString());
      }
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl && fileName && fileName !== 'undefined' && fileName !== 'null') {
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
            const localTarget = path.join(app.getPath('userData'), attempt.dir, fileName);
            if (!fs.existsSync(path.dirname(localTarget))) fs.mkdirSync(path.dirname(localTarget), { recursive: true });
            
            response.clone().arrayBuffer().then(buffer => {
              fs.writeFile(localTarget, Buffer.from(buffer), (err) => {});
            }).catch(() => {});

            return response;
          }
        } catch (e) {}
      }
    }
    return new Response('Not Found', { status: 404 });
  });

  createWindow();

  // Verifica atualizações
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 3000);
});

// --- UTILITÁRIOS E HARDWARE ---
ipcMain.handle('list-usb-devices', async () => {
  const usb = require('usb');
  return usb.getDeviceList().map((d: any) => ({ 
    vendorId: d.deviceDescriptor.idVendor, 
    productId: d.deviceDescriptor.idProduct 
  }));
});

ipcMain.handle('get-app-title', async () => 'SDG CONTROLE');

ipcMain.handle('is-cloud-configured', async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return !!(url && key && url !== 'SUA_URL_DO_SUPABASE_AQUI');
});

ipcMain.handle('get-printers', async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    return win ? await win.webContents.getPrintersAsync() : [];
  } catch (e) { return []; }
});

ipcMain.handle('check-for-updates', async () => {
  if (app.isPackaged) {
    return await autoUpdater.checkForUpdatesAndNotify();
  }
  return { success: false, message: 'Not packaged' };
});

// --- IMPRESSÃO ---
ipcMain.handle('print-usb', async (_, { vid, pid, data }) => await PrinterModule.printUSB(vid, pid, data));
ipcMain.handle('test-printer', async () => await PrinterModule.printUSB(0x28E9, 0x0289, "TESTE DE IMPRESSAO\nOK!"));

ipcMain.handle('print-receipt', async (_, { sale, storeName }) => {
  return await PrinterModule.printUSB(0x28E9, 0x0289, { 
    type: 'SALE', 
    storeName, 
    items: sale.items.map((i:any) => ({name: i.nome, qtd: i.qtd, total: i.preco * i.qtd})), 
    total: sale.total, 
    id: sale.id?.substring(0,8)
  });
});

ipcMain.handle('print-repair-receipt', async (_, { repair, storeName, logo }) => {
  try {
    const html = generateRepairReceiptHTML(repair, storeName, logo);
    const printWin = new BrowserWindow({ 
      show: false, 
      webPreferences: { nodeIntegration: false, contextIsolation: true } 
    });
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Promise((resolve) => {
      printWin.webContents.print({ silent: true, printBackground: true }, (success, failureReason) => {
        printWin.close();
        resolve({ success, error: failureReason });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-report-pdf', async (event, data) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false };
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar Relatório em PDF',
    defaultPath: `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });
  if (!filePath) return { success: false };
  const html = `<html><body><h1>Relatório Financeiro</h1><pre>${JSON.stringify(data.summary, null, 2)}</pre></body></html>`;
  const printWin = new BrowserWindow({ show: false });
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const pdf = await printWin.webContents.printToPDF({});
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
  let csvContent = "\ufeffData;Total\n";
  data.sales.forEach((s: any) => { csvContent += `${s.created_at};${s.total}\n`; });
  fs.writeFileSync(filePath, csvContent);
  return { success: true, filePath };
});

// --- ATUALIZAÇÕES (EVENTOS) ---
autoUpdater.on('update-available', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) win.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Atualização Pronta',
    message: 'Uma nova versão foi baixada. Deseja reiniciar para atualizar?',
    buttons: ['Reiniciar Agora', 'Depois']
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});

