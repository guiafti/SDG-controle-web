import { apiCall, supabase } from './api';

export const taskService = {
  async getAll() {
    return apiCall(
      () => window.api.getTasks(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      }
    );
  }
};

export const settingService = {
  async getAll() {
    return apiCall(
      () => window.api.getSettings(),
      async () => {
        if (!supabase) return [];
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        return data || [];
      }
    );
  }
};
