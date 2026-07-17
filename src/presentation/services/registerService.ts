import { supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('store_id', params.storeId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      if (!data) return null;

      return {
        id: data.id,
        store_id: data.store_id,
        user_name: data.user_name,
        opened_by: data.user_name,
        opening_balance: data.opening_balance || 0,
        initial_value: data.opening_balance || 0,
        opened_at: data.opened_at,
        closed_by: data.user_name,
        closing_balance: data.closing_balance || 0,
        reported_balance: data.reported_balance || 0,
        final_value: data.reported_balance || data.closing_balance || 0,
        observations: data.notes,
        notes: data.notes,
        closed_at: data.closed_at,
        status: data.status
      };
    } catch (e) {
      return null;
    }
  },

  async open(params: { storeId: string; openedBy: string; initialValue: number }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      id: crypto.randomUUID(),
      store_id: params.storeId,
      user_name: params.openedBy,
      opening_balance: params.initialValue,
      status: 'open',
      opened_at: new Date().toISOString()
    };
    const { error } = await supabase.from('cash_registers').insert([payload]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('cash_registers')
      .update({
        status: 'closed',
        closing_balance: params.finalValue,
        reported_balance: params.finalValue,
        notes: params.observations,
        closed_at: new Date().toISOString()
      })
      .eq('id', params.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getData(params: { storeId: string; openedAt: string }) {
    if (!supabase) return { totals: { sales: 0, cash: 0, card: 0, pix: 0, expenses: 0, discounts: 0 }, topProducts: [], salesByEmployee: [] };
    
    try {
      // 1. Busca vendas realizadas desde opened_at
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', params.storeId)
        .gte('created_at', params.openedAt);

      // 2. Busca despesas
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', params.storeId)
        .gte('created_at', params.openedAt);

      // 3. Busca sangrias
      const { data: sangrias } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('store_id', params.storeId)
        .eq('category', 'SANGRIA')
        .gte('created_at', params.openedAt);

      // 4. Calcula Totais
      const totalSales = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);
      const cashSales = (sales || []).filter(s => s.payment_method === 'DINHEIRO').reduce((acc, s) => acc + (s.total || 0), 0);
      const cardSales = (sales || []).filter(s => ['CREDITO', 'DEBITO', 'CARTAO'].includes(s.payment_method)).reduce((acc, s) => acc + (s.total || 0), 0);
      const pixSales = (sales || []).filter(s => s.payment_method === 'PIX').reduce((acc, s) => acc + (s.total || 0), 0);
      
      const totalExpenses = ((expenses || []).reduce((acc, e) => acc + (e.value || 0), 0)) + 
                            ((sangrias || []).reduce((acc, sg) => acc + (sg.amount || 0), 0));

      const totalDiscounts = (sales || []).reduce((acc, s) => acc + (s.discount || 0), 0);

      const totals = {
        sales: totalSales,
        cash: cashSales,
        card: cardSales,
        pix: pixSales,
        expenses: totalExpenses,
        discounts: totalDiscounts
      };

      // 5. Agrupa produtos vendidos
      const productsMap: Record<string, { nome: string, qtd: number }> = {};
      const employeesMap: Record<string, number> = {};

      (sales || []).forEach(s => {
        const vendedorName = s.vendedor || 'Desconhecido';
        employeesMap[vendedorName] = (employeesMap[vendedorName] || 0) + (s.total || 0);

        try {
          // Se for string JSON, faz parse. Se for array direto, usa direto.
          const items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const name = item.nome || item.name || 'Produto';
              const id = item.id || name;
              if (!productsMap[id]) {
                productsMap[id] = { nome: name, qtd: 0 };
              }
              productsMap[id].qtd += (item.qtd || item.quantity || 0);
            });
          }
        } catch (e) {
          console.error('[WEB GETDATA] Erro parse items:', e);
        }
      });

      const topProducts = Object.values(productsMap)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

      const salesByEmployee = Object.entries(employeesMap).map(([name, total]) => ({ name, total }));

      return {
        totals,
        topProducts,
        salesByEmployee
      };
    } catch (err) {
      console.error('[WEB GETDATA ERROR]', err);
      return {
        totals: { sales: 0, cash: 0, card: 0, pix: 0, expenses: 0, discounts: 0 },
        topProducts: [],
        salesByEmployee: []
      };
    }
  },

  async getHistory() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        store_id: d.store_id,
        user_name: d.user_name,
        opened_by: d.user_name,
        opening_balance: d.opening_balance || 0,
        initial_value: d.opening_balance || 0,
        opened_at: d.opened_at,
        closed_by: d.user_name,
        closing_balance: d.closing_balance || 0,
        reported_balance: d.reported_balance || 0,
        final_value: d.reported_balance || d.closing_balance || 0,
        observations: d.notes,
        notes: d.notes,
        closed_at: d.closed_at,
        status: d.status
      }));
    } catch (e) {
      return [];
    }
  }
};
