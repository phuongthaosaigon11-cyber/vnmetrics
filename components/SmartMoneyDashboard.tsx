'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit } from 'lucide-react';
import { alignMarketData, analyzeSmartMoney } from '../utils/smartMoneyLogic';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

export default function SmartMoneyDashboard({ priceData, etfData }: { priceData: any[], etfData: any }) {
  const [filter, setFilter] = useState<'1W'|'1M'|'3M'|'ALL'>('1M');

  const chartData = useMemo(() => {
    if (!priceData.length || !etfData?.BTC?.rows) return [];
    // Align dữ liệu Price và ETF
    const aligned = alignMarketData(priceData, etfData.BTC.rows);
    
    // Cắt dữ liệu theo bộ lọc
    if (filter === '1W') return aligned.slice(-7);
    if (filter === '1M') return aligned.slice(-30);
    if (filter === '3M') return aligned.slice(-90);
    return aligned; // ALL
  }, [priceData, etfData, filter]);

  const signal = useMemo(() => analyzeSmartMoney(chartData[chartData.length - 1]), [chartData]);

  if (!chartData.length) return <div className="p-10 text-center text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        {/* AI Signal Box */}
        {signal && (
          <div className={`flex-1 w-full p-3 rounded-xl border ${signal.bg} flex items-center gap-3`}>
            <div className={`p-2 rounded-full ${signal.iconColor}/20`}>
                <BrainCircuit size={18} className={signal.color}/>
            </div>
            <div>
              <div className={`font-bold text-xs ${signal.color}`}>{signal.label}</div>
              <div className="text-[10px] text-slate-300">{signal.desc}</div>
            </div>
          </div>
        )}
        
        {/* Filter Buttons */}
        <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-700 h-fit shrink-0">
          {['1W', '1M', '3M', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-1.5 text-[10px] font-bold rounded transition-all ${filter===f?'bg-slate-700 text-white shadow':'text-slate-500 hover:text-slate-300'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-[#151921] border border-slate-700 rounded-xl p-4 shadow-2xl relative">
        <div className="h-[320px] w-full relative">
          <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400 z-10 bg-black/50 px-2 rounded">PRICE vs NET FLOW</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} syncId="mktSync">
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10, fill:'#94A3B8'}} minTickGap={30} />
              
              {/* Trục Giá (Phải) */}
              <YAxis yAxisId="p" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 10, fill:'#FBBF24'}} tickFormatter={(v)=>`$${fmt(v)}`} width={50}/>
              
              {/* Trục Flow (Trái - Ẩn scale) */}
              <YAxis yAxisId="f" orientation="left" domain={['dataMin', 'dataMax']} hide />
              
              <Tooltip 
                contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}}
                labelFormatter={(l, p) => p[0]?.payload?.fullDate || l}
                formatter={(v:any, n:any, p:any) => {
                    if (n === 'etfFlow') {
                        return p.payload.isMarketClosed ? ['Closed', 'Net Flow'] : [`$${fmt(v)}M`, 'Net Flow'];
                    }
                    if (n === 'price') return [`$${fmt(v)}`, 'Price'];
                    return [v, n];
                }}
              />
              
              <Bar yAxisId="f" dataKey="etfFlow" barSize={filter==='ALL'?2:12} radius={[2,2,0,0]}>
                {chartData.map((d, i) => (
                    <Cell key={i} fill={d.isMarketClosed ? '#334155' : (d.etfFlow >= 0 ? '#10B981' : '#F43F5E')} opacity={d.isMarketClosed ? 0.3 : 0.8} />
                ))}
              </Bar>
              <Line yAxisId="p" type="monotone" dataKey="price" stroke="#FBBF24" strokeWidth={2} dot={false} animationDuration={1000} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Chart phụ: OI & Funding */}
        <div className="h-[80px] w-full mt-2 border-t border-slate-800 pt-2 relative">
             <div className="absolute top-2 left-0 text-[9px] font-bold text-purple-400 bg-black/40 px-1 rounded z-10">OPEN INTEREST</div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="mktSync">
                    <YAxis hide domain={['auto', 'auto']}/>
                    <Tooltip content={<></>} cursor={{stroke:'#fff', strokeOpacity:0.1}}/>
                    <Area type="monotone" dataKey="oi" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} dot={false} strokeWidth={1}/>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
