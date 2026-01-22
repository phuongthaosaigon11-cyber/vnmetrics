'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewVND, setViewVND] = useState(true); // Chế độ xem VND/USD

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('crypto_prices').select('*').order('market_cap', { ascending: false });
      if (data) setCryptos(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Hàm định dạng tiền tệ
  const formatMoney = (amount) => {
    if (viewVND) return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatCap = (num) => {
    if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + " Tỷ $";
    if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + " Triệu $";
    return num;
  }

  return (
    <div className={`min-h-screen bg-gray-50 text-slate-900 ${inter.className}`}>
      
      {/* HEADER */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white font-bold p-1.5 rounded">VN</div>
          <span className="font-bold text-xl text-blue-900">VNMetrics</span>
        </div>
        <button 
          onClick={() => setViewVND(!viewVND)}
          className="text-sm font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition"
        >
          Đổi tiền tệ: {viewVND ? '🇻🇳 VND' : '🇺🇸 USD'}
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Thị trường Tài sản số</h1>
          <p className="text-gray-500 mt-2">
            Top 20 tài sản theo vốn hóa. Dữ liệu được chuẩn hóa cho nhà đầu tư Việt Nam.
          </p>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Tài sản</th>
                  <th className="px-6 py-4 text-right">Giá hiện tại</th>
                  <th className="px-6 py-4 text-right">24h %</th>
                  <th className="px-6 py-4 text-right hidden md:table-cell">Vốn hóa</th>
                  <th className="px-6 py-4 text-center">Điểm Tuân thủ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Đang tải dữ liệu thị trường...</td></tr>
                ) : cryptos.map((coin) => (
                  <tr key={coin.id} className="hover:bg-gray-50 transition">
                    
                    {/* Cột 1: Tên & Logo */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={coin.image_url} alt={coin.symbol} className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="font-bold text-gray-900">{coin.name}</div>
                          <div className="text-xs text-gray-400">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Giá (VND/USD) */}
                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                      {formatMoney(viewVND ? coin.price_vnd : coin.price)}
                    </td>

                    {/* Cột 3: % Tăng giảm (Màu xanh/đỏ) */}
                    <td className={`px-6 py-4 text-right font-medium ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {coin.change_24h > 0 ? '▲' : '▼'} {Math.abs(coin.change_24h).toFixed(2)}%
                    </td>

                    {/* Cột 4: Vốn hóa */}
                    <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell">
                      {formatCap(coin.market_cap)}
                    </td>

                    {/* Cột 5: Điểm Compliance */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          coin.compliance_score >= 80 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {coin.compliance_score}/100
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}