import React from 'react';

interface AdminHeaderProps {
  title: string;
  userPhoto?: string;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ title, userPhoto }) => {
  return (
    <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-10 shadow-sm">
      <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{title}</h2>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizado</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-500 transition-all shadow-sm group">
            <i className="ph ph-bell text-2xl group-hover:rotate-12 transition-transform"></i>
          </button>

          <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 overflow-hidden shadow-inner flex items-center justify-center">
            {userPhoto ? (
              <img src={userPhoto.startsWith('http') ? userPhoto : `local-img://${userPhoto}`} className="w-full h-full object-cover" />
            ) : (
              <i className="ph ph-user text-brand-400 text-xl"></i>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;