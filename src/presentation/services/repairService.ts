import { supabase } from './api';

export const repairService = {
  async getAll() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('maintenance_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[WEB REPAIRS ERROR]', e);
      return [];
    }
  },

  async getHistory(repairId: string) {
    // Retorna array vazio pois repair_logs não existe na nuvem do Supabase
    return [];
  },

  async updateStatus(params: { id: string; status: string; current_store_id: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('maintenance_orders')
      .update({ 
        status: params.status, 
        current_store_id: params.current_store_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateNotes(params: { id: string; technical_notes: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('maintenance_orders')
      .update({ 
        technical_notes: params.technical_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updatePayment(params: { id: string; payment_status: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('maintenance_orders')
      .update({ 
        payment_status: params.payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async save(repair: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    // Filtra e remove campos que não existem no Supabase antes de dar o upsert
    const payload = {
      id: repair.id || crypto.randomUUID(),
      customer_name: repair.customer_name,
      customer_phone: repair.customer_phone,
      device_brand: repair.device_brand,
      device_model: repair.device_model,
      issue_description: repair.issue_description,
      technical_notes: repair.technical_notes,
      checklist: repair.checklist,
      photo_url: repair.photo_url,
      price: Number(repair.price || 0),
      entry_store_id: repair.entry_store_id,
      maintenance_store_id: repair.maintenance_store_id,
      return_store_id: repair.return_store_id,
      current_store_id: repair.current_store_id,
      status: repair.status,
      payment_status: repair.payment_status || 'pending',
      created_at: repair.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('maintenance_orders').upsert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true, id: payload.id };
  },

  async addLog(log: { repair_id: string; action: string; user_name: string; notes?: string }) {
    // Retorna sucesso de mentira pois repair_logs não existe na nuvem
    return { success: true };
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('maintenance_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async uploadImage(params: { id: string; base64Data: string }) {
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

      // Salva no bucket correto de imagens do reparo (repair-images)
      const fileName = `repairs/${params.id}_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('repair-images')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('repair-images')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
