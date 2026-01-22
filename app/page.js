'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, Roboto_Mono } from 'next/font/google';

// Cấu hình chạy trên Cloudflare
export const runtime = 'edge';

// Font chữ chuyên nghiệp
const inter = Inter({ subsets: ['latin'] });
const mono = Roboto_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('crypto_prices')
        .select('*')
        .order('market_cap', { ascending: false });
      
      if (data) {
        setCryptos(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Định dạng tiền tệ (VND)
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
  };

  // Định dạng Vốn hóa (Tỷ USD)
  const formatCap = (num) => {
    return (num / 1e9).toFixed(2) + " Tỷ $";
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${inter.className}`}>
      
      {/* 1. NAVBAR - THANH ĐIỀU HƯỚNG */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white p-1.5 rounded-lg font-bold text-xl">VN</div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Metrics</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="text-blue-700 font-semibold">Thị trường</a>
            <a href="#" className="hover:text-blue-700 transition">Phân tích</a>
            <a href="#" className="hover:text-blue-700 transition">Văn bản Pháp lý</a>
          </div>
          <button 
            onClick={fetchData}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-md transition flex items-center gap-2"
          >
            🔄 Cập nhật
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION - TIÊU ĐỀ LỚN */}
      <div className="bg-slate-900 text-white pt-12 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Dữ liệu Tài sản số Quốc gia
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Theo dõi thị trường <span className="text-blue-400">Crypto</span> Việt Nam
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Hệ thống dữ liệu thời gian thực, minh bạch và được chuẩn hóa theo tiêu chuẩn kế toán quốc tế.
          </p>
        </div>
      </div>

      {/* 3. HIGHLIGHT CARDS - THẺ NỔI BẬT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 mb-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Bitcoin */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <img src="https://assets.coingecko.com/coins/images/1/large/bitcoin.png" className="w-8 h-8" alt="BTC"/>
              <span className="font-bold text-slate-700">Bitcoin</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">BTC</span>
            </div>
            <div className={`text-2xl font-bold text-slate-900 ${mono.className}`}>
              {cryptos.length > 0 ? formatVND(cryptos[0]?.price_vnd) : '---'}
            </div>
             <div className={`text-sm mt-1 font-medium ${cryptos[0]?.change_24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {cryptos[0]?.change_24h >= 0 ? '▲' : '▼'} {Math.abs(cryptos[0]?.change_24h || 0).toFixed(2)}% (24h)
            </div>
          </div>

           {/* Card Ethereum */}
           <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <img src="https://assets.coingecko.com/coins/images/279/large/ethereum.png" className="w-8 h-8" alt="ETH"/>
              <span className="font-bold text-slate-700">Ethereum</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">ETH</span>
            </div>
            <div className={`text-2xl font-bold text-slate-900 ${mono.className}`}>
              {cryptos.length > 0 ? formatVND(cryptos[1]?.price_vnd) : '---'}
            </div>
             <div className={`text-sm mt-1 font-medium ${cryptos[1]?.change_24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {cryptos[1]?.change_24h >= 0 ? '▲' : '▼'} {Math.abs(cryptos[1]?.change_24h || 0).toFixed(2)}% (24h)
            </div>
          </div>

           {/* Card Tổng vốn hóa (Giả lập) */}
           <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg border border-blue-500">
            <div className="flex items-center gap-3 mb-2 opacity-80">
              <span className="font-bold text-sm uppercase tracking-wider">Tổng Vốn hóa Thị trường</span>
            </div>
            <div className={`text-2xl font-bold ${mono.className}`}>
              $2.45 Tỷ USD
            </div>
             <div className="text-sm mt-1 text-blue-200">
              ▲ 1.2% so với hôm qua
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN TABLE - BẢNG DỮ LIỆU */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800">Bảng giá niêm yết</h2>
            <span className="text-xs text-slate-400 italic">
              Cập nhật lúc: {lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN') : '---'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3">Tài sản</th>
                  <th className="px-6 py-3 text-right">Giá (VND)</th>
                  <th className="px-6 py-3 text-right">Giá (USD)</th>
                  <th className="px-6 py-3 text-right">Thay đổi 24h</th>
                  <th className="px-6 py-3 text-right">Vốn hóa</th>
                  <th className="px-6 py-3 text-center">Xếp hạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                   <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                ) : cryptos.map((coin, index) => (
                  <tr key={coin.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 w-4 text-center text-xs">{index + 1}</span>
                        <img src={coin.image_url} alt={coin.symbol} className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="font-bold">{coin.name}</div>
                          <div className="text-xs text-slate-400">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-slate-800 ${mono.className}`}>
                      {formatVND(coin.price_vnd)}
                    </td>
                    <td className={`px-6 py-4 text-right text-slate-500 ${mono.className}`}>
                      ${coin.price?.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <span className="bg-opacity-10 px-2 py-1 rounded bg-current">
                        {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h?.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCap(coin.market_cap)}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${
                         coin.compliance_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                       }`}>
                         {coin.compliance_score || 85}/100
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 VNMetrics - Cổng thông tin dữ liệu blockchain hàng đầu Việt Nam.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-blue-600">Điều khoản</a>
            <a href="#" className="hover:text-blue-600">Bảo mật</a>
            <a href="#" className="hover:text-blue-600">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}