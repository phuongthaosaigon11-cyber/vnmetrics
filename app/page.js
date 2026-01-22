'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, Roboto_Mono, Be_Vietnam_Pro } from 'next/font/google';
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldAlert, 
  Settings, ChevronDown, Layers, BarChart2
} from 'lucide-react';

// Cấu hình Font (Ưu tiên Be Vietnam Pro cho tiếng Việt)
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
  const [chartType, setChartType] = useState('baseline'); // Mặc định là Baseline

  // Hàm tạo dữ liệu Chart giả lập (OHLC)
  const generateChartData = (basePrice) => {
    const data = [];
    let price = basePrice;
    // Giá mở cửa (cố định để làm mốc cho Baseline)
    const openRef = basePrice * (1 + (Math.random() * 0.05 - 0.025)); 
    
    for (let i = 0; i < 24; i++) {
      let prevPrice = price;
      // Tạo biến động ngẫu nhiên
      price = price * (1 + (Math.random() * 0.04 - 0.02)); 
      
      data.push({ 
        time: `${i}:00`, 
        price: price,           // Giá dùng cho Line/Area chart
        open: openRef,          // Giá mở cửa chung (Baseline reference)
        candleOpen: prevPrice,  // Giá mở của cây nến cụ thể
        candleClose: price,     // Giá đóng của cây nến cụ thể
        // Dữ liệu cho Bar chart dạng nến [min, max]
        candleRange: [Math.min(prevPrice, price), Math.max(prevPrice, price)] 
      });
    }
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
            chartData: generateChartData(coin.price)
          }));
          setCryptos(enrichedData);
          setSelectedCoin(enrichedData[0]);
        } else {
          // Dữ liệu mẫu
          const mockData = [
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 89594.59, change_24h: -0.33, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 2950.34, change_24h: -2.33, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 128.46, change_24h: 1.64, compliance_score: 85 },
            { symbol: 'XRP', name: 'XRP', price_vnd: 28500, price: 1.92, change_24h: 2.13, compliance_score: 75 },
            { symbol: 'DOGE', name: 'Dogecoin', price_vnd: 3500, price: 0.1244, change_24h: -2.15, compliance_score: 60 },
          ];
          const enrichedMock = mockData.map(c => ({ ...c, chartData: generateChartData(c.price) }));
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

  const handleAccept = () => {
    localStorage.setItem('vnmetrics_consent', 'true');
    setShowConsent(false);
  };

  const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);

  // --- THUẬT TOÁN TÔ MÀU BASELINE (Đã sửa lại chuẩn) ---
  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    
    // Tìm max/min của toàn bộ dữ liệu hiển thị
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const openPrice = data[0].open; // Giá tham chiếu

    // Nếu giá mở cửa nằm ngoài phạm vi biểu đồ
    if (dataMax <= dataMin) return 0;
    if (openPrice >= dataMax) return 0; // Toàn bộ đỏ (vì giá luôn thấp hơn mở cửa)
    if (openPrice <= dataMin) return 1; // Toàn bộ xanh (vì giá luôn cao hơn mở cửa)

    // Tính tỷ lệ vị trí của đường tham chiếu
    return (dataMax - openPrice) / (dataMax - dataMin);
  };
  
  const gradientOffset = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;
  // ---------------------------------------------------

  // --- RENDER CHART ---
  const renderChart = () => {
    if (!selectedCoin) return null;

    // Trục tọa độ chung
    const CommonAxis = () => (
      <>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="time" hide />
        <YAxis 
          domain={['auto', 'auto']} 
          orientation="right" 
          tick={{fontSize: 12, fill: '#64748B', fontFamily: 'monospace'}} 
          axisLine={false} 
          tickLine={false} 
          tickFormatter={(val) => `$${val.toLocaleString()}`}
        />
        <Tooltip 
          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'var(--font-be-vietnam-pro)'}}
          formatter={(value) => [`$${value.toLocaleString()}`, 'Giá']}
          labelStyle={{color: '#94A3B8'}}
        />
      </>
    );

    // 1. Biểu đồ Nến (Mô phỏng bằng Bar Chart range)
    if (chartType === 'candle') {
      return (
        <BarChart data={selectedCoin.chartData}>
          <CommonAxis />
          <Bar dataKey="candleRange" animationDuration={1000}>
            {selectedCoin.chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.candleClose >= entry.candleOpen ? '#10B981' : '#EF4444'} 
              />
            ))}
          </Bar>
        </BarChart>
      );
    }

    // 2. Biểu đồ Đường (Line)
    if (chartType === 'line') {
      return (
        <LineChart data={selectedCoin.chartData}>
          <CommonAxis />
          <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} dot={false} animationDuration={1000}/>
        </LineChart>
      );
    }

    // 3. Biểu đồ Vùng Núi (Mountain)
    if (chartType === 'mountain') {
      return (
        <AreaChart data={selectedCoin.chartData}>
          <defs>
            <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CommonAxis />
          <Area type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorMountain)" animationDuration={1000}/>
        </AreaChart>
      );
    }

    // 4. Biểu đồ Baseline (Mặc định)
    return (
      <AreaChart data={selectedCoin.chartData}>
        <defs>
          <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset={gradientOffset} stopColor="#10B981" stopOpacity={0.2} /> {/* Vùng Xanh */}
            <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.2} /> {/* Vùng Đỏ */}
          </linearGradient>
        </defs>
        <CommonAxis />
        {/* Đường kẻ ngang tham chiếu (Giá mở cửa) */}
        <ReferenceLine y={selectedCoin.chartData[0]?.open} stroke="#64748B" strokeDasharray="3 3" />
        <Area 
          type="monotone" 
          dataKey="price" 
          stroke={selectedCoin.chartData[selectedCoin.chartData.length-1].price >= selectedCoin.chartData[0].open ? "#10B981" : "#EF4444"} 
          strokeWidth={3} 
          fill="url(#splitColor)" 
          animationDuration={1000}
        />
      </AreaChart>
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
            <a href="#" className="hover:text-slate-900">Doanh nghiệp</a>
          </div>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Đăng nhập</button>
        </div>
      </nav>

      {/* --- LIVE MARKETS (TICKER CÓ MÀU) --- */}
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
              
              // Màu nền: Xanh ngọc / Hồng nhạt
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

      {/* --- CHART SECTION --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Chart Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                 <img src={selectedCoin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-12 h-12 rounded-full border border-slate-100 p-0.5" />
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-lg font-bold ${robotoMono.className}`}>${selectedCoin.price?.toLocaleString()}</span>
                      <span className={`text-sm font-bold ${selectedCoin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({selectedCoin.change_24h}%)
                      </span>
                   </div>
                 </div>
              </div>
              
              {/* DROPDOWN CHỌN CHART (TIẾNG VIỆT) */}
              <div className="relative group">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-slate-100 transition">
                  <BarChart2 size={16} className="text-slate-500"/>
                  <select 
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="baseline">Biểu đồ Baseline</option>
                    <option value="candle">Biểu đồ Nến (Candle)</option>
                    <option value="mountain">Biểu đồ Vùng (Mountain)</option>
                    <option value="line">Biểu đồ Đường (Line)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none"/>
                </div>
              </div>
            </div>

            {/* Chart Drawing Area */}
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">Tổng quan Thị trường</h3>
            <button className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 hover:bg-blue-100">Xem tất cả</button>
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

      {/* --- FOOTER: PHÁP LÝ (TIẾNG VIỆT THEO YÊU CẦU) --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t border-slate-800">
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