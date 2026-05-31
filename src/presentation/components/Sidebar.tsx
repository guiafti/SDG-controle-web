import React from 'react';

interface SidebarProps {
  activeView: string;
  onSwitchView: (view: string) => void;
  onOpenPDV: () => void;
  logo?: string;
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onSwitchView, onOpenPDV, logo, role }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: 'ph-chart-pie-slice', adminOnly: true },
    { id: 'crm', label: 'CRM', icon: 'ph-users-four', adminOnly: false },
    { id: 'inventory', label: 'Estoque', icon: 'ph-cube', adminOnly: false },
    { id: 'repairs', label: 'OS', icon: 'ph-wrench', adminOnly: false },
    { id: 'network', label: 'Rede', icon: 'ph-tree-structure', adminOnly: false },
    { id: 'financeiro', label: 'Finance', icon: 'ph-bank', adminOnly: true },
  ];

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col shadow-xl z-20 relative">
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-white/10 flex items-center justify-around px-2 z-[100] shadow-2xl">
        {menuItems.filter(item => !item.adminOnly || role === 'admin').slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => onSwitchView(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${activeView === item.id ? 'text-brand-400' : 'text-slate-500'}`}
          >
            <i className={`ph ${item.icon} text-xl`}></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            {activeView === item.id && <div className="w-1 h-1 bg-brand-400 rounded-full"></div>}
          </button>
        ))}
        <button
          onClick={onOpenPDV}
          className="flex flex-col items-center gap-1 text-emerald-400"
        >
          <div className="w-10 h-10 -mt-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 border-4 border-slate-900">
            <i className="ph ph-plus font-bold"></i>
          </div>
          <span className="text-[8px] font-black uppercase tracking-tighter">Vender</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;