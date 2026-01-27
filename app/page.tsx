'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter } from 'next/font/google';
import { 
  Zap, Activity, Layers, BrainCircuit, Table, Radio, Wallet, BarChart3, ArrowDown
} from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false";

// --- FORMATTERS ---
const fmtVal = (v: any) => {
    if (v === undefined || v === null || v === '') return <span className="text-slate-700">-</span>;
    const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : v;
    if (isNaN(n)) return <span className="text-slate-700">-</span>;
    if (n === 0) return <span className="text-slate-600 font-mono opacity-50">0.0</span>;
    const isPos = n > 0;
    const txt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
    return <span className={`font-mono font-bold ${isPos?'text-emerald-400':'text-rose-400'}`}>{isPos?'+':''}{txt}</span>;
};

const formatCompact = (number: number) => {
  return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 2 }).format(number);
};

// --- WIDGET 1: ON-CHAIN FLOWS (WHALE ALERT) ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { 
      fetch('/onchain_flows.json').then(r=>r.json()).then(data => {
          // Lọc rác và lấy 20 giao dịch mới nhất
          setTxs(data.slice(0, 20));
      }).catch(()=>{}); 
  }, []);

  if (txs.length === 0) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[350px] overflow-hidden mt-4 shadow-lg">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Radio size={14} className="text-emerald-500 animate-pulse"/> Whale On-chain Flows
            </h3>
            <span className="text-[10px] text-slate-500">Real-time Dune</span>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-[10px] text-left">
                <thead className="text-slate-500 bg-[#0B0E14] sticky top-0 uppercase font-semibold">
                    <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Issuer</th>
                        <th className="p-2 text-right">Type</th>
                        <th className="p-2 text-right">BTC</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {txs.map((tx, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-2 text-slate-400 whitespace-nowrap">
                                {new Date(tx.block_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="p-2 font-bold text-blue-400">
                                {tx.issuer || tx.etf_ticker}
                            </td>
                            <td className={`p-2 text-right font-bold ${tx.flow_type === 'Deposit' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.flow_type}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-200">
                                {Math.abs(tx.amount).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

// --- WIDGET 2: ETF HOLDINGS (TVL) ---
const EtfHoldingsWidget = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  
  useEffect(() => { 
      fetch('/etf_holdings.json').then(r=>r.json()).then(data => {
          // SQL trả về: plain_issuer, usd_value, tvl
          // Sắp xếp theo USD Value giảm dần
          const processed = data
            .map((d:any) => ({ 
                name: d.plain_issuer || d.etf_ticker, 
                usd: d.usd_value || 0,
                btc: d.tvl || '0'
            }))
            .sort((a:any, b:any) => b.usd - a.usd)
            .slice(0, 10); // Top 10
          setHoldings(processed);
      }).catch(()=>{}); 
  }, []);

  if (holdings.length === 0) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[350px] overflow-hidden mt-4 shadow-lg">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Wallet size={14} className="text-amber-500"/> Top Holdings (TVL)
            </h3>
            <span className="text-[10px] text-slate-500">Asset Under Management</span>
        </div>
        <div className="flex-1 p-2 relative">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={holdings} margin={{top:5, right:40, left:10, bottom:5}}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 9, fill:'#94A3B8', fontWeight: 'bold'}} />
                    <Tooltip 
                        cursor={{fill: '#ffffff', opacity: 0.05}}
                        contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}}
                        formatter={(val:number, name:any, props:any) => [
                            `$${formatCompact(val)} (${props.payload.btc} BTC)`, 
                            'AUM'
                        ]}
                    />
                    <Bar dataKey="usd" barSize={14} radius={[0, 4, 4, 0]} animationDuration={1000}>
                        {holdings.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#FBBF24' : (index === 1 ? '#94A3B8' : '#3B82F6')} />
                        ))}
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
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

  const etfTable = useMemo(() => {
    if (!etfData?.[etfTicker]) return null;
    const rawHeaders = etfData[etfTicker].headers || [];
    const sortedHeaders = ["Date", "Total", ...rawHeaders.filter((h: string) => h !== "Date" && h !== "Total")];
    const rows = [...etfData[etfTicker].rows].reverse();
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
        {/* MARKET TAB */}
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

        {/* ETF TAB */}
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
                
                {/* TRÁI: CHART & DUNE WIDGETS */}
                <div className="lg:col-span-7 space-y-4">
                    <SmartMoneyDashboard priceData={etfFullPrice} etfData={etfData} />
                    
                    {/* WIDGETS ON-CHAIN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <OnChainFeed />       
                        <EtfHoldingsWidget /> 
                    </div>
                </div>

                {/* PHẢI: TABLE FULL DATA */}
                <div className="lg:col-span-5 bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[750px] overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0B0E14]/50">
                        <div className="flex items-center gap-2 font-bold text-white"><Table size={16}/> Flows Detail ($M)</div>
                        <div className="flex bg-black p-1 rounded border border-slate-800">
                            {['BTC','ETH'].map(t => (<button key={t} onClick={()=>setEtfTicker(t as any)} className={`px-4 py-1 text-[10px] font-bold rounded ${etfTicker===t?'bg-blue-600':'text-slate-500'}`}>{t}</button>))}
                        </div>
                    </div>
                    
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
