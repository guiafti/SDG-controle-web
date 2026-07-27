import { supabase } from './api';

export const financialService = {
  async getSummary() {
    if (!supabase) return { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [], ledger: [] };
    
    try {
      // 1. Inflows (RECEITA_VENDA, RECEITA_MANUTENCAO, ENTRADA_SUPRIMENTO, INFLOW)
      const { data: inflows } = await supabase
        .from('financial_transactions')
        .select('*')
        .in('type', ['RECEITA_VENDA', 'RECEITA_MANUTENCAO', 'ENTRADA_SUPRIMENTO', 'INFLOW']);

      // 2. Outflows (SAIDA_SANGRIA, DESPESA, OUTFLOW)
      const { data: outflows } = await supabase
        .from('financial_transactions')
        .select('*')
        .in('type', ['SAIDA_SANGRIA', 'DESPESA', 'OUTFLOW']);

      // 3. Ledger (Livro-caixa unificado)
      const { data: ledger } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const totalInflow = (inflows || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const totalOutflow = (outflows || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
      
      const salesInflow = (inflows || [])
        .filter(t => t.type === 'RECEITA_VENDA' || t.category === 'VENDA')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const repairsInflow = (inflows || [])
        .filter(t => t.type === 'RECEITA_MANUTENCAO' || t.category === 'MANUTENÇÃO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Busca vendas para calcular custo estimado de produto
      const { data: sales } = await supabase.from('sales').select('items').eq('status', 'CONCLUIDA');
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

      const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      const monthlyTotals: Record<number, number> = {};
      (inflows || []).forEach((t: any) => {
        const dt = t.created_at || t.date;
        if (dt) {
          try {
            const dateObj = new Date(dt);
            const month = dateObj.getMonth();
            monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(t.amount || 0);
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
          date: l.created_at || l.date,
          description: l.description,
          type: l.type || l.category,
          value: Number(l.amount || 0),
          payment_method: l.payment_method,
          trans_type: l.type,
          reference_id: l.reference_id,
          store_id: l.store_id
        })),
        trends: trends.length > 0 ? trends : [{ month: MONTH_NAMES[new Date().getMonth()], inflow: 0 }]
      };
    } catch (e) {
      console.error('[GETSUMMARY ERROR]', e);
      return { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [], ledger: [] };
    }
  },

  async saveSangria(params: { amount: number; description: string; storeId?: string; operator?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      id: crypto.randomUUID(),
      type: 'SAIDA_SANGRIA',
      amount: Number(params.amount),
      payment_method: 'DINHEIRO',
      description: params.description || `Sangria por ${params.operator || 'Operador'}`,
      store_id: params.storeId || null,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('financial_transactions').insert([payload]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async saveSuprimento(params: { amount: number; description: string; storeId?: string; operator?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      id: crypto.randomUUID(),
      type: 'ENTRADA_SUPRIMENTO',
      amount: Number(params.amount),
      payment_method: 'DINHEIRO',
      description: params.description || `Suprimento por ${params.operator || 'Operador'}`,
      store_id: params.storeId || null,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('financial_transactions').insert([payload]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getExpenses() {
    if (!supabase) return [];
    try {
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

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
      console.error('[EXPENSES ERROR]', e);
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
    const expenseId = expense.id || crypto.randomUUID();
    const amount = Number(expense.value || expense.amount || 0);

    const { error } = await supabase.from('expenses').insert([{
      ...expense,
      id: expenseId,
      value: amount,
      created_at: new Date().toISOString()
    }]);

    if (error) return { success: false, error: error.message };

    // Grava também no livro caixa unificado (financial_transactions)
    try {
      await supabase.from('financial_transactions').insert([{
        id: crypto.randomUUID(),
        type: 'DESPESA',
        amount: amount,
        payment_method: expense.payment_method || 'DINHEIRO',
        description: `Despesa: ${expense.description || 'Outra'}`,
        store_id: expense.store_id || null,
        reference_id: expenseId,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('[SAVE EXPENSE] Erro ao gravar transação financeira:', e);
    }

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
      if (filters.storeId && filters.storeId !== 'all') query = query.eq('store_id', filters.storeId);
      
      const { data, error } = await query;
      if (error) return [];
      
      return (data || []).map(s => ({
        ...s,
        customers: { name: s.customer_name || 'Consumidor Final' },
        users: { name: s.seller_name || s.vendedor || 'Operador' }
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
      // 1. Tenta buscar da tabela seller_commissions
      const { data: comms } = await supabase
        .from('seller_commissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (comms && comms.length > 0) {
        const commissionsMap: any = {};
        comms.forEach(c => {
          const sellerName = c.seller_name || 'Desconhecido';
          if (!commissionsMap[sellerName]) {
            commissionsMap[sellerName] = { userName: sellerName, totalSales: 0, commission: 0 };
          }
          commissionsMap[sellerName].commission += Number(c.amount || 0);
        });
        return Object.values(commissionsMap);
      }

      // Fallback lendo das vendas
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'CONCLUIDA')
        .order('created_at', { ascending: false });
        
      if (error) return [];
      
      const commissionsMap: any = {};
      (data || []).forEach(sale => {
        const userName = sale.seller_name || sale.vendedor || 'Desconhecido';
        const total = Number(sale.total_amount ?? sale.total ?? 0);
        if (!commissionsMap[userName]) {
          commissionsMap[userName] = {
            userName,
            totalSales: 0,
            commission: 0
          };
        }
        commissionsMap[userName].totalSales += total;
        commissionsMap[userName].commission += Number((total * 0.05).toFixed(2));
      });

      return Object.values(commissionsMap);
    } catch (e) {
      return [];
    }
  }
};

