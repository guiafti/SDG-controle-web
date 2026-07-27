import { supabase } from './api';

export const saleService = {
  async save(saleData: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    
    const newSaleId = saleData.id || crypto.randomUUID();
    const totalAmount = Number(saleData.total_amount ?? saleData.total ?? 0);
    const discount = Number(saleData.discount || 0);
    const paymentMethod = saleData.payment_method || 'DINHEIRO';
    const sellerName = saleData.seller_name || saleData.vendedor || 'Desconhecido';
    const items = Array.isArray(saleData.items)
      ? saleData.items
      : (typeof saleData.items === 'string' ? JSON.parse(saleData.items || '[]') : []);

    // 1. Inserir na tabela 'sales' com fallbacks resilientes
    const createdAt = new Date().toISOString();
    const payloadFull = {
      id: newSaleId,
      total_amount: totalAmount,
      total: totalAmount,
      discount: discount,
      payment_method: paymentMethod,
      vendedor: sellerName,
      store_id: saleData.store_id || null,
      status: 'CONCLUIDA',
      items: typeof saleData.items === 'string' ? saleData.items : JSON.stringify(saleData.items),
      created_at: createdAt
    };

    let { error } = await supabase.from('sales').insert([payloadFull]);

    if (error) {
      console.warn('[SALE SERVICE] Erro no payload completo de venda, tentando fallback:', error.message);

      // Fallback 1: sem customer_id e vendedor
      const payloadFallback1 = {
        id: newSaleId,
        total_amount: totalAmount,
        total: totalAmount,
        discount: discount,
        payment_method: paymentMethod,
        seller_name: sellerName,
        status: 'CONCLUIDA',
        items: payloadFull.items,
        created_at: createdAt
      };
      const res1 = await supabase.from('sales').insert([payloadFallback1]);

      if (res1.error) {
        // Fallback 2: legados puros
        const payloadFallback2 = {
          id: newSaleId,
          total: totalAmount,
          discount: discount,
          payment_method: paymentMethod,
          vendedor: sellerName,
          store_id: saleData.store_id || null,
          items: payloadFull.items,
          created_at: createdAt
        };
        const res2 = await supabase.from('sales').insert([payloadFallback2]);

        if (res2.error) {
          // Fallback 3: minimalista essencial
          const payloadMinimal = {
            id: newSaleId,
            total: totalAmount,
            payment_method: paymentMethod,
            created_at: createdAt
          };
          const resMin = await supabase.from('sales').insert([payloadMinimal]);
          if (resMin.error) {
            return { success: false, error: resMin.error.message };
          }
        }
      }
    }

    // 2. Inserir na tabela 'sale_items'
    if (items.length > 0) {
      const saleItemsPayload = items.map((item: any) => ({
        id: crypto.randomUUID(),
        sale_id: newSaleId,
        product_id: item.id || null,
        product_name: item.nome || item.name || 'Produto',
        quantity: Number(item.qtd || item.quantity || 1),
        unit_price: Number(item.preco || item.unit_price || 0),
        total_price: Number(item.preco || item.unit_price || 0) * Number(item.qtd || item.quantity || 1)
      }));

      try {
        await supabase.from('sale_items').insert(saleItemsPayload);
      } catch (e) {
        console.warn('[SALE SERVICE] Aviso ao salvar sale_items:', e);
      }
    }

    // 3. Gerar registro em 'financial_transactions' (Livro Caixa)
    try {
      await supabase.from('financial_transactions').insert([{
        id: crypto.randomUUID(),
        type: 'RECEITA_VENDA',
        category: 'VENDA',
        amount: totalAmount,
        payment_method: paymentMethod,
        description: `Venda #${newSaleId.substring(0, 8).toUpperCase()}`,
        store_id: saleData.store_id || null,
        reference_id: newSaleId,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('[SALE SERVICE] Aviso ao gravar transação financeira:', e);
    }

    // 4. Gerar registro em 'seller_commissions' (5% da venda)
    const commissionAmount = Number((totalAmount * 0.05).toFixed(2));
    if (commissionAmount > 0) {
      try {
        const commPayload = {
          id: crypto.randomUUID(),
          sale_id: newSaleId,
          seller_name: sellerName,
          amount: commissionAmount,
          created_at: new Date().toISOString()
        };
        const { error: commErr } = await supabase.from('seller_commissions').insert([commPayload]);
        if (commErr) {
          // Fallback para tabela 'commissions'
          await supabase.from('commissions').insert([commPayload]);
        }
      } catch (e) {
        console.warn('[SALE SERVICE] Aviso ao gravar comissão:', e);
      }
    }

    // 5. Subtrair quantidade de 'products.stock_quantity'
    for (const item of items) {
      const qty = Number(item.qtd || item.quantity || 1);
      if (item.id) {
        try {
          const { data: prod } = await supabase
            .from('products')
            .select('stock_quantity, quantity')
            .eq('id', item.id)
            .maybeSingle();

          if (prod) {
            const currentStock = Number(prod.stock_quantity ?? prod.quantity ?? 0);
            const newStock = Math.max(0, currentStock - qty);
            await supabase.from('products').update({
              stock_quantity: newStock,
              quantity: newStock,
              updated_at: new Date().toISOString()
            }).eq('id', item.id);
          }

          if (saleData.store_id) {
            const { data: inv } = await supabase
              .from('inventory')
              .select('quantity')
              .eq('product_id', item.id)
              .eq('store_id', saleData.store_id)
              .maybeSingle();

            if (inv) {
              const newInvStock = Math.max(0, Number(inv.quantity || 0) - qty);
              await supabase.from('inventory').update({
                quantity: newInvStock,
                updated_at: new Date().toISOString()
              }).eq('product_id', item.id).eq('store_id', saleData.store_id);
            }
          }
        } catch (stErr) {
          console.warn('[SALE SERVICE] Erro ao atualizar estoque do produto:', item.id, stErr);
        }
      }
    }

    return { success: true, saleId: newSaleId };
  },

  async cancel(saleId: string) {
    if (!supabase) throw new Error('Supabase não configurado');

    try {
      // 1. Busca venda para devolução de estoque
      const { data: sale, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .maybeSingle();

      if (error || !sale) return { success: false, error: 'Venda não encontrada' };

      const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);

      // 2. Devolver quantidades para products.stock_quantity
      for (const item of items) {
        const qty = Number(item.qtd || item.quantity || 1);
        if (item.id) {
          const { data: prod } = await supabase
            .from('products')
            .select('stock_quantity, quantity')
            .eq('id', item.id)
            .maybeSingle();

          if (prod) {
            const newStock = Number(prod.stock_quantity ?? prod.quantity ?? 0) + qty;
            await supabase.from('products').update({
              stock_quantity: newStock,
              quantity: newStock,
              updated_at: new Date().toISOString()
            }).eq('id', item.id);
          }

          if (sale.store_id) {
            const { data: inv } = await supabase
              .from('inventory')
              .select('quantity')
              .eq('product_id', item.id)
              .eq('store_id', sale.store_id)
              .maybeSingle();

            if (inv) {
              const newInvStock = Number(inv.quantity || 0) + qty;
              await supabase.from('inventory').update({
                quantity: newInvStock,
                updated_at: new Date().toISOString()
              }).eq('product_id', item.id).eq('store_id', sale.store_id);
            }
          }
        }
      }

      // 3. Atualizar status da venda
      await supabase.from('sales').update({ status: 'CANCELADA' }).eq('id', saleId);

      // 4. Estornar transação financeira
      await supabase.from('financial_transactions').delete().eq('reference_id', saleId);

      // 5. Remover comissão
      await supabase.from('seller_commissions').delete().eq('sale_id', saleId);
      await supabase.from('commissions').delete().eq('sale_id', saleId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getByCustomer(customerId: string) {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async getAll() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('[SALES SERVICE] Erro ao buscar vendas:', e);
      return [];
    }
  },

  async update(updatedSale: any) {
    if (!supabase) throw new Error('Supabase não configurado');
    try {
      const payload = {
        store_id: updatedSale.store_id || null,
        vendedor: updatedSale.vendedor || updatedSale.seller_name,
        payment_method: updatedSale.payment_method,
        discount: Number(updatedSale.discount || 0),
        total: Number(updatedSale.total || 0),
        total_amount: Number(updatedSale.total || 0),
        customer_id: updatedSale.customer_id || null,
        items: typeof updatedSale.items === 'string' ? updatedSale.items : JSON.stringify(updatedSale.items || []),
        edited: 1,
        created_at: updatedSale.created_at || new Date().toISOString()
      };

      const { error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', updatedSale.id);

      if (error) return { success: false, error: error.message };

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async delete(saleId: string) {
    return this.cancel(saleId);
  }
};


