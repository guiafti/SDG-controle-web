import React from 'react';
import { CartItem } from '../../domain/CartItem';

interface CartListProps {
  items: CartItem[];
  onUpdateQuantity?: (id: string, qtd: number) => void;
  logo?: string;
}

const CartList: React.FC<CartListProps> = ({ items, onUpdateQuantity, logo }) => {
  return (
    <div className="bg-white flex-1 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
      <div className="bg-slate-50 text-slate-400 px-4 py-2 flex text-[9px] uppercase font-bold tracking-widest border-b border-slate-100 relative z-10">
        <div className="w-10">ID</div>
        <div className="flex-1 ml-10">Descrição</div>
        <div className="w-20 text-center">Qtd</div>
        <div className="w-24 text-right">Unitário</div>
        <div className="w-24 text-right">Subtotal</div>
      </div>
      
      <div id="cart-items" className="flex-1 overflow-y-auto p-2 space-y-1 relative bg-slate-50/30">
        
        {/* Logo Watermark - Subtle */}
        {logo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
            <img src={logo} alt="Watermark" className="w-1/2 max-w-xs object-contain grayscale" />
          </div>
        )}

        <div className="relative z-10">
          {items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
              <i className="ph ph-barcode text-5xl mb-2 opacity-20"></i>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">Aguardando Produtos...</p>
            </div>
          ) : (
            [...items].reverse().map((item, index) => {
              const subtotal = item.preco * item.qtd;
              const itemNum = (items.length - index).toString().padStart(3, '0');
              
              let imgUrl = item.imagem || 'https://placehold.co/150x150/f1f5f9/64748b?text=OS';
              if (item.imagem && !item.imagem.startsWith('http') && !item.imagem.startsWith('data:image')) {
                imgUrl = `local-img://${item.imagem}`;
              }

              return (
                <div key={`${item.id}-${index}`} className="flex items-center px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-brand-200 gap-3 group">
                  <div className="w-8 text-slate-300 font-mono font-bold text-xs">{itemNum}</div>
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imagem?.startsWith('icon:') ? (
                      <i className={`ph ${item.imagem.replace('icon:', '')} text-2xl text-brand-500`}></i>
                    ) : (
                      <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="text-[11px] font-bold text-slate-700 uppercase truncate leading-tight">{item.nome}</div>
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">EAN: {item.id}</div>
                  </div>
                  
                  {/* Quantity Controls - Minimalist */}
                  <div className="w-20 flex items-center justify-center gap-1.5">
                    {onUpdateQuantity ? (
                      <>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.qtd - 1)} 
                          className="w-5 h-5 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all text-xs font-bold border border-slate-100"
                        >
                          <i className="ph ph-minus"></i>
                        </button>
                        <span className="font-bold text-slate-700 text-xs w-5 text-center">{item.qtd}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.qtd + 1)} 
                          className="w-5 h-5 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center hover:bg-brand-100 active:scale-90 transition-all text-xs font-bold border border-brand-100"
                        >
                          <i className="ph ph-plus"></i>
                        </button>
                      </>
                    ) : (
                      <span className="font-bold text-brand-600 text-xs">{item.qtd}x</span>
                    )}
                  </div>

                  <div className="w-24 text-right text-[10px] text-slate-400 font-bold font-mono">
                    {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="w-24 text-right font-bold text-slate-800 text-sm font-mono">
                    {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CartList;