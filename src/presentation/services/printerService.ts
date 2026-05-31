import { isElectron } from './api';

export const printerService = {
  async listUsbDevices() {
    if (isElectron) return await window.api.listUsbDevices();
    return [];
  },

  async printUSB(vid: number, pid: number, content: string) {
    if (isElectron) return await window.api.printUSB(vid, pid, content);
    return { success: false, error: 'Impressão USB disponível apenas no Desktop' };
  },

  async printReceipt(data: any) {
    if (isElectron) return await window.api.printReceipt(data);
    return { success: false, error: 'Impressão disponível apenas no Desktop' };
  },

  async printRepairReceipt(data: any) {
    if (isElectron) return await window.api.printRepairReceipt(data);
    return { success: false, error: 'Impressão disponível apenas no Desktop' };
  },

  async getPrinters() {
    if (isElectron) return await window.api.getPrinters();
    return [];
  },

  async runSetup() {
    if (isElectron) return await window.api.runPrinterSetup();
    return { success: false, error: 'Configuração de impressora disponível apenas no Desktop' };
  },

  async testPrinter(params: { deviceName: string }) {
    if (isElectron) return await window.api.testPrinter(params);
    return { success: false, error: 'Teste de impressora disponível apenas no Desktop' };
  }
};
