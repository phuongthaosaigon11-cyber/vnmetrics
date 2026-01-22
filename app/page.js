'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Be_Vietnam_Pro, Roboto_Mono } from 'next/font/google';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, 
  HelpCircle, ChevronDown, ChevronUp, FileText
} from 'lucide-react';

// Cấu hình Font chữ
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
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // --- DỮ LIỆU FAQ CHUẨN PHÁP LÝ (Dựa trên NQ 05/2025 & Luật CN Công nghệ số) ---
  const faqs = [
    {
      question: "Tài sản mã hóa (Crypto) có được pháp luật Việt Nam công nhận không?",
      answer: "Theo Điều 3 Nghị quyết 05/2025/NQ-CP và Điều 46 Luật Công nghiệp Công nghệ số, 'Tài sản mã hóa' được xác định là một loại 'Tài sản số' và là tài sản theo quy định của Bộ luật Dân sự. Tuy nhiên, nó không phải là tiền tệ hay phương tiện thanh toán hợp pháp."
    },
    {
      question: "Ai được phép tham gia mua bán trên thị trường thí điểm này?",
      answer: "Theo Điều 6 và Điều 7 Nghị quyết 05/2025/NQ-CP: Chương trình thí điểm ưu tiên cho Nhà đầu tư nước ngoài. Nhà đầu tư trong nước đang sở hữu tài sản mã hóa được phép mở tài khoản để lưu ký và giao dịch thông qua các Tổ chức cung cấp dịch vụ được cấp phép, không được tự do giao dịch trên thị trường "
    },
    {
      question: "Giao dịch tài sản mã hóa có phải đóng thuế không?",
      answer: "Có. Theo khoản 9 Điều 4 Nghị quyết 05/2025/NQ-CP, trong thời gian thí điểm, chính sách thuế đối với giao dịch tài sản mã hóa được áp dụng tương tự như quy định về thuế đối với chứng khoán."
    },
    {
      question: "Quyền lợi của nhà đầu tư được bảo vệ như thế nào?",
      answer: "Theo Điều 16 Nghị quyết 05/2025/NQ-CP, nhà đầu tư được quyền sở hữu hợp pháp tài sản trong tài khoản lưu ký, được bồi thường thiệt hại nếu tổ chức cung cấp dịch vụ để xảy ra sự cố bảo mật, và được giải quyết tranh chấp thông qua Tòa án hoặc Trọng tài thương mại."
    },
    {
      question: "Thời gian thí điểm thị trường là bao lâu?",
      answer: "Theo Điều 18 Nghị quyết này, thời gian thực hiện thí điểm là 05 năm kể từ ngày 09/09/2025. Sau thời gian này, Chính phủ sẽ tổng kết và đề xuất chính sách quản lý chính thức."
    }
  ];

  // Hàm tạo dữ liệu Chart giả lập (Có Volume + Giá Open cố định)
  const generateChartData = (basePrice, range) => {
    const data = [];
    let price = basePrice;
    let points = 24; 
    if (range === '1W') points = 7;
    if (range === '1M') points = 30;
    if (range === '1Y') points = 12;
    if (range === 'ALL') points = 50;

    // Giá mở cửa tham chiếu (Reference)
    const openRef = basePrice * (1 + (Math.random() * 0.05 - 0.025));

    for (let i = 0; i < points; i++) {
      // Biến động giá
      price = price * (1 + (Math.random() * 0.04 - 0.02));
      // Volume ngẫu nhiên
      const vol = Math.floor(Math.random() * 1000) + 500;
      
      data.push({ 
        time: range === '1D' ? `${i}:00` : `T${i+1}`, 
        price: price,
        open: openRef, // Đường baseline
        volume: vol
      });
    }
    // Chốt điểm cuối = giá hiện tại
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

  // --- THUẬT TOÁN MÀU BASELINE (CoinMarketCap) ---
  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const openRef = data[0].open;

    if (dataMax <= dataMin) return 0;
    if (openRef >= dataMax) return 0;
    if (openRef <= dataMin) return 1;

    return (dataMax - openRef) / (dataMax - dataMin);
  };
  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;

  return (
    <div className={`min-h-screen bg-[#F4F6F8] text-slate-900 ${beVietnam.className} pb-10`}>
      
      {/* BANNER CONSENT */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-[100] p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 block mb-1 text-base">Chính sách Dữ liệu & Quyền riêng tư</span>
              Trang web này là một phần của hệ sinh thái <strong>VNMetrics</strong>. Bằng việc tiếp tục sử dụng, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
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

      {/* --- SECTION 1: TICKER CÓ MÀU (GIỮ NGUYÊN) --- */}
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

      {/* --- SECTION 2: BIỂU ĐỒ BASELINE "DÍNH" + VOLUME --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
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
              
              {/* NÚT THỜI GIAN 1D, 1W... */}
              <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                {['1D', '1W', '1M', '1Y', 'ALL'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => handleTimeChange(range)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${
                      timeRange === range 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* CHART AREA */}
            <div className="h-[450px] w-full relative">
               <div className="absolute top-2 left-2 z-10 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm">
                 Giá mở cửa: ${selectedCoin.chartData[0]?.open.toLocaleString()}
               </div>

              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Gradient Baseline: Dùng offset để chia màu Xanh/Đỏ tại đúng vạch tham chiếu */}
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={0} stopColor="#16A34A" stopOpacity={0.3} />
                      <stop offset={gradientOffset} stopColor="#16A34A" stopOpacity={0} />
                      <stop offset={gradientOffset} stopColor="#DC2626" stopOpacity={0} />
                      <stop offset={1} stopColor="#DC2626" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{fontSize: 10, fill: '#94A3B8'}} 
                    axisLine={false} 
                    tickLine={false} 
                    minTickGap={30}
                  />
                  
                  {/* Trục giá bên phải */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right" 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 11, fill: '#64748B', fontFamily: 'monospace'}} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />

                  {/* Trục volume bên trái (ẩn số) */}
                  <YAxis yAxisId="left" orientation="left" hide domain={[0, 'dataMax + 1000']} />

                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'var(--font-be-vietnam-pro)'}}
                    formatter={(value, name) => [
                      name === 'price' ? `$${value.toLocaleString()}` : value.toLocaleString(), 
                      name === 'price' ? 'Giá' : 'Volume'
                    ]}
                    labelStyle={{color: '#94A3B8'}}
                  />

                  {/* Đường tham chiếu giá mở cửa (Dotted Line) */}
                  <ReferenceLine 
                    yAxisId="right"
                    y={selectedCoin.chartData[0]?.open} 
                    stroke="#64748B" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                  />

                  {/* Biểu đồ Volume ở dưới */}
                  <Bar yAxisId="left" dataKey="volume" fill="#CBD5E1" barSize={20} radius={[2, 2, 0, 0]} />

                  {/* Biểu đồ Giá (Baseline Area) */}
                  {/* baseValue={open} giúp vùng fill "dính" vào đường tham chiếu thay vì đáy biểu đồ */}
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="price" 
                    baseValue={selectedCoin.chartData[0]?.open} 
                    stroke={selectedCoin.chartData[selectedCoin.chartData.length-1].price >= selectedCoin.chartData[0].open ? "#16A34A" : "#DC2626"} 
                    strokeWidth={2} 
                    fill="url(#splitColor)" 
                    animationDuration={800}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">Bảng giá Niêm yết</h3>
            <button className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-100">Xem tất cả</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tài sản</th>
                <th className="px-6 py-4 text-right">Giá (VND)</th>
                <th className="px-6 py-4 text-right">Giá (USD)</th>
                <th className="px-6 py-4 text-right">Biến động</th>
                <th className="px-6 py-4 text-center">Tuân thủ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cryptos.map((coin, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setSelectedCoin(coin)}>
                  <td className="px-6 py-5 font-medium">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-300 text-xs font-bold w-4">{idx + 1}</span>
                      <img src={coin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-10 h-10 rounded-full border border-slate-100 bg-white" />
                      <div>
                        <div className="font-bold text-slate-900 text-base">{coin.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-right font-bold text-slate-800 text-base ${robotoMono.className}`}>
                    {formatVND(coin.price_vnd)}
                  </td>
                  <td className={`px-6 py-5 text-right text-slate-500 font-medium ${robotoMono.className}`}>
                    ${coin.price?.toLocaleString()}
                  </td>
                  <td className={`px-6 py-5 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h}%
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wide ${
                      coin.compliance_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {coin.compliance_score >= 80 ? 'An toàn' : 'Cảnh báo'} ({coin.compliance_score})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- FAQ SECTION (MỚI - CUỐI TRANG) --- */}
      <section className="max-w-4xl mx-auto px-4 mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <FileText size={28} className="text-blue-700"/> Pháp lý & Giải đáp
          </h2>
          <p className="text-slate-500 text-sm">Thông tin căn cứ theo Nghị quyết 05/2025/NQ-CP và Luật Công nghiệp Công nghệ số</p>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-md">
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full flex justify-between items-center p-5 text-left bg-white"
              >
                <span className="font-bold text-slate-800 pr-4">{faq.question}</span>
                {openFaqIndex === idx ? <ChevronUp size={20} className="text-blue-600 flex-shrink-0"/> : <ChevronDown size={20} className="text-slate-400 flex-shrink-0"/>}
              </button>
              {openFaqIndex === idx && (
                <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-50">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-justify">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER - DISCLAIMER (TIẾNG VIỆT) */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
             <ShieldCheck className="text-yellow-500" size={24} />
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