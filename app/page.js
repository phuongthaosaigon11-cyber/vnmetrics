'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  BarChart2, Lock, Eye, Bitcoin, Info, Activity, Globe, TrendingUp, AlertTriangle, Clock, Repeat, Landmark, Wallet, ServerCrash, RefreshCw
} from 'lucide-react';

// --- CẤU HÌNH ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const EXCHANGE_RATE = 25450; 

// Mapping ID cho Chart Binance
const BINANCE_PAIR_MAP = {
  'bitcoin': 'BTCUSDT', 'ethereum': 'ETHUSDT', 'solana': 'SOLUSDT', 'binancecoin': 'BNBUSDT',
  'ripple': 'XRPUSDT', 'cardano': 'ADAUSDT', 'dogecoin': 'DOGEUSDT', 'tron': 'TRXUSDT',
  'polkadot': 'DOTUSDT', 'avalanche-2': 'AVAXUSDT'
};

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
  const [errors, setErrors] = useState({});

  // --- FORMATTERS ---
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return 'N/A';
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

  // --- FETCHERS (DÙNG PROXY CHUNG) ---
  const fetchBinanceChart = async (coinId, range) => {
    try {
      const symbol = BINANCE_PAIR_MAP[coinId];
      if (!symbol) return [];
      
      let interval = '30m'; let limit = 48;
      switch(range) {
        case '1D': interval = '30m'; limit = 48; break;
        case '1W': interval = '4h'; limit = 42; break;
        case '1M': interval = '1d'; limit = 30; break;
        case '1Y': interval = '1w'; limit = 52; break;
        default: interval = '1h'; limit = 24;
      }

      // GỌI QUA PROXY "NHÀ LÀM" (?type=binance)
      const res = await fetch(`/api/proxy?type=binance&symbol=${symbol}&interval=${interval}&limit=${limit}`);
      
      if (!res.ok) return [];
      
      const rawData = await res.json();
      if (!Array.isArray(rawData)) return [];
      
      const baseline = parseFloat(rawData[0][4]);
      return rawData.map(c => {
         const t = new Date(c[0]);
         let timeLabel = range === '1D' ? `${t.getHours()}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
         if (range === '1Y') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
         return {
            time: timeLabel, fullTime: t.toLocaleString(),
            price: parseFloat(c[4]), volume: parseFloat(c[5]) * parseFloat(c[4]), baseline
         };
      });
    } catch (e) { return []; }
  };

  const fetchAllData = async () => {
    setLoading(true);
    const newErrors = {};

    // 1. MARKET (CoinGecko)
    try {
      const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      if (!cgRes.ok) throw new Error("CoinGecko Rate Limit");
      const cgData = await cgRes.json();
      
      const firstCoinChart = await fetchBinanceChart(cgData[0].id, timeRange);
      const processed = cgData.map((coin, idx) => ({
        ...coin, symbol: coin.symbol.toUpperCase(),
        chartData: idx === 0 ? firstCoinChart : []
      }));
      setCryptos(processed);
      if (!selectedCoin) setSelectedCoin(processed[0]);
    } catch (e) { newErrors.market = e.message; }

    // 2. ETF (CoinGlass Proxy -> ?type=coinglass)
    try {
       const etfRes = await fetch('/api/proxy?type=coinglass');
       const etfJson = await etfRes.json();
       
       if (etfJson.data && Array.isArray(etfJson.data)) {
          const targetTickers = ['IBIT', 'FBTC', 'ARKB', 'BITB', 'HODL', 'BRRR', 'EZBC', 'BTCO'];
          const filtered = etfJson.data.filter(item => targetTickers.includes(item.ticker));
          setEtfs(filtered);
       } else {
          throw new Error("Empty Data");
       }
    } catch (e) {
       console.error("ETF Error:", e);
       newErrors.etf = "Lỗi kết nối CoinGlass Proxy";
    }

    // 3. DEX (DefiLlama Public)
    try {
       const dexRes = await fetch('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume');
       const dexData = await dexRes.json();
       if (dexData.protocols) setDexs(dexData.protocols.slice(0, 15));
    } catch (e) { newErrors.dex = e.message; }

    // 4. TVL
    try {
      const tvlRes = await fetch('https://api.llama.fi/v2/chains');
      const tvlData = await tvlRes.json();
      setGlobalStats({ tvl: tvlData.reduce((a, b) => a + (b.tvl || 0), 0) });
    } catch (e) {}

    setErrors(newErrors);
    setLoading(false);
  };

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);
    fetchAllData();
  }, []);

  const handleSelectCoin = async (coin) => {
    if (!coin.chartData || coin.chartData.length === 0) {
      const chart = await fetchBinanceChart(coin.id, timeRange);
      const updatedCoin = { ...coin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else { setSelectedCoin(coin); }
  };

  const handleTimeChange = async (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const chart = await fetchBinanceChart(selectedCoin.id, range);
      const updatedCoin = { ...selectedCoin, chartData: chart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === selectedCoin.id ? updatedCoin : c));
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f111a] border border-[#2B313F] p-3 rounded-lg shadow-xl text-xs min-w-[180px]">
          <div className="text-slate-400 mb-2 flex items-center gap-2"><Clock size={12}/>{payload[0].payload.fullTime}</div>
          <div className="flex justify-between items-center mb-1">
             <span className="text-slate-400">Price</span>
             <span className={`text-white font-bold ${jetbrainsMono.className}`}>{formatPrice(payload[0].payload.price)}</span>
          </div>
          {payload[0].payload.volume > 0 && 
            <div className="flex justify-between items-center">
               <span className="text-slate-400">Vol</span>
               <span className={`text-slate-300 font-bold ${jetbrainsMono.className}`}>{formatCompact(payload[0].payload.volume)}</span>
            </div>
          }
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 flex justify-between items-center animate-in slide-in-from-bottom">
          <div className="text-sm text-slate-600"><ShieldAlert size={18} className="inline mr-2 text-blue-600"/>VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP.</div>
          <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
        </div>
      )}

      {/* TOP BAR */}
      <div className="bg-slate-900 text-slate-400 text-[11px] py-2 border-b border-slate-800 px-4 flex justify-between">
         <div className="flex gap-6">
            <span className="flex items-center gap-1"><Globe size={12}/> Global TVL: <span className="text-blue-400 font-bold ml-1">${formatCompact(globalStats.tvl)}</span></span>
            <span className="flex items-center gap-1 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
         </div>
         <div className="flex items-center gap-2"><span>Real Data (Universal Proxy)</span><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div></div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm px-4 h-16 flex justify-between items-center">
         <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900"><Zap size={24} className="text-blue-600"/> VNMetrics</div>
         <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {['market', 'etf', 'dex'].map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 text-sm font-bold rounded-md capitalize transition ${activeTab===t ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>{t === 'etf' ? 'ETF Tracker' : t}</button>
            ))}
         </div>
         <div className="flex gap-2">
            <button onClick={() => setCurrency(currency==='USD'?'VND':'USD')} className="px-3 py-1.5 bg-slate-100 rounded text-xs font-bold border w-16 hover:bg-slate-200 transition">{currency}</button>
            <button className="bg-slate-900 text-white px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition"><Lock size={14}/> Login</button>
         </div>
      </nav>

      {/* MARKET TAB */}
      {activeTab === 'market' && (
        <>
          <div className="bg-white border-b py-6 px-4">
             {errors.market ? <div className="text-red-500 text-center p-4 border border-red-200 rounded bg-red-50">Lỗi kết nối CoinGecko: {errors.market}</div> : 
             <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                {cryptos.slice(0, 5).map(c => (
                   <div key={c.id} onClick={() => handleSelectCoin(c)} className={`p-4 rounded-xl border cursor-pointer transition hover:-translate-y-1 bg-white ${selectedCoin?.id===c.id ? 'ring-2 ring-blue-500' : ''}`}>
                      <div className="flex justify-between items-center mb-2"><span className="font-bold text-slate-700">{c.symbol}</span><span className={c.price_change_percentage_24h>=0?'text-green-500':'text-red-500'}>{c.price_change_percentage_24h?.toFixed(2)}%</span></div>
                      <div className={`text-lg font-bold ${jetbrainsMono.className}`}>{formatPrice(c.current_price)}</div>
                   </div>
                ))}
             </div>}
          </div>

          {selectedCoin && !errors.market && (
             <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm h-[500px] flex flex-col">
                   <div className="flex justify-between mb-4">
                      <div className="flex items-center gap-4">
                         <img src={selectedCoin.image} className="w-10 h-10 rounded-full border"/>
                         <div><div className="text-2xl font-black">{selectedCoin.name}</div><div className="text-slate-500">{formatPrice(selectedCoin.current_price)}</div></div>
                      </div>
                      <div className="flex bg-slate-100 rounded p-1 h-fit">
                         {['1D','1W','1M','1Y'].map(r => <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1 text-xs font-bold rounded ${timeRange===r?'bg-white shadow':''}`}>{r}</button>)}
                      </div>
                   </div>
                   <div className="flex-grow w-full">
                      {selectedCoin.chartData?.length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={selectedCoin.chartData}>
                               <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset={0} stopColor="#3B82F6" stopOpacity={0.2}/><stop offset={1} stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
                               <XAxis dataKey="time" tick={{fontSize:10}} axisLine={false} tickLine={false} minTickGap={30}/>
                               <YAxis orientation="right" domain={['auto','auto']} tick={{fontSize:11, fontFamily:'monospace'}} tickFormatter={v => currency==='VND'?'':v.toLocaleString()}/>
                               <Tooltip content={<CustomTooltip/>}/>
                               <Area type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#grad)" strokeWidth={2}/>
                            </ComposedChart>
                         </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-slate-400 border border-dashed rounded bg-slate-50"><Activity className="mr-2"/> Đang tải biểu đồ Binance...</div>}
                   </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                   <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Globe size={16}/> Market Stats</h3>
                      <div className="space-y-3 text-sm">
                         <div className="flex justify-between"><span className="text-slate-500">Market Cap</span><span className={`font-bold ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.market_cap)}</span></div>
                         <div className="flex justify-between"><span className="text-slate-500">Volume 24h</span><span className={`font-bold ${jetbrainsMono.className}`}>{formatCompact(selectedCoin.total_volume)}</span></div>
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingUp size={16}/> 24h Range</h3>
                      <div className="flex justify-between text-xs font-bold mb-1"><span>{formatPrice(selectedCoin.low_24h)}</span><span>{formatPrice(selectedCoin.high_24h)}</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${((selectedCoin.current_price-selectedCoin.low_24h)/(selectedCoin.high_24h-selectedCoin.low_24h))*100}%`}}></div></div>
                   </div>
                </div>
             </div>
          )}

          <div className="max-w-7xl mx-auto px-4 mt-8 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-lg flex items-center gap-2"><BarChart2 size={20} className="text-blue-600"/> Bảng giá chi tiết</h3></div>
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

      {/* ETF TAB (DATA FROM COINGLASS PROXY) */}
      {activeTab === 'etf' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Landmark size={24} className="text-blue-600"/> US Spot ETF (Nguồn: CoinGlass)</h3>
              
              {errors.etf ? (
                 <div className="text-center py-10">
                    <ServerCrash size={48} className="mx-auto text-red-300 mb-3"/>
                    <p className="text-red-500 font-bold">Lỗi tải dữ liệu CoinGlass</p>
                    <p className="text-sm text-slate-400 mt-2">Đang thử kết nối lại...</p>
                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                      <tr><th className="px-6 py-4">Ticker</th><th className="px-6 py-4">Issuer</th><th className="px-6 py-4 text-right">Price</th><th className="px-6 py-4 text-right">AUM</th><th className="px-6 py-4 text-right">Flow (Daily)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {etfs.map((etf, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold">{etf.ticker}</td>
                          <td className="px-6 py-4 text-slate-600">{etf.issuer || 'Unknown'}</td>
                          <td className={`px-6 py-4 text-right font-medium ${jetbrainsMono.className}`}>{formatPrice(etf.price || etf.closePrice)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatCompact(etf.aum)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${etf.flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                             {etf.flow > 0 ? '+' : ''}{formatCompact(etf.flow)}
                          </td>
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
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet size={24} className="text-purple-600"/> Top DEX Volume (DefiLlama)</h3>
              {errors.dex ? <div className="text-red-500 p-4">Lỗi tải dữ liệu DEX.</div> : 
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
              </div>}
           </div>
        </div>
      )}

      <footer className="bg-white border-t mt-16 pt-10 pb-6 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
           <p>&copy; 2026 VNMetrics. All rights reserved. Data: CoinGlass, Binance, CoinGecko.</p>
        </div>
      </footer>
    </div>
  );
}