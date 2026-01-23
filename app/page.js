'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  ChevronDown, ChevronUp, FileText, Settings, BarChart2, Lock, Eye, Bitcoin, Info, CircleDollarSign, Activity, Database, Layers, Globe, TrendingUp, AlertTriangle, Clock, Hash, DollarSign
} from 'lucide-react';

// --- 1. CẤU HÌNH FONT ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// --- 2. HÀM FORMAT ---
const formatCompactNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) return 'N/A';
  if (number >= 1.0e+12) return (number / 1.0e+12).toFixed(2) + "T";
  if (number >= 1.0e+9) return (number / 1.0e+9).toFixed(2) + "B";
  if (number >= 1.0e+6) return (number / 1.0e+6).toFixed(2) + "M";
  return number.toLocaleString();
};

const formatPrice = (price) => {
  if (!price) return '0.00';
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
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
               ${formatPrice(data.price)}
             </span>
          </div>
          {/* Note: Volume là 0 vì DefiLlama chart không trả volume */}
        </div>
      </div>
    );
  }
  return null;
};

// --- 4. FETCH CHART TỪ DEFILLAMA (LOGIC FIX) ---
const fetchDefiLlamaChart = async (coinDefiId, range) => {
  try {
    // Cấu hình tham số chuẩn để API luôn trả về dữ liệu dày đặc
    let span = 48; // Số lượng điểm
    let period = '30m'; // Độ phân giải
    let startTimestamp = Math.floor(Date.now() / 1000);

    switch(range) {
      case '1D': 
        span = 48; period = '30m'; 
        startTimestamp -= 24 * 60 * 60; // 24h trước
        break;
      case '1W': 
        span = 42; period = '4h'; 
        startTimestamp -= 7 * 24 * 60 * 60; 
        break;
      case '1M': 
        span = 30; period = '1d'; 
        startTimestamp -= 30 * 24 * 60 * 60; 
        break;
      case '1Y': 
        span = 52; period = '1w'; 
        startTimestamp -= 365 * 24 * 60 * 60; 
        break;
      case 'ALL':
         span = 60; period = '1w'; // Lấy tượng trưng
         startTimestamp -= 3 * 365 * 24 * 60 * 60;
         break;
      default: 
        span = 48; period = '30m'; startTimestamp -= 86400;
    }

    const url = `https://coins.llama.fi/chart/${coinDefiId}?start=${startTimestamp}&span=${span}&period=${period}`;
    const res = await fetch(url);
    
    if (!res.ok) return [];

    const json = await res.json();

    if (json && json.coins && json.coins[coinDefiId] && json.coins[coinDefiId].length > 0) {
      const rawPoints = json.coins[coinDefiId];
      const baseline = rawPoints[0].price;

      return rawPoints.map(p => {
         const t = new Date(p.timestamp * 1000);
         // Format nhãn trục X
         let timeLabel = range === '1D' ? `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
         if (range === '1Y' || range === 'ALL') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
         // Format Tooltip
         const fullTime = `${t.getDate().toString().padStart(2,'0')}/${(t.getMonth()+1).toString().padStart(2,'0')}/${t.getFullYear()} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
         
         return {
           time: timeLabel,
           fullTime: fullTime,
           price: p.price,
           baseline: baseline,
           volume: 0 // API này không có volume, để 0
         };
      });
    }
    return []; 
  } catch (e) {
    console.error("Chart Fetch Error:", e);
    return []; 
  }
};

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline'); 
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({});
  const [globalStats, setGlobalStats] = useState({ tvl: 0 });

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    const initData = async () => {
      try {
        setLoading(true);
        // A. Global TVL
        const chainsRes = await fetch('https://api.llama.fi/v2/chains');
        const chainsData = await chainsRes.json();
        const totalTvl = chainsData.reduce((acc, curr) => acc + (curr.tvl || 0), 0);
        setGlobalStats({ tvl: totalTvl });

        // B. CoinGecko Market Data
        const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=false');
        
        if (!cgRes.ok) throw new Error("CoinGecko API Limit");
        
        const cgData = await cgRes.json();

        // C. Map & Load Initial Chart
        // Mapping chính xác ID
        const defiLlamaIds = {
          'bitcoin': 'coingecko:bitcoin',
          'ethereum': 'coingecko:ethereum',
          'solana': 'coingecko:solana',
          'binancecoin': 'coingecko:binancecoin',
          'ripple': 'coingecko:ripple',
          'cardano': 'coingecko:cardano',
          'dogecoin': 'coingecko:dogecoin',
          'tron': 'coingecko:tron',
          'polkadot': 'coingecko:polkadot',
          'avalanche-2': 'coingecko:avalanche-2'
        };

        const processed = await Promise.all(cgData.map(async (coin, index) => {
           const defiId = defiLlamaIds[coin.id] || `coingecko:${coin.id}`;
           
           // Load chart cho coin đầu tiên
           let chart = [];
           if (index === 0) {
             chart = await fetchDefiLlamaChart(defiId, '1D');
           }

           // TVL riêng
           const chainInfo = chainsData.find(c => c.name.toLowerCase() === coin.name.toLowerCase());
           const tvl = chainInfo ? chainInfo.tvl : null;

           return {
             ...coin, // Giữ lại toàn bộ field gốc của CG
             defiId: defiId,
             symbol: coin.symbol.toUpperCase(),
             tvl: tvl,
             compliance_score: 90 + (index % 10),
             chartData: chart
           };
        }));

        setCryptos(processed);
        setSelectedCoin(processed[0]);
        setApiError(false);

      } catch (err) {
        console.error("Init Error:", err);
        setApiError(true);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleSelectCoin = async (coin) => {
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
  
  const faqs = [
    {
      question: "Tài sản mã hóa có được coi là tài sản hợp pháp không?",
      answer: "Theo Điều 46 Luật Công nghiệp Công nghệ số (71/2025/QH15) và Điều 3 Nghị quyết 05/2025/NQ-CP, Tài sản mã hóa được công nhận là 'Tài sản số' và là tài sản theo Bộ luật Dân sự. Tuy nhiên, nó không được sử dụng làm phương tiện thanh toán thay thế tiền pháp định."
    },
    {
      question: "Nhà đầu tư cá nhân trong nước có được tự do giao dịch không?",
      answer: "Theo Điều 7 Nghị quyết 05/2025/NQ-CP, trong giai đoạn thí điểm 5 năm, nhà đầu tư trong nước được phép mở tài khoản, lưu ký và giao dịch nhưng PHẢI thông qua các Tổ chức cung cấp dịch vụ đã được Bộ Tài chính cấp phép để đảm bảo an toàn và tuân thủ quy định."
    },
    {
      question: "Thuế đối với tài sản mã hóa được tính như thế nào?",
      answer: "Theo khoản 9 Điều 4 Nghị quyết 05/2025/NQ-CP, chính sách thuế đối với giao dịch, chuyển nhượng tài sản mã hóa được áp dụng tương tự như quy định về thuế đối với chứng khoán cho đến khi có hướng dẫn mới."
    },
    {
      question: "Tôi có thể dùng tài sản mã hóa để thanh toán hàng hóa dịch vụ không?",
      answer: "Không. Mọi hành vi sử dụng tài sản mã hóa để thanh toán, trao đổi hàng hóa, dịch vụ tại Việt Nam là vi phạm pháp luật và có thể bị xử phạt hành chính hoặc truy cứu trách nhiệm hình sự tùy mức độ."
    }
  ];

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                <ShieldAlert size={18} className="text-blue-600"/> Cảnh báo Pháp lý
              </span>
              VNMetrics hoạt động theo Nghị quyết 05/2025/NQ-CP. Chúng tôi không cung cấp dịch vụ giao dịch trực tiếp. Dữ liệu chỉ mang tính tham khảo.
            </div>
            <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-800 transition">Tôi Đã Hiểu</button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="bg-slate-900 text-slate-400 text-[11px] py-1.5 border-b border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-4">
               <span>Global DeFi TVL: <span className="text-blue-400 font-bold">${formatCompactNumber(globalStats.tvl)}</span></span>
            </div>
            <div className="flex gap-2">
               <span>DefiLlama API Live</span>
               <div className="w-2 h-2 rounded-full bg-green-500 mt-1"></div>
            </div>
         </div>
      </div>

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-700 text-white p-1.5 rounded-lg shadow-sm"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-500">
            <a href="#" className="text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-md">Thị trường</a>
            <a href="#" className="hover:text-slate-900 py-1.5">Dữ liệu On-chain</a>
            <a href="#" className="hover:text-slate-900 py-1.5">Văn bản pháp luật</a>
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
            <Lock size={14}/> Đăng nhập
          </button>
        </div>
      </nav>

      {/* ALERT ERROR */}
      {apiError && (
        <div className="bg-red-50 text-red-700 px-4 py-2 text-center text-sm font-bold border-b border-red-100 flex items-center justify-center gap-2">
           <AlertTriangle size={16}/> Không thể tải dữ liệu thị trường (API Error). Vui lòng tải lại trang sau ít phút.
        </div>
      )}

      {/* TICKER */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thị trường Trực tiếp</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {loading ? (
               Array(5).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-50 rounded-xl animate-pulse"></div>)
            ) : (
              cryptos.slice(0, 5).map((coin) => {
                const isUp = coin.price_change_percentage_24h >= 0;
                const isSelected = selectedCoin?.id === coin.id;
                return (
                  <div 
                    key={coin.id} 
                    onClick={() => handleSelectCoin(coin)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between h-28 ${
                      isSelected 
                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30 shadow-md' 
                        : 'border-slate-200 hover:shadow-lg bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-700">{coin.symbol}</span>
                      {isUp ? <ArrowUpRight size={18} className="text-green-500"/> : <ArrowDownRight size={18} className="text-red-500"/>}
                    </div>
                    <div>
                      <div className={`text-lg font-bold tracking-tight ${jetbrainsMono.className} text-slate-900`}>
                        ${formatPrice(coin.current_price)}
                      </div>
                      <div className={`text-xs font-bold mt-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        {isUp ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CHART AREA */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                   {imgError[selectedCoin.symbol] ? (
                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><Bitcoin className="text-orange-500"/></div>
                   ) : (
                     <img src={selectedCoin.image} alt={selectedCoin.name} className="w-12 h-12 rounded-full border border-slate-100" onError={() => handleImgError(selectedCoin.symbol)}/>
                   )}
                   <div>
                     <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                     <div className="flex items-center gap-3 mt-1">
                        <span className={`text-2xl font-bold ${jetbrainsMono.className} text-slate-900`}>
                          ${formatPrice(selectedCoin.current_price)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${selectedCoin.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {selectedCoin.price_change_percentage_24h?.toFixed(2)}%
                        </span>
                     </div>
                   </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition">
                      <ShieldAlert size={16} /> Lưu ký Tài sản
                    </button>
                    <button className="flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition">
                      <FileText size={16} /> Sách trắng
                    </button>
                  </div>
                  <div className="flex gap-2">
                      <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button onClick={() => setChartType('baseline')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='baseline'?'bg-white text-blue-700 shadow-sm':''}`}>Baseline</button>
                        <button onClick={() => setChartType('mountain')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='mountain'?'bg-white text-blue-700 shadow-sm':''}`}>Mountain</button>
                      </div>
                      <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
                          <button key={range} onClick={() => handleTimeChange(range)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${timeRange === range ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{range}</button>
                        ))}
                      </div>
                  </div>
                </div>
              </div>

              <div className="flex-grow w-full relative min-h-[350px]">
                 {(!selectedCoin.chartData || selectedCoin.chartData.length === 0) ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Activity size={48} className="text-slate-300 mb-2"/>
                      <p className="text-slate-500 font-bold">No Chart Data Available</p>
                      <p className="text-xs text-slate-400 mt-1">DefiLlama API might be unavailable for this pair/range.</p>
                    </div>
                 ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={1} />
                            <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={1} />
                          </linearGradient>
                          <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="time" tick={{fontSize: 11, fill: '#94A3B8', fontFamily: 'var(--font-inter)'}} axisLine={false} tickLine={false} minTickGap={40} />
                        <YAxis yAxisId="price" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#64748B', fontFamily: 'var(--font-mono)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        
                        {chartType === 'baseline' && selectedCoin.chartData[0] && (
                          <>
                            <ReferenceLine yAxisId="price" y={selectedCoin.chartData[0].baseline} stroke="#CBD5E1" strokeDasharray="3 3" />
                            <Area yAxisId="price" type="monotone" dataKey="price" baseValue={selectedCoin.chartData[0].baseline} stroke="url(#splitStroke)" fill="url(#splitFill)" strokeWidth={2} animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                          </>
                        )}
                        {chartType === 'mountain' && (
                          <Area yAxisId="price" type="monotone" dataKey="price" stroke="#3B82F6" fill="url(#colorMountain)" strokeWidth={2} animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                 )}
              </div>
            </div>

            {/* STATS PRO UI */}
            <div className="lg:col-span-1 space-y-4">
               {/* Box 1: Market Data */}
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Globe size={16}/> Market Overview</h3>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Market Cap</span>
                        <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>${formatCompactNumber(selectedCoin.market_cap)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Volume (24h)</span>
                        <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>${formatCompactNumber(selectedCoin.total_volume)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">FDV</span>
                        <span className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>${formatCompactNumber(selectedCoin.fully_diluted_valuation)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 flex items-center gap-1">TVL <Layers size={12}/></span>
                        <span className={`font-bold text-blue-600 ${jetbrainsMono.className}`}>
                           {selectedCoin.tvl ? `$${formatCompactNumber(selectedCoin.tvl)}` : 'N/A'}
                        </span>
                     </div>
                  </div>
               </div>

               {/* Box 2: Price Performance */}
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={16}/> Performance</h3>
                  
                  {/* Range Bar */}
                  <div className="mb-4">
                     <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span>Low: ${formatPrice(selectedCoin.low_24h)}</span>
                        <span>High: ${formatPrice(selectedCoin.high_24h)}</span>
                     </div>
                     <div className="w-full h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-slate-800 rounded-full w-2"
                             style={{left: `${((selectedCoin.current_price - selectedCoin.low_24h) / (selectedCoin.high_24h - selectedCoin.low_24h)) * 100}%`}}>
                        </div>
                        <div className="w-full h-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 opacity-50"></div>
                     </div>
                     <div className="text-right text-[10px] text-slate-400 mt-1">24h Range</div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-50">
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">ATH (All Time High)</span>
                        <div className="text-right">
                           <div className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>${formatPrice(selectedCoin.ath)}</div>
                           <div className="text-[10px] text-red-500 font-bold">{selectedCoin.ath_change_percentage?.toFixed(2)}%</div>
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">ATL (All Time Low)</span>
                        <div className="text-right">
                           <div className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>${formatPrice(selectedCoin.atl)}</div>
                           <div className="text-[10px] text-green-500 font-bold">+{selectedCoin.atl_change_percentage?.toFixed(2)}%</div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Box 3: Supply */}
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Database size={16}/> Supply Info</h3>
                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Circulating</span>
                        <span className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.circulating_supply)}</span>
                     </div>
                     {/* Progress Bar Supply */}
                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-600" style={{width: `${(selectedCoin.circulating_supply / (selectedCoin.max_supply || selectedCoin.total_supply)) * 100}%`}}></div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Total Supply</span>
                        <span className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>{formatCompactNumber(selectedCoin.total_supply)}</span>
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
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tài sản</th>
                <th className="px-6 py-4 text-right">Giá (USD)</th>
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
                  <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>${formatPrice(coin.current_price)}</td>
                  <td className={`px-6 py-4 text-right font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.price_change_percentage_24h?.toFixed(2)}%</td>
                  <td className={`px-6 py-4 text-right font-medium text-slate-600 ${jetbrainsMono.className}`}>${formatCompactNumber(coin.market_cap)}</td>
                  <td className={`px-6 py-4 text-right font-medium text-slate-600 ${jetbrainsMono.className}`}>
                     {coin.tvl ? `$${formatCompactNumber(coin.tvl)}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-center"><button className="text-xs bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded font-bold transition flex items-center gap-1 mx-auto"><Eye size={12}/> Xem</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER & FAQ (GIỮ NGUYÊN) */}
      <section className="max-w-4xl mx-auto px-4 mt-16 mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <FileText size={28} className="text-blue-700"/> Pháp lý & Giải đáp
          </h2>
          <p className="text-slate-500 text-sm">Thông tin căn cứ theo Nghị quyết 05/2025/NQ-CP</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50"><span className="font-bold text-slate-800 pr-4">{faq.question}</span>{openFaqIndex === idx ? <ChevronUp size={20} className="text-blue-600"/> : <ChevronDown size={20} className="text-slate-400"/>}</button>
              {openFaqIndex === idx && <div className="p-5 pt-0 text-sm text-slate-600 bg-white"><div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-justify">{faq.answer}</div></div>}
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
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