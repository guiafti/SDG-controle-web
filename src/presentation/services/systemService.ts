import { supabase } from './api';

export const isElectron = typeof window !== 'undefined' && (window as any).api !== undefined;

export const systemService = {
  async getDashboardSummary(storeId?: string) {
    if (!supabase) return { totalRevenue: 0, monthlyRevenue: 0, activeOrders: 0, lowStockItems: 0 };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      let salesQuery = supabase
        .from('sales')
        .select('*')
        .gte('created_at', todayISO);

      if (storeId && storeId !== 'all') {
        salesQuery = salesQuery.eq('store_id', storeId);
      }

      const { data: sales } = await salesQuery;
      const validSales = (sales || []).filter(s => s.status !== 'CANCELADA');
      const total = validSales.reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);

      const { count: activeOrders } = await supabase
        .from('maintenance_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Pendente', 'Em Manutenção']);

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

  async getDashboardStats(storeId?: string) {
    if (!supabase) return { totalRevenue: 0, monthlyRevenue: 0, dailyRevenue: 0 };
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let query = supabase.from('sales').select('*');
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      const { data: sales } = await query;
      const validSales = (sales || []).filter(s => s.status !== 'CANCELADA');

      const totalRevenue = validSales.reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const dailyRevenue = validSales
        .filter(s => (s.created_at || '') >= todayStart)
        .reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const monthlyRevenue = validSales
        .filter(s => (s.created_at || '') >= monthStart)
        .reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);

      return {
        totalRevenue,
        monthlyRevenue: monthlyRevenue || totalRevenue,
        dailyRevenue
      };
    } catch (e) {
      return { totalRevenue: 0, monthlyRevenue: 0, dailyRevenue: 0 };
    }
  },

  async getLowStockItemsCount() {
    if (!supabase) return 0;
    try {
      const { data } = await supabase.from('inventory').select('quantity, min_stock');
      return (data || []).filter(i => (i.quantity || 0) <= (i.min_stock || 0)).length;
    } catch (e) {
      return 0;
    }
  },

  async getLowStockItems() {
    if (!supabase) return [];
    try {
      const { data: inv } = await supabase.from('inventory').select('*');
      const { data: prods } = await supabase.from('products').select('id, name, stock_quantity');

      const prodMap = new Map((prods || []).map(p => [p.id, p.name]));

      if (inv && inv.length > 0) {
        return inv
          .filter(i => (i.quantity || 0) <= (i.min_stock || 0))
          .map(i => ({ 
            name: prodMap.get(i.product_id) || 'Produto', 
            quantity: i.quantity || 0, 
            min_stock: i.min_stock || 0 
          }))
          .slice(0, 10);
      }

      // Fallback para tabela de produtos direta
      return (prods || [])
        .filter(p => Number(p.stock_quantity || 0) <= 5)
        .map(p => ({
          name: p.name || 'Produto',
          quantity: Number(p.stock_quantity || 0),
          min_stock: 5
        }))
        .slice(0, 10);
    } catch (e) { 
      return []; 
    }
  },

  async getSyncStatus() {
    return { pending: 0, total: 100 };
  },

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

