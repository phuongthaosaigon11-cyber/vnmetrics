'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  BarChart2, Lock, Eye, Globe, TrendingUp, Clock, Repeat, Landmark, Wallet, Activity, Server, 
  HelpCircle, ChevronDown, ChevronUp, AlertTriangle, Droplets, Database, Info, Flame, Layers
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const EXCHANGE_RATE = 25450; 

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [etfs, setEtfs] = useState([]);
  const [dexs, setDexs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [activeTab, setActiveTab] = useState('market'); 
  const [currency, setCurrency] = useState('USD');
  const [globalStats, setGlobalStats] = useState({ tvl: 0, btcDom: 58.2, ethGas: 12 });
  const [chartType, setChartType] = useState('baseline'); 
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({});
  const [status, setStatus] = useState({ etf: 'loading', dex: 'loading' });

  // --- FORMATTERS ---
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0.00';
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price * EXCHANGE_RATE);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  };

  const formatCompact = (number) => {
    if (!number || isNaN(number)) return '-';
    let val = number; let pre = '$';
    if (currency === 'VND') { val = number * EXCHANGE_RATE; pre = '₫'; }
    if (val >= 1e12) return pre + (val/1e12).toFixed(2) + "T";
    if (val >= 1e9) return pre + (val/1e9).toFixed(2) + "B";
    if (val >= 1e6) return pre + (val/1e6).toFixed(2) + "M";
    return pre + val.toLocaleString();
  };

  // --- FETCH CHART (Client-side Direct) ---
  const fetchChart = async (coinId, range) => {
    try {
        let days = '1';
        if (range === '1W') days = '7';
        if (range === '1M') days = '30';
        if (range === '1Y') days = '365';
        if (range === 'ALL') days = 'max';

        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
        const data = await res.json();
        
        if (data.prices && data.prices.length > 0) {
            const baseline = data.prices[0][1];
            return data.prices.map((p, i) => ({
                time: range === '1D' ? new Date(p[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(p[0]).toLocaleDateString([], {day: '2-digit', month:'2-digit'}),
                fullTime: new Date(p[0]).toLocaleString(),
                price: p[1],
                volume: data.total_volumes[i] ? data.total_volumes[i][1] : 0,
                baseline: baseline
            }));
        }
        return [];
    } catch (e) { return []; }
  };

  // --- MAIN DATA FETCHING ---
  const fetchAllData = async () => {
    setLoading(true);

    // 1. MARKET (CoinGecko)
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      const cgData = await cgRes.json();
      if (Array.isArray(cgData)) {
          const firstChart = await fetchChart(cgData[0].id, timeRange);
          const processed = cgData.map((coin, idx) => ({ ...coin, symbol: coin.symbol.toUpperCase(), chartData: idx === 0 ? firstChart : [] }));
          setCryptos(processed);
          if (!selectedCoin) setSelectedCoin(processed[0]);
      }
    } catch (e) { console.error("Market Err"); }

    // 2. ETF (Strategy: Local Proxy -> Fail -> Public Proxy)
    try {
       setStatus(prev => ({...prev, etf: 'loading'}));
       // Thử Proxy nhà làm
       let etfRes = await fetch('/api/proxy?type=coinglass');
       
       // Nếu lỗi, thử Proxy công cộng (Cứu cánh cuối cùng)
       if (!etfRes.ok) {
          etfRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://capi.coinglass.com/api/etf/flow')}`);
       }

       if (etfRes.ok) {
           const etfJson = await etfRes.json();
           if (etfJson.data) {
               const target = ['IBIT', 'FBTC', 'ARKB', 'BITB', 'HODL', 'BRRR', 'EZBC'];
               setEtfs(etfJson.data.filter(i => target.includes(i.ticker)));
               setStatus(prev => ({...prev, etf: 'success'}));
           } else { setStatus(prev => ({...prev, etf: 'empty'})); }
       } else { setStatus(prev => ({...prev, etf: 'error'})); }
    } catch (e) { setStatus(prev => ({...prev, etf: 'error'})); }

    // 3. DEX (Direct Call - DefiLlama cho phép CORS)
    try {
       setStatus(prev => ({...prev, dex: 'loading'}));
       const dexRes = await fetch('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume');
       const dexData = await dexRes.json();
       if (dexData.protocols) {
           setDexs(dexData.protocols.sort((a,b) => (b.total24h||0) - (a.total24h||0)).slice(0, 15));
           setStatus(prev => ({...prev, dex: 'success'}));
       }
    } catch (e) { setStatus(prev => ({...prev, dex: 'error'})); }

    // 4. TVL & Globals
    try {
      const tvlRes = await fetch('https://api.llama.fi/v2/chains');
      const tvlData = await tvlRes.json();
      setGlobalStats(prev => ({ ...prev, tvl: tvlData.reduce((a, b) => a + (b.tvl || 0), 0) }));
    } catch (e) {}

    setLoading(false);
  };

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);
    fetchAllData();
  }, []);

  // --- HANDLERS & HELPERS ---
  const handleSelectCoin = async (coin) => {
    if (!coin.chartData || coin.chartData.length === 0) {
      const chart = await fetchChart(coin.id, timeRange);
      const updatedCoin = { ...coin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else { setSelectedCoin(coin); }
  };

  const handleTimeChange = async (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const chart = await fetchChart(selectedCoin.id, range);
      const updatedCoin = { ...selectedCoin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === selectedCoin.id ? updatedCoin : c));
    }
  };

  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const max = Math.max(...data.map((i) => i.price));
    const min = Math.min(...data.map((i) => i.price));
    if (max <= min) return 0;
    return (max - data[0].baseline) / (max - min);
  };

  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData || []) : 0;
  const maxVolume = selectedCoin?.chartData ? Math.max(...selectedCoin.chartData.map(d => d.volume)) : 0;

  const faqs = [
    { question: "Dữ liệu trên VNMetrics có chính xác không?", answer: "Dữ liệu được tổng hợp thời gian thực từ các nguồn uy tín như CoinGecko, Binance, DefiLlama và CoinGlass. Tuy nhiên, mọi thông tin chỉ mang tính tham khảo." },
    { question: "Tôi có thể giao dịch trực tiếp không?", answer: "Không. VNMetrics chỉ là nền tảng cung cấp thông tin. Chúng tôi không cung cấp dịch vụ môi giới hay giữ tiền của người dùng." },
    { question: "Pháp lý về tài sản số tại Việt Nam?", answer: "Theo Nghị quyết 05/2025/NQ-CP, tài sản số đang trong giai đoạn thí điểm quản lý. Nhà đầu tư cần tuân thủ các quy định hiện hành." }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f111a] border border-[#2B313F] p-3 rounded-lg shadow-xl text-xs min-w-[180px] z-50 backdrop-blur-md">
          <div className="text-slate-400 mb-2 flex items-center gap-2"><Clock size={12}/>{data.fullTime}</div>
          <div className="flex justify-between items-center mb-1 gap-4">
             <span className="text-slate-400">Price</span>
             <span className={`text-white font-bold ${jetbrainsMono.className}`}>{formatPrice(data.price)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
             <span className="text-slate-400">Vol</span>
             <span className={`text-slate-300 font-bold ${jetbrainsMono.className}`}>{formatCompact(data.volume)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 flex justify-between items-center animate-in slide-in-from-bottom">
          <div className="text-sm text-slate-600"><ShieldAlert size={18} className="inline mr-2 text-blue-600"/><strong>Cảnh báo rủi ro:</strong> VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP. Dữ liệu chỉ mang tính tham khảo.</div>
          <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
        </div>
      )}

      {/* TOP BAR - PRO LOOK */}
      <div className="bg-[#0B0E14] text-slate-400 text-[11px] py-2 border-b border-slate-800 px-4 flex flex-wrap justify-between gap-4">
         <div className="flex gap-6 items-center">
            <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500"/> Global TVL: <span className="text-white font-bold">${formatCompact(globalStats.tvl)}</span></span>
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-orange-500"/> BTC Dom: <span className="text-white font-bold">{globalStats.btcDom}%</span></span>
            <span className="flex items-center gap-1.5"><Flame size={12} className="text-red-500"/> ETH Gas: <span className="text-white font-bold">{globalStats.ethGas} Gwei</span></span>
         </div>
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>System Operational</div>
         </div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm px-4 h-16 flex justify-between items-center backdrop-blur-md bg-white/90">
         <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900 tracking-tight"><Zap size={24} className="text-blue-600 fill-blue-600"/> VNMetrics<span className="text-slate-300 font-normal">.io</span></div>
         <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {['market', 'etf', 'dex'].map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-1.5 text-sm font-bold rounded-md capitalize transition-all ${activeTab===t ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>{t === 'etf' ? 'ETF Tracker' : t === 'dex' ? 'DEX Volume' : 'Thị trường'}</button>
            ))}
         </div>
         <div className="flex gap-3">
            <button onClick={() => setCurrency(currency==='USD'?'VND':'USD')} className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold border border-slate-200 w-16 hover:bg-slate-100 transition shadow-sm">{currency}</button>
            <button className="bg-[#0B0E14] text-white px-5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-md"><Lock size={14}/> Login</button>
         </div>
      </nav>

      {/* --- CONTENT AREA --- */}
      {activeTab === 'market' && (
        <>
          <div className="bg-white border-b py-8 px-4 bg-gradient-to-b from-white to-slate-50/50">
             <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider"><Activity size={14}/> Top Assets</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {cryptos.slice(0, 5).map(c => {
                    const isUp = c.price_change_percentage_24h >= 0;
                    return (
                        <div key={c.id} onClick={() => handleSelectCoin(c)} 
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 
                            ${selectedCoin?.id===c.id ? 'ring-2 ring-blue-500 shadow-blue-100 bg-white' : 'hover:shadow-lg bg-white/80'}
                            ${isUp ? 'border-green-100' : 'border-red-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <img src={c.image} className="w-5 h-5 rounded-full"/>
                                    <span className="font-bold text-sm text-slate-700">{c.symbol}</span>
                                </div>
                                <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {isUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                                    {Math.abs(c.price_change_percentage_24h).toFixed(2)}%
                                </span>
                            </div>
                            <div className={`text-lg font-bold ${jetbrainsMono.className} text-slate-900`}>{formatPrice(c.current_price)}</div>
                        </div>
                    );
                    })}
                </div>
             </div>
          </div>

          {selectedCoin && (
             <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CHART */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[550px]">
                  <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                       <img src={selectedCoin.image} className="w-14 h-14 rounded-full border p-1 bg-white shadow-sm"/>
                       <div>
                         <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                         <div className="flex items-center gap-3 mt-1">
                            <span className={`text-2xl font-bold ${jetbrainsMono.className} text-slate-900`}>{formatPrice(selectedCoin.current_price)}</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-bold ${selectedCoin.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedCoin.price_change_percentage_24h?.toFixed(2)}%</span>
                         </div>
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <div className="flex bg-slate-50 rounded-lg p-1 border">
                          <button onClick={() => setChartType('baseline')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='baseline'?'bg-white shadow text-blue-600':'text-slate-500'}`}>Standard</button>
                          <button onClick={() => setChartType('mountain')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='mountain'?'bg-white shadow text-blue-600':'text-slate-500'}`}>Mountain</button>
                       </div>
                       <div className="flex bg-slate-50 rounded-lg p-1 border">
                          {['1D','1W','1M','1Y','ALL'].map((r) => <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1.5 text-xs font-bold rounded transition ${timeRange===r?'bg-white shadow text-blue-600':'text-slate-500'}`}>{r}</button>)}
                       </div>
                    </div>
                  </div>

                  <div className="flex-grow w-full relative min-h-[400px]">
                     {(!selectedCoin.chartData || selectedCoin.chartData.length === 0) ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400"><Activity className="mb-2 animate-bounce"/> Đang tải dữ liệu...</div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={selectedCoin.chartData}>
                            <defs>
                              <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} /></linearGradient>
                              <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={1} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={1} /></linearGradient>
                              <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="time" tick={{fontSize:10, fill:'#94A3B8'}} axisLine={false} tickLine={false} minTickGap={40}/>
                            <YAxis yAxisId="price" orientation="right" domain={['auto', 'auto']} tick={{fontSize:11, fontFamily:'monospace', fill:'#64748B'}} tickFormatter={(val) => currency === 'VND' ? '' : val.toLocaleString()} axisLine={false} tickLine={false}/>
                            <YAxis yAxisId="volume" orientation="left" domain={[0, maxVolume * 5]} hide />
                            <Bar yAxisId="volume" dataKey="volume" fill="#E2E8F0" barSize={4} radius={[2, 2, 0, 0]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8', strokeDasharray: '4 4' }} />
                            {chartType === 'baseline' ? (
                               <>
                                 <ReferenceLine yAxisId="price" y={selectedCoin.chartData[0].baseline} stroke="#CBD5E1" strokeDasharray="3 3" />
                                 <Area yAxisId="price" type="monotone" dataKey="price" baseValue={selectedCoin.chartData[0].baseline} stroke="url(#splitStroke)" fill="url(#splitFill)" strokeWidth={2} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                               </>
                            ) : (
                               <Area yAxisId="price" type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#colorMountain)" strokeWidth={2} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                     )}
                  </div>
                </div>

                {/* STATS */}
                <div className="lg:col-span-1 space-y-4">
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Market Overview</h3>
                      <div className="space-y-3">
                         {[{l:'Market Cap', v: selectedCoin.market_cap}, {l:'Volume (24h)', v: selectedCoin.total_volume}, {l:'FDV', v: selectedCoin.fully_diluted_valuation || selectedCoin.market_cap * 1.1}].map((i,x) => (
                             <div key={x} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                <span className="text-slate-500">{i.l}</span>
                                <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>{formatCompact(i.v)}</span>
                             </div>
                         ))}
                         <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                            <span className="text-slate-500 flex items-center gap-1">Liquidity <Droplets size={12}/></span>
                            <span className={`font-bold ${selectedCoin.total_volume / selectedCoin.market_cap > 0.1 ? 'text-green-600' : 'text-orange-500'} ${jetbrainsMono.className}`}>
                               {((selectedCoin.total_volume / selectedCoin.market_cap) * 100).toFixed(2)}%
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Database size={16}/> Supply Info</h3>
                      <div className="space-y-4">
                         <div>
                            <div className="flex justify-between items-center text-xs text-slate-500 mb-1"><span>Circulating</span><span>{((selectedCoin.circulating_supply / (selectedCoin.total_supply || selectedCoin.circulating_supply))*100).toFixed(0)}%</span></div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600" style={{width: `${(selectedCoin.circulating_supply / (selectedCoin.total_supply || selectedCoin.circulating_supply)) * 100}%`}}></div></div>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Total Supply</span>
                            <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.total_supply)}</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLE */}
          <div className="max-w-7xl mx-auto px-4 mt-8 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 size={20} className="text-blue-600"/> Bảng giá chi tiết</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr><th className="px-6 py-4">Tài sản</th><th className="px-6 py-4 text-right">Giá</th><th className="px-6 py-4 text-right">Biến động</th><th className="px-6 py-4 text-right">Market Cap</th><th className="px-6 py-4 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cryptos.map((coin) => (
                      <tr key={coin.id} onClick={() => handleSelectCoin(coin)} className={`hover:bg-slate-50 cursor-pointer transition ${selectedCoin?.id === coin.id ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-6 py-4 font-bold flex items-center gap-3"><img src={coin.image} className="w-8 h-8 rounded-full border"/>{coin.name}</td>
                        <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatPrice(coin.current_price)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.price_change_percentage_24h?.toFixed(2)}%</td>
                        <td className={`px-6 py-4 text-right ${jetbrainsMono.className}`}>{formatCompact(coin.market_cap)}</td>
                        <td className="px-6 py-4 text-right"><button className="text-xs bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded font-bold transition flex items-center gap-1 ml-auto"><Eye size={12}/> Xem</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ETF TAB */}
      {activeTab === 'etf' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Landmark size={24} className="text-blue-600"/> US Spot ETF Flows (Realtime CoinGlass)</h3>
              {status.etf === 'loading' && <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>}
              {status.etf === 'error' && <div className="text-center py-10 text-red-500">Lỗi kết nối máy chủ dữ liệu ETF. Vui lòng thử lại sau.</div>}
              {status.etf === 'success' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                      <tr><th className="px-6 py-4">Ticker</th><th className="px-6 py-4">Issuer</th><th className="px-6 py-4 text-right">Price</th><th className="px-6 py-4 text-right">AUM</th><th className="px-6 py-4 text-right">Flow (Daily)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {etfs.map((etf, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold flex items-center gap-2"><div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border text-[10px]">{etf.ticker[0]}</div>{etf.ticker}</td>
                          <td className="px-6 py-4 text-slate-600">{etf.issuer || 'Unknown'}</td>
                          <td className={`px-6 py-4 text-right font-medium ${jetbrainsMono.className}`}>{formatPrice(etf.price || etf.closePrice)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatCompact(etf.aum)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${etf.flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{etf.flow > 0 ? '+' : ''}{formatCompact(etf.flow)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      )}

      {/* DEX TAB */}
      {activeTab === 'dex' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet size={24} className="text-purple-600"/> Top DEX Volume (DefiLlama Direct)</h3>
              {status.dex === 'loading' && <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>}
              {status.dex === 'error' && <div className="text-center py-10 text-red-500">Lỗi tải dữ liệu DEX.</div>}
              {status.dex === 'success' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                      <tr><th className="px-6 py-4">#</th><th className="px-6 py-4">Protocol</th><th className="px-6 py-4">Chain</th><th className="px-6 py-4 text-right">Vol 24h</th><th className="px-6 py-4 text-right">Change 1d</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dexs.map((dex, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-400 w-10">{i+1}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{dex.displayName || dex.name}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{dex.chains[0]}</td>
                          <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatCompact(dex.total24h)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${dex.change_1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dex.change_1d?.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      )}

      {/* FAQ SECTION */}
      <section className="max-w-4xl mx-auto px-4 mt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center flex items-center justify-center gap-2"><HelpCircle className="text-blue-600"/> Câu hỏi thường gặp</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50 font-bold text-slate-800">
                {faq.question}
                {openFaqIndex === idx ? <ChevronUp size={20} className="text-blue-600"/> : <ChevronDown size={20} className="text-slate-400"/>}
              </button>
              {openFaqIndex === idx && <div className="p-5 pt-0 text-sm text-slate-600 bg-white"><div className="p-4 bg-slate-50 rounded-lg border border-slate-100">{faq.answer}</div></div>}
            </div>
          ))}
        </div>
      </section>

      