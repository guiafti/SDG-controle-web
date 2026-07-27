import { supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    if (!supabase) return null;
    try {
      let query = supabase
        .from('cash_registers')
        .select('*');
      
      if (params.storeId) {
        query = query.or(`store_id.eq.${params.storeId},store_id.is.null`);
      }

      const { data, error } = await query
        .in('status', ['ABERTO', 'open', 'aberto', 'OPEN'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const initialAmount = Number(data.initial_amount ?? data.opening_balance ?? data.initial_value ?? 0);
      const finalAmount = Number(data.final_cash_amount ?? data.reported_balance ?? data.closing_balance ?? 0);

      return {
        id: data.id,
        store_id: data.store_id,
        operator: data.operator || data.user_name || data.opened_by || 'Operador',
        user_name: data.operator || data.user_name || data.opened_by || 'Operador',
        opened_by: data.operator || data.user_name || data.opened_by || 'Operador',
        initial_amount: initialAmount,
        opening_balance: initialAmount,
        initial_value: initialAmount,
        opened_at: data.opened_at || new Date().toISOString(),
        closed_by: data.closed_by || data.operator || data.user_name,
        final_cash_amount: finalAmount,
        closing_balance: finalAmount,
        reported_balance: finalAmount,
        final_value: finalAmount,
        expected_cash_amount: Number(data.expected_cash_amount ?? 0),
        difference: Number(data.difference ?? 0),
        total_sales: Number(data.closing_balance || data.total_sales || 0),
        observations: data.notes || data.observations || '',
        notes: data.notes || data.observations || '',
        closed_at: data.closed_at,
        status: data.status
      };
    } catch (e) {
      console.error('[REGISTER SERVICE] Erro ao obter caixa atual:', e);
      return null;
    }
  },

  async open(params: { storeId: string; openedBy: string; initialValue: number }) {
    if (!supabase) throw new Error('Supabase não configurado');
    const id = crypto.randomUUID();
    const openedAt = new Date().toISOString();
    const initialAmount = Number(params.initialValue || 0);

    const fullPayload = {
      id,
      store_id: params.storeId || null,
      operator: params.openedBy || 'Operador',
      user_name: params.openedBy || 'Operador',
      opened_by: params.openedBy || 'Operador',
      initial_amount: initialAmount,
      opening_balance: initialAmount,
      initial_value: initialAmount,
      status: 'ABERTO',
      opened_at: openedAt
    };

    const { error } = await supabase.from('cash_registers').insert([fullPayload]);
    if (!error) return { success: true };

    console.warn('[REGISTER OPEN] Payload completo falhou, tentando fallback 1:', error.message);

    const fallback1 = {
      id,
      store_id: params.storeId || null,
      operator: params.openedBy || 'Operador',
      initial_amount: initialAmount,
      opening_balance: initialAmount,
      status: 'ABERTO',
      opened_at: openedAt
    };
    const { error: err1 } = await supabase.from('cash_registers').insert([fallback1]);
    if (!err1) return { success: true };

    console.warn('[REGISTER OPEN] Fallback 1 falhou, tentando fallback 2:', err1.message);

    const fallback2 = {
      id,
      store_id: params.storeId || null,
      initial_amount: initialAmount,
      status: 'ABERTO',
      opened_at: openedAt
    };
    const { error: err2 } = await supabase.from('cash_registers').insert([fallback2]);
    if (err2) {
      console.error('[REGISTER OPEN] Erro ao abrir caixa:', err2.message);
      return { success: false, error: err2.message };
    }
    return { success: true };
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string; storeId?: string; openedAt?: string; initialAmount?: number }) {
    if (!supabase) throw new Error('Supabase não configurado');

    let expectedCash = 0;
    if (params.openedAt) {
      const data = await this.getData({ storeId: params.storeId || '', openedAt: params.openedAt });
      const initVal = Number(params.initialAmount || 0);
      expectedCash = initVal + data.totals.cashSales + data.totals.cashMaintenance + data.totals.cashSuprimentos - data.totals.cashSangrias - data.totals.cashExpenses;
    } else {
      expectedCash = Number(params.finalValue || 0);
    }

    const difference = Number((params.finalValue - expectedCash).toFixed(2));

    const payload = {
      status: 'FECHADO',
      closed_at: new Date().toISOString(),
      final_cash_amount: Number(params.finalValue || 0),
      closing_balance: Number(params.finalValue || 0),
      reported_balance: Number(params.finalValue || 0),
      expected_cash_amount: expectedCash,
      difference: difference,
      operator: params.closedBy,
      notes: params.observations
    };

    const { error } = await supabase
      .from('cash_registers')
      .update(payload)
      .eq('id', params.id);

    if (error) {
      console.warn('[REGISTER CLOSE] Erro no update completo, tentando fallback 1:', error.message);
      const fallback1 = {
        status: 'FECHADO',
        closed_at: new Date().toISOString(),
        final_cash_amount: Number(params.finalValue || 0),
        operator: params.closedBy
      };
      const { error: err1 } = await supabase
        .from('cash_registers')
        .update(fallback1)
        .eq('id', params.id);

      if (err1) {
        console.warn('[REGISTER CLOSE] Fallback 1 falhou, tentando fallback 2:', err1.message);
        const fallback2 = {
          status: 'FECHADO',
          closed_at: new Date().toISOString()
        };
        const { error: err2 } = await supabase
          .from('cash_registers')
          .update(fallback2)
          .eq('id', params.id);

        if (err2) return { success: false, error: err2.message };
      }
    }

    // Registra sangria automática de fechamento no livro caixa
    try {
      await supabase.from('financial_transactions').insert([{
        id: crypto.randomUUID(),
        type: 'SAIDA_SANGRIA',
        amount: Number(params.finalValue || 0),
        payment_method: 'DINHEIRO',
        description: `Sangria de Fechamento de Caixa por ${params.closedBy}`,
        store_id: params.storeId || null,
        created_at: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('[CLOSE REGISTER] Erro ao gravar sangria no livro caixa:', e);
    }

    return { success: true };
  },

  async getData(params: { storeId: string; openedAt: string }) {
    if (!supabase) {
      return {
        totals: { sales: 0, cashSales: 0, cardSales: 0, pixSales: 0, cashMaintenance: 0, cashSuprimentos: 0, cashSangrias: 0, cashExpenses: 0, expenses: 0, discounts: 0, expectedCash: 0, cash: 0, card: 0, pix: 0 },
        topProducts: [],
        salesByEmployee: []
      };
    }
    
    try {
      // 1. Busca transações financeiras desde openedAt (Livro Caixa Unificado)
      let ftQuery = supabase
        .from('financial_transactions')
        .select('*');

      if (params.openedAt) {
        ftQuery = ftQuery.gte('created_at', params.openedAt);
      }

      if (params.storeId) {
        ftQuery = ftQuery.or(`store_id.eq.${params.storeId},store_id.is.null`);
      }

      const { data: finTrans } = await ftQuery;

      // 2. Busca vendas realizadas desde openedAt
      let salesQuery = supabase
        .from('sales')
        .select('*');

      if (params.openedAt) {
        salesQuery = salesQuery.gte('created_at', params.openedAt);
      }

      if (params.storeId) {
        salesQuery = salesQuery.or(`store_id.eq.${params.storeId},store_id.is.null`);
      }

      const { data: sales } = await salesQuery;

      // 3. Busca despesas adicionais
      let expQuery = supabase
        .from('expenses')
        .select('*');

      if (params.openedAt) {
        expQuery = expQuery.gte('created_at', params.openedAt);
      }

      if (params.storeId) {
        expQuery = expQuery.or(`store_id.eq.${params.storeId},store_id.is.null`);
      }

      const { data: expenses } = await expQuery;

      // 4. Mapeamento e Cálculos Financeiros
      const allTrans = finTrans || [];
      const allSales = (sales || []).filter(s => String(s.status).toUpperCase() !== 'CANCELADA');
      const allExpenses = expenses || [];

      // Vendas por método de pagamento
      let cashSales = allSales.filter(s => String(s.payment_method).toUpperCase() === 'DINHEIRO').reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      let cardSales = allSales.filter(s => ['CREDITO', 'DEBITO', 'CARTAO', 'CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(String(s.payment_method).toUpperCase())).reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      let pixSales = allSales.filter(s => String(s.payment_method).toUpperCase() === 'PIX').reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const totalSales = allSales.reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const totalDiscounts = allSales.reduce((acc, s) => acc + Number(s.discount || 0), 0);

      // Soma das Manutenções em DINHEIRO
      const cashMaintenance = allTrans
        .filter(t => (String(t.type).toUpperCase() === 'RECEITA_MANUTENCAO' || String(t.category).toUpperCase() === 'MANUTENÇÃO') && String(t.payment_method).toUpperCase() === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma dos SUPRIMENTOS em DINHEIRO
      const cashSuprimentos = allTrans
        .filter(t => (['ENTRADA_SUPRIMENTO', 'SUPRIMENTO'].includes(String(t.type).toUpperCase()) || String(t.category).toUpperCase() === 'SUPRIMENTO') && String(t.payment_method).toUpperCase() === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma das SANGRIAS em DINHEIRO
      const cashSangrias = allTrans
        .filter(t => (['SAIDA_SANGRIA', 'SANGRIA'].includes(String(t.type).toUpperCase()) || String(t.category).toUpperCase() === 'SANGRIA') && String(t.payment_method).toUpperCase() === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma de DESPESAS em DINHEIRO
      const cashExpensesFromTrans = allTrans
        .filter(t => (['DESPESA', 'OUTFLOW'].includes(String(t.type).toUpperCase())) && String(t.payment_method).toUpperCase() === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      
      const directExpenses = allExpenses.reduce((acc, e) => acc + Number(e.value || 0), 0);
      const cashExpenses = cashExpensesFromTrans + directExpenses;

      // Se cashSales for 0 mas houver RECEITA_VENDA em DINHEIRO em financial_transactions
      if (cashSales === 0) {
        cashSales = allTrans
          .filter(t => (['RECEITA_VENDA', 'INFLOW'].includes(String(t.type).toUpperCase()) || String(t.category).toUpperCase() === 'VENDA') && String(t.payment_method).toUpperCase() === 'DINHEIRO')
          .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      }

      const totals = {
        sales: totalSales,
        cashSales,
        cardSales,
        pixSales,
        cashMaintenance,
        cashSuprimentos,
        cashSangrias,
        cashExpenses,
        cash: cashSales, // alias
        card: cardSales, // alias
        pix: pixSales,   // alias
        expenses: cashExpenses + cashSangrias,
        discounts: totalDiscounts
      };

      // 5. Agrupa produtos vendidos
      const productsMap: Record<string, { nome: string, qtd: number }> = {};
      const employeesMap: Record<string, number> = {};

      allSales.forEach(s => {
        const vendedorName = s.seller_name || s.vendedor || 'Desconhecido';
        employeesMap[vendedorName] = (employeesMap[vendedorName] || 0) + Number(s.total_amount ?? s.total ?? 0);

        try {
          const items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const name = item.nome || item.name || 'Produto';
              const id = item.id || name;
              if (!productsMap[id]) {
                productsMap[id] = { nome: name, qtd: 0 };
              }
              productsMap[id].qtd += Number(item.qtd || item.quantity || 0);
            });
          }
        } catch (e) {
          console.error('[GETDATA] Erro parse items:', e);
        }
      });

      const topProducts = Object.values(productsMap)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

      const salesByEmployee = Object.entries(employeesMap).map(([name, total]) => ({ name, total }));

      return {
        totals,
        topProducts,
        salesByEmployee
      };
    } catch (err) {
      console.error('[GETDATA ERROR]', err);
      return {
        totals: { sales: 0, cashSales: 0, cardSales: 0, pixSales: 0, cashMaintenance: 0, cashSuprimentos: 0, cashSangrias: 0, cashExpenses: 0, expenses: 0, discounts: 0, expectedCash: 0, cash: 0, card: 0, pix: 0 },
        topProducts: [],
        salesByEmployee: []
      };
    }
  },

  async getHistory() {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .in('status', ['FECHADO', 'closed', 'fechado', 'CLOSED'])
        .order('closed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(d => {
        const init = Number(d.initial_amount ?? d.opening_balance ?? 0);
        const finalVal = Number(d.final_cash_amount ?? d.reported_balance ?? d.closing_balance ?? 0);
        return {
          id: d.id,
          store_id: d.store_id,
          operator: d.operator || d.user_name || d.opened_by,
          user_name: d.operator || d.user_name || d.opened_by,
          opened_by: d.operator || d.user_name || d.opened_by,
          initial_amount: init,
          opening_balance: init,
          initial_value: init,
          opened_at: d.opened_at,
          closed_by: d.closed_by || d.operator || d.user_name,
          final_cash_amount: finalVal,
          closing_balance: finalVal,
          reported_balance: finalVal,
          final_value: finalVal,
          expected_cash_amount: Number(d.expected_cash_amount ?? 0),
          difference: Number(d.difference ?? 0),
          total_sales: finalVal,
          observations: d.notes || d.observations || '',
          notes: d.notes || d.observations || '',
          closed_at: d.closed_at,
          status: d.status
        };
      });
    } catch (e) {
      return [];
    }
  },

  subscribeToChanges(callback: (payload: any) => void, storeId?: string) {
    if (!supabase) return () => {};

    const channelName = `realtime_cash_sync_${storeId || 'all'}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_registers' },
          (payload) => callback(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'financial_transactions' },
          (payload) => callback(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sales' },
          (payload) => callback(payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'maintenance_orders' },
          (payload) => callback(payload)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[REALTIME] Falha ao inscrever canal realtime:', e);
      return () => {};
    }
  }
};


