import { supabase } from './api';

export const saleService = {
  async save(saleData: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from('sales').insert([{
      ...saleData,
      id: saleData.id || crypto.randomUUID(),
      created_at: new Date().toISOString()
    }]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
