import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface MaintenanceDetailsProps {
  order: any;
  stores: any[];
  onClose: () => void;
  onUpdate: () => void;
}

const WORKFLOW_STEPS = [
  'Recebido na Loja',
  'Enviado para Laboratório',
  'Recebido no Laboratório',
  'Em Orçamento/Análise',
  'Aguardando Aprovação',
  'Em Manutenção',
  'Manutenção Concluída',
  'Em Trânsito de Retorno',
  'Pronto para Entrega',
  'Entregue ao Cliente'
];

const MaintenanceDetails: React.FC<MaintenanceDetailsProps> = ({ order, stores, onClose, onUpdate }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [budgetPrice, setBudgetPrice] = useState(order.price || '');
  const [techNotes, setTechNotes] = useState(order.technical_notes || '');

  useEffect(() => {
    fetchHistory();
  }, [order.id]);

  const fetchHistory = async () => {
    try {
      const data = await window.api.getRepairHistory(order.id);
      setHistory(data || []);
    } catch (e) { console.error(e); }
  };

  const requestStatusChange = async (newStatus: string) => {
    const currentVendedor = localStorage.getItem('vendedor') || 'SISTEMA';
    const loadingId = toast.loading('Atualizando status...');
    try {
      const res = await window.api.updateRepairStatus({
        id: order.id,
        status: newStatus,
        userName: currentVendedor
      });
      if (res.success) {
        toast.success('MOVIMENTAÇÃO REGISTRADA!', { id: loadingId });
        onUpdate();
        fetchHistory();
      } else {
        toast.error(res.error, { id: loadingId });
      }
    } catch (e) { toast.error('Falha na comunicação', { id: loadingId }); }
  };

  const requestBudgetSave = async () => {
    const currentVendedor = localStorage.getItem('vendedor') || 'SISTEMA';
    const loadingId = toast.loading('Salvando orçamento...');
    try {
      const res = await window.api.updateRepairNotes({
        id: order.id,
        notes: techNotes,
        price: budgetPrice,
        userName: currentVendedor
      });
      if (res.success) {
        toast.success('ORÇAMENTO ATUALIZADO!', { id: loadingId });
        onUpdate();
        fetchHistory();
      } else {
        toast.error(res.error, { id: loadingId });
      }
    } catch (e) { toast.error('Falha na comunicação', { id: loadingId }); }
  };

  const getStoreName = (id: string) => stores.find(s => String(s.id) === String(id))?.name || 'Não definida';

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header - Compact & Serious */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xl shadow-sm">
              <i className="ph ph-wrench"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{order.customer_name}</h2>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">OS #{order.id.substring(0, 8)}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><i className="ph ph-storefront text-brand-500"></i> {getStoreName(order.entry_store_id)}</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5"><i className="ph ph-calendar text-brand-500"></i> {new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-lg hover:bg-red-500 hover:text-white text-slate-400 flex items-center justify-center transition-all border border-slate-200 bg-white shadow-sm group"
          >
            <i className="ph ph-x text-xl font-bold"></i>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content - Left Side */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Cliente Info */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Informações do Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Telefone Principal</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{order.customer_phone}</span>
                            <button onClick={() => window.open(`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`, '_blank')} className="text-emerald-500 hover:text-emerald-600 transition-colors"><i className="ph ph-whatsapp-logo-fill text-xl"></i></button>
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">E-mail</p>
                        <span className="text-xs font-bold text-slate-700 break-all">{order.customer_email || 'Não informado'}</span>
                    </div>
                </div>
              </div>

              {/* Equipamento Info */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Detalhes do Dispositivo</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Equipamento</p>
                            <p className="text-sm font-black text-slate-900 uppercase">{order.device_brand} {order.device_model}</p>
                        </div>
                        <i className="ph ph-device-mobile text-2xl text-slate-300"></i>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Serial / IMEI</p>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-tighter">{order.serial_number || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Senha/Acesso</p>
                        <p className="text-xs font-black text-brand-600 font-mono bg-brand-50 px-2 py-0.5 rounded border border-brand-100 w-fit">{order.device_password || 'N/A'}</p>
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Defeito e Estado */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Diagnóstico Inicial</h3>
                <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100/50 mb-3">
                    <p className="text-[9px] font-bold text-orange-400 uppercase mb-1.5 tracking-widest">Defeito Relatado</p>
                    <p className="text-xs font-bold text-orange-900 italic leading-relaxed">"{order.issue_description}"</p>
                </div>
                <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Estado Físico / Checklist</p>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{order.visual_condition || 'Nenhuma marca observada'}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase italic border-l-2 border-slate-200 pl-2">Checks: {order.checklist || 'Nenhum item'}</p>
                </div>
              </div>

              {/* Fotos */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Evidências Visuais</h3>
                {order.photo_url ? (
                    <div className="relative w-32 h-32 group cursor-pointer" onClick={() => window.open(`local-img://${order.photo_url}`)}>
                      <img src={`local-img://${order.photo_url}`} className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm transition-all" alt="Device" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-all">
                        <i className="ph ph-magnifying-glass-plus text-white text-xl"></i>
                      </div>
                    </div>
                ) : (
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                        <i className="ph ph-image text-3xl"></i>
                        <span className="text-[8px] font-bold uppercase mt-1">Sem foto</span>
                    </div>
                )}
              </div>
            </div>

            {/* Histórico - Dense & Professional */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 flex justify-between items-center">
                <span>Histórico de Movimentações</span>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{history.length} eventos</span>
              </h3>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="py-10 text-center opacity-30 font-bold uppercase text-[10px]">Aguardando primeira movimentação...</div>
                ) : history.map((h, i) => (
                  <div key={i} className="flex gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-lg hover:border-slate-200 transition-all">
                    <div className="flex-none pt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <p className="text-[10px] font-bold text-slate-900 uppercase truncate">{h.user_name}</p>
                            <span className="text-[9px] font-mono font-bold text-slate-400 whitespace-nowrap">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-tight mb-1">{h.action}</p>
                        {h.notes && <p className="text-[10px] text-slate-400 italic bg-white p-2 rounded border border-slate-100 mt-1">"{h.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Actions & Flow */}
          <div className="w-80 border-l border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden">
            <div className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
              
              {/* Workflow Flow */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="ph ph-stairs text-brand-500"></i> Etapa do Fluxo
                </h4>
                <div className="flex flex-col gap-1.5">
                  {WORKFLOW_STEPS.map(step => (
                    <button 
                      key={step} 
                      onClick={() => requestStatusChange(step)}
                      className={`text-left px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all border ${order.status === step ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-brand-500/20' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-300 hover:text-slate-600 shadow-sm'}`}
                    >
                      <div className="flex items-center gap-2">
                        {order.status === step && <i className="ph ph-check-circle-fill text-brand-500"></i>}
                        {step}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orçamento e Laudo */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="ph ph-clipboard-text text-brand-500"></i> Laudo e Orçamento
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Anotações do Técnico</label>
                        <textarea 
                            value={techNotes}
                            onChange={e => setTechNotes(e.target.value)}
                            placeholder="Descreva o serviço realizado..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 outline-none focus:border-brand-500 h-28 resize-none shadow-inner"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Valor Final do Serviço (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs italic">R$</span>
                            <input 
                                type="number" 
                                value={budgetPrice}
                                onChange={e => setBudgetPrice(e.target.value)}
                                className="w-full p-3 pl-8 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-800 outline-none focus:border-brand-500 shadow-sm" 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={requestBudgetSave}
                        className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-brand-600 shadow-lg shadow-brand-500/10 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="ph ph-floppy-disk text-lg"></i>
                        Atualizar Orçamento
                    </button>
                </div>
              </div>

              {/* Alert Area */}
              {(order.status === 'Manutenção Concluída' || order.status === 'Pronto para Entrega') && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-1.5 text-emerald-700">
                     <i className="ph ph-info-bold text-base"></i>
                     <p className="text-[9px] font-black uppercase tracking-widest">Atenção Logística</p>
                  </div>
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase leading-tight">Retornar para: {getStoreName(order.entry_store_id)}</h4>
                </div>
              )}
            </div>

            {/* Footer Sidebar - Essential Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
                <button 
                    onClick={() => window.api.printRepairReceipt({ repair: order, storeName: getStoreName(order.entry_store_id) })}
                    className="w-full py-2.5 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold uppercase text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <i className="ph ph-printer text-base"></i> Reimprimir OS
                </button>
                <button 
                    onClick={() => requestStatusChange('Entregue ao Cliente')}
                    className="w-full py-3 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                    <i className="ph ph-handshake text-lg"></i> Entregar Aparelho
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDetails;