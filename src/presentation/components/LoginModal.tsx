import React, { useState, useEffect } from 'react';
import { storeService } from '../services/storeService';
import { userService } from '../services/userService';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (user: any) => void;
  onGoToAdmin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin, onGoToAdmin }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [lojaId, setLojaId] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const s = await storeService.getAll();
        const u = await userService.getAll();
        setStores(s || []);
        setUsers(u || []);
      } catch (e) {
        console.error('Erro ao carregar dados de login:', e);
      }
    };
    if (isOpen) fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (vendedor) {
      const u = users.find(user => user.name === vendedor);
      setSelectedUserPhoto(u?.photo_url || null);
    } else {
      setSelectedUserPhoto(null);
    }
  }, [vendedor, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const user = await userService.login({ username: vendedor, password });
      if (user) {
        const selectedStore = stores.find(s => String(s.id) === String(lojaId));
        if (selectedStore) {
          onLogin({
            ...user,
            storeId: lojaId,
            storeName: selectedStore.name,
            photo_url: selectedUserPhoto
          });
        } else {
          setError('LOJA NÃO ENCONTRADA');
        }
      } else {
        setError('SENHA INCORRETA!');
      }
    } catch (e) {
      setError('ERRO AO VALIDAR ACESSO');
    }
  };

  return (
    <div id="modal-setup" className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 overflow-hidden border-2 border-brand-200">
            {selectedUserPhoto ? (
              <img 
                src={selectedUserPhoto.startsWith('http') ? selectedUserPhoto : `local-img://${selectedUserPhoto}`} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <i className="ph ph-lock-key"></i>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Abertura de Caixa</h2>
          <p className="text-sm text-slate-500 mt-1">Identifique-se para liberar o sistema de vendas.</p>
        </div>

        <form id="form-setup" className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-black text-center animate-pulse">
              ❌ {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Qual é a Loja atual?</label>
            <select 
              name="loja" 
              required 
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none"
            >
              <option value="">Selecione...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Vendedor Operador</label>
            <select 
              name="vendedor" 
              required 
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none"
            >
              <option value="">Selecione...</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Senha de Acesso</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha..." 
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-3 outline-none" 
            />
          </div>

          <button type="submit" className="w-full py-4 mt-2 rounded-lg bg-brand-500 text-white font-bold text-lg hover:bg-brand-600 shadow-lg shadow-brand-500/30">
            Desbloquear PDV
          </button>
        </form>
        
        <button onClick={onGoToAdmin} className="w-full text-center mt-4 text-sm text-slate-500 hover:text-slate-800 font-medium">
          Ir para o Retaguarda (Admin)
        </button>
      </div>
    </div>
  );
};

export default LoginModal;