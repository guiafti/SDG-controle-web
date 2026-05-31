import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { storeService } from '../services/storeService';
import { userService } from '../services/userService';
import { taskService } from '../services/miscService';

interface NetworkManagementProps {
  currentUser?: { id: string, name: string, role: string };
  currentStoreId?: string;
}

const NetworkManagement: React.FC<NetworkManagementProps> = ({ currentUser, currentStoreId }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'missions' | 'stores' | 'users'>('missions');

  // Modals
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<any>(null);

  // Edit States
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('vendedor');
  const [userPhoto, setUserPhoto] = useState('');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssigneeType, setTaskAssigneeType] = useState<'store' | 'user'>('store');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskIsRoutine, setTaskIsRoutine] = useState(false);
  const [taskProofRequired, setTaskProofRequired] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        storeService.getAll(true),
        userService.getAll(),
        taskService.getAll()
      ]);
      setStores(s || []);
      setUsers(u || []);
      setTasks(t || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssigneeId) return toast.error('PREENCHA TODOS OS CAMPOS');
    const loadingId = toast.loading('Salvando missão...');
    try {
      const res = await taskService.save({ 
        id: editingTask?.id,
        title: taskTitle.toUpperCase(), 
        assignee_type: taskAssigneeType, 
        assignee_id: taskAssigneeId, 
        due_date: taskDueDate, 
        is_routine: taskIsRoutine ? 1 : 0, 
        proof_required: taskProofRequired ? 1 : 0 
      });
      if (res.success) {
        toast.success('COMANDO ENVIADO COM SUCESSO!', { id: loadingId });
        setIsTaskModalOpen(false);
        fetchData();
      }
    } catch (e) { toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId }); }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return toast.error('NOME OBRIGATÓRIO');
    const res = await storeService.save({ id: editingStore?.id, name: storeName });
    if (res.success) { toast.success('UNIDADE ATUALIZADA!'); setIsStoreModalOpen(false); fetchData(); }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPassword) return toast.error('PREENCHA TUDO');
    
    let finalPhoto = userPhoto;
    if (userPhoto.startsWith('data:image')) {
        const res = await userService.uploadPhoto({ userId: editingUser?.id || 'new', base64Data: userPhoto });
        if (res.success) finalPhoto = res.fileName;
    }

    const res = await userService.save({ id: editingUser?.id, name: userName, password: userPassword, role: userRole, photo_url: finalPhoto });
    if (res.success) { toast.success('ACESSO ATUALIZADO!'); setIsUserModalOpen(false); fetchData(); }
  };

  const handleUserPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => setUserPhoto(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleArchiveStore = async (store: any) => {
     const res = await storeService.archive(store.id, !store.archived);
     if (res.success) {
        toast.success(store.archived ? 'LOJA REATIVADA!' : 'LOJA ARQUIVADA!');
        fetchData();
     }
  };

  const openTaskModal = (t: any = null) => {
    setEditingTask(t);
    setTaskTitle(t?.title || '');
    setTaskAssigneeType(t?.assignee_type || 'store');
    setTaskAssigneeId(t?.assignee_id || '');
    setTaskDueDate(t?.due_date || '');
    setTaskIsRoutine(t?.is_routine === 1);
    setTaskProofRequired(t?.proof_required === 1);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex-1 flex h-full bg-slate-50 overflow-hidden">
      
      {/* Sidebar de Navegação do Hub */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100 bg-slate-900 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-brand-500/20 transition-all"></div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter relative z-10 leading-none mb-1">Hub de Rede</h1>
            <p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest relative z-10">Controle Profissional</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('missions')}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'missions' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
                <i className={`ph ph-lightning-fill text-xl ${activeTab === 'missions' ? 'text-brand-400' : 'text-slate-300'}`}></i>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase leading-none">Processos</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">Missões e Comandos</p>
                </div>
            </button>

            <button 
                onClick={() => setActiveTab('stores')}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'stores' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
                <i className={`ph ph-buildings-fill text-xl ${activeTab === 'stores' ? 'text-brand-400' : 'text-slate-300'}`}></i>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase leading-none">Unidades</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">Lojas da Rede</p>
                </div>
            </button>

            <button 
                onClick={() => setActiveTab('users')}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
                <i className={`ph ph-users-four-fill text-xl ${activeTab === 'users' ? 'text-brand-400' : 'text-slate-300'}`}></i>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase leading-none">Equipe</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase mt-0.5">Acessos e Vendedores</p>
                </div>
            </button>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status da Rede</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-slate-700 uppercase">{stores.length} Unidades Ativas</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Conteúdo Principal Dinâmico */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        
        {/* Header Superior do Conteúdo */}
        <header className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">
                    {activeTab === 'missions' ? 'Comandos e Missões' : activeTab === 'stores' ? 'Gestão de Unidades' : 'Gestão de Equipe'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Controle Profissional de Operações</p>
            </div>
            
            {activeTab === 'missions' && (
                <button 
                    onClick={() => openTaskModal()}
                    className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2"
                >
                    <i className="ph ph-plus-circle text-xl"></i> Atribuir Missão
                </button>
            )}

            {activeTab === 'stores' && (
                <button 
                    onClick={() => { setEditingStore(null); setStoreName(''); setIsStoreModalOpen(true); }}
                    className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2"
                >
                    <i className="ph ph-buildings text-xl"></i> Nova Unidade
                </button>
            )}

            {activeTab === 'users' && (
                <button 
                    onClick={() => { setEditingUser(null); setUserName(''); setUserPassword(''); setUserRole('vendedor'); setIsUserModalOpen(true); }}
                    className="bg-brand-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2"
                >
                    <i className="ph ph-user-plus text-xl"></i> Novo Vendedor
                </button>
            )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* VIEW: MISSIONS */}
            {activeTab === 'missions' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {tasks.length === 0 ? (
                        <div className="py-20 text-center opacity-20"><i className="ph ph-lightning text-8xl mb-4"></i><p className="font-black uppercase tracking-widest">Nenhuma missão enviada</p></div>
                    ) : tasks.map(t => (
                        <div key={t.id} className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-300 transition-all ${t.status === 'completed' ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${t.status === 'completed' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-brand-400'}`}>
                                    <i className={t.status === 'completed' ? 'ph ph-check-circle' : 'ph ph-lightning'}></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-sm font-black text-slate-800 uppercase truncate">{t.title}</h4>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${t.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {t.status === 'completed' ? 'CONCLUÍDO' : 'PENDENTE'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><i className="ph ph-user-circle"></i> PARA: {t.assignee_id === 'all' ? 'TODA A REDE' : t.assignee_id}</span>
                                        <span className="flex items-center gap-1.5"><i className="ph ph-calendar"></i> PRAZO: {t.due_date || 'IMEDIATO'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => openTaskModal(t)} className="w-10 h-10 rounded-xl border border-slate-100 text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center shadow-sm"><i className="ph ph-pencil-simple text-xl"></i></button>
                                <button onClick={() => { if(window.confirm('Excluir missão?')) taskService.delete(t.id).then(fetchData); }} className="w-10 h-10 rounded-xl border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm"><i className="ph ph-trash text-xl"></i></button>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VIEW: STORES */}
            {activeTab === 'stores' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {stores.map(s => (
                        <div key={s.id} className={`bg-white p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${s.archived ? 'grayscale opacity-60 border-slate-200 bg-slate-50' : 'border-slate-100 hover:border-brand-400 shadow-sm hover:shadow-xl'}`}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${s.archived ? 'bg-slate-200 text-slate-400' : 'bg-brand-50 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all'}`}>
                                    <i className="ph ph-buildings"></i>
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-base font-black text-slate-800 uppercase italic tracking-tighter truncate">{s.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.archived ? 'DESATIVADA' : 'EM OPERAÇÃO'}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => { setEditingStore(s); setStoreName(s.name); setIsStoreModalOpen(true); }}
                                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold uppercase text-[9px] hover:bg-slate-900 hover:text-white transition-all border border-slate-100 shadow-sm"
                                >
                                    Configurar
                                </button>
                                <button 
                                    onClick={() => handleArchiveStore(s)}
                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-[9px] transition-all border shadow-sm ${s.archived ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white' : 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white'}`}
                                >
                                    {s.archived ? 'Reativar' : 'Arquivar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VIEW: USERS */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {users.map(u => (
                        <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-brand-400 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:bg-brand-50 transition-all"></div>
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-16 h-16 bg-slate-900 text-brand-400 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-4 group-hover:scale-110 transition-transform overflow-hidden">
                                    {u.photo_url ? (
                                        <img src={u.photo_url.startsWith('http') ? u.photo_url : `local-img://${u.photo_url}`} className="w-full h-full object-cover" alt={u.name} />
                                    ) : (
                                        <i className="ph ph-user-focus"></i>
                                    )}
                                </div>
                                <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{u.name}</h4>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase mt-2 border ${u.role === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {u.role === 'admin' ? 'GERENTE / ADMIN' : 'VENDEDOR PDV'}
                                </span>
                                
                                <div className="w-full mt-6 flex gap-2">
                                    <button 
                                        onClick={() => { setEditingUser(u); setUserName(u.name); setUserPassword(u.password); setUserRole(u.role); setUserPhoto(u.photo_url || ''); setIsUserModalOpen(true); }}
                                        className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-bold uppercase text-[9px] hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                                    >
                                        Editar Acesso
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>

      {/* MODAL MISSÃO */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div className="relative z-10">
                  <h3 className="font-black uppercase italic tracking-tight text-xl">{editingTask ? 'Editar Comando' : 'Emitir Comando'}</h3>
                  <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">Protocolo de Operação da Rede</p>
               </div>
               <button onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center relative z-10 transition-all active:scale-90"><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveTask} className="p-10 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição da Tarefa</label>
                  <input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="EX: REALIZAR LIMPEZA DA BANCADA" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase outline-none focus:border-brand-500 shadow-inner" />
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Alvo</label>
                    <select value={taskAssigneeType} onChange={e => setTaskAssigneeType(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs uppercase outline-none focus:border-brand-500">
                      <option value="store">P/ UNIDADE</option><option value="user">P/ OPERADOR</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário Limite</label>
                    <input value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} placeholder="Ex: 18:30" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-brand-500" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-white transition-all group">
                    <input type="checkbox" checked={taskIsRoutine} onChange={e => setTaskIsRoutine(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                    <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-slate-900">Checklist Diário</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:bg-white transition-all group">
                    <input type="checkbox" checked={taskProofRequired} onChange={e => setTaskProofRequired(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                    <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-slate-900">Exigir Foto</span>
                  </label>
               </div>
               <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Destinatário</label>
                    <select required value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)} className="w-full p-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs outline-none focus:ring-4 focus:ring-brand-500/20">
                      <option value="">--- SELECIONAR ---</option>
                      <option value="all" className="text-brand-400 font-black italic">⚡ TODA A REDE (GLOBAL)</option>
                      {taskAssigneeType === 'store' 
                        ? stores.filter(s => !s.archived).map(s => <option key={s.id} value={s.id}>{s.name}</option>) 
                        : users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                      }
                    </select>
               </div>
               <button type="submit" className="w-full py-5 bg-brand-500 text-white font-black rounded-[1.5rem] shadow-2xl hover:bg-brand-600 uppercase text-sm tracking-widest transition-all active:scale-95">
                  {editingTask ? 'ATUALIZAR COMANDO' : 'DISPARAR MISSÃO'}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOJA */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 border border-slate-200">
            <div className="p-6 bg-brand-500 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingStore ? 'Editar Unidade' : 'Registrar Unidade'}</h3>
               <button onClick={() => setIsStoreModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-black/10 flex items-center justify-center"><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveStore} className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia / Comercial</label>
                  <input required value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="EX: FILIAL CENTRO" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-slate-700 outline-none focus:border-brand-500 shadow-inner" />
               </div>
               <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black uppercase text-xs tracking-widest transition-all">
                  Gravar Dados da Unidade
               </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USUÁRIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 border border-slate-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
               <h3 className="font-black uppercase italic text-lg">{editingUser ? 'Ajustar Acesso' : 'Cadastrar Operador'}</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"><i className="ph ph-x text-2xl"></i></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-4">
               <div className="flex flex-col items-center mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-400">
                        {userPhoto ? (
                            <img src={userPhoto.startsWith('data') ? userPhoto : `local-img://${userPhoto}`} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                            <i className="ph ph-camera text-3xl text-slate-300"></i>
                        )}
                        <input type="file" accept="image/*" onChange={handleUserPhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" title="Selecionar Foto" />
                    </div>
                    {userPhoto && (
                        <button type="button" onClick={() => setUserPhoto('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all">
                            <i className="ph ph-x text-xs"></i>
                        </button>
                    )}
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Foto do Perfil</p>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                  <input required value={userName} onChange={e => setUserName(e.target.value)} placeholder="NOME DO COLABORADOR" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-xs outline-none focus:border-brand-500 shadow-inner" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <input required type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="SENHA NUMÉRICA OU ALFA" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-brand-500 shadow-inner" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Permissão</label>
                  <select value={userRole} onChange={e => setUserRole(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-xs outline-none focus:border-brand-500 shadow-inner">
                    <option value="vendedor">VENDEDOR OPERADOR (LIMITADO)</option>
                    <option value="admin">GERENTE ADMINISTRADOR (TOTAL)</option>
                  </select>
               </div>
               <button type="submit" className="w-full py-5 bg-brand-500 text-white font-black rounded-2xl shadow-xl hover:bg-brand-600 uppercase text-xs tracking-widest transition-all mt-4">
                  Confirmar Acesso da Equipe
               </button>
            </form>
          </div>
        </div>
      )}

      <TaskCompletionModal 
        isOpen={!!selectedTaskForCompletion} 
        onClose={() => setSelectedTaskForCompletion(null)} 
        onConfirm={(data) => {
            taskService.complete(selectedTaskForCompletion.id, data.photo, data.justification)
                .then(res => { if(res.success) { toast.success('FEITO!'); setSelectedTaskForCompletion(null); fetchData(); } });
        }} 
        task={selectedTaskForCompletion} 
      />
    </div>
  );
};

export default NetworkManagement;