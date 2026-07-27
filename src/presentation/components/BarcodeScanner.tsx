import React, { useRef, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { productService } from '../services/productService';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onOpenSearch: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onOpenSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAll();
      setAllProducts(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length >= 2) {
      const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) || 
        (p.barcode && p.barcode.toLowerCase().includes(term)) ||
        (p.extra_barcodes && String(p.extra_barcodes).toLowerCase().includes(term))
      ).slice(0, 5);
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [searchTerm, allProducts]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = searchTerm.trim();
    if (!cleanCode) return;

    onScan(cleanCode);
    setSearchTerm('');
    setResults([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelect = (barcode: string) => {
    onScan(barcode);
    setSearchTerm('');
    setResults([]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // --- LEITOR DE CÓDIGO DE BARRAS VIA CÂMERA (MOBILE / TABLET) ---
  const startCameraScanner = async () => {
    setIsCameraOpen(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador não suporta acesso à câmera');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Inicia detecção usando BarcodeDetector se disponível
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detectedCode = barcodes[0].rawValue;
                if (detectedCode) {
                  stopCameraScanner();
                  toast.success(`Código lido: ${detectedCode}`);
                  onScan(detectedCode);
                }
              }
            } catch (err) {
              console.warn('[CAMERA SCAN] Erro ao detectar código:', err);
            }
          }
        }, 300);
      } else {
        setCameraError('Detecção automática por câmera requer suporte nativo (Chrome/Safari Mobile). Use a busca por texto ou aproximador.');
      }
    } catch (err: any) {
      console.error('[CAMERA ERROR]', err);
      setCameraError(err.message || 'Não foi possível acessar a câmera do dispositivo.');
    }
  };

  const stopCameraScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="relative group w-full">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 px-4 py-3 transition-all focus-within:ring-2 ring-brand-500/20 focus-within:border-brand-500">
        <i className="ph ph-magnifying-glass text-xl text-slate-400 shrink-0"></i>
        
        <input 
          ref={inputRef}
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escaneie ou digite nome / código do produto..." 
          className="flex-1 text-sm font-bold text-slate-800 outline-none bg-transparent placeholder:text-slate-300 placeholder:font-normal"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
        />

        {searchTerm ? (
          <button 
            type="button" 
            onClick={() => setSearchTerm('')} 
            className="text-slate-300 hover:text-slate-500 p-1 shrink-0"
          >
            <i className="ph ph-x-circle text-lg"></i>
          </button>
        ) : null}

        {/* Botão de Câmera Mobile */}
        <button
          type="button"
          onClick={startCameraScanner}
          className="p-2 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-xl transition-all flex items-center gap-1 shrink-0 font-bold text-xs"
          title="Escanear com Câmera do Celular"
        >
          <i className="ph ph-camera text-lg"></i>
          <span className="hidden sm:inline text-[10px] uppercase font-black">Câmera</span>
        </button>

        {/* Botão de Pesquisa Manual Modal */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all shrink-0"
          title="Abrir Busca Manual Completa"
        >
          <i className="ph ph-[#f0f0f0] ph-list-bullets text-lg"></i>
        </button>
      </form>

      {/* Dropdown de Resultados Instantâneos */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            {results.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p.barcode)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 shrink-0 overflow-hidden">
                  {p.image ? (
                    p.image.startsWith('icon:') ? (
                      <i className={`ph ${p.image.replace('icon:', '')} text-xl text-brand-500`}></i>
                    ) : (
                      <img src={p.image.startsWith('http') ? p.image : `local-img://${p.image}`} className="w-full h-full object-cover" alt="" />
                    )
                  ) : (
                    <i className="ph ph-package text-xl"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-slate-800 uppercase truncate">{p.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 font-mono">#{p.barcode}</div>
                </div>
                <div className="text-sm font-black text-emerald-600 font-mono shrink-0">
                  R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DA CÂMERA DO CELULAR */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[350] flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden max-w-lg w-full flex flex-col items-center p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={stopCameraScanner}
              className="absolute top-4 right-4 w-10 h-10 bg-slate-800 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all z-20"
            >
              <i className="ph ph-x text-xl"></i>
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-white uppercase italic">Leitor de Câmera Mobile</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aproxime o código de barras da câmera</p>
            </div>

            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border-2 border-brand-500/50 shadow-inner flex items-center justify-center">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted 
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-1 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse"></div>
            </div>

            {cameraError && (
              <p className="text-xs font-bold text-amber-400 text-center bg-amber-950/50 p-3 rounded-xl border border-amber-800">
                {cameraError}
              </p>
            )}

            <button 
              type="button"
              onClick={stopCameraScanner}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
            >
              Fechar Câmera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;