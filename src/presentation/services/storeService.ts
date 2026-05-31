import { apiCall, supabase } from './api';

export const storeService = {
  async getAll(includeArchived = false) {
    return apiCall(
      () => window.api.getStores(includeArchived),
      async () => {
        if (!supabase) return [];
        let query = supabase.from('stores').select('*').order('name', { ascending: true });
        if (!includeArchived) {
          query = query.eq('archived', 0);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
    );
  },

  async save(store: { id?: string; name: string }) {
    return apiCall(
      () => window.api.saveStore(store),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const payload = {
          id: store.id || crypto.randomUUID(),
          name: store.name.toUpperCase(),
          archived: 0
        };
        const { error } = await supabase.from('stores').upsert(payload);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async archive(id: string, archived: boolean) {
    return apiCall(
      () => window.api.archiveStore({ id, archived }),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('stores').update({ archived: archived ? 1 : 0 }).eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  }
};
