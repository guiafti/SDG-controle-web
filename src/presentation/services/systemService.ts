import { isElectron } from './api';

export const systemService = {
  async getAppTitle() {
    if (isElectron) return await window.api.getAppTitle();
    return 'SDG Controle (Web)';
  },

  async isCloudConfigured() {
    if (isElectron) return await window.api.isCloudConfigured();
    return true; // No modo web, assume-se que está configurado (Supabase)
  },

  async getSyncStatus() {
    if (isElectron) return await window.api.getSyncStatus();
    return { lastSync: new Date().toISOString(), pending: 0 };
  },

  async getDashboardStats() {
    if (isElectron) return await window.api.getDashboardStats();
    return {
      todaySales: 0,
      monthSales: 0,
      activeRepairs: 0,
      lowStockCount: 0
    };
  },

  async getLowStockItems() {
    if (isElectron) return await window.api.getLowStockItems();
    return [];
  },

  // Window management
  minimize() {
    if (isElectron) window.api.minimizeWindow();
  },

  maximize() {
    if (isElectron) window.api.maximizeWindow();
  },

  close() {
    if (isElectron) window.api.closeWindow();
  },

  setZoom(level: number) {
    if (isElectron) window.api.setZoom(level);
  },

  // Updates (Electron only)
  onUpdateAvailable(callback: (info: any) => void) {
    if (isElectron) return window.api.onUpdateAvailable(callback);
    return () => {};
  },

  onUpdateProgress(callback: (progress: any) => void) {
    if (isElectron) return window.api.onUpdateProgress(callback);
    return () => {};
  },

  onUpdateDownloaded(callback: (info: any) => void) {
    if (isElectron) return window.api.onUpdateDownloaded(callback);
    return () => {};
  },

  async checkForUpdates() {
    if (isElectron) return await window.api.checkForUpdates();
    return { success: false, error: 'Atualizações automáticas disponíveis apenas no Desktop' };
  }
};
