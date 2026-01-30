'use client';

import React, { useEffect, useState } from 'react';
import { Coins, RefreshCw, TrendingUp, TrendingDown, Zap, MapPin } from 'lucide-react';

const formatVND = (n: number) => {
  if (!n) return '---';
  // Làm tròn và thêm đ
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
};

// Widget TradingView giữ nguyên như bạn thích
const TradingViewWidget = () => {
  useEffect(() => {
    const divId = 'tradingview_gold_chart';
    if (!document.getElementById(divId)) return;
    
    // Clear cũ
    document.getElementById(divId)!.innerHTML = "";

    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (typeof TradingView !== 'undefined') {
        // @ts-ignore
        new TradingView.widget({
          "width": "100%", "height": 500,
          "symbol": "OANDA:XAUUSD", "interval": "60", "timezone": "Asia/Ho_Chi_Minh",
          "theme": "dark", "style": "1", "locale": "vi_VN",
          "toolbar_bg": "#f1f3f6", "enable_publishing": false,
          "hide_side_toolbar": false, "allow_symbol_change": true,
          "container_id": divId
        });
      }
    };
    document.getElementById(divId)?.appendChild(script);
  }, []);
  return <div id="tradingview_gold_chart" className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-800 bg-[#151921]" />;
};

export default function MetalDashboard() {
  const [metals, setMetals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => { 
          if(Array.isArray(d)) setMetals(d); 
          setUpdated(new Date().toLocaleTimeString('vi-VN'));
          setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
        <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2 font-manrope">
                           <MapPin size={16} className="text-red-500"/> GIÁ PHÚ QUÝ (CHÍNH HÃNG)
                        </h3>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono flex items-center gap-1">
                            <Zap size={10} className="text-yellow-500"/> Live: {updated}
                        </div>
                    </div>
                    <button onClick={fetchData} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="text-slate-500 bg-[#11141A] font-manrope uppercase font-bold text-[10px]">
                            <tr><th className="p-3">Sản phẩm</th><th className="p-3 text-right">Mua (VND)</th><th className="p-3 text-right">Bán (VND)</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                            {metals.map((m, i) => {
                                const isUp = m.change >= 0;
                                return (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-200 text-xs font-manrope">{m.name}</div>
                                        <div className="text-[9px] text-slate-500 mt-0.5">{m.unit}</div>
                                    </td>
                                    <td className="p-3 text-right font-bold text-emerald-400">{formatVND(m.buy)}</td>
                                    <td className="p-3 text-right font-bold text-rose-400">{formatVND(m.sell)}</td>
                                </tr>
                            )})}
                            {metals.length === 0 && !loading && <tr><td colSpan={3} className="p-8 text-center text-slate-500 font-manrope">Không kết nối được Phú Quý</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="lg:col-span-8">
            <TradingViewWidget />
        </div>
    </div>
  );
}
