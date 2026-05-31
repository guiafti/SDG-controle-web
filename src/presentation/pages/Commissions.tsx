import React, { useState, useEffect } from 'react';
import { financialService } from '../services/financialService';

const Commissions: React.FC = () => {
  const [commissions, setCommissions] = useState<any[]>([]);

  const fetchCommissions = async () => {
    try {
      const data = await financialService.getCommissions();
      setCommissions(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  return (
    <section id="view-comissoes" className="view-section active p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Acerto de Contas</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Relatório Matemático de Comissões</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
              <th className="px-8 py-6">Data</th>
              <th className="px-8 py-6">Vendedor</th>
              <th className="px-8 py-6">Venda ID</th>
              <th className="px-8 py-6">Valor Comissão</th>
              <th className="px-8 py-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                  Nenhuma comissão registrada ainda.
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 text-slate-500 font-bold text-sm">
                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-8 py-5 font-black text-slate-800 uppercase tracking-tight">{c.vendedor}</td>
                  <td className="px-8 py-5 font-mono text-xs text-slate-400">{c.sale_id.slice(0, 8)}...</td>
                  <td className="px-8 py-5 font-black text-brand-600 text-xl">
                    {c.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <span className="text-[10px] text-slate-300 ml-2">({c.percentage}%)</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                      Processado
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Commissions;