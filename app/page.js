'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  BarChart2, Lock, Eye, Globe, TrendingUp, Clock, Repeat, Landmark, Wallet, Activity, Server
} from 'lucide-react';

// --- 1. CẤU HÌNH ---
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
  const [globalStats, setGlobalStats] = useState({ tvl: 0 });
  const [chartType, setChartType] = useState('baseline'); 
  const [imgError, setImgError] = useState({});

  // --- 2. FORMATTERS ---
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0.00';
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price * EXCHANGE_RATE);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
  };

  const formatCompact = (number) => {
    if (!number || isNaN(number)) return 'N/A';
    let val = number; let pre = '$';
    if (currency === 'VND') { val = number * EXCHANGE_RATE; pre = '₫'; }
    if (val >= 1e12) return pre + (val/1e12).toFixed(2) + "T";
    if (val >= 1e9) return pre + (val/1e9).toFixed(2) + "B";
    if (val >= 1e6) return pre + (val/1e6).toFixed(2) + "M";
    return pre + val.toLocaleString();
  };

  // --- 3. CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f111a] border border-[#2B313F] p-3 rounded-lg shadow-2xl text-xs min-w-[200px] z-50 backdrop-blur-md">
          <div className="text-slate-400 mb-2 font-medium border-b border-[#2B313F] pb-2 flex items-center gap-2">
             <Clock size={12}/> {data.fullTime}
          </div>
          <div className="flex items-center justify-between gap-6">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
               <span className="text-slate-300 font-medium">Price</span>
             </div>
             <span className={`font-bold ${jetbrainsMono.className} text-white`}>
               {formatPrice(data.price)}
             </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- 4. FETCH CHART TỪ DEFILLAMA (COINS API) ---
  const fetchDefiLlamaChart = async (coinId, range) => {
    try {
      // Mapping TimeRange sang tham số DefiLlama
      let span = 48; 
      let period = '30m'; 
      let startTimestamp = Math.floor(Date.now() / 1000);

      switch(range) {
        case '1D': 
          span = 48; period = '30m'; // 48 điểm, mỗi điểm 30p = 24h
          startTimestamp -= 24 * 60 * 60; 
          break;
        case '1W': 
          span = 42; period = '4h'; // 7 ngày
          startTimestamp -= 7 * 24 * 60 * 60; 
          break;
        case '1M': 
          span = 60; period = '12h'; // 30 ngày
          startTimestamp -= 30 * 24 * 60 * 60; 
          break;
        case '1Y': 
          span = 52; period = '1w'; // 52 tuần
          startTimestamp -= 365 * 24 * 60 * 60; 
          break;
        case 'ALL':
           span = 60; period = '1w'; 
           startTimestamp -= 3 * 365 * 24 * 60 * 60;
           break;
        default: 
          span = 48; period = '30m'; startTimestamp -= 86400;
      }

      // ID DefiLlama chuẩn: coingecko:bitcoin
      const defiId = `coingecko:${coinId}`;

      // Gọi qua Proxy để an toàn
      const res = await fetch(`/api/proxy?type=defillama&coins=${defiId}&start=${startTimestamp}&span=${span}&period=${period}`);
      
      if (!res.ok) return [];

      const json = await res.json();

      // Cấu trúc trả về: { coins: { "coingecko:bitcoin": { prices: [...] } } }
      if (json && json.coins && json.coins[defiId] && json.coins[defiId].prices) {
        const rawPoints = json.coins[defiId].prices;
        if (rawPoints.length === 0) return [];

        const baseline = rawPoints[0].price;

        return rawPoints.map(p => {
           const t = new Date(p.timestamp * 1000);
           
           // Format nhãn trục X
           let timeLabel = range === '1D' ? `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
           if (range === '1Y' || range === 'ALL') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
           
           // Format Tooltip đầy đủ
           const fullTime = `${t.getDate()}/${t.getMonth()+1} ${t.getHours()}:${t.getMinutes()}`;
           
           return {
             time: timeLabel,
             fullTime: fullTime,
             price: p.price,
             baseline: baseline,
             volume: 0 // DefiLlama Chart API không trả volume, chấp nhận ẩn cột volume
           };
        });
      }
      return []; 
    } catch (e) {
      console.error("DefiLlama Chart Error:", e);
      return []; 
    }
  };

  // --- 5. INITIAL DATA ---
  const fetchAllData = async () => {
    setLoading(true);

    // 1. MARKET (CoinGecko)
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      if (!cgRes.ok) throw new Error("CoinGecko Limit");
      const cgData = await cgRes.json();
      
      const firstCoinChart = await fetchDefiLlamaChart(cgData[0].id, timeRange);
      
      const processed = cgData.map((coin, idx) => ({
        ...coin, symbol: coin.symbol.toUpperCase(),
        chartData: idx === 0 ? firstCoinChart : []
      }));
      setCryptos(processed);
      if (!selectedCoin) setSelectedCoin(processed[0]);
    } catch (e) { console.error(e); }

    // 2. ETF (CoinGlass Proxy)
    try {
       const etfRes = await fetch('/api/proxy?type=coinglass');
       const etfJson = await etfRes.json();
       if (etfJson.data) {
          const target = ['IBIT', 'FBTC', 'ARKB', 'BITB', 'HODL', 'BRRR', 'EZBC'];
          setEtfs(etfJson.data.filter(i => target.includes(i.ticker)));
       }
    } catch (e) { console.error("ETF Error"); }

    // 3. DEX (DefiLlama Public)
    try {
       const dexRes = await fetch('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume');
       const dexData = await dexRes.json();
       if (dexData.protocols) setDexs(dexData.protocols.slice(0, 15));
    } catch (e) {}

    // 4. TVL
    try {
      const tvlRes = await fetch('https://api.llama.fi/v2/chains');
      const tvlData = await tvlRes.json();
      setGlobalStats({ tvl: tvlData.reduce((a, b) => a + (b.tvl || 0), 0) });
    } catch (e) {}

    setLoading(false);
  };

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);
    fetchAllData();
  }, []);

  // --- HANDLERS ---
  const handleSelectCoin = async (coin) => {
    if (!coin.chartData || coin.chartData.length === 0) {
      const chart = await fetchDefiLlamaChart(coin.id, timeRange);
      const updatedCoin = { ...coin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else { setSelectedCoin(coin); }
  };

  const handleTimeChange = async (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const chart = await fetchDefiLlamaChart(selectedCoin.id, range);
      const updatedCoin = { ...selectedCoin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === selectedCoin.id ? updatedCoin : c));
    }
  };

  const handleImgError = (symbol) => {
    setImgError(prev => ({ ...prev, [symbol]: true }));
  };

  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const baseline = data[0].baseline;
    if (dataMax <= dataMin) return 0;
    if (baseline >= dataMax) return 0; 
    if (baseline <= dataMin) return 1; 
    return (dataMax - baseline) / (dataMax - dataMin);
  };

  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData || []) : 0;

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600"><ShieldAlert size={18} className="text-blue-600 inline mr-2"/><strong>Cảnh báo:</strong> VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP.</div>
            <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="bg-slate-900 text-slate-400 text-[11px] py-2 border-b border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-6">
               <span className="flex items-center gap-1.5"><Globe size={12}/> Global TVL: <span className="text-blue-400 font-bold">${formatCompact(globalStats.tvl)}</span></span>
               <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
            </div>
            <div className="flex gap-2 items-center"><span>DefiLlama Coins API Live</span><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div></div>
         </div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-700 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          
          <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
             {['market', 'etf', 'dex'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition capitalize ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{tab === 'etf' ? 'ETF Tracker' : tab}</button>
             ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button onClick={() => setCurrency('USD')} className={`px-3 py-1 text-xs font-bold rounded transition ${currency==='USD'?'bg-white text-green-700 shadow-sm':'text-slate-500'}`}>USD</button>
                <button onClick={() => setCurrency('VND')} className={`px-3 py-1 text-xs font-bold rounded transition ${currency==='VND'?'bg-white text-red-700 shadow-sm':'text-slate-500'}`}>VND</button>
             </div>
             <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"><Lock size={14}/> Login</button>
          </div>
        </div>
      </nav>

      {/* MARKET TAB */}
      {activeTab === 'market' && (
        <>
          <div className="bg-white border-b border-slate-200 py-6">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {cryptos.slice(0, 5).map((coin) => (
                  <div key={coin.id} onClick={() => handleSelectCoin(coin)} className={`p-4 rounded-xl border cursor-pointer transition hover:-translate-y-1 bg-white ${selectedCoin?.id === coin.id ? 'ring-2 ring-blue-500 shadow-md border-blue-500' : 'hover:shadow-lg'}`}>
                    <div className="flex justify-between items-center mb-2"><span className="font-bold text-sm text-slate-700">{coin.symbol}</span><span className={coin.price_change_percentage_24h>=0?'text-green-500':'text-red-500'}>{coin.price_change_percentage_24h?.toFixed(2)}%</span></div>
                    <div className={`text-lg font-bold ${jetbrainsMono.className}`}>{formatPrice(coin.current_price)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedCoin && (
            <div className="max-w-7xl mx-auto px-4 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
                  <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                       {imgError[selectedCoin.symbol] ? <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border"><Bitcoin/></div> : <img src={selectedCoin.image} className="w-12 h-12 rounded-full border p-0.5 bg-white" onError={() => handleImgError(selectedCoin.symbol)}/>}
                       <div><h2 className="text-3xl font-black text-slate-900">{selectedCoin.name}</h2><div className="flex items-center gap-3 mt-1"><span className={`text-2xl font-bold ${jetbrainsMono.className}`}>{formatPrice(selectedCoin.current_price)}</span></div></div>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1 border h-fit">
                       {['1D', '1W', '1M', '1Y', 'ALL'].map((r) => <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1 text-xs font-bold rounded transition ${timeRange===r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{r}</button>)}
                    </div>
                  </div>

                  <div className="flex-grow w-full relative min-h-[350px]">
                     {(!selectedCoin.chartData || selectedCoin.chartData.length === 0) ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400"><Activity className="mb-2"/> Đang tải dữ liệu DefiLlama...</div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={selectedCoin.chartData}>
                            <defs>
                              <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} /></linearGradient>
                              <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1"><stop offset={gradientOffset} stopColor="#10B981" stopOpacity={1} /><stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={1} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="time" tick={{fontSize: 10}} axisLine={false} tickLine={false} minTickGap={40}/>
                            <YAxis orientation="right" domain={['auto', 'auto']} tick={{fontSize: 11, fontFamily: 'monospace'}} tickFormatter={(val) => currency === 'VND' ? '' : val.toLocaleString()} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8' }} />
                            <ReferenceLine y={selectedCoin.chartData[0].baseline} stroke="#CBD5E1" strokeDasharray="3 3" />
                            <Area type="monotone" dataKey="price" baseValue={selectedCoin.chartData[0].baseline} stroke="url(#splitStroke)" fill="url(#splitFill)" strokeWidth={2} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                     )}
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Market Stats</h3>
                      <div className="space-y-3">
                         <div className="flex justify-between"><span className="text-sm text-slate-500">Market Cap</span><span className={`font-bold ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.market_cap)}</span></div>
                         <div className="flex justify-between"><span className="text-sm text-slate-500">Volume (24h)</span><span className={`font-bold ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.total_volume)}</span></div>
                         <div className="flex justify-between"><span className="text-sm text-slate-500">TVL</span><span className={`font-bold text-blue-600 ${jetbrainsMono.className}`}>{selectedCoin.tvl ? formatCompact(selectedCoin.tvl) : 'N/A'}</span></div>
                      </div>
                   </div>
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4">Price Range (24h)</h3>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1"><span>{formatPrice(selectedCoin.low_24h)}</span><span>{formatPrice(selectedCoin.high_24h)}</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${((selectedCoin.current_price - selectedCoin.low_24h)/(selectedCoin.high_24h - selectedCoin.low_24h))*100}%`}}></div></div>
                   </div>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 mt-8 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 size={20} className="text-blue-600"/> Bảng giá chi tiết</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr><th className="px-6 py-4">Tài sản</th><th className="px-6 py-4 text-right">Giá</th><th className="px-6 py-4 text-right">Biến động</th><th className="px-6 py-4 text-right">Market Cap</th><th className="px-6 py-4 text-right">TVL</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cryptos.map((coin) => (
                      <tr key={coin.id} onClick={() => handleSelectCoin(coin)} className={`hover:bg-slate-50 cursor-pointer transition ${selectedCoin?.id === coin.id ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-6 py-4 font-bold flex items-center gap-3"><img src={coin.image} className="w-8 h-8 rounded-full border"/>{coin.name}</td>
                        <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatPrice(coin.current_price)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.price_change_percentage_24h?.toFixed(2)}%</td>
                        <td className={`px-6 py-4 text-right ${jetbrainsMono.className}`}>{formatCompact(coin.market_cap)}</td>
                        <td className={`px-6 py-4 text-right ${jetbrainsMono.className}`}>{coin.tvl ? formatCompact(coin.tvl) : '-'}</td>
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
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Landmark size={24} className="text-blue-600"/> US Spot ETF (Nguồn: CoinGlass)</h3>
              {etfs.length > 0 ? (
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
              ) : <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>}
           </div>
        </div>
      )}

      {/* DEX TAB */}
      {activeTab === 'dex' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet size={24} className="text-purple-600"/> Top DEX Volume (DefiLlama)</h3>
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
           </div>
        </div>
      )}

      {/* FOOTER (Giữ nguyên) */}
      <footer className="bg-white border-t border-slate-200 mt-16 pt-10 pb-6 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
           <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900 mb-4">
                 <Zap size={24} className="text-blue-600"/> VNMetrics
              </div>
              <p className="text-sm leading-relaxed text-slate-500 pr-4 text-justify">
                 VNMetrics là nền tảng dữ liệu tài sản số chuyên sâu, cung cấp góc nhìn đa chiều từ thị trường Spot, Dòng tiền ETF đến Tài chính phi tập trung (DeFi). Chúng tôi cam kết minh bạch nguồn dữ liệu và tuân thủ các quy định pháp luật hiện hành tại Việt Nam.
              </p>
           </div>
           
           <div>
              <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Dữ liệu & Đối tác</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                 <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> CoinGecko (Market Data)</li>
                 <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div> DefiLlama (Chart & DEX)</li>
                 <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div> CoinGlass (ETF Flows)</li>
              </ul>
           </div>

           <div>
              <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Pháp lý</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                 <li><a href="#" className="hover:text-blue-600 transition">Điều khoản sử dụng</a></li>
                 <li><a href="#" className="hover:text-blue-600 transition">Chính sách bảo mật</a></li>
                 <li><a href="#" className="hover:text-blue-600 transition">Miễn trừ trách nhiệm</a></li>
              </ul>
           </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
           <p>&copy; 2026 VNMetrics. All rights reserved.</p>
           <p className="flex items-center gap-1"><ShieldAlert size={12}/> Tuân thủ Nghị quyết 05/2025/NQ-CP về thí điểm quản lý tài sản số.</p>
        </div>
      </footer>
    </div>
  );
}