'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, BarChart 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, Activity, Globe, Wallet, 
  Search, Menu, BarChart2, ShieldAlert, 
  RefreshCw, TrendingUp, Layers, Info, BrainCircuit
} from 'lucide-react';

// IMPORT COMPONENT MỚI
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

// --- FONTS CONFIG ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// --- CONSTANTS ---
const EXCHANGE_RATE = 25450; 
const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=false";
const DEX_API = "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";

// --- HELPERS (ĐÃ SỬA FORMAT SỐ) ---
const formatCurrency = (value: number, currency: 'USD' | 'VND' = 'USD') => {
  if (value === undefined || value === null || isNaN(value)) return '-';
  // Luôn dùng en-US để có dấu phẩy: 1,000,000
  if (currency === 'VND') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value * EXCHANGE_RATE).replace('₫', ' VND');
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
  // Format số thường: 123,456.78
  const niceNum = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(num);
  
  return (
    <span className={`${isPos ? 'text-emerald-400' : 'text-rose-400'} font-bold font-mono`}>
      {num > 0 ? '+' : ''}{niceNum}
    </span>
  );
};

// --- COMPONENT CHÍNH ---
export default function VNMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF' | 'DEX'>('MARKET');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  
  // Data States
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [dexs, setDexs] = useState<any[]>([]);
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [chartTimeRange, setChartTimeRange] = useState('1D');
  const [chartLoading, setChartLoading] = useState(false);

  // FETCH DATA
  const fetchMarket = async () => {
    try {
      const res = await fetch(COINGECKO_API);
      if (!res.ok) throw new Error('Limit Rate');
      const data = await res.json();
      setCryptos(data);
      if (!selectedCoin && data.length > 0) {
        const btc = data.find((c:any) => c.symbol === 'btc') || data[0];
        handleSelectCoin(btc); 
      }
    } catch (e) { console.error("Market fetch error", e); }
  };

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
        return data.prices.map((p: any, i: number) => ({
          time: new Date(p[0]).toLocaleDateString(),
          fullTime: new Date(p[0]).toLocaleString(),
          price: p[1],
          volume: data.total_volumes[i] ? data.total_volumes[i][1] : 0
        }));
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setChartLoading(false);
    }
  };

  const fetchETF = async () => {
    try {
      const res = await fetch(`/etf_data.json?t=${Date.now()}`);
      const json = await res.json();
      setEtfData(json);
    } catch (e) { console.error("ETF fetch error", e); }
  };

  const fetchDEX = async () => {
    try {
      const res = await fetch(DEX_API);
      const json = await res.json();
      if (json.protocols) {
        setDexs(json.protocols.sort((a:any, b:any) => (b.total24h||0) - (a.total24h||0)).slice(0, 15));
      }
    } catch (e) { console.error("DEX fetch error", e); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMarket(), fetchETF(), fetchDEX()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSelectCoin = async (coin: any) => {
    setSelectedCoin({ ...coin, chartData: [] });
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

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-300 ${inter.className} selection:bg-blue-500/30`}>
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Zap className="text-white fill-current" size={18}/>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white leading-none tracking-tight">VN<span className="text-blue-500">Metrics</span></h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Crypto Data Terminal</p>
                </div>
            </div>

            <nav className="hidden md:flex bg-[#151921] p-1 rounded-lg border border-slate-800">
                {[
                    {id: 'MARKET', label: 'Thị trường', icon: Activity},
                    {id: 'ETF', label: 'Smart Money & ETF', icon: BrainCircuit},
                    {id: 'DEX', label: 'DEX Volume', icon: Layers}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-[#252A33] text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}
                    >
                        <tab.icon size={14}/> {tab.label}
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-3">
                <button onClick={() => setCurrency(currency === 'USD' ? 'VND' : 'USD')} className="px-3 py-1.5 bg-[#151921] hover:bg-[#1E2329] border border-slate-800 rounded-lg text-xs font-bold text-slate-200 transition-colors w-14">
                    {currency}
                </button>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        
        {/* === TAB 1: MARKET === */}
        {activeTab === 'MARKET' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* List */}
                <div className="xl:col-span-4 flex flex-col gap-4 h-[calc(100vh-140px)] overflow-hidden">
                    <div className="bg-[#151921] border border-slate-800 rounded-xl p-4 flex flex-col h-full">
                        <h3 className="text-slate-300 text-xs font-bold uppercase mb-4">Assets Ranking</h3>
                        <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
                            {loading ? <div className="text-center text-slate-500 py-10">Loading...</div> : 
                            cryptos.map(coin => (
                                <div 
                                    key={coin.id}
                                    onClick={() => handleSelectCoin(coin)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${selectedCoin?.id === coin.id ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#1E2329]/50 border-transparent hover:bg-[#1E2329] hover:border-slate-700'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full"/>
                                        <div>
                                            <div className={`font-bold text-sm ${selectedCoin?.id === coin.id ? 'text-white' : 'text-slate-200'}`}>{coin.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{coin.symbol.toUpperCase()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold font-mono text-white tracking-wide">{formatCurrency(coin.current_price, currency)}</div>
                                        <div className={`text-[10px] font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {coin.price_change_percentage_24h.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Detail */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    {selectedCoin ? (
                        <div className="bg-[#151921] border border-slate-800 rounded-xl p-1 shadow-2xl h-full">
                             <div className="bg-[#0B0E14] rounded-lg p-5 border border-slate-800/50 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-4">
                                        <img src={selectedCoin.image} className="w-12 h-12 rounded-full"/>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedCoin.name}</h2>
                                            <span className="text-slate-400 text-xs font-mono">{selectedCoin.symbol.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-800">
                                        {['1D', '1W', '1M', '1Y'].map(range => (
                                            <button key={range} onClick={() => handleTimeChange(range)} className={`px-3 py-1 text-xs font-bold rounded ${chartTimeRange===range?'bg-slate-700 text-white':'text-slate-400 hover:text-slate-200'}`}>{range}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[400px]">
                                    {chartLoading && <div className="text-center pt-20 text-slate-500 flex flex-col items-center gap-2"><RefreshCw className="animate-spin"/> Loading Chart...</div>}
                                    {!chartLoading && selectedCoin.chartData && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={selectedCoin.chartData}>
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1E2329" vertical={false}/>
                                                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#9CA3AF'}} tickMargin={10}/>
                                                <YAxis orientation="right" domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#D1D5DB'}} tickFormatter={(val) => currency === 'USD' ? `$${new Intl.NumberFormat('en-US').format(val)}` : ''}/>
                                                <Tooltip 
                                                    contentStyle={{backgroundColor: '#151921', borderColor: '#334155'}}
                                                    itemStyle={{color: '#fff', fontWeight: 'bold'}}
                                                    formatter={(val:number) => [`$${new Intl.NumberFormat('en-US').format(val)}`, 'Price']}
                                                />
                                                <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} fill="url(#colorPrice)" activeDot={{r:5, stroke:'#fff'}}/>
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                             </div>
                        </div>
                    ) : <div className="text-center py-20 text-slate-500">Select a coin to view details</div>}
                </div>
            </div>
        )}

        {/* === TAB 2: ETF / SMART MONEY DASHBOARD === */}
        {activeTab === 'ETF' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: SMART MONEY DASHBOARD */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="text-purple-500"/> Market Structure Analysis</h2>
                        <SmartMoneyDashboard 
                            priceData={selectedCoin?.chartData || []} 
                            etfData={etfData} 
                        />
                    </div>

                    {/* RIGHT: ETF DATA TABLE */}
                    <div className="lg:col-span-1 bg-[#151921] border border-slate-800 rounded-xl p-4 h-fit">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <h3 className="font-bold text-white">ETF Flows (Daily)</h3>
                            <div className="flex bg-[#0B0E14] p-1 rounded border border-slate-700">
                                {['BTC', 'ETH'].map(t => (
                                    <button key={t} onClick={() => setEtfTicker(t as any)} className={`px-3 py-1 text-[10px] font-bold rounded ${etfTicker===t?'bg-blue-600 text-white':'text-slate-400 hover:text-white'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                             <table className="w-full text-xs text-left">
                                <thead className="text-slate-400 bg-[#0B0E14] sticky top-0 uppercase font-semibold">
                                    <tr><th className="p-3">Date</th><th className="p-3 text-right">Net Flow ($M)</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {etfData?.[etfTicker]?.rows?.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-[#1E2329] transition-colors">
                                            <td className="p-3 text-slate-300 font-mono">{row.Date.split(' ').slice(0,2).join(' ')}</td>
                                            <td className="p-3 text-right">{formatFlow(row.Total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                             {!etfData && <div className="text-center py-4 text-slate-500 italic">Loading Data...</div>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 3: DEX === */}
        {activeTab === 'DEX' && (
            <div className="bg-[#151921] border border-slate-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Layers className="text-emerald-500"/> DEX Volume Ranking</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0B0E14] text-slate-400 uppercase text-xs font-bold">
                            <tr><th className="p-4">#</th><th className="p-4">Protocol</th><th className="p-4 text-right">Volume 24h</th><th className="p-4 text-right">Change 1d</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {dexs.map((d, i) => (
                                <tr key={i} className="hover:bg-[#1E2329] transition-colors">
                                    <td className="p-4 text-slate-500 w-10">{i+1}</td>
                                    <td className="p-4 font-bold text-white flex items-center gap-2">
                                        <img src={d.logo} className="w-6 h-6 rounded-full bg-slate-700" onError={(e)=>e.currentTarget.style.display='none'}/>
                                        {d.displayName}
                                    </td>
                                    <td className="p-4 text-right text-blue-300 font-mono tracking-wide">${formatCompact(d.total24h)}</td>
                                    <td className={`p-4 text-right font-bold ${d.change_1d >=0 ? 'text-emerald-400':'text-rose-400'}`}>{d.change_1d?.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
