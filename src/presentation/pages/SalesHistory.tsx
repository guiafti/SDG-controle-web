import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { saleService } from '../services/saleService';
import { storeService } from '../services/storeService';
import { userService } from '../services/userService';
import { productService } from '../services/productService';

interface SalesHistoryProps {
  userRole?: string;
  currentUser?: any;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ userRole, currentUser }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'products'>('dashboard');

  // Filtros
  const [filterStartDate, setFilterStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStoreId, setFilterStoreId] = useState('all');
  const [filterVendedor, setFilterVendedor] = useState('all');
  const [searchTerm, setSearchTerm] = useState(''); // Busca na venda
  const [productSearchTerm, setProductSearchTerm] = useState(''); // Busca no historico de produtos

  // Modais e edição
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editVendedor, setEditVendedor] = useState('');
  const [editStoreId, setEditStoreId] = useState('');
  const [editDiscount, setEditDiscount] = useState(0);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editCreatedAt, setEditCreatedAt] = useState('');

  // Pesquisa de produto para adicionar na venda editada
  const [prodSearchInEdit, setProdSearchInEdit] = useState('');
  const [showProdSuggestions, setShowProdSuggestions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesData, storesData, usersData, prodsData] = await Promise.all([
        saleService.getAll(),
        storeService.getAll(),
        userService.getAll(),
        productService.getAll()
      ]);
      setSales(salesData || []);
      setStores(storesData || []);
      setUsers(usersData || []);
      setProducts(prodsData || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar dados de vendas');
    } finally {
      setLoading(false);
    }
  };

  const getStoreName = (id: string) => {
    const s = stores.find(store => String(store.id) === String(id));
    return s ? s.name : 'Loja Desconhecida';
  };

  // Filtragem de vendas
  const filteredSales = sales.filter(sale => {
    const saleDate = sale.created_at ? sale.created_at.split('T')[0] : '';
    const matchStart = filterStartDate ? saleDate >= filterStartDate : true;
    const matchEnd = filterEndDate ? saleDate <= filterEndDate : true;
    const matchStore = filterStoreId === 'all' ? true : String(sale.store_id) === String(filterStoreId);
    const seller = sale.vendedor || sale.seller_name || '';
    const matchVendedor = filterVendedor === 'all' ? true : seller === filterVendedor;

    // Busca por ID da venda, vendedor ou itens
    let matchText = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      let itemsList: any[] = [];
      try {
        itemsList = typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : (sale.items || []);
      } catch (e) { itemsList = []; }
      const matchItems = itemsList.some((item: any) => (item.nome || item.name || '').toLowerCase().includes(term));
      const matchId = (sale.id || '').toLowerCase().includes(term);
      const matchVend = seller.toLowerCase().includes(term);
      matchText = matchId || matchVend || matchItems;
    }

    return matchStart && matchEnd && matchStore && matchVendedor && matchText;
  });

  // Flat list de produtos vendidos
  const soldProductsList = filteredSales.flatMap(sale => {
    let items: any[] = [];
    try {
      items = typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : (sale.items || []);
    } catch (e) {
      items = [];
    }
    return items.map((item: any) => ({
      ...item,
      nome: item.nome || item.name || 'Produto',
      preco: Number(item.preco || item.unit_price || 0),
      qtd: Number(item.qtd || item.quantity || 1),
      saleId: sale.id,
      vendedor: sale.vendedor || sale.seller_name || 'PDV',
      store_id: sale.store_id,
      created_at: sale.created_at,
      payment_method: sale.payment_method,
      edited: sale.edited
    }));
  }).filter(soldProd => {
    if (!productSearchTerm) return true;
    const term = productSearchTerm.toLowerCase();
    return soldProd.nome.toLowerCase().includes(term) || (soldProd.barcode && soldProd.barcode.includes(term));
  });

  // Cálculos de Real-Time Stats
  const totalSalesValue = filteredSales.reduce((sum, s) => sum + Number(s.total_amount ?? s.total ?? 0), 0);
  const totalSalesCount = filteredSales.length;
  const totalDiscounts = filteredSales.reduce((sum, s) => sum + (s.discount || 0), 0);

  // Agrupamento de Pagamentos
  const paymentMethodsStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    const m = s.payment_method || 'OUTRO';
    acc[m] = (acc[m] || 0) + Number(s.total_amount ?? s.total ?? 0);
    return acc;
  }, {});

  // Agrupamento por Vendedor
  const sellerStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    const seller = s.vendedor || s.seller_name || 'Desconhecido';
    acc[seller] = (acc[seller] || 0) + Number(s.total_amount ?? s.total ?? 0);
    return acc;
  }, {});

  // Agrupamento por Loja
  const storeStats = filteredSales.reduce((acc: Record<string, number>, s) => {
    const storeName = getStoreName(s.store_id);
    acc[storeName] = (acc[storeName] || 0) + Number(s.total_amount ?? s.total ?? 0);
    return acc;
  }, {});

  // Cancelamento de Venda
  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('ATENÇÃO: Tem certeza que deseja cancelar esta venda? O estoque dos produtos associados será estornado e o registro financeiro será excluído.')) return;
    const loadingId = toast.loading('Cancelando venda...');
    try {
      const result = await saleService.delete(id);
      if (result.success) {
        toast.success('Venda cancelada e estoque estornado com sucesso!', { id: loadingId });
        fetchData();
      } else {
        toast.error('Erro ao cancelar venda: ' + result.error, { id: loadingId });
      }
    } catch (e) {
      toast.error('Erro de conexão ao cancelar venda', { id: loadingId });
    }
  };

  const toLocalDatetimeString = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
  };

  // Abertura do Modal de Edição
  const handleOpenEditModal = (sale: any) => {
    setEditingSale(sale);
    setEditPaymentMethod(sale.payment_method);
    setEditVendedor(sale.vendedor || sale.seller_name || '');
    setEditStoreId(sale.store_id || '');
    setEditDiscount(sale.discount || 0);
    setEditCreatedAt(toLocalDatetimeString(sale.created_at));
    try {
      setEditItems(typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : (sale.items || []));
    } catch (e) {
      setEditItems([]);
    }
    setProdSearchInEdit('');
    setIsEditModalOpen(true);
  };

  // Funções de manipulação do carrinho de edição
  const handleUpdateItemQty = (productId: string, newQty: number) => {
    if (newQty < 1) {
      setEditItems(prev => prev.filter(item => item.id !== productId));
      return;
    }
    setEditItems(prev => prev.map(item => item.id === productId ? { ...item, qtd: newQty } : item));
  };

  const handleRemoveItem = (productId: string) => {
    setEditItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleAddItemToEdit = (prod: any) => {
    setEditItems(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item => item.id === prod.id ? { ...item, qtd: item.qtd + 1 } : item);
      } else {
        return [...prev, {
          id: prod.id,
          nome: prod.name,
          qtd: 1,
          preco: prod.price,
          cost_price: prod.cost_price || 0,
          imagem: prod.image
        }];
      }
    });
    setProdSearchInEdit('');
    setShowProdSuggestions(false);
    toast.success(`${prod.name} adicionado à venda.`);
  };

  const calculateEditTotal = () => {
    const subtotal = editItems.reduce((sum, item) => sum + ((item.preco || item.unit_price || 0) * (item.qtd || item.quantity || 1)), 0);
    return Math.max(0, subtotal - editDiscount);
  };

  const handleSaveEdit = async () => {
    if (!editVendedor) {
      toast.error('Selecione o vendedor');
      return;
    }
    if (editItems.length === 0) {
      toast.error('A venda deve conter pelo menos 1 produto');
      return;
    }

    const updatedSale = {
      id: editingSale.id,
      store_id: editStoreId,
      vendedor: editVendedor,
      seller_name: editVendedor,
      payment_method: editPaymentMethod,
      discount: Number(editDiscount),
      total: calculateEditTotal(),
      total_amount: calculateEditTotal(),
      customer_id: editingSale.customer_id,
      items: editItems,
      created_at: editCreatedAt ? new Date(editCreatedAt).toISOString() : editingSale.created_at
    };

    const loadingId = toast.loading('Salvando alterações da venda...');
    try {
      const result = await saleService.update(updatedSale);
      if (result.success) {
        toast.success('Venda editada com sucesso!', { id: loadingId });
        setIsEditModalOpen(false);
        setEditingSale(null);
        fetchData();
      } else {
        toast.error('Erro ao editar venda: ' + result.error, { id: loadingId });
      }
    } catch (e) {
      toast.error('Erro de conexão ao editar venda', { id: loadingId });
    }
  };

  // Sugestões de produtos filtrados
  const filteredProductsSuggestions = products.filter(p => {
    if (!prodSearchInEdit) return false;
    const term = prodSearchInEdit.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term));
  }).slice(0, 5);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <main className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendas & Histórico</h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Gerenciamento em Tempo Real e Edição de Vendas</p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Histórico de Vendas
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'products' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
            >
              Produtos Vendidos
            </button>
          </div>
        </div>

        {/* Filtros Gerais */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Loja</label>
            <select
              value={filterStoreId}
              onChange={e => setFilterStoreId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="all">TODAS AS LOJAS</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendedor</label>
            <select
              value={filterVendedor}
              onChange={e => setFilterVendedor(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
            >
              <option value="all">TODOS OS VENDEDORES</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tab 1: Dashboard / Visão Geral */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <i className="ph ph-currency-brl text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {totalSalesValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Vendas</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <i className="ph ph-receipt text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {totalSalesCount}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantidade de Vendas</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                  <i className="ph ph-tag text-2xl"></i>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {totalDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descontos Concedidos</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Meios de Pagamento</h3>
                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  {Object.entries(paymentMethodsStats).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-8 uppercase">Sem vendas registradas</p>
                  ) : (
                    Object.entries(paymentMethodsStats)
                      .sort((a, b) => b[1] - a[1])
                      .map(([method, total]) => {
                        const pct = totalSalesValue > 0 ? (total / totalSalesValue) * 100 : 0;
                        return (
                          <div key={method} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                              <span className="text-slate-500">{method}</span>
                              <span className="text-slate-800">
                                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Vendas por Vendedor</h3>
                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  {Object.entries(sellerStats).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-8 uppercase">Sem vendas registradas</p>
                  ) : (
                    Object.entries(sellerStats)
                      .sort((a, b) => b[1] - a[1])
                      .map(([seller, total]) => {
                        const pct = totalSalesValue > 0 ? (total / totalSalesValue) * 100 : 0;
                        return (
                          <div key={seller} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                              <span className="text-slate-500">{seller}</span>
                              <span className="text-slate-800">
                                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Vendas por Loja</h3>
                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  {Object.entries(storeStats).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-medium py-8 uppercase">Sem vendas registradas</p>
                  ) : (
                    Object.entries(storeStats)
                      .sort((a, b) => b[1] - a[1])
                      .map(([storeName, total]) => {
                        const pct = totalSalesValue > 0 ? (total / totalSalesValue) * 100 : 0;
                        return (
                          <div key={storeName} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold uppercase">
                              <span className="text-slate-500">{storeName}</span>
                              <span className="text-slate-800">
                                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Histórico de Vendas */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <i className="ph ph-magnifying-glass text-slate-400 text-xl"></i>
              <input
                type="text"
                placeholder="Buscar venda por código, vendedor ou nome de produto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-650">
                  <i className="ph ph-x-circle text-lg"></i>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código da Venda</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data / Hora</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loja</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Vendidos</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma Pgto</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center text-slate-350 font-bold uppercase text-xs">
                          Nenhuma venda encontrada para os filtros selecionados
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => {
                        let saleItems: any[] = [];
                        try {
                          saleItems = typeof sale.items === 'string' ? JSON.parse(sale.items || '[]') : (sale.items || []);
                        } catch (e) {
                          saleItems = [];
                        }
                        const saleTotal = Number(sale.total_amount ?? sale.total ?? 0);

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span>#{sale.id.substring(0, 8).toUpperCase()}</span>
                                {sale.edited === 1 && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-250 rounded text-[8px] font-black uppercase tracking-wider shrink-0 flex items-center gap-0.5" title="Esta venda foi editada">
                                    <i className="ph ph-pencil-simple font-black"></i> Editada
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                              {sale.created_at ? new Date(sale.created_at).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                              {getStoreName(sale.store_id)}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                              {sale.vendedor || sale.seller_name || 'PDV'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 max-w-xs">
                                {saleItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-[10px] font-bold bg-slate-100/80 px-2 py-0.5 rounded text-slate-600">
                                    <span className="truncate max-w-[150px]">{item.nome || item.name}</span>
                                    <span>{item.qtd || item.quantity || 1}x</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                                {sale.payment_method}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-xs text-slate-800">
                              {saleTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              {sale.discount > 0 && (
                                <div className="text-[9px] text-rose-500 font-bold block">
                                  Desc: R$ {Number(sale.discount || 0).toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-1.5 justify-end items-center">
                                <button
                                  onClick={() => handleOpenEditModal(sale)}
                                  className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 p-1.5 rounded-lg transition-colors"
                                  title="Editar Venda"
                                >
                                  <i className="ph ph-pencil-simple text-sm"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                                  title="Cancelar Venda e Estornar Estoque"
                                >
                                  <i className="ph ph-trash-simple text-sm"></i> Estornar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Produtos Vendidos */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
              <i className="ph ph-magnifying-glass text-slate-400 text-xl"></i>
              <input
                type="text"
                placeholder="Buscar histórico por nome ou código de barras do produto vendido..."
                value={productSearchTerm}
                onChange={e => setProductSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
              {productSearchTerm && (
                <button onClick={() => setProductSearchTerm('')} className="text-slate-400 hover:text-slate-650">
                  <i className="ph ph-x-circle text-lg"></i>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data / Hora</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produto</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qtd</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço Unitário</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Subtotal</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loja</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Forma Pgto</th>
                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Venda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {soldProductsList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center text-slate-350 font-bold uppercase text-xs">
                          Nenhum produto vendido encontrado para os filtros selecionados
                        </td>
                      </tr>
                    ) : (
                      soldProductsList.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">
                            {p.created_at ? new Date(p.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-xs font-black text-slate-800 uppercase">{p.nome}</div>
                              {p.barcode && <div className="text-[9px] text-slate-400 font-mono">{p.barcode}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">
                            {p.qtd}x
                          </td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-slate-700">
                            {p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-xs text-slate-800">
                            {(p.preco * p.qtd).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                            {getStoreName(p.store_id)}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase">
                            {p.vendedor}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-650 rounded text-[8px] font-black uppercase tracking-wider">
                              {p.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-mono text-slate-400 uppercase">
                            <div className="flex items-center gap-1">
                              <span>#{p.saleId.substring(0, 8)}</span>
                              {p.edited === 1 && (
                                <span className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[7px] font-black uppercase tracking-tighter" title="Esta venda foi editada">
                                  Editado
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Edição de Venda */}
      {isEditModalOpen && editingSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                  Editar Venda #{editingSale.id.substring(0, 8).toUpperCase()}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Ajuste os produtos, descontos e detalhes da venda</p>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingSale(null); }}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendedor</label>
                  <select
                    value={editVendedor}
                    onChange={e => setEditVendedor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                  >
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento</label>
                  <select
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                  >
                    <option value="DINHEIRO">DINHEIRO</option>
                    <option value="PIX">PIX</option>
                    <option value="CREDITO">CARTÃO DE CRÉDITO</option>
                    <option value="DEBITO">CARTÃO DE DÉBITO</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Loja de Origem</label>
                  <select
                    value={editStoreId}
                    onChange={e => setEditStoreId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                  >
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data/Hora da Venda</label>
                  <input
                    type="datetime-local"
                    value={editCreatedAt}
                    onChange={e => setEditCreatedAt(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionar Produto</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <i className="ph ph-plus-circle text-slate-400 text-lg"></i>
                  <input
                    type="text"
                    placeholder="Digite o nome ou código do produto para adicionar à venda..."
                    value={prodSearchInEdit}
                    onChange={e => {
                      setProdSearchInEdit(e.target.value);
                      setShowProdSuggestions(true);
                    }}
                    onFocus={() => setShowProdSuggestions(true)}
                    className="flex-1 bg-transparent border-none text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  {prodSearchInEdit && (
                    <button onClick={() => setProdSearchInEdit('')} className="text-slate-400">
                      <i className="ph ph-x text-sm"></i>
                    </button>
                  )}
                </div>

                {showProdSuggestions && prodSearchInEdit && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredProductsSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-450 font-bold text-center uppercase">Produto não encontrado</div>
                    ) : (
                      filteredProductsSuggestions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddItemToEdit(p)}
                          className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 uppercase">{p.name}</span>
                            {p.barcode && <span className="text-[10px] text-slate-400 font-mono ml-2">({p.barcode})</span>}
                          </div>
                          <span className="font-bold text-emerald-600 font-mono">
                            R$ {Number(p.price || 0).toFixed(2)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produtos da Venda</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 bg-slate-50/30">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-800 uppercase block truncate">{item.nome || item.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono block mt-0.5">
                          Unitário: {(Number(item.preco || item.unit_price || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(item.id, (item.qtd || item.quantity || 1) - 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 flex items-center justify-center font-bold transition-colors"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-8 text-center">{item.qtd || item.quantity || 1}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(item.id, (item.qtd || item.quantity || 1) + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-650 flex items-center justify-center font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {((Number(item.preco || item.unit_price || 0)) * (item.qtd || item.quantity || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <i className="ph ph-trash text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-100 pt-6">
                <div className="space-y-1 w-full sm:w-1/3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Desconto (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscount}
                    onChange={e => setEditDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-slate-450 uppercase block">Total Final Recalculado</span>
                  <span className="text-2xl font-black text-slate-900 font-mono italic">
                    {calculateEditTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditingSale(null); }}
                className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
