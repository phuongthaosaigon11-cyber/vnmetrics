'use client';

import React, { useEffect, useState } from 'react';
import { Coins, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const formatVND = (n: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
};

const formatUSD = (n: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
};

export default function MetalDashboard() {
  const [metals, setMetals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => { setMetals(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] shadow-lg mb-6 hover:border-yellow-500/30 transition-all overflow-hidden">
      <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center">
         <h3 className="font-bold text-white text-sm flex items-center gap-2">
           <Coins size={16} className="text-yellow-500"/> 
           KIM LOẠI QUÝ (PHÚ QUÝ LIVE)
         </h3>
         <button onClick={fetchData} className="p-1 hover:bg-slate-800 rounded transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
         </button>
      </div>

      <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
        <table className="w-full text-[11px] text-left border-collapse">
            <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[9px] z-20">
                <tr>
                    <th className="p-3 border-b border-slate-800">Sản phẩm</th>
                    <th className="p-3 border-b border-slate-800 text-right">Mua</th>
                    <th className="p-3 border-b border-slate-800 text-right">Bán</th>
                    <th className="p-3 border-b border-slate-800 text-right">24h</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
                {metals.map((m, i) => {
                    const isUp = m.change >= 0;
                    const isWorld = m.type === 'WORLD';
                    return (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="p-3">
                            <div className={`font-bold ${isWorld ? 'text-yellow-500' : 'text-slate-200'}`}>{m.name}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{isWorld ? 'USD/OUNCE' : 'VND/LƯỢNG'}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-300">
                            {isWorld ? formatUSD(m.buy) : formatVND(m.buy)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-300">
                            {isWorld ? formatUSD(m.sell) : formatVND(m.sell)}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <div className="flex items-center justify-end gap-1">
                                {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                {Math.abs(m.change)}%
                            </div>
                        </td>
                    </tr>
                )})}
                {loading && metals.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-500 animate-pulse">Đang kết nối API Phú Quý...</td></tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
