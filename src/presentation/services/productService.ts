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
  },

  async saveManual(product: any) {
    return apiCall(
      () => window.api.saveManualProduct(product),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const payload = {
          ...product,
          id: product.id || crypto.randomUUID(),
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('products').upsert(payload);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async archive(id: string, archived: boolean) {
    return apiCall(
      () => window.api.archiveProduct({ id, archived }),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('products').update({ archived: archived ? 1 : 0 }).eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async updateQuantity(params: { productId: string; storeId: string; quantity: number }) {
    return apiCall(
      () => window.api.updateInventoryQuantity(params),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('inventory').upsert({
          product_id: params.productId,
          store_id: params.storeId,
          quantity: params.quantity,
          updated_at: new Date().toISOString()
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async uploadImage(params: { barcode: string; base64Data: string }) {
    return apiCall(
      () => window.api.uploadProductImage(params),
      async () => ({ success: false, error: 'Upload não disponível na versão Web' })
    );
  },

  async importXml(xmlData: string, storeId: string) {
    return apiCall(
      () => window.api.importXmlProducts(xmlData, storeId),
      async () => ({ success: false, error: 'Importação XML disponível apenas no Desktop' })
    );
  },

  async getLibraryItems() {
    return apiCall(
      () => window.api.getLibraryItems(),
      async () => {
        if (!supabase) return [];
        const { data } = await supabase.from('product_library').select('*');
        return data || [];
      }
    );
  },

  async uploadLibraryImage(params: { name: string; base64Data: string }) {
    return apiCall(
      () => window.api.uploadLibraryImage(params),
      async () => ({ success: false, error: 'Upload não disponível na versão Web' })
    );
  },

  async saveLibraryItem(item: any) {
    return apiCall(
      () => window.api.saveLibraryItem(item),
      async () => {
        if (!supabase) return { success: false };
        const { error } = await supabase.from('product_library').upsert(item);
        return { success: !error };
      }
    );
  }
};
