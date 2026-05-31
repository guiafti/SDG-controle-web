import React, { useEffect, useState } from 'react';
import { customerService } from '../services/customerService';

// ... (interface remains same)

const FinancialPanel: React.FC<FinancialPanelProps> = ({ 
  totalItems, 
  discount, 
  onDiscountChange, 
  onFinish 
}) => {
  // ... (states remains same)

  const totalFinal = Math.max(0, totalItems - discount);

  useEffect(() => {
    customerService.getAll().then(setCustomers).catch(() => {});
  }, []);

  const filteredCustomers = customerSearch.trim() === '' ? [] : customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  ).slice(0, 5);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar F10 se a venda estiver vazia (totalFinal === 0 e totalItems === 0)
      if (e.key === 'F10') {
        e.preventDefault();
        setIsPaymentModalOpen(true);
        return;
      }

      if (isPaymentModalOpen) {
        if (e.key === 'Escape') {
          setIsPaymentModalOpen(false);
          return;
        }

        let method = '';
        if (e.key === '1') method = 'PIX';
        if (e.key === '2') method = 'DINHEIRO';
        if (e.key === '3') method = 'CARTAO_CREDITO';
        if (e.key === '4') method = 'CARTAO_DEBITO';

        if (method) {
          setIsPaymentModalOpen(false);
          onFinish(method, selectedCustomer?.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFinish, selectedCustomer, isPaymentModalOpen]);

  return (
    <>
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4">
              <i className="ph ph-wallet text-3xl"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-1">Forma de Pagamento</h2>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-8">Pressione o número correspondente</p>
            
            <div className="w-full space-y-3 mb-8">
              <div onClick={() => { setIsPaymentModalOpen(false); onFinish('PIX', selectedCustomer?.id); }} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><i className="ph ph-qr-code text-lg"></i></div>
                  <span className="font-bold text-slate-700 uppercase">PIX</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm group-hover:bg-brand-500 group-hover:text-white transition-colors">1</div>
              </div>
              <div onClick={() => { setIsPaymentModalOpen(false); onFinish('DINHEIRO', selectedCustomer?.id); }} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><i className="ph ph-money text-lg"></i></div>
                  <span className="font-bold text-slate-700 uppercase">Dinheiro</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm group-hover:bg-brand-500 group-hover:text-white transition-colors">2</div>
              </div>
              <div onClick={() => { setIsPaymentModalOpen(false); onFinish('CARTAO_CREDITO', selectedCustomer?.id); }} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i className="ph ph-credit-card text-lg"></i></div>
                  <span className="font-bold text-slate-700 uppercase">Cartão de Crédito</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm group-hover:bg-brand-500 group-hover:text-white transition-colors">3</div>
              </div>
              <div onClick={() => { setIsPaymentModalOpen(false); onFinish('CARTAO_DEBITO', selectedCustomer?.id); }} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-brand-500 hover:bg-brand-50 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><i className="ph ph-credit-card text-lg"></i></div>
                  <span className="font-bold text-slate-700 uppercase">Cartão de Débito</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm group-hover:bg-brand-500 group-hover:text-white transition-colors">4</div>
              </div>
            </div>

            <button onClick={() => setIsPaymentModalOpen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
              ESC - Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="w-[320px] flex flex-col gap-4">
        {/* Identificador de Cliente */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 relative">
          <label className="block text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2 ml-1">Identificar Cliente</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-brand-50 p-2.5 rounded-xl border border-brand-100">
               <div className="min-w-0">
                  <p className="text-xs font-bold text-brand-700 uppercase truncate">{selectedCustomer.name}</p>
                  <p className="text-[9px] text-brand-500 font-medium">{selectedCustomer.phone}</p>
               </div>
               <button onClick={() => setSelectedCustomer(null)} className="text-brand-400 hover:text-brand-600"><i className="ph ph-x-circle text-xl"></i></button>
            </div>
          ) : (
            <div className="relative">
              <i className="ph ph-user-focus absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                type="text" 
                placeholder="NOME OU WHATSAPP..." 
                value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setIsCustomerDropdownOpen(true); }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-500 transition-all uppercase"
              />
              {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                  {filteredCustomers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setIsCustomerDropdownOpen(false); }}
                      className="p-3 hover:bg-brand-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center group"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-700 uppercase truncate group-hover:text-brand-600">{c.name}</p>
                        <p className="text-[8px] text-slate-400 font-medium">{c.phone}</p>
                      </div>
                      <i className="ph ph-plus-circle text-slate-300 group-hover:text-brand-500 text-lg"></i>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 text-white flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-slate-800 opacity-30 pointer-events-none">
            <i className="ph ph-currency-circle-dollar text-[120px]"></i>
          </div>
          
          <div className="relative z-10 flex-1">
            <p className="text-brand-400 text-[10px] font-bold tracking-widest uppercase mb-1">Total a Pagar</p>
            <h1 className="text-4xl font-bold text-white font-mono mb-6 tracking-tighter">
              {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h1>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1.5 ml-1">Desconto (R$)</label>
                <input 
                  type="number" 
                  value={discount || ''} 
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 outline-none text-right font-mono text-lg font-bold focus:border-brand-500 transition-colors disabled:opacity-50" 
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Subtotal:</span>
                <span className="text-sm font-bold text-slate-300 font-mono">{totalItems.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsPaymentModalOpen(true)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-lg font-bold tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all uppercase"
        >
          <i className="ph ph-check-circle text-2xl"></i>
          Finalizar (F10)
        </button>
      </div>
    </>
  );
};

export default FinancialPanel;