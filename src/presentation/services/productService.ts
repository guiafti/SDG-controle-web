import { apiCall, supabase } from './api';

export const productService = {
  async getAll(includeArchived = false) {
    return apiCall(
      () => window.api.getAllProducts(includeArchived),
      async () => {
        if (!supabase) return [];
        let query = supabase.from('products').select('*').order('name', { ascending: true });
        if (!includeArchived) {
          query = query.eq('archived', 0);
        }
        const { data, error } = await query;
        if (error) throw error;
        
        // Pega estoque para cada produto (modo web direto)
        const { data: inventory } = await supabase.from('inventory').select('*');
        
        return (data || []).map(p => {
          const pInv = (inventory || []).filter(i => i.product_id === p.id);
          const stocks: any = {};
          pInv.forEach(i => stocks[i.store_id] = i.quantity);
          return { ...p, stocks };
        });
      }
    );
  },

  async getByBarcode(barcode: string) {
    return apiCall(
      () => window.api.getProductByBarcode(barcode),
      async () => {
        if (!supabase) return null;
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`barcode.eq.${barcode},extra_barcodes.ilike.%${barcode}%`)
          .single();
        if (error) return null;
        return data;
      }
    );
  }
};
