import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // --- HARDWARE & IMPRESSÃO ---
  listUsbDevices: () => ipcRenderer.invoke('list-usb-devices'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printUSB: (vid: number, pid: number, data: any) => ipcRenderer.invoke('print-usb', { vid, pid, data }),
  testPrinter: (data: {deviceName: string}) => ipcRenderer.invoke('test-printer', data),
  printReceipt: (data: {sale: any, storeName: string, logo?: string, deviceName?: string}) => ipcRenderer.invoke('print-receipt', data),
  printRepairReceipt: (data: {repair: any, storeName: string, logo?: string, deviceName?: string}) => ipcRenderer.invoke('print-repair-receipt', data),
  runPrinterSetup: () => ipcRenderer.invoke('run-printer-setup'),
  
  // --- UTILITÁRIOS E RELATÓRIOS ---
  exportReportToPDF: (data: any) => ipcRenderer.invoke('export-report-pdf', data),
  exportReportToExcel: (data: any) => ipcRenderer.invoke('export-report-excel', data),
  getAppTitle: () => ipcRenderer.invoke('get-app-title'),
  isCloudConfigured: () => ipcRenderer.invoke('is-cloud-configured'),

  // --- CONTROLES DE JANELA ---
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  setZoom: (factor: number) => ipcRenderer.send('window-set-zoom', factor),

  // --- ATUALIZAÇÕES ---
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const subscription = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    const subscription = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('update-progress', subscription);
    return () => ipcRenderer.removeListener('update-progress', subscription);
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const subscription = (_event: any, info: any) => callback(info);
    ipcRenderer.on('update-downloaded', subscription);
    return () => ipcRenderer.removeListener('update-downloaded', subscription);
  },
});
