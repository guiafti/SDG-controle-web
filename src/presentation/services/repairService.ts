import { supabase } from './api';

export const repairService = {
  async getAll() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getHistory(repairId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('repair_logs')
      .select('*')
      .eq('repair_id', repairId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateStatus(params: { id: string; status: string; current_store_id: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('repairs')
      .update({ 
        status: params.status, 
        current_store_id: params.current_store_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };

    // Adicionar log automaticamente
    await this.addLog({
      repair_id: params.id,
      action: `Status alterado para: ${params.status}`,
      user_name: 'Usuário' 
    });

    return { success: true };
  },

  async updateNotes(params: { id: string; technical_notes: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('repairs')
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
      .from('repairs')
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
    const payload = {
      ...repair,
      id: repair.id || crypto.randomUUID(),
      created_at: repair.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('repairs').upsert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true, id: payload.id };
  },

  async addLog(log: { repair_id: string; action: string; user_name: string; notes?: string }) {
    if (!supabase) return { success: false };
    const { error } = await supabase.from('repair_logs').insert([{
      ...log,
      created_at: new Date().toISOString()
    }]);
    return { success: !error };
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
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

      const fileName = `repairs/${params.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('repairs')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('repairs')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
