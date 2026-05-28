import React from 'react';

interface SidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  onOpenPDV: () => void;
  logo?: string;
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSwitchView, onOpenPDV, logo, role }) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20 relative">
      <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/5">
        <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
          {logo ? (
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <i className="ph ph-lightning text-2xl text-brand-400"></i>
          )}
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight tracking-tight uppercase">SDG CONTROL</h1>
          <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider block">Enterprise v2.0</span>
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-1 px-4 custom-scrollbar overflow-y-auto">
        <button 
          onClick={onOpenPDV}
          className="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10 mb-4 group active:scale-95"
        >
          <i className="ph ph-desktop-tower text-xl group-hover:rotate-12 transition-transform"></i>
          <span className="uppercase text-xs tracking-wider">Abrir Caixa</span>
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-2">Monitoramento</div>
        
        {role === 'admin' && (
          <>
            <button 
              onClick={() => onSwitchView('dashboard')}
              className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'dashboard' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="ph ph-chart-pie-slice text-xl"></i>
              Dashboard
            </button>

            <button 
              onClick={() => onSwitchView('analytics')}
              className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'analytics' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <i className="ph ph-strategy text-xl"></i>
              Análise Preditiva
            </button>
          </>
        )}

        <button 
          onClick={() => onSwitchView('crm')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'crm' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-users-four text-xl"></i>
          CRM - Clientes
        </button>

        <button 
          onClick={() => onSwitchView('inventory')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'inventory' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-cube text-xl"></i>
          Estoque
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 mb-1 ml-2">Operacional</div>

        <button 
          onClick={() => onSwitchView('repairs')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'repairs' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-wrench text-xl"></i>
          Assistência
        </button>

        <button 
          onClick={() => onSwitchView('network')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'network' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-tree-structure text-xl"></i>
          Hub de Rede
        </button>

        <button 
          onClick={() => onSwitchView('processes')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'processes' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <i className="ph ph-shield-check text-xl"></i>
          Minhas Missões
        </button>

        {role === 'admin' && (
          <button 
            onClick={() => onSwitchView('financeiro')}
            className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${activeView === 'financeiro' ? 'bg-white/10 text-white border border-white/5 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <i className="ph ph-bank text-xl"></i>
            Financeiro
          </button>
        )}
        
        <button 
          onClick={() => onSwitchView('settings')}
          className={`nav-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all mt-8 mb-4 border ${activeView === 'settings' ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/10' : 'text-slate-500 border-white/5 hover:border-white/10 hover:text-white'}`}
        >
          <i className="ph ph-gear-six text-xl"></i>
          Configurações
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;