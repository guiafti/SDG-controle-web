import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { printerService } from '../services/printerService';

const USBPrinterTest: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);

  const listDevices = async () => {
    const loadingId = toast.loading('Buscando dispositivos USB...');
    try {
      const res = await printerService.listUsbDevices();
      setDevices(res || []);
      toast.success(`${res.length} dispositivos encontrados`, { id: loadingId });
    } catch (e: any) {
      toast.error('Erro ao listar dispositivos', { id: loadingId });
    }
  };

  const handlePrint = async () => {
    const loadingId = toast.loading('Imprimindo teste ESC/POS...');
    try {
      // Usando o VID/PID da sua Knup
      const vid = 0x28E9;
      const pid = 0x0289;
      
      const res = await printerService.printUSB(vid, pid, 'SDG CONTROLE\n----------------\nTESTE DE FORMATACAO\n\n(O Negrito e Corte sao automaticos)');
      
      if (res.success) {
        toast.success('Impresso com sucesso!', { id: loadingId });
      } else {
        toast.error(`Erro: ${res.error}`, { id: loadingId });
      }
    } catch (e: any) {
      toast.error(`Falha na comunicação: ${e.message}`, { id: loadingId });
    }
  };

  return (
    <div className="p-6 bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Painel de Impressora USB</h3>
        <button 
          onClick={listDevices}
          className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
          title="Listar dispositivos USB"
        >
          <i className="ph ph-arrows-clockwise text-xl"></i>
        </button>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handlePrint}
          className="flex-1 px-6 py-4 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 active:scale-95"
        >
          Imprimir Teste (VID:28E9)
        </button>
      </div>

      {devices.length > 0 && (
        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dispositivos Detectados:</p>
          {devices.map((d, i) => (
            <div key={i} className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600">VID: {d.vendorId.toString(16)} | PID: {d.productId.toString(16)}</span>
              {d.vendorId === 0x28E9 && <span className="text-[8px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-black">IMPRESSORA!</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default USBPrinterTest;
