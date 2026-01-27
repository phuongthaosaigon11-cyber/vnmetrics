'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { 
  Zap, Activity, Layers, BrainCircuit, Table, Radio, Wallet, ExternalLink, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { ComposedChart, Line, Area, ResponsiveContainer, YAxis } from 'recharts';
import SmartMoneyDashboard from '../components/SmartMoneyDashboard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const COINGECKO_API = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,tron,polkadot,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=true";

// --- FORMATTERS ---
const fmtUSD = (num: number) => {
    if (!num || isNaN(num)) return '-';
    const absNum = Math.abs(num);
    if (absNum >= 1.0e+9) return "$" + (num / 1.0e+9).toFixed(1) + " tỷ";
    if (absNum >= 1.0e+6) return "$" + (num / 1.0e+6).toFixed(1) + " tr";
    return "$" + num.toLocaleString();
};

const fmtAmt = (num: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(num);

const fmtFlow = (val: any) => {
    if (val === undefined || val === null || val === '') return <span className="text-slate-600">-</span>;
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return <span className="text-slate-600">-</span>;
    if (num === 0) return <span className="text-slate-600 opacity-50">0.0</span>;
    const isPos = num > 0;
    return <span className={`font-mono font-bold ${isPos?'text-emerald-400':'text-rose-400'}`}>{isPos?'+':''}{num.toLocaleString()}</span>;
};

// Component render HTML an toàn (cho cột Txs)
const SafeHtml = ({ html }: { html: string }) => {
    if (!html) return <span>-</span>;
    return <span className="flex items-center gap-1 opacity-70 hover:opacity-100" dangerouslySetInnerHTML={{ __html: html.replace(/<a /g, '<a target="_blank" style="color:#60A5FA;text-decoration:none;margin-left:4px" ') }} />;
};

// --- WIDGET 1: ON-CHAIN FLOWS (DUNE) ---
const OnChainFeed = () => {
  const [txs, setTxs] = useState<any[]>([]);
  useEffect(() => { fetch('/onchain_flows.json').then(r=>r.json()).then(setTxs).catch(()=>{}); }, []);
  if (!txs.length) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-lg mb-6">
        <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2"><Radio size={16} className="text-emerald-500 animate-pulse"/> Giao dịch Cá mập (On-chain)</h3>
            <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">Nguồn: Dune</span>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/50">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-400 bg-[#11141A] sticky top-0 uppercase font-semibold text-[10px] z-20">
                    <tr>
                        <th className="p-3 border-b border-slate-800">Thời gian</th>
                        <th className="p-3 border-b border-slate-800">Quỹ/Ví</th>
                        <th className="p-3 border-b border-slate-800">Mã</th>
                        <th className="p-3 border-b border-slate-800 text-right">Số lượng BTC</th>
                        <th className="p-3 border-b border-slate-800 text-right">Giá trị ($)</th>
                        <th className="p-3 border-b border-slate-800 text-center">Loại</th>
                        <th className="p-3 border-b border-slate-800 text-right">Tx</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                    {txs.slice(0,50).map((tx, i) => {
                        const isDeposit = tx.flow_type === 'Deposit';
                        return (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 text-slate-300 font-mono">{new Date(tx.block_time).toLocaleString('vi-VN')}</td>
                                <td className="p-3 font-bold text-white">{tx.issuer}</td>
                                <td className="p-3 text-slate-400 font-bold">{tx.etf_ticker}</td>
                                <td className={`p-3 text-right font-mono font-bold ${isDeposit?'text-emerald-400':'text-rose-400'}`}>{fmtAmt(tx.amount)}</td>
                                <td className="p-3 text-right font-mono text-slate-300">{fmtUSD(tx.amount_usd || tx.usd_value)}</td>
                                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isDeposit?'bg-emerald-950/30 border-emerald-800 text-emerald-400':'bg-rose-950/30 border-rose-800 text-rose-400'}`}>{isDeposit?'Nạp':'Rút'}</span></td>
                                <td className="p-3 text-right"><SafeHtml html={tx.txs} /></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

// --- WIDGET 2: ETF HOLDINGS (DUNE) ---
const EtfHoldingsWidget = () => {
  const [holdings, setHoldings] = useState<any[]>([]);
  useEffect(() => { 
      fetch('/etf_holdings.json').then(r=>r.json()).then(data => {
          const processed = data.map((d:any) => ({ ...d, usd: d.usd_value || 0 })).sort((a:any, b:any) => b.usd - a.usd);
          setHoldings(processed);
      }).catch(()=>{}); 
  }, []);
  if (!holdings.length) return null;

  return (
    <div className="bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-lg mb-6">
        <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2"><Wallet size={16} className="text-amber-500"/> Tổng Tài Sản (On-chain Holdings)</h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-[#0B0E14]/50">
            <table className="w-full text-xs text-left border-collapse">
                <thead className="text-slate-400 bg-[#11141A] sticky top-0 uppercase font-semibold text-[10px] z-20">
                    <tr>
                        <th className="p-3 border-b border-slate-800">Quỹ Phát Hành</th>
                        <th className="p-3 border-b border-slate-800 text-right">Holdings (BTC)</th>
                        <th className="p-3 border-b border-slate-800 text-right">Giá trị ($)</th>
                        <th className="p-3 border-b border-slate-800 text-right">Thị phần</th>
                        <th className="p-3 border-b border-slate-800 text-center">Mã</th>
                        <th className="p-3 border-b border-slate-800 text-right">Phí (%)</th>
                        <th className="p-3 border-b border-slate-800 text-center">Ví</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-[11px]">
                    {holdings.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-bold text-white">{row.plain_issuer || row.issuer}</td>
                            <td className="p-3 text-right font-mono text-slate-200">{fmtAmt(row.tvl || row.amount)}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">{fmtUSD(row.usd_value)}</td>
                            <td className="p-3 text-right text-slate-300">{row.percentage_of_total ? (row.percentage_of_total*100).toFixed(1)+'%' : '-'}</td>
                            <td className="p-3 text-center font-bold text-slate-400">{row.etf_ticker}</td>
                            {/* Fix lỗi Fee NaN: Kiểm tra kỹ trước khi render */}
                            <td className="p-3 text-right text-slate-400">{row.percentage_fee != null ? (parseFloat(String(row.percentage_fee))*100).toFixed(2)+'%' : '-'}</td>
                            <td className="p-3 text-center"><SafeHtml html={row.address_source} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default function VNMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'ETF'>('MARKET');
  const [cryptos, setCryptos] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [etfData, setEtfData] = useState<any>(null);
  const [etfTicker, setEtfTicker] = useState<'BTC' | 'ETH'>('BTC');
  const [etfFullPrice, setEtfFullPrice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [mRes, eRes, pRes] = await Promise.all([
            fetch(COINGECKO_API).then(r => r.json()),
            fetch(`/etf_data.json?t=${Date.now()}`).then(r => r.json()),
            fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365").then(r => r.json())
        ]);
        setCryptos(mRes);
        setEtfData(eRes);
        if(pRes?.prices) setEtfFullPrice(pRes.prices.map((p:any)=>({timestamp: p[0], price: p[1]})));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, []);

  // LOGIC BẢNG GỐC (RESTORED)
  const etfTable = useMemo(() => {
    if (!etfData?.[etfTicker]) return null;
    const rawHeaders = etfData[etfTicker].headers || [];
    const sortedHeaders = ["Date", "Total", ...rawHeaders.filter((h: string) => h !== "Date" && h !== "Total")];
    const rows = [...etfData[etfTicker].rows].reverse();
    return { headers: sortedHeaders, rows };
  }, [etfData, etfTicker]);

  return (
    <div className={`min-h-screen bg-[#0B0E14] text-slate-200 ${inter.className}`}>
      <header className="sticky top-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><Zap className="text-white" size={18}/></div>
                <h1 className="text-xl font-bold">VN<span className="text-blue-500">Metrics</span></h1>
            </div>
            <nav className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 text-xs font-bold">
                {[{id:'MARKET',l:'Thị trường'},{id:'ETF',l:'Smart Money & ETF'}].map(t => (
                    <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`px-5 py-2 rounded-md transition-all ${activeTab===t.id?'bg-[#252A33] text-white shadow-sm ring-1 ring-slate-600':'text-slate-400 hover:text-white hover:bg-[#1E2329]'}`}>{t.l}</button>
                ))}
            </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 pb-20">
        
        {/* TAB 1: THỊ TRƯỜNG (ĐÃ KHÔI PHỤC BIỂU ĐỒ) */}
        {activeTab === 'MARKET' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading && <div className="col-span-4 text-center py-20 text-slate-500">Đang tải dữ liệu thị trường...</div>}
                {cryptos.map(c => {
                    const isUp = (c.price_change_percentage_24h || 0) >= 0;
                    // Chuẩn bị dữ liệu mini chart từ sparkline
                    const sparklineData = c.sparkline_in_7d?.price?.map((p:number, i:number) => ({i, p})) || [];
                    
                    return (
                    <div key={c.id} className="bg-[#151921] border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-blue-500/50 transition-all group h-[140px]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <img src={c.image} className="w-10 h-10 rounded-full group-hover:scale-110 transition-transform"/>
                                <div>
                                    <div className="font-bold text-white text-sm">{c.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{c.symbol.toUpperCase()}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono font-bold text-slate-200">${c.current_price.toLocaleString()}</div>
                                <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isUp?'text-emerald-400':'text-rose-400'}`}>
                                    {isUp?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}
                                    {Math.abs(c.price_change_percentage_24h||0).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                        {/* Mini Chart Area */}
                        <div className="h-[40px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={sparklineData}>
                                    <Line type="monotone" dataKey="p" stroke={isUp ? '#10B981' : '#F43F5E'} strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )})}
             </div>
        )}

        {/* TAB 2: ETF (FULL COMBO) */}
        {activeTab === 'ETF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2">
                
                {/* CỘT TRÁI: CHART LỚN + DUNE TABLES */}
                <div className="lg:col-span-7 space-y-6">
                    <SmartMoneyDashboard priceData={etfFullPrice} etfData={etfData} />
                    
                    {/* Bảng Dune 1: Recent Flows */}
                    <OnChainFeed />
                    
                    {/* Bảng Dune 2: Holdings */}
                    <EtfHoldingsWidget />
                </div>

                {/* CỘT PHẢI: BẢNG DỮ LIỆU GỐC (RESTORED) */}
                <div className="lg:col-span-5 bg-[#151921] border border-slate-800 rounded-xl flex flex-col h-[800px] overflow-hidden shadow-lg sticky top-20">
                    <div className="p-4 border-b border-slate-800 bg-[#0B0E14] flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2 font-bold text-white text-sm"><Table size={16}/> Lịch sử Dòng tiền ($M)</div>
                        <div className="flex bg-black p-1 rounded border border-slate-800">
                            {['BTC','ETH'].map(t => (<button key={t} onClick={()=>setEtfTicker(t as any)} className={`px-4 py-1 text-[10px] font-bold rounded transition-all ${etfTicker===t?'bg-blue-600 text-white':'text-slate-500 hover:text-white'}`}>{t}</button>))}
                        </div>
                    </div>
                    
                    {/* Scrollable Table */}
                    <div className="overflow-auto flex-1 custom-scrollbar bg-[#0B0E14]/30">
                        <table className="w-full text-[10px] text-left border-collapse">
                            <thead className="bg-[#0B0E14] sticky top-0 z-20 text-slate-400 uppercase font-bold shadow-md">
                                <tr>
                                    {etfTable?.headers.map((h, i) => (
                                        <th key={i} className={`p-3 border-b border-slate-800 whitespace-nowrap ${i===0?'sticky left-0 bg-[#0B0E14] z-30 border-r border-slate-800':''} ${h==='Total'?'text-white bg-[#1E2329]':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {etfTable?.rows.map((r:any, i:number) => (
                                    <tr key={i} className="hover:bg-[#1E2329] transition-colors group">
                                        {etfTable.headers.map((h, j) => (
                                            <td key={j} className={`p-3 whitespace-nowrap border-b border-slate-800/50 ${j===0?'sticky left-0 bg-[#151921] group-hover:bg-[#1E2329] border-r border-slate-800 font-bold text-slate-300':''} ${h==='Total'?'bg-[#1E2329]/50 font-black border-r border-slate-800/50':''}`}>
                                                {h==="Date" ? r[h] : fmtFlow(r[h])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!etfTable && <div className="p-10 text-center text-slate-500">Đang tải dữ liệu...</div>}
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
