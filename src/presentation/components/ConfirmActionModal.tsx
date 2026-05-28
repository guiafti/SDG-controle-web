import React, { useState } from 'react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  description: string;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    onConfirm(password);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in duration-200 border border-white/20">
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center text-brand-500 mx-auto shadow-inner border border-brand-100">
            <i className="ph ph-shield-check text-5xl"></i>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              {description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Senha de 6 Dígitos</label>
              <input 
                type="password"
                autoFocus
                maxLength={6}
                value={password}
                onChange={e => setPassword(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-center text-2xl font-black tracking-[1em] outline-none focus:border-brand-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black shadow-xl transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
