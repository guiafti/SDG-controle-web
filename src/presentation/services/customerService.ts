import { apiCall, supabase } from './api';

export const customerService = {
  async getAll() {
    return apiCall(
      () => window.api.getCustomers(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async save(customer: any) {
    return apiCall(
      () => window.api.saveCustomer(customer),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const payload = {
          ...customer,
          id: customer.id || crypto.randomUUID(),
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('customers').upsert(payload);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  }
};
