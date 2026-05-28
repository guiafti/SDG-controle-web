import React from 'react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (aparelho: string, servico: string, valor: number) => void;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const aparelho = formData.get('aparelho') as string;
    const servico = formData.get('servico') as string;
    const valor = parseFloat(formData.get('valor') as string);
    onSubmit(aparelho, servico, valor);
  };

  return (
    <div id="modal-manutencao" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-xl">
              <i className="ph ph-wrench"></i>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Lançar Manutenção</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <form id="form-manutencao" className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Aparelho</label>
            <input name="aparelho" type="text" required placeholder="Ex: iPhone 11" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Serviço Realizado</label>
            <input name="servico" type="text" required placeholder="Ex: Troca de Tela Frontal" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-medium" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Valor do Serviço (R$)</label>
            <input name="valor" type="number" required step="0.01" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 outline-none focus:border-orange-500 font-bold text-lg" />
          </div>
          <button type="submit" className="w-full py-3 mt-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all uppercase tracking-wider">
            Adicionar ao Caixa
          </button>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceModal;