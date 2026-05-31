import { supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('registers')
      .select('*')
      .eq('store_id', params.storeId)
      .is('closed_at', null)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async open(params: { storeId: string; openedBy: string; initialValue: number }) {
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
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string }) {
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
  },

  async getData(params: { storeId: string; openedAt: string }) {
    if (!supabase) return { sales: [], expenses: [] };
    
    // Busca vendas realizadas no caixa atual
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('store_id', params.storeId)
      .gte('created_at', params.openedAt);

    // Busca retiradas/despesas registradas
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('store_id', params.storeId)
      .gte('date', params.openedAt);

    return { 
      sales: sales || [], 
      expenses: expenses || [] 
    };
  },

  async getHistory() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('registers')
      .select('*')
      .order('opened_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
