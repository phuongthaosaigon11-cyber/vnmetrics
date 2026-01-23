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

// --- 2. COMPONENT VẼ NẾN (CUSTOM CANDLE SHAPE) ---
// Vẽ thân nến và râu nến chuẩn TradingView
const CustomCandleShape = (props) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  // Xác định màu sắc: Tăng là Xanh, Giảm là Đỏ
  const isUp = close >= open;
  const fill = isUp ? '#22C55E' : '#EF4444'; // green-500 : red-500
  const stroke = fill;

  // Tính toán tọa độ Y cho High/Low trên biểu đồ (Recharts dùng hệ tọa độ đảo ngược cho Y)
  // Lưu ý: props.y là điểm trên cùng của Bar (min của open/close), height là độ cao body
  // Chúng ta cần scale lại high/low theo trục Y của chart. 
  // Tuy nhiên, Recharts CustomShape nhận props đã được tính toán pixel. 
  // Để vẽ râu, ta cần truy cập Axis Scale, nhưng ở đây ta dùng mẹo đơn giản:
  // Vì Bar chỉ vẽ thân (Body), ta cần vẽ thêm đường Line cho râu.
  // Nhưng Bar mặc định của Recharts nhận dataKey="price" (hoặc close). 
  // Để vẽ chính xác, ta cần dùng trục Y để convert value sang pixel.
  // Cách đơn giản nhất trong Recharts ComposedChart là vẽ Bar đè lên ErrorBar, 
  // nhưng để tối ưu, ta vẽ thủ công dựa trên tỷ lệ pixel của body.
  
  // *Lưu ý quan trọng*: Để vẽ custom shape nến chính xác 100% trong Recharts rất phức tạp vì thiếu access vào scale.
  // Giải pháp thay thế tốt nhất cho giao diện này là dùng Bar cho Body và ErrorBar cho Wick,
  // HOẶC dùng một trick là vẽ SVG rect và line dựa trên dữ liệu đã scale (được truyền vào qua props low/high nếu config đúng).
  // Ở đây tôi sẽ dùng config chart đặc biệt: dataKey sẽ là mảng [min, max] để Recharts tính toán pixel.
  
  // Tuy nhiên, để giữ code gọn và đẹp, tôi sẽ dùng Bar chart (dạng range) kết hợp logic vẽ Wick.
  // Recharts Bar có thể nhận [min, max].
  
  // Bản chất props y và height của Bar đã thể hiện [min(open, close), max(open, close)].
  // Chúng ta cần tỷ lệ để vẽ High/Low. 
  // Do giới hạn của Recharts context trong custom shape, ta sẽ dùng 1 cách hiển thị nến đơn giản hóa nhưng đẹp:
  // Vẽ thân nến + 2 đường line High/Low giả lập (hoặc bỏ qua râu nến nếu quá phức tạp, nhưng bạn yêu cầu giống TradingView).
  
  // CÁCH FIX: Sử dụng Chart type "Candle" với 2 biểu đồ lồng nhau hoặc dùng thư viện phụ. 
  // Nhưng tôi sẽ dùng cách vẽ thủ công đường Line High-Low đi qua tâm của Bar.
  // Để làm được, tôi cần tính tỷ lệ pixel/giá.
  // Ratio = height / Math.abs(open - close).
  // Y_High = y - (high - max(open, close)) * Ratio
  // Y_Low = y + height + (min(open, close) - low) * Ratio
  
  const priceRange = Math.abs(open - close);
  const pixelRatio = priceRange === 0 ? 0 : height / priceRange;
  
  const maxBody = Math.max(open, close);
  const minBody = Math.min(open, close);
  
  const yHigh = y - (high - maxBody) * pixelRatio;
  const yLow = y + height + (minBody - low) * pixelRatio;
  
  const xCenter = x + width / 2;

  return (
    <g>
      {/* Râu nến (Wick) */}
      <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={stroke} strokeWidth={1.5} />
      {/* Thân nến (Body) */}
      <rect x={x} y={y} width={width} height={height < 1 ? 1 : height} fill={fill} />
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

  // --- 3. DỮ LIỆU PHÁP LÝ ---
  const faqs = [
    {
      question: "Tài sản mã hóa có được coi là tài sản hợp pháp không?",
      answer: "Theo Điều 46 Luật Công nghiệp Công nghệ số và Điều 3 Nghị quyết 05/2025/NQ-CP, Tài sản mã hóa được công nhận là 'Tài sản số'. Tuy nhiên, nó không được sử dụng làm phương tiện thanh toán."
    },
    {
      question: "Nhà đầu tư cá nhân trong nước giao dịch thế nào?",
      answer: "Trong giai đoạn thí điểm, nhà đầu tư trong nước PHẢI thông qua các Tổ chức cung cấp dịch vụ đã được cấp phép để đảm bảo an toàn."
    }
  ];

  // --- 4. GENERATE DATA (Có High/Low cho Nến) ---
  const generateChartData = (currentPrice, range) => {
    const pointsMap = { '1D': 48, '1W': 14, '1M': 30, '1Y': 12, 'ALL': 50 }; // Tăng điểm cho mượt
    const points = pointsMap[range] || 48;
    
    const data = [];
    let price = currentPrice * (1 - (Math.random() * 0.05)); 
    const baselinePrice = price; 

    for (let i = 0; i < points; i++) {
      const volatility = 0.02;
      const change = 1 + (Math.random() * volatility * 2 - volatility);
      price = price * change;
      
      const vol = Math.floor(Math.random() * 5000) + 500;
      
      // Tạo dữ liệu nến thực tế hơn
      const open = price;
      const close = price * (1 + (Math.random() * 0.01 - 0.005));
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);

      data.push({ 
        time: range === '1D' ? `${i}:00` : `T${i+1}`, 
        price: close, // Giá dùng cho Line Chart
        baseline: baselinePrice,
        volume: vol,
        open, close, high, low, // Dữ liệu nến
        // Cho Bar chart nến: dataKey sẽ là mảng [min, max]
        candleBody: [Math.min(open, close), Math.max(open, close)] 
      });
    }
    // Chốt điểm cuối
    data[data.length - 1].price = currentPrice;
    data[data.length - 1].close = currentPrice;
    
    return data;
  };

  // --- 5. LOGIC MÀU BASELINE ---
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

    // Mock Data chuẩn
    const mockData = [
      { symbol: 'BTC', name: 'Bitcoin', price: 89594.59, change_24h: 0.79, compliance_score: 98, image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png" },
      { symbol: 'ETH', name: 'Ethereum', price: 2950.34, change_24h: -2.33, compliance_score: 95, image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png" },
      { symbol: 'SOL', name: 'Solana', price: 128.46, change_24h: 1.64, compliance_score: 88, image: "https://assets.coingecko.com/coins/images/4128/large/solana.png" },
      { symbol: 'BNB', name: 'BNB', price: 590.20, change_24h: 0.5, compliance_score: 92, image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png" },
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

  // Tính max volume để scale biểu đồ cột nhỏ xuống
  const maxVolume = selectedCoin ? Math.max(...selectedCoin.chartData.map(d => d.volume)) : 0;

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${beVietnam.className} pb-10`}>
      
      {/* BANNER */}
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

      {/* CHART SECTION */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Header Chart */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                 {/* FIX LOGO: Fallback icon nếu ảnh lỗi */}
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

            {/* MAIN CHART AREA */}
            <div className="h-[450px] w-full relative">
               {/* Label Baseline */}
               {chartType === 'baseline' && (
                 <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                   Giá tham chiếu: ${selectedCoin.chartData[0]?.baseline.toLocaleString()}
                 </div>
               )}

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Gradient Baseline Đẹp hơn */}
                    <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset} stopColor="#22C55E" stopOpacity={0.15} /> {/* Giảm opacity để tinh tế */}
                      <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={gradientOffset} stopColor="#16A34A" stopOpacity={1} />
                      <stop offset={gradientOffset} stopColor="#DC2626" stopOpacity={1} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  
                  <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94A3B8'}} axisLine={false} tickLine={false} minTickGap={30} />
                  
                  {/* Trục Giá (Phải) */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right" 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 11, fill: '#64748B', fontFamily: 'monospace'}} 
                    axisLine={false} tickLine={false} 
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />

                  {/* Trục Volume (Ẩn & Tách biệt) */}
                  {/* Domain max = maxVolume * 6 để ép volume xuống đáy 1/6 biểu đồ */}
                  <YAxis 
                    yAxisId="volume" 
                    orientation="left" 
                    domain={[0, maxVolume * 6]} 
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

                  {/* Volume Bars - Màu nhạt, nằm dưới đáy */}
                  <Bar yAxisId="volume" dataKey="volume" fill="#E2E8F0" barSize={12} radius={[2, 2, 0, 0]} />

                  {/* CHART LOGIC */}
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

                  {/* CHART CANDLE (TRADINGVIEW STYLE) */}
                  {chartType === 'candle' && (
                    <Bar 
                      yAxisId="price" 
                      dataKey="candleBody" // Dùng mảng [min, max] để vẽ thân nến
                      shape={<CustomCandleShape />} // Dùng custom shape để vẽ râu nến
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
                     {/* FIX LOGO: Fallback icon trong bảng */}
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

      {/* FOOTER & FAQ GIỮ NGUYÊN ... */}
      <section className="max-w-4xl mx-auto px-4 mt-16 mb-16">
         {/* ... (Code FAQ cũ) */}
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

      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-500">
          <p>&copy; 2026 VNMetrics. Dữ liệu chỉ mang tính chất tham khảo.</p>
        </div>
      </footer>
    </div>
  );
}