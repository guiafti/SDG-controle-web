import { apiCall, supabase } from './api';

export const financialService = {
  async getSummary() {
    return apiCall(
      () => window.api.getFinancialSummary(),
      async () => {
        if (!supabase) return { totalSales: 0, totalExpenses: 0, balance: 0 };
        // Implementação simplificada para Web
        const { data: sales } = await supabase.from('sales').select('total');
        const { data: expenses } = await supabase.from('expenses').select('value');
        
        const totalSales = (sales || []).reduce((acc, s) => acc + (s.total || 0), 0);
        const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.value || 0), 0);
        
        return {
          totalSales,
          totalExpenses,
          balance: totalSales - totalExpenses
        };
      }
    );
  },

  async getExpenses() {
    return apiCall(
      () => window.api.getExpenses(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('expenses')
          .select('*, expense_categories(name)')
          .order('date', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async getCategories() {
    return apiCall(
      () => window.api.getExpenseCategories(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async saveExpense(expense: any) {
    return apiCall(
      () => window.api.saveExpense(expense),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('expenses').insert([{
          ...expense,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        }]);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async saveCategory(name: string) {
    return apiCall(
      () => window.api.saveExpenseCategory({ name }),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('expense_categories').insert([{
          id: crypto.randomUUID(),
          name,
          created_at: new Date().toISOString()
        }]);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async getBudgets() {
    return apiCall(
      () => window.api.getBudgets(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('budgets').select('*');
        if (error) throw error;
        return data || [];
      }
    );
  },

  async getDetailedReports(filters: any) {
    return apiCall(
      () => window.api.getDetailedReports(filters),
      async () => {
        // Implementação Web exigiria lógica complexa de agregação
        return [];
      }
    );
  },

  async exportToExcel(params: any) {
    return apiCall(
      () => window.api.exportReportToExcel(params),
      async () => ({ success: false, error: 'Exportação não disponível na versão Web' })
    );
  },

  async exportToPDF(params: any) {
    return apiCall(
      () => window.api.exportReportToPDF(params),
      async () => ({ success: false, error: 'Exportação não disponível na versão Web' })
    );
  },

  async getCommissions() {
    return apiCall(
      () => window.api.getCommissions(),
      async () => {
        if (!supabase) return [];
        // Lógica de comissões simplificada
        return [];
      }
    );
  }
};
