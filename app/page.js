'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'; // Thư viện vẽ chart xịn
import { 
  Zap, Search, ArrowUpRight, ArrowDownRight, Globe, ShieldCheck, 
  BarChart2, Info, ChevronRight 
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null); // Coin đang được chọn để xem Chart

  // Dữ liệu giả lập cho biểu đồ (Vì Supabase chưa có history)
  const generateChartData = (basePrice) => {
    const data = [];
    let price = basePrice;
    for (let i = 0; i < 24; i++) {
      price = price * (1 + (Math.random() * 0.02 - 0.01)); // Biến động ngẫu nhiên
      data.push({ time: `${i}:00`, price: price });
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
          // Thêm dữ liệu chart giả lập cho từng coin
          const enrichedData = dbData.map(coin => ({
            ...coin,
            chartData: generateChartData(coin.price)
          }));
          setCryptos(enrichedData);
          setSelectedCoin(enrichedData[0]); // Mặc định chọn Bitcoin
        } else {
          // Dữ liệu mẫu (Backup)
          const mockData = [
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 89594.59, change_24h: -0.33, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 2950.34, change_24h: -2.33, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 128.46, change_24h: -1.64, compliance_score: 85 },
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

  return (
    <div className={`min-h-screen bg-[#F4F6F8] text-slate-900 ${inter.className} pb-10`}>
      
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
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-700 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
            <a href="#" className="text-blue-700">Market Data</a>
            <a href="#" className="hover:text-slate-900">Research</a>
            <a href="#" className="hover:text-slate-900">Enterprise</a>
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Đăng nhập</button>
        </div>
      </nav>

      {/* --- SECTION 1: COMPACT TICKER (ĐÃ SỬA GỌN & MÀU SẮC TINH TẾ) --- */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Markets</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
              const isSelected = selectedCoin?.symbol === coin.symbol;
              return (
                <div 
                  key={coin.symbol} 
                  onClick={() => setSelectedCoin(coin)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md flex flex-col justify-between h-20 ${
                    isSelected ? 'ring-2 ring-blue-600 border-transparent bg-blue-50/50' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-700">{coin.symbol}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {coin.change_24h}%
                    </span>
                  </div>
                  <div className={`text-lg font-bold tracking-tight ${mono.className} ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                    ${coin.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* --- SECTION 2: BIỂU ĐỒ LỚN (GIỐNG HÌNH BẠN GỬI) --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                   <img src={selectedCoin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-8 h-8 rounded-full" />
                   <h2 className="text-3xl font-bold text-slate-900">{selectedCoin.price?.toLocaleString()} <span className="text-lg text-slate-400 font-normal">USD</span></h2>
                </div>
                <div className={`flex items-center gap-2 mt-1 font-medium ${selectedCoin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedCoin.change_24h >= 0 ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                  <span className="text-lg">{selectedCoin.change_24h}% (24h)</span>
                </div>
              </div>
              
              {/* Tabs thời gian giả lập */}
              <div className="hidden md:flex bg-slate-100 rounded-lg p-1">
                {['1H', '1D', '1W', '1M', '1Y'].map(t => (
                  <button key={t} className={`px-4 py-1 text-xs font-bold rounded-md ${t === '1D' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* CHART AREA */}
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedCoin.chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedCoin.change_24h >= 0 ? "#10B981" : "#EF4444"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={selectedCoin.change_24h >= 0 ? "#10B981" : "#EF4444"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} orientation="right" tick={{fontSize: 12, fill: '#64748B'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    itemStyle={{color: '#1E293B', fontWeight: 'bold'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={selectedCoin.change_24h >= 0 ? "#10B981" : "#EF4444"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- SECTION 3: BẢNG GIÁ CHI TIẾT --- */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Danh sách Tài sản</h3>
            <button className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">Xem tất cả</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-semibold border-b border-slate-200">
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
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs w-4">{idx + 1}</span>
                      <img src={coin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-8 h-8 rounded-full" />
                      <div>
                        <div className="font-bold text-slate-900">{coin.name}</div>
                        <div className="text-xs text-slate-500">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-slate-700 ${mono.className}`}>
                    {formatVND(coin.price_vnd)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    ${coin.price?.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
                      coin.compliance_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {coin.compliance_score >= 80 ? 'Verified' : 'Reviewing'} ({coin.compliance_score})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- FOOTER: DISCLAIMER (GIỮ NGUYÊN THEO YÊU CẦU) --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
             <ShieldCheck className="text-slate-500" size={24} />
             <h3 className="font-bold text-white uppercase tracking-wider text-sm">Miễn trừ trách nhiệm quan trọng</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[11px] leading-relaxed text-justify opacity-80">
            <div>
              <p className="mb-3">
                <strong>THÔNG TIN THAM KHẢO:</strong> Toàn bộ nội dung được cung cấp trên website này, các trang liên kết, ứng dụng, diễn đàn và các nền tảng mạng xã hội khác (“Trang”) chỉ nhằm mục đích cung cấp thông tin chung và được thu thập từ các nguồn bên thứ ba.
              </p>
              <p className="mb-3">
                <strong>KHÔNG ĐẢM BẢO TÍNH CHÍNH XÁC:</strong> Chúng tôi không đưa ra bất kỳ bảo đảm nào dưới bất kỳ hình thức nào liên quan đến nội dung của chúng tôi, bao gồm nhưng không giới hạn ở sự chính xác và tính cập nhật.
              </p>
              <p>
                <strong>KHÔNG PHẢI LỜI KHUYÊN:</strong> Không có phần nào trong nội dung mà chúng tôi cung cấp cấu thành lời khuyên tài chính, lời khuyên pháp lý hoặc bất kỳ hình thức tư vấn nào khác dành riêng cho sự tin cậy của bạn cho bất kỳ mục đích nào.
              </p>
            </div>
            <div>
               <p className="mb-3">
                <strong>TỰ CHỊU TRÁCH NHIỆM:</strong> Việc sử dụng hoặc phụ thuộc vào nội dung của chúng tôi hoàn toàn do bạn tự chịu rủi ro và theo quyết định của riêng bạn. Bạn nên tiến hành nghiên cứu, rà soát, phân tích và xác minh nội dung của chúng tôi trước khi dựa vào chúng.
               </p>
               <p className="mb-3">
                <strong>RỦI RO CAO:</strong> Giao dịch là một hoạt động có rủi ro cao có thể dẫn đến thua lỗ lớn, do đó vui lòng tham khảo ý kiến cố vấn tài chính của bạn trước khi đưa ra bất kỳ quyết định nào.
               </p>
               <p className="text-white font-bold border-l-2 border-yellow-500 pl-3">
                Không có nội dung nào trên Trang của chúng tôi được hiểu là sự chào mời hoặc đề nghị mua bán.
               </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-600">
            <p>&copy; 2026 VNMetrics Enterprise Data Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}