'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter } from 'next/font/google';
import { 
  Zap, Activity, Layers, BrainCircuit, Table, Radio, ExternalLink, PieChart, Wallet 
} from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const EXCHANGE_RATE = 25450;
const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false";

const fmt = (v: any) => {
    if (v === undefined || v === null || v === '') return '-';
    const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v;
    if (isNaN(n) || n === 0) return <span className="opacity-30">0.0</span>;
    return <span className={`font-mono font-bold ${n>0?'text-emerald-400':'text-rose-400'}`}>{n>0?'+':''}{n.toLocaleString()}</span>;
};

// --- WIDGET 1: ON-CHAIN FLOWS (WHALE ALERT) ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { fetch('/onchain_flows.json').then(r=>r.json()).then(setTxs).catch(()=>{}); }, []);

  if (txs.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">Chưa có dữ liệu Flows (Chạy script Python)</div>;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[320px] overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-xs flex items-center gap-2"><Radio size={14} className="text-emerald-500 animate-pulse"/> Whale Alert (Flows)</h3>
            <span className="text-[10px] text-slate-500">Source: Dune</span>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-[10px] text-left">
                <thead className="text-slate-500 bg-[#0B0E14] sticky top-0 uppercase">
                    <tr><th className="p-2">Time</th><th className="p-2">ETF/Entity</th><th className="p-2 text-right">Amt (BTC)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {txs.slice(0, 20).map((tx, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-2 text-slate-400 whitespace-nowrap">{new Date(tx.block_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</td>
                            <td className="p-2 font-bold text-blue-400">{tx.issuer || tx.etf_ticker || 'Unknown'}</td>
                            <td className={`p-2 text-right font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{tx.amount > 0 ? '📥' : '📤'} {Math.abs(tx.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

// --- WIDGET 2: ON-CHAIN HOLDINGS (NEW) ---
const EtfHoldingsWidget = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  useEffect(() => { 
      fetch('/etf_holdings.json').then(r=>r.json()).then(data => {
          // Lọc và sort dữ liệu Holdings (Giả sử cột là 'balance' hoặc 'amount')
          const processed = data
            .map((d:any) => ({ name: d.etf_ticker || d.issuer, val: d.balance || d.total_supply || d.amount || 0 }))
            .sort((a:any, b:any) => b.val - a.val)
            .slice(0, 8); // Top 8
          setHoldings(processed);
      }).catch(()=>{}); 
  }, []);

  if (holdings.length === 0) return <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">Chưa có dữ liệu Holdings (Chạy script Python)</div>;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[320px] overflow-hidden">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-xs flex items-center gap-2"><Wallet size={14} className="text-amber-500"/> Top Holdings (On-chain)</h3>
            <span className="text-[10px] text-slate-500">Total BTC Held</span>
        </div>
        <div className="flex-1 p-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={holdings} margin={{top:5, right:20, left:20, bottom:5}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 10, fill:'#94A3B8'}} />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}}
                        formatter={(val:number) => [new Intl.NumberFormat('en-US').format(Math.round(val)) + ' BTC', 'Holdings']}
                    />
                    <Bar dataKey="val" barSize={16} radius={[0, 4, 4, 0]}>
                        {holdings.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#FBBF24' : '#3B82F6'} />
                        ))}
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default function VNMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF' | 'DEX'>('MARKET');
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [dexs, setDexs] = useState<any[]>([]);
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH'>('BTC');
  const [etfFullPrice, setEtfFullPrice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetch(COINGECKO_API).then(r => r.json()).then(d => {setCryptos(d); setSelectedCoin(d[0])}),
        fetch(`/etf_data.json?t=${Date.now()}`).then(r => r.json()).then(setEtfData),
        fetch("https://api.llama.fi/overview/dexs?dataType=dailyVolume").then(r => r.json()).then(d => setDexs(d.protocols?.sort((a:any,b:any)=>(b.total24h||0)-(a.total24h||0)).slice(0,15))),
        fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365").then(r => r.json()).then(d => setEtfFullPrice(d.prices.map((p:any)=>({timestamp: p[0], price: p[1]}))))
      ]);
      setLoading(false);
    };
    init();
  }, []);

  const etfTable = useMemo(() => {
    if (!etfData?.[etfTicker]) return null;
    const rawHeaders = etfData[etfTicker].headers;
    const sortedHeaders = ["Date", "Total", ...rawHeaders.filter((h:string)=> h!=="Date" && h!=="Total")];
    const rows = [...etfData[etfTicker].rows].reverse();
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (rows[0]?.Date !== todayStr) rows.unshift({ Date: todayStr, Total: 0, isPending: true });
    return { headers: sortedHeaders, rows };
  }, [etfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className}`}>
      <header className="sticky top-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><Zap className="text-white" size={18}/></div>
                <h1 className="text-xl font-bold">VN<span className="text-blue-500">Metrics</span></h1>
            </div>
            <nav className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 text-xs font-bold">
                {[{id:'MARKET',l:'Thị trường'},{id:'ETF',l:'Smart Money & ETF'}].map(t => (
                    <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`px-5 py-2 rounded-md ${activeTab===t.id?'bg-slate-700 text-white':'text-slate-400'}`}>{t.l}</button>
                ))}
            </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        {activeTab === 'MARKET' && <div className="text-center py-20 opacity-50">Chọn tab Smart Money để xem chi tiết ETF...</div>}
        
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
                {/* CỘT TRÁI: BIỂU ĐỒ LỚN + WIDGETS DUNE */}
                <div className="lg:col-span-7 space-y-4">
                    <SmartMoneyDashboard priceData={etfFullPrice} etfData={etfData} />
                    
                    {/* KHU VỰC ON-CHAIN DUNE (2 WIDGETS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <OnChainFeed />       {/* Whale Alert (Query 3379919) */}
                        <EtfHoldingsWidget /> {/* Top Holdings (Query 3378009) */}
                    </div>
                </div>

                {/* CỘT PHẢI: BẢNG DỮ LIỆU */}
                <div className="lg:col-span-5 bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[700px] overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0B0E14]/50">
                        <div className="flex items-center gap-2 font-bold text-white"><Table size={16}/> Flows Table</div>
                        <div className="flex bg-black p-1 rounded border border-slate-800">
                            {['BTC','ETH'].map(t => (<button key={t} onClick={()=>setEtfTicker(t as any)} className={`px-4 py-1 text-[10px] font-bold rounded ${etfTicker===t?'bg-blue-600':'text-slate-500'}`}>{t}</button>))}
                        </div>
                    </div>
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-[10px] text-left">
                            <thead className="bg-[#0B0E14] sticky top-0 z-10 text-slate-400 uppercase font-bold">
                                <tr>
                                    {etfTable?.headers.map((h, i) => (
                                        <th key={i} className={`p-3 border-b border-slate-800 ${h==="Total"?'bg-slate-800/50 text-white':''} ${i===0?'sticky left-0 bg-[#0B0E14]':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {etfTable?.rows.map((r:any, i:number) => (
                                    <tr key={i} className={`hover:bg-white/5 ${r.isPending?'opacity-50 grayscale':''}`}>
                                        {etfTable.headers.map((h, j) => (
                                            <td key={j} className={`p-3 whitespace-nowrap ${h==="Date"?'sticky left-0 bg-[#151921] font-bold text-slate-300':''} ${h==="Total"?'bg-white/5 font-black text-white':''}`}>
                                                {h==="Date" ? r[h].split(' ').slice(0,2).join(' ') : (r.isPending && h!=="Date" ? "CLOSED" : fmt(r[h]))}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
