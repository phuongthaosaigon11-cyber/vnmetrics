'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Be_Vietnam_Pro, Roboto_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  ChevronDown, ChevronUp, FileText, Settings, BarChart2, Lock, Eye, Bitcoin
} from 'lucide-react';

// --- 1. CẤU HÌNH FONT ---
const beVietnam = Be_Vietnam_Pro({ 
  subsets: ['latin', 'vietnamese'], 
  weight: ['400', '500', '600', '700', '800'] 
});
const robotoMono = Roboto_Mono({ subsets: ['latin'] });

// --- 2. CUSTOM SHAPE: NẾN TRADINGVIEW (CÓ RÂU NẾN) ---
const CustomCandleShape = (props) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  // Xác định màu sắc: Tăng (Xanh), Giảm (Đỏ)
  const isUp = close >= open;
  const fill = isUp ? '#22C55E' : '#EF4444'; 
  
  // Tính toán tọa độ vẽ râu nến (Line High-Low)
  // Mẹo: Dùng tỷ lệ height/body_range để map giá sang pixel
  const bodyRange = Math.abs(open - close);
  const pixelRatio = bodyRange === 0 ? 0 : height / bodyRange;
  
  const maxBody = Math.max(open, close);
  const minBody = Math.min(open, close);
  
  // Tọa độ pixel của High và Low
  const yHigh = y - (high - maxBody) * pixelRatio;
  const yLow = y + height + (minBody - low) * pixelRatio;
  const xCenter = x + width / 2;

  return (
    <g>
      {/* Râu nến (Wick) */}
      <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={fill} strokeWidth={1.5} />
      {/* Thân nến (Body) - Nếu open=close (Doji) thì vẽ 1 line ngang */}
      {height === 0 ? (
         <line x1={x} y1={y} x2={x + width} y2={y} stroke={fill} strokeWidth={2} />
      ) : (
         <rect x={x} y={y} width={width} height={height} fill={fill} />
      )}
    </g>
  );
};

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline'); 
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [imgError, setImgError] = useState({}); // State xử lý lỗi ảnh

  // FAQ Dữ liệu (Pháp lý)
  const faqs = [
    {
      question: "Tài sản mã hóa có được coi là tài sản hợp pháp không?",
      answer: "Theo Điều 46 Luật Công nghiệp Công nghệ số và Điều 3 Nghị quyết 05/2025/NQ-CP, Tài sản mã hóa được công nhận là 'Tài sản số'. Tuy nhiên, nó không được sử dụng làm phương tiện thanh toán."
    },
    {
      question: "Nhà đầu tư cá nhân trong nước giao dịch thế nào?",
      answer: "Trong giai đoạn thí điểm, nhà đầu tư trong nước PHẢI thông qua các Tổ chức cung cấp dịch vụ đã được cấp phép để đảm bảo an toàn."
    },
    {
      question: "Thuế đối với tài sản mã hóa được tính như thế nào?",
      answer: "Trong thời gian thí điểm, chính sách thuế đối với giao dịch tài sản mã hóa được áp dụng tương tự như quy định về thuế đối với chứng khoán."
    }
  ];

  // LOGIC TẠO DATA CHART (Có High/Low cho Candle)
  const generateChartData = (currentPrice, range) => {
    const pointsMap = { '1D': 48, '1W': 14, '1M': 30, '1Y': 12, 'ALL': 50 };
    const points = pointsMap[range] || 48;
    
    const data = [];
    let price = currentPrice * (1 - (Math.random() * 0.05)); 
    const baselinePrice = price; 

    for (let i = 0; i < points; i++) {
      const volatility = 0.02; // Biến động
      const change = 1 + (Math.random() * volatility * 2 - volatility);
      price = price * change;
      
      const vol = Math.floor(Math.random() * 5000) + 500;
      
      // Tạo dữ liệu nến (OHLC)
      const open = price;
      const close = price * (1 + (Math.random() * 0.01 - 0.005));
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);

      data.push({ 
        time: range === '1D' ? `${i}:00` : `T${i+1}`, 
        price: close, // Giá cho Line/Baseline
        baseline: baselinePrice,
        volume: vol,
        open, close, high, low,
        // Dữ liệu cho Bar Candle (Body range)
        candleBody: [Math.min(open, close), Math.max(open, close)] 
      });
    }
    // Chốt giá cuối
    data[data.length - 1].price = currentPrice;
    data[data.length - 1].close = currentPrice;
    return data;
  };

  // LOGIC MÀU BASELINE (Xanh/Đỏ)
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

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    // Mock Data
    const mockData = [
      { symbol: 'BTC', name: 'Bitcoin', price: 89594.59, change_24h: 0.79, compliance_score: 98, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
      { symbol: 'ETH', name: 'Ethereum', price: 2950.34, change_24h: -2.33, compliance_score: 95, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
      { symbol: 'SOL', name: 'Solana', price: 128.46, change_24h: 1.64, compliance_score: 88, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
      { symbol: 'BNB', name: 'BNB', price: 590.20, change_24h: 0.5, compliance_score: 92, image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
      { symbol: 'XRP', name: 'XRP', price: 1.92, change_24h: 2.15, compliance_score: 75, image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png" },
    ];
    
    const enrichedMock = mockData.map(c => ({ ...c, chartData: generateChartData(c.price, '1D') }));
    setCryptos(enrichedMock);
    setSelectedCoin(enrichedMock[0]);
    setLoading(false);
  }, []);

  const handleTimeChange = (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const newData = generateChartData(selectedCoin.price, range);
      setSelectedCoin({ ...selectedCoin, chartData: newData });
    }
  };

  const handleImgError = (symbol) => {
    setImgError(prev => ({ ...prev, [symbol]: true }));
  };

  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;
  // Tính max volume để scale (ép volume xuống đáy)
  const maxVolume = selectedCoin ? Math.max(...selectedCoin.chartData.map(d => d.volume)) : 0;

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${beVietnam.className} pb-10`}>
      
      {/* BANNER PHÁP LÝ */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-xl z-[100] p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                <ShieldAlert size={18} className="text-blue-600"/> Tuân thủ pháp luật
              </span>
              VNMetrics tuân thủ Nghị quyết 05/2025/NQ-CP. Dữ liệu chỉ mang tính tham khảo.
            </div>
            <button onClick={() => {localStorage.setItem('vnmetrics_consent', 'true'); setShowConsent(false)}} className="bg-slate-900 text-white font-bold py-2 px-6 rounded hover:bg-slate-800">Đồng ý</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
            <a href="#" className="text-blue-800">Thị trường</a>
            <a href="#" className="hover:text-slate-900">On-chain</a>
            <a href="#" className="hover:text-slate-900">Văn bản pháp luật</a>
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Lock size={14}/> Đăng nhập
          </button>
        </div>
      </nav>

      {/* --- PHẦN 1: TICKER / MARKET RADAR (KHÔI PHỤC THEO YÊU CẦU) --- */}
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
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
              const isSelected = selectedCoin?.symbol === coin.symbol;
              const bgClass = isUp ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#FFF1F2] border-[#FFE4E6]';
              const textClass = isUp ? 'text-[#059669]' : 'text-[#E11D48]';

              return (
                <div 
                  key={coin.symbol} 
                  onClick={() => setSelectedCoin(coin)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-28 ${
                    isSelected ? 'ring-2 ring-blue-600 shadow-md scale-105' : ''
                  } ${bgClass}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm text-slate-800">{coin.symbol}</span>
                    {isUp ? <ArrowUpRight size={20} className={textClass}/> : <ArrowDownRight size={20} className={textClass}/>}
                  </div>
                  <div>
                    <div className={`text-lg font-bold tracking-tight ${robotoMono.className} text-slate-900`}>
                      ${coin.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${textClass}`}>
                      {isUp ? '+' : ''}{coin.change_24h}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* --- PHẦN 2: CHART SECTION (CÓ LOGO FIX, CANDLE MỚI, VOLUME TÁCH BIỆT) --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Header Chart */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                 {/* Xử lý Logo lỗi */}
                 {imgError[selectedCoin.symbol] ? (
                   <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                     <Bitcoin className="text-orange-500" size={28} />
                   </div>
                 ) : (
                   <img 
                     src={selectedCoin.image} 
                     alt={selectedCoin.name} 
                     className="w-12 h-12 rounded-full border border-slate-100 p-0.5 bg-white" 
                     onError={() => handleImgError(selectedCoin.symbol)}
                   />
                 )}
                 
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-2xl font-bold ${robotoMono.className}`}>${selectedCoin.price?.toLocaleString()}</span>
                      <span className={`text-lg font-bold ${selectedCoin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({selectedCoin.change_24h > 0 ? '+' : ''}{selectedCoin.change_24h}%)
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
                      <button onClick={() => setChartType('baseline')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='baseline'?'bg-white text-blue-700 shadow':''}`}>Baseline</button>
                      <button onClick={() => setChartType('candle')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='candle'?'bg-white text-blue-700 shadow':''}`}>Candle</button>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                      {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
                        <button key={range} onClick={() => handleTimeChange(range)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${timeRange === range ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{range}</button>
                      ))}
                    </div>
                </div>
              </div>
            </div>

            {/* CHART AREA */}
            <div className="h-[450px] w-full relative">
               {chartType === 'baseline' && (
                 <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                   Giá tham chiếu: ${selectedCoin.chartData[0]?.baseline.toLocaleString()}
                 </div>
               )}

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset} stopColor="#22C55E" stopOpacity={0.15} />
                      <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset} stopColor="#16A34A" stopOpacity={1} />
                      <stop offset={gradientOffset} stopColor="#DC2626" stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  
                  <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94A3B8'}} axisLine={false} tickLine={false} minTickGap={30} />
                  
                  {/* Trục Giá bên phải */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right" 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 11, fill: '#64748B', fontFamily: 'monospace'}} 
                    axisLine={false} tickLine={false} 
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />

                  {/* Trục Volume bên trái (Ẩn + Domain lớn để đẩy cột xuống đáy) */}
                  <YAxis 
                    yAxisId="volume" 
                    orientation="left" 
                    domain={[0, maxVolume * 6]} // Tỷ lệ *6 giúp volume chỉ chiếm phần nhỏ phía dưới
                    hide 
                  />

                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'var(--font-be-vietnam-pro)'}}
                    formatter={(value, name) => [
                      name === 'price' || name === 'candleBody' ? `$${(Array.isArray(value) ? value[1] : value).toLocaleString()}` : value.toLocaleString(), 
                      name === 'volume' ? 'Volume' : 'Giá'
                    ]}
                    labelStyle={{color: '#94A3B8'}}
                  />

                  {/* Cột Volume nằm dưới đáy */}
                  <Bar yAxisId="volume" dataKey="volume" fill="#E2E8F0" barSize={12} radius={[2, 2, 0, 0]} />

                  {/* Biểu đồ Baseline */}
                  {chartType === 'baseline' && (
                    <>
                      <ReferenceLine yAxisId="price" y={selectedCoin.chartData[0]?.baseline} stroke="#94A3B8" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <Area 
                        yAxisId="price"
                        type="monotone" 
                        dataKey="price" 
                        stroke="url(#splitStroke)" 
                        fill="url(#splitFill)"
                        strokeWidth={2} 
                        animationDuration={500}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </>
                  )}

                  {/* Biểu đồ Candle chuẩn TradingView (CustomShape) */}
                  {chartType === 'candle' && (
                    <Bar 
                      yAxisId="price" 
                      dataKey="candleBody" 
                      shape={<CustomCandleShape />} // Dùng shape vẽ râu nến + thân nến
                      barSize={10}
                      animationDuration={500}
                    />
                  )}

                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MARKET TABLE */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <BarChart2 size={20} className="text-blue-600"/> Thị trường
            </h3>
            <button className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
              <Settings size={14} /> Tùy chỉnh
            </button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Tài sản</th>
                <th className="px-6 py-4 text-right">Giá (USD)</th>
                <th className="px-6 py-4 text-right">Biến động (24h)</th>
                <th className="px-6 py-4 text-right">Điểm tuân thủ</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cryptos.map((coin) => (
                <tr key={coin.symbol} onClick={() => setSelectedCoin(coin)} className={`hover:bg-slate-50 cursor-pointer transition ${selectedCoin?.symbol === coin.symbol ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                     {imgError[coin.symbol] ? (
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><Bitcoin size={16} className="text-slate-400"/></div>
                     ) : (
                       <img src={coin.image} className="w-8 h-8 rounded-full border border-slate-200" onError={() => handleImgError(coin.symbol)} />
                     )}
                     <div><div className="font-bold">{coin.name}</div><div className="text-xs text-slate-400">{coin.symbol}</div></div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${robotoMono.className}`}>${coin.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={`px-6 py-4 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>{coin.change_24h > 0 ? '+' : ''}{coin.change_24h}%</td>
                  <td className="px-6 py-4 text-right"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${coin.compliance_score >= 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{coin.compliance_score}/100</span></td>
                  <td className="px-6 py-4 text-center"><div className="flex justify-center gap-2"><button className="text-xs bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 font-bold py-1.5 px-3 rounded transition flex items-center gap-1"><Eye size={12} /> Xem</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ SECTION */}
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
              <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50">
                <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                {openFaqIndex === idx ? <ChevronUp size={20} className="text-blue-600"/> : <ChevronDown size={20} className="text-slate-400"/>}
              </button>
              {openFaqIndex === idx && <div className="p-5 pt-0 text-sm text-slate-600 bg-white"><div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-justify">{faq.answer}</div></div>}
            </div>
          ))}
        </div>
      </section>

      {/* --- PHẦN 3: FOOTER NGUYÊN BẢN (KHÔI PHỤC ĐẦY ĐỦ) --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
             <ShieldAlert className="text-yellow-500" size={24} />
             <h3 className="font-bold text-white uppercase tracking-wider">Miễn trừ trách nhiệm quan trọng</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-xs leading-relaxed text-justify">
            <div>
              <p className="mb-4">
                <strong>THÔNG TIN THAM KHẢO:</strong> Toàn bộ nội dung được cung cấp trên website này, các trang liên kết, ứng dụng, diễn đàn và các nền tảng mạng xã hội khác ("Trang") chỉ nhằm mục đích cung cấp thông tin chung và được thu thập từ các nguồn bên thứ ba.
              </p>
              <p className="mb-4">
                <strong>KHÔNG ĐẢM BẢO TÍNH CHÍNH XÁC:</strong> Chúng tôi không đưa ra bất kỳ bảo đảm nào dưới bất kỳ hình thức nào liên quan đến nội dung của chúng tôi, bao gồm nhưng không giới hạn ở sự chính xác và tính cập nhật.
              </p>
              <p>
                <strong>KHÔNG PHẢI LỜI KHUYÊN:</strong> Không có phần nào trong nội dung mà chúng tôi cung cấp cấu thành lời khuyên tài chính, lời khuyên pháp lý hoặc bất kỳ hình thức tư vấn nào khác dành riêng cho sự tin cậy của bạn cho bất kỳ mục đích nào.
              </p>
            </div>
            <div>
               <p className="mb-4">
                <strong>TỰ CHỊU TRÁCH NHIỆM:</strong> Việc sử dụng hoặc phụ thuộc vào nội dung của chúng tôi hoàn toàn do bạn tự chịu rủi ro và theo quyết định của riêng bạn. Bạn nên tiến hành nghiên cứu, rà soát, phân tích và xác minh nội dung của chúng tôi trước khi dựa vào chúng.
               </p>
               <p className="mb-4">
                <strong>RỦI RO CAO:</strong> Giao dịch là một hoạt động có rủi ro cao có thể dẫn đến thua lỗ lớn, do đó vui lòng tham khảo ý kiến cố vấn tài chính của bạn trước khi đưa ra bất kỳ quyết định nào.
               </p>
               <p className="text-white font-bold border-l-2 border-yellow-500 pl-3">
                Không có nội dung nào trên Trang của chúng tôi được hiểu là sự chào mời hoặc đề nghị mua bán.
               </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-500">
            <p>&copy; 2026 VNMetrics Enterprise Data Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}