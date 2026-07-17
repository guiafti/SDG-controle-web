import { supabase } from './api';

export const saleService = {
  async save(saleData: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const newSaleId = saleData.id || crypto.randomUUID();
    
    // Converte items para string JSON se for um objeto/array (garante que caiba no campo TEXT do banco)
    const payload = {
      ...saleData,
      id: newSaleId,
      items: typeof saleData.items === 'string' ? saleData.items : JSON.stringify(saleData.items),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('sales').insert([payload]);
    if (error) return { success: false, error: error.message };
    return { success: true, saleId: newSaleId };
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  }
};
