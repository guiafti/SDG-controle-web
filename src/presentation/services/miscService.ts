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
  },

  async save(task: any) {
    return apiCall(
      () => window.api.saveTask(task),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('tasks').upsert({
          ...task,
          id: task.id || crypto.randomUUID(),
          created_at: task.created_at || new Date().toISOString()
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async complete(id: string, photo: string, justification: string) {
    return apiCall(
      () => window.api.completeTask(id, photo, justification),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('tasks').update({
          status: 'completed',
          completion_photo: photo,
          justification: justification,
          completed_at: new Date().toISOString()
        }).eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  },

  async delete(id: string) {
    return apiCall(
      () => window.api.deleteTask(id),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true };
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
  },

  async save(settings: { key: string; value: string }[]) {
    return apiCall(
      () => window.api.saveSettings(settings),
      async () => {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.from('settings').upsert(settings);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    );
  }
};
