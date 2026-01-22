'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'; // Font tiếng Việt xịn
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, 
  BarChart2, Activity, Layers
} from 'lucide-react';

// Cấu hình Font chữ
const beVietnam = Be_Vietnam_Pro({ 
  subsets: ['latin', 'vietnamese'], 
  weight: ['400', '500', '600', '700', '800'] 
});
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartMode, setChartMode] = useState('baseline'); // Mặc định là kiểu 'Chuẩn mở cửa' bạn thích

  // Hàm tạo dữ liệu Chart giả lập (Mock)
  const generateChartData = (basePrice) => {
    const data = [];
    let price = basePrice;
    // Lấy giá mở cửa (giả định là giá đầu ngày)
    const openPrice = basePrice * (1 + (Math.random() * 0.05 - 0.025)); 
    
    for (let i = 0; i < 24; i++) {
      // Biến động
      price = price * (1 + (Math.random() * 0.03 - 0.015)); 
      data.push({ 
        time: `${i}:00`, 
        price: price,
        open: openPrice // Lưu giá mở cửa để so sánh
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
          // Mock Data nếu chưa có DB
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

  // --- THUẬT TOÁN TÔ MÀU CHART (BASELINE) ---
  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const openPrice = data[0].open; // Giá tham chiếu

    if (dataMax <= dataMin) return 0;
    if (openPrice >= dataMax) return 0; // Toàn bộ đỏ
    if (openPrice <= dataMin) return 1; // Toàn bộ xanh

    return (dataMax - openPrice) / (dataMax - dataMin);
  };

  const off = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;
  // ------------------------------------------

  return (
    <div className={`min-h-screen bg-[#F0F2F5] text-slate-900 ${beVietnam.className} pb-10`}>
      
      {/* BANNER CONSENT */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-[100] p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 block mb-1 text-base">Chính sách Dữ liệu & Quyền riêng tư</span>
              Trang web này là một phần của hệ sinh thái <strong>VNMetrics</strong>. Bằng việc tiếp tục sử dụng, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
            </div>
            <div className="flex gap-3 whitespace-nowrap">
              <button onClick={handleAccept} className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded transition">Tôi Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics</span>
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
      <div className="bg-white border-b border-slate-200 py-5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thị trường Trực tiếp</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
              const isSelected = selectedCoin?.symbol === coin.symbol;
              
              // Màu nền động dựa trên Tăng/Giảm
              const bgClass = isUp ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
              const textClass = isUp ? 'text-emerald-700' : 'text-rose-700';

              return (
                <div 
                  key={coin.symbol} 
                  onClick={() => setSelectedCoin(coin)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md flex flex-col justify-between h-24 ${
                    isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''
                  } ${bgClass}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-slate-800">{coin.symbol}</span>
                    {isUp ? <ArrowUpRight size={18} className="text-emerald-600"/> : <ArrowDownRight size={18} className="text-rose-600"/>}
                  </div>
                  <div>
                    <div className={`text-lg font-bold tracking-tight ${mono.className} text-slate-900`}>
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

      {/* --- KHU VỰC BIỂU ĐỒ (ĐỔI ĐƯỢC KIỂU) --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            {/* Header Chart */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-4">
                   <img src={selectedCoin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-10 h-10 rounded-full bg-white shadow-sm p-0.5" />
                   <div>
                     <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                     <span className="text-sm font-bold text-slate-400">Giá mở cửa: ${selectedCoin.chartData[0]?.open.toLocaleString()}</span>
                   </div>
                </div>
              </div>
              
              {/* Nút chuyển đổi Chart */}
              <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                  onClick={() => setChartMode('mountain')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${chartMode === 'mountain' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Layers size={14}/> Mountain
                </button>
                <button 
                  onClick={() => setChartMode('baseline')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${chartMode === 'baseline' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Activity size={14}/> Baseline (Chuẩn mở cửa)
                </button>
              </div>
            </div>

            {/* CHART AREA */}
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedCoin.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    {/* Gradient cho Mountain Chart */}
                    <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>

                    {/* Gradient cho Baseline Chart (Xanh trên / Đỏ dưới) */}
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#10B981" stopOpacity={0.4}/> {/* Xanh */}
                      <stop offset={off} stopColor="#10B981" stopOpacity={0.05}/>
                      <stop offset={off} stopColor="#EF4444" stopOpacity={0.05}/>
                      <stop offset="1" stopColor="#EF4444" stopOpacity={0.4}/> {/* Đỏ */}
                    </linearGradient>
                  </defs>

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
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontFamily: 'var(--font-be-vietnam-pro)'}}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Giá']}
                    labelStyle={{color: '#94A3B8', marginBottom: '4px'}}
                  />

                  {/* Đường tham chiếu giá mở cửa (Chỉ hiện khi ở chế độ Baseline) */}
                  {chartMode === 'baseline' && (
                    <ReferenceLine y={selectedCoin.chartData[0]?.open} label="" stroke="#94A3B8" strokeDasharray="3 3" />
                  )}

                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={chartMode === 'baseline' ? (selectedCoin.chartData[selectedCoin.chartData.length-1].price >= selectedCoin.chartData[0].open ? "#10B981" : "#EF4444") : "#2563EB"} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill={chartMode === 'baseline' ? "url(#colorBaseline)" : "url(#colorMountain)"} 
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- BẢNG GIÁ CHI TIẾT --- */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg">Danh sách Tài sản</h3>
            <div className="flex gap-2">
               <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded border">Real-time Data</span>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tài sản</th>
                <th className="px-6 py-4 text-right">Giá VND</th>
                <th className="px-6 py-4 text-right">Giá USD</th>
                <th className="px-6 py-4 text-right">24h %</th>
                <th className="px-6 py-4 text-center">Đánh giá Tuân thủ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cryptos.map((coin, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setSelectedCoin(coin)}>
                  <td className="px-6 py-5 font-medium">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-300 text-xs font-bold w-4">{idx + 1}</span>
                      <img src={coin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-10 h-10 rounded-full border border-slate-100 p-0.5 bg-white shadow-sm" />
                      <div>
                        <div className="font-extrabold text-slate-900 text-base">{coin.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-right font-bold text-slate-800 text-base ${mono.className}`}>
                    {formatVND(coin.price_vnd)}
                  </td>
                  <td className="px-6 py-5 text-right text-slate-500 font-medium">
                    ${coin.price?.toLocaleString()}
                  </td>
                  <td className={`px-6 py-5 text-right font-bold ${coin.change_24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h}%
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wide ${
                      coin.compliance_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
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

      {/* FOOTER DISCLAIMER */}
      <footer className="bg-[#0F172A] text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
             <ShieldCheck className="text-amber-500" size={24} />
             <h3 className="font-bold text-white uppercase tracking-wider text-sm">Miễn trừ trách nhiệm quan trọng</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[11px] leading-relaxed text-justify opacity-90 font-medium">
            <div>
              <p className="mb-3">
                <strong>THÔNG TIN THAM KHẢO:</strong> Toàn bộ nội dung được cung cấp trên website này, các trang liên kết, ứng dụng... chỉ nhằm mục đích cung cấp thông tin chung.
              </p>
              <p className="mb-3">
                <strong>KHÔNG ĐẢM BẢO TÍNH CHÍNH XÁC:</strong> Chúng tôi không đưa ra bất kỳ bảo đảm nào liên quan đến nội dung, bao gồm sự chính xác và tính cập nhật.
              </p>
            </div>
            <div>
               <p className="mb-3">
                <strong>TỰ CHỊU TRÁCH NHIỆM:</strong> Việc sử dụng nội dung hoàn toàn do bạn tự chịu rủi ro. Hãy tự nghiên cứu kỹ lưỡng.
               </p>
               <p className="text-white font-bold border-l-4 border-amber-500 pl-3 py-1 bg-white/5 rounded-r">
                Giao dịch tài sản số có rủi ro rất cao. Chúng tôi không đưa ra lời khuyên đầu tư.
               </p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-500 font-bold">
            <p>&copy; 2026 VNMetrics Enterprise Data Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}