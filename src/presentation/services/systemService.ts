import { supabase } from './api';

// Detecção de ambiente para recursos de hardware/SO
export const isElectron = typeof window !== 'undefined' && (window as any).api !== undefined;

export const systemService = {
  async getDashboardSummary(storeId: string) {
    if (!supabase) return { totalRevenue: 0, monthlyRevenue: 0, activeOrders: 0, lowStockItems: 0 };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Vendas
      const { data: sales } = await supabase
        .from('sales')
        .select('total')
        .eq('store_id', storeId)
        .gte('created_at', todayISO);

      const total = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);

      // Ordens ativas
      const { count: activeOrders } = await supabase
        .from('maintenance_orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pendente');

      // Itens com baixo estoque
      const lowStock = await this.getLowStockItemsCount();

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

  async getLowStockItemsCount() {
    if (!supabase) return 0;
    try {
      const { data } = await supabase.from('inventory').select('quantity, min_stock');
      return (data || []).filter(i => i.quantity <= i.min_stock).length;
    } catch (e) {
      return 0;
    }
  },

  async getLowStockItems() {
    if (!supabase) return [];
    try {
      // Busca inventário e produtos separadamente para evitar erro 400 de relacionamento
      const { data: inv } = await supabase.from('inventory').select('*');
      const { data: prods } = await supabase.from('products').select('id, name');

      const prodMap = new Map((prods || []).map(p => [p.id, p.name]));

      return (inv || [])
        .filter(i => i.quantity <= i.min_stock)
        .map(i => ({ 
          name: prodMap.get(i.product_id) || 'Produto Desconhecido', 
          quantity: i.quantity, 
          min_stock: i.min_stock 
        }))
        .slice(0, 10);
    } catch (e) { 
      return []; 
    }
  },

  async getSyncStatus() {
    return { pending: 0, total: 100 }; // Desativado na versão Cloud
  },

  // Window management
  minimize() {
    if (isElectron) (window as any).api.minimizeWindow();
  },

  maximize() {
    if (isElectron) (window as any).api.maximizeWindow();
  },

  close() {
    if (isElectron) (window as any).api.closeWindow();
  },
};
