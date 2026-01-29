'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter } from 'next/font/google';
import { Zap, Table, Radio, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ComposedChart, Line, ResponsiveContainer } from 'recharts';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';
import AlphaDashboard from '../components/AlphaDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const COINGECKO_TOP10 = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=true";
const CORS_PROXY = "https://corsproxy.io/?";
const BINANCE_OI_URL = "https://fapi.binance.com/fapi/v1/openInterestHist?symbol=BTCUSDT&period=1d&limit=90";
const BINANCE_FUND_URL = "https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=270";

const fmtUSD = (n:number) => !n||isNaN(n)?'-':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact'}).format(n);
const fmtAmt = (n:number) => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const fmtFlow = (val:any) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g,'')) : val;
    if(isNaN(num) || num===0) return <span className="text-slate-700">-</span>;
    return <span className={`font-mono font-bold ${num>0?'text-emerald-400':'text-rose-400'}`}>{num>0?'+':''}{num.toLocaleString()}</span>;
};

const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { 
      // SỬA: Thêm ?t=Date.now() để bắt buộc lấy file mới nhất, tránh cache trình duyệt
      fetch(`/onchain_flows.json?t=${Date.now()}`)
        .then(r=>r.json())
        .then(setTxs)
        .catch(()=>{}); 
  }, []);

  if (!txs.length) return null;
  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] shadow-lg mb-6 hover:border-slate-700 transition-all">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2"><Radio size={16} className="text-emerald-500 animate-pulse"/> On-chain Flows</h3>
            <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Dune Live</span>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[9px] z-20">
                    <tr><th className="p-2 border-b border-slate-800">Time</th><th className="p-2 border-b border-slate-800">Wallet</th><th className="p-2 border-b border-slate-800 text-right">BTC</th><th className="p-2 border-b border-slate-800 text-right">USD</th><th className="p-2 border-b border-slate-800 text-center">Type</th><th className="p-2 border-b border-slate-800 text-center">Tx</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[10px]">
                    {txs.slice(0,50).map((tx, i) => {
                        const isDep = tx.flow_type === 'Deposit'; const d = new Date(tx.block_time);
                        return (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="p-2 text-slate-400 font-mono"><div className="text-slate-300">{d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div><div className="opacity-50">{d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</div></td>
                                <td className="p-2"><div className="font-bold text-slate-200">{tx.issuer}</div><div className="text-[9px] font-mono text-slate-500">{tx.etf_ticker}</div></td>
                                <td className={`p-2 text-right font-mono font-bold ${isDep?'text-emerald-400':'text-rose-400'}`}>{isDep?'+':''}{fmtAmt(tx.amount)}</td>
                                <td className="p-2 text-right font-mono text-slate-300">{fmtUSD(tx.amount_usd||tx.usd_value)}</td>
                                <td className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase border ${isDep?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>{isDep?'NẠP':'RÚT'}</span></td>
                                <td className="p-2 text-center">{tx.txs && (<div dangerouslySetInnerHTML={{ __html: tx.txs.replace(/<a href="(.*?)"(.*?)>(.*?)<\/a>/, '<a href="$1" target="_blank" class="text-blue-500 hover:text-white inline-flex p-1 hover:bg-slate-800 rounded">🔗</a>') }} />)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

const EtfHoldingsWidget = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  
  useEffect(() => { 
      fetch(`/etf_holdings.json?t=${Date.now()}`)
        .then(r=>r.json())
        .then(d => {
            // --- LOGIC MỚI: LỌC TRÙNG LẶP ---
            // Chỉ giữ lại dòng mới nhất cho mỗi Ticker
            const uniqueMap = new Map();
            d.forEach((item: any) => {
                // Nếu chưa có ticker này hoặc dòng mới này có giá trị (usd_value) lớn hơn cái cũ
                // (Giả định giá trị lớn nhất là mới nhất vì BTC đang tăng, 
                // hoặc chuẩn nhất là dựa vào ngày tháng nếu có)
                if (!uniqueMap.has(item.etf_ticker)) {
                    uniqueMap.set(item.etf_ticker, item);
                }
            });
            
            const uniqueList = Array.from(uniqueMap.values())
                .map((x:any)=>({...x, usd: x.usd_value || 0}))
                .sort((a:any,b:any) => b.usd - a.usd); // Sắp xếp từ cao xuống thấp

            setHoldings(uniqueList);
        })
        .catch(()=>{}); 
  }, []);

  if (!holdings.length) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] shadow-lg mb-6 hover:border-slate-700 transition-all">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wallet size={16} className="text-amber-500"/> ETF Holdings (On-chain)
            </h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[9px] z-20">
                    <tr>
                        <th className="p-2 border-b border-slate-800">Tổ Chức</th>
                        <th className="p-2 border-b border-slate-800 text-right">BTC Nắm Giữ</th>
                        <th className="p-2 border-b border-slate-800 text-right">Giá trị ($)</th>
                        <th className="p-2 border-b border-slate-800 text-right">Thị phần</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[10px]">
                    {holdings.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-2">
                                <div className="font-bold text-slate-200">{row.plain_issuer || row.issuer}</div>
                                <div className="text-[9px] font-mono text-slate-500">{row.etf_ticker}</div>
                            </td>
                            <td className="p-2 text-right font-mono text-slate-300">
                                {fmtAmt(row.tvl || row.amount)} ₿
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-400">
                                {fmtUSD(row.usd_value)}
                            </td>
                            <td className="p-2 text-right text-slate-400 font-mono">
                                {/* Nếu có số liệu share thì hiện, không thì tự tính (tương đối) */}
                                {row.percentage_of_total 
                                    ? (row.percentage_of_total * 100).toFixed(1) + '%' 
                                    : '-'}
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
  const [allEtfData, setAllEtfData] = useState<any>({ BTC: [], ETH: [], SOL: [] });
  const [marketMetrics, setMarketMetrics] = useState<any>({ prices: [], oi: [], funding: [] });
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mRes, btcFlow, ethFlow, solFlow, pRes] = await Promise.all([
            fetch(COINGECKO_TOP10).then(r => r.json()).catch(()=>[]),
            fetch('/api/etf-flow?type=BTC').then(r => r.json()).catch(()=>[]),
            fetch('/api/etf-flow?type=ETH').then(r => r.json()).catch(()=>[]),
            fetch('/api/etf-flow?type=SOL').then(r => r.json()).catch(()=>[]),
            fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90").then(r => r.json()).catch(()=>({prices:[]}))
        ]);
        
        let oiData = [], fundingData = [];
        try {
            const [oiRes, fundRes] = await Promise.all([
                fetch(CORS_PROXY + encodeURIComponent(BINANCE_OI_URL)).then(r => r.json()),
                fetch(CORS_PROXY + encodeURIComponent(BINANCE_FUND_URL)).then(r => r.json())
            ]);
            oiData = Array.isArray(oiRes) ? oiRes : [];
            fundingData = Array.isArray(fundRes) ? fundRes : [];
        } catch (err) {}

        setCryptos(mRes);
        setAllEtfData({
            BTC: Array.isArray(btcFlow) ? btcFlow : [],
            ETH: Array.isArray(ethFlow) ? ethFlow : [],
            SOL: Array.isArray(solFlow) ? solFlow : []
        });
        setMarketMetrics({ prices: pRes.prices || [], oi: oiData, funding: fundingData });
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  const etfTable = useMemo(() => {
    const rows = allEtfData[etfTicker] || [];
    if (!rows.length) return null;
    const sample = rows[0];
    const fundTickers = Object.keys(sample).filter(k => k !== 'date' && k !== 'total');
    const headers = ["Ngày", ...fundTickers, "TỔNG ($M)"];
    
    return { headers, rows, fundTickers };
  }, [allEtfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className}`}>
      <header className="sticky top-0 z-50 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Zap className="text-white" size={18}/></div>
                <h1 className="text-lg font-bold tracking-tight">VN<span className="text-blue-500">Metrics</span></h1>
            </div>
            <nav className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 text-xs font-bold">
                {[{id:'MARKET',l:'Thị trường'},{id:'ETF',l:'Smart Money & ETF'}].map(t => (
                    <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`px-4 py-1.5 rounded-md transition-all ${activeTab===t.id?'bg-[#252A33] text-white shadow ring-1 ring-slate-600':'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}>{t.l}</button>
                ))}
            </nav>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        {activeTab === 'MARKET' && (
             <div className="space-y-6">
                <AlphaDashboard />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loading && <div className="col-span-4 text-center py-20 text-slate-500">Đang tải dữ liệu...</div>}
                    {cryptos.map(c => {
                        const isUp = (c.price_change_percentage_24h || 0) >= 0;
                        const sparklineData = c.sparkline_in_7d?.price?.map((p:number, i:number) => ({i, p})) || [];
                        return (
                        <div key={c.id} className="bg-[#151921] border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-blue-500/50 transition-all group h-[140px]">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3"><img src={c.image} className="w-10 h-10 rounded-full group-hover:scale-110 transition-transform"/><div><div className="font-bold text-white text-sm">{c.name}</div><div className="text-[10px] text-slate-500 font-mono">{c.symbol.toUpperCase()}</div></div></div>
                                <div className="text-right"><div className="font-mono font-bold text-slate-200">${c.current_price.toLocaleString()}</div><div className={`text-xs font-bold flex items-center justify-end gap-1 ${isUp?'text-emerald-400':'text-rose-400'}`}>{isUp?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}{Math.abs(c.price_change_percentage_24h||0).toFixed(2)}%</div></div>
                            </div>
                            <div className="h-[40px] w-full mt-2 opacity-50 group-hover:opacity-100 transition-opacity"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={sparklineData}><Line type="monotone" dataKey="p" stroke={isUp ? '#10B981' : '#F43F5E'} strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
                        </div>
                    )})}
                </div>
             </div>
        )}
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="lg:col-span-7 space-y-6">
                    <SmartMoneyDashboard rawData={marketMetrics} etfData={allEtfData} />
                    <OnChainFeed />
                    <EtfHoldingsWidget />
                </div>
                <div className="lg:col-span-5 bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[850px] shadow-lg sticky top-20 overflow-hidden">
                    <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 font-bold text-white text-sm"><Table size={16}/> Lịch sử Dòng tiền ($M)</div>
                        <div className="flex bg-black p-1 rounded border border-slate-800 gap-1">
                            {['BTC','ETH', 'SOL'].map(t => (
                                <button key={t} onClick={()=>setEtfTicker(t as any)} className={`px-3 py-0.5 text-[10px] font-bold rounded transition-all ${etfTicker===t?'bg-blue-600 text-white':'text-slate-500 hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-auto flex-1 custom-scrollbar bg-[#0B0E14]/30">
                        <table className="w-full text-[10px] text-left border-collapse">
                            <thead className="bg-[#11141A] sticky top-0 z-20 text-slate-400 uppercase font-bold shadow-md">
                                <tr>
                                    <th className="p-3 border-b border-slate-800 sticky left-0 bg-[#11141A] z-30 border-r border-slate-800">Ngày</th>
                                    {etfTable?.fundTickers.map((ticker:string) => (
                                        <th key={ticker} className="p-3 border-b border-slate-800 text-right">{ticker}</th>
                                    ))}
                                    <th className="p-3 border-b border-slate-800 text-right text-white bg-[#1E2329]">TỔNG</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {etfTable?.rows.map((r:any, i:number) => (
                                    <tr key={i} className="hover:bg-[#1E2329] transition-colors group">
                                        <td className="p-3 whitespace-nowrap border-b border-slate-800/50 sticky left-0 bg-[#151921] group-hover:bg-[#1E2329] border-r border-slate-800 font-bold text-slate-300">{r.date}</td>
                                        {etfTable.fundTickers.map((ticker:string) => (
                                            <td key={ticker} className="p-3 text-right border-b border-slate-800/50 font-mono text-slate-400">{r[ticker] ? fmtFlow(r[ticker]) : '-'}</td>
                                        ))}
                                        <td className="p-3 text-right border-b border-slate-800/50 bg-[#1E2329]/50 font-black border-r border-slate-800/50">{fmtFlow(r.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!etfTable && <div className="p-10 text-center text-slate-500">{loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu cho mục này.'}</div>}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
