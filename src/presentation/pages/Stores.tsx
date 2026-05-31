import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { storeService } from '../services/storeService';

const Stores: React.FC = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingProduct] = useState<any>(null);
  const [formName, setFormName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const fetchStores = async () => {
    try {
      const data = await storeService.getAll(true); // includeArchived = true
      setStores(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchStores(); }, []);

  const filteredStores = stores.filter(s => showArchived ? s.archived === 1 : s.archived === 0);

  const openModal = (s: any = null) => {
    setEditingProduct(s);
    setFormName(s?.name || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('O NOME DA LOJA É OBRIGATÓRIO!');
      return;
    }

    const loadingId = toast.loading('Salvando loja...');
    try {
      const result = await storeService.save({
        id: editingStore?.id,
        name: formName
      });

      if (result.success) {
        toast.success('LOJA SALVA COM SUCESSO!', { id: loadingId });
        setIsModalOpen(false);
        fetchStores();
      } else {
        toast.error(result.error || 'ERRO AO SALVAR', { id: loadingId });
      }
    } catch (e) {
      toast.error('ERRO DE COMUNICAÇÃO', { id: loadingId });
    }
  };

  const handleArchive = async (store: any) => {
    const action = store.archived ? 'restaurar' : 'arquivar';
    
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="text-sm font-bold text-slate-800 uppercase">Deseja realmente {action} a loja "{store.name}"?</p>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const result = await storeService.archive(store.id, !store.archived);
                if (result.success) {
                  toast.success(`Loja ${store.archived ? 'restaurada' : 'arquivada'}!`);
                  fetchStores();
                }
              } catch (e) {
                toast.error('ERRO AO PROCESSAR');
              }
            }}
            className="flex-1 bg-brand-500 text-white py-2 rounded-lg font-bold text-xs uppercase"
          >
            Confirmar
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold text-xs uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-center' });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Gerenciar Unidades</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Controle de Lojas e Filiais</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${showArchived ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
          >
            {showArchived ? 'Ver Ativas' : 'Ver Arquivadas'}
          </button>
          <button 
            onClick={() => openModal()}
            className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all active:scale-95"
          >
            Nova Loja
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStores.map(store => (
          <div key={store.id} className="bg-white border border-slate-200 p-6 rounded-[32px] flex items-center justify-between group hover:border-brand-500 transition-all shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${store.archived ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
                <i className="ph ph-storefront"></i>
              </div>
              <div>
                <h3 className={`font-black uppercase text-sm ${store.archived ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{store.name}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {store.id.slice(0, 8)}...</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => openModal(store)}
                className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-brand-500 hover:text-white transition-all flex items-center justify-center"
                title="Editar Nome"
              >
                <i className="ph ph-pencil-simple font-bold"></i>
              </button>
              <button 
                onClick={() => handleArchive(store)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${store.archived ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'}`}
                title={store.archived ? 'Restaurar' : 'Arquivar'}
              >
                <i className={`ph ${store.archived ? 'ph-arrow-u-up-left' : 'ph-archive'} font-bold`}></i>
              </button>
            </div>
          </div>
        ))}

        {filteredStores.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest">
            Nenhuma loja encontrada nesta categoria.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-brand-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                {editingStore ? 'Editar Unidade' : 'Nova Loja'}
              </h3>
              <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">Defina o nome da sua filial</p>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome da Loja</label>
                <input 
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="EX: LOJA CENTRO"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-500 font-black text-slate-700 transition-all uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] py-5 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 transition-all active:scale-95"
                >
                  {editingStore ? 'ATUALIZAR NOME' : 'CRIAR LOJA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;