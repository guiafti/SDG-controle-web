export interface ElectronAPI {
  // --- HARDWARE & IMPRESSÃO ---
  listUsbDevices: () => Promise<any[]>;
  getPrinters: () => Promise<any[]>;
  printUSB: (vid: number, pid: number, data: any) => Promise<{success: boolean, error?: string}>;
  testPrinter: (data: {deviceName: string}) => Promise<{success: boolean, error?: string}>;
  printReceipt: (data: {sale: any, storeName: string, logo?: string, deviceName?: string}) => Promise<any>;
  printRepairReceipt: (data: {repair: any, storeName: string, logo?: string, deviceName?: string}) => Promise<any>;
  runPrinterSetup: () => Promise<{success: boolean, output: string, error?: string}>;

  // --- UTILITÁRIOS E RELATÓRIOS ---
  exportReportToPDF: (data: any) => Promise<{success: boolean, filePath?: string}>;
  exportReportToExcel: (data: any) => Promise<{success: boolean, filePath?: string}>;
  getAppTitle: () => Promise<string>;
  isCloudConfigured: () => Promise<boolean>;

  // --- CONTROLES DE JANELA ---
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  setZoom: (factor: number) => void;

  // --- ATUALIZAÇÕES ---
  checkForUpdates: () => Promise<any>;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateProgress: (callback: (progress: any) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}