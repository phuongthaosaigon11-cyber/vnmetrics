'use client';

import { useState, useEffect } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';
import { 
  LayoutDashboard, CandlestickChart, Activity, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Globe, Zap, Search, Menu 
} from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

// --- CẤU HÌNH ---
const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,avalanche-2&order=market_cap_desc&per_page=10&page=1&sparkline=true";
const DEX_API = "https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF' | 'DEX'>('ETF');
  const [etfData, setEtfData] = useState<any>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [dexData, setDexData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [etfCoin, setEtfCoin] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');

  // --- 1. FETCH DỮ LIỆU ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 1. Lấy ETF Data (File tĩnh)
        const etfRes = await fetch(`/etf_data.json?t=${new Date().getTime()}`);
        const etfJson = await etfRes.json();
        setEtfData(etfJson);

        // 2. Lấy Market Data (CoinGecko)
        const marketRes = await fetch(COINGECKO_API);
        const marketJson = await marketRes.json();
        setMarketData(Array.isArray(marketJson) ? marketJson : []);

        // 3. Lấy DEX Data (DefiLlama)
        const dexRes = await fetch(DEX_API);
        const dexJson = await dexRes.json();
        if (dexJson.protocols) {
          setDexData(dexJson.protocols.sort((a:any, b:any) => (b.total24h || 0) - (a.total24h || 0)).slice(0, 15));
        }
      } catch (err) {
        console.error("Lỗi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // --- HELPERS ---
  const formatMoney = (val: number) => {
    if (!val && val !== 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', 
      minimumFractionDigits: 0, maximumFractionDigits: 1,
      notation: Math.abs(val) > 1000000 ? "compact" : "standard"
    }).format(val);
  };

  const formatFlow = (val: any) => {
    if (val === 0 || val === "0" || val === 0.0) return <span className="text-gray-600">-</span>;
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return <span className="text-gray-600">-</span>;
    
    const isPos = num > 0;
    return (
      <span className={`${isPos ? 'text-[#00E396]' : 'text-[#FF4560]'} font-bold`}>
        {num > 0 ? '+' : ''}{num.toLocaleString()}
      </span>
    );
  };

  // Chuẩn bị dữ liệu biểu đồ ETF (Lấy 14 ngày gần nhất)
  const getChartData = () => {
    if (!etfData || !etfData[etfCoin]) return [];
    const rows = etfData[etfCoin].rows || [];
    // Lấy 14 ngày mới nhất, đảo ngược để ngày cũ bên trái
    return rows.slice(0, 14).reverse().map((row: any) => ({
      date: row.Date.split(' ').slice(0, 2).join(' '), // Lấy "20 Jan"
      flow: row.Total || 0
    }));
  };

  return (
    <div className={`min-h-screen bg-[#0B0E11] text-[#EAECEF] ${inter.className} selection:bg-[#2081E2] selection:text-white`}>
      
      {/* --- HEADER --- */}
      <header className="border-b border-[#1E2329] bg-[#0B0E11] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5" fill="currentColor"/>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">VN<span className="text-blue-500">Metrics</span></span>
          </div>
          
          <nav className="hidden md:flex bg-[#161A1E] p-1 rounded-lg border border-[#2B3139]">
            {[
              { id: 'MARKET', icon: LayoutDashboard, label: 'Thị trường' },
              { id: 'ETF', icon: CandlestickChart, label: 'ETF Flows' },
              { id: 'DEX', icon: Activity, label: 'DEX Volume' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#2B3139] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-gray-500 bg-[#161A1E] px-3 py-1.5 rounded border border-[#2B3139]">
              <div className="w-2 h-2 rounded-full bg-[#00E396] animate-pulse"></div>
              Live Data
            </div>
            <button className="p-2 text-gray-400 hover:text-white"><Search size={20}/></button>
            <button className="md:hidden p-2 text-gray-400"><Menu size={20}/></button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        
        {loading && (
          <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500 gap-4">
            <RefreshCw className="animate-spin text-blue-500" size={32} />
            <p className="text-sm font-mono">Đang đồng bộ dữ liệu Blockchain...</p>
          </div>
        )}

        {/* === TAB 1: MARKET OVERVIEW === */}
        {!loading && activeTab === 'MARKET' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔥 Xu hướng thị trường (Top 10)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {marketData.map((coin) => (
                <div key={coin.id} className="bg-[#161A1E] border border-[#262B33] p-4 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <div className="font-bold text-sm text-gray-200">{coin.symbol.toUpperCase()}</div>
                        <div className="text-xs text-gray-500">{coin.name}</div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${coin.price_change_percentage_24h >= 0 ? 'bg-[#00E396]/10 text-[#00E396]' : 'bg-[#FF4560]/10 text-[#FF4560]'}`}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono mb-1">
                    ${coin.current_price.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Vol: <span className="text-gray-300">{formatMoney(coin.total_volume)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === TAB 2: ETF FLOWS (The Star) === */}
        {!loading && activeTab === 'ETF' && etfData && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📊 Dòng tiền ETF Hoa Kỳ
                  <span className="text-xs font-normal text-gray-500 bg-[#1E2329] px-2 py-1 rounded border border-[#2B3139]">
                    Cập nhật: {new Date(etfData.last_updated).toLocaleString('vi-VN')}
                  </span>
                </h2>
              </div>
              <div className="flex bg-[#161A1E] p-1 rounded-lg border border-[#2B3139]">
                {['BTC', 'ETH', 'SOL'].map(coin => (
                  <button
                    key={coin}
                    onClick={() => setEtfCoin(coin as any)}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${
                      etfCoin === coin 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-gray-400 hover:text-white hover:bg-[#2B3139]'
                    }`}
                  >
                    {coin} ETF
                  </button>
                ))}
              </div>
            </div>

            {/* CHART SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-3 bg-[#161A1E] border border-[#262B33] rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <h3 className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-wider">
                  Dòng tiền ròng 14 ngày qua (Triệu USD)
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
                      <XAxis dataKey="date" tick={{fill: '#6B7280', fontSize: 11}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fill: '#6B7280', fontSize: 11}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{backgroundColor: '#1E2329', borderColor: '#2B3139', color: '#fff'}}
                        itemStyle={{color: '#fff'}}
                        cursor={{fill: '#2B3139', opacity: 0.4}}
                      />
                      <Bar dataKey="flow" radius={[4, 4, 0, 0]}>
                        {getChartData().map((entry:any, index:number) => (
                          <Cell key={`cell-${index}`} fill={entry.flow > 0 ? '#00E396' : '#FF4560'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TABLE SECTION */}
            <div className="bg-[#161A1E] border border-[#262B33] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#1E2329] text-gray-400 uppercase text-xs font-semibold">
                    <tr>
                      {etfData[etfCoin]?.headers?.map((head: string, i: number) => (
                        <th key={i} className={`px-4 py-4 whitespace-nowrap ${i === 0 ? 'text-left sticky left-0 bg-[#1E2329] z-10' : 'text-right'}`}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B33]">
                    {etfData[etfCoin]?.rows?.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#1E2329] transition-colors group">
                        {etfData[etfCoin].headers.map((key: string, colIdx: number) => {
                          const val = row[key];
                          // Cột Date
                          if (colIdx === 0) {
                            return (
                              <td key={colIdx} className="px-4 py-3 text-left font-medium text-white sticky left-0 bg-[#161A1E] group-hover:bg-[#1E2329] z-10 border-r border-[#262B33]">
                                {val}
                              </td>
                            );
                          }
                          // Các cột số liệu
                          return (
                            <td key={colIdx} className={`px-4 py-3 text-right ${mono.className} text-gray-300`}>
                              {formatFlow(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!etfData[etfCoin]?.rows || etfData[etfCoin].rows.length === 0) && (
                <div className="p-12 text-center text-gray-500">
                  Chưa có dữ liệu cho {etfCoin}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* === TAB 3: DEX VOLUME === */}
        {!loading && activeTab === 'DEX' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="text-purple-500"/> DEX Volume Ranking (24h)
            </h2>
            <div className="bg-[#161A1E] border border-[#262B33] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1E2329] text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 text-left">#</th>
                    <th className="px-6 py-4 text-left">Protocol</th>
                    <th className="px-6 py-4 text-left">Chains</th>
                    <th className="px-6 py-4 text-right">Volume 24h</th>
                    <th className="px-6 py-4 text-right">Change 1D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B33]">
                  {dexData.map((dex, i) => (
                    <tr key={dex.name} className="hover:bg-[#1E2329] transition-colors">
                      <td className="px-6 py-4 text-gray-500 font-mono w-10">{i + 1}</td>
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                        <img src={dex.logo} alt="" className="w-6 h-6 rounded-full bg-white/10" onError={(e) => e.currentTarget.style.display='none'} />
                        {dex.displayName || dex.name}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <div className="flex gap-1">
                          {dex.chains.slice(0, 3).map((c:string) => (
                            <span key={c} className="bg-[#2B3139] px-1.5 py-0.5 rounded text-xs">{c}</span>
                          ))}
                          {dex.chains.length > 3 && <span className="text-xs text-gray-600">+{dex.chains.length - 3}</span>}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono text-white`}>
                        ${formatMoney(dex.total24h)}
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${dex.change_1d >= 0 ? 'text-[#00E396]' : 'text-[#FF4560]'}`}>
                        {dex.change_1d ? `${dex.change_1d.toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1E2329] mt-12 py-8 text-center text-gray-600 text-xs">
        <div className="flex justify-center items-center gap-4 mb-4">
          <span>Data sources:</span>
          <span className="bg-[#1E2329] px-2 py-1 rounded text-gray-400">Farside Investors</span>
          <span className="bg-[#1E2329] px-2 py-1 rounded text-gray-400">CoinGecko</span>
          <span className="bg-[#1E2329] px-2 py-1 rounded text-gray-400">DefiLlama</span>
        </div>
        <p>&copy; 2026 VNMetrics. Built for crypto insights.</p>
      </footer>
    </div>
  );
}