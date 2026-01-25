'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, BarChart 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, Activity, Globe, Wallet, 
  Search, Menu, Clock, Calendar, BarChart2, ShieldAlert, 
  RefreshCw, TrendingUp, Layers, Info, CheckCircle2, XCircle
} from 'lucide-react';

// --- FONTS CONFIG ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// --- CONSTANTS & CONFIG ---
const EXCHANGE_RATE = 25450; 
const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=false";
const DEX_API = "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, currency: 'USD' | 'VND' = 'USD') => {
  if (value === undefined || value === null || isNaN(value)) return '-';
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value * EXCHANGE_RATE);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const formatCompact = (number: number) => {
  if (!number) return '-';
  const formatter = Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 2 });
  return formatter.format(number);
};

const formatFlow = (val: any) => {
  if (!val) return <span className="text-slate-600">-</span>;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return <span className="text-slate-600">-</span>;
  const isPos = num > 0;
  return (
    <span className={`${isPos ? 'text-emerald-400' : 'text-rose-500'} font-bold font-mono`}>
      {num > 0 ? '+' : ''}{num.toLocaleString()}
    </span>
  );
};

// --- COMPONENT CHÍNH ---
export default function VNMetricsDashboard() {
  // 1. STATE MANAGEMENT
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF' | 'DEX'>('MARKET');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  
  // Data States
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [dexs, setDexs] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState({ tvl: 0, btcDom: 0 });
  
  // ETF Specifics
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [chartTimeRange, setChartTimeRange] = useState('1D');
  const [chartLoading, setChartLoading] = useState(false);

  // 2. DATA FETCHING
  // Fetch Market List (CoinGecko)
  const fetchMarket = async () => {
    try {
      const res = await fetch(COINGECKO_API);
      if (!res.ok) throw new Error('Limit Rate');
      const data = await res.json();
      setCryptos(data);
      if (!selectedCoin && data.length > 0) {
        handleSelectCoin(data[0]); // Auto select BTC initially
      }
    } catch (e) {
      console.error("Market fetch error", e);
    }
  };

  // Fetch Coin Detail Chart
  const fetchCoinChart = async (coinId: string, range: string) => {
    setChartLoading(true);
    try {
      let days = '1';
      if (range === '1W') days = '7';
      if (range === '1M') days = '30';
      if (range === '1Y') days = '365';
      
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
      const data = await res.json();
      
      if (data.prices) {
        const formattedChart = data.prices.map((p: any, i: number) => ({
          time: new Date(p[0]).toLocaleDateString(),
          fullTime: new Date(p[0]).toLocaleString(),
          price: p[1],
          volume: data.total_volumes[i] ? data.total_volumes[i][1] : 0
        }));
        return formattedChart;
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setChartLoading(false);
    }
  };

  // Fetch ETF Data (Local JSON)
  const fetchETF = async () => {
    try {
      const res = await fetch(`/etf_data.json?t=${Date.now()}`); // Cache busting
      const json = await res.json();
      setEtfData(json);
    } catch (e) { console.error("ETF fetch error", e); }
  };

  // Fetch DEX Data
  const fetchDEX = async () => {
    try {
      const res = await fetch(DEX_API);
      const json = await res.json();
      if (json.protocols) {
        setDexs(json.protocols.sort((a:any, b:any) => (b.total24h||0) - (a.total24h||0)).slice(0, 15));
      }
    } catch (e) { console.error("DEX fetch error", e); }
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMarket(), fetchETF(), fetchDEX()]);
      setLoading(false);
    };
    init();
  }, []);

  // 3. HANDLERS
  const handleSelectCoin = async (coin: any) => {
    setSelectedCoin({ ...coin, chartData: [] }); // Reset chart temp
    const chart = await fetchCoinChart(coin.id, chartTimeRange);
    setSelectedCoin({ ...coin, chartData: chart });
  };

  const handleTimeChange = async (range: string) => {
    setChartTimeRange(range);
    if (selectedCoin) {
      const chart = await fetchCoinChart(selectedCoin.id, range);
      setSelectedCoin({ ...selectedCoin, chartData: chart });
    }
  };

  // 4. CHART HELPERS
  const getETFChartData = useMemo(() => {
    if (!etfData || !etfData[etfTicker]?.rows) return [];
    // Lấy 30 ngày gần nhất
    const rows = [...etfData[etfTicker].rows].reverse().slice(0, 30).reverse(); 
    return rows.map((r: any) => {
        // Giả sử row[0] là Date, row[row.length-1] là Total Flow (Tuỳ cấu trúc JSON của bạn)
        // Dựa trên file JSON bạn cung cấp: Last column thường là total
        const flowVal = parseFloat(String(r.Total).replace(/,/g, '')) || 0;
        return {
            date: r.Date.split(' ').slice(0, 2).join(' '),
            flow: flowVal
        };
    });
  }, [etfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-300 ${inter.className} selection:bg-blue-500/30`}>
      
      {/* --- TOP BAR --- */}
      <div className="h-9 bg-[#07090D] border-b border-slate-800 flex items-center justify-between px-4 text-[11px] font-medium">
        <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-blue-400"><Globe size={12}/> VNMetrics Ecosystem</span>
            <span className="hidden md:inline text-slate-500">BTC Dominance: <span className="text-slate-300">52.4%</span></span>
            <span className="hidden md:inline text-slate-500">ETH Gas: <span className="text-slate-300">12 Gwei</span></span>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-500"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Operational</div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">USD/VND: {EXCHANGE_RATE.toLocaleString()}</span>
        </div>
      </div>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Zap className="text-white fill-current" size={18}/>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white leading-none tracking-tight">VN<span className="text-blue-500">Metrics</span></h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Crypto Data Terminal</p>
                </div>
            </div>

            <nav className="hidden md:flex bg-[#151921] p-1 rounded-lg border border-slate-800">
                {[
                    {id: 'MARKET', label: 'Thị trường', icon: Activity},
                    {id: 'ETF', label: 'ETF Flows', icon: BarChart2},
                    {id: 'DEX', label: 'DEX Volume', icon: Layers}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-[#252A33] text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}
                    >
                        <tab.icon size={14}/> {tab.label}
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-3">
                <button onClick={() => setCurrency(currency === 'USD' ? 'VND' : 'USD')} className="px-3 py-1.5 bg-[#151921] hover:bg-[#1E2329] border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors w-14">
                    {currency}
                </button>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-600/20">Connect Wallet</button>
            </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        
        {/* === TAB 1: MARKET & CHART === */}
        {activeTab === 'MARKET' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left: Coin List */}
                <div className="xl:col-span-4 flex flex-col gap-4 h-[calc(100vh-140px)] overflow-hidden">
                    <div className="bg-[#151921] border border-slate-800 rounded-xl p-4 flex flex-col h-full">
                        <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 flex justify-between">
                            <span>Assets Ranking</span>
                            <span className="text-slate-600">Top 10 by Market Cap</span>
                        </h3>
                        <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
                            {loading ? <div className="text-center text-slate-500 py-10">Loading Data...</div> : 
                            cryptos.map(coin => (
                                <div 
                                    key={coin.id}
                                    onClick={() => handleSelectCoin(coin)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${selectedCoin?.id === coin.id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[#1E2329]/50 border-transparent hover:bg-[#1E2329] hover:border-slate-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <div className={`font-bold text-sm ${selectedCoin?.id === coin.id ? 'text-white' : 'text-slate-300'}`}>{coin.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{coin.symbol.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold font-mono ${selectedCoin?.id === coin.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {formatCurrency(coin.current_price, currency)}
                                        </div>
                                        <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                                            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Chart & Details */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    {selectedCoin ? (
                        <>
                            {/* Chart Card */}
                            <div className="bg-[#151921] border border-slate-800 rounded-xl p-1 shadow-2xl">
                                <div className="bg-[#0B0E14] rounded-lg p-5 border border-slate-800/50">
                                    <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                                        <div className="flex items-center gap-4">
                                            <img src={selectedCoin.image} className="w-12 h-12 rounded-full ring-2 ring-slate-800"/>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                    {selectedCoin.name} <span className="text-slate-500 text-sm bg-slate-800 px-2 py-0.5 rounded">{selectedCoin.symbol.toUpperCase()}</span>
                                                </h2>
                                                <div className="flex items-end gap-3">
                                                    <span className="text-3xl font-bold font-mono text-blue-400">{formatCurrency(selectedCoin.current_price, currency)}</span>
                                                    <span className={`text-sm font-bold mb-1.5 ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                        {selectedCoin.price_change_percentage_24h.toFixed(2)}% (24h)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 h-fit self-end md:self-auto">
                                            {['1D', '1W', '1M', '1Y'].map(range => (
                                                <button 
                                                    key={range}
                                                    onClick={() => handleTimeChange(range)}
                                                    className={`px-3 py-1 text-xs font-bold rounded transition-all ${chartTimeRange === range ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {range}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CHART AREA */}
                                    <div className="h-[400px] w-full relative">
                                        {chartLoading && (
                                            <div className="absolute inset-0 bg-[#0B0E14]/80 z-10 flex items-center justify-center">
                                                <RefreshCw className="animate-spin text-blue-500"/>
                                            </div>
                                        )}
                                        {selectedCoin.chartData && selectedCoin.chartData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={selectedCoin.chartData}>
                                                    <defs>
                                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2329" vertical={false}/>
                                                    <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748B'}} axisLine={false} tickLine={false} minTickGap={40}/>
                                                    <YAxis 
                                                        domain={['auto', 'auto']} 
                                                        tick={{fontSize: 11, fill: '#64748B', fontFamily: 'monospace'}} 
                                                        tickFormatter={(val) => currency === 'USD' ? `$${val.toLocaleString()}` : ''}
                                                        orientation="right" axisLine={false} tickLine={false}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{backgroundColor: '#151921', borderColor: '#334155', borderRadius: '8px', color: '#fff'}}
                                                        itemStyle={{color: '#fff'}}
                                                        labelStyle={{color: '#94A3B8'}}
                                                    />
                                                    <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Select a coin to view chart</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    {label: 'Market Cap', val: formatCompact(selectedCoin.market_cap), icon: Globe},
                                    {label: 'Volume (24h)', val: formatCompact(selectedCoin.total_volume), icon: Activity},
                                    {label: 'High (24h)', val: formatCurrency(selectedCoin.high_24h, currency), icon: TrendingUp},
                                    {label: 'Low (24h)', val: formatCurrency(selectedCoin.low_24h, currency), icon: TrendingUp},
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[#151921] p-4 rounded-xl border border-slate-800">
                                        <div className="text-slate-500 text-xs flex items-center gap-2 mb-2"><stat.icon size={12}/> {stat.label}</div>
                                        <div className="text-white font-bold font-mono text-lg">{stat.val}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 bg-[#151921] rounded-xl border border-slate-800 border-dashed">
                            Select an asset to view details
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* === TAB 2: ETF FLOWS === */}
        {activeTab === 'ETF' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center bg-[#151921] p-4 rounded-xl border border-slate-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">US ETF Flows Tracker <span className="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded border border-blue-600/30">LIVE</span></h2>
                        <p className="text-slate-500 text-xs mt-1">Dữ liệu được cập nhật thủ công từ Farside Investors UK</p>
                    </div>
                    <div className="flex bg-[#0B0E14] p-1 rounded-lg border border-slate-800 mt-4 md:mt-0">
                        {['BTC', 'ETH', 'SOL'].map(t => (
                            <button key={t} onClick={() => setEtfTicker(t as any)} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${etfTicker === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white'}`}>
                                {t} ETF
                            </button>
                        ))}
                    </div>
                </div>

                {/* ETF CHART */}
                <div className="bg-[#151921] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"/>
                    <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2"><BarChart2 size={16} className="text-blue-500"/> Net Inflow/Outflow (30 Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getETFChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
                                <XAxis dataKey="date" tick={{fill: '#64748B', fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#2B3139', opacity: 0.4}}
                                    content={({active, payload, label}) => {
                                        if (active && payload && payload.length) {
                                            const val = payload[0].value as number;
                                            return (
                                                <div className="bg-[#0B0E14] border border-slate-700 p-3 rounded shadow-xl">
                                                    <div className="text-slate-400 text-xs mb-1">{label}</div>
                                                    <div className={`font-bold font-mono text-sm ${val > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                        {val > 0 ? '+' : ''}{val.toLocaleString()}M
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#475569" />
                                <Bar dataKey="flow" radius={[2, 2, 0, 0]}>
                                    {getETFChartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.flow > 0 ? '#10B981' : '#F43F5E'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ETF TABLE */}
                <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#1E2329] text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    {etfData?.[etfTicker]?.headers?.map((h: string, i: number) => (
                                        <th key={i} className={`px-6 py-4 whitespace-nowrap ${i===0?'sticky left-0 bg-[#1E2329] z-20':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {etfData?.[etfTicker]?.rows?.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-[#1E2329] transition-colors">
                                        {etfData[etfTicker].headers.map((h: string, colIdx: number) => {
                                            const val = row[h];
                                            if (colIdx === 0) return (
                                                <td key={colIdx} className="px-6 py-4 font-medium text-white sticky left-0 bg-[#151921] border-r border-slate-800">{val}</td>
                                            );
                                            return (
                                                <td key={colIdx} className="px-6 py-4 font-mono text-slate-300 whitespace-nowrap">
                                                    {formatFlow(val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!etfData && <div className="p-10 text-center text-slate-500">Loading ETF Database...</div>}
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 3: DEX VOLUME === */}
        {activeTab === 'DEX' && (
            <div className="bg-[#151921] border border-slate-800 rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Layers className="text-purple-500"/> Top DEX Volume (24H)</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1"><Info size={12}/> Data source: DefiLlama API</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#1E2329] text-slate-400 font-bold text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4 text-left">#</th>
                                <th className="px-6 py-4 text-left">Protocol</th>
                                <th className="px-6 py-4 text-left">Chains</th>
                                <th className="px-6 py-4 text-right">Volume 24h</th>
                                <th className="px-6 py-4 text-right">Change 1d</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {dexs.map((dex, i) => (
                                <tr key={i} className="hover:bg-[#1E2329] transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-mono">{i + 1}</td>
                                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                        <img src={dex.logo} className="w-6 h-6 rounded-full bg-slate-700" onError={(e) => e.currentTarget.style.display='none'}/>
                                        {dex.displayName || dex.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {dex.chains.slice(0,3).map((c:string) => (
                                                <span key={c} className="bg-[#2B3139] px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-700">{c}</span>
                                            ))}
                                            {dex.chains.length > 3 && <span className="text-xs text-slate-600">+{dex.chains.length - 3}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-blue-300 font-bold">${formatCompact(dex.total24h)}</td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${(dex.change_1d||0) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                        {(dex.change_1d||0).toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- DISCLAIMER SECTION --- */}
        <div className="mt-12 bg-[#151921] border border-slate-800 p-6 rounded-xl flex gap-4 items-start opacity-70 hover:opacity-100 transition-opacity">
            <ShieldAlert className="text-amber-500 shrink-0 mt-1"/>
            <div className="text-xs text-slate-500 leading-relaxed text-justify">
                <strong className="text-amber-500 block mb-1 uppercase">Miễn trừ trách nhiệm & Pháp lý</strong>
                Thông tin tài sản mã hóa (TSMH) trình bày trên VNMetrics được tổng hợp từ các nguồn dữ liệu quốc tế (CoinGecko, Binance, DefiLlama) và chỉ nhằm mục đích tham khảo. 
                Nhà đầu tư được khuyến nghị tìm hiểu kỹ lưỡng các quy định pháp luật hiện hành (bao gồm Nghị quyết 05/2025/NQ-CP về thí điểm quản lý tài sản số) cũng như những rủi ro liên quan trước khi tham gia bất kỳ hoạt động đầu tư nào. 
                VNMetrics không cung cấp dịch vụ giao dịch, môi giới hay đưa ra bất kỳ lời khuyên đầu tư nào.
            </div>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-[#07090D] py-8 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
                <Zap size={14} className="text-blue-600"/> 
                <span>&copy; 2026 VNMetrics. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
                <span>Terms of Service</span>
                <span>Privacy Policy</span>
                <span>API Status</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> System Normal
            </div>
        </div>
      </footer>
    </div>
  );
}