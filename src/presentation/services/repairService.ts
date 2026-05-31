import { apiCall, supabase } from './api';

export const repairService = {
  async getAll() {
    return apiCall(
      () => window.api.getRepairs(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async getHistory(repairId: string) {
    return apiCall(
      () => window.api.getRepairHistory(repairId),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('repair_logs')
          .select('*')
          .eq('repair_id', repairId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async updateStatus(params: { id: string; status: string; current_store_id: string }) {
    return apiCall(
      () => window.api.updateRepairStatus(params),
      async () => {
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
          user_name: 'Sistema Web' // Idealmente pegar do contexto de login
        });

        return { success: true };
      }
    );
  },

  async updateNotes(params: { id: string; technical_notes: string }) {
    return apiCall(
      () => window.api.updateRepairNotes(params),
      async () => {
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
      }
    );
  },

  async updatePayment(params: { id: string; payment_status: string }) {
    return apiCall(
      () => window.api.updateRepairPayment(params),
      async () => {
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
      }
    );
  },

  async save(repair: any) {
    return apiCall(
      () => window.api.saveRepair(repair),
      async () => {
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
      }
    );
  },

  async addLog(log: { repair_id: string; action: string; user_name: string; notes?: string }) {
    return apiCall(
      () => window.api.addRepairLog(log),
      async () => {
        if (!supabase) return { success: false };
        const { error } = await supabase.from('repair_logs').insert([{
          ...log,
          created_at: new Date().toISOString()
        }]);
        return { success: !error };
      }
    );
  },

  async getByCustomer(customerId: string) {
    return apiCall(
      () => window.api.getRepairsByCustomer(customerId),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('repairs')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async uploadImage(params: { id: string; base64Data: string }) {
    return apiCall(
      () => window.api.uploadRepairImage(params),
      async () => {
        // Implementação Web exigiria Supabase Storage
        return { success: false, error: 'Upload não disponível na versão Web' };
      }
    );
  }
};
