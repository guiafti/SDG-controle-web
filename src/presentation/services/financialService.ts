import { supabase } from './api';

export const financialService = {
  async getSummary() {
    if (!supabase) return { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [], ledger: [] };
    
    try {
      // 1. Inflows
      const { data: inflows } = await supabase
        .from('financial_transactions')
        .select('amount, date')
        .eq('type', 'INFLOW');

      // 2. Outflows
      const { data: outflows } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'OUTFLOW');

      // 3. Sales Inflows
      const { data: salesInflows } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'INFLOW')
        .eq('category', 'VENDA');

      // 4. Repairs Inflows
      const { data: repairsInflows } = await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('type', 'INFLOW')
        .eq('category', 'MANUTENÇÃO');

      // 5. Ledger (Livro-caixa com limite de 100 itens)
      const { data: ledger } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      const totalInflow = (inflows || []).reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalOutflow = (outflows || []).reduce((acc, t) => acc + (t.amount || 0), 0);
      const salesInflow = (salesInflows || []).reduce((acc, t) => acc + (t.amount || 0), 0);
      const repairsInflow = (repairsInflows || []).reduce((acc, t) => acc + (t.amount || 0), 0);

      // Busca as vendas para calcular o custo estimado
      const { data: sales } = await supabase.from('sales').select('items');
      let estimatedCost = 0;
      (sales || []).forEach(sale => {
        if (sale.items) {
          try {
            const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const qty = Number(item.qtd || item.quantity || 0);
                const cost = Number(item.cost_price || item.custo || 0);
                estimatedCost += cost * qty;
              });
            }
          } catch(e) {}
        }
      });

      // Simula trends dos últimos 6 meses
      const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      const monthlyTotals: Record<number, number> = {};
      (inflows || []).forEach((t: any) => {
        if (t.date) {
          try {
            const dateObj = new Date(t.date);
            const month = dateObj.getMonth();
            monthlyTotals[month] = (monthlyTotals[month] || 0) + (t.amount || 0);
          } catch (e) {}
        }
      });

      const trends = Object.entries(monthlyTotals).map(([m, val]) => ({
        month: MONTH_NAMES[Number(m)] || `Mês ${m}`,
        inflow: val
      })).slice(-6);

      return {
        totalInflow,
        totalOutflow,
        salesInflow,
        repairsInflow,
        estimatedCost,
        netProfit: totalInflow - totalOutflow,
        ledger: (ledger || []).map(l => ({ 
          id: l.id,
          date: l.date,
          description: l.description,
          type: l.category, // category mapeia para type
          value: l.amount, // amount mapeia para value
          payment_method: l.payment_method,
          trans_type: l.type, // type mapeia para trans_type
          reference_id: l.reference_id,
          store_id: l.store_id
        })),
        trends: trends.length > 0 ? trends : [{ month: MONTH_NAMES[new Date().getMonth()], inflow: 0 }]
      };
    } catch (e) {
      console.error('[WEB GETSUMMARY ERROR]', e);
      return { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [], ledger: [] };
    }
  },

  async getExpenses() {
    if (!supabase) return [];
    try {
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (expError) throw expError;

      const { data: categories } = await supabase
        .from('expense_categories')
        .select('*');

      const catMap = new Map(categories?.map(c => [c.id, c.name]));
      
      return (expenses || []).map(e => ({
        ...e,
        expense_categories: { name: catMap.get(e.category_id) || 'Sem Categoria' }
      }));
    } catch (e) {
      console.error('[WEB EXPENSES ERROR]', e);
      return [];
    }
  },

  async getCategories() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async saveExpense(expense: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from('expenses').insert([{
      ...expense,
      id: expense.id || crypto.randomUUID(),
      created_at: new Date().toISOString()
    }]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async saveCategory(name: string) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from('expense_categories').insert([{
      id: crypto.randomUUID(),
      name,
      created_at: new Date().toISOString()
    }]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getBudgets() {
    return [];
  },

  async getDetailedReports(filters: any) {
    if (!supabase) return [];
    try {
      let query = supabase.from('sales').select('*');
      
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);
      if (filters.storeId) query = query.eq('store_id', filters.storeId);
      
      const { data, error } = await query;
      if (error) return [];
      
      return (data || []).map(s => ({
        ...s,
        customers: { name: s.customer_name || 'Consumidor Final' },
        users: { name: s.vendedor || 'Operador' }
      }));
    } catch (e) {
      return [];
    }
  },

  async exportToExcel(params: any) {
    return { success: false, error: 'Exportação Excel deve ser implementada no Frontend' };
  },

  async exportToPDF(params: any) {
    return { success: false, error: 'Exportação PDF deve ser implementada no Frontend' };
  },

  async getCommissions() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) return [];
      
      const commissionsMap: any = {};
      (data || []).forEach(sale => {
        const userName = sale.vendedor || 'Desconhecido';
        if (!commissionsMap[userName]) {
          commissionsMap[userName] = {
            userName,
            totalSales: 0,
            commission: 0
          };
        }
        commissionsMap[userName].totalSales += sale.total;
        commissionsMap[userName].commission += sale.total * 0.05; // 5% exemplo
      });

      return Object.values(commissionsMap);
    } catch (e) {
      return [];
    }
  }
};
