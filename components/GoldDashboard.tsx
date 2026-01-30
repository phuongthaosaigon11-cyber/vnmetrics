'use client';

import React, { useEffect, useState } from 'react';
import { Coins, RefreshCw, TrendingUp, TrendingDown, Globe, MapPin, Zap } from 'lucide-react';

const formatVND = (n: number) => {
  if (!n) return '---';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
};

const formatUSD = (n: number) => {
  if (!n) return '---';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
};

const TradingViewWidget = () => {
  useEffect(() => {
    // Xóa widget cũ nếu có để tránh trùng lặp
    const existingScript = document.getElementById('tv-script');
    if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'tv-script';
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
          // @ts-ignore
          if (typeof TradingView !== 'undefined') {
            // @ts-ignore
            new TradingView.widget({
              "width": "100%",
              "height": 550,
              "symbol": "OANDA:XAUUSD",
              "interval": "60",
              "timezone": "Asia/Ho_Chi_Minh",
              "theme": "dark",
              "style": "1",
              "locale": "vi_VN",
              "toolbar_bg": "#f1f3f6",
              "enable_publishing": false,
              "hide_side_toolbar": false,
              "allow_symbol_change": true,
              "container_id": "tradingview_gold"
            });
          }
        };
        document.body.appendChild(script);
    }
  }, []);

  return <div id="tradingview_gold" className="w-full h-[550px] rounded-xl overflow-hidden border border-slate-800 bg-[#151921]" />;
};

export default function MetalDashboard() {
  const [metals, setMetals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => { 
          if(Array.isArray(d)) {
            setMetals(d); 
            setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
          }
          setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
        {/* CỘT TRÁI: BẢNG GIÁ */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <MapPin size={16} className="text-red-500"/> 
                        GIÁ VÀNG/BẠC (PHÚ QUÝ)
                        </h3>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Zap size={10} className="text-yellow-500"/> Live Update: {lastUpdate || '...'}
                        </div>
                    </div>
                    <button onClick={fetchData} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>

                <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[10px] z-20">
                            <tr>
                                <th className="p-3 border-b border-slate-800">Sản phẩm</th>
                                <th className="p-3 border-b border-slate-800 text-right">Mua vào</th>
                                <th className="p-3 border-b border-slate-800 text-right">Bán ra</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 font-mono">
                            {metals.filter(m => m.type !== 'WORLD').map((m, i) => {
                                const isUp = m.change >= 0;
                                return (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-200 text-[11px]">{m.name}</div>
                                        <div className={`text-[9px] flex items-center gap-1 mt-0.5 ${isUp?'text-emerald-500':'text-rose-500'}`}>
                                            {isUp ? <TrendingUp size={8}/> : <TrendingDown size={8}/>}
                                            {m.change}%
                                        </div>
                                    </td>
                                    <td className="p-3 text-right font-bold text-emerald-400">
                                        {formatVND(m.buy)}
                                    </td>
                                    <td className="p-3 text-right font-bold text-rose-400">
                                        {formatVND(m.sell)}
                                    </td>
                                </tr>
                            )})}
                            {metals.length === 0 && !loading && (
                                <tr><td colSpan={3} className="p-10 text-center text-slate-500">Không có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* CỘT PHẢI: CHART TRADINGVIEW */}
        <div className="lg:col-span-8 space-y-6">
            {/* Widget Giá Thế Giới */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {metals.filter(m => m.type === 'WORLD').map((m, i) => (
                    <div key={i} className="bg-[#151921] border border-slate-800 p-4 rounded-xl flex justify-between items-center shadow-md">
                        <div>
                            <div className="text-slate-400 text-xs flex items-center gap-1 font-bold mb-1"><Globe size={14}/> {m.name}</div>
                            <div className="text-2xl font-mono font-bold text-yellow-400">{formatUSD(m.sell)}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] text-slate-500">Thị trường Quốc tế</div>
                             <div className="text-xs font-bold text-slate-300">Spot Price</div>
                        </div>
                    </div>
                 ))}
            </div>

            {/* TradingView Chart */}
            <TradingViewWidget />
        </div>
    </div>
  );
}
