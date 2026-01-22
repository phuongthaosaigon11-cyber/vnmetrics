'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Globe, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight,
  Menu,
  X
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check consent
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) setShowConsent(true);

    // Lấy dữ liệu
    async function fetchData() {
      try {
        const { data: dbData } = await supabase
          .from('crypto_prices')
          .select('*')
          .order('market_cap', { ascending: false });

        if (dbData && dbData.length > 0) {
          setCryptos(dbData);
        } else {
          // Dữ liệu mẫu đẹp để demo khi chưa có db
          setCryptos([
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 89148.30, change_24h: -0.83, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 2950.34, change_24h: -2.33, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 128.46, change_24h: -1.64, compliance_score: 85 },
            { symbol: 'XRP', name: 'XRP', price_vnd: 28500, price: 1.92, change_24h: 2.13, compliance_score: 75 },
            { symbol: 'DOGE', name: 'Dogecoin', price_vnd: 3500, price: 0.1244, change_24h: -2.15, compliance_score: 60 },
          ]);
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

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${inter.className} pb-10`}>
      
      {/* --- BANNER CONSENT (Góc dưới) --- */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-[100] p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 block mb-1 text-base">Chính sách Dữ liệu & Quyền riêng tư</span>
              Trang web này là một phần của hệ sinh thái <strong>VNMetrics</strong>. Bằng việc tiếp tục sử dụng, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi. Chúng tôi sử dụng cookie để cá nhân hóa trải nghiệm và phân tích thị trường.
            </div>
            <div className="flex gap-3 whitespace-nowrap">
              <button onClick={handleAccept} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded transition">
                Tôi Đồng ý
              </button>
              <button onClick={() => setShowConsent(false)} className="text-slate-500 hover:text-slate-800 font-medium px-4">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
            <a href="#" className="text-blue-600">Thị trường</a>
            <a href="#" className="hover:text-slate-900">Tin tức</a>
            <a href="#" className="hover:text-slate-900">Dữ liệu On-chain</a>
            <a href="#" className="hover:text-slate-900">Enterprise</a>
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">
            Đăng nhập
          </button>
        </div>
      </nav>

      {/* --- SECTION 1: CNBC STYLE TICKER (CÁI BẠN CẦN) --- */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Crypto Market</h2>
          </div>
          
          {/* GRID CÁC ĐỒNG COIN (Vuông vức, Xanh/Đỏ rực rỡ) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
              return (
                <div 
                  key={coin.symbol} 
                  className={`p-4 rounded-sm flex flex-col justify-between h-28 shadow-sm transition hover:opacity-90 cursor-pointer ${
                    isUp ? 'bg-[#16A34A]' : 'bg-[#DC2626]' /* Màu xanh/đỏ chuẩn CNBC */
                  }`}
                >
                  <div className="flex justify-between items-start text-white/90">
                    <span className="font-bold text-lg">{coin.symbol}</span>
                    {isUp ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <div className={`text-xl font-bold text-white ${mono.className}`}>
                      ${coin.price?.toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-white/80 mt-1">
                      {isUp ? '+' : ''}{coin.change_24h}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* --- SECTION 2: BẢNG CHI TIẾT --- */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Bảng giá Niêm yết</h1>
          <div className="flex gap-2">
            <button className="text-xs font-bold bg-slate-200 px-3 py-1.5 rounded text-slate-600">USD</button>
            <button className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded">VND</button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tài sản</th>
                <th className="px-6 py-4 text-right">Giá VND</th>
                <th className="px-6 py-4 text-right">Giá USD</th>
                <th className="px-6 py-4 text-right">Thay đổi</th>
                <th className="px-6 py-4 text-center">Rủi ro / Tuân thủ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cryptos.map((coin, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={coin.image_url || `https://assets.coingecko.com/coins/images/${idx === 0 ? 1 : idx===1 ? 279 : 4128}/large/${idx===0?'bitcoin':'ethereum'}.png`} className="w-8 h-8 rounded-full" alt={coin.symbol} />
                      <div>
                        <div className="font-bold text-slate-900">{coin.name}</div>
                        <div className="text-xs text-slate-400">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-slate-700 ${mono.className}`}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(coin.price_vnd)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    ${coin.price?.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${
                      coin.compliance_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {coin.compliance_score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- FOOTER: PHÁP LÝ (BẠN YÊU CẦU) --- */}
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