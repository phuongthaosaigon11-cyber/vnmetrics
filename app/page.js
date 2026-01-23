'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  ChevronDown, ChevronUp, FileText, Settings, BarChart2, Lock, Eye, Bitcoin, Info, CircleDollarSign, Activity, Database, Layers, Globe, TrendingUp, AlertTriangle, Clock, Repeat, Landmark, Wallet
} from 'lucide-react';

// --- 1. CẤU HÌNH FONT ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// --- CẤU HÌNH TỶ GIÁ CỐ ĐỊNH ---
const EXCHANGE_RATE = 25450; // 1 USDT = 25,450 VND

export default function Home() {
  // --- STATE QUẢN LÝ DỮ LIỆU ---
  const [cryptos, setCryptos] = useState([]);
  const [etfs, setEtfs] = useState([]);
  const [dexs, setDexs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline'); 
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({});
  const [globalStats, setGlobalStats] = useState({ tvl: 0 });
  
  // --- STATE GIAO DIỆN MỚI ---
  const [currency, setCurrency] = useState('USD'); // 'USD' hoặc 'VND'
  const [activeTab, setActiveTab] = useState('market'); // 'market', 'etf', 'dex'

  // --- 2. HÀM FORMAT TIỀN TỆ THÔNG MINH ---
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '0.00';
    
    if (currency === 'VND') {
      const val = price * EXCHANGE_RATE;
      // VND: Số lớn thì không cần số thập phân
      return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND', 
        maximumFractionDigits: 0 
      }).format(val);
    }
    
    // USD: Luôn giữ 2 số thập phân chuẩn tài chính
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(price);
  };

  const formatCompactNumber = (number) => {
    if (number === null || number === undefined || isNaN(number)) return 'N/A';
    
    let val = number;
    let prefix = '$';
    
    if (currency === 'VND') {
      val = number * EXCHANGE_RATE;
      prefix = '₫';
    }

    if (val >= 1.0e+12) return prefix + (val / 1.0e+12).toFixed(2) + "T";
    if (val >= 1.0e+9) return prefix + (val / 1.0e+9).toFixed(2) + "B";
    if (val >= 1.0e+6) return prefix + (val / 1.0e+6).toFixed(2) + "M";
    return prefix + val.toLocaleString();
  };

  // --- 3. CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f111a] border border-[#2B313F] p-3 rounded-lg shadow-2xl text-xs min-w-[220px] z-50 backdrop-blur-md">
          <div className="text-slate-400 mb-2 font-medium border-b border-[#2B313F] pb-2 flex items-center gap-2">
             <Clock size={12}/> {data.fullTime}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                 <span className="text-slate-300 font-medium">Price</span>
               </div>
               <span className={`font-bold ${jetbrainsMono.className} text-white text-[13px]`}>
                 {formatPrice(data.price)}
               </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- 4. FETCH CHART TỪ DEFILLAMA ---
  const fetchDefiLlamaChart = async (coinDefiId, range) => {
    try {
      let span = 48; let period = '30m'; 
      let startTimestamp = Math.floor(Date.now() / 1000);

      switch(range) {
        case '1D': span = 48; period = '30m'; startTimestamp -= 86400; break;
        case '1W': span = 42; period = '4h'; startTimestamp -= 604800; break;
        case '1M': span = 60; period = '12h'; startTimestamp -= 2592000; break;
        case '1Y': span = 52; period = '1w'; startTimestamp -= 31536000; break;
        case 'ALL': span = 60; period = '1w'; startTimestamp -= 94608000; break;
        default: span = 48; period = '30m'; startTimestamp -= 86400;
      }

      const url = `https://coins.llama.fi/chart/${coinDefiId}?start=${startTimestamp}&span=${span}&period=${period}`;
      const res = await fetch(url);
      
      if (!res.ok) return [];

      const json = await res.json();

      if (json && json.coins && json.coins[coinDefiId] && json.coins[coinDefiId].prices) {
        const rawPoints = json.coins[coinDefiId].prices;
        if (rawPoints.length === 0) return [];
        const baseline = rawPoints[0].price;

        return rawPoints.map(p => {
           const t = new Date(p.timestamp * 1000);
           let timeLabel = range === '1D' ? `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
           if (range === '1Y' || range === 'ALL') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
           const fullTime = `${t.getDate().toString().padStart(2,'0')}/${(t.getMonth()+1).toString().padStart(2,'0')}/${t.getFullYear()} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
           
           return {
             time: timeLabel,
             fullTime: fullTime,
             price: p.price,
             baseline: baseline,
             volume: 0 
           };
        });
      }
      return []; 
    } catch (e) {
      console.error("Chart Error:", e);
      return []; 
    }
  };

  // --- 5. INITIAL DATA FETCHING ---
  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    const initData = async () => {
      try {
        setLoading(true);
        // A. Global TVL từ DefiLlama
        const chainsRes = await fetch('https://api.llama.fi/v2/chains');
        const chainsData = await chainsRes.json();
        const totalTvl = chainsData.reduce((acc, curr) => acc + (curr.tvl || 0), 0);
        setGlobalStats({ tvl: totalTvl });

        // B. Market Data từ CoinGecko
        const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
        if (!cgRes.ok) throw new Error("CoinGecko API Limit");
        const cgData = await cgRes.json();

        // C. DEX Volume Data từ DefiLlama
        const dexRes = await fetch('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume');
        const dexData = await dexRes.json();
        if (dexData && dexData.protocols) {
          setDexs(dexData.protocols.slice(0, 15)); // Lấy Top 15 DEX
        }

        // D. ETF Data (Giả lập cấu trúc chuẩn vì API Pro cần trả phí)
        const mockEtfs = [
          { ticker: "IBIT", issuer: "BlackRock", asset: "Bitcoin", aum: 17276718199, flows: 68700000, fee: 0.25, volume: 453293317 },
          { ticker: "FBTC", issuer: "Fidelity", asset: "Bitcoin", aum: 9820000000, flows: 32500000, fee: 0.25, volume: 210000000 },
          { ticker: "ARKB", issuer: "Ark Invest", asset: "Bitcoin", aum: 2400000000, flows: -5400000, fee: 0.21, volume: 85000000 },
          { ticker: "BITB", issuer: "Bitwise", asset: "Bitcoin", aum: 1900000000, flows: 1200000, fee: 0.20, volume: 64000000 },
          { ticker: "ETHE", issuer: "Grayscale", asset: "Ethereum", aum: 4500000000, flows: -12000000, fee: 2.50, volume: 150000000 },
          { ticker: "EZBC", issuer: "Franklin", asset: "Bitcoin", aum: 850000000, flows: 5000000, fee: 0.19, volume: 12000000 },
        ];
        setEtfs(mockEtfs);

        // E. Map Market Data & Fetch Chart Coin Đầu tiên
        const defiLlamaIds = {
          'bitcoin': 'coingecko:bitcoin', 'ethereum': 'coingecko:ethereum', 'solana': 'coingecko:solana',
          'binancecoin': 'coingecko:binancecoin', 'ripple': 'coingecko:ripple', 'cardano': 'coingecko:cardano',
          'dogecoin': 'coingecko:dogecoin', 'tron': 'coingecko:tron', 'polkadot': 'coingecko:polkadot', 'avalanche-2': 'coingecko:avalanche-2'
        };

        const processed = await Promise.all(cgData.map(async (coin, index) => {
           const defiId = defiLlamaIds[coin.id] || `coingecko:${coin.id}`;
           let chart = [];
           // Chỉ load chart coin đầu tiên để tối ưu
           if (index === 0) {
             chart = await fetchDefiLlamaChart(defiId, '1D');
           }
           const chainInfo = chainsData.find(c => c.name.toLowerCase() === coin.name.toLowerCase());
           
           return {
             ...coin, 
             defiId: defiId,
             symbol: coin.symbol.toUpperCase(),
             tvl: chainInfo ? chainInfo.tvl : null,
             compliance_score: 90 + (index % 10),
             chartData: chart
           };
        }));

        setCryptos(processed);
        setSelectedCoin(processed[0]);

      } catch (err) {
        console.error("Init Error:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // --- EVENT HANDLERS ---
  const handleSelectCoin = async (coin) => {
    // Nếu chart chưa có thì gọi API
    if (!coin.chartData || coin.chartData.length === 0) {
      const newChart = await fetchDefiLlamaChart(coin.defiId, timeRange);
      const updatedCoin = { ...coin, chartData: newChart };
      setSelectedCoin(updatedCoin);
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else {
      setSelectedCoin(coin);
    }
  };

  const handleTimeChange = async (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const newChart = await fetchDefiLlamaChart(selectedCoin.defiId, range);
      const updatedCoin = { ...selectedCoin, chartData: newChart };
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

  // --- SUB-COMPONENTS: ETF TABLE ---
  const ETFTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Ticker</th>
            <th className="px-6 py-4">Issuer</th>
            <th className="px-6 py-4 text-right">Asset</th>
            <th className="px-6 py-4 text-right">AUM (Total Assets)</th>
            <th className="px-6 py-4 text-right">Net Flow (24h)</th>
            <th className="px-6 py-4 text-right">Volume (24h)</th>
            <th className="px-6 py-4 text-right">Fee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {etfs.map((etf, i) => (
            <tr key={i} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] border">{etf.ticker[0]}</div>
                 {etf.ticker}
              </td>
              <td className="px-6 py-4 text-slate-600 font-medium">{etf.issuer}</td>
              <td className="px-6 py-4 text-right font-bold text-orange-500 bg-orange-50 rounded-lg px-2">{etf.asset}</td>
              <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>
                {formatCompactNumber(etf.aum)}
              </td>
              <td className={`px-6 py-4 text-right font-bold ${etf.flows >= 0 ? 'text-green-600' : 'text-red-600'} ${jetbrainsMono.className}`}>
                {etf.flows > 0 ? '+' : ''}{formatCompactNumber(etf.flows)}
              </td>
              <td className={`px-6 py-4 text-right text-slate-700 ${jetbrainsMono.className}`}>
                {formatCompactNumber(etf.volume)}
              </td>
              <td className="px-6 py-4 text-right text-slate-500 text-xs">{etf.fee}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- SUB-COMPONENTS: DEX TABLE ---
  const DEXTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
          <tr>
            <th className="px-6 py-4">#</th>
            <th className="px-6 py-4">Protocol</th>
            <th className="px-6 py-4">Chains</th>
            <th className="px-6 py-4 text-right">Volume (24h)</th>
            <th className="px-6 py-4 text-right">Change (1d)</th>
            <th className="px-6 py-4 text-right">Change (7d)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dexs.map((dex, i) => (
            <tr key={i} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 text-slate-400 font-medium w-10">{i+1}</td>
              <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                 {dex.logo && <img src={dex.logo} className="w-6 h-6 rounded-full" alt="" />}
                 {dex.displayName || dex.name}
              </td>
              <td className="px-6 py-4 text-slate-500 text-xs">
                 <div className="flex gap-1 flex-wrap">
                   {dex.chains.slice(0, 3).map(c => <span key={c} className="bg-slate-100 px-1.5 py-0.5 rounded border">{c}</span>)}
                   {dex.chains.length > 3 && <span className="text-slate-400">+{dex.chains.length - 3}</span>}
                 </div>
              </td>
              <td className={`px-6 py-4 text-right font-bold text-slate-900 ${jetbrainsMono.className}`}>
                {formatCompactNumber(dex.total24h)}
              </td>
              <td className={`px-6 py-4 text-right font-bold ${dex.change_1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dex.change_1d?.toFixed(2)}%
              </td>
              <td className={`px-6 py-4 text-right font-bold ${dex.change_7d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dex.change_7d?.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- RENDER CHÍNH ---
  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      
      {/* BANNER PHÁP LÝ */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <ShieldAlert size={18} className="text-blue-600 inline mr-2"/>
              <strong>Cảnh báo:</strong> VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP. Dữ liệu chỉ mang tính tham khảo.
            </div>
            <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
          </div>
        </div>
      )}

      {/* TOP BAR: TỶ GIÁ & GLOBAL STATS */}
      <div className="bg-slate-900 text-slate-400 text-[11px] py-2 border-b border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-6">
               <span className="flex items-center gap-1.5"><Globe size={12}/> Global TVL: <span className="text-blue-400 font-bold">${formatCompactNumber(globalStats.tvl)}</span></span>
               <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
            </div>
            <div className="flex gap-2 items-center">
               <span>Data Source: CoinGecko, DefiLlama</span>
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
         </div>
      </div>

      {/* HEADER: MENU & CURRENCY TOGGLE */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-700 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          
          {/* MENU TAB CHUYỂN ĐỔI */}
          <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
             {['market', 'etf', 'dex'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-bold rounded-md transition capitalize ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {tab === 'market' ? 'Thị trường' : tab === 'etf' ? 'ETF Flows' : 'DEX Volume'}
                </button>
             ))}
          </div>

          <div className="flex items-center gap-4">
             {/* NÚT CHUYỂN TIỀN TỆ (USD/VND) */}
             <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button onClick={() => setCurrency('USD')} className={`px-3 py-1 text-xs font-bold rounded transition ${currency==='USD'?'bg-white text-green-700 shadow-sm':'text-slate-500'}`}>USD</button>
                <button onClick={() => setCurrency('VND')} className={`px-3 py-1 text-xs font-bold rounded transition ${currency==='VND'?'bg-white text-red-700 shadow-sm':'text-slate-500'}`}>VND</button>
             </div>
             <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition">
               <Lock size={14}/> Đăng nhập
             </button>
          </div>
        </div>
      </nav>

      {/* --- PHẦN 1: MARKET DASHBOARD (TAB MARKET) --- */}
      {activeTab === 'market' && (
        <>
          {/* TICKER */}
          <div className="bg-white border-b border-slate-200 py-6">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <Activity size={14}/> Thị trường Trực tiếp
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-50 rounded-xl animate-pulse"/>) : 
                  cryptos.slice(0, 5).map((coin) => (
                    <div key={coin.id} onClick={() => handleSelectCoin(coin)} className={`p-4 rounded-xl border cursor-pointer transition hover:-translate-y-1 bg-white ${selectedCoin?.id === coin.id ? 'ring-2 ring-blue-500 shadow-md border-blue-500' : 'hover:shadow-lg'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-slate-700">{coin.symbol}</span>
                        {coin.price_change_percentage_24h >= 0 ? <ArrowUpRight size={18} className="text-green-500"/> : <ArrowDownRight size={18} className="text-red-500"/>}
                      </div>
                      <div className={`text-lg font-bold tracking-tight ${jetbrainsMono.className} text-slate-900`}>{formatPrice(coin.current_price)}</div>
                      <div className={`text-xs font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* CHART & STATS */}
          {selectedCoin && (
            <div className="max-w-7xl mx-auto px-4 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CỘT CHART */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
                  <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                       <img src={selectedCoin.image} className="w-12 h-12 rounded-full border p-0.5 bg-white" onError={() => handleImgError(selectedCoin.symbol)}/>
                       <div>
                         <h2 className="text-3xl font-black text-slate-900">{selectedCoin.name}</h2>
                         <div className="flex items-center gap-3 mt-1">
                            <span className={`text-2xl font-bold ${jetbrainsMono.className} text-slate-900`}>{formatPrice(selectedCoin.current_price)}</span>
                            <span className={`px-2 py-0.5 rounded text-sm font-bold ${selectedCoin.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {selectedCoin.price_change_percentage_24h?.toFixed(2)}%
                            </span>
                         </div>
                       </div>
                    </div>
                    <div className="flex gap-2 items-end">
                       <div className="flex bg-slate-100 rounded-lg p-1 border">
                          {['1D', '1W', '1M', '1Y', 'ALL'].map((r) => (
                            <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1 text-xs font-bold rounded transition ${timeRange===r ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{r}</button>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="flex-grow w-full relative min-h-[350px]">
                     {!selectedCoin.chartData || selectedCoin.chartData.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed"><p className="text-slate-400 font-bold">No Chart Data Available</p></div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={selectedCoin.chartData}>
                            <defs>
                              <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} />
                                <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} />
                              </linearGradient>
                              <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={1} />
                                <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="time" tick={{fontSize: 10}} axisLine={false} tickLine={false} minTickGap={40}/>
                            <YAxis orientation="right" domain={['auto', 'auto']} tick={{fontSize: 11, fontFamily: 'monospace'}} tickFormatter={(val) => currency === 'VND' ? '' : `$${val.toLocaleString()}`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8' }} />
                            <ReferenceLine y={selectedCoin.chartData[0].baseline} stroke="#CBD5E1" strokeDasharray="3 3" />
                            <Area type="monotone" dataKey="price" baseValue={selectedCoin.chartData[0].baseline} stroke="url(#splitStroke)" fill="url(#splitFill)" strokeWidth={2} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                     )}
                  </div>
                </div>

                {/* CỘT THỐNG KÊ (GRID STATS) */}
                <div className="lg:col-span-1 space-y-4">
                   {/* Khối 1: Market Info */}
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Market Stats</h3>
                      <div className="space-y-3">
                         <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Market Cap</span>
                            <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.market_cap)}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Volume (24h)</span>
                            <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.total_volume)}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Fully Diluted (FDV)</span>
                            <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.fully_diluted_valuation)}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-sm text-slate-500">TVL (DeFi)</span>
                            <span className={`font-bold text-blue-600 ${jetbrainsMono.className}`}>{selectedCoin.tvl ? formatCompactNumber(selectedCoin.tvl) : 'N/A'}</span>
                         </div>
                      </div>
                   </div>
                   
                   {/* Khối 2: Price Range */}
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={16}/> 24h Range</h3>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                         <span>Low: {formatPrice(selectedCoin.low_24h)}</span>
                         <span>High: {formatPrice(selectedCoin.high_24h)}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full relative overflow-hidden">
                         <div className="absolute top-0 bottom-0 bg-slate-800 rounded-full w-1.5" 
                              style={{left: `${((selectedCoin.current_price - selectedCoin.low_24h)/(selectedCoin.high_24h - selectedCoin.low_24h))*100}%`, transform: 'translateX(-50%)'}}>
                         </div>
                         <div className="w-full h-full bg-gradient-to-r from-red-300 via-yellow-300 to-green-300 opacity-40"></div>
                      </div>
                   </div>

                   {/* Khối 3: Supply */}
                   <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Database size={16}/> Token Supply</h3>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Circulating</span>
                            <span className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.circulating_supply)}</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600" style={{width: `${(selectedCoin.circulating_supply / (selectedCoin.max_supply || selectedCoin.total_supply)) * 100}%`}}></div>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Max Supply</span>
                            <span className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>{selectedCoin.max_supply ? formatCompactNumber(selectedCoin.max_supply) : '∞'}</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* MARKET TABLE */}
          <div className="max-w-7xl mx-auto px-4 mt-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <BarChart2 size={20} className="text-blue-600"/> Bảng giá chi tiết
                </h3>
                <button className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"><Settings size={14} /> Tùy chỉnh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Tài sản</th>
                      <th className="px-6 py-4 text-right">Giá</th>
                      <th className="px-6 py-4 text-right">Biến động (24h)</th>
                      <th className="px-6 py-4 text-right">Market Cap</th>
                      <th className="px-6 py-4 text-right">TVL (DeFi)</th>
                      <th className="px-6 py-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cryptos.map((coin) => (
                      <tr key={coin.id} onClick={() => handleSelectCoin(coin)} className={`hover:bg-slate-50 cursor-pointer transition ${selectedCoin?.id === coin.id ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                           <img src={coin.image} className="w-8 h-8 rounded-full border" />
                           <div><div className="font-bold">{coin.name}</div><div className="text-xs text-slate-400">{coin.symbol}</div></div>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>{formatPrice(coin.current_price)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.price_change_percentage_24h?.toFixed(2)}%</td>
                        <td className={`px-6 py-4 text-right font-medium text-slate-600 ${jetbrainsMono.className}`}>{formatCompactNumber(coin.market_cap)}</td>
                        <td className={`px-6 py-4 text-right font-medium text-slate-600 ${jetbrainsMono.className}`}>
                           {coin.tvl ? formatCompactNumber(coin.tvl) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center"><button className="text-xs bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded font-bold transition flex items-center gap-1 mx-auto"><Eye size={12}/> Xem</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- PHẦN 2: ETF TRACKER (TAB ETF) --- */}
      {activeTab === 'etf' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Landmark size={24} className="text-blue-600"/> US Spot ETF Flows (Giả lập)</h3>
              <ETFTable />
           </div>
        </div>
      )}

      {/* --- PHẦN 3: DEX ANALYTICS (TAB DEX) --- */}
      {activeTab === 'dex' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Wallet size={24} className="text-purple-600"/> Top DEX Volume (DefiLlama Realtime)</h3>
              <DEXTable />
           </div>
        </div>
      )}

      {/* FOOTER & FAQ */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6"><ShieldAlert className="text-yellow-500" size={24} /><h3 className="font-bold text-white uppercase tracking-wider">Miễn trừ trách nhiệm quan trọng</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-xs leading-relaxed text-justify">
            <div><p className="mb-4"><strong>THÔNG TIN THAM KHẢO:</strong> Nội dung chỉ nhằm mục đích cung cấp thông tin chung.</p><p className="mb-4"><strong>KHÔNG ĐẢM BẢO:</strong> Chúng tôi không đảm bảo tính chính xác tuyệt đối của dữ liệu.</p></div>
            <div><p className="mb-4"><strong>TỰ CHỊU TRÁCH NHIỆM:</strong> Việc đầu tư là quyết định của bạn.</p><p className="text-white font-bold border-l-2 border-yellow-500 pl-3">Không có nội dung nào được hiểu là lời khuyên đầu tư.</p></div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-500"><p>&copy; 2026 VNMetrics. Dữ liệu cung cấp bởi CoinGecko & DefiLlama (Public Free Tier).</p></div>
        </div>
      </footer>
    </div>
  );
}