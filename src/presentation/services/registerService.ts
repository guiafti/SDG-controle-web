import { apiCall, supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    return apiCall(
      () => window.api.getCurrentRegister(params),
      async () => {
        if (!supabase) return null;
        const { data, error } = await supabase
          .from('registers')
          .select('*')
          .eq('store_id', params.storeId)
          .is('closed_at', null)
          .single();
        if (error) return null;
        return data;
      }
    );
  },

  async open(params: { storeId: string; openedBy: string; initialValue: number }) {
    return apiCall(
      () => window.api.openRegister(params),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const payload = {
          id: crypto.randomUUID(),
          store_id: params.storeId,
          opened_by: params.openedBy,
          initial_value: params.initialValue,
          opened_at: new Date().toISOString()
        };
        const { error } = await supabase.from('registers').insert([payload]);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string }) {
    return apiCall(
      () => window.api.closeRegister(params),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase
          .from('registers')
          .update({
            closed_by: params.closedBy,
            final_value: params.finalValue,
            observations: params.observations,
            closed_at: new Date().toISOString()
          })
          .eq('id', params.id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async getData(params: { storeId: string; openedAt: string }) {
    return apiCall(
      () => window.api.getRegisterData(params),
      async () => {
        if (!supabase) return { sales: [], expenses: [] };
        // Lógica para buscar vendas e despesas entre openedAt e agora
        return { sales: [], expenses: [] };
      }
    );
  },

  async getHistory() {
    return apiCall(
      () => window.api.getRegisterHistory(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase
          .from('registers')
          .select('*')
          .order('opened_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  }
};
