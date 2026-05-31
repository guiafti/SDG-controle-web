import { supabase } from './api';

export const userService = {
  async getAll() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async login(credentials: { username: string; password: any }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, photo_url')
      .eq('name', credentials.username)
      .eq('password', credentials.password)
      .maybeSingle();
    
    if (error || !data) return null;
    return data;
  },

  async save(user: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    const payload = {
      ...user,
      id: user.id || crypto.randomUUID(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('users').upsert(payload);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async uploadPhoto(params: { userId: string; base64Data: string }) {
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

      const fileName = `users/${params.userId}.jpg`;
      const { error } = await supabase.storage
        .from('profiles')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      await supabase.from('users').update({ photo_url: publicUrl }).eq('id', params.userId);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
