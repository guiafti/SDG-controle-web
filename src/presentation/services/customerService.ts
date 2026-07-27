import { supabase } from './api';

export const customerService = {
  async getAll() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*');

      if (!error && data && data.length > 0) {
        return data.map(c => ({
          ...c,
          name: c.name || c.nome || 'Cliente sem nome',
          phone: c.phone || c.telefone || ''
        }));
      }

      // Fallback para 'clients'
      const { data: fallbackData } = await supabase
        .from('clients')
        .select('*');

      return (fallbackData || []).map(c => ({
        ...c,
        name: c.name || c.nome || 'Cliente sem nome',
        phone: c.phone || c.telefone || ''
      }));
    } catch (e) {
      return [];
    }
  },

  async save(customer: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    const customerId = customer.id || crypto.randomUUID();
    const name = customer.name || customer.nome || '';
    const phone = customer.phone || customer.telefone || '';

    const payload = {
      id: customerId,
      name: name,
      nome: name,
      phone: phone,
      telefone: phone,
      cpf: customer.cpf || null,
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('customers').upsert(payload);
    if (error) {
      // Fallback para 'clients'
      const { error: err2 } = await supabase.from('clients').upsert(payload);
      if (err2) return { success: false, error: err2.message };
    }

    return { success: true };
  }
};

