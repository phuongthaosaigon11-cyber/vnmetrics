'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter } from 'next/font/google';
import { 
  Zap, Activity, Layers, BrainCircuit, Table, Radio, Wallet, ArrowDown, ExternalLink, Info 
} from 'lucide-react';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false";

// --- FORMATTERS CHUYÊN NGHIỆP ---
const fmtUSD = (num: number) => {
    if (!num) return '-';
    const absNum = Math.abs(num);
    if (absNum >= 1.0e+9) return (num / 1.0e+9).toFixed(1) + "b";
    if (absNum >= 1.0e+6) return (num / 1.0e+6).toFixed(0) + "m";
    if (absNum >= 1.0e+3) return (num / 1.0e+3).toFixed(0) + "k";
    return num.toFixed(0);
};

const fmtAmt = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);
};

// Component render HTML an toàn (cho cột Txs)
const SafeHtml = ({ html }: { html: string }) => {
    if (!html) return <span>-</span>;
    // Tùy chỉnh CSS cho thẻ a bên trong để đẹp hơn
    const style = { color: '#60A5FA', textDecoration: 'none', marginLeft: '4px' };
    return <span className="flex items-center gap-1" dangerouslySetInnerHTML={{ __html: html.replace(/<a /g, '<a target="_blank" class="hover:text-white transition" ') }} />;
};

// --- WIDGET 1: RECENT FLOWS (ON-CHAIN) ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
      fetch('/onchain_flows.json')
        .then(r => r.json())
        .then(data => { setTxs(data); setIsLoading(false); })
        .catch(() => setIsLoading(false)); 
  }, []);

  if (isLoading) return <div className="h-64 flex items-center justify-center text-slate-500 text-xs">Loading On-chain Data...</div>;
  if (!txs.length) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-lg mb-6">
        <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Radio size={16} className="text-emerald-500 animate-pulse"/> Recent Flows (On-chain)
            </h3>
            <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Ignore Negligible = True</span>
        </div>
        
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/50">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-400 bg-[#11141A] sticky top-0 uppercase font-semibold text-[10px] tracking-wider z-20">
                    <tr>
                        <th className="p-3 border-b border-slate-800 whitespace-nowrap">Transfer Time (EST)</th>
                        <th className="p-3 border-b border-slate-800">Issuer</th>
                        <th className="p-3 border-b border-slate-800">Ticker</th>
                        <th className="p-3 border-b border-slate-800 text-right">Amount</th>
                        <th className="p-3 border-b border-slate-800 text-right">USD Value</th>
                        <th className="p-3 border-b border-slate-800 text-center">Type</th>
                        <th className="p-3 border-b border-slate-800 text-right">Txs</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                    {txs.map((tx, i) => {
                        const isDeposit = tx.flow_type === 'Deposit';
                        return (
                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                <td className="p-3 text-slate-300 whitespace-nowrap font-mono">
                                    {tx.block_time_est || new Date(tx.block_time).toLocaleString('en-US')}
                                </td>
                                <td className="p-3 font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {tx.issuer}
                                </td>
                                <td className="p-3 text-slate-400 font-bold">
                                    {tx.etf_ticker}
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {fmtAmt(tx.amount)}
                                </td>
                                <td className={`p-3 text-right font-mono ${isDeposit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {tx.amount_usd || tx.usd_value ? `$${fmtUSD(tx.amount_usd || tx.usd_value)}` : '-'}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isDeposit ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' : 'bg-rose-950/30 border-rose-800 text-rose-400'}`}>
                                        {tx.flow_type}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <SafeHtml html={tx.txs} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

// --- WIDGET 2: ETFS OVERVIEW (HOLDINGS) ---
const EtfHoldingsWidget = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { 
      fetch('/etf_holdings.json')
        .then(r => r.json())
        .then(data => { setHoldings(data); setIsLoading(false); })
        .catch(() => setIsLoading(false)); 
  }, []);

  if (isLoading) return <div className="h-64 flex items-center justify-center text-slate-500 text-xs">Loading Holdings Data...</div>;
  if (!holdings.length) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wallet size={16} className="text-amber-500"/> ETFs Overview
            </h3>
            <div className="text-[10px] text-slate-500 flex gap-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Shared</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Sleuthed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> PoR</span>
            </div>
        </div>
        
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/50">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-400 bg-[#11141A] sticky top-0 uppercase font-semibold text-[10px] tracking-wider z-20">
                    <tr>
                        <th className="p-3 border-b border-slate-800">Issuer</th>
                        <th className="p-3 border-b border-slate-800 text-right">Holdings (BTC)</th>
                        <th className="p-3 border-b border-slate-800 text-right">USD Value</th>
                        <th className="p-3 border-b border-slate-800 text-right">Share</th>
                        <th className="p-3 border-b border-slate-800 text-center">Ticker</th>
                        <th className="p-3 border-b border-slate-800 text-right">Fee</th>
                        <th className="p-3 border-b border-slate-800 text-center">Addr</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                    {holdings.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                            <td className="p-3 font-bold text-white group-hover:text-blue-400 transition-colors">
                                {row.plain_issuer || row.issuer}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-200">
                                {fmtAmt(row.tvl || row.amount)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                ${fmtUSD(row.usd_value)}
                            </td>
                            <td className="p-3 text-right text-slate-300">
                                {row.percentage_of_total ? (row.percentage_of_total * 100).toFixed(1) + '%' : '-'}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-400 bg-slate-800/30 rounded border border-slate-800/50">
                                {row.etf_ticker}
                            </td>
                            <td className="p-3 text-right text-slate-400">
                                {row.percentage_fee ? (row.percentage_fee * 100).toFixed(2) + '%' : '-'}
                            </td>
                            <td className="p-3 text-center">
                                <SafeHtml html={row.address_source} />
                            </td>
                        </tr>
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
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH'>('BTC');
  const [etfFullPrice, setEtfFullPrice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA CHÍNH
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

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className} selection:bg-blue-500/30`}>
      <header className="sticky top-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Zap className="text-white fill-current" size={18}/>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white leading-none tracking-tight">VN<span className="text-blue-500">Metrics</span></h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Crypto Data Terminal</p>
                </div>
            </div>
            <nav className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 text-xs font-bold">
                {[{id:'MARKET',l:'Thị trường'},{id:'ETF',l:'Smart Money & ETF'}].map(t => (
                    <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`px-5 py-2 rounded-md transition-all ${activeTab===t.id?'bg-[#252A33] text-white shadow-sm ring-1 ring-slate-600':'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}>{t.l}</button>
                ))}
            </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        
        {/* TAB MARKET */}
        {activeTab === 'MARKET' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && <div className="col-span-4 text-center py-20 text-slate-500">Đang tải dữ liệu thị trường...</div>}
                {cryptos.map(c => (
                    <div key={c.id} className="bg-[#151921] border border-slate-800 p-4 rounded-xl flex justify-between items-center hover:border-blue-500/50 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <img src={c.image} className="w-10 h-10 rounded-full group-hover:scale-110 transition-transform"/>
                            <div>
                                <div className="font-bold text-white text-sm">{c.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{c.symbol.toUpperCase()}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono font-bold text-slate-200">${c.current_price.toLocaleString()}</div>
                            <div className={`text-xs font-bold ${c.price_change_percentage_24h>=0?'text-emerald-400':'text-rose-400'}`}>{c.price_change_percentage_24h?.toFixed(2)}%</div>
                        </div>
                    </div>
                ))}
             </div>
        )}

        {/* TAB ETF (CHÍNH) */}
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2">
                
                {/* TRÁI: CHART LỚN */}
                <div className="lg:col-span-7 space-y-6">
                    <SmartMoneyDashboard priceData={etfFullPrice} etfData={etfData} />
                    
                    {/* Bảng Recent Flows (Dune) */}
                    <OnChainFeed />
                </div>

                {/* PHẢI: ETFS OVERVIEW (Dune) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <EtfHoldingsWidget />
                    
                    {/* Placeholder cho Table cũ nếu cần (hoặc ẩn đi để tập trung vào Dune) */}
                    {/* <div className="bg-[#151921] border border-slate-800 rounded-xl h-[300px] flex items-center justify-center text-slate-600 text-xs">
                        <BrainCircuit size={16} className="mr-2"/> Additional Analysis Loading...
                    </div> */}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
