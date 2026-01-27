'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter } from 'next/font/google';
import { Zap, Activity, BrainCircuit, Table, Calendar, ArrowDown, Wallet, Radio } from 'lucide-react';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false";

// --- FORMATTERS ---
const fmtVal = (v: any) => {
    if (v === undefined || v === null || v === '') return <span className="text-slate-700">-</span>;
    // Xử lý chuỗi có dấu phẩy
    const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v;
    
    if (isNaN(n)) return <span className="text-slate-700">-</span>;
    if (n === 0) return <span className="text-slate-600 font-mono opacity-50">0.0</span>;

    const isPos = n > 0;
    const txt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
    return <span className={`font-mono font-bold ${isPos?'text-emerald-400':'text-rose-400'}`}>{isPos?'+':''}{txt}</span>;
};

// --- WIDGET DUNE ON-CHAIN ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { fetch('/onchain_flows.json').then(r=>r.json()).then(setTxs).catch(()=>{}); }, []);
  if (!txs.length) return null; // Ẩn nếu ko có dữ liệu
  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[250px] overflow-hidden mt-4">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-xs flex items-center gap-2"><Radio size={14} className="text-emerald-500 animate-pulse"/> Whale On-chain</h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-[10px] text-left">
                <thead className="text-slate-500 bg-[#0B0E14] sticky top-0 uppercase"><tr><th className="p-2">Time</th><th className="p-2">Entity</th><th className="p-2 text-right">BTC</th></tr></thead>
                <tbody className="divide-y divide-slate-800/50">
                    {txs.slice(0,15).map((tx, i) => (
                        <tr key={i} className="hover:bg-white/5"><td className="p-2 text-slate-400">{new Date(tx.block_time).toLocaleTimeString('vi-VN')}</td><td className="p-2 font-bold text-blue-400">{tx.issuer||tx.etf_ticker}</td><td className={`p-2 text-right font-mono ${tx.amount>0?'text-emerald-400':'text-rose-400'}`}>{Math.abs(tx.amount).toFixed(2)}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default function VNMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF'>('MARKET');
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [etfData, setEtfData] = useState<any>(null);
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH'>('BTC');
  const [etfFullPrice, setEtfFullPrice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mRes, eRes, pRes] = await Promise.all([
            fetch(COINGECKO_API).then(r => r.json()),
            fetch(`/etf_data.json?t=${Date.now()}`).then(r => r.json()),
            fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365").then(r => r.json())
        ]);
        setCryptos(mRes);
        setEtfData(eRes);
        if(pRes?.prices) setEtfFullPrice(pRes.prices.map((p:any)=>({timestamp: p[0], price: p[1]})));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  // LOGIC TABLE MỚI: DYNAMIC & ROBUST
  const etfTable = useMemo(() => {
    if (!etfData?.[etfTicker]) return null;
    
    // 1. Lấy tất cả Headers
    const rawHeaders = etfData[etfTicker].headers || [];
    
    // 2. Sắp xếp Header: Date -> Total -> Các quỹ khác
    const sortedHeaders = ["Date"];
    if (rawHeaders.includes("Total")) sortedHeaders.push("Total");
    rawHeaders.forEach((h: string) => {
        if (h !== "Date" && h !== "Total") sortedHeaders.push(h);
    });

    // 3. Đảo ngược Rows để thấy ngày mới nhất
    const rows = [...etfData[etfTicker].rows].reverse();
    
    // 4. Kiểm tra ngày hôm nay
    const today = new Date();
    const todayStr = `${today.getDate()} ${today.toLocaleString('en-US', { month: 'short' })} ${today.getFullYear()}`; // VD: 26 Jan 2026
    
    // Nếu row đầu tiên không phải hôm nay, thêm dòng ảo "Closed/Pending"
    // (Logic so sánh chuỗi đơn giản, có thể cải tiến)
    
    return { headers: sortedHeaders, rows };
  }, [etfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className}`}>
      {/* HEADER */}
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

      {/* BODY */}
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        
        {/* TAB MARKET */}
        {activeTab === 'MARKET' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && <div className="col-span-4 text-center py-20 text-slate-500">Đang tải dữ liệu...</div>}
                {cryptos.map(c => (
                    <div key={c.id} className="bg-[#151921] border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-blue-500/50 transition-all">
                        <div className="flex items-center gap-3">
                            <img src={c.image} className="w-8 h-8 rounded-full"/>
                            <div><div className="font-bold text-white">{c.name}</div><div className="text-xs text-slate-500">{c.symbol.toUpperCase()}</div></div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono font-bold">${c.current_price.toLocaleString()}</div>
                            <div className={`text-xs font-bold ${c.price_change_percentage_24h>=0?'text-emerald-400':'text-rose-400'}`}>{c.price_change_percentage_24h?.toFixed(2)}%</div>
                        </div>
                    </div>
                ))}
             </div>
        )}

        {/* TAB ETF (CHÍNH) */}
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
                
                {/* TRÁI: CHART & DUNE */}
                <div className="lg:col-span-7 space-y-4">
                    <SmartMoneyDashboard priceData={etfFullPrice} etfData={etfData} />
                    <OnChainFeed />
                </div>

                {/* PHẢI: TABLE FULL DATA */}
                <div className="lg:col-span-5 bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[700px] overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0B0E14]/50">
                        <div className="flex items-center gap-2 font-bold text-white"><Table size={16}/> Flows Detail ($M)</div>
                        <div className="flex bg-black p-1 rounded border border-slate-800">
                            {['BTC','ETH'].map(t => (<button key={t} onClick={()=>setEtfTicker(t as any)} className={`px-4 py-1 text-[10px] font-bold rounded ${etfTicker===t?'bg-blue-600':'text-slate-500'}`}>{t}</button>))}
                        </div>
                    </div>
                    
                    {/* SCROLLABLE TABLE CONTAINER */}
                    <div className="overflow-auto flex-1 custom-scrollbar bg-[#0B0E14]/30">
                        <table className="w-full text-[10px] text-left border-collapse">
                            <thead className="bg-[#0B0E14] sticky top-0 z-20 text-slate-400 uppercase font-bold shadow-md">
                                <tr>
                                    {etfTable?.headers.map((h, i) => (
                                        <th key={i} className={`p-3 border-b border-slate-800 whitespace-nowrap ${i===0?'sticky left-0 bg-[#0B0E14] z-30 border-r border-slate-800':''} ${h==='Total'?'text-white bg-[#1E2329]':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {etfTable?.rows.map((r:any, i:number) => (
                                    <tr key={i} className="hover:bg-[#1E2329] transition-colors group">
                                        {etfTable.headers.map((h, j) => (
                                            <td key={j} className={`p-3 whitespace-nowrap border-b border-slate-800/50 ${j===0?'sticky left-0 bg-[#151921] group-hover:bg-[#1E2329] border-r border-slate-800 font-bold text-slate-300':''} ${h==='Total'?'bg-[#1E2329]/50 font-black border-r border-slate-800/50':''}`}>
                                                {h==="Date" ? r[h] : fmtVal(r[h])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!etfTable && <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
