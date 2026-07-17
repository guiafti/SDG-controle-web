import { supabase } from './api';

export const financialService = {
  async getSummary() {
    if (!supabase) return { totalSales: 0, totalExpenses: 0, balance: 0 };
    try {
      const { data: sales } = await supabase.from('sales').select('total');
      const { data: expenses } = await supabase.from('expenses').select('value');
      
      const totalSales = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);
      const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.value || 0), 0);
      
      return {
        totalSales,
        totalExpenses,
        balance: totalSales - totalExpenses
      };
    } catch (e) {
      return { totalSales: 0, totalExpenses: 0, balance: 0 };
    }
  },

  async getExpenses() {
    if (!supabase) return [];
    try {
      // Faz duas queries separadas para evitar erro 400 de relacionamento implícito do PostgREST
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
    // Retorna vazio pois a tabela de orçamentos/metas não existe/não é sincronizada na nuvem
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
      
      // Simula Joins locais para o frontend não quebrar
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
