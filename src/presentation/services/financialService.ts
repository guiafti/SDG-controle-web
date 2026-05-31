import { supabase } from './api';

export const financialService = {
  async getSummary() {
    if (!supabase) return { totalSales: 0, totalExpenses: 0, balance: 0 };
    // Implementação para Nuvem
    const { data: sales } = await supabase.from('sales').select('total');
    const { data: expenses } = await supabase.from('expenses').select('value');
    
    const totalSales = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);
    const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.value || 0), 0);
    
    return {
      totalSales,
      totalExpenses,
      balance: totalSales - totalExpenses
    };
  },

  async getExpenses() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getCategories() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
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
    if (!supabase) return [];
    const { data, error } = await supabase.from('budgets').select('*');
    if (error) throw error;
    return data || [];
  },

  async getDetailedReports(filters: any) {
    if (!supabase) return [];
    let query = supabase.from('sales').select('*, customers(name), users(name)');
    
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);
    if (filters.storeId) query = query.eq('store_id', filters.storeId);
    
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  async exportToExcel(params: any) {
    return { success: false, error: 'Exportação Excel deve ser implementada no Frontend' };
  },

  async exportToPDF(params: any) {
    return { success: false, error: 'Exportação PDF deve ser implementada no Frontend' };
  },

  async getCommissions() {
    if (!supabase) return [];
    // Busca vendas com informações de usuários para cálculo de comissão
    const { data, error } = await supabase
      .from('sales')
      .select('*, users(name, role)')
      .order('created_at', { ascending: false });
      
    if (error) return [];
    
    // Agrupa por usuário e calcula (exemplo de lógica)
    const commissionsMap: any = {};
    (data || []).forEach(sale => {
      const userName = sale.users?.name || 'Desconhecido';
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
  }
};
