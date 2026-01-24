'use client';

import { useEffect, useState, useCallback } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  BarChart2, Lock, Globe, TrendingUp, Clock, Repeat, Landmark, Wallet, Activity, Database, Droplets, Info, ServerCrash
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const EXCHANGE_RATE = 25450; 

export default function Home() {
  // --- STATE AN TOÀN (LUÔN KHỞI TẠO MẢNG RỖNG) ---
  const [cryptos, setCryptos] = useState([]);
  const [etfs, setEtfs] = useState([]);
  const [dexs, setDexs] = useState([]);
  
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [activeTab, setActiveTab] = useState('market'); 
  const [currency, setCurrency] = useState('USD');
  const [globalStats, setGlobalStats] = useState({ tvl: 0 });
  const [showConsent, setShowConsent] = useState(false);
  const [chartType, setChartType] = useState('baseline');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({});

  // Trạng thái load cho từng phần
  const [status, setStatus] = useState({
    market: 'loading',
    etf: 'loading',
    dex: 'loading'
  });

  // --- SAFE FORMATTERS (CHỐNG CRASH KHI NULL) ---
  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) return '0.00';
    try {
      if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price * EXCHANGE_RATE);
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    } catch (e) { return '0.00'; }
  };

  const formatCompact = (number) => {
    if (number === undefined || number === null || isNaN(number)) return '-';
    try {
      let val = number; let pre = '$';
      if (currency === 'VND') { val = number * EXCHANGE_RATE; pre = '₫'; }
      if (val >= 1e12) return pre + (val/1e12).toFixed(2) + "T";
      if (val >= 1e9) return pre + (val/1e9).toFixed(2) + "B";
      if (val >= 1e6) return pre + (val/1e6).toFixed(2) + "M";
      return pre + val.toLocaleString();
    } catch (e) { return '-'; }
  };

  // --- 1. FETCH CHART (COINGECKO - CÓ TRY CATCH KỸ) ---
  const fetchChart = async (coinId, range) => {
    try {
      let days = '1';
      if (range === '1W') days = '7';
      if (range === '1M') days = '30';
      if (range === '1Y') days = '365';
      if (range === 'ALL') days = 'max';

      const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
      if (!res.ok) return []; // Nếu lỗi trả về rỗng ngay, không throw
      
      const data = await res.json();
      if (!data || !data.prices || !Array.isArray(data.prices) || data.prices.length === 0) return [];

      const baseline = data.prices[0][1];
      return data.prices.map((p, i) => ({
        time: range === '1D' ? new Date(p[0]).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : new Date(p[0]).toLocaleDateString(),
        fullTime: new Date(p[0]).toLocaleString(),
        price: p[1] || 0,
        volume: (data.total_volumes && data.total_volumes[i]) ? data.total_volumes[i][1] : 0,
        baseline
      }));
    } catch (e) { return []; }
  };

  // --- 2. FETCH MARKET ---
  const fetchMarket = useCallback(async () => {
    setStatus(prev => ({...prev, market: 'loading'}));
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
      
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("Empty Data");

      // Load chart cho coin đầu tiên
      const chart = await fetchChart(data[0].id, '1D');
      
      const processed = data.map((c, i) => ({
        ...c, 
        symbol: c.symbol ? c.symbol.toUpperCase() : 'UNKNOWN',
        chartData: i === 0 ? chart : []
      }));
      
      setCryptos(processed);
      if (!selectedCoin) setSelectedCoin(processed[0]);
      setStatus(prev => ({...prev, market: 'success'}));

    } catch (e) {
      console.error("Market Error:", e);
      setStatus(prev => ({...prev, market: 'error'}));
    }
  }, [selectedCoin]);

  // --- 3. FETCH ETF ---
  const fetchETF = async () => {
    setStatus(prev => ({...prev, etf: 'loading'}));
    try {
      // Dùng corsproxy.io để lách luật
      const res = await fetch("https://corsproxy.io/?https://capi.coinglass.com/api/etf/flow");
      if (!res.ok) throw new Error("Proxy Error");
      
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data)) {
        const target = ['IBIT', 'FBTC', 'ARKB', 'BITB', 'HODL', 'BRRR', 'EZBC'];
        const filtered = json.data.filter(i => target.includes(i.ticker));
        setEtfs(filtered);
        setStatus(prev => ({...prev, etf: 'success'}));
      } else {
        setStatus(prev => ({...prev, etf: 'empty'}));
      }
    } catch (e) {
      setStatus(prev => ({...prev, etf: 'error'}));
    }
  };

  // --- 4. FETCH DEX ---
  const fetchDEX = async () => {
    setStatus(prev => ({...prev, dex: 'loading'}));
    try {
      const res = await fetch('https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume');
      const json = await res.json();
      if (json && json.protocols) {
        setDexs(json.protocols.sort((a,b) => (b.total24h||0) - (a.total24h||0)).slice(0, 15));
        setStatus(prev => ({...prev, dex: 'success'}));
      }
    } catch (e) {
      setStatus(prev => ({...prev, dex: 'error'}));
    }
  };

  // --- INIT ---
  useEffect(() => {
    // Chống lỗi Hydration: Chỉ chạy logic này ở Client
    if (typeof window !== 'undefined') {
       const hasConsented = localStorage.getItem('vnmetrics_consent');
       if (!hasConsented) setShowConsent(true);
    }
    fetchMarket();
    fetchETF();
    fetchDEX();
    
    fetch('https://api.llama.fi/v2/chains')
      .then(r=>r.json())
      .then(d=>{ if(Array.isArray(d)) setGlobalStats({ tvl: d.reduce((a, b) => a + (b.tvl || 0), 0) }); })
      .catch(()=>{});
  }, []);

  // --- HANDLERS ---
  const handleSelectCoin = async (coin) => {
    if (!coin) return;
    // Nếu chưa có chart thì tải
    if (!coin.chartData || coin.chartData.length === 0) {
      const chart = await fetchChart(coin.id, timeRange);
      const updatedCoin = { ...coin, chartData: chart };
      setSelectedCoin(updatedCoin);
      // Update lại list để cache chart
      setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
    } else {
      setSelectedCoin(coin);
    }
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

  const handleImgError = (symbol) => setImgError(prev => ({ ...prev, [symbol]: true }));

  // --- RENDER ---
  // Tính toán gradient an toàn
  const safeChartData = selectedCoin?.chartData || [];
  const hasChartData = safeChartData.length > 0;
  const maxVolume = hasChartData ? Math.max(...safeChartData.map(d => d.volume || 0)) : 0;

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      {/* DISCLAIMER MODAL */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 flex justify-between items-center animate-in slide-in-from-bottom">
          <div className="text-sm text-slate-600"><ShieldAlert size={18} className="inline mr-2 text-blue-600"/><strong>Thông báo:</strong> Dữ liệu chỉ mang tính tham khảo.</div>
          <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
        </div>
      )}

      {/* TOP BAR */}
      <div className="bg-[#0B0E14] text-slate-400 text-[11px] py-2 border-b border-slate-800 px-4 flex justify-between items-center">
         <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500"/> TVL: <span className="text-white font-bold">${formatCompact(globalStats.tvl)}</span></span>
            <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USDT ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
         </div>
         <div className="flex items-center gap-2"><span>Status: Stable V36</span><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm px-4 h-16 flex justify-between items-center backdrop-blur-md bg-white/95">
         <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900"><Zap size={24} className="text-blue-600"/> VNMetrics</div>
         <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {['market', 'etf', 'dex'].map(t => (
               <button key={t} onClick={() => setActiveTab(t)} className={`px-5 py-1.5 text-sm font-bold rounded-md capitalize transition-all ${activeTab===t ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}>{t === 'etf' ? 'ETF Tracker' : t === 'dex' ? 'DEX Volume' : 'Thị trường'}</button>
            ))}
         </div>
         <div className="flex gap-3">
            <button onClick={() => setCurrency(currency==='USD'?'VND':'USD')} className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold border border-slate-200 w-16 hover:bg-slate-100">{currency}</button>
            <button className="bg-[#0B0E14] text-white px-5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800"><Lock size={14}/> Login</button>
         </div>
      </nav>

      {/* --- CONTENT --- */}
      {activeTab === 'market' && (
        <>
          {/* TICKER */}
          <div className="bg-white border-b py-8 px-4 bg-gradient-to-b from-white to-slate-50">
             {status.market === 'error' ? 
               <div className="text-center text-red-500 text-sm py-4"><ServerCrash className="mx-auto mb-2"/>Lỗi kết nối CoinGecko (429). Vui lòng chờ 30s.</div> 
             : 
             <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
                {cryptos.length === 0 ? [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"/>) :
                cryptos.slice(0, 5).map(c => {
                   const pct = c.price_change_percentage_24h || 0;
                   const isUp = pct >= 0;
                   return (
                     <div key={c.id} onClick={() => handleSelectCoin(c)} 
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 bg-white ${selectedCoin?.id===c.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-lg'} ${isUp?'border-green-100':'border-red-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                           <span className="font-bold text-sm text-slate-700">{c.symbol}</span>
                           <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {isUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{Math.abs(pct).toFixed(2)}%
                           </span>
                        </div>
                        <div className={`text-lg font-bold ${jetbrainsMono.className} text-slate-900`}>{formatPrice(c.current_price)}</div>
                     </div>
                   );
                })}
             </div>}
          </div>

          {/* MAIN CHART */}
          {selectedCoin && (
             <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[550px]">
                  <div className="flex justify-between mb-6">
                    <div className="flex items-center gap-4">
                       {imgError[selectedCoin.symbol] ? <div className="w-14 h-14 rounded-full border bg-slate-100 flex items-center justify-center font-bold text-xs">{selectedCoin.symbol}</div> : 
                       <img src={selectedCoin.image} className="w-14 h-14 rounded-full border p-1" onError={() => handleImgError(selectedCoin.symbol)}/>}
                       <div>
                         <h2 className="text-3xl font-black text-slate-900">{selectedCoin.name}</h2>
                         <div className="flex items-center gap-3 mt-1"><span className={`text-2xl font-bold ${jetbrainsMono.className} text-slate-900`}>{formatPrice(selectedCoin.current_price)}</span></div>
                       </div>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1 border">
                       {['1D','1W','1M','1Y','ALL'].map((r) => <button key={r} onClick={() => handleTimeChange(r)} className={`px-3 py-1.5 text-xs font-bold rounded transition ${timeRange===r?'bg-white shadow text-blue-600':'text-slate-500'}`}>{r}</button>)}
                    </div>
                  </div>

                  <div className="flex-grow w-full relative min-h-[400px]">
                     {!hasChartData ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400"><Activity className="mb-2 animate-bounce"/> Đang tải biểu đồ...</div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={safeChartData}>
                            <defs>
                              <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1"><stop offset={0} stopColor="#10B981" stopOpacity={0.2} /><stop offset={1} stopColor="#EF4444" stopOpacity={0.2} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="time" tick={{fontSize:10, fill:'#94A3B8'}} axisLine={false} tickLine={false} minTickGap={40}/>
                            <YAxis yAxisId="price" orientation="right" domain={['auto', 'auto']} tick={{fontSize:11, fontFamily:'monospace', fill:'#64748B'}} tickFormatter={(val) => currency === 'VND' ? '' : val.toLocaleString()} axisLine={false} tickLine={false}/>
                            <YAxis yAxisId="volume" orientation="left" domain={[0, maxVolume * 5]} hide />
                            <Bar yAxisId="volume" dataKey="volume" fill="#E2E8F0" barSize={4} radius={[2, 2, 0, 0]} />
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length && payload[0].payload) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-[#0f111a] border border-[#2B313F] p-3 rounded-lg shadow-xl text-xs min-w-[180px] z-50">
                                            <div className="text-slate-400 mb-2 flex items-center gap-2"><Clock size={12}/>{d.fullTime}</div>
                                            <div className="text-white font-bold mb-1">Price: {formatPrice(d.price)}</div>
                                            <div className="text-slate-300">Vol: {formatCompact(d.volume)}</div>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Area yAxisId="price" type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#splitFill)" strokeWidth={2} dot={false} />
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
                         <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Market Cap</span><span className="font-bold">{formatCompact(selectedCoin.market_cap)}</span></div>
                         <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Volume</span><span className="font-bold">{formatCompact(selectedCoin.total_volume)}</span></div>
                         <div className="flex justify-between pb-2"><span className="text-slate-500">All Time High</span><span className="font-bold">{formatPrice(selectedCoin.ath)}</span></div>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </>
      )}

      {/* ETF TAB */}
      {activeTab === 'etf' && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
              <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><Landmark size={24} className="text-blue-600"/> US Spot ETF Flows (CoinGlass via Proxy)</h3>
              {status.etf === 'loading' && <div className="text-center py-10 text-slate-400">Đang tải dữ liệu...</div>}
              {status.etf === 'error' && <div className="text-center py-10 text-red-500">Không thể tải dữ liệu (Proxy Error).</div>}
              {status.etf === 'success' && (
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
                          <td className="px-6 py-4 text-right font-medium">{formatPrice(etf.price || etf.closePrice)}</td>
                          <td className="px-6 py-4 text-right font-bold">{formatCompact(etf.aum)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${(etf.flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCompact(etf.flow)}</td>
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
                          <td className="px-6 py-4 font-bold">{dex.displayName || dex.name}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{dex.chains ? dex.chains[0] : '-'}</td>
                          <td className="px-6 py-4 text-right font-bold">{formatCompact(dex.total24h)}</td>
                          <td className={`px-6 py-4 text-right font-bold ${(dex.change_1d || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(dex.change_1d || 0).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-16 pt-10 pb-6 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-500">
          <p>&copy; 2026 VNMetrics. Dữ liệu cung cấp bởi CoinGecko, Binance & DefiLlama.</p>
        </div>
      </footer>
    </div>
  );
}