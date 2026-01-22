'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Be_Vietnam_Pro, Roboto_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  HelpCircle, ChevronDown, ChevronUp, FileText, Settings, BarChart2
} from 'lucide-react';

// Cấu hình Font
const beVietnam = Be_Vietnam_Pro({ 
  subsets: ['latin', 'vietnamese'], 
  weight: ['400', '500', '600', '700', '800'] 
});
const robotoMono = Roboto_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [timeRange, setTimeRange] = useState('1D');
  const [chartType, setChartType] = useState('baseline'); // Đã mang lại tính năng chọn Chart
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // FAQ Dữ liệu (Dựa trên NQ 05/2025 & Luật Công nghiệp Công nghệ số)
  const faqs = [
    {
      question: "Tài sản mã hóa có được coi là tài sản hợp pháp không?",
      answer: "Theo Điều 46 Luật Công nghiệp Công nghệ số và Nghị quyết 05/2025/NQ-CP, Tài sản mã hóa được công nhận là 'Tài sản số' và là tài sản theo Bộ luật Dân sự. Tuy nhiên, nó không phải là phương tiện thanh toán."
    },
    {
      question: "Nhà đầu tư cá nhân trong nước có được tự do giao dịch không?",
      answer: "Theo Điều 7 Nghị quyết 05/2025/NQ-CP, trong giai đoạn thí điểm, nhà đầu tư trong nước chỉ được mở tài khoản và giao dịch thông qua các Tổ chức cung cấp dịch vụ đã được Bộ Tài chính cấp phép, nhằm đảm bảo an toàn và tuân thủ quy định phòng chống rửa tiền."
    },
    {
      question: "Thuế đối với tài sản mã hóa được tính như thế nào?",
      answer: "Trong thời gian thí điểm, chính sách thuế đối với giao dịch tài sản mã hóa được áp dụng tương tự như quy định về thuế đối với chứng khoán (theo khoản 9 Điều 4 Nghị quyết thí điểm)."
    }
  ];

  // Tạo dữ liệu giả lập (OHLC + Volume)
  const generateChartData = (basePrice, range) => {
    const data = [];
    let price = basePrice;
    let points = 48; // Nhiều điểm hơn cho mượt
    if (range === '1W') points = 14;
    if (range === '1M') points = 30;
    
    // Giá mở cửa tham chiếu (Cố định cho Baseline)
    const openRef = basePrice; 

    for (let i = 0; i < points; i++) {
      // Biến động giá sao cho có lúc xanh lúc đỏ so với openRef
      price = price * (1 + (Math.random() * 0.06 - 0.03));
      const vol = Math.floor(Math.random() * 5000) + 1000;
      
      data.push({ 
        time: `${i}:00`, 
        price: price,
        open: openRef, // Đường baseline
        volume: vol,
        // Dữ liệu cho nến (giả lập)
        candleHigh: price * 1.01,
        candleLow: price * 0.99,
        candleOpen: price * (1 + (Math.random() * 0.02 - 0.01)),
        candleClose: price
      });
    }
    // Điểm cuối cùng khớp giá hiện tại
    data[data.length - 1].price = basePrice;
    return data;
  };

  useEffect(() => {
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    async function fetchData() {
      try {
        const { data: dbData } = await supabase
          .from('crypto_prices')
          .select('*')
          .order('market_cap', { ascending: false });

        if (dbData && dbData.length > 0) {
          const enrichedData = dbData.map(coin => ({
            ...coin,
            chartData: generateChartData(coin.price, '1D')
          }));
          setCryptos(enrichedData);
          setSelectedCoin(enrichedData[0]);
        } else {
          // Mock Data
          const mockData = [
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 89594.59, change_24h: -0.33, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 2950.34, change_24h: -2.33, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 128.46, change_24h: 1.64, compliance_score: 85 },
            { symbol: 'XRP', name: 'XRP', price_vnd: 28500, price: 1.92, change_24h: 2.13, compliance_score: 75 },
            { symbol: 'DOGE', name: 'Dogecoin', price_vnd: 3500, price: 0.1244, change_24h: -2.15, compliance_score: 60 },
          ];
          const enrichedMock = mockData.map(c => ({ ...c, chartData: generateChartData(c.price, '1D') }));
          setCryptos(enrichedMock);
          setSelectedCoin(enrichedMock[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleTimeChange = (range) => {
    setTimeRange(range);
    if (selectedCoin) {
      const newData = generateChartData(selectedCoin.price, range);
      setSelectedCoin({ ...selectedCoin, chartData: newData });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('vnmetrics_consent', 'true');
    setShowConsent(false);
  };

  const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);

  // --- TÍNH TOÁN MÀU BASELINE (Quan trọng) ---
  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const openRef = data[0].open;

    if (dataMax <= dataMin) return 0;
    if (openRef >= dataMax) return 0; // Toàn bộ đỏ
    if (openRef <= dataMin) return 1; // Toàn bộ xanh

    return (dataMax - openRef) / (dataMax - dataMin);
  };
  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;

  // --- RENDER BIỂU ĐỒ THEO LOẠI ---
  const renderChartBody = () => {
    if (!selectedCoin) return null;

    // 1. CHART NẾN (CANDLE) - Dùng ErrorBar hoặc Bar range (đơn giản hóa bằng Bar range)
    if (chartType === 'candle') {
      return (
        <Bar dataKey="price" fill="#8884d8" barSize={10}>
           {selectedCoin.chartData.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={entry.candleClose >= entry.candleOpen ? '#16A34A' : '#DC2626'} />
           ))}
        </Bar>
      );
    }

    // 2. MOUNTAIN (Xanh dương truyền thống)
    if (chartType === 'mountain') {
      return (
        <Area 
          type="monotone" 
          dataKey="price" 
          stroke="#2563EB" 
          fill="url(#colorMountain)" 
          strokeWidth={2}
        />
      );
    }

    // 3. BASELINE (Mặc định - Màu Xanh/Đỏ theo giá mở cửa)
    return (
      <Area 
        type="monotone" 
        dataKey="price" 
        stroke="url(#splitStroke)" // Đường viền đổi màu
        fill="url(#splitFill)"     // Nền đổi màu
        strokeWidth={2} 
        animationDuration={800}
      />
    );
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${beVietnam.className} pb-10`}>
      
      {/* BANNER CONSENT */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-[100] p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 block mb-1 text-base">Chính sách Dữ liệu & Quyền riêng tư</span>
              Bằng việc tiếp tục sử dụng, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
            </div>
            <div className="flex gap-3 whitespace-nowrap">
              <button onClick={handleAccept} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded transition">Tôi Đồng ý</button>
            </div>
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
            <a href="#" className="hover:text-slate-900">Phân tích</a>
            <a href="#" className="hover:text-slate-900">Văn bản pháp luật</a>
          </div>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Đăng nhập</button>
        </div>
      </nav>

      {/* --- TICKER MÀU NỀN (GIỮ NGUYÊN) --- */}
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
                    isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''
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

      {/* --- CHART SECTION (ĐÃ SỬA VOLUME & BASELINE) --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* 1. Header: Price + Time + Chart Type */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div className="flex items-center gap-4">
                 <img src={selectedCoin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-12 h-12 rounded-full border border-slate-100 p-0.5" />
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-2xl font-bold ${robotoMono.className}`}>${selectedCoin.price?.toLocaleString()}</span>
                      <span className={`text-lg font-bold ${selectedCoin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({selectedCoin.change_24h}%)
                      </span>
                   </div>
                 </div>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                {/* Chart Type Selector (ĐÃ KHÔI PHỤC) */}
                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                   <button onClick={() => setChartType('baseline')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='baseline'?'bg-white text-blue-700 shadow':''}`}>Baseline</button>
                   <button onClick={() => setChartType('mountain')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='mountain'?'bg-white text-blue-700 shadow':''}`}>Mountain</button>
                   <button onClick={() => setChartType('candle')} className={`px-3 py-1.5 text-xs font-bold rounded ${chartType==='candle'?'bg-white text-blue-700 shadow':''}`}>Candle</button>
                </div>

                {/* Time Range */}
                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                  {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
                    <button 
                      key={range}
                      onClick={() => handleTimeChange(range)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${timeRange === range ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. CHART AREA */}
            <div className="h-[450px] w-full relative">
               <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                 Open: ${selectedCoin.chartData[0]?.open.toLocaleString()}
               </div>

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedCoin.chartData}>
                  <defs>
                    {/* Gradient cho Nền (Fill) - Baseline */}
                    <linearGradient id="splitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset={gradientOffset} stopColor="#16A34A" stopOpacity={0} />
                      <stop offset={gradientOffset} stopColor="#DC2626" stopOpacity={0} />
                      <stop offset={1} stopColor="#DC2626" stopOpacity={0.2} />
                    </linearGradient>
                    
                    {/* Gradient cho Đường (Stroke) - Baseline */}
                    <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor="#16A34A" stopOpacity={1} />
                      <stop offset={gradientOffset} stopColor="#16A34A" stopOpacity={1} />
                      <stop offset={gradientOffset} stopColor="#DC2626" stopOpacity={1} />
                      <stop offset={1} stopColor="#DC2626" stopOpacity={1} />
                    </linearGradient>

                    <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  
                  <XAxis 
                    dataKey="time" 
                    tick={{fontSize: 10, fill: '#94A3B8'}} 
                    axisLine={false} tickLine={false} minTickGap={30} 
                  />
                  
                  {/* Trục GIÁ (Phải) */}
                  <YAxis 
                    yAxisId="price"
                    orientation="right" 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 11, fill: '#64748B', fontFamily: 'monospace'}} 
                    axisLine={false} tickLine={false} 
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />

                  {/* Trục VOLUME (Trái - Ẩn số, Domain lớn để đẩy cột xuống đáy) */}
                  <YAxis 
                    yAxisId="volume" 
                    orientation="left" 
                    domain={[0, 'dataMax * 4']} // *4 để volume chỉ chiếm 1/4 chiều cao dưới đáy
                    hide 
                  />

                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'var(--font-be-vietnam-pro)'}}
                    formatter={(value, name) => [
                      name === 'price' ? `$${value.toLocaleString()}` : value.toLocaleString(), 
                      name === 'price' ? 'Giá' : 'Volume'
                    ]}
                    labelStyle={{color: '#94A3B8'}}
                  />

                  {/* Đường tham chiếu giá mở cửa */}
                  {chartType === 'baseline' && (
                    <ReferenceLine yAxisId="price" y={selectedCoin.chartData[0]?.open} stroke="#94A3B8" strokeDasharray="3 3" />
                  )}

                  {/* Volume Bars (Luôn hiện ở dưới đáy) */}
                  <Bar yAxisId="volume" dataKey="volume" fill="#CBD5E1" barSize={15} radius={[2, 2, 0, 0]} />

                  {/* Vẽ Chart Chính (Dùng yAxisId="price") */}
                  {chartType === 'baseline' && (
                    <Area 
                      yAxisId="price"
                      type="monotone" 
                      dataKey="price" 
                      stroke="url(#splitStroke)" // Đường viền đổi màu xanh/đỏ
                      fill="url(#splitFill)"     // Nền đổi màu xanh/đỏ
                      strokeWidth={2} 
                      animationDuration={800}
                    />
                  )}
                  {chartType === 'mountain' && (
                    <Area yAxisId="price" type="monotone" dataKey="price" stroke="#2563EB" fill="url(#colorMountain)" strokeWidth={2} />
                  )}
                  {chartType === 'candle' && (
                    <Line yAxisId="price" type="monotone" dataKey="price" stroke="#8884d8" dot={false} strokeWidth={2} />
                  )}

                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- FAQ SECTION (CUỐI TRANG) --- */}
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
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition"
              >
                <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                {openFaqIndex === idx ? <ChevronUp size={20} className="text-blue-600"/> : <ChevronDown size={20} className="text-slate-400"/>}
              </button>
              {openFaqIndex === idx && (
                <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-50">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-justify">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER - DISCLAIMER (TIẾNG VIỆT) */}
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