import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { isElectron } from '../services/api';
import { systemService } from '../services/systemService';

interface TitleBarProps {
  logo?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ logo }) => {
  const [title, setTitle] = useState('SDG CONTROLE');
  const [isOnline, setIsOnline] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: 'idle' | 'available' | 'downloading' | 'ready',
    progress?: number,
    version?: string
  }>({ type: 'idle' });

  useEffect(() => {
    if (!isElectron) {
      setIsOnline(true);
      return;
    }

    const updateStatus = async () => {
      try {
        const appTitle = await systemService.getAppTitle();
        const configured = await systemService.isCloudConfigured();
        setTitle(appTitle);
        setIsOnline(configured);
      } catch (e) {}
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    // Listeners de Atualização (Só Electron via Service)
    const unAvailable = systemService.onUpdateAvailable((info) => {
      setUpdateStatus({ type: 'available', version: info.version });
    });

    const unProgress = systemService.onUpdateProgress((progress) => {
      setUpdateStatus(prev => ({ 
        ...prev, 
        type: 'downloading', 
        progress: progress.percent 
      }));
    });

    const unDownloaded = systemService.onUpdateDownloaded((info) => {
      setUpdateStatus({ type: 'ready', version: info.version });
    });

    return () => {
      clearInterval(interval);
      unAvailable();
      unProgress();
      unDownloaded();
    };
  }, []);

  return (
    <div 
      className={clsx(
        "h-10 w-full bg-slate-900 flex items-center justify-between px-4 select-none shrink-0 border-b border-slate-800 z-[999] relative",
        !isElectron && "hidden"
      )} 
      style={isElectron ? { WebkitAppRegion: 'drag' } as any : {}}
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

        {/* Barra de Progresso de Atualização */}
        {isElectron && updateStatus.type !== 'idle' && (
          <div className="flex items-center gap-3 ml-4 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50 animate-in fade-in slide-in-from-left-2">
            <i className={clsx(
              "ph text-sm",
              updateStatus.type === 'downloading' ? "ph-download-simple animate-bounce" : "ph-sparkle text-brand-400"
            )}></i>
            
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-tighter leading-none">
                {updateStatus.type === 'available' && `Nova Versão ${updateStatus.version}`}
                {updateStatus.type === 'downloading' && `Baixando... ${Math.round(updateStatus.progress || 0)}%`}
                {updateStatus.type === 'ready' && 'Atualização Pronta!'}
              </span>
              {updateStatus.type === 'downloading' && (
                <div className="w-24 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-brand-500 transition-all duration-300" 
                    style={{ width: `${updateStatus.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {isElectron && (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button 
            onClick={() => systemService.minimize()} 
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Minimizar"
          >
            <i className="ph ph-minus"></i>
          </button>
          <button 
            onClick={() => systemService.maximize()} 
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Maximizar / Restaurar"
          >
            <i className="ph ph-square"></i>
          </button>
          <button 
            onClick={() => systemService.close()} 
            className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 rounded transition-colors"
            title="Fechar Sistema"
          >
            <i className="ph ph-x"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default TitleBar;