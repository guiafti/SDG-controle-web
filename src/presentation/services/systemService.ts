import { isElectron, supabase } from './api';

export const systemService = {
  async getAppTitle() {
    if (isElectron) return await window.api.getAppTitle();
    return 'SDG Controle (Cloud)';
  },

  async isCloudConfigured() {
    return !!supabase;
  },

  async getDashboardStats() {
    if (!supabase) return { totalRevenue: 0, monthlyRevenue: 0, activeOrders: 0, lowStockItems: 0 };
    
    try {
      const { data: sales } = await supabase.from('sales').select('total');
      const { count: activeOrders } = await supabase.from('maintenance_orders')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Entregue ao Cliente');
      
      const { count: lowStock } = await supabase.from('inventory')
        .select('*', { count: 'exact', head: true }); 
      // Nota: Filtragem de lowStock complexa movida para o backend ou feita via query se as colunas permitirem.
      // Por simplicidade, faremos a soma das vendas.
      
      const total = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);
      
      return {
        totalRevenue: total,
        monthlyRevenue: total,
        activeOrders: activeOrders || 0,
        lowStockItems: lowStock || 0
      };
    } catch (e) {
      return { totalRevenue: 0, monthlyRevenue: 0, activeOrders: 0, lowStockItems: 0 };
    }
  },

  async getLowStockItems() {
    if (!supabase) return [];
    try {
        // Busca produtos onde a quantidade é menor ou igual ao estoque mínimo
        // Como o Supabase não permite comparar duas colunas na mesma linha facilmente sem RPC,
        // vamos buscar o inventário e filtrar no JS (ou usar uma view no futuro)
        const { data } = await supabase.from('inventory').select('*, products(name)');
        return (data || [])
            .filter(i => i.quantity <= i.min_stock)
            .map(i => ({ name: i.products?.name, quantity: i.quantity, min_stock: i.min_stock }))
            .slice(0, 10);
    } catch (e) { return []; }
  },

  async getSyncStatus() {
    return { pending: 0, total: 100 }; // Desativado na versão Cloud
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
