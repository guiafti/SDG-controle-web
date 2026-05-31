import React, { useRef, useEffect, useState } from 'react';
import { productService } from '../services/productService';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onOpenSearch: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onOpenSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (searchTerm.length >= 2) {
      const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.barcode.includes(searchTerm)
      ).slice(0, 5);
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [searchTerm, allProducts]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (results.length === 1) {
        onScan(results[0].barcode);
        setSearchTerm('');
      } else {
        onScan(searchTerm);
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (barcode: string) => {
    onScan(barcode);
    setSearchTerm('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative group">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 px-4 py-2 transition-all focus-within:ring-2 ring-brand-500/10 focus-within:border-brand-400">
        <i className="ph ph-magnifying-glass text-xl text-slate-400"></i>
        <input 
          ref={inputRef}
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Escaneie ou busque por nome do produto..." 
          className="flex-1 text-sm font-bold text-slate-700 outline-none bg-transparent placeholder:text-slate-300 placeholder:font-medium"
          onKeyPress={handleKeyPress}
          autoComplete="off"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-300 hover:text-slate-500">
            <i className="ph ph-x-circle text-lg"></i>
          </button>
        )}
      </div>

      {/* Instant Search Results Dropdown */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 space-y-1">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.barcode)}
                className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 shrink-0">
                  {p.image ? (
                    <img src={p.image.startsWith('http') ? p.image : `local-img://${p.image}`} className="w-full h-full object-cover rounded-md" alt="" />
                  ) : (
                    <i className="ph ph-package text-lg"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-slate-700 uppercase truncate">{p.name}</div>
                  <div className="text-[9px] font-bold text-slate-400 font-mono">#{p.barcode}</div>
                </div>
                <div className="text-xs font-bold text-emerald-600">
                  R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;