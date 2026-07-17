import { supabase } from './api';

export const saleService = {
  async save(saleData: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const newSaleId = saleData.id || crypto.randomUUID();
    
    // Remove colunas que não existem no Supabase na nuvem (como customer_id e synced)
    // para evitar erros de restrição no schema.
    const payload = {
      id: newSaleId,
      store_id: saleData.store_id,
      vendedor: saleData.vendedor,
      total: saleData.total,
      discount: saleData.discount,
      payment_method: saleData.payment_method,
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
