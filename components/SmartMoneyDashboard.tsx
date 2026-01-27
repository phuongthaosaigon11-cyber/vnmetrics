'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit } from 'lucide-react';
import { alignMarketData, analyzeSmartMoney } from '../utils/smartMoneyLogic';

// Formatters
const fmtUSD = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
const fmtCompact = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
const fmtPct = (num: number) => (num * 100).toFixed(4) + '%';

// Tooltip Pro
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#0B0E14]/95 border border-slate-700 p-3 rounded-lg shadow-2xl backdrop-blur-md min-w-[220px]">
                <div className="text-slate-400 text-[10px] font-bold mb-2 uppercase border-b border-slate-800 pb-1">{data.fullDate}</div>
                
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-amber-400">Giá BTC</span>
                        <span className="text-[11px] font-mono text-slate-200">{fmtUSD(data.price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-blue-400">ETF Net Flow</span>
                        <span className={`text-[11px] font-mono font-bold ${data.etfFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {data.isMarketClosed ? 'No Data' : (data.etfFlow > 0 ? '+' : '') + fmtCompact(data.etfFlow * 1000000)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-purple-400">Open Interest</span>
                        <span className="text-[11px] font-mono text-slate-200">${fmtCompact(data.oi)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-teal-400">Funding Rate</span>
                        <span className={`text-[11px] font-mono ${data.funding > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {fmtPct(data.funding)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function SmartMoneyDashboard({ rawData, etfData }: { rawData: any, etfData: any }) {
  const [filter, setFilter] = useState<'1M'|'3M'|'ALL'>('3M');

  const chartData = useMemo(() => {
    if (!rawData?.prices || !etfData?.BTC?.rows) return [];
    
    // Merge Real Data
    const aligned = alignMarketData(rawData.prices, etfData.BTC.rows, rawData.oi, rawData.funding);
    
    if (filter === '1M') return aligned.slice(-30);
    if (filter === '3M') return aligned.slice(-90);
    return aligned;
  }, [rawData, etfData, filter]);

  const signal = useMemo(() => analyzeSmartMoney(chartData[chartData.length - 1]), [chartData]);

  if (!chartData.length) return <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 animate-pulse space-y-2"><div className="text-xs font-bold">ĐANG TẢI DỮ LIỆU THẬT TỪ BINANCE...</div></div>;

  return (
    <div className="space-y-4">
      {/* Header & Signal */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        {signal && (
          <div className={`flex-1 w-full p-3 rounded-xl border ${signal.bg} flex items-center gap-3 shadow-lg`}>
            <div className={`p-2 rounded-full ${signal.iconColor}/20`}>
                <BrainCircuit size={18} className={signal.color}/>
            </div>
            <div>
              <div className={`font-bold text-xs ${signal.color} uppercase tracking-wider`}>{signal.label}</div>
              <div className="text-[10px] text-slate-300 opacity-80">{signal.desc}</div>
            </div>
          </div>
        )}
        
        <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-800 h-fit shrink-0 shadow-sm">
          {[{id: '1M', l: '1 Tháng'}, {id: '3M', l: '3 Tháng'}, {id: 'ALL', l: 'Tất cả'}].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} className={`px-4 py-1.5 text-[10px] font-bold rounded transition-all ${filter===f.id?'bg-blue-600 text-white shadow-md':'text-slate-500 hover:text-slate-300'}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="bg-[#151921] border border-slate-800 rounded-xl p-1 shadow-2xl relative overflow-hidden group">
        
        {/* CHART 1: PRICE & FLOW */}
        <div className="h-[280px] w-full relative pt-4 px-2">
            <div className="absolute top-2 left-4 z-10 flex gap-4 pointer-events-none">
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[10px] text-slate-400 font-bold">Giá BTC</span></div>
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div><span className="text-[10px] text-slate-400 font-bold">Net Flow</span></div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="vnmetrics" margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 10, fill:'#FBBF24'}} tickFormatter={(v)=>`$${fmtCompact(v)}`} width={40} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="left" orientation="left" domain={['dataMin', 'dataMax']} hide />
                    <Tooltip content={<CustomTooltip />} cursor={{stroke: '#fff', strokeWidth: 1, strokeOpacity: 0.2, strokeDasharray: '4 4'}} />
                    
                    <Bar yAxisId="left" dataKey="etfFlow" barSize={filter==='ALL'?2:8} radius={[2,2,0,0]}>
                        {chartData.map((d, i) => (
                            <Cell key={i} fill={d.isMarketClosed ? '#334155' : (d.etfFlow >= 0 ? '#10B981' : '#F43F5E')} opacity={d.isMarketClosed ? 0.2 : 0.9} />
                        ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="price" stroke="#FBBF24" strokeWidth={2} dot={false} activeDot={{r: 4, fill: '#FBBF24'}} animationDuration={1000} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* CHART 2: OI & FUNDING (Real Data) */}
        <div className="h-[120px] w-full grid grid-cols-1 border-t border-slate-800/50 bg-[#0B0E14]/30">
             <div className="relative w-full h-full pt-2 px-2">
                <div className="absolute top-2 left-4 z-10 flex gap-4 pointer-events-none">
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div><span className="text-[9px] text-slate-500 font-bold uppercase">Open Interest (Binance)</span></div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-teal-500"></div><span className="text-[9px] text-slate-500 font-bold uppercase">Funding Rate</span></div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="vnmetrics" margin={{top: 5, right: 0, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} opacity={0.5}/>
                        <XAxis dataKey="date" tick={{fontSize: 9, fill:'#64748B'}} minTickGap={30} axisLine={false} tickLine={false} dy={5} />
                        
                        <YAxis yAxisId="oi" orientation="right" domain={['auto', 'auto']} hide />
                        <YAxis yAxisId="funding" orientation="right" domain={['auto', 'auto']} hide />
                        
                        <Tooltip content={<CustomTooltip />} cursor={{stroke: '#fff', strokeWidth: 1, strokeOpacity: 0.2, strokeDasharray: '4 4'}} />

                        <Area yAxisId="oi" type="monotone" dataKey="oi" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} strokeWidth={1.5} dot={false}/>
                        <Bar yAxisId="funding" dataKey="funding" barSize={filter==='ALL'?2:8}>
                             {chartData.map((d, i) => (
                                <Cell key={i} fill={d.funding > 0 ? '#2DD4BF' : '#F43F5E'} opacity={0.7} />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
}
