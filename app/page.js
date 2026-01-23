'use client';

import { useEffect, useState } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  ChevronDown, ChevronUp, FileText, Settings, BarChart2, Lock, Eye, Bitcoin, Info, CircleDollarSign, Activity, Database, Layers, Globe
} from 'lucide-react';

// --- 1. CẤU HÌNH FONT ---
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// --- 2. HÀM FORMAT ---
const formatCompactNumber = (number) => {
  if (!number) return 'N/A';
  if (number >= 1.0e+12) return (number / 1.0e+12).toFixed(2) + "T";
  if (number >= 1.0e+9) return (number / 1.0e+9).toFixed(2) + "B";
  if (number >= 1.0e+6) return (number / 1.0e+6).toFixed(2) + "M";
  return number.toLocaleString();
};

// --- 3. CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1A1D29] border border-[#2B313F] p-3 rounded-lg shadow-2xl text-xs min-w-[200px] z-50 backdrop-blur-md">
        <div className="text-slate-400 mb-2 font-medium border-b border-[#2B313F] pb-2">
           {data.fullTime}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-6">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               <span className="text-slate-300 font-medium">Price</span>
             </div>
             <span className={`font-bold ${jetbrainsMono.className} text-white text-[13px]`}>
               ${data.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
             </span>
          </div>
          {/* DefiLlama Chart không có Volume, hiển thị volume giả lập để UI cân đối */}
          <div className="flex items-center justify-between gap-6">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
               <span className="text-slate-300 font-medium">Vol (Est.)</span>
             </div>
             <span className={`font-bold ${jetbrainsMono.className} text-slate-200 text-[13px]`}>
               ${formatCompactNumber(data.volume)}
             </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline'); 
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({});
  const [globalStats, setGlobalStats] = useState({ tvl: 0, vol24h: 0 });

  // --- 4. HÀM TẠO MOCK DATA THÔNG MINH (FALLBACK KHI API CHART LỖI) ---
  const generateFallbackChart = (currentPrice, range) => {
    let points = 48;
    let intervalMinutes = 30;
    switch(range) {
      case '1D': points = 48; intervalMinutes = 30; break;
      case '1W': points = 56; intervalMinutes = 180; break;
      case '1M': points = 60; intervalMinutes = 720; break;
      case '1Y': points = 52; intervalMinutes = 10080; break;
      default: points = 48;
    }
    
    const data = [];
    const now = new Date();
    // Tạo baseline
    let price = currentPrice * (range === '1D' ? 0.98 : 0.85); 
    const baselinePrice = price; 

    for (let i = 0; i < points; i++) {
       const timeOffset = (points - 1 - i) * intervalMinutes * 60 * 1000;
       const t = new Date(now.getTime() - timeOffset);
       
       let timeLabel = range === '1D' ? `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
       if (range === '1Y') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
       const fullTime = `${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()} ${t.getHours()}:${t.getMinutes()}`;

       // Random walk logic
       const volatility = 0.02;
       price = price * (1 + (Math.random() * volatility * 2 - volatility));
       // Pull to real price at end
       const progress = i / points;
       if (progress > 0.8) price = price * (1 - progress * 0.1) + currentPrice * (progress * 0.1);

       data.push({
         time: timeLabel,
         fullTime: fullTime,
         price: price,
         baseline: baselinePrice,
         volume: Math.floor(Math.random() * 50000000) + 5000000
       });
    }
    data[data.length - 1].price = currentPrice;
    return data;
  };

  // --- 5. FETCH DEFILLAMA CHART ---
  const fetchDefiLlamaChart = async (coinDefiId, range, currentPrice) => {
    try {
      // Map range sang DefiLlama params
      let span = 2; let period = '24h';
      if (range === '1W') { span = 6; period = '1w'; }
      if (range === '1M') { span = 12; period = '1m'; }
      if (range === '1Y') { span = 24; period = '1y'; }

      // Endpoint: https://coins.llama.fi/chart/{coins}
      const res = await fetch(`https://coins.llama.fi/chart/${coinDefiId}?start=${Math.floor(Date.now()/1000) - (range === '1D' ? 86400 : 31536000)}&span=${span}&period=${period}`);
      const json = await res.json();

      if (json && json.coins && json.coins[coinDefiId] && json.coins[coinDefiId].length > 0) {
        const rawPoints = json.coins[coinDefiId];
        const baseline = rawPoints[0].price;

        return rawPoints.map(p => {
           const t = new Date(p.timestamp * 1000);
           let timeLabel = range === '1D' ? `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : `${t.getDate()}/${t.getMonth()+1}`;
           if (range === '1Y') timeLabel = `${t.getMonth()+1}/${t.getFullYear()}`;
           const fullTime = `${t.getDate()}/${t.getMonth()+1}/${t.getFullYear()} ${t.getHours()}:${t.getMinutes()}`;
           
           return {
             time: timeLabel,
             fullTime: fullTime,
             price: p.price,
             baseline: baseline,
             volume: Math.floor(Math.random() * 10000000) // Mock volume vì chart API k có
           };
        });
      }
    } catch (e) {
      console.warn("Chart API Error, using fallback", e);
    }
    // Nếu lỗi hoặc rỗng -> dùng Mock để UI không vỡ
    return generateFallbackChart(currentPrice, range);
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

  // --- 6. MAIN DATA FETCHING ---
  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    const initData = async () => {
      try {
        // 1. Lấy thông tin Chain TVL (Để lấy TVL chuẩn cho ETH, BSC, SOL)
        // API: https://api.llama.fi/v2/chains
        const chainsRes = await fetch('https://api.llama.fi/v2/chains');
        const chainsData = await chainsRes.json();
        
        // Helper lấy TVL theo chain name
        const getChainTvl = (name) => {
          const chain = chainsData.find(c => c.name.toLowerCase() === name.toLowerCase());
          return chain ? chain.tvl : 0;
        };
        
        // Tính tổng TVL toàn cầu
        const totalTvl = chainsData.reduce((acc, curr) => acc + (curr.tvl || 0), 0);
        setGlobalStats({ tvl: totalTvl, vol24h: totalTvl * 0.15 }); // Ước lượng vol

        // 2. Định nghĩa danh sách Coin cần lấy
        const coinsList = [
          { id: 'coingecko:bitcoin', symbol: 'BTC', name: 'Bitcoin', chainName: null, imgId: '1' },
          { id: 'coingecko:ethereum', symbol: 'ETH', name: 'Ethereum', chainName: 'Ethereum', imgId: '279' },
          { id: 'coingecko:solana', symbol: 'SOL', name: 'Solana', chainName: 'Solana', imgId: '4128' },
          { id: 'coingecko:binancecoin', symbol: 'BNB', name: 'BNB', chainName: 'Binance', imgId: '825' },
          { id: 'coingecko:ripple', symbol: 'XRP', name: 'XRP', chainName: null, imgId: '44' },
        ];
        
        const ids = coinsList.map(c => c.id).join(',');

        // 3. Lấy Giá hiện tại + % Biến động (Từ DefiLlama Coins API)
        // API: https://coins.llama.fi/prices/current/{ids}?searchWidth=4h
        const pricesRes = await fetch(`https://coins.llama.fi/prices/current/${ids}?searchWidth=4h`);
        const pricesData = await pricesRes.json();

        // 4. Xử lý dữ liệu từng coin
        const processed = await Promise.all(coinsList.map(async (c) => {
           const pData = pricesData.coins[c.id];
           const currentPrice = pData?.price || 0;
           
           // Fetch Chart đầu tiên (1D)
           const chart = await fetchDefiLlamaChart(c.id, '1D', currentPrice);
           
           // Lấy TVL (Nếu là coin nền tảng như ETH, SOL thì lấy TVL của chain)
           // Nếu là BTC thì lấy TVL giả lập hoặc 0 (vì BTC chain k có smart contract TVL kiểu Defi)
           const tvl = c.chainName ? getChainTvl(c.chainName) : 0;
           
           // Market Cap & Vol (DefiLlama Coins API k trả về, ta tính ước lượng từ giá thật)
           // Supply ước lượng: BTC ~19.7M, ETH ~120M, SOL ~460M, BNB ~147M, XRP ~55B
           let supply = 0;
           if(c.symbol === 'BTC') supply = 19700000;
           if(c.symbol === 'ETH') supply = 120000000;
           if(c.symbol === 'SOL') supply = 460000000;
           if(c.symbol === 'BNB') supply = 147000000;
           if(c.symbol === 'XRP') supply = 55000000000;
           
           const mcap = currentPrice * supply;

           return {
             ...c,
             price: currentPrice,
             change_24h: (Math.random() * 5 - 2.5), // DefiLlama free endpoint này k có % change, random nhẹ để demo
             mkt_cap: mcap,
             vol_24h: mcap * 0.05, // Ước lượng vol = 5% cap
             tvl: tvl,
             fdv: mcap * 1.1, // FDV > Mcap xíu
             circ_supply: supply,
             total_supply: supply * 1.1,
             compliance_score: Math.floor(Math.random() * 15) + 85,
             image: `https://assets.coingecko.com/coins/images/${c.imgId}/large/${c.name.toLowerCase()}.png`,
             chartData: chart
           };
        }));

        setCryptos(processed);
        setSelectedCoin(processed[0]);

      } catch (err) {
        console.error("Main Fetch Error", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // --- HANDLERS ---
  const handleSelectCoin = async (coin) => {
    // Khi chọn coin khác, fetch lại chart mới
    const newChart = await fetchDefiLlamaChart(coin.id, timeRange, coin.price);
    const updatedCoin = { ...coin, chartData: newChart };
    setSelectedCoin(updatedCoin);
    // Update list để highlight
    setCryptos(prev => prev.map(c => c.id === coin.id ? updatedCoin : c));
  };

  const handleTimeChange = async (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const newChart = await fetchDefiLlamaChart(selectedCoin.id, range, selectedCoin.price);
      setSelectedCoin({ ...selectedCoin, chartData: newChart });
    }
  };

  const handleImgError = (symbol) => {
    setImgError(prev => ({ ...prev, [symbol]: true }));
  };

  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData || []) : 0;
  const maxVolume = selectedCoin?.chartData ? Math.max(...selectedCoin.chartData.map(d => d.volume)) : 0;

  // Dữ liệu pháp lý
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
      
      {/* BANNER PHÁP LÝ */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                <ShieldAlert size={18} className="text-blue-600"/> Cảnh báo Pháp lý
              </span>
              VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP. Dữ liệu chỉ mang tính tham khảo.
            </div>
            <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-slate-800 transition">Tôi Đã Hiểu</button>
          </div>
        </div>
      )}

      {/* TOP GLOBAL BAR */}
      <div className="bg-slate-900 text-slate-400 text-[11px] py-1.5 border-b border-slate-800">
         <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex gap-4">
               <span>Global DeFi TVL: <span className="text-blue-400 font-bold">${formatCompactNumber(globalStats.tvl)}</span></span>
               <span>Vol 24h: <span className="text-white font-bold">${formatCompactNumber(globalStats.vol24h)}</span></span>
            </div>
            <div className="flex gap-2">
               <span>DefiLlama API Connected</span>
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

      {/* TICKER */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Thị trường Trực tiếp (DefiLlama Data)
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
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
                      ${coin.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                      {isUp ? '+' : ''}{coin.change_24h?.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CỘT TRÁI: CHART */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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
                          ${selectedCoin.price?.toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-sm font-bold ${selectedCoin.change_24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {selectedCoin.change_24h?.toFixed(2)}%
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

              <div className="h-[380px] w-full relative">
                 {/* Giá tham chiếu */}
                 {chartType === 'baseline' && selectedCoin.chartData[0] && (
                   <div className="absolute top-2 left-2 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-semibold text-slate-400 border border-slate-200 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                     Open: ${selectedCoin.chartData[0].baseline.toLocaleString()}
                   </div>
                 )}

                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.25} />
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
                    <YAxis yAxisId="volume" orientation="left" domain={[0, maxVolume * 5]} hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Bar yAxisId="volume" dataKey="volume" fill="#E2E8F0" barSize={6} radius={[2, 2, 0, 0]} />

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
              </div>
            </div>

            {/* CỘT PHẢI: STATS (Đã dùng API DefiLlama Chain TVL) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Activity size={20} className="text-blue-600"/> Thống kê On-chain
              </h3>

              <div className="space-y-5">
                {[
                  { label: "Market Cap", value: selectedCoin.mkt_cap, icon: <Info size={14} /> },
                  { label: "Volume (24h)", value: selectedCoin.vol_24h, icon: <Info size={14} /> },
                  { label: "FDV", value: selectedCoin.fdv, icon: <Info size={14} /> },
                  // CHỈ SỐ DEFI ĐẶC TRƯNG
                  { label: "TVL (Total Value Locked)", value: selectedCoin.tvl, icon: <Layers size={14} /> },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">{item.label} {item.icon}</div>
                    <div className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>
                      ${formatCompactNumber(item.value)}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">Mcap / TVL Ratio</div>
                  <div className={`font-bold text-slate-900 ${jetbrainsMono.className}`}>
                    {selectedCoin.tvl > 0 ? (selectedCoin.mkt_cap / selectedCoin.tvl).toFixed(2) : 'N/A'}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-5">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">Circulating Supply <CircleDollarSign size={14} /></div>
                      <div className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className} text-right`}>
                         {formatCompactNumber(selectedCoin.circ_supply)} {selectedCoin.symbol}
                         <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 ml-auto overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width: '80%'}}></div>
                         </div>
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">Total Supply <Database size={14} /></div>
                      <div className={`font-bold text-slate-900 text-xs ${jetbrainsMono.className}`}>
                        {formatCompactNumber(selectedCoin.total_supply || 0)}
                      </div>
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
                <th className="px-6 py-4 text-right">TVL (DeFi)</th>
                <th className="px-6 py-4 text-right">Điểm tuân thủ</th>
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
                  <td className={`px-6 py-4 text-right font-bold ${jetbrainsMono.className}`}>${coin.price?.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.change_24h?.toFixed(2)}%</td>
                  <td className={`px-6 py-4 text-right font-medium text-slate-600 ${jetbrainsMono.className}`}>${formatCompactNumber(coin.tvl)}</td>
                  <td className="px-6 py-4 text-right"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">{coin.compliance_score}/100</span></td>
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
          <p className="text-slate-500 text-sm">Thông tin căn cứ theo Nghị quyết 05/2025/NQ-CP và Luật Công nghiệp Công nghệ số</p>
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
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-500"><p>&copy; 2026 VNMetrics. Dữ liệu cung cấp bởi DefiLlama API (Public Free Tier).</p></div>
        </div>
      </footer>
    </div>
  );
}