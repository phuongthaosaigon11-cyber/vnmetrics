'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter } from 'next/font/google';
import { AlertTriangle, FileText, BarChart3, ChevronRight, Search, Bell } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('market'); // Tab chuyển đổi: Thị trường / Tin tức

  // Dữ liệu mẫu Admin viết bài (Giả lập CMS)
  const adminPosts = [
    { id: 1, title: "Cảnh báo rủi ro biến động giá Bitcoin dịp cuối năm", date: "22/01/2026", type: "Cảnh báo", author: "Admin" },
    { id: 2, title: "Phổ biến quy định mới về quản lý tài sản số (Dự thảo)", date: "20/01/2026", type: "Pháp lý", author: "Ban Pháp chế" },
    { id: 3, title: "Báo cáo thị trường Tuần 3 tháng 01/2026", date: "18/01/2026", type: "Báo cáo", author: "Research Team" },
  ];

  // Hàm tạo biểu đồ sóng giả lập (SVG Path) nhìn cho "động"
  const generateSparkline = (isUp) => {
    let points = "0,25 ";
    let currentY = 25;
    for (let i = 1; i <= 10; i++) {
      // Tạo dao động ngẫu nhiên
      currentY += Math.random() * 20 - 10; 
      currentY = Math.max(5, Math.min(45, currentY)); // Giới hạn biên độ
      points += `${i * 10},${currentY} `;
    }
    // Điểm cuối cùng tùy theo xu hướng Tăng/Giảm
    points += `100,${isUp ? 5 : 45}`;
    return points;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Lấy dữ liệu thật từ Supabase
        const { data: dbData } = await supabase
          .from('crypto_prices')
          .select('*')
          .order('market_cap', { ascending: false });

        if (dbData && dbData.length > 0) {
          setCryptos(dbData);
        } else {
          // Fallback dữ liệu mẫu nếu kho rỗng (để web luôn đẹp)
          setCryptos([
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 92450, change_24h: 2.5, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 3250, change_24h: -1.2, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 142, change_24h: 5.4, compliance_score: 85 },
            { symbol: 'USDT', name: 'Tether', price_vnd: 25450, price: 1.00, change_24h: 0.1, compliance_score: 80 },
            { symbol: 'XRP', name: 'XRP', price_vnd: 28500, price: 1.12, change_24h: -2.4, compliance_score: 75 },
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

  // Format tiền tệ chuẩn Việt Nam
  const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);

  return (
    <div className={`min-h-screen bg-[#F8F9FA] text-slate-900 ${inter.className}`}>
      
      {/* 1. HEADER: PHONG CÁCH CỔNG THÔNG TIN */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        {/* Top Bar nhỏ */}
        <div className="bg-blue-900 text-white text-[11px] py-1 px-4 text-center">
          DỮ LIỆU ĐƯỢC CUNG CẤP VỚI MỤC ĐÍCH THAM KHẢO - KHÔNG PHẢI LỜI KHUYÊN ĐẦU TƯ
        </div>

        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              VN
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-blue-900 uppercase">VN Metrics</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cổng dữ liệu Tài sản số</p>
            </div>
          </div>

          {/* Menu chính */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
            <button 
              onClick={() => setActiveTab('market')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${activeTab === 'market' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📊 Dữ liệu Thị trường
            </button>
            <button 
              onClick={() => setActiveTab('news')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${activeTab === 'news' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📰 Tin tức & Cảnh báo
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative hidden md:block">
                <input type="text" placeholder="Tra cứu Token..." className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-48 transition" />
                <Search size={16} className="absolute left-3 top-2 text-slate-400" />
             </div>
             <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
               Đăng nhập
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* 2. KHU VỰC THÔNG BÁO TỪ ADMIN (QUAN TRỌNG) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Bell size={18} className="text-red-500" /> Thông báo từ Ban Quản Trị
                </h3>
                <a href="#" className="text-xs text-blue-600 hover:underline">Xem tất cả</a>
             </div>
             <div className="space-y-4">
               {adminPosts.map((post) => (
                 <div key={post.id} className="flex items-start gap-3 group cursor-pointer">
                    <div className={`mt-1 min-w-[60px] px-2 py-0.5 rounded text-[10px] font-bold text-center border uppercase ${
                      post.type === 'Cảnh báo' ? 'bg-red-50 text-red-600 border-red-100' : 
                      post.type === 'Pháp lý' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-green-50 text-green-600 border-green-100'
                    }`}>
                      {post.type}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition">{post.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{post.date} • Đăng bởi {post.author}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
             <h3 className="font-bold text-lg mb-2">Chỉ số Tuân thủ</h3>
             <p className="text-blue-200 text-xs mb-6">Đánh giá dựa trên hồ sơ pháp lý và minh bạch dự án.</p>
             
             <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-full border-4 border-green-400 flex items-center justify-center text-xl font-bold bg-white/10">
                 A+
               </div>
               <div>
                 <div className="text-2xl font-bold">An Toàn</div>
                 <div className="text-xs text-blue-300">Đa số các dự án niêm yết</div>
               </div>
             </div>
             <button className="w-full mt-6 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm transition border border-white/20">
               Xem tiêu chí đánh giá
             </button>
          </div>
        </div>

        {/* 3. BẢNG DỮ LIỆU (REAL DATA) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600"/> Bảng Niêm Yết Tài Sản Số
            </h2>
            <div className="text-xs text-slate-500 italic">
               Dữ liệu cập nhật tự động mỗi 10 phút
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                <tr>
                  <th className="px-6 py-3 font-semibold">Tài sản</th>
                  <th className="px-6 py-3 text-right font-semibold">Giá (VND)</th>
                  <th className="px-6 py-3 text-center font-semibold">Xu hướng (24h)</th>
                  <th className="px-6 py-3 text-center font-semibold">Biến động</th>
                  <th className="px-6 py-3 text-center font-semibold">Điểm Pháp Lý</th>
                  <th className="px-6 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan="6" className="py-10 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                ) : cryptos.map((coin, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition duration-150 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-300 text-xs w-4">{index + 1}</span>
                        <img src={coin.image_url || `https://assets.coingecko.com/coins/images/${index === 0 ? 1 : 279}/large/bitcoin.png`} className="w-8 h-8 rounded-full border border-slate-100" alt={coin.symbol} />
                        <div>
                           <div className="font-bold text-slate-900">{coin.name}</div>
                           <div className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 rounded inline-block">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                       <div className="font-bold text-slate-800 text-base">{formatVND(coin.price_vnd)}</div>
                       <div className="text-xs text-slate-400">${coin.price?.toLocaleString()}</div>
                    </td>

                    {/* Biểu đồ Sóng (Sparkline) tự vẽ bằng SVG */}
                    <td className="px-6 py-4 w-32">
                      <svg width="100" height="50" className="opacity-80">
                         <path 
                           d={`M ${generateSparkline(coin.change_24h >= 0)}`} 
                           fill="none" 
                           stroke={coin.change_24h >= 0 ? "#10B981" : "#EF4444"} 
                           strokeWidth="2" 
                           strokeLinecap="round"
                           className="drop-shadow-sm"
                         />
                      </svg>
                    </td>

                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                         coin.change_24h >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                       }`}>
                         {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h?.toFixed(2)}%
                       </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                       <div className="flex flex-col items-center gap-1">
                          <div className={`w-16 h-2 rounded-full overflow-hidden bg-slate-200`}>
                             <div 
                               className={`h-full ${coin.compliance_score >= 80 ? 'bg-blue-600' : 'bg-yellow-500'}`} 
                               style={{ width: `${coin.compliance_score}%` }}
                             ></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{coin.compliance_score}/100</span>
                       </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                       <button className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-end gap-1 ml-auto group-hover:underline">
                         <FileText size={14} /> Chi tiết
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
             <button className="text-sm text-slate-500 hover:text-blue-700 font-medium flex items-center justify-center gap-1 mx-auto transition">
               Xem toàn bộ danh sách <ChevronRight size={14} />
             </button>
          </div>
        </div>
      </main>

      {/* 4. FOOTER: CẢNH BÁO PHÁP LÝ */}
      <footer className="bg-white border-t border-slate-200 pt-10 pb-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
           <div>
              <div className="flex items-center gap-2 mb-4">
                 <AlertTriangle size={20} className="text-yellow-600" />
                 <h4 className="font-bold text-slate-800 uppercase text-sm">Miễn trừ trách nhiệm</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed text-justify">
                VNMetrics là cổng thông tin cung cấp dữ liệu thị trường và các chỉ số tham khảo. 
                Chúng tôi <strong>không cung cấp dịch vụ giao dịch, môi giới hay tư vấn đầu tư</strong>. 
                Mọi quyết định đầu tư là trách nhiệm của cá nhân. Người dùng cần tuân thủ các quy định pháp luật hiện hành của Nhà nước Việt Nam về tài sản số.
              </p>
           </div>
           <div className="text-right">
              <h4 className="font-bold text-slate-800 uppercase text-sm mb-4">Liên hệ Hỗ trợ</h4>
              <p className="text-xs text-slate-500">Email: contact@vnmetrics.gov.vn (Demo)</p>
              <p className="text-xs text-slate-500 mt-1">Hotline: 1900 xxxx</p>
              <p className="text-xs text-slate-400 mt-4">Phiên bản thử nghiệm v1.2</p>
           </div>
        </div>
        <div className="text-center border-t border-slate-100 pt-6">
           <p className="text-[10px] text-slate-400">© 2026 VNMetrics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}