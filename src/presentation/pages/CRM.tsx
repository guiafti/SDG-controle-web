import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface CRMProps {
  currentUser?: { id: string, name: string, role: string };
  currentStoreId?: string;
}

const CRM: React.FC<CRMProps> = ({ currentUser, currentStoreId }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detalhes do Cliente Selecionado
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [repairHistory, setRepairHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSpent: 0, ticketMedia: 0, lastPurchase: '', totalRepairs: 0 });

  // Form states para edição/novo
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formCity, setFormCity] = useState('ALMENARA');
  const [formNotes, setFormNotes] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await window.api.getCustomers();
      setCustomers(data || []);
      // Se tiver um cliente selecionado, atualiza ele na lista também
      if (selectedCustomer) {
        const updated = data.find((c: any) => c.id === selectedCustomer.id);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (e) { toast.error('Erro ao carregar base de clientes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const selectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    setIsEditing(false);
    setLoading(true);
    try {
      const [sales, repairs] = await Promise.all([
        window.api.getSalesByCustomer(customer.id),
        window.api.getRepairsByCustomer(customer.id)
      ]);
      
      setPurchaseHistory(sales || []);
      setRepairHistory(repairs || []);

      // Calcula estatísticas
      const total = sales.reduce((acc: number, s: any) => acc + s.total, 0);
      setStats({
        totalSpent: total,
        ticketMedia: sales.length > 0 ? total / sales.length : 0,
        lastPurchase: sales.length > 0 ? sales[0].created_at : '',
        totalRepairs: repairs.length
      });

      // Prepara o form de edição
      setFormName(customer.name);
      setFormPhone(customer.phone);
      setFormEmail(customer.email || '');
      setFormAddress(customer.address || '');
      setFormCpf(customer.cpf || '');
      setFormCity(customer.city || 'ALMENARA');
      setFormNotes(customer.notes || '');

    } catch (e) { toast.error('Erro ao carregar histórico'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return toast.error('Nome é obrigatório!');
    
    const loadingId = toast.loading('Processando registro...');
    try {
      const result = await window.api.saveCustomer({
        id: isEditing && selectedCustomer ? selectedCustomer.id : null,
        name: formName,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        cpf: formCpf,
        city: formCity,
        notes: formNotes
      });

      if (result.success) {
        toast.success('CLIENTE REGISTRADO COM SUCESSO!', { id: loadingId });
        await fetchCustomers();
        if (!isEditing) {
            // Se era novo cliente, busca ele pra selecionar
            const all = await window.api.getCustomers();
            const last = all.find((c: any) => c.name === formName.toUpperCase());
            if (last) selectCustomer(last);
        }
        setIsEditing(false);
      }
    } catch (e) { toast.error('Falha ao salvar'); }
    finally { toast.dismiss(loadingId); }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) || 
    c.cpf?.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex h-full bg-slate-50 overflow-hidden">
      
      {/* Coluna Esquerda: Lista de Clientes */}
      <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-4 flex items-center gap-2">
                <i className="ph ph-users-three text-brand-500"></i> Gestão CRM
            </h1>
            <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                    type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500 shadow-sm"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            <button 
                onClick={() => { setSelectedCustomer(null); setIsEditing(true); setFormName(''); setFormPhone(''); setFormEmail(''); setFormAddress(''); setFormCpf(''); setFormNotes(''); }}
                className="w-full p-3 mb-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:border-brand-300 hover:text-brand-500 transition-all"
            >
                <i className="ph ph-plus-circle text-lg"></i> Novo Cliente
            </button>

            {filteredCustomers.map(c => (
                <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-3 group ${selectedCustomer?.id === c.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg ring-4 ring-brand-500/10' : 'bg-white border-slate-100 text-slate-600 hover:border-brand-200'}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${selectedCustomer?.id === c.id ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500'}`}>
                        <i className="ph ph-user"></i>
                    </div>
                    <div className="text-left min-w-0">
                        <p className={`text-[11px] font-black uppercase truncate ${selectedCustomer?.id === c.id ? 'text-white' : 'text-slate-800'}`}>{c.name}</p>
                        <p className={`text-[9px] font-bold ${selectedCustomer?.id === c.id ? 'text-slate-400' : 'text-slate-400'}`}>{c.phone}</p>
                    </div>
                </button>
            ))}
        </div>
      </aside>

      {/* Área Direita: Detalhes 360º */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {!selectedCustomer && !isEditing ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <i className="ph ph-user-focus text-9xl"></i>
                <h2 className="text-xl font-black uppercase tracking-widest mt-4">Selecione um cliente para analisar</h2>
                <p className="text-sm font-bold uppercase">Inteligência de Vendas e Fidelidade</p>
            </div>
        ) : isEditing ? (
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar animate-in fade-in duration-300">
                <div className="max-w-3xl mx-auto bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-slate-900 text-brand-400 rounded-2xl flex items-center justify-center text-2xl">
                            <i className="ph ph-user-plus"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">{selectedCustomer ? 'Editar Perfil' : 'Novo Cadastro de Cliente'}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preencha os dados para enriquecer seu CRM</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação Principal</label>
                            <input required value={formName} onChange={e => setFormName(e.target.value)} placeholder="NOME COMPLETO *" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-brand-500 shadow-inner" />
                            <input required value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="WHATSAPP / TELEFONE *" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-brand-500 shadow-inner" />
                            <input value={formCpf} onChange={e => setFormCpf(e.target.value)} placeholder="CPF PARA NOTA" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-brand-500 shadow-inner" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contato e Endereço</label>
                            <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="E-MAIL" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-brand-500 shadow-inner" />
                            <input value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="CIDADE" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-brand-500 shadow-inner" />
                            <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="ENDEREÇO COMPLETO" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-brand-500 shadow-inner" />
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas e Observações de Venda</label>
                            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Preferências do cliente, restrições, histórico verbal..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs text-slate-700 outline-none focus:border-brand-500 h-32 resize-none shadow-inner" />
                        </div>
                        <div className="md:col-span-2 flex gap-4 pt-4">
                            <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-50">Cancelar</button>
                            <button type="submit" className="flex-[2] py-4 bg-brand-500 text-white font-black rounded-2xl shadow-xl hover:bg-brand-600 uppercase text-xs tracking-widest transition-all">
                                {selectedCustomer ? 'Salvar Alterações' : 'Concluir Cadastro'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                {/* Header do Cliente */}
                <div className="p-8 bg-white border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-brand-500 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-xl shadow-brand-500/20">
                            <i className="ph ph-user-focus"></i>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedCustomer.name}</h2>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-xs font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-full"><i className="ph ph-whatsapp-logo"></i> {selectedCustomer.phone}</span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cidade: {selectedCustomer.city || 'ALMENARA'}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
                    >
                        <i className="ph ph-pencil-simple text-lg"></i> Editar Perfil
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                    {/* Painel de Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Consumido</p>
                            <h4 className="text-xl font-black text-emerald-600 italic">R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                            <h4 className="text-xl font-black text-brand-600 italic">R$ {stats.ticketMedia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Compra</p>
                            <h4 className="text-sm font-black text-slate-800 uppercase">{stats.lastPurchase ? new Date(stats.lastPurchase).toLocaleDateString('pt-BR') : 'NUNCA COMPROU'}</h4>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Manutenções</p>
                            <h4 className="text-xl font-black text-orange-500 italic">{stats.totalRepairs} <span className="text-[10px] uppercase font-bold text-slate-400">Ordens</span></h4>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Histórico de Compras */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <i className="ph ph-receipt text-lg text-brand-500"></i> Linha do Tempo de Compras
                            </h3>
                            <div className="space-y-3">
                                {purchaseHistory.length === 0 ? (
                                    <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-200 text-center opacity-40">
                                        <i className="ph ph-shopping-cart-simple text-4xl mb-2"></i>
                                        <p className="text-[10px] font-black uppercase">Nenhuma compra registrada</p>
                                    </div>
                                ) : purchaseHistory.map(sale => (
                                    <div key={sale.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-200 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight italic">{new Date(sale.created_at).toLocaleDateString('pt-BR')} • {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Loja: {sale.store_id || 'ALMENARA'}</p>
                                            </div>
                                            <span className="text-sm font-black text-emerald-600 font-mono">R$ {sale.total.toFixed(2)}</span>
                                        </div>
                                        <div className="space-y-1.5 py-3 border-y border-slate-50">
                                            {JSON.parse(sale.items || '[]').map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-600">
                                                    <span className="truncate pr-4">{item.qtd}x {item.nome}</span>
                                                    <span className="text-slate-300 shrink-0">R$ {item.preco.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex justify-between items-center">
                                            <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded uppercase tracking-widest">{sale.payment_method}</span>
                                            <span className="text-[9px] font-black text-slate-800 uppercase italic">Atendido por: {sale.vendedor}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Histórico de Manutenções */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <i className="ph ph-wrench text-lg text-orange-500"></i> Histórico de Assistência
                            </h3>
                            <div className="space-y-3">
                                {repairHistory.length === 0 ? (
                                    <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-200 text-center opacity-40">
                                        <i className="ph ph-shield-warning text-4xl mb-2"></i>
                                        <p className="text-[10px] font-black uppercase">Sem registros de manutenção</p>
                                    </div>
                                ) : repairHistory.map(order => (
                                    <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">#{order.id.substring(0,8)} • {order.device_brand} {order.device_model}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${order.status === 'Entregue ao Cliente' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>{order.status}</span>
                                        </div>
                                        <p className="text-[10px] font-medium text-slate-500 italic leading-tight mt-2 border-l-2 border-slate-100 pl-3">"{order.issue_description}"</p>
                                        <div className="mt-4 flex justify-between items-center">
                                            <div className="text-[10px] font-black text-slate-800">R$ {Number(order.price).toFixed(2)}</div>
                                            <div className="text-[9px] font-black text-brand-600 uppercase">Técnico: {order.vendedor || 'SISTEMA'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default CRM;