'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inter, Roboto_Mono } from 'next/font/google'; // Font số chuẩn tài chính
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, 
  Settings, ChevronDown, Layers
} from 'lucide-react';

// Cấu hình Font
const inter = Inter({ subsets: ['latin'] });
const robotoMono = Roboto_Mono({ subsets: ['latin'] }); // Font số đẹp

export default function Home() {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chartType, setChartType] = useState('baseline'); // Loại biểu đồ

  // Hàm tạo dữ liệu Chart giả lập (OHLC giả để demo)
  const generateChartData = (basePrice) => {
    const data = [];
    let price = basePrice;
    const openRef = basePrice * (1 + (Math.random() * 0.05 - 0.025)); 
    
    for (let i = 0; i < 24; i++) {
      price = price * (1 + (Math.random() * 0.04 - 0.02)); 
      data.push({ 
        time: `${i}:00`, 
        price: price,
        open: openRef,
        high: price * 1.01,
        low: price * 0.99
      });
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
          const enrichedData = dbData.map(coin => ({
            ...coin,
            chartData: generateChartData(coin.price)
          }));
          setCryptos(enrichedData);
          setSelectedCoin(enrichedData[0]);
        } else {
          // Mock Data
          const mockData = [
            { symbol: 'BTC', name: 'Bitcoin', price_vnd: 2350000000, price: 89594.59, change_24h: -0.33, compliance_score: 95 },
            { symbol: 'ETH', name: 'Ethereum', price_vnd: 82500000, price: 2950.34, change_24h: -2.33, compliance_score: 92 },
            { symbol: 'SOL', name: 'Solana', price_vnd: 3600000, price: 128.46, change_24h: 1.64, compliance_score: 85 },
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

  // --- Logic Gradient Baseline ---
  const getGradientOffset = (data) => {
    if (!data || data.length === 0) return 0;
    const dataMax = Math.max(...data.map((i) => i.price));
    const dataMin = Math.min(...data.map((i) => i.price));
    const openPrice = data[0].open;

    if (dataMax <= dataMin) return 0;
    if (openPrice >= dataMax) return 0;
    if (openPrice <= dataMin) return 1;

    return (dataMax - openPrice) / (dataMax - dataMin);
  };
  const off = selectedCoin ? getGradientOffset(selectedCoin.chartData) : 0;

  // --- Render Chart Component ---
  const renderChart = () => {
    if (!selectedCoin) return null;

    const CommonAxis = () => (
      <>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="time" hide />
        <YAxis 
          domain={['auto', 'auto']} 
          orientation="right" 
          tick={{fontSize: 12, fill: '#64748B', fontFamily: 'monospace'}} 
          axisLine={false} 
          tickLine={false} 
          tickFormatter={(val) => `$${val.toLocaleString()}`}
        />
        <Tooltip 
          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
          formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
          labelStyle={{color: '#94A3B8'}}
        />
      </>
    );

    if (chartType === 'line') {
      return (
        <LineChart data={selectedCoin.chartData}>
          <CommonAxis />
          <Line type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} dot={false} animationDuration={1000}/>
        </LineChart>
      );
    }
    
    if (chartType === 'bar') {
      return (
        <BarChart data={selectedCoin.chartData}>
          <CommonAxis />
          <Bar dataKey="price" fill="#3B82F6" animationDuration={1000} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }

    if (chartType === 'mountain') {
      return (
        <AreaChart data={selectedCoin.chartData}>
          <defs>
            <linearGradient id="colorMountain" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CommonAxis />
          <Area type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorMountain)" animationDuration={1000}/>
        </AreaChart>
      );
    }

    // Default: Baseline
    return (
      <AreaChart data={selectedCoin.chartData}>
        <defs>
          <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10B981" stopOpacity={0.1}/>
            <stop offset={off} stopColor="#10B981" stopOpacity={0.01}/>
            <stop offset={off} stopColor="#EF4444" stopOpacity={0.01}/>
            <stop offset="1" stopColor="#EF4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CommonAxis />
        <ReferenceLine y={selectedCoin.chartData[0]?.open} stroke="#94A3B8" strokeDasharray="3 3" />
        <Area 
          type="monotone" 
          dataKey="price" 
          stroke={selectedCoin.chartData[selectedCoin.chartData.length-1].price >= selectedCoin.chartData[0].open ? "#10B981" : "#EF4444"} 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorBaseline)" 
          animationDuration={1000}
        />
      </AreaChart>
    );
  };

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 ${inter.className} pb-10`}>
      
      {/* BANNER CONSENT */}
      {showConsent && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-[0_-5px_30px_rgba(0,0,0,0.15)] z-[100] p-6 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900 block mb-1 text-base">Privacy & Data Policy</span>
              This site uses cookies to personalize your experience and analyze market trends. By continuing, you agree to our Terms of Service.
            </div>
            <div className="flex gap-3 whitespace-nowrap">
              <button onClick={handleAccept} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded transition">I Agree</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-800 text-white p-1.5 rounded-lg"><Zap size={20} fill="currentColor" /></div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">VNMetrics<span className="text-blue-600">.io</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
            <a href="#" className="text-blue-800">Market</a>
            <a href="#" className="hover:text-slate-900">Analytics</a>
            <a href="#" className="hover:text-slate-900">Data</a>
          </div>
          <button className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Connect</button>
        </div>
      </nav>

      {/* --- LIVE MARKETS (COLORED CARDS) --- */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600"></span>
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Markets</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {cryptos.slice(0, 5).map((coin) => {
              const isUp = coin.change_24h >= 0;
              const isSelected = selectedCoin?.symbol === coin.symbol;
              
              // Màu nền: Dịu mắt hơn, không quá chói
              const bgClass = isUp ? 'bg-[#ECFDF5] border-[#D1FAE5]' : 'bg-[#FFF1F2] border-[#FFE4E6]';
              const textClass = isUp ? 'text-[#059669]' : 'text-[#E11D48]';

              return (
                <div 
                  key={coin.symbol} 
                  onClick={() => setSelectedCoin(coin)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-28 ${
                    isSelected ? 'ring-2 ring-blue-600 shadow-md' : ''
                  } ${bgClass}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm text-slate-800">{coin.symbol}</span>
                    {isUp ? <ArrowUpRight size={20} className={textClass}/> : <ArrowDownRight size={20} className={textClass}/>}
                  </div>
                  <div>
                    <div className={`text-lg font-bold tracking-tight ${robotoMono.className} text-slate-900`}>
                      ${coin.price?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${textClass}`}>
                      {isUp ? '+' : ''}{coin.change_24h}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* --- CHART SECTION --- */}
      {selectedCoin && (
        <div className="max-w-7xl mx-auto px-4 mt-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Chart Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                 <img src={selectedCoin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-12 h-12 rounded-full border border-slate-100 p-0.5" />
                 <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCoin.name}</h2>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`text-lg font-bold ${robotoMono.className}`}>${selectedCoin.price?.toLocaleString()}</span>
                      <span className={`text-sm font-bold ${selectedCoin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({selectedCoin.change_24h}%)
                      </span>
                   </div>
                 </div>
              </div>
              
              {/* DROPDOWN CHỌN CHART */}
              <div className="relative group">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-slate-100 transition">
                  <Layers size={16} className="text-slate-500"/>
                  <select 
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="mountain">Mountain Chart</option>
                    <option value="baseline">Baseline Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none"/>
                </div>
              </div>
            </div>

            {/* Chart Drawing Area */}
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- DATA TABLE --- */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-lg">Market Overview</h3>
            <button className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 hover:bg-blue-100">View All</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4 text-right">Price (VND)</th>
                <th className="px-6 py-4 text-right">Price (USD)</th>
                <th className="px-6 py-4 text-right">Change</th>
                <th className="px-6 py-4 text-center">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cryptos.map((coin, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setSelectedCoin(coin)}>
                  <td className="px-6 py-5 font-medium">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-300 text-xs font-bold w-4">{idx + 1}</span>
                      <img src={coin.image_url || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`} className="w-10 h-10 rounded-full border border-slate-100 bg-white" />
                      <div>
                        <div className="font-bold text-slate-900 text-base">{coin.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-right font-bold text-slate-800 text-base ${robotoMono.className}`}>
                    {formatVND(coin.price_vnd)}
                  </td>
                  <td className={`px-6 py-5 text-right text-slate-500 font-medium ${robotoMono.className}`}>
                    ${coin.price?.toLocaleString()}
                  </td>
                  <td className={`px-6 py-5 text-right font-bold ${coin.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {coin.change_24h >= 0 ? '+' : ''}{coin.change_24h}%
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wide ${
                      coin.compliance_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-amber-50 text-amber-700 border-amber-200'
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

      {/* FOOTER - DISCLAIMER THEO YÊU CẦU */}
      <footer className="bg-[#0F172A] text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
             <ShieldCheck className="text-amber-500" size={24} />
             <h3 className="font-bold text-white uppercase tracking-wider text-sm">IMPORTANT DISCLAIMER</h3>
          </div>
          
          <div className="text-[11px] leading-relaxed text-justify opacity-80 font-medium space-y-4">
            <p>
              All content provided herein our website, hyperlinked sites, associated applications, forums, blogs, social media accounts and other platforms (“Site”) is for your general information only, procured from third party sources. We make no warranties of any kind in relation to our content, including but not limited to accuracy and updatedness.
            </p>
            <p>
              No part of the content that we provide constitutes financial advice, legal advice or any other form of advice meant for your specific reliance for any purpose. Any use or reliance on our content is solely at your own risk and discretion. You should conduct your own research, review, analyse and verify our content before relying on them.
            </p>
            <p className="border-l-4 border-amber-500 pl-4 py-1 text-white bg-white/5">
              Trading is a highly risky activity that can lead to major losses, please therefore consult your financial advisor before making any decision. No content on our Site is meant to be a solicitation or offer.
            </p>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-[10px] text-slate-500 font-bold">
            <p>&copy; 2026 VNMetrics Enterprise Data Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}