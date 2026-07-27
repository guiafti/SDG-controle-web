import { supabase } from './api';

export const repairService = {
  async getAll() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('maintenance_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[REPAIRS ERROR]', e);
      return [];
    }
  },

  async getHistory(repairId: string) {
    return [];
  },

  async updateStatus(params: { id: string; status: string; current_store_id?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const payload: any = {
      status: params.status,
      updated_at: new Date().toISOString()
    };
    if (params.current_store_id) payload.current_store_id = params.current_store_id;

    const { error } = await supabase
      .from('maintenance_orders')
      .update(payload)
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateNotes(params: { id: string; technical_notes: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const { error } = await supabase
      .from('maintenance_orders')
      .update({ 
        technical_notes: params.technical_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updatePayment(params: { id: string; payment_status: string; payment_method?: string }) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const { data: order } = await supabase
      .from('maintenance_orders')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    const { error } = await supabase
      .from('maintenance_orders')
      .update({ 
        payment_status: params.payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);
    
    if (error) return { success: false, error: error.message };

    // Se o pagamento foi efetuado (paid), gera lançamento em financial_transactions
    if (params.payment_status === 'paid' && order) {
      try {
        const method = params.payment_method || 'DINHEIRO';
        const price = Number(order.price || 0);
        if (price > 0) {
          await supabase.from('financial_transactions').insert([{
            id: crypto.randomUUID(),
            type: 'RECEITA_MANUTENCAO',
            category: 'MANUTENÇÃO',
            amount: price,
            payment_method: method,
            description: `Receita OS Manutenção #${params.id.substring(0, 8)} - ${order.customer_name || 'Cliente'}`,
            reference_id: params.id,
            created_at: new Date().toISOString()
          }]);
        }
      } catch (e) {
        console.warn('[REPAIR SERVICE] Aviso ao gravar transação de manutenção:', e);
      }
    }

    return { success: true };
  },

  async save(repair: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const repairId = repair.id || crypto.randomUUID();
    const price = Number(repair.price || 0);

    const payload = {
      id: repairId,
      customer_name: repair.customer_name || repair.customer,
      customer_phone: repair.customer_phone || repair.phone,
      device_brand: repair.device_brand || repair.brand,
      device_model: repair.device_model || repair.model,
      issue_description: repair.issue_description || repair.problem,
      technical_notes: repair.technical_notes || repair.notes,
      checklist: repair.checklist,
      photo_url: repair.photo_url,
      price: price,
      entry_store_id: repair.entry_store_id,
      maintenance_store_id: repair.maintenance_store_id,
      return_store_id: repair.return_store_id,
      current_store_id: repair.current_store_id,
      status: repair.status || 'Pendente',
      payment_status: repair.payment_status || 'pending',
      created_at: repair.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('maintenance_orders').upsert(payload);
    if (error) return { success: false, error: error.message };

    // Se estiver pago ao salvar, garante o registro em financial_transactions
    if (payload.payment_status === 'paid' && price > 0) {
      try {
        await supabase.from('financial_transactions').insert([{
          id: crypto.randomUUID(),
          type: 'RECEITA_MANUTENCAO',
          category: 'MANUTENÇÃO',
          amount: price,
          payment_method: repair.payment_method || 'DINHEIRO',
          description: `Receita OS Manutenção #${repairId.substring(0, 8)} - ${payload.customer_name}`,
          reference_id: repairId,
          created_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.warn('[REPAIR SERVICE] Aviso ao gravar transação no salvamento:', e);
      }
    }

    return { success: true, id: repairId };
  },

  async addLog(log: { repair_id: string; action: string; user_name: string; notes?: string }) {
    return { success: true };
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('maintenance_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async uploadImage(params: { id: string; base64Data: string }) {
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

      // Salva no bucket público de imagens de reparo: repair-images
      const fileName = `repairs/${params.id}_${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('repair-images')
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('repair-images')
        .getPublicUrl(fileName);

      // Salva registro em maintenance_photos
      try {
        await supabase.from('maintenance_photos').insert([{
          id: crypto.randomUUID(),
          maintenance_order_id: params.id,
          photo_url: publicUrl,
          created_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.warn('[REPAIR SERVICE] Aviso ao salvar em maintenance_photos:', e);
      }

      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};

