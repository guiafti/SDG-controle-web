import React, { useState, useEffect } from 'react';
import { systemService } from '../services/systemService';
import { taskService } from '../services/miscService';

interface DashboardProps {
  onNavigate?: (view: string) => void;
  onTaskClick?: (task: any) => void;
  userRole?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onTaskClick, userRole }) => {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, total: 0 });
  const [stats, setStats] = useState({ totalRevenue: 0, monthlyRevenue: 0, dailyRevenue: 0 });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedSection, setExpandedId] = useState<string | null>(null);

  // ... (birthdays and bills remains same)

  const fetchData = async () => {
    try {
      const [sStatus, dStats, lowStock, tData] = await Promise.all([
        systemService.getSyncStatus(),
        systemService.getDashboardStats(),
        systemService.getLowStockItems(),
        taskService.getAll()
      ]);
      setSyncStatus(sStatus || { pending: 0, total: 0 });
      setStats({ ...dStats, dailyRevenue: (dStats?.monthlyRevenue || 0) / 22 }); 
      setLowStockItems(lowStock || []);
      setTasks(tData || []);

      setAlerts([
        { id: 1, type: 'warranty', title: 'Retorno de Garantia', desc: 'iPhone 13 - Tela piscando', date: 'Hoje' },
      ]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <section id="view-dashboard" className="view-section active p-4 lg:p-8 max-w-7xl mx-auto w-full font-sans space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-8">
      
      {/* Central Command Header: Daily Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-slate-900 rounded-[2rem] shadow-xl p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-110 transition-transform">
            <i className="ph ph-currency-dollar text-8xl"></i>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-1">Vendas Hoje</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight font-mono">
              {stats.dailyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] uppercase">
              <i className="ph ph-trend-up"></i> 
              <span>+12% Estimado</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pendências Globais</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-800 tracking-tighter">{(syncStatus.pending || 0) + pendingTasks.length}</span>
            <span className="text-slate-400 font-bold text-xs uppercase">Ações</span>
          </div>
          <div className="mt-2 flex gap-2">
            <span className="px-2 py-1 bg-brand-50 text-brand-600 rounded-lg text-[8px] font-black uppercase">{pendingTasks.length} Missões</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 text-slate-50">
            <i className="ph ph-cloud-check text-7xl"></i>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status da Rede</p>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
              <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">Cloud Online</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Produtividade</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-800 tracking-tighter">92%</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full ml-3 overflow-hidden">
              <div className="h-full bg-brand-500 w-[92%]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna Esquerda: Missões e Aniversariantes */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 lg:p-8 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
                  <i className="ph ph-shield-check text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase italic">Missões Ativas</h3>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {pendingTasks.length === 0 ? (
                <div className="py-10 text-center opacity-30 italic text-[10px]">Nenhuma missão pendente.</div>
              ) : pendingTasks.map((t, i) => (
                <div 
                  key={i} 
                  onClick={() => onTaskClick ? onTaskClick(t) : onNavigate?.(userRole === 'admin' ? 'network' : 'processes')}
                  className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-500 transition-all cursor-pointer group"
                >
                  <div className="w-1 h-auto bg-brand-500 rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-700 font-bold uppercase truncate">{t.title}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase mt-1 italic">Prazo: {t.due_date || 'Imediato'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social: Aniversariantes */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 lg:p-8 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                  <i className="ph ph-cake text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase italic leading-none mb-1">Eventos</h3>
                </div>
              </div>
              <div className="space-y-2">
                {birthdays.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600 uppercase">
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-700 uppercase">{b.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">{b.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-brand-500">{b.date}</span>
                  </div>
                ))}
              </div>
          </div>
        </div>

        {/* Monitor de Operação Crítica */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-slate-50/80 p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                  <i className="ph ph-warning-octagon text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase italic">Operação Crítica</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Alertas em Tempo Real</p>
                </div>
              </div>
              <span className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase border border-red-100 w-fit">Monitoramento Ativo</span>
            </div>

            <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 flex-1">
              
              {/* Alertas Reposição */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <i className="ph ph-package text-brand-500"></i> Reposição
                </h4>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {lowStockItems.length === 0 ? (
                    <p className="text-[10px] text-slate-300 italic text-center py-10">Estoque regularizado.</p>
                  ) : lowStockItems.slice(0, 10).map((item, i) => (
                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:border-brand-200 transition-all group shadow-sm">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-700 uppercase truncate block leading-none group-hover:text-brand-600 transition-colors">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">CRÍTICO</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{item.quantity} un</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retornos e Contas */}
              <div className="space-y-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="ph ph-calendar-check text-emerald-500"></i> Contas da Semana
                    </h4>
                    <div className="space-y-2">
                        {bills.map((bill, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{bill.desc}</p>
                            <p className="text-[8px] text-slate-400 uppercase font-black">{bill.due}</p>
                            </div>
                            <span className={`text-xs font-mono font-black ${bill.status === 'urgent' ? 'text-red-500' : 'text-slate-600'}`}>
                            R$ {bill.value.toLocaleString()}
                            </span>
                        </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="ph ph-arrow-counter-clockwise text-orange-500"></i> Retornos
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {alerts.map(alert => (
                      <div key={alert.id} className="p-4 rounded-2xl border border-orange-100 bg-orange-50/20 flex flex-col gap-1 shadow-sm">
                        <div className="flex justify-between">
                          <p className="text-[10px] font-black text-slate-800 uppercase truncate">{alert.title}</p>
                          <span className="text-[8px] font-bold text-orange-500">{alert.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight italic">"{alert.desc}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Dashboard;