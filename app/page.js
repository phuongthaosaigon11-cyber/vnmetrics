'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'; // Thư viện biểu đồ
import { TrendingUp, TrendingDown, Activity, BarChart3, Zap, Globe, Gauge } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [marketStats, setMarketStats] = useState({ 
    fearGreed: { value: 0, status: 'Loading...' },
    btcDominance: 54.2,
    totalVol: '84.5B'
  });
  const [loading, setLoading] = useState(true);

  // Dữ liệu mẫu ban đầu (để web đẹp ngay lập tức)
  const mockData = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', price: 92450.50, change_24h: 2.34, market_cap: 1850000000000, sparkline: [91000, 91500, 91200, 92100, 92800, 92300, 92450] },
    { id: 2, symbol: 'ETH', name: 'Ethereum', price: 3450.20, change_24h: -1.12, market_cap: 380000000000, sparkline: [3500, 3480, 3510, 3460, 3440, 3420, 3450] },
    { id: 3, symbol: 'SOL', name: 'Solana', price: 145.80, change_24h: 5.67, market_cap: 65000000000, sparkline: [130, 135, 138, 140, 142, 144, 145.8] },
    { id: 4, symbol: 'BNB', name: 'BNB', price: 612.40, change_24h: 0.5, market_cap: 89000000000, sparkline: [600, 605, 602, 608, 610, 611, 612] },
    { id: 5, symbol: 'XRP', name: 'XRP', price: 1.12, change_24h: -2.4, market_cap: 55000000000, sparkline: [1.2, 1.18, 1.15, 1.14, 1.13, 1.10, 1.12] },
  ];

  useEffect(() => {
    async function initData() {
      try {
        // 1. Lấy dữ liệu bảng giá từ Supabase
        const { data: dbData } = await supabase.from('crypto_prices').select('*').order('market_cap', { ascending: false });
        
        // 2. Lấy chỉ số Fear & Greed thật
        const fngRes = await fetch('https://api.alternative.me/fng/');
        const fngData = await fngRes.json();
        
        setMarketStats(prev => ({
          ...prev,
          fearGreed: { 
            value: fngData.data[0].value, 
            status: fngData.data[0].value_classification 
          }
        }));

        // Nếu DB chưa có dữ liệu biểu đồ, dùng MockData + ghép dữ liệu thật
        if (dbData && dbData.length > 0) {
          // Merge dữ liệu thật với sparkline giả lập (vì DB chưa lưu chart)
          const merged = dbData.map((coin, index) => ({
            ...coin,
            sparkline: mockData[index % mockData.length].sparkline // Mượn biểu đồ mẫu
          }));
          setCryptos(merged);
        } else {
          setCryptos(mockData);
        }
      } catch (e) {
        console.error("Lỗi data:", e);
        setCryptos(mockData);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Component vẽ biểu đồ nhỏ
  const MiniChart = ({ data, color }) => (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((v, i) => ({ val: v, i }))}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={`min-h-screen bg-[#0b0e11] text-gray-100 ${inter.className} text-sm`}>
      
      {/* HEADER COINGLASS STYLE */}
      <header className="border-b border-gray-800 bg-[#161a1e]">
        {/* Top Bar Indicators */}
        <div className="flex overflow-x-auto gap-6 px-4 py-2 text-xs border-b border-gray-800 text-gray-400 no-scrollbar">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-green-400 font-bold">Coins:</span> 12,450
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-blue-400 font-bold">Exchanges:</span> 452
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-yellow-400 font-bold">BTC Dom:</span> {marketStats.btcDominance}%
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
             <span className="text-purple-400 font-bold">24h Vol:</span> ${marketStats.totalVol}
          </div>
        </div>

        {/* Main Nav */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1 rounded font-bold text-lg">CG</div>
              <span className="font-bold text-xl tracking-tight">VNCryptoGlass</span>
            </div>
            <nav className="hidden md:flex gap-6 font-medium text-gray-300">
              <a href="#" className="hover:text-blue-500">Exchange</a>
              <a href="#" className="hover:text-blue-500 text-blue-500">Market Cap</a>
              <a href="#" className="hover:text-blue-500">Liquidation</a>
              <a href="#" className="hover:text-blue-500">Long/Short</a>
            </nav>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-white font-semibold transition">
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        
        {/* 1. MARKET OVERVIEW WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          
          {/* Fear & Greed Index */}
          <div className="bg-[#1e2329] p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-3 text-gray-400">
              <Gauge size={16} /> <span className="font-bold uppercase text-xs">Fear & Greed Index</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">{marketStats.fearGreed.value}</div>
              <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                marketStats.fearGreed.value > 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {marketStats.fearGreed.status}
              </div>
            </div>
            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full ${marketStats.fearGreed.value > 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                style={{ width: `${marketStats.fearGreed.value}%` }}
              ></div>
            </div>
          </div>

          {/* Long/Short Ratio (Mock) */}
          <div className="bg-[#1e2329] p-4 rounded-lg border border-gray-800 md:col-span-2">
            <div className="flex items-center justify-between mb-3 text-gray-400">
              <div className="flex items-center gap-2">
                <Activity size={16} /> <span className="font-bold uppercase text-xs">BTC Long/Short Ratio (1H)</span>
              </div>
              <span className="text-xs text-green-400">Bullish</span>
            </div>
            <div className="flex items-end justify-between mb-1">
              <span className="text-green-500 font-bold">52.4% Long</span>
              <span className="text-red-500 font-bold">47.6% Short</span>
            </div>
            <div className="flex w-full h-2 rounded-full overflow-hidden">
              <div className="w-[52.4%] bg-green-500"></div>
              <div className="w-[47.6%] bg-red-500"></div>
            </div>
          </div>

           {/* Open Interest (Mock) */}
           <div className="bg-[#1e2329] p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-3 text-gray-400">
              <BarChart3 size={16} /> <span className="font-bold uppercase text-xs">Open Interest (24h)</span>
            </div>
            <div className="text-2xl font-bold text-white">$45.28 B</div>
            <div className="text-xs text-green-400 mt-1 flex items-center">
              <TrendingUp size={12} className="mr-1"/> +5.12%
            </div>
          </div>
        </div>

        {/* 2. MAIN DATA TABLE */}
        <div className="bg-[#1e2329] rounded-lg border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="font-bold text-lg text-white flex items-center gap-2">
              <Globe size={18} className="text-blue-500"/> Cryptocurrency Prices
            </h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">USD</button>
              <button className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400">VND</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#161a1e] text-xs uppercase text-gray-500 font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">24h Change</th>
                  <th className="px-6 py-4 text-right">Market Cap</th>
                  <th className="px-6 py-4 text-center">Chart (7d)</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cryptos.map((coin, idx) => (
                  <tr key={idx} className="hover:bg-[#252a30] transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 w-4 text-center">{idx + 1}</span>
                        <img src={coin.image_url || `https://assets.coingecko.com/coins/images/${idx===0?1:idx===1?279:4128}/large/${idx===0?'bitcoin':'ethereum'}.png`} className="w-8 h-8 rounded-full" alt={coin.symbol} />
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            {coin.name} <span className="text-xs bg-gray-700 px-1 rounded text-gray-300">{coin.symbol}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className={`px-6 py-4 text-right font-medium text-white ${mono.className}`}>
                      ${coin.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    
                    <td className={`px-6 py-4 text-right font-medium ${coin.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {coin.change_24h >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                        {Math.abs(coin.change_24h).toFixed(2)}%
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right text-gray-400">
                      ${(coin.market_cap / 1e9).toFixed(2)}B
                    </td>
                    
                    <td className="px-6 py-2 w-32">
                      <div className="flex justify-center">
                        <MiniChart 
                          data={coin.sparkline || [10, 15, 12, 18, 20]} 
                          color={coin.change_24h >= 0 ? '#4ade80' : '#f87171'} 
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                       <button className="text-blue-400 hover:text-white text-xs font-bold border border-blue-900 hover:bg-blue-600 px-3 py-1 rounded transition">
                         Trade
                       </button>
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