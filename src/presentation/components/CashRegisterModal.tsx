import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { registerService } from '../services/registerService';
import { printerService } from '../services/printerService';

// ... (interface remains same)

const CashRegisterModal: React.FC<Props> = ({ isOpen, onClose, storeId, userName, onStatusChange }) => {
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'status' | 'opening' | 'closing'>('status');
  
  // Opening state
  const [openingBalance, setOpeningBalance] = useState('0');
  
  // Closing state
  const [totals, setTotals] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [salesByEmployee, setSalesByEmployee] = useState<any[]>([]);
  const [reportedBalance, setReportedBalance] = useState('');
  const [notes, setNotes] = useState('');

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const reg = await registerService.getCurrent({ storeId });
      setCurrentRegister(reg);
      if (reg) {
        setView('status');
        onStatusChange?.(true);
      } else {
        setView('opening');
        onStatusChange?.(false);
      }
    } catch (e) {
      console.error(e);
      setView('opening');
      onStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRegister();
  }, [isOpen]);

  useEffect(() => {
    if (!storeId) return;

    const unsubscribe = registerService.subscribeToChanges((payload) => {
      console.log('[REALTIME MODAL] Alteração de caixa recebida via Supabase:', payload);
      fetchRegister();
    }, storeId);

    return () => {
      unsubscribe();
    };
  }, [storeId]);

  const handleOpen = async () => {
    const val = parseFloat(openingBalance);
    if (isNaN(val) || val < 0) return toast.error('Informe um valor inicial válido');
    
    const effectiveStoreId = storeId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedStoreId') : '') || '';
    const effectiveUserName = userName || (typeof localStorage !== 'undefined' ? localStorage.getItem('vendedor') : 'Operador') || 'Operador';

    const loadingId = toast.loading('Abrindo caixa no sistema...');
    try {
      const res = await registerService.open({
        storeId: effectiveStoreId,
        openedBy: effectiveUserName,
        initialValue: val
      });
      
      if (res.success) {
        toast.success('CAIXA ABERTO COM SUCESSO!', { id: loadingId });
        await fetchRegister();
      } else {
        toast.error(`Erro ao abrir caixa: ${res.error || 'Falha no banco'}`, { id: loadingId });
      }
    } catch (e: any) {
      toast.error(`Falha: ${e?.message || 'Erro de comunicação'}`, { id: loadingId });
    }
  };

  const generatePrintableReceipt = (totals: any, topProducts: any[], salesByEmployee: any[]) => {
    let receipt = "=== FECHAMENTO DE CAIXA ===\n\n";
    receipt += `Abertura: ${new Date(currentRegister?.opened_at).toLocaleString()}\n`;
    receipt += `Fechamento: ${new Date().toLocaleString()}\n`;
    receipt += `Operador: ${userName}\n`;
    receipt += `\n--- RESUMO FINANCEIRO ---\n`;
    receipt += `Fundo de Caixa: R$ ${currentRegister?.opening_balance?.toFixed(2) || '0.00'}\n`;
    receipt += `Vendas Dinheiro: R$ ${totals.cash.toFixed(2)}\n`;
    receipt += `Vendas Pix: R$ ${totals.pix.toFixed(2)}\n`;
    receipt += `Vendas Cartao: R$ ${totals.card.toFixed(2)}\n`;
    receipt += `Descontos Dados: R$ ${totals.discounts.toFixed(2)}\n`;
    receipt += `Total de Vendas: R$ ${totals.sales.toFixed(2)}\n`;
    receipt += `Saidas/Despesas: R$ ${totals.expenses.toFixed(2)}\n`;
    receipt += `\nVALOR ESPERADO (GAVETA): R$ ${(currentRegister?.opening_balance + totals.cash - totals.expenses).toFixed(2)}\n`;
    receipt += `VALOR INFORMADO: R$ ${parseFloat(reportedBalance || '0').toFixed(2)}\n`;
    
    receipt += `\n--- PERFORMANCE DA EQUIPE ---\n`;
    salesByEmployee.forEach(emp => {
      receipt += `${emp.name}: R$ ${emp.total.toFixed(2)}\n`;
    });

    receipt += `\n--- TOP 5 PRODUTOS ---\n`;
    topProducts.forEach(prod => {
      receipt += `${prod.qtd}x - ${prod.nome}\n`;
    });

    receipt += `\n---------------------------\n`;
    receipt += `Assinatura Gerente/Operador\n`;
    receipt += `\n\n\n`;
    return receipt;
  };

  const handleStartClosing = async () => {
    const data = await registerService.getData({ storeId, openedAt: currentRegister.opened_at });
    setTotals(data.totals || data); 
    setTopProducts(data.topProducts || []);
    setSalesByEmployee(data.salesByEmployee || []);
    setView('closing');
  };

  const handleClose = async () => {
    const reported = parseFloat(reportedBalance);
    if (isNaN(reported)) return toast.error('Informe o valor contado na gaveta');

    const loadingId = toast.loading('Encerrando dia e gerando sangria...');
    try {
      const res = await registerService.close({
        id: currentRegister.id,
        closedBy: userName,
        finalValue: reported,
        observations: notes,
        storeId,
        openedAt: currentRegister.opened_at,
        initialAmount: currentRegister.initial_amount || currentRegister.opening_balance
      });

      if (res.success) {
        toast.success('CAIXA FECHADO!', { id: loadingId });
        
        try {
          const content = generatePrintableReceipt(totals, topProducts, salesByEmployee);
          await printerService.printUSB(0x28E9, 0x0289, content);
          toast.success('Cupom de Fechamento enviado!');
        } catch(e) {}

        onStatusChange?.(false);
        onClose();
      } else {
        toast.error('Erro ao fechar caixa', { id: loadingId });
      }
    } catch (e: any) {
      toast.error('Falha na comunicação', { id: loadingId });
    }
  };

  if (!isOpen) return null;

  const expectedCashCalc = (
    Number(currentRegister?.initial_amount ?? currentRegister?.opening_balance ?? 0) +
    Number(totals?.cashSales ?? totals?.cash ?? 0) +
    Number(totals?.cashMaintenance ?? 0) +
    Number(totals?.cashSuprimentos ?? 0) -
    Number(totals?.cashSangrias ?? 0) -
    Number(totals?.cashExpenses ?? 0)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-brand-600 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white"><i className="ph ph-x text-2xl"></i></button>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter">Controle de Caixa</h3>
          <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
            {currentRegister ? `Aberto por ${currentRegister.user_name || currentRegister.operator}` : 'Nenhum caixa aberto'}
          </p>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando banco...</p>
            </div>
          ) : (
            <>
              {view === 'opening' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center text-2xl"><i className="ph ph-door-open"></i></div>
                    <div>
                      <h4 className="font-black text-blue-900 uppercase text-xs">Abrir Novo Caixa</h4>
                      <p className="text-blue-500 text-[10px] font-bold">Informe o valor inicial na gaveta</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Saldo Inicial (Troco)</label>
                    <input 
                      type="number" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-black text-2xl text-slate-700"
                    />
                  </div>
                  <button onClick={handleOpen} className="w-full py-5 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all uppercase text-sm italic">
                    ABRIR CAIXA AGORA
                  </button>
                </div>
              )}

              {view === 'status' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Saldo Inicial</span>
                      <div className="text-xl font-black text-emerald-900">R$ {(currentRegister.initial_amount || currentRegister.opening_balance).toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início do Turno</span>
                      <div className="text-xs font-black text-slate-600 uppercase">
                        {new Date(currentRegister.opened_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-3">
                    <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Final de Expediente?</p>
                    <div className="flex gap-2">
                      <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-500 hover:bg-slate-50 transition-all">Continuar Vendendo</button>
                      <button onClick={handleStartClosing} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all italic">Fechar e Retirar R$</button>
                    </div>
                  </div>
                </div>
              )}

              {view === 'closing' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-amber-50 p-4 rounded-2xl flex items-center gap-4 border border-amber-100">
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20"><i className="ph ph-hand-coins"></i></div>
                    <div className="flex-1">
                      <h4 className="font-black text-amber-900 uppercase text-xs">Retirada Final (Sangria)</h4>
                      <p className="text-amber-600 text-[10px] font-bold">Confirme os valores para encerrar o dia</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-black text-amber-400 uppercase">Aberto em:</div>
                      <div className="text-[10px] font-black text-amber-900">{new Date(currentRegister.opened_at).toLocaleTimeString()}</div>
                      <div className="text-[8px] font-black text-amber-400 uppercase mt-1">Fechando em:</div>
                      <div className="text-[10px] font-black text-amber-900">{new Date().toLocaleTimeString()}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Vendas Digitais (Pix/Cartão)</span>
                      <div className="text-sm font-black text-slate-700">R$ {(totals?.pixSales + totals?.cardSales || totals?.pix + totals?.card || 0).toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Vendas em Dinheiro</span>
                      <div className="text-sm font-black text-slate-700">R$ {(totals?.cashSales ?? totals?.cash ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-xl">
                      <span className="text-[8px] font-bold text-red-400 uppercase">Total de Saídas / Sangrias</span>
                      <div className="text-sm font-black text-red-600">- R$ {(totals?.expenses ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                      <span className="text-[8px] font-bold text-brand-600 uppercase tracking-tighter">Valor Esperado em Dinheiro</span>
                      <div className="text-sm font-black text-brand-700">R$ {expectedCashCalc.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor da Retirada (Total em Mãos)</label>
                      <input 
                        autoFocus
                        type="number" step="0.01" value={reportedBalance} onChange={e => setReportedBalance(e.target.value)}
                        className="w-full p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl outline-none focus:border-brand-500 font-black text-xl text-slate-700"
                        placeholder="0.00"
                      />
                      <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase italic">* Este valor será registrado como Sangria no financeiro</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Observações do Fechamento</label>
                      <textarea 
                        value={notes} onChange={e => setNotes(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-bold text-xs h-16 resize-none"
                        placeholder="Ex: Sangria total realizada, deixado R$ 50 para troco amanhã..."
                      />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setView('status')} className="flex-1 py-4 font-black text-[10px] uppercase text-slate-400">Voltar</button>
                        <button onClick={handleClose} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-xl shadow-slate-900/20">Finalizar e Gerar Sangria</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashRegisterModal;