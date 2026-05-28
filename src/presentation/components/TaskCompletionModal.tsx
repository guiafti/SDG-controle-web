import React, { useState } from 'react';

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { photo?: string, justification?: string }) => void;
  task: any;
}

const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({ isOpen, onClose, onConfirm, task }) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !task) return null;

  // Logic to determine if justification is mandatory (if passed due date)
  const isLate = task.due_date && new Date().toLocaleTimeString('pt-BR') > task.due_date;
  const needsJustification = isLate;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => setPhoto(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsJustification && !justification.trim()) {
      return toast.error('Tarefa em atraso! Por favor, insira uma justificativa.');
    }
    onConfirm({ photo: photo || undefined, justification: justification || undefined });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black uppercase italic text-lg tracking-tight">Concluir Missão</h3>
            <p className="text-[9px] text-brand-400 font-bold uppercase tracking-widest">Evidência e Justificativa</p>
          </div>
          <button onClick={onClose}><i className="ph ph-x text-2xl"></i></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tarefa</p>
            <p className="text-sm font-bold text-slate-700 uppercase">{task.title}</p>
          </div>

          {/* Photo Evidence */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto da Tarefa (Opcional)</label>
            <div className="relative group">
              {photo ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200">
                  <img src={photo} className="w-full h-full object-cover" alt="Preview" />
                  <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><i className="ph ph-trash"></i></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
                  <i className="ph ph-camera text-3xl text-slate-300"></i>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">Anexar Prova Visual</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              )}
            </div>
          </div>

          {/* Justification if Late */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
              <span>Justificativa</span>
              {needsJustification && <span className="text-red-500 font-black">OBRIGATÓRIO (EM ATRASO)</span>}
            </label>
            <textarea 
              value={justification} 
              onChange={e => setJustification(e.target.value)}
              placeholder={needsJustification ? "Por que esta tarefa foi concluída após o prazo?" : "Observações adicionais..."}
              className={`w-full p-4 bg-slate-50 border ${needsJustification ? 'border-red-200 focus:border-red-500' : 'border-slate-200 focus:border-brand-500'} rounded-2xl text-xs font-medium outline-none transition-all resize-none shadow-inner`}
              rows={3}
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-brand-500 text-white font-black rounded-2xl shadow-xl hover:bg-brand-600 uppercase text-xs tracking-widest transition-all active:scale-95"
          >
            Confirmar Conclusão
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskCompletionModal;