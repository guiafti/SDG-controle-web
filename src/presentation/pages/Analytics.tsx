import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Usando os dados existentes para gerar perspectivas
      const data = await window.api.getFinancialSummary();
      setSummary(data);
    } catch (e) {
      toast.error('Erro ao processar inteligência preditiva');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getProjectionData = () => {
    const baseValue = summary?.totalInflow || 0;
    if (period === 'yearly') return { label: 'Projeção Próximo Ano', value: baseValue * 1.45, percent: '+45.0% Estimado' };
    if (period === 'quarterly') return { label: 'Projeção Próximo Trimestre', value: baseValue * 1.25, percent: '+25.0% Estimado' };
    return { label: 'Projeção Próximo Mês', value: baseValue * 1.15, percent: '+15.4% Estimado' };
  };

  const projection = getProjectionData();

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse uppercase text-xs">Processando Modelos de Inteligência...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-700">
      <main className="p-4 md:p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Header Estratégico */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <i className="ph ph-strategy text-brand-600"></i>
                Inteligência Preditiva
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5 uppercase tracking-widest">Análise de Tendências e Perspectivas de Crescimento</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setPeriod('monthly')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${period === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Mensal</button>
            <button onClick={() => setPeriod('quarterly')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${period === 'quarterly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Trimestral</button>
            <button onClick={() => setPeriod('yearly')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${period === 'yearly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Anual</button>
          </div>
        </div>

        {/* Predictive Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projeção de Faturamento */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-emerald-50 opacity-10 group-hover:scale-110 transition-transform">
                    <i className="ph ph-chart-line-up text-[120px]"></i>
                </div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{projection.label}</span>
                    <div className="text-2xl font-bold text-slate-800 font-mono">
                        R$ {projection.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-emerald-500 font-bold text-[10px]">
                        <i className="ph ph-trend-up"></i>
                        <span>{projection.percent}</span>
                    </div>
                </div>
            </div>

            {/* Alerta de Giro de Estoque */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-orange-50 opacity-10 group-hover:scale-110 transition-transform">
                    <i className="ph ph-package text-[120px]"></i>
                </div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Risco de Ruptura</span>
                    <div className="text-2xl font-bold text-slate-800">
                        12 Itens Críticos
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-orange-500 font-bold text-[10px]">
                        <i className="ph ph-warning-circle"></i>
                        <span>Reposição sugerida em 5 dias</span>
                    </div>
                </div>
            </div>

            {/* Retenção de Clientes (CRM) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-blue-50 opacity-10 group-hover:scale-110 transition-transform">
                    <i className="ph ph-users-four text-[120px]"></i>
                </div>
                <div className="relative z-10">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Saúde do CRM</span>
                    <div className="text-2xl font-bold text-slate-800">
                        84% Fidelidade
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-blue-500 font-bold text-[10px]">
                        <i className="ph ph-seal-check"></i>
                        <span>Ticket médio em ascensão</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Perspective Chart (Simulated Trends) */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-500/10 to-transparent pointer-events-none"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight italic">Perspectiva de Crescimento</h3>
                    <p className="text-slate-400 text-xs font-medium mt-1">Análise histórica vs. Tendência baseada em comportamento de compra</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Realizado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-500"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Preditivo</span>
                    </div>
                </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-3 px-4 relative">
                {/* Linhas de Grade */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 py-2">
                    {[1,2,3,4].map(i => <div key={i} className="w-full h-px bg-white"></div>)}
                </div>
                
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'].map((month, i) => {
                    const isFuture = i > 4;
                    const height = isFuture ? (60 + (i * 5)) : (40 + (i * 8));
                    return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-4 group">
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                <div 
                                    className={`w-full max-w-[40px] rounded-t-xl transition-all duration-1000 ${isFuture ? 'bg-brand-500/40 border-2 border-dashed border-brand-500/60' : 'bg-brand-500'}`}
                                    style={{ height: `${height}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                                        R$ {(10000 + (height * 200)).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isFuture ? 'text-brand-400' : 'text-slate-500'}`}>{month}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Bottom Strategic Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                        <i className="ph ph-shopping-bag text-2xl"></i>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Top Produtos - Tendência</h3>
                </div>
                <div className="space-y-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:bg-white hover:border-brand-200 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="text-xs font-black text-slate-300">#0{i}</div>
                                <div className="text-xs font-bold text-slate-700 uppercase truncate">Capa Premium iPhone 15</div>
                            </div>
                            <div className="text-[10px] font-bold text-emerald-500">+{(15-i*2)}% Procura</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i className="ph ph-lightning text-2xl"></i>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase">Sugestão Estratégica</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                        Baseado no fluxo das 5 lojas, sugerimos aumentar o estoque de **acessórios de proteção** na Loja Shopping para o próximo final de semana.
                    </p>
                    <button className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Ver Plano Detalhado
                    </button>
                </div>
            </div>
        </div>

        {/* Explicação da Inteligência Preditiva (Teste de Atualização) */}
        <div className="bg-brand-50/50 p-6 rounded-3xl border border-brand-100 mb-10">
            <h3 className="text-brand-800 font-bold text-sm uppercase mb-2">O que é a Análise Preditiva?</h3>
            <p className="text-brand-700 text-[11px] leading-relaxed">
                A análise preditiva utiliza dados históricos de vendas, comportamento do consumidor e tendências de mercado para prever resultados futuros. 
                Através de modelos estatísticos, o sistema ajuda você a antecipar a demanda, evitar a falta de produtos no estoque e identificar as 
                melhores oportunidades de venda antes mesmo delas acontecerem. Esta atualização confirma que o sistema de deploy automático está 
                funcionando perfeitamente.
            </p>
        </div>

      </main>
    </div>
  );
};

export default Analytics;