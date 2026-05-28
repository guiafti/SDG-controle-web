import React, { useState, useEffect } from 'react';

interface PDVHeaderProps {
  loja: string;
  vendedor: string;
  userPhoto?: string;
  onGoToAdmin: () => void;
  onLogout: () => void;
  logo?: string;
  pendingTasksCount?: number;
  onOpenMissions?: () => void;
  isRegisterOpen: boolean;
  onOpenRegisterModal: () => void;
}

const PDVHeader: React.FC<PDVHeaderProps> = ({ 
  loja, vendedor, userPhoto, onGoToAdmin, onLogout, logo, 
  pendingTasksCount = 0, onOpenMissions,
  isRegisterOpen, onOpenRegisterModal
}) => {
  const [time, setTime] = useState(new Date());
  const [reminder, setReminder] = useState('Clique aqui para definir um lembrete para seu turno...');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Feriados Nacionais Brasileiros (Estáticos para exemplo)
  const holidays: Record<string, string> = {
    '01/01': 'Confraternização Universal',
    '21/04': 'Tiradentes',
    '01/05': 'Dia do Trabalho',
    '07/09': 'Independência do Brasil',
    '12/10': 'Nossa Sra. Aparecida',
    '02/11': 'Finados',
    '15/11': 'Proclamação da República',
    '20/11': 'Consciência Negra',
    '25/12': 'Natal',
    // Móveis (Simulados para 2026/2027)
    '03/03': 'Carnaval',
    '03/04': 'Sexta-feira Santa',
    '04/06': 'Corpus Christi'
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const days = [];
    // Espaços vazios para o início do mês
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${d.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}`;
      const holidayName = holidays[dateKey];
      const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

      days.push(
        <div 
          key={d} 
          className={`h-8 w-8 flex items-center justify-center rounded-lg text-[10px] font-bold relative group cursor-pointer transition-all
            ${isToday ? 'bg-brand-500 text-white shadow-lg' : holidayName ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'hover:bg-white/5 text-slate-300'}
          `}
          title={holidayName}
        >
          {d}
          {holidayName && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-slate-800 text-white p-2 rounded-lg text-[8px] font-black uppercase tracking-widest leading-tight text-center opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none shadow-2xl border border-white/10">
              {holidayName}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="absolute top-full left-0 mt-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl z-[100] w-[280px] animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="p-2 hover:bg-white/5 rounded-xl text-slate-400"><i className="ph ph-caret-left-bold"></i></button>
          <span className="text-[10px] font-black uppercase text-white italic tracking-widest">{monthName}</span>
          <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="p-2 hover:bg-white/5 rounded-xl text-slate-400"><i className="ph ph-caret-right-bold"></i></button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
            <div key={d} className="h-8 w-8 flex items-center justify-center text-[9px] font-black text-slate-500">{d}</div>
          ))}
          {days}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-center">
            <button onClick={() => setCalendarDate(new Date())} className="text-[9px] font-black text-brand-400 uppercase tracking-widest hover:underline">Ir para hoje</button>
        </div>
      </div>
    );
  };

  const handleEditReminder = () => {
    const newReminder = prompt('Digite seu lembrete:', reminder);
    if (newReminder !== null && newReminder.trim() !== '') {
      setReminder(newReminder);
    }
  };

  return (
    <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-2xl border-b border-slate-800 relative overflow-hidden">
      {/* Background Accent Decor */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      
      {/* Left Section: Time, Weather, and Station Info */}
      <div className="flex items-center gap-8 relative z-10">
        {/* Clock Hub */}
        <div className="flex flex-col border-r border-slate-800 pr-8 relative">
          <div className="text-4xl font-bold text-white tracking-tighter leading-none font-mono flex items-baseline gap-1">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="text-[10px] font-bold text-slate-400 hover:text-brand-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2 transition-colors group"
          >
            <i className="ph ph-calendar-blank text-brand-400 group-hover:scale-110 transition-transform"></i>
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </button>
          {isCalendarOpen && renderCalendar()}
        </div>

        {/* Weather & Station */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group cursor-help">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-brand-400 border border-white/10 group-hover:bg-brand-500/10 transition-colors">
              <i className="ph ph-cloud-sun text-3xl"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-100 leading-none">24°C</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Almenara • MG</span>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800"></div>

          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Unidade Operacional</span>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{loja || 'LOJA MATRIZ'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Operador Ativo</span>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase tracking-tight">
                  <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 overflow-hidden">
                    {userPhoto ? (
                      <img src={`local-img://${userPhoto}`} className="w-full h-full object-cover" />
                    ) : (
                      <i className="ph ph-user text-lg"></i>
                    )}
                  </div>
                  {vendedor || 'SISTEMA'}
                </div>
              </div>

              {/* Notification Bell */}
              <button 
                onClick={onOpenMissions}
                className="relative w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group"
              >
                <i className={`ph ph-bell-ringing text-2xl ${pendingTasksCount > 0 ? 'text-brand-400 animate-swing' : 'text-slate-500'}`}></i>
                {pendingTasksCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-xl animate-bounce">
                    {pendingTasksCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section: dynamic Content (Reminders & Promos) */}
      <div className="hidden xl:flex flex-1 mx-12 items-center gap-4 justify-center relative z-10">
        {/* Promotion Card */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-0.5 shadow-lg shadow-brand-500/10 hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="bg-slate-900 rounded-[14px] px-4 py-2 flex items-center gap-3">
            <div className="bg-brand-500 text-white p-2 rounded-xl shadow-inner group-hover:rotate-12 transition-transform">
              <i className="ph ph-lightning text-xl font-bold"></i>
            </div>
            <div className="min-w-[140px]">
              <p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Oferta do Dia</p>
              <h4 className="text-[11px] font-bold text-white uppercase truncate">Capa Silicone iPhone</h4>
              <p className="text-[10px] font-black text-emerald-400 font-mono">R$ 49,90</p>
            </div>
          </div>
        </div>

        {/* Reminder Card - Editable */}
        <div 
          onClick={handleEditReminder}
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl px-5 py-3 flex items-center gap-4 max-w-sm w-full group hover:bg-slate-800 transition-all cursor-pointer border-dashed hover:border-brand-500/50"
        >
          <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center border border-orange-500/20 group-hover:rotate-6 transition-transform">
            <i className="ph ph-push-pin text-xl"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5 flex justify-between">
              Notificação Interna
              <span className="text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity text-[7px] uppercase tracking-normal underline">Editar</span>
            </p>
            <p className="text-[10px] text-slate-300 font-medium truncate italic leading-tight">
              "{reminder}"
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Section: Control Actions */}
      <div className="flex items-center gap-3 relative z-10 pl-6 border-l border-slate-800">
        <button 
          onClick={onOpenRegisterModal}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${
            isRegisterOpen 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isRegisterOpen ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            <i className={`ph ${isRegisterOpen ? 'ph-check-circle' : 'ph-lock-open'} text-xl`}></i>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-black uppercase leading-none">{isRegisterOpen ? 'Caixa Aberto' : 'Caixa Fechado'}</p>
            <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">Status PDV</p>
          </div>
        </button>

        <button onClick={onGoToAdmin} className="group px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 shadow-xl flex items-center gap-3 active:scale-95">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-brand-400 group-hover:text-brand-300 transition-colors">
            <i className="ph ph-chart-line-up text-xl"></i>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-black text-white uppercase leading-none">Gestão</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Retaguarda</p>
          </div>
        </button>
        
        <button onClick={onLogout} className="flex flex-col items-center justify-center w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 shadow-lg shadow-red-500/5 active:scale-95 group">
          <i className="ph ph-power text-2xl group-hover:scale-110 transition-transform"></i>
          <span className="text-[7px] font-black uppercase mt-1 tracking-tighter">Sair</span>
        </button>
      </div>
    </header>
  );
};

export default PDVHeader;