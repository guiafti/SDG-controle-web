import { supabase } from './api';

export const registerService = {
  async getCurrent(params: { storeId: string }) {
    if (!supabase) return null;
    try {
      let query = supabase
        .from('cash_registers')
        .select('*');
      
      if (params.storeId) {
        query = query.eq('store_id', params.storeId);
      }

      const { data, error } = await query
        .in('status', ['ABERTO', 'open'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const initialAmount = Number(data.initial_amount ?? data.opening_balance ?? 0);
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
        opened_at: data.opened_at,
        closed_by: data.operator || data.user_name,
        final_cash_amount: finalAmount,
        closing_balance: finalAmount,
        reported_balance: finalAmount,
        final_value: finalAmount,
        expected_cash_amount: Number(data.expected_cash_amount ?? 0),
        difference: Number(data.difference ?? 0),
        total_sales: Number(data.closing_balance || 0),
        observations: data.notes || data.observations,
        notes: data.notes || data.observations,
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
      operator: params.openedBy,
      user_name: params.openedBy,
      initial_amount: Number(params.initialValue || 0),
      opening_balance: Number(params.initialValue || 0),
      status: 'ABERTO',
      opened_at: new Date().toISOString()
    };

    const { error } = await supabase.from('cash_registers').insert([payload]);
    if (error) {
      // Tenta fallback com apenas colunas essenciais do contrato
      const fallbackPayload = {
        id: payload.id,
        initial_amount: payload.initial_amount,
        status: 'ABERTO',
        operator: payload.operator,
        opened_at: payload.opened_at
      };
      const { error: err2 } = await supabase.from('cash_registers').insert([fallbackPayload]);
      if (err2) return { success: false, error: err2.message };
    }
    return { success: true };
  },

  async close(params: { id: string; closedBy: string; finalValue: number; observations?: string; storeId?: string; openedAt?: string; initialAmount?: number }) {
    if (!supabase) throw new Error('Supabase não configurado');

    // 1. Calcula os dados do caixa para determinar o expected_cash_amount
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

    if (error) return { success: false, error: error.message };

    // Registra sangria automática de fechamento no livro caixa
    try {
      await supabase.from('financial_transactions').insert([{
        id: crypto.randomUUID(),
        type: 'SAIDA_SANGRIA',
        amount: Number(params.finalValue || 0),
        payment_method: 'DINHEIRO',
        description: `Sangria de Fechamento de Caixa por ${params.closedBy}`,
        store_id: params.storeId,
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
        .select('*')
        .gte('created_at', params.openedAt);

      if (params.storeId) {
        ftQuery = ftQuery.eq('store_id', params.storeId);
      }

      const { data: finTrans } = await ftQuery;

      // 2. Busca vendas realizadas desde openedAt
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .gte('created_at', params.openedAt);

      if (params.storeId) {
        salesQuery = salesQuery.eq('store_id', params.storeId);
      }

      const { data: sales } = await salesQuery;

      // 3. Busca despesas adicionais
      let expQuery = supabase
        .from('expenses')
        .select('*')
        .gte('created_at', params.openedAt);

      if (params.storeId) {
        expQuery = expQuery.eq('store_id', params.storeId);
      }

      const { data: expenses } = await expQuery;

      // 4. Mapeamento e Cálculos Financeiros
      const allTrans = finTrans || [];
      const allSales = (sales || []).filter(s => s.status !== 'CANCELADA');
      const allExpenses = expenses || [];

      // Vendas por método de pagamento (combinando vendas e transações financeiras)
      let cashSales = allSales.filter(s => s.payment_method === 'DINHEIRO').reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      let cardSales = allSales.filter(s => ['CREDITO', 'DEBITO', 'CARTAO', 'CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(s.payment_method)).reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      let pixSales = allSales.filter(s => s.payment_method === 'PIX').reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const totalSales = allSales.reduce((acc, s) => acc + Number(s.total_amount ?? s.total ?? 0), 0);
      const totalDiscounts = allSales.reduce((acc, s) => acc + Number(s.discount || 0), 0);

      // Soma das Manutenções em DINHEIRO
      const cashMaintenance = allTrans
        .filter(t => (t.type === 'RECEITA_MANUTENCAO' || t.category === 'MANUTENÇÃO') && t.payment_method === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma dos SUPRIMENTOS em DINHEIRO
      const cashSuprimentos = allTrans
        .filter(t => (t.type === 'ENTRADA_SUPRIMENTO' || t.type === 'SUPRIMENTO' || t.category === 'SUPRIMENTO') && t.payment_method === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma das SANGRIAS em DINHEIRO
      const cashSangrias = allTrans
        .filter(t => (t.type === 'SAIDA_SANGRIA' || t.type === 'SANGRIA' || t.category === 'SANGRIA') && t.payment_method === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);

      // Soma de DESPESAS em DINHEIRO
      const cashExpensesFromTrans = allTrans
        .filter(t => (t.type === 'DESPESA' || t.type === 'OUTFLOW') && t.payment_method === 'DINHEIRO')
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
      
      const directExpenses = allExpenses.reduce((acc, e) => acc + Number(e.value || 0), 0);
      const cashExpenses = cashExpensesFromTrans + directExpenses;

      // Se cashSales for 0 mas houver RECEITA_VENDA em DINHEIRO em financial_transactions
      if (cashSales === 0) {
        cashSales = allTrans
          .filter(t => (t.type === 'RECEITA_VENDA' || t.category === 'VENDA') && t.payment_method === 'DINHEIRO')
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
        .in('status', ['FECHADO', 'closed'])
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
          closed_by: d.operator || d.user_name,
          final_cash_amount: finalVal,
          closing_balance: finalVal,
          reported_balance: finalVal,
          final_value: finalVal,
          expected_cash_amount: Number(d.expected_cash_amount ?? 0),
          difference: Number(d.difference ?? 0),
          total_sales: finalVal,
          observations: d.notes || d.observations,
          notes: d.notes || d.observations,
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
  }
};

