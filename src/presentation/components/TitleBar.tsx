import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

interface TitleBarProps {
  logo?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ logo }) => {
  const [title, setTitle] = useState('SDG CONTROLE');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const appTitle = await window.api.getAppTitle();
      const configured = await window.api.isCloudConfigured();
      setTitle(appTitle);
      setIsOnline(configured);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="h-10 w-full bg-slate-900 flex items-center justify-between px-4 select-none shrink-0 border-b border-slate-800 z-[999] relative" 
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-3 text-slate-400">
        {logo ? (
          <img src={logo} alt="Logo" className="h-6 w-auto object-contain" />
        ) : (
          <i className="ph ph-storefront text-brand-500 text-lg"></i>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
          <div className="h-1 w-1 rounded-full bg-slate-700"></div>
          <span className={clsx(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-tight",
            isOnline 
              ? "bg-green-500/10 text-green-400 border-green-500/20" 
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          )}>
            {isOnline ? 'Sincronização Ativa' : 'Modo Offline'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={() => window.api.minimizeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Minimizar"
        >
          <i className="ph ph-minus"></i>
        </button>
        <button 
          onClick={() => window.api.maximizeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Maximizar / Restaurar"
        >
          <i className="ph ph-square"></i>
        </button>
        <button 
          onClick={() => window.api.closeWindow()} 
          className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors"
          title="Fechar Sistema"
        >
          <i className="ph ph-x"></i>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;