import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { financialService } from '../services/financialService';
import { storeService } from '../services/storeService';
import { registerService } from '../services/registerService';
import { userService } from '../services/userService';
import { printerService } from '../services/printerService';

const FinancialControl: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalInflow: 0, totalOutflow: 0, netProfit: 0, estimatedCost: 0, trends: [] });
  const [budgets, setBudgets] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'registers' | 'reports' | 'planning'>('dashboard');
  
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
    }
    setLoading(false);
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const data = await financialService.getDetailedReports(reportFilters);
      setReportData(data);
    } catch (e) {
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleViewRegisterDetail = async (reg: any) => {
    const loadingId = toast.loading('Carregando detalhes do fechamento...');
    try {
        const data = await registerService.getData({ storeId: reg.store_id, openedAt: reg.opened_at });
        // Filtra os dados especificamente para o período desse caixa fechado
        setSelectedRegister({ ...reg, ...data });
        toast.dismiss(loadingId);
    } catch (e) {
        toast.error('Erro ao carregar detalhes');
        toast.dismiss(loadingId);
    }
  };

  const handleReprintRegister = async () => {
    if (!selectedRegister) return;
    const loadingId = toast.loading('Enviando para impressora...');
    try {
        let receipt = "=== REIMPRESSÃO DE FECHAMENTO ===\n\n";
        receipt += `Abertura: ${new Date(selectedRegister.opened_at).toLocaleString()}\n`;
        receipt += `Fechamento: ${new Date(selectedRegister.closed_at).toLocaleString()}\n`;
        receipt += `Operador: ${selectedRegister.user_name}\n`;
        receipt += `\n--- RESUMO FINANCEIRO ---\n`;
        receipt += `Fundo de Caixa: R$ ${selectedRegister.opening_balance.toFixed(2)}\n`;
        receipt += `Vendas Dinheiro: R$ ${selectedRegister.totals.cash.toFixed(2)}\n`;
        receipt += `Vendas Pix: R$ ${selectedRegister.totals.pix.toFixed(2)}\n`;
        receipt += `Vendas Cartao: R$ ${selectedRegister.totals.card.toFixed(2)}\n`;
        receipt += `Total de Vendas: R$ ${selectedRegister.totals.sales.toFixed(2)}\n`;
        receipt += `Saidas/Despesas: R$ ${selectedRegister.totals.expenses.toFixed(2)}\n`;
        receipt += `\nVALOR ESPERADO: R$ ${(selectedRegister.opening_balance + selectedRegister.totals.cash - selectedRegister.totals.expenses).toFixed(2)}\n`;
        receipt += `VALOR INFORMADO: R$ ${selectedRegister.reported_balance.toFixed(2)}\n`;
        
        receipt += `\n--- PERFORMANCE DA EQUIPE ---\n`;
        selectedRegister.salesByEmployee.forEach((emp: any) => {
          receipt += `${emp.name}: R$ ${emp.total.toFixed(2)}\n`;
        });

        receipt += `\n--- TOP 5 PRODUTOS ---\n`;
        selectedRegister.topProducts.forEach((prod: any) => {
          receipt += `${prod.qtd}x - ${prod.nome}\n`;
        });

        receipt += `\n---------------------------\n`;
        receipt += `Reimpresso em: ${new Date().toLocaleString()}\n`;
        receipt += `\n\n\n`;

        await printerService.printUSB(0x28E9, 0x0289, receipt);
        toast.success('Cupom enviado!', { id: loadingId });
    } catch (e) {
        toast.error('Erro ao imprimir', { id: loadingId });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingId = toast.loading('Registrando saída...');
    try {
      const result = await financialService.saveExpense({ description, value: Number(value), category_id: categoryId, date, payment_method: paymentMethod, store_id: storeId });
      if (result.success) {
        toast.success('Lançamento efetuado!', { id: loadingId });
        setIsModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (error) { toast.error('Erro no lançamento', { id: loadingId }); }
  };

  const resetForm = () => {
    setDescription('');
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const renderDashboard = () => {
    const grossMargin = (summary?.totalInflow || 0) > 0 ? (((summary?.totalInflow || 0) - (summary?.estimatedCost || 0)) / (summary?.totalInflow || 1) * 100).toFixed(1) : 0;
    const trends = summary?.trends || [];
    const maxTrend = trends.length > 0 ? Math.max(...trends.map((t: any) => t.inflow || 0), 1) : 1;

    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        {/* Compact Intelligence Cards */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500"><i className="ph ph-trend-up text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {(summary.totalInflow || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Receita Bruta</div>
            </div>
          </div>

          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500"><i className="ph ph-shopping-cart text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {(summary.estimatedCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Custo Mercadoria</div>
            </div>
          </div>

          <div className="flex-none bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500"><i className="ph ph-chart-line-up text-lg"></i></div>
            <div>
              <div className="text-sm font-bold text-slate-800 font-mono">{grossMargin}%</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Margem Média</div>
            </div>
          </div>

          <div className="flex-none bg-slate-900 px-5 py-3 rounded-xl shadow-md flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-brand-400"><i className="ph ph-lightning text-lg"></i></div>
            <div>
              <div className={`text-sm font-bold font-mono ${(summary.netProfit || 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                {(summary.netProfit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lucro Líquido</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Compact Trend Chart */}
            <div className="lg:col-span-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tendência de Faturamento</h3>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-bold uppercase">6 Meses</span>
                </div>
                
                <div className="h-40 flex items-end justify-between gap-2 px-2 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-1">
                        {[1,2,3].map(i => <div key={i} className="w-full h-px bg-slate-900"></div>)}
                    </div>
                    
                    {trends.map((t: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                <div 
                                    className="w-full max-w-[32px] bg-brand-500/80 rounded-t-md group-hover:bg-brand-500 transition-all"
                                    style={{ height: `${((t.inflow || 0) / maxTrend) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{(t.month || '').substring(0,3)}</span>
                        </div>
                    ))}
                    {trends.length === 0 && <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px]">Sem dados para o gráfico</div>}
                </div>
            </div>

            {/* Compact Top Expenses */}
            <div className="lg:col-span-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Maiores Gastos</h3>
                <div className="space-y-3 flex-1">
                    {categories.slice(0, 4).map(cat => {
                        const catTotal = expenses.filter(e => e.category_id === cat.id).reduce((sum, e) => sum + e.value, 0);
                        const perc = (summary?.totalOutflow || 0) > 0 ? (catTotal / (summary?.totalOutflow || 1) * 100).toFixed(0) : 0;

                        return (
                            <div key={cat.id} className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold uppercase">
                                    <span className="text-slate-500 truncate mr-2">{cat.name}</span>
                                    <span className="text-slate-800">R$ {catTotal.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 group-hover:bg-slate-900 transition-all duration-1000" style={{ width: `${perc}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxo Financeiro</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gestão de Saídas e Análise de Rentabilidade</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Painel</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Fluxo</button>
                <button onClick={() => setActiveTab('registers')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'registers' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Fechamentos</button>
                <button onClick={() => setActiveTab('reports')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'reports' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Relatórios</button>
                <button onClick={() => setActiveTab('planning')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'planning' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Metas</button>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all"
            >
                <i className="ph ph-plus-circle text-xl"></i> Nova Saída
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}

        {activeTab === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descrição / Operador</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo / Categoria</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pagamento</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(!summary?.ledger || summary.ledger.length === 0) ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase text-xs">Nenhum registro no fluxo de caixa</td></tr>
                            ) : summary.ledger.map((item: any) => {
                                const isEntry = item.trans_type === 'INFLOW';
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3.5 text-xs font-medium text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase">{item.description}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${isEntry ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {isEntry ? 'ENTRADA' : item.type || 'SAÍDA'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-[9px] font-bold text-slate-400 uppercase">{item.payment_method}</td>
                                        <td className={`px-6 py-3.5 text-right font-mono font-bold text-xs ${isEntry ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isEntry ? '+' : '-'}{item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'registers' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Fechamento</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operador</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendas Totais</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Retirada (Sangria)</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {registers.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase text-xs">Nenhum fechamento de caixa registrado</td></tr>
                            ) : registers.map((reg: any) => (
                                <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3.5 text-xs font-medium text-slate-500">{new Date(reg.closed_at).toLocaleString()}</td>
                                    <td className="px-6 py-3.5 text-xs font-bold text-slate-800 uppercase">{reg.user_name}</td>
                                    <td className="px-6 py-3.5 text-xs font-bold text-emerald-600 font-mono">R$ {reg.total_sales.toFixed(2)}</td>
                                    <td className="px-6 py-3.5 text-xs font-bold text-red-500 font-mono">R$ {reg.reported_balance.toFixed(2)}</td>
                                    <td className="px-6 py-3.5 text-right">
                                        <button 
                                            onClick={() => handleViewRegisterDetail(reg)}
                                            className="text-brand-600 hover:text-brand-700 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 ml-auto"
                                        >
                                            Ver Detalhes <i className="ph ph-caret-right"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'reports' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* Painel de Filtros */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i className="ph ph-funnel"></i> Filtros de Inteligência
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                            <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                            <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Loja</label>
                            <select value={reportFilters.storeId} onChange={e => setReportFilters({...reportFilters, storeId: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500">
                                <option value="all">TODAS AS LOJAS</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendedor</label>
                            <select value={reportFilters.seller} onChange={e => setReportFilters({...reportFilters, seller: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500">
                                <option value="all">TODOS OS VENDEDORES</option>
                                {sellers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-4 mt-2">
                            <button 
                                onClick={handleGenerateReport}
                                disabled={isGeneratingReport}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingReport ? (
                                    <> <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> PROCESSANDO... </>
                                ) : (
                                    <> <i className="ph ph-chart-bar text-lg"></i> GERAR RELATÓRIO DETALHADO </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resultados do Relatório */}
                {reportData && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-emerald-500 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-500/20">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Receita no Período</span>
                                <div className="text-2xl font-black mt-1 italic">R$ {reportData.summary.totalInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-red-500 p-6 rounded-[2rem] text-white shadow-xl shadow-red-500/20">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Despesas no Período</span>
                                <div className="text-2xl font-black mt-1 italic">R$ {reportData.summary.totalOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 border-2 border-brand-500/30">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 text-brand-400">Resultado Líquido</span>
                                <div className={`text-2xl font-black mt-1 italic ${reportData.summary.netProfit >= 0 ? 'text-white' : 'text-red-300'}`}>
                                    R$ {reportData.summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Listagem de Vendas ({reportData.sales.length})</h3>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={async () => {
                                            const loadingId = toast.loading('Gerando Planilha...');
                                            const res = await financialService.exportToExcel({
                                                summary: reportData.summary,
                                                sales: reportData.sales
                                            });
                                            if (res.success) toast.success('PLANILHA SALVA COM SUCESSO!', { id: loadingId });
                                            else toast.error('FALHA AO GERAR PLANILHA', { id: loadingId });
                                        }}
                                        className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:underline"
                                    >
                                        <i className="ph ph-file-xls text-lg"></i> Gerar Excel (.CSV)
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            const loadingId = toast.loading('Gerando PDF...');
                                            const res = await financialService.exportToPDF({
                                                filters: reportFilters,
                                                summary: reportData.summary,
                                                sales: reportData.sales
                                            });
                                            if (res.success) toast.success('PDF SALVO COM SUCESSO!', { id: loadingId });
                                            else toast.error('FALHA AO GERAR PDF', { id: loadingId });
                                        }}
                                        className="text-[9px] font-black text-brand-600 uppercase flex items-center gap-1 hover:underline"
                                    >
                                        <i className="ph ph-file-pdf text-lg"></i> Gerar PDF Completo
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase">Data</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase">Vendedor</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase">Forma</th>
                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {reportData.sales.map((s: any) => (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3 text-xs font-medium text-slate-500">{new Date(s.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-3 text-xs font-black text-slate-800 uppercase italic">{s.vendedor}</td>
                                                <td className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase">{s.payment_method}</td>
                                                <td className="px-6 py-3 text-right font-mono font-bold text-xs text-emerald-600">R$ {s.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'planning' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-300">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                            <i className="ph ph-target text-xl"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase">Orçamentos por Categoria</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                        {categories.slice(0, 4).map(cat => (
                            <div key={cat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-brand-200 transition-all cursor-pointer">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">{cat.name}</span>
                                    <span className="text-xs font-bold text-slate-800 font-mono">R$ 0,00</span>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-brand-500 transition-all">
                                    <i className="ph ph-plus-bold text-xs"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <i className="ph ph-trend-up absolute -right-4 -bottom-4 text-[120px] text-white/5 rotate-12"></i>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">Meta de Lucratividade</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">Sua margem atual é de <span className="text-brand-400 font-bold">24%</span>. O sistema sugere um ajuste estratégico para atingir a meta de <span className="text-emerald-400 font-bold">30%</span>.</p>
                    <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all">Analisar Estratégia</button>
                </div>
            </div>
        )}
      </main>

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <i className="ph ph-bank text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">Novo Lançamento</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão Financeira</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição do Gasto</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Internet, Aluguel, Peças..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)} placeholder="0.00" className="w-full p-2.5 bg-brand-50 border border-brand-100 rounded-xl text-red-500 font-mono font-bold text-base outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition-all appearance-none">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition-all uppercase text-[10px] tracking-widest">Confirmar Lançamento</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Detail Modal */}
      {selectedRegister && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-brand-600 p-8 text-white relative">
                    <button onClick={() => setSelectedRegister(null)} className="absolute top-6 right-6 text-white/50 hover:text-white"><i className="ph ph-x text-2xl"></i></button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                            <i className="ph ph-receipt"></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Resumo do Fechamento</h3>
                            <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Operador: {selectedRegister.user_name} • {new Date(selectedRegister.closed_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Duração do Turno</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Início (Abertura)</span>
                                    <span className="text-xs font-black text-slate-700">{new Date(selectedRegister.opened_at).toLocaleString()}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fim (Fechamento)</span>
                                    <span className="text-xs font-black text-slate-700">{new Date(selectedRegister.closed_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumo Financeiro</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Fundo Inicial</span>
                                    <span className="text-xs font-black text-slate-800">R$ {selectedRegister.opening_balance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-emerald-50 rounded-xl">
                                    <span className="text-xs font-bold text-emerald-600 uppercase">Vendas Totais</span>
                                    <span className="text-xs font-black text-emerald-700">R$ {selectedRegister.totals.sales.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-red-50 rounded-xl">
                                    <span className="text-xs font-bold text-red-500 uppercase">Saídas/Despesas</span>
                                    <span className="text-xs font-black text-red-700">- R$ {selectedRegister.totals.expenses.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between p-3 bg-brand-50 rounded-xl border border-brand-100">
                                    <span className="text-xs font-bold text-brand-600 uppercase">Retirada (Sangria)</span>
                                    <span className="text-xs font-black text-brand-700">R$ {selectedRegister.reported_balance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Meios de Pagamento</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 border border-slate-100 rounded-xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Dinheiro</span>
                                    <span className="text-xs font-black text-slate-800">R$ {selectedRegister.totals.cash.toFixed(2)}</span>
                                </div>
                                <div className="p-3 border border-slate-100 rounded-xl">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Pix</span>
                                    <span className="text-xs font-black text-slate-800">R$ {selectedRegister.totals.pix.toFixed(2)}</span>
                                </div>
                                <div className="p-3 border border-slate-100 rounded-xl col-span-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Cartões</span>
                                    <span className="text-xs font-black text-slate-800">R$ {selectedRegister.totals.card.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top 5 Produtos</h4>
                            <div className="space-y-2">
                                {(selectedRegister.topProducts || []).map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase truncate pr-4">{p.nome}</span>
                                        <span className="text-[10px] font-black text-brand-600 bg-white px-2 py-0.5 rounded shadow-sm">{p.qtd}x</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vendas por Funcionário</h4>
                            <div className="space-y-2">
                                {(selectedRegister.salesByEmployee || []).map((e: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{e.name}</span>
                                        <span className="text-[10px] font-black text-emerald-600">R$ {e.total.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedRegister.notes && (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <span className="text-[9px] font-black text-amber-600 uppercase block mb-1">Observações:</span>
                                <p className="text-[10px] font-medium text-amber-900 italic leading-tight">{selectedRegister.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={handleReprintRegister}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <i className="ph ph-printer text-base"></i>
                        Reimprimir Cupom
                    </button>
                    <button 
                        onClick={() => setSelectedRegister(null)}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default FinancialControl;