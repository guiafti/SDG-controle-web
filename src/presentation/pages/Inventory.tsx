import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { productService } from '../services/productService';
import { storeService } from '../services/storeService';

interface InventoryProps {
  role?: string;
}

const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formExtraBarcodes, setFormExtraBarcodes] = useState<string[]>([]);
  const [formNewExtraBarcode, setFormNewExtraBarcode] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formImage, setFormImage] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [isLibraryUploadOpen, setIsLibraryUploadOpen] = useState(false);
  const [formStocks, setFormStocks] = useState<Record<string, number>>({});
  const [formStockAdditions, setFormStockAdditions] = useState<Record<string, number>>({});
  const [formMinStocks, setFormMinStocks] = useState<Record<string, number>>({});
  const [formSaleTolerances, setFormSaleTolerances] = useState<Record<string, number>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const standardIcons = [
    { id: 'ph-device-mobile', label: 'Celular', color: 'bg-blue-500' },
    { id: 'ph-plug-connected', label: 'Cabo/Carregador', color: 'bg-emerald-500' },
    { id: 'ph-headphones', label: 'Fone', color: 'bg-purple-500' },
    { id: 'ph-watch', label: 'Smartwatch', color: 'bg-orange-500' },
    { id: 'ph-battery-charging', label: 'Bateria', color: 'bg-red-500' },
    { id: 'ph-speaker-hifi', label: 'Caixa de Som', color: 'bg-pink-500' },
    { id: 'ph-mouse', label: 'Mouse', color: 'bg-indigo-500' },
    { id: 'ph-keyboard', label: 'Teclado', color: 'bg-slate-700' },
    { id: 'ph-monitor', label: 'Monitor', color: 'bg-cyan-600' },
    { id: 'ph-camera', label: 'Câmera', color: 'bg-yellow-600' },
    { id: 'ph-hard-drive', label: 'HD/SSD', color: 'bg-zinc-600' },
    { id: 'ph-cpu', label: 'Processador', color: 'bg-teal-600' },
    { id: 'ph-game-controller', label: 'Games', color: 'bg-rose-600' },
    { id: 'ph-usb', label: 'Pendrive', color: 'bg-sky-600' },
    { id: 'ph-shield-check', label: 'Película', color: 'bg-green-600' },
    { id: 'ph-wrench', label: 'Peças/Serviço', color: 'bg-gray-600' }
  ];

  const fetchData = async () => {
    try {
      const [pData, sData, lData] = await Promise.all([
        productService.getAll(true),
        storeService.getAll(),
        productService.getLibraryItems()
      ]);
      setProducts(pData || []);
      setStores(sData || []);
      setLibraryItems(lData || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredProducts = products.filter(p => 
    (showArchived ? p.archived === 1 : p.archived === 0) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm))
  );

  const stats = {
    total: filteredProducts.length,
    critical: filteredProducts.filter(p => {
        return stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
    }).length,
    highValue: filteredProducts.filter(p => p.price > 500).length
  };

  const openModal = (p: any = null) => {
    setEditingProduct(p);
    setFormName(p?.name || '');
    setFormBarcode(p?.barcode || '');
    try {
      setFormExtraBarcodes(p?.extra_barcodes ? JSON.parse(p.extra_barcodes) : []);
    } catch {
      setFormExtraBarcodes([]);
    }
    setFormNewExtraBarcode('');
    setFormPrice(p?.price?.toString() || '');
    
    if (p?.image?.startsWith('icon:')) {
      setSelectedIcon(p.image.replace('icon:', ''));
      setFormImage('');
    } else {
      setSelectedIcon('');
      setFormImage(p?.image || '');
    }
    
    const stocks: Record<string, number> = {};
    const stockAdditions: Record<string, number> = {};
    const minStocks: Record<string, number> = {};
    const saleTolerances: Record<string, number> = {};
    
    stores.forEach(s => {
      stocks[s.id] = p?.stocks?.[s.id] || 0;
      stockAdditions[s.id] = 0;
      minStocks[s.id] = p?.minStocks?.[s.id] ?? 2;
      saleTolerances[s.id] = p?.staleDays?.[s.id] ?? 30;
    });
    
    setFormStocks(stocks);
    setFormStockAdditions(stockAdditions);
    setFormMinStocks(minStocks);
    setFormSaleTolerances(saleTolerances);
    setIsModalOpen(true);
  };

  const handleAddExtraBarcode = () => {
    const code = formNewExtraBarcode.trim();
    if (code && !formExtraBarcodes.includes(code) && code !== formBarcode) {
      setFormExtraBarcodes([...formExtraBarcodes, code]);
      setFormNewExtraBarcode('');
    }
  };

  const handleRemoveExtraBarcode = (code: string) => {
    setFormExtraBarcodes(formExtraBarcodes.filter(c => c !== code));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Processando imagem...');
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const base64Data = event.target.result;
      const res = await productService.uploadImage({
        barcode: formBarcode || 'new_prod',
        base64Data
      });
      if (res.success) {
        setFormImage(res.fileName);
        toast.success('Imagem preparada!', { id: toastId });
      } else {
        toast.error('Erro na imagem: ' + res.error, { id: toastId });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLibraryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const name = prompt('Nome para esta imagem na biblioteca global:');
    if (!name) return;

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const base64Data = event.target.result;
      const uploadResult = await productService.uploadLibraryImage({ name, base64Data });
      if (uploadResult.success) {
        await productService.saveLibraryItem({
          name: name.toUpperCase(),
          image_url: uploadResult.fileName,
          category: 'GERAL'
        });
        toast.success('IMAGEM ADICIONADA À BIBLIOTECA!');
        fetchData();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleArchive = async () => {
    if (!editingProduct) return;
    const result = await productService.archive(editingProduct.id, !showArchived);
    if (result.success) {
      toast.success(showArchived ? 'Produto restaurado!' : 'Produto arquivado!');
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formBarcode || !formPrice) {
      toast.error('PREENCHA OS CAMPOS OBRIGATÓRIOS!');
      return;
    }

    const loadingId = toast.loading('Processando registro...');
    try {
      let finalImageName = editingProduct?.image || null;
      
      if (formImage?.startsWith('data:image')) {
        const uploadResult = await productService.uploadImage({ barcode: formBarcode, base64Data: formImage });
        if (uploadResult.success) finalImageName = uploadResult.fileName;
      } else if (selectedIcon) {
        finalImageName = `icon:${selectedIcon}`;
      } else if (!formImage) {
        finalImageName = null;
      }

      const result = await productService.saveManual({ 
        id: editingProduct?.id || null, 
        name: formName, 
        barcode: formBarcode, 
        extra_barcodes: formExtraBarcodes,
        price: formPrice, 
        image: finalImageName 
      });
      
      if (result.success) {
        const productId = result.id;
        if (role === 'admin' && productId) {
          for (const s of stores) {
            const finalQuantity = Number(formStocks[s.id] || 0) + Number(formStockAdditions[s.id] || 0);
            await productService.updateQuantity({
              productId, 
              storeId: s.id,
              quantity: finalQuantity,
              minStock: Number(formMinStocks[s.id] ?? 2),
              saleToleranceDays: Number(formSaleTolerances[s.id] ?? 30)
            });
          }
        }
        toast.success(editingProduct ? 'PRODUTO ATUALIZADO!' : 'PRODUTO CADASTRADO!', { id: loadingId });
        setIsModalOpen(false);
        fetchData();
      }
    } catch (error) { toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId }); }
  };

  const [selectedStore, setSelectedStore] = useState('1');

  const handleImportClick = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event: any) => {
      const xmlData = event.target.result;
      try {
        const result = await productService.importXml(xmlData, selectedStore);
        toast.success(`SUCESSO!\nNovos: ${result.newProducts}\nEstoques: ${result.stockUpdates}`);
        fetchData();
      } catch (error) {
        toast.error('ERRO: Verifique o formato do XML.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 lg:p-8 space-y-4 lg:space-y-6 flex-1 overflow-y-auto custom-scrollbar pb-24 lg:pb-8">
        
        {/* Compact Header Responsivo */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Estoque</h1>
              <p className="text-slate-400 font-bold text-[9px] lg:text-xs uppercase tracking-widest">Gestão de Inventário Centralizada</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
                onClick={() => setShowArchived(!showArchived)}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${showArchived ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white text-slate-400 border-slate-200 shadow-sm'}`}
            >
                {showArchived ? 'Ver Ativos' : 'Arquivados'}
            </button>
            <button 
                onClick={() => openModal()}
                className="flex-1 sm:flex-none bg-brand-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase flex items-center justify-center gap-2 hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all"
            >
                <i className="ph ph-plus-circle text-lg"></i> Novo Item
            </button>
          </div>
        </div>

        {/* Stats Cards Responsivos */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="flex-none bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><i className="ph ph-barcode text-xl"></i></div>
                <div>
                    <div className="text-lg font-black text-slate-800 leading-none">{stats.total}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Total SKUs</div>
                </div>
            </div>
            <div className={`flex-none bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 transition-all ${stats.critical > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${stats.critical > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                    <i className="ph ph-warning-octagon"></i>
                </div>
                <div>
                    <div className={`text-lg font-black leading-none ${stats.critical > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.critical}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Nível Crítico</div>
                </div>
            </div>
            <div className="flex-none bg-slate-900 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-brand-400"><i className="ph ph-sparkle text-xl"></i></div>
                <div>
                    <div className="text-sm font-black text-white italic">Cloud</div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Sincronizado</div>
                </div>
            </div>
        </div>

        {/* Busca Responsiva */}
        <div className="relative group">
          <i className="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xl group-focus-within:text-brand-500 transition-colors"></i>
          <input 
            type="text" 
            placeholder="LOCALIZAR POR NOME OU CÓDIGO..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 ring-brand-500/5 focus:border-brand-200 transition-all text-sm font-black text-slate-700 shadow-xl shadow-slate-200/20 uppercase italic"
          />
        </div>

        {/* Lista de Produtos Responsiva */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center bg-white rounded-2xl border border-slate-100 opacity-40">
              <i className="ph ph-package text-6xl mb-2"></i>
              <p className="text-sm font-bold uppercase">Nenhum produto localizado</p>
            </div>
          ) : (
            filteredProducts.map(p => {
              const isExpanded = expandedId === p.id;
              const isLow = stores.some(s => (p.stocks?.[s.id] || 0) <= (p.minStocks?.[s.id] ?? 2));
              
              return (
                <div 
                  key={p.id} 
                  className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-brand-500/10 border-brand-200 shadow-lg' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
                >
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="p-3 cursor-pointer flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex-none flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
                      {p.image ? (
                        p.image.startsWith('icon:') ? (
                          <i className={`ph ${p.image.replace('icon:', '')} text-2xl text-brand-500`}></i>
                        ) : (
                          <img 
                            src={p.image.startsWith('http') ? p.image : `local-img://${p.image}`} 
                            className="w-full h-full object-cover" 
                            alt="" 
                          />
                        )
                      ) : (
                        <i className="ph ph-package text-xl"></i>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">#{p.barcode}</span>
                        <h3 className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">{p.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1 font-bold text-emerald-600">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-slate-300">•</span>
                        <div className="flex gap-1.5">
                          {stores.slice(0, 3).map(s => {
                            const qty = p.stocks?.[s.id] || 0;
                            const low = qty <= (p.minStocks?.[s.id] ?? 2);
                            return (
                              <span key={s.id} className={`text-[8px] font-black uppercase ${low ? 'text-red-500' : 'text-slate-400'}`}>
                                {s.name.substring(0, 3)}: {qty}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {isLow && (
                      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-500 rounded-lg border border-red-100 animate-pulse">
                        <i className="ph ph-warning-octagon text-sm"></i>
                        <span className="text-[9px] font-black uppercase">Reposição</span>
                      </div>
                    )}

                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <i className="ph ph-caret-down text-lg"></i>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-8 space-y-3">
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <i className="ph ph-buildings"></i> Estoque por Unidade
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {stores.map(s => {
                                const qty = p.stocks?.[s.id] || 0;
                                const min = p.minStocks?.[s.id] ?? 2;
                                const low = qty <= min;
                                return (
                                  <div key={s.id} className={`p-2 rounded-lg border flex flex-col items-center justify-center ${low ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/30 border-slate-100'}`}>
                                    <span className="text-[8px] font-black text-slate-400 uppercase mb-1">{s.name}</span>
                                    <div className="flex items-baseline gap-1">
                                      <span className={`text-sm font-bold ${low ? 'text-red-600' : 'text-slate-700'}`}>{qty}</span>
                                      <span className="text-[8px] text-slate-300 font-bold">/ min {min}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* New Barcodes Section in Expanded View */}
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <i className="ph ph-barcode"></i> Identificadores Registrados
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-2 py-1 rounded-lg border border-brand-100">
                                <i className="ph ph-star-fill text-[8px]"></i>
                                <span className="text-[10px] font-mono font-black">{p.barcode}</span>
                                <span className="text-[7px] font-black uppercase opacity-60">Principal</span>
                              </div>
                              {(() => {
                                try {
                                  const extras = p.extra_barcodes ? JSON.parse(p.extra_barcodes) : [];
                                  return extras.map((code: string) => (
                                    <div key={code} className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100">
                                      <span className="text-[10px] font-mono font-black">{code}</span>
                                    </div>
                                  ));
                                } catch { return null; }
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-4 flex flex-col gap-2">
                          <button 
                            onClick={() => openModal(p)}
                            className="flex-1 bg-brand-500 text-white p-3 rounded-xl shadow-md hover:bg-brand-600 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all"
                          >
                            <i className="ph ph-pencil-simple-line text-lg"></i> Ajustar Produto
                          </button>
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 bg-white border border-slate-200 text-slate-600 p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                            >
                              <i className="ph ph-barcode text-base"></i> Etiqueta
                            </button>
                            <button 
                              onClick={() => { setEditingProduct(p); handleArchive(); }}
                              className="flex-1 bg-orange-50 text-orange-600 border border-orange-100 p-2.5 rounded-xl hover:bg-orange-100 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase transition-all"
                            >
                              <i className="ph ph-archive text-base"></i> {showArchived ? 'Ativar' : 'Arquivar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Product Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <i className="ph ph-package text-xl"></i>
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">{editingProduct ? 'Ajuste de Estoque' : 'Novo Produto'}</h2>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão Multiloja e Parâmetros</p>
                  </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagem ou Ícone Padrão</label>
                            <div className="relative group">
                                <div className={`aspect-square rounded-2xl bg-slate-50 border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-300 relative ${selectedIcon ? 'border-brand-500 bg-brand-50/30' : 'border-slate-200'}`}>
                                    {formImage ? (
                                        <img src={formImage.startsWith('data') ? formImage : `local-img://${formImage}`} className="w-full h-full object-cover" />
                                    ) : selectedIcon ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <i className={`ph ${selectedIcon} text-6xl text-brand-500`}></i>
                                            <span className="text-[10px] font-bold text-brand-600 uppercase">Ícone Selecionado</span>
                                        </div>
                                    ) : (
                                        <i className="ph ph-image-plus text-4xl text-slate-200"></i>
                                    )}
                                    <input 
                                        type="file" accept="image/*" 
                                        onChange={(e) => { handleImageChange(e); setSelectedIcon(''); }} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    />
                                    {(formImage || selectedIcon) && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setFormImage(''); setSelectedIcon(''); }}
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-10"
                                        >
                                            <i className="ph ph-trash"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Biblioteca de Ícones Premium */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <i className="ph ph-sparkle text-brand-500 text-lg"></i> Galeria Premium
                                    </h4>
                                    <div className="relative">
                                        <button 
                                            type="button"
                                            className="w-7 h-7 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center hover:bg-brand-500 hover:text-white transition-all shadow-sm"
                                            title="Adicionar imagem à biblioteca global"
                                        >
                                            <i className="ph ph-plus-circle text-lg"></i>
                                        </button>
                                        <input 
                                            type="file" accept="image/*" 
                                            onChange={handleLibraryUpload} 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                    {/* Ícones do Sistema com Gradientes */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {standardIcons.map(icon => (
                                            <button
                                                key={icon.id}
                                                type="button"
                                                onClick={() => { setSelectedIcon(icon.id); setFormImage(''); }}
                                                className={`group relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden ${selectedIcon === icon.id ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-100 hover:border-brand-300'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${selectedIcon === icon.id ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white' : `${icon.color} bg-opacity-10 text-slate-600`}`}>
                                                    <i className={`ph ${icon.id} text-2xl`}></i>
                                                </div>
                                                <span className={`text-[7px] font-black uppercase tracking-tighter ${selectedIcon === icon.id ? 'text-brand-600' : 'text-slate-400'}`}>{icon.label}</span>
                                                {selectedIcon === icon.id && (
                                                    <div className="absolute top-1 right-1">
                                                        <i className="ph ph-check-circle-fill text-brand-500 text-xs"></i>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Itens Enviados pelo Usuário (Biblioteca Global) */}
                                    {libraryItems.length > 0 && (
                                        <div className="pt-3 border-t border-slate-100">
                                            <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Sua Biblioteca</h5>
                                            <div className="grid grid-cols-4 gap-2">
                                                {libraryItems.map(item => {
                                                    const isSelected = formImage === item.image_url || formImage === `local-img://${item.image_url}`;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => { setFormImage(item.image_url); setSelectedIcon(''); }}
                                                            className={`group relative aspect-square rounded-2xl border-2 transition-all overflow-hidden ${isSelected ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-slate-100 hover:border-brand-300'}`}
                                                        >
                                                            <img 
                                                                src={item.image_url.startsWith('http') ? item.image_url : `local-img://${item.image_url}`} 
                                                                className="w-full h-full object-cover" 
                                                                alt={item.name} 
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-[6px] text-white font-black uppercase text-center px-1">{item.name}</span>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="absolute top-1 right-1 bg-white rounded-full">
                                                                    <i className="ph ph-check-circle-fill text-brand-500 text-sm"></i>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <i className="ph ph-barcode text-lg"></i> Gerenciar Códigos
                                </h4>
                                
                                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-brand-500 uppercase tracking-tighter">Código Principal (EAN)</span>
                                            <input 
                                                value={formBarcode} onChange={e => setFormBarcode(e.target.value)}
                                                className="bg-transparent font-mono font-black text-xs outline-none w-full text-slate-700"
                                            />
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center">
                                            <i className="ph ph-star-fill"></i>
                                        </div>
                                    </div>

                                    {formExtraBarcodes.map(code => (
                                        <div key={code} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Código Adicional</span>
                                                <span className="font-mono font-black text-xs text-slate-600">{code}</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveExtraBarcode(code)}
                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                                            >
                                                <i className="ph ph-trash"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-inner">
                                    <input 
                                        value={formNewExtraBarcode} 
                                        onChange={e => setFormNewExtraBarcode(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddExtraBarcode())}
                                        placeholder="Novo código..."
                                        className="flex-1 bg-transparent px-2 outline-none font-mono font-black text-[10px] text-slate-600"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleAddExtraBarcode} 
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-black font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-0.5 px-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Preço Base (R$)</label>
                                <input 
                                    type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)}
                                    className="w-full p-3 bg-brand-50 border border-brand-100 rounded-xl outline-none focus:border-brand-500 font-black text-brand-600 text-xl shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-4">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                            <input 
                                value={formName} onChange={e => setFormName(e.target.value)}
                                placeholder="EX: CAPA PREMIUM SILICONE..."
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 font-bold text-slate-700 uppercase text-sm"
                            />
                        </div>

                        {role === 'admin' && (
                            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-3 space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <i className="ph ph-buildings"></i> Estoques por Loja
                                </h4>
                                <div className="space-y-2">
                                    {stores.map(s => (
                                        <div key={s.id} className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-xl border border-slate-100">
                                            <div className="text-[9px] font-bold text-slate-500 truncate">{s.name}</div>
                                            <div className="flex items-center gap-1.5" title="Definir Estoque Físico Absoluto">
                                                <span className="text-[8px] font-bold text-slate-300">EXATO:</span>
                                                <input 
                                                    type="number" value={formStocks[s.id] || 0}
                                                    onChange={e => setFormStocks({...formStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded p-1 text-center font-bold text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Adicionar Entrada de Nota/Mercadoria">
                                                <span className="text-[8px] font-bold text-emerald-400">+ ADD:</span>
                                                <input 
                                                    type="number" value={formStockAdditions[s.id] || ''}
                                                    placeholder="0"
                                                    onChange={e => setFormStockAdditions({...formStockAdditions, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-emerald-50 border border-emerald-100 rounded p-1 text-center font-bold text-xs text-emerald-700"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] font-bold text-orange-300">MÍN:</span>
                                                <input 
                                                    type="number" value={formMinStocks[s.id] ?? 2}
                                                    onChange={e => setFormMinStocks({...formMinStocks, [s.id]: parseInt(e.target.value) || 0})}
                                                    className="w-full bg-orange-50/50 border border-orange-100 rounded p-1 text-center font-bold text-xs text-orange-600"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                {role === 'admin' && editingProduct && (
                    <button type="button" onClick={handleArchive} className={`px-4 py-2 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all ${showArchived ? 'bg-emerald-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                        {showArchived ? 'Reativar' : 'Arquivar'}
                    </button>
                )}
                <div className="flex-1 flex gap-2">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider hover:bg-white transition-all">Cancelar</button>
                    <button onClick={handleSave} className="flex-[2] bg-brand-500 text-white py-2 rounded-lg font-bold uppercase text-[9px] tracking-wider shadow-md hover:bg-brand-600 transition-all">Salvar Alterações</button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;