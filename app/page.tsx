'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, Globe, Repeat, Lock, ArrowUpRight, ArrowDownRight, ServerCrash, 
  Activity, Clock, Database, Droplets, BarChart2, Eye, Table, Radio, Wallet 
} from 'lucide-react';

import SmartMoneyDashboard from '../components/SmartMoneyDashboard';
import MetalDashboard from '../components/GoldDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const EXCHANGE_RATE = 25450; 

// --- FORMATTERS ---
const formatPrice = (price: any, currency = 'USD') => {
    if (!price || isNaN(price)) return '0.00';
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price * EXCHANGE_RATE);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
};

const formatCompact = (number: any) => {
    if (!number || isNaN(number)) return '-';
    if (number >= 1e12) return '$' + (number/1e12).toFixed(2) + "T";
    if (number >= 1e9) return '$' + (number/1e9).toFixed(2) + "B";
    if (number >= 1e6) return '$' + (number/1e6).toFixed(2) + "M";
    return '$' + number.toLocaleString();
};

const fmtFlow = (val:any) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g,'')) : val;
    if(isNaN(num) || num===0) return <span className="text-slate-700">-</span>;
    return <span className={`font-mono font-bold ${num>0?'text-emerald-400':'text-rose-400'}`}>{num>0?'+':''}{num.toLocaleString()}</span>;
};

// --- SUB-COMPONENTS ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { fetch(`/onchain_flows.json?t=${Date.now()}`).then(r=>r.json()).then(setTxs).catch(()=>{}); }, []);
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
                    <tr><th className="p-2 border-b border-slate-800">Time</th><th className="p-2 border-b border-slate-800">Wallet</th><th className="p-2 border-b border-slate-800 text-right">BTC</th><th className="p-2 border-b border-slate-800 text-right">USD</th><th className="p-2 border-b border-slate-800 text-center">Type</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[10px]">
                    {txs.slice(0,50).map((tx, i) => {
                        const isDep = tx.flow_type === 'Deposit'; const d = new Date(tx.block_time);
                        return (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="p-2 text-slate-400 font-mono"><div className="text-slate-300">{d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div></td>
                                <td className="p-2"><div className="font-bold text-slate-200">{tx.issuer}</div><div className="text-[9px] font-mono text-slate-500">{tx.etf_ticker}</div></td>
                                <td className={`p-2 text-right font-mono font-bold ${isDep?'text-emerald-400':'text-rose-400'}`}>{isDep?'+':''}{parseFloat(tx.amount).toFixed(2)}</td>
                                <td className="p-2 text-right font-mono text-slate-300">{formatCompact(tx.amount_usd||tx.usd_value)}</td>
                                <td className="p-2 text-center"><span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold uppercase border ${isDep?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>{isDep?'NẠP':'RÚT'}</span></td>
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
      fetch(`/etf_holdings.json?t=${Date.now()}`).then(r=>r.json())
        .then(d => {
            const uniqueMap = new Map();
            d.forEach((item: any) => { if (!uniqueMap.has(item.etf_ticker)) uniqueMap.set(item.etf_ticker, item); });
            setHoldings(Array.from(uniqueMap.values()).map((x:any)=>({...x, usd: x.usd_value||0})).sort((a:any,b:any)=>b.usd-a.usd));
        }).catch(()=>{}); 
  }, []);
  if (!holdings.length) return null;
  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] shadow-lg mb-6 hover:border-slate-700 transition-all">
        <div className="p-3 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2"><Wallet size={16} className="text-amber-500"/> ETF Holdings (On-chain)</h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/30">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-500 bg-[#11141A] sticky top-0 uppercase font-bold text-[9px] z-20">
                    <tr><th className="p-2 border-b border-slate-800">Tổ Chức</th><th className="p-2 border-b border-slate-800 text-right">Holdings</th><th className="p-2 border-b border-slate-800 text-right">Giá trị ($)</th><th className="p-2 border-b border-slate-800 text-right">Share</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-[10px]">
                    {holdings.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-2"><div className="font-bold text-slate-200">{row.plain_issuer || row.issuer}</div><div className="text-[9px] font-mono text-slate-500">{row.etf_ticker}</div></td>
                            <td className="p-2 text-right font-mono text-slate-300">{parseFloat(row.tvl || row.amount).toLocaleString()}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-400">{formatCompact(row.usd_value)}</td>
                            <td className="p-2 text-right text-slate-400 font-mono">{row.percentage_of_total ? (row.percentage_of_total * 100).toFixed(1) + '%' : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default function VNMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF' | 'METALS'>('MARKET');
  const [currency, setCurrency] = useState('USD');
  const [globalStats, setGlobalStats] = useState({ tvl: 0 });

  const [cryptos, setCryptos] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline');
  const [status, setStatus] = useState({ market: 'loading' });
  const [imgError, setImgError] = useState<any>({});

  const [allEtfData, setAllEtfData] = useState<any>({ BTC: [], ETH: [], SOL: [] });
  const [marketMetrics, setMarketMetrics] = useState<any>({ prices: [], oi: [], funding: [] });
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');

  const fetchChart = async (coinId: string, range: string) => {
    try {
      let days = '1';
      if (range === '1W') days = '7'; if (range === '1M') days = '30';
      if (range === '1Y') days = '365'; if (range === 'ALL') days = 'max';
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.prices) {
        const baseline = data.prices.length > 0 ? data.prices[0][1] : 0;
        return data.prices.map((p:any, i:number) => ({
          time: range === '1D' ? new Date(p[0]).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : new Date(p[0]).toLocaleDateString(),
          fullTime: new Date(p[0]).toLocaleString(),
          price: p[1] || 0,
          volume: (data.total_volumes && data.total_volumes[i]) ? data.total_volumes[i][1] : 0,
          baseline
        }));
      }
      return [];
    } catch (e) { return []; }
  };

  const fetchMarket = useCallback(async () => {
    setStatus(prev => ({...prev, market: 'loading'}));
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      if (res.status === 429) { setStatus(prev => ({...prev, market: 'error'})); return; }
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const chart = await fetchChart(data[0].id, '1D');
      const processed = data.map((c, i) => ({ ...c, symbol: c.symbol.toUpperCase(), chartData: i === 0 ? chart : [] }));
      setCryptos(processed);
      if (!selectedCoin) setSelectedCoin(processed[0]);
      setStatus(prev => ({...prev, market: 'success'}));
    } catch (e) { setStatus(prev => ({...prev, market: 'error'})); }
  }, [selectedCoin]);

  const handleSelectCoin = async (coin: any) => {
    if (!coin.chartData || coin.chartData.length === 0) {
      const chart = await fetchChart(coin.id, timeRange);
      const updatedCoin = { ...coin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else { setSelectedCoin(coin); }
  };

  const handleTimeChange = async (range: string) => {
    setTimeRange(range);
    if (selectedCoin) {
      const chart = await fetchChart(selectedCoin.id, range);
      const updatedCoin = { ...selectedCoin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === selectedCoin.id ? updatedCoin : c));
    }
  };

  const getGradientOffset = (data: any[]) => {
    if (!data || data.length === 0) return 0;
    const max = Math.max(...data.map(i => i.price));
    const min = Math.min(...data.map(i => i.price));
    const baseline = data[0].baseline;
    if (max <= min) return 0;
    if (baseline >= max) return 0;
    if (baseline <= min) return 1;
    return (max - baseline) / (max - min);
  };

  const initETF = async () => {
      try {
        const [btcFlow, ethFlow, solFlow, marketDataRes] = await Promise.all([
            fetch('/api/etf-flow?type=BTC').then(r => r.json()).catch(()=>[]),
            fetch('/api/etf-flow?type=ETH').then(r => r.json()).catch(()=>[]),
            fetch('/api/etf-flow?type=SOL').then(r => r.json()).catch(()=>[]),
            fetch('/api/market-data').then(r => r.json()).catch(()=>({prices:[], oi:[], funding:[]}))
        ]);
        setAllEtfData({ BTC: Array.isArray(btcFlow)?btcFlow:[], ETH: Array.isArray(ethFlow)?ethFlow:[], SOL: Array.isArray(solFlow)?solFlow:[] });
        setMarketMetrics({ prices: marketDataRes.prices||[], oi: marketDataRes.oi||[], funding: marketDataRes.funding||[] });
      } catch(e) {}
  };

  useEffect(() => {
    fetchMarket();
    initETF();
    fetch('https://api.llama.fi/v2/chains').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setGlobalStats({ tvl: d.reduce((a, b) => a + (b.tvl || 0), 0) }); }).catch(()=>{});
  }, []);

  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData || []) : 0;
  const maxVolume = selectedCoin?.chartData ? Math.max(...selectedCoin.chartData.map((d:any) => d.volume || 0)) : 0;

  const etfTable = useMemo(() => {
    const rows = allEtfData[etfTicker] || [];
    if (!rows.length) return null;
    const sample = rows[0];
    const fundTickers = Object.keys(sample).filter(k => k !== 'date' && k !== 'total');
    return { headers: ["Ngày", ...fundTickers, "TỔNG ($M)"], rows, fundTickers };
  }, [allEtfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className} pb-10`}>
      <div className="bg-[#0B0E14] text-slate-400 text-[11px] py-2 border-b border-slate-800 px-4 flex justify-between items-center">
         <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500"/> Global TVL: <span className="text-white font-bold">{formatCompact(globalStats.tvl)}</span></span>
            <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
         </div>
         <div className="flex items-center gap-2"><span>VNMetrics System</span><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div></div>
      </div>
      <nav className="bg-[#0B0E14]/95 border-b border-slate-800 sticky top-0 z-50 shadow-sm px-4 h-16 flex justify-between items-center backdrop-blur-md">
         <div className="flex items-center gap-2 font-extrabold text-xl text-white"><Zap size={24} className="text-blue-600"/> VNMetrics<span className="text-slate-500 font-normal">.io</span></div>
         <div className="hidden md:flex bg-[#151921] p-1 rounded-lg border border-slate-800">
            {[{id:'MARKET',l:'Thị trường'},{id:'ETF',l:'Smart Money'}, {id:'METALS', l:'Vàng & Bạc'}].map(t => (
               <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-5 py-1.5 text-sm font-bold rounded-md capitalize transition-all ${activeTab===t.id ? 'bg-[#252A33] text-white shadow ring-1 ring-slate-700' : 'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}>{t.l}</button>
            ))}
         </div>
         <div className="flex gap-3">
            <button onClick={() => setCurrency(currency==='USD'?'VND':'USD')} className="px-3 py-1.5 bg-[#151921] rounded-lg text-xs font-bold border border-slate-800 w-16 hover:bg-[#1E2329] text-white transition">{currency}</button>
            <button className="bg-blue-600 text-white px-5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700"><Lock size={14}/> Login</button>
         </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
      
      {activeTab === 'MARKET' && (
        <div className="animate-in fade-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
             {status.market === 'error' ? <div className="col-span-5 text-center text-rose-500 py-4"><ServerCrash className="mx-auto mb-2"/>Lỗi kết nối CoinGecko.</div> :
             cryptos.slice(0, 5).map(c => {
                const isUp = (c.price_change_percentage_24h || 0) >= 0;
                return (
                  <div key={c.id} onClick={() => handleSelectCoin(c)} 
                       className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 
                       ${selectedCoin?.id===c.id ? 'bg-[#1E2329] border-blue-500 ring-1 ring-blue-500' : 'bg-[#151921] border-slate-800 hover:border-slate-700'}`}>
                     <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-sm text-slate-300">{c.symbol}</span>
                        <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                           {isUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{Math.abs(c.price_change_percentage_24h || 0).toFixed(2)}%
                        </span>
                     </div>
                     <div className={`text-lg font-bold ${jetbrainsMono.className} text-white`}>{formatPrice(c.current_price, currency)}</div>
                  </div>
                );
             })}
          </div>

          {selectedCoin && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-[#151921] p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col min-h-[550px]">
                  <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                       <img src={selectedCoin.image} className="w-14 h-14 rounded-full border border-slate-700 p-1" onError={() => setImgError({...imgError, [selectedCoin.symbol]: true})}/>
                       <div>
                         <h2 className="text-3xl font-black text-white">{selectedCoin.name}</h2>
                         <div className="flex items-center gap-3 mt-1"><span className={`text-2xl font-bold ${jetbrainsMono.className} text-slate-200`}>{formatPrice(selectedCoin.current_price, currency)}</span></div>
                       </div>
                    </div>
                    <div className="flex gap-2 items-end flex-col sm:flex-row">
                        <div className="flex bg-[#0B0E14] rounded-lg p-1 border border-slate-800">
                          <button onClick={() => setChartType('baseline')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='baseline'?'bg-[#1E2329] text-blue-400 border border-slate-700':'text-slate-500 hover:text-white'}`}>Baseline</button>
                          <button onClick={() => setChartType('mountain')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='mountain'?'bg-[#1E2329] text-blue-400 border border-slate-700':'text-slate-500 hover:text-white'}`}>Mountain</button>
                        </div>
                        <div className="flex bg-[#0B0E14] rounded-lg p-1 border border-slate-800">
                           {['1D','1W','1M','1Y','ALL'].map((r) => <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1.5 text-xs font-bold rounded transition ${timeRange===r?'bg-[#1E2329] text-blue-400 border border-slate-700':'text-slate-500 hover:text-white'}`}>{r}</button>)}
                        </div>
                    </div>
                  </div>
                  <div className="flex-grow w-full relative min-h-[400px]">
                      {(!selectedCoin.chartData || selectedCoin.chartData.length === 0) ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500"><Activity className="mb-2 animate-bounce"/> Đang tải biểu đồ...</div>
                      ) : (
                         <ResponsiveContainer width="100%" height="100%">
                           <ComposedChart data={selectedCoin.chartData}>
                             <defs>
                               <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} /></linearGradient>
                               <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={1} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={1} /></linearGradient>
                               <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2B313F" opacity={0.5} />
                             <XAxis dataKey="time" tick={{fontSize:10, fill:'#64748B'}} axisLine={false} tickLine={false} minTickGap={40}/>
                             <YAxis yAxisId="price" orientation="right" domain={['auto', 'auto']} tick={{fontSize:11, fontFamily:'monospace', fill:'#64748B'}} tickFormatter={(val) => currency === 'VND' ? '' : val.toLocaleString()} axisLine={false} tickLine={false}/>
                             <YAxis yAxisId="volume" orientation="left" domain={[0, maxVolume * 5]} hide />
                             <Bar yAxisId="volume" dataKey="volume" fill="#1E293B" barSize={4} radius={[2, 2, 0, 0]} />
                             <Tooltip contentStyle={{backgroundColor: '#0F111A', borderColor: '#334155'}} itemStyle={{color: '#E2E8F0'}}
                                 content={({ active, payload }) => {
                                 if (active && payload && payload.length && payload[0].payload) {
                                     const d = payload[0].payload;
                                     return (
                                         <div className="bg-[#0B0E14] border border-slate-700 p-3 rounded-lg shadow-xl text-xs min-w-[180px] z-50">
                                             <div className="text-slate-400 mb-2 flex items-center gap-2"><Clock size={12}/>{d.fullTime}</div>
                                             <div className="text-white font-bold mb-1">Price: {formatPrice(d.price, currency)}</div>
                                             <div className="text-slate-300">Vol: {formatCompact(d.volume)}</div>
                                         </div>
                                     );
                                 }
                                 return null;
                             }} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
                             {chartType === 'baseline' ? (
                                <>
                                  <ReferenceLine yAxisId="price" y={selectedCoin.chartData[0].baseline} stroke="#475569" strokeDasharray="3 3" />
                                  <Area yAxisId="price" type="monotone" dataKey="price" baseValue={selectedCoin.chartData[0].baseline} stroke="url(#splitStroke)" fill="url(#splitFill)" strokeWidth={2} dot={false} />
                                </>
                             ) : (
                                <Area yAxisId="price" type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#colorMountain)" strokeWidth={2} dot={false} />
                             )}
                           </ComposedChart>
                         </ResponsiveContainer>
                      )}
                  </div>
                </div>
                
                <div className="lg:col-span-1 space-y-4">
                   <div className="bg-[#151921] p-5 rounded-2xl border border-slate-800 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Market Overview</h3>
                      <div className="space-y-3">
                         {[{l:'Market Cap', v: selectedCoin.market_cap}, {l:'Volume (24h)', v: selectedCoin.total_volume}, {l:'FDV', v: selectedCoin.fully_diluted_valuation || selectedCoin.market_cap * 1.1}].map((i,x) => (
                             <div key={x} className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                                <span className="text-slate-500">{i.l}</span>
                                <span className={`font-bold text-slate-200 ${jetbrainsMono.className}`}>{formatCompact(i.v)}</span>
                             </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-[#151921] p-5 rounded-2xl border border-slate-800 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Database size={16}/> Supply Stats</h3>
                      <div className="space-y-4">
                         <div>
                            <div className="flex justify-between items-center text-xs text-slate-500 mb-1"><span>Circulating</span><span>{selectedCoin.total_supply ? ((selectedCoin.circulating_supply / selectedCoin.total_supply)*100).toFixed(0) : 100}%</span></div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{width: `${selectedCoin.total_supply ? (selectedCoin.circulating_supply / selectedCoin.total_supply) * 100 : 100}%`}}></div></div>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Total Supply</span>
                            <span className={`font-bold text-slate-200 ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.total_supply || selectedCoin.circulating_supply)}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          <div className="bg-[#151921] rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-slate-800"><h3 className="font-bold text-lg text-white flex items-center gap-2"><BarChart2 size={20} className="text-blue-500"/> Bảng giá chi tiết</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0B0E14] text-slate-500 font-bold uppercase text-xs">
                    <tr><th className="px-6 py-4">Tài sản</th><th className="px-6 py-4 text-right">Giá</th><th className="px-6 py-4 text-right">Biến động</th><th className="px-6 py-4 text-right">Market Cap</th><th className="px-6 py-4 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cryptos.map((coin) => (
                      <tr key={coin.id} onClick={() => handleSelectCoin(coin)} className={`hover:bg-white/5 cursor-pointer transition ${selectedCoin?.id === coin.id ? 'bg-blue-900/20' : ''}`}>
                        <td className="px-6 py-4 font-bold text-slate-200 flex items-center gap-3"><img src={coin.image} className="w-8 h-8 rounded-full border border-slate-700"/>{coin.name}</td>
                        <td className={`px-6 py-4 text-right font-bold text-slate-200 ${jetbrainsMono.className}`}>{formatPrice(coin.current_price, currency)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${(coin.price_change_percentage_24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(coin.price_change_percentage_24h || 0).toFixed(2)}%</td>
                        <td className={`px-6 py-4 text-right text-slate-400 ${jetbrainsMono.className}`}>{formatCompact(coin.market_cap)}</td>
                        <td className="px-6 py-4 text-right"><button className="text-xs bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 px-3 py-1.5 rounded font-bold transition flex items-center gap-1 ml-auto"><Eye size={12}/> Xem</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      )}

      {activeTab === 'ETF' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
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
                                {etfTable?.fundTickers.map((ticker:string) => (<th key={ticker} className="p-3 border-b border-slate-800 text-right">{ticker}</th>))}
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
                </div>
            </div>
        </div>
      )}

      {activeTab === 'METALS' && (
        <div className="animate-in fade-in">
            <MetalDashboard />
        </div>
      )}
      </main>
    </div>
  );
}
