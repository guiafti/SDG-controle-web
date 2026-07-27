import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { financialService } from '../services/financialService';
import { storeService } from '../services/storeService';
import { registerService } from '../services/registerService';
import { userService } from '../services/userService';
import { printerService } from '../services/printerService';
import { supabase } from '../services/api';

interface FinancialControlProps {
  role?: string;
  vendedor?: string;
}

const FinancialControl: React.FC<FinancialControlProps> = ({ role, vendedor }) => {
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [] });
  const [budgets, setBudgets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'registers' | 'reports' | 'planning' | 'data'>('dashboard');
  
  // States for Reports
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    storeId: 'all',
    seller: 'all'
  });
  const [reportData, setReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);

  // Form states
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO');
  const [storeId, setStoreId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);

  // Modal de Limpeza Seletiva de Dados
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [cleanOptions, setCleanOptions] = useState({
    sales: true,
    repairs: true,
    products: false,
    customers: false,
    tasks: false,
    stores: false,
    users: false
  });
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    fetchData();

    const unsubscribe = registerService.subscribeToChanges(() => {
      registerService.getHistory().then(regs => {
        setRegisters(regs || []);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exps, cats, summ, strs, buds, regs, users] = await Promise.all([
        financialService.getExpenses(),
        financialService.getCategories(),
        financialService.getSummary(),
        storeService.getAll(),
        financialService.getBudgets(),
        registerService.getHistory(),
        userService.getAll()
      ]);
      setExpenses(exps || []);
      setCategories(cats || []);
      setSummary(summ || { totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [] });
      setStores(strs || []);
      setBudgets(buds || []);
      setRegisters(regs || []);
      setSellers(users || []);
      if (strs && strs.length > 0 && !storeId) setStoreId(strs[0].id);
      if (cats && cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar inteligência financeira');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const expenseData = {
        id: editingTransaction ? editingTransaction.id : undefined,
        description,
        value: Number(value),
        category_id: categoryId,
        date,
        payment_method: paymentMethod,
        store_id: storeId
      };

      const result = await financialService.saveExpense(expenseData);
      if (result.success) {
        toast.success(editingTransaction ? 'Lançamento atualizado!' : 'Despesa registrada com sucesso!');
        setIsModalOpen(false);
        setEditingTransaction(null);
        setDescription('');
        setValue('');
        fetchData();
      } else {
        toast.error('Erro ao salvar despesa: ' + result.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar despesa');
    }
  };

  const handleOpenEditModal = (expense: any) => {
    setEditingTransaction(expense);
    setDescription(expense.description);
    setValue(String(expense.value || expense.amount || 0));
    setCategoryId(expense.category_id);
    setDate(expense.date || (expense.created_at ? expense.created_at.split('T')[0] : new Date().toISOString().split('T')[0]));
    setPaymentMethod(expense.payment_method || 'DINHEIRO');
    setStoreId(expense.store_id || (stores[0]?.id || ''));
    setIsModalOpen(true);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const data = await financialService.getDetailedReports(reportFilters);
      setReportData(data);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReprintRegister = async () => {
    if (!selectedRegister) return;
    try {
      await printerService.printText(
        `=== RESUMO DE FECHAMENTO DE CAIXA ===\n` +
        `Operador: ${selectedRegister.user_name || selectedRegister.operator || 'N/A'}\n` +
        `Loja: ${selectedRegister.store_id}\n` +
        `Abertura: ${selectedRegister.opened_at ? new Date(selectedRegister.opened_at).toLocaleString() : 'N/A'}\n` +
        `Fechamento: ${selectedRegister.closed_at ? new Date(selectedRegister.closed_at).toLocaleString() : 'Em Aberto'}\n` +
        `Fundo Inicial: R$ ${Number(selectedRegister.opening_balance || 0).toFixed(2)}\n` +
        `Vendas Totais: R$ ${Number(selectedRegister.totals?.sales || selectedRegister.total_sales || 0).toFixed(2)}\n` +
        `Dinheiro Reportado: R$ ${Number(selectedRegister.reported_balance || 0).toFixed(2)}\n` +
        `===================================\n`
      );
      toast.success('Comprovante impresso com sucesso!');
    } catch (e) {
      toast.error('Erro ao imprimir comprovante');
    }
  };

  const handleExecuteClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.error('Digite a senha de administrador');
      return;
    }
    
    // Validação de senha simples ou via Supabase
    if (adminPassword !== '123456' && adminPassword !== 'admin' && adminPassword !== '1234') {
      toast.error('Senha de administrador incorreta!');
      return;
    }

    const loadingId = toast.loading('Executando limpeza seletiva de dados...');
    try {
      if (cleanOptions.sales && supabase) {
        await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('financial_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('cash_registers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('seller_commissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (cleanOptions.repairs && supabase) {
        await supabase.from('maintenance_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('maintenance_photos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (cleanOptions.products && supabase) {
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (cleanOptions.customers && supabase) {
        await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      if (cleanOptions.tasks && supabase) {
        await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      toast.success('Limpeza de dados concluída com sucesso!', { id: loadingId });
      setIsCleanModalOpen(false);
      setAdminPassword('');
      fetchData();
    } catch (e: any) {
      toast.error('Erro durante a limpeza: ' + (e.message || e), { id: loadingId });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Header com Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Controle Financeiro</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestão de DRE, Despesas, Relatórios e Caixas</p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Lançamentos & Livro Caixa
            </button>
            <button
              onClick={() => setActiveTab('registers')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'registers' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Fechamentos de Caixa
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'reports' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Relatórios
            </button>
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Planejamento Metas
            </button>
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('data')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'data' ? 'bg-red-500 text-white shadow-md' : 'text-red-500 hover:bg-red-50'}`}
              >
                Manutenção de Dados
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Dashboard / Visão Geral */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <i className="ph ph-arrow-up-right text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {summary.totalInflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entradas Totais</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                  <i className="ph ph-arrow-down-left text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {summary.totalOutflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saídas & Despesas</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <i className="ph ph-trend-up text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {summary.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <i className="ph ph-cube text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {summary.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo de Mercadoria</div>
                </div>
              </div>
            </div>

            {/* Tabela do Livro Caixa Recente */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Últimas Movimentações Financeiras</h3>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <i className="ph ph-plus-circle text-base"></i> Nova Despesa
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Data</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Forma Pgto</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summary.ledger || []).slice(0, 10).map((t: any) => {
                      const isExpense = ['SAIDA_SANGRIA', 'DESPESA', 'OUTFLOW', 'SAIDA'].includes(String(t.type || t.trans_type).toUpperCase());
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-slate-500">
                            {t.date ? new Date(t.date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-800 uppercase">
                            {t.description}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isExpense ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {t.type || t.trans_type || 'MOVIMENTAÇÃO'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">
                            {t.payment_method || 'DINHEIRO'}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold text-xs ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isExpense ? '-' : '+'} R$ {Number(t.value || t.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Livro Caixa Completo / Despesas */}
        {activeTab === 'history' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase">Gerenciamento de Despesas Registradas</h3>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center gap-2"
              >
                <i className="ph ph-plus text-base"></i> Adicionar Lançamento
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Data</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Forma Pgto</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Valor</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {e.date || (e.created_at ? new Date(e.created_at).toLocaleDateString() : '-')}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase">
                        {e.description}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                        {e.expense_categories?.name || 'Sem Categoria'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                        {e.payment_method || 'DINHEIRO'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-xs text-rose-600">
                        R$ {Number(e.value || e.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(e)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                        >
                          <i className="ph ph-pencil text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Fechamentos de Caixa */}
        {activeTab === 'registers' && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase">Histórico de Fechamentos de Turno de Caixa</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Abertura</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Fechamento</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Operador</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Fundo Inicial</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Saldo Reportado</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registers.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {r.opened_at ? new Date(r.opened_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {r.closed_at ? new Date(r.closed_at).toLocaleString() : 'Em aberto'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase">
                        {r.user_name || r.operator || 'Operador'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">
                        R$ {Number(r.opening_balance || r.initial_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-600">
                        R$ {Number(r.reported_balance || r.final_cash_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedRegister(r)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                        >
                          Ver Resumo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Manutenção de Dados (Aba Dados) */}
        {activeTab === 'data' && role === 'admin' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 uppercase">Manutenção de Banco de Dados e Limpeza</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ferramentas avançadas para gerenciamento de dados de teste, estorno massivo e manutenção preventiva.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center">
                  <i className="ph ph-trash text-xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-900 uppercase">Limpeza Seletiva de Dados</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Apague registros de teste (Vendas, OS, Estoque) com proteção de senha master.
                  </p>
                </div>
                <button
                  onClick={() => setIsCleanModalOpen(true)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md uppercase tracking-wider"
                >
                  Abrir Painel de Limpeza
                </button>
              </div>

              <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                  <i className="ph ph-cloud-arrow-down text-xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase">Sincronização em Nuvem</h4>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Recarregue tabelas do Supabase e sincronize dados em tempo real.
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md uppercase tracking-wider"
                >
                  Forçar Sincronização
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Adicionar/Editar Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase">{editingTransaction ? 'Editar Lançamento' : 'Nova Despesa / Lançamento'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingTransaction(null); }} className="text-slate-400 hover:text-white">
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  type="text" required value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel da loja, Luz, Internet"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input
                    type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                  <select
                    value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Forma Pgto</label>
                  <select
                    value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                  >
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="PIX">PIX</option>
                    <option value="CREDITO">CARTÃO DE CRÉDITO</option>
                    <option value="DEBITO">CARTÃO DE DÉBITO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                  <input
                    type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all uppercase tracking-wider"
              >
                {editingTransaction ? 'Salvar Alterações' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Limpeza Seletiva de Dados */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleExecuteClean} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Limpeza Seletiva de Dados</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Escolha o que deseja excluir (Nuvem e Local)</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsCleanModalOpen(false); setAdminPassword(''); }}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 text-xs font-medium space-y-1">
                <p className="font-bold uppercase tracking-wider flex items-center gap-1.5"><i className="ph ph-warning-octagon text-base"></i> Cuidado: Esta ação é irreversível!</p>
                <p>Todos os registros marcados serão apagados permanentemente das tabelas do banco de dados.</p>
              </div>

              <div className="space-y-3.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dados para exclusão</h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={cleanOptions.sales}
                      onChange={e => setCleanOptions({ ...cleanOptions, sales: e.target.checked })}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase block">Vendas, Comissões e Caixas</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mt-0.5">Apaga vendas, comissões, turnos de caixa e movimentações de venda.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={cleanOptions.repairs}
                      onChange={e => setCleanOptions({ ...cleanOptions, repairs: e.target.checked })}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase block">Ordens de Serviço</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mt-0.5">Apaga atendimentos, orçamentos, fotos de reparos e histórico de OS.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={cleanOptions.products}
                      onChange={e => setCleanOptions({ ...cleanOptions, products: e.target.checked })}
                      className="w-4.5 h-4.5 rounded border-slate-300 text-red-500 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase block">Produtos e Estoque</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block mt-0.5">Apaga produtos cadastrados e estoques.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-6">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Senha do Administrador</label>
                <input
                  type="password"
                  placeholder="Digite sua senha de administrador..."
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsCleanModalOpen(false); setAdminPassword(''); }}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-red-500 hover:bg-red-650 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-500/15"
              >
                Confirmar Exclusão
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;