import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { taskService } from '../services/miscService';

interface ProcessesProps {
  currentUser?: { id: string, name: string, role: string };
  currentStoreId?: string;
}

const Processes: React.FC<ProcessesProps> = ({ currentUser, currentStoreId }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<any>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getAll();
      setTasks(data || []);
    } catch (e) {
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const handleConfirmCompletion = async (data: { photo?: string, justification?: string }) => {
    if (!selectedTaskForCompletion) return;
    
    const loadingId = toast.loading('Registrando conclusão...');
    try {
      const res = await taskService.complete(selectedTaskForCompletion.id, data.photo, data.justification);
      if (res.success) {
        toast.success('PROCESSO CONCLUÍDO!', { id: loadingId });
        setSelectedTaskForCompletion(null);
        fetchTasks();
      }
    } catch (e) { toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId }); }
  };

  // Filtro Inteligente: O funcionário só vê o que é DELE ou da LOJA dele
  const myTasks = tasks.filter(t => {
    if (t.status !== 'pending') return false;
    
    // Se for admin, vê tudo para fiscalizar
    if (currentUser?.role === 'admin') return true;

    // Se for para todos (global)
    if (t.assignee_id === 'all') return true;

    const isStoreTask = t.assignee_type === 'store' && t.assignee_id === currentStoreId;
    const isMyTask = t.assignee_type === 'user' && (
      t.assignee_id === currentUser?.id || 
      t.assignee_id === currentUser?.name
    );
    
    return isStoreTask || isMyTask;
  });

  const completedToday = tasks.filter(t => t.status === 'completed');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      <main className="p-4 md:p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar pb-20">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <i className="ph ph-shield-check text-brand-600"></i>
              Gestão de Processos
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5 uppercase tracking-widest">Checklist de Rotina e Demandas Gerenciais</p>
          </div>
          
          <div className="flex gap-3">
             <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase">Pendentes</span>
                <span className="text-lg font-bold text-brand-600 leading-none">{myTasks.length}</span>
             </div>
          </div>
        </div>

        {/* Lista de Missões Ativas */}
        <section className="space-y-3">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Missões e Comandos Ativos</h3>
           
           {loading && tasks.length === 0 ? (
             <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs animate-pulse tracking-widest">Sincronizando com a Gestão...</div>
           ) : myTasks.length === 0 ? (
             <div className="py-32 text-center bg-white rounded-[2rem] border border-slate-100 shadow-inner flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                   <i className="ph ph-check-circle text-4xl"></i>
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Parabéns! Você não tem tarefas pendentes.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-3">
               {myTasks.map(t => (
                 <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-500 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                       <div className="w-12 h-12 bg-slate-900 text-brand-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition-transform">
                          <i className="ph ph-lightning"></i>
                       </div>
                       <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-sm font-black text-slate-800 uppercase truncate">{t.title}</h4>
                            {t.is_routine === 1 && <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-black rounded-md uppercase">Rotina Diária</span>}
                            {t.proof_required === 1 && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded-md uppercase">Exige Foto</span>}
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                                <i className="ph ph-clock"></i>
                                <span>PRAZO: {t.due_date || 'IMEDIATO'}</span>
                             </div>
                             {t.due_date && t.due_date < new Date().toLocaleTimeString('pt-BR') && (
                               <span className="text-[9px] font-black text-red-500 animate-pulse uppercase tracking-tighter">Tarefa em Atraso</span>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => setSelectedTaskForCompletion(t)}
                      className="ml-6 px-8 py-3 bg-brand-500 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-brand-600 shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
                    >
                      DAR OK
                    </button>
                 </div>
               ))}
             </div>
           )}
        </section>

        {/* Histórico de Conclusão do Dia */}
        {completedToday.length > 0 && (
          <section className="mt-10 opacity-60">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-3">Concluído Hoje</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedToday.map(t => (
                  <div key={t.id} className="bg-slate-100/50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                     <i className="ph ph-check-circle text-emerald-500 text-xl"></i>
                     <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{t.title}</span>
                  </div>
                ))}
             </div>
          </section>
        )}

      </main>

      <TaskCompletionModal 
        isOpen={!!selectedTaskForCompletion} 
        onClose={() => setSelectedTaskForCompletion(null)} 
        onConfirm={handleConfirmCompletion} 
        task={selectedTaskForCompletion} 
      />
    </div>
  );
};

export default Processes;