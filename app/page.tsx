'use client';

import { useState, useEffect } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Globe, Zap, Repeat, Lock, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2 } from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const EXCHANGE_RATE = 25450; 

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    // Gọi file JSON tĩnh (được Bot tạo ra)
    fetch(`/etf_data.json?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi tải data:', err);
        setLoading(false);
      });
  }, []);

  const formatMoney = (val: number) => {
    if (val === 0) return <span className="text-gray-400">-</span>;
    let finalVal = val;
    let pre = '';
    
    // Nếu chọn VND thì quy đổi sơ bộ (chỉ mang tính tham khảo vì đây là triệu USD)
    // Nhưng thường Flow ETF người ta hay xem USD, nên ở đây tôi giữ USD làm chuẩn cho bảng
    const color = val > 0 ? 'text-green-500' : 'text-red-500';
    return <span className={`font-bold ${color}`}>{val.toLocaleString()}</span>;
  };

  const currentData = data ? data[activeTab] : null;

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      {/* --- HEADER --- */}
      <div className="bg-[#0B0E14] text-slate-400 text-[11px] py-2 border-b border-slate-800 px-4 flex justify-between items-center">
         <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><Globe size={12} className="text-blue-500"/> US ETF Flows Tracker</span>
            <span className="flex items-center gap-1.5 text-green-400 font-bold"><Repeat size={12}/> 1 USD ≈ {EXCHANGE_RATE.toLocaleString()} VND</span>
         </div>
         <div className="flex items-center gap-2"><span>VNMetrics Bot System</span><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div></div>
      </div>

      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm px-4 h-16 flex justify-between items-center backdrop-blur-md bg-white/95">
         <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900"><Zap size={24} className="text-blue-600"/> VNMetrics<span className="text-slate-300 font-normal">.io</span></div>
         <div className="flex gap-3">
            <button className="bg-[#0B0E14] text-white px-5 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800"><Lock size={14}/> Login</button>
         </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><BarChart2 className="text-blue-600"/> Dữ liệu Dòng tiền ETF (Spot Flow)</h1>
        <p className="text-slate-500 text-sm mb-6">
          Cập nhật lần cuối: {data ? new Date(data.last_updated).toLocaleString('vi-VN') : '...'}
        </p>

        {/* --- TABS CHỌN COIN --- */}
        <div className="flex gap-2 mb-6">
          {['BTC', 'ETH', 'SOL'].map((coin) => (
            <button
              key={coin}
              onClick={() => setActiveTab(coin as any)}
              className={`px-6 py-2.5 rounded-lg font-bold transition-all border ${
                activeTab === coin
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {coin} ETF
            </button>
          ))}
        </div>

        {/* --- BẢNG DỮ LIỆU --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {loading ? (
             <div className="p-20 text-center text-slate-400">⏳ Đang tải dữ liệu từ máy chủ...</div>
          ) : !currentData || !currentData.rows || currentData.rows.length === 0 ? (
             <div className="p-20 text-center text-red-400">⚠️ Chưa có dữ liệu cho {activeTab}. Vui lòng chờ Bot cập nhật.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                  <tr>
                    {currentData.headers.map((head: string, i: number) => (
                      <th key={i} className={`px-4 py-4 whitespace-nowrap ${i === 0 ? 'text-left sticky left-0 bg-slate-50 z-10 border-r border-slate-100' : ''}`}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentData.rows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      {currentData.headers.map((key: string, colIdx: number) => {
                        const value = row[key];
                        // Cột đầu tiên là Ngày (Cố định bên trái)
                        if (colIdx === 0) {
                          return (
                            <td key={colIdx} className="px-4 py-3 text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                              {value}
                            </td>
                          );
                        }
                        // Các cột số liệu
                        return (
                          <td key={colIdx} className={`px-4 py-3 whitespace-nowrap ${jetbrainsMono.className}`}>
                            {typeof value === 'number' ? formatMoney(value) : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <p className="mt-4 text-xs text-slate-400 text-center">
          Nguồn dữ liệu: Farside Investors UK & DefiLlama. Đơn vị: Triệu USD ($m).
        </p>
      </main>
    </div>
  );
}
