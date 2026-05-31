import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';

interface ProductSearchModalProps {
  // ... (interface remains same)
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({ isOpen, onClose, onSelectProduct, storeId }) => {
  // ... (states remains same)

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [pData, sData] = await Promise.all([
        productService.getAll(),
        storeService.getAll()
      ]);
      setProducts(pData || []);
      setStores(sData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getTotalStock = (p: any) => {
    if (!p.stocks) return 0;
    return Object.values(p.stocks as Record<string, number>).reduce((a, b) => a + b, 0);
  };

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 pt-14">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-brand-600 p-6 text-white shrink-0 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Pesquisa Manual</h3>
            <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">
              Busque pelo nome ou código do produto
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>
        
        <div className="p-6 shrink-0 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <i className="ph ph-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold"></i>
            <input 
              type="text" 
              autoFocus
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl py-5 pl-14 pr-6 outline-none focus:border-brand-500 font-black text-slate-700 shadow-sm transition-all text-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:border-brand-300 transition-all flex items-center gap-5 group">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 shrink-0 overflow-hidden border border-slate-100 cursor-pointer"
                       onClick={() => setViewingProduct(p)}>
                    {p.image ? (
                      p.image.startsWith('icon:') ? (
                        <i className={`ph ${p.image.replace('icon:', '')} text-4xl text-brand-500`}></i>
                      ) : (
                        <img 
                          src={p.image.startsWith('http') ? p.image : `local-img://${p.image}`} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />

                      )
                    ) : (
                      <i className="ph ph-package text-4xl"></i>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg uppercase truncate mb-1">{p.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-slate-500 font-mono"><i className="ph ph-barcode"></i> {p.barcode}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                      <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl font-black text-sm">
                        {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Estoque Multiloja Dinâmico */}
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shrink-0 overflow-x-auto no-scrollbar max-w-[200px]">
                    {stores.map(s => (
                      <div key={s.id} className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${storeId === String(s.id) ? 'bg-brand-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                        <span className="text-[7px] font-black uppercase truncate max-w-[35px]">{s.name}</span>
                        <span className={`font-black ${storeId === String(s.id) ? 'text-sm' : 'text-[10px]'}`}>{p.stocks?.[s.id] || 0}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => setViewingProduct(p)}
                      className="w-14 h-14 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-2xl flex items-center justify-center transition-all"
                      title="Ver Detalhes"
                    >
                      <i className="ph ph-eye text-2xl"></i>
                    </button>
                    <button 
                      onClick={() => onSelectProduct(p.barcode)}
                      className="px-8 py-4 bg-brand-500 text-white font-black hover:bg-brand-600 rounded-2xl transition-all shadow-lg shadow-brand-500/20 uppercase text-sm tracking-tighter active:scale-95"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CARD DE VISUALIZAÇÃO DETALHADA */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl flex flex-col md:flex-row relative max-h-[85vh] overflow-hidden">
            <button 
              onClick={() => setViewingProduct(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all z-20 shadow-sm"
            >
              <i className="ph ph-x text-2xl"></i>
            </button>

            <div className="w-full md:w-2/5 bg-slate-50 flex items-center justify-center overflow-hidden border-r border-slate-100 p-8">
              {viewingProduct.image ? (
                viewingProduct.image.startsWith('icon:') ? (
                  <i className={`ph ${viewingProduct.image.replace('icon:', '')} text-[160px] text-brand-500`}></i>
                ) : (
                  <img 
                    src={viewingProduct.image.startsWith('http') ? viewingProduct.image : `local-img://${viewingProduct.image}`} 
                    className="w-full h-full object-contain drop-shadow-2xl" 
                    alt={viewingProduct.name} 
                  />
                )
              ) : (
                <i className="ph ph-package text-[160px] text-slate-200"></i>
              )}
            </div>

            <div className="w-full md:w-3/5 p-12 flex flex-col justify-center overflow-y-auto custom-scrollbar">
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                  Detalhes do Produto
                </span>
                <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter italic leading-tight mb-2">
                  {viewingProduct.name}
                </h2>
                <p className="text-slate-400 font-mono font-bold text-xl flex items-center gap-2">
                  <i className="ph ph-barcode"></i> {viewingProduct.barcode}
                </p>
              </div>

              <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 mb-8">
                <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-6">
                  <div className="text-left">
                    <span className="text-[11px] font-black text-slate-400 uppercase block mb-1">Preço de Venda</span>
                    <span className="text-4xl font-black text-emerald-600">
                      {Number(viewingProduct.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-black text-slate-400 uppercase block mb-1">Disponibilidade Total</span>
                    <span className="text-4xl font-black text-brand-600">
                      {getTotalStock(viewingProduct)}
                    </span>
                  </div>
                </div>

                {/* Grid Dinâmica de Estoques */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {stores.map(s => (
                    <div key={s.id} className={`p-4 rounded-2xl border transition-all flex flex-col items-center ${storeId === String(s.id) ? 'bg-brand-600 border-brand-700 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <span className={`text-[9px] font-black uppercase mb-1 ${storeId === String(s.id) ? 'text-brand-100' : 'text-slate-400'}`}>{s.name}</span>
                      <span className="text-2xl font-black">{viewingProduct.stocks?.[s.id] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { onSelectProduct(viewingProduct.barcode); setViewingProduct(null); }}
                className="w-full py-6 bg-brand-600 text-white font-black text-2xl rounded-[28px] hover:bg-brand-700 shadow-2xl shadow-brand-500/40 transition-all active:scale-95 flex items-center justify-center gap-4"
              >
                <i className="ph ph-plus-circle text-3xl"></i>
                ADICIONAR AO CAIXA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchModal;