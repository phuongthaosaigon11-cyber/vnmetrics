'use client';

import React, { useEffect, useState } from 'react';
import { Flame, AlertTriangle, ArrowUpRight } from 'lucide-react';

const fmtUSD = (n: number) => {
  if (!n || n === 0) return '-';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const fmtPrice = (n: number) => {
  if (!n) return '-';
  if (n < 0.01) return `$${n.toFixed(8)}`; 
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
};

export default function AlphaDashboard() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/alpha')
      .then(r => r.json())
      .then(d => {
        if(Array.isArray(d)) setTokens(d);
        else setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <div className="h-[300px] bg-[#151921] rounded-xl border border-slate-800 flex items-center justify-center text-slate-500 animate-pulse text-xs">Đang tải danh sách Alpha Binance...</div>;
  
  if (error) return (
    <div className="h-[200px] bg-[#151921] rounded-xl border border-slate-800 flex flex-col items-center justify-center text-rose-500 text-xs gap-2 p-4 text-center">
      <AlertTriangle size={24}/>
      <span>Chưa nhập API Key hoặc lỗi kết nối.<br/>Hãy kiểm tra file <code>app/api/alpha/route.ts</code></span>
    </div>
  );

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[500px] shadow-lg mb-6 group hover:border-orange-500/30 transition-all">
      <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center shrink-0">
         <h3 className="font-bold text-white text-sm flex items-center gap-2">
           <Flame size={16} className="text-orange-500 fill-orange-500 animate-pulse"/> 
           BINANCE ALPHA / TOP GAINERS (24H)
         </h3>
         <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            Source: CoinMarketCap
         </span>
      </div>

      <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
        <table className="w-full text-xs text-left border-collapse">
            <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[9px] z-20">
                <tr>
                    <th className="p-3 pl-4 border-b border-slate-800">Tên / Token</th>
                    <th className="p-3 border-b border-slate-800 text-right">Khối lượng (24h)</th>
                    <th className="p-3 border-b border-slate-800 text-right">Vốn hóa</th>
                    <th className="p-3 border-b border-slate-800 text-right">Giá</th>
                    <th className="p-3 pr-4 border-b border-slate-800 text-right">Biến động (24h)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-[11px]">
                {tokens.map((t, i) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors group/row">
                        <td className="p-3 pl-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono w-4">#{i+1}</span>
                                <img 
                                    src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${t.id}.png`} 
                                    onError={(e:any) => e.target.style.display='none'}
                                    className="w-6 h-6 rounded-full bg-slate-800"
                                />
                                <div>
                                    <div className="font-bold text-white text-sm">{t.symbol}</div>
                                    <div className="text-[10px] text-slate-400 max-w-[100px] truncate" title={t.name}>{t.name}</div>
                                </div>
                            </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                            {fmtUSD(t.quote.USD.volume_24h)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                            {fmtUSD(t.quote.USD.market_cap)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-400">
                            {fmtPrice(t.quote.USD.price)}
                        </td>
                        <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1 font-mono font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2 rounded ml-auto w-fit">
                                <ArrowUpRight size={12}/>
                                {t.quote.USD.percent_change_24h.toFixed(2)}%
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
