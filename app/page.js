'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter } from 'next/font/google';
import { AlertTriangle, FileText, BarChart3, ChevronRight, Search, Bell, X, ShieldCheck } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('market');
  
  // State cho Banner Pháp lý (Giống CNBC)
  const [showConsent, setShowConsent] = useState(false);

  // Dữ liệu mẫu Admin
  const adminPosts = [
    { id: 1, title: "Cảnh báo rủi ro biến động giá Bitcoin dịp cuối năm", date: "22/01/2026", type: "Cảnh báo", author: "Admin" },
    { id: 2, title: "Phổ biến quy định mới về quản lý tài sản số (Dự thảo)", date: "20/01/2026", type: "Pháp lý", author: "Ban Pháp chế" },
    { id: 3, title: "Báo cáo thị trường Tuần 3 tháng 01/2026", date: "18/01/2026", type: "Báo cáo", author: "Research Team" },
  ];

  // Hàm tạo biểu đồ sóng giả
  const generateSparkline = (isUp) => {
    let points = "0,25 ";
    let currentY = 25;
    for (let i = 1; i <= 10; i++) {
      currentY += Math.random() * 20 - 10; 
      currentY = Math.max(5, Math.min(45, currentY));
      points += `${i * 10},${currentY} `;
    }
    points += `100,${isUp ? 5 : 45}`;
    return points;
  };

  useEffect(() => {
    // 1. Kiểm tra xem người dùng đã bấm "Đồng ý" chưa
    const hasConsented = localStorage.getItem('vnmetrics_consent');
    if (!hasConsented) {
      setShowConsent(true); // Chưa đồng ý thì hiện banner
    }

    // 2. Lấy dữ liệu
    async function fetchData() {
      try {
        const { data: dbData } = await supabase
          .from('crypto_prices')
          .select('*')
          .order('market_cap', { ascending: false });

        if (dbData && dbData.length > 0) {
          setCryptos(dbData);
        } else {
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

  const handleAccept = () => {
    localStorage.setItem('vnmetrics_consent', 'true'); // Lưu vào bộ nhớ
    setShowConsent(false); // Ẩn banner
  };

  const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);

  return (
    <div className={`min-h-screen bg-[#F0F2F5] text-slate-900 ${inter.className} pb-32`}>
      
      {/* --- BANNER PHÁP LÝ (CNBC STYLE) --- */}
      {showConsent && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-300 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[100] p-6 md:p-8 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h4 className="font-bold text-lg text-slate-900 mb-2 flex items-center gap-2">
                <ShieldCheck className="text-blue-700" size={24} />
                Thông báo Pháp lý & Bảo mật Dữ liệu
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed text-justify">
                Trang thông tin này hiện là một phần của <strong>Cổng dữ liệu VNMetrics</strong>. 
                Bằng việc tiếp tục sử dụng dịch vụ, bạn đồng ý với <a href="#" className="text-blue-700 underline font-medium">Điều khoản sử dụng</a> và xác nhận rằng <a href="#" className="text-blue-700 underline font-medium">Chính sách Bảo mật</a> cập nhật của chúng tôi được áp dụng, bao gồm cả dữ liệu hiện có của bạn.
                Chúng tôi và các đối tác sử dụng công cụ trên trang này để cung cấp dịch vụ, cá nhân hóa trải nghiệm và phân tích thị trường theo Nghị quyết 05/2025/NQ-CP.
              </p>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px] w-full md:w-auto">
              <button 
                onClick={handleAccept}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition transform hover:scale-105 text-center"
              >
                TÔI ĐỒNG Ý & TIẾP TỤC
              </button>
              <button 
                onClick={() => setShowConsent(false)}
                className="text-xs text-slate-400 hover:text-slate-600 underline text-center"
              >
                Đóng (Chỉ xem)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ----------------------------------- */}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="bg-[#0A1F44] text-white text-[10px] py-1.5 px-4 text-center font-medium tracking-wide">
          ⚠️ CẢNH BÁO: THỊ TRƯỜNG TÀI SẢN SỐ CÓ BIẾN ĐỘNG CAO. NHÀ ĐẦU TƯ CẦN CÂN NHẮC KỸ TRƯỚC KHI THAM GIA.
        </div>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-800 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              VN
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none text-blue-900 tracking-tight">VNMetrics</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Government Data Portal</p>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('market')}
              className={`px-5 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'market' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Thị trường
            </button>
            <button 
              onClick={() => setActiveTab('news')}
              className={`px-5 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'news' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Văn bản & Tin tức
            </button>
          </div>

          <div className="flex items-center gap-4">
             <Search size={20} className="text-slate-400 cursor-pointer hover:text-blue-700" />
             <div className="h-8 w-[1px] bg-slate-200"></div>
             <button className="text-slate-600 text-sm font-medium hover:text-blue-800">Đăng nhập</button>
             <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition">
               Đăng ký
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* TIN TỨC & THÔNG BÁO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Bell size={16} className="text-blue-600" /> Thông báo điều hành
                </h3>
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">Xem lưu trữ</span>
             </div>
             <div className="divide-y divide-slate-50">
               {adminPosts.map((post) => (
                 <div key={post.id} className="p-4 hover:bg-slate-50 transition cursor-pointer flex gap-4 items-start">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 bg-slate-100 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{post.date.split('/')[1]}</span>
                      <span className="text-lg font-bold text-slate-800">{post.date.split('/')[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          post.type === 'Cảnh báo' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {post.type}
                        </span>
                        <span className="text-xs text-slate-400">by {post.author}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 hover:text-blue-700 leading-snug">{post.title}</h4>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Widget Chỉ số */}
          <div className="bg-gradient-to-b from-blue-900 to-[#0A1F44] rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <ShieldCheck size={120} />
             </div>
             <h3 className="font-bold text-lg mb-1 relative z-10">Compliance Index</h3>
             <p className="text-blue-300 text-xs mb-8 relative z-10">Chỉ số tuân thủ pháp lý thị trường</p>
             
             <div className="flex items-end gap-2 relative z-10">
               <span className="text-5xl font-black tracking-tighter">84.2</span>
               <span className="text-lg font-bold text-green-400 mb-2">/100</span>
             </div>
             <div className="w-full bg-blue-900/50 h-2 rounded-full mt-4 relative z-10">
               <div className="w-[84.2%] h-full bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
             </div>
             <p className="text-[10px] text-blue-300 mt-3 relative z-10 text-right">Cập nhật: Hôm nay</p>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <BarChart3 size={24} className="text-blue-800"/> Dữ liệu Niêm Yết
            </h2>
            <div className="flex gap-2">
               <button className="text-xs font-bold text-white bg-blue-800 px-3 py-1.5 rounded shadow-sm">VND</button>
               <button className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200">USD</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tài sản</th>
                  <th className="px-6 py-4 text-right">Giá niêm yết</th>
                  <th className="px-6 py-4 text-center">Xu hướng (24h)</th>
                  <th className="px-6 py-4 text-center">Biến động</th>
                  <th className="px-6 py-4 text-center">Điểm Tuân thủ</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                   <tr><td colSpan="6" className="py-12 text-center text-slate-400 italic">Đang đồng bộ dữ liệu quốc gia...</td></tr>
                ) : cryptos.map((coin, index) => (
                  <tr key={index} className="hover:bg-blue-50/20 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-300 text-xs font-bold w-4">{index + 1}</span>
                        <img src={coin.image_url || `https://assets.coingecko.com/coins/images/${index === 0 ? 1 : 279}/large/bitcoin.png`} className="w-9 h-9 rounded-full border border-slate-100 shadow-sm p-0.5 bg-white" alt={coin.symbol} />
                        <div>
                           <div className="font-bold text-slate-900 text-base">{coin.name}</div>
                           <div className="text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded inline-block border border-slate-200">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                       <div className="font-bold text-slate-900 text-base font-mono">{formatVND(coin.price_vnd)}</div>
                       <div className="text-xs text-slate-400 font-medium">${coin.price?.toLocaleString()}</div>
                    </td>

                    <td className="px-6 py-4 w-32">
                      <svg width="100" height="40" className="mx-auto">
                         <path 
                           d={`M ${generateSparkline(coin.change_24h >= 0)}`} 
                           fill="none" 
                           stroke={coin.change_24h >= 0 ? "#16a34a" : "#dc2626"} 
                           strokeWidth="2" 
                           strokeLinecap="round"
                           className="drop-shadow-sm"
                         />
                      </svg>
                    </td>

                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                         coin.change_24h >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                       }`}>
                         {coin.change_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change_24h).toFixed(2)}%
                       </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${coin.compliance_score >= 80 ? 'bg-blue-600' : 'bg-yellow-500'}`}></div>
                          <span className="text-sm font-bold text-slate-700">{coin.compliance_score}/100</span>
                       </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                       <button className="text-blue-700 hover:text-blue-900 text-xs font-bold border border-blue-200 hover:border-blue-700 px-3 py-1.5 rounded transition bg-white">
                         Chi tiết
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
             <div className="w-6 h-6 bg-slate-400 rounded flex items-center justify-center text-white font-bold text-xs">VN</div>
             <span className="font-bold text-slate-400">VNMetrics</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 VNMetrics. Bản quyền thuộc về Cổng dữ liệu Quốc gia.</p>
        </div>
      </footer>
    </div>
  );
}