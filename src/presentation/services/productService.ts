import { supabase } from './api';

export const productService = {
  async getAll(includeArchived = false) {
    if (!supabase) return [];
    let query = supabase.from('products').select('*').order('name', { ascending: true });
    if (!includeArchived) {
      query = query.eq('archived', 0);
    }
    const { data, error } = await query;
    if (error) throw error;
    
    const { data: inventory } = await supabase.from('inventory').select('*');
    
    return (data || []).map(p => {
      const pInv = (inventory || []).filter(i => i.product_id === p.id);
      const stocks: any = {};
      pInv.forEach(i => stocks[i.store_id] = i.quantity);
      return { ...p, stocks };
    });
  },

  async getByBarcode(barcode: string) {
    if (!supabase || !barcode) return null;
    
    const cleanBarcode = barcode.trim();
    console.log(`[PRODUCT] Buscando código: ${cleanBarcode}`);

    try {
      // 1. Tenta busca exata pelo código principal
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', cleanBarcode)
        .maybeSingle();

      if (data) return data;

      // 2. Se não achar, tenta busca nos códigos extras (formato JSON ou texto)
      let { data: extraData } = await supabase
        .from('products')
        .select('*')
        .ilike('extra_barcodes', `%${cleanBarcode}%`)
        .maybeSingle();

      if (extraData) return extraData;

      console.warn(`[PRODUCT] Nenhum produto encontrado para: ${cleanBarcode}`);
      return null;
    } catch (e) {
      console.error(`[PRODUCT] Erro na busca por código:`, e);
      return null;
    }
  },

  async saveManual(product: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      ...product,
      id: product.id || crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('products').upsert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async archive(id: string, archived: boolean) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from('products').update({ archived: archived ? 1 : 0 }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateQuantity(params: { productId: string; storeId: string; quantity: number }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase.from('inventory').upsert({
      product_id: params.productId,
      store_id: params.storeId,
      quantity: params.quantity,
      updated_at: new Date().toISOString()
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async uploadImage(params: { barcode: string; base64Data: string }) {
    // Para 100% cloud, o upload de imagem deve ser para o Supabase Storage
    // Se o Bucket 'product-images' não existir, isso falhará.
    // Como medida de transição, mantemos a assinatura mas usando o Supabase se possível.
    if (!supabase) return { success: false, error: 'Supabase não configurado' };
    
    try {
      // Converte base64 para Blob/File
      const base64Content = params.base64Data.split(';base64,').pop() || '';
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `${params.barcode}.jpg`;
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      // Atualiza o produto com a nova URL da imagem (mantendo compatibilidade com 'image' e 'image_url')
      await supabase.from('products').update({ 
        image: publicUrl,
        image_url: publicUrl 
      }).eq('barcode', params.barcode);

      return { success: true, url: publicUrl, fileName: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async importXml(xmlData: string, storeId: string) {
    // Importação XML requer parsing. Na versão cloud, fazemos o parsing no client.
    return { success: false, error: 'Importação XML deve ser refatorada para o Frontend' };
  },

  async getLibraryItems() {
    if (!supabase) return [];
    const { data } = await supabase.from('product_library').select('*');
    return data || [];
  },

  async uploadLibraryImage(params: { name: string; base64Data: string }) {
    if (!supabase) return { success: false, error: 'Supabase não configurado' };
    try {
      const base64Content = params.base64Data.split(';base64,').pop() || '';
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `library/${params.name}.jpg`;
      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl, fileName: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async saveLibraryItem(item: any) {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('product_library').upsert(item);
    return { success: !error };
  }
};
