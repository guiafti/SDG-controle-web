import { apiCall, supabase } from './api';

export const userService = {
  async getAll() {
    return apiCall(
      () => window.api.getUsers(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
        if (error) throw error;
        return data || [];
      }
    );
  },

  async login(credentials: { username: string; password: any }) {
    return apiCall(
      () => window.api.login(credentials),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { data, error } = await supabase
          .from('users')
          .select('id, name, role, photo_url')
          .eq('name', credentials.username)
          .eq('password', credentials.password)
          .single();
        
        if (error || !data) return null;
        return data;
      }
    );
  },

  async save(user: any) {
    return apiCall(
      () => window.api.saveUser(user),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const payload = {
          ...user,
          id: user.id || crypto.randomUUID(),
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('users').upsert(payload);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async uploadPhoto(params: { userId: string; base64Data: string }) {
    return apiCall(
      () => window.api.uploadUserPhoto(params),
      async () => ({ success: false, error: 'Upload não disponível na versão Web' })
    );
  }
};
