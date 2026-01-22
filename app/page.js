'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, JetBrains_Mono } from 'next/font/google';

// Cài đặt Font chữ chuyên nghiệp
const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lấy dữ liệu
  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await supabase.from('crypto_prices').select('*').order('symbol');
        if (data) setCryptos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getLogo = (symbol) => {
    if (symbol === 'BTC') return 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
    if (symbol === 'ETH') return 'https://assets.coingecko.com/coins/images/279/large/ethereum.png';
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png';
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${inter.className}`}>
      
      {/* 1. THANH MENU TRÊN CÙNG (NAVBAR) */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold">V</div>
            <span className="text-xl font-bold tracking-tight text-blue-900">VNMetrics</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-700 transition">Thị trường</a>
            <a href="#" className="hover:text-blue-700 transition">Báo cáo</a>
            <a href="#" className="hover:text-blue-700 transition">Pháp lý</a>
            <a href="#" className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition">Kết nối API</a>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION (PHẦN GIỚI THIỆU HOÀNH TRÁNG) */}
      <header className="bg-slate-900 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider border border-blue-500/30">
            Dữ liệu theo Nghị quyết 05/2025/NQ-CP
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mt-6 mb-4 tracking-tight">
            Cổng Thông tin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Tài sản số Quốc gia</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Hệ thống cơ sở dữ liệu minh bạch, chuẩn hóa và cập nhật theo thời gian thực phục vụ định chế tài chính và nhà đầu tư chuyên nghiệp.
          </p>
        </div>
      </header>

      {/* 3. PHẦN DỮ LIỆU CHÍNH */}
      <main className="max-w-6xl mx-auto px-4 -mt-10 mb-20 relative z-10">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Tiêu đề bảng */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-lg text-slate-800">Niêm yết Chính thức</h3>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Cập nhật trực tiếp
            </div>
          </div>

          {/* Nội dung bảng */}
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-3 text-slate-500 text-sm">Đang đồng bộ dữ liệu...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cryptos.map((coin) => (
                <div key={coin.id} className="p-6 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 transition duration-150 group">
                  
                  {/* Tên Coin */}
                  <div className="flex items-center gap-4 w-full md:w-1/3 mb-4 md:mb-0">
                    <img src={getLogo(coin.symbol)} className="w-10 h-10 rounded-full bg-white shadow-sm p-0.5" alt={coin.symbol} />
                    <div>
                      <div className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {coin.name} 
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border">{coin.symbol}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Layer 1 Blockchain</div>
                    </div>
                  </div>

                  {/* Giá (Dùng font Mono cho số đẹp) */}
                  <div className={`w-full md:w-1/3 text-left md:text-center mb-4 md:mb-0 ${mono.className}`}>
                    <div className="text-2xl font-bold text-slate-900">
                      {coin.price 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coin.price) 
                        : '---'}
                    </div>
                    <div className="text-xs text-green-600 font-medium flex items-center md:justify-center gap-1">
                      ▲ 2.4% (24h)
                    </div>
                  </div>

                  {/* Điểm số */}
                  <div className="w-full md:w-1/3 text-left md:text-right">
                    <div className="inline-flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/30 transition">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Điểm Tín nhiệm</div>
                        <div className="text-sm font-semibold text-blue-900">Hạng A+</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-white border-2 border-green-500 flex items-center justify-center text-green-700 font-bold text-sm shadow-sm">
                        95
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button className="text-sm text-blue-600 font-medium hover:underline">Xem toàn bộ 12,400 tài sản khác →</button>
          </div>
        </div>
      </main>

      {/* 4. FOOTER (CHÂN TRANG UY TÍN) */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-bold text-lg mb-4 text-blue-900">VNMetrics</h4>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Đơn vị cung cấp dữ liệu thị trường tài sản mã hóa hàng đầu Việt Nam. Tuân thủ các tiêu chuẩn bảo mật và minh bạch quốc tế.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-slate-800 mb-4">Sản phẩm</h5>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-600">Dữ liệu API</a></li>
              <li><a href="#" className="hover:text-blue-600">Báo cáo thị trường</a></li>
              <li><a href="#" className="hover:text-blue-600">Xếp hạng tín nhiệm</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-800 mb-4">Pháp lý</h5>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-blue-600">Điều khoản sử dụng</a></li>
              <li><a href="#" className="hover:text-blue-600">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-blue-600">Miễn trừ trách nhiệm</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          © 2026 VNMetrics. All rights reserved. Data provided by CoinGecko.
        </div>
      </footer>
    </div>
  );
}