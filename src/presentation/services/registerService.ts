import { supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('store_id', params.storeId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      if (!data) return null;

      // Mapeia para o formato que o frontend espera
      return {
        id: data.id,
        store_id: data.store_id,
        opened_by: data.user_name,
        initial_value: data.opening_balance,
        opened_at: data.opened_at,
        closed_by: data.user_name,
        final_value: data.reported_balance || data.closing_balance || 0,
        observations: data.notes,
        closed_at: data.closed_at,
        status: data.status
      };
    } catch (e) {
      return null;
    }
  },

  async open(params: { storeId: string; openedBy: string; initialValue: number }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      id: crypto.randomUUID(),
      store_id: params.storeId,
      user_name: params.openedBy,
      opening_balance: params.initialValue,
      status: 'open',
      opened_at: new Date().toISOString()
    };
    const { error } = await supabase.from('cash_registers').insert([payload]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('cash_registers')
      .update({
        status: 'closed',
        closing_balance: params.finalValue,
        reported_balance: params.finalValue,
        notes: params.observations,
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
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      return (data || []).map(d => ({
        id: d.id,
        store_id: d.store_id,
        opened_by: d.user_name,
        initial_value: d.opening_balance,
        opened_at: d.opened_at,
        closed_by: d.user_name,
        final_value: d.reported_balance || d.closing_balance || 0,
        observations: d.notes,
        closed_at: d.closed_at,
        status: d.status
      }));
    } catch (e) {
      return [];
    }
  }
};
