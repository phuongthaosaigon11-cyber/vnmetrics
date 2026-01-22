'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, Roboto_Mono } from 'next/font/google';

// Bỏ dòng runtime = 'edge' đi để tránh lỗi xung đột (quan trọng!)
// export const runtime = 'edge'; 

const inter = Inter({ subsets: ['latin'] });
const mono = Roboto_Mono({ subsets: ['latin'] });

export default function Home() {
  // 1. CẤU HÌNH DỮ LIỆU MẪU (Để web luôn đẹp ngay khi mở)
  const defaultData = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 92000, change_24h: 2.5, market_cap: 1800000000000, compliance_score: 95, image_url: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 2, symbol: 'ETH', name: 'Ethereum', price_vnd: 82000000, price: 3200, change_24h: -1.2, market_cap: 380000000000, compliance_score: 92, image_url: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 3, symbol: 'SOL', name: 'Solana', price_vnd: 3500000, price: 135, change_24h: 5.4, market_cap: 65000000000, compliance_score: 85, image_url: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 4, symbol: 'USDT', name: 'Tether', price_vnd: 25450, price: 1.00, change_24h: 0.01, market_cap: 110000000000, compliance_score: 88, image_url: 'https://assets.coingecko.com/coins/images/325/large/Tether.png' },
  ];

  const [cryptos, setCryptos] = useState(defaultData); // Dùng dữ liệu mẫu trước
  const [loading, setLoading] = useState(false); // Không xoay vòng nữa, hiện luôn
  const [viewVND, setViewVND] = useState(true);

  // 2. LẤY DỮ LIỆU THẬT (Chạy ngầm)
  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('crypto_prices')
          .select('*')
          .order('market_cap', { ascending: false });
        
        // Chỉ cập nhật nếu có dữ liệu thật từ Supabase
        if (data && data.length > 0) {
          setCryptos(data);
          console.log("Đã cập nhật dữ liệu thật!");
        }
      } catch (err) {
        console.error("Lỗi lấy data, dùng dữ liệu mẫu:", err);
      }
    }
    fetchData();
  }, []);

  const formatMoney = (val, isVND) => {
    if (!val) return '---';
    if (isVND) return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatCap = (val) => {
    if (!val) return '---';
    return (val / 1e9).toFixed(2) + " Tỷ $";
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${inter.className}`}>
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">VN</div>
            <span className="font-bold text-xl text-blue-900">VNMetrics</span>
          </div>
          <button 
            onClick={() => setViewVND(!viewVND)}
            className="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-blue-900 px-4 py-2 rounded-full transition border border-slate-200"
          >
            Đổi tiền tệ: {viewVND ? '🇻🇳 VND' : '🇺🇸 USD'}
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="bg-slate-900 text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-900 border border-blue-700 text-blue-300 text-xs font-bold uppercase mb-4">
            Official Data Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Cổng Dữ Liệu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Tài Sản Số</span>
          </h1>
          <p className="text-slate-400 text-lg">Hệ thống giám sát thị trường & xếp hạng tín nhiệm chuẩn quốc tế.</p>
        </div>
      </div>

      {/* TABLE SECTION */}
      <main className="max-w-7xl mx-auto px-4 -mt-8 pb-20 relative z-10">
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800">Bảng giá Niêm yết</h2>
            <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-100">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Market
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b">
                <tr>
                  <th className="px-6 py-4">Tài sản</th>
                  <th className="px-6 py-4 text-right">Giá</th>
                  <th className="px-6 py-4 text-right">Biến động (24h)</th>
                  <th className="px-6 py-4 text-right hidden md:table-cell">Vốn hóa</th>
                  <th className="px-6 py-4 text-center">Tín nhiệm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cryptos.map((coin, index) => (
                  <tr key={index} className="hover:bg-blue-50/30 transition duration-150 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <span className="text-slate-300 font-mono text-xs w-4">{index + 1}</span>
                        <img src={coin.image_url} alt={coin.symbol} className="w-8 h-8 rounded-full shadow-sm bg-white" />
                        <div>
                          <div className="font-bold text-slate-900">{coin.name}</div>
                          <div className="text-xs text-slate-500">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-base ${mono.className}`}>
                      {formatMoney(viewVND ? coin.price_vnd : coin.price, viewVND)}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded ${coin.change_24h >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        {coin.change_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change_24h).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 hidden md:table-cell font-medium">
                      {formatCap(coin.market_cap)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className={`w-12 py-1 rounded text-xs font-bold border text-center ${
                          coin.compliance_score >= 90 ? 'bg-green-100 text-green-700 border-green-300' : 
                          coin.compliance_score >= 80 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {coin.compliance_score}/100
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm bg-slate-50 border-t">
        <p>© 2026 VNMetrics Government Portal. Powered by Cloudflare.</p>
      </footer>
    </div>
  );
}