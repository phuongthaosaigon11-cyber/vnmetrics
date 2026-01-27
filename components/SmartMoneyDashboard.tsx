'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, Filter } from 'lucide-react';
import { alignMarketData, analyzeSmartMoney } from '../utils/smartMoneyLogic';

// Format số: 1,234
const fmt = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

export default function SmartMoneyDashboard({ priceData, etfData }: { priceData: any[], etfData: any }) {
  const [filter, setFilter] = useState<'1W'|'1M'|'3M'|'ALL'>('1M');

  const chartData = useMemo(() => {
    if (!priceData.length || !etfData?.BTC?.rows) return [];
    // Gộp dữ liệu
    const aligned = alignMarketData(priceData, etfData.BTC.rows);
    
    // Cắt dữ liệu theo bộ lọc
    if (filter === '1W') return aligned.slice(-7);
    if (filter === '1M') return aligned.slice(-30);
    if (filter === '3M') return aligned.slice(-90);
    return aligned; // ALL
  }, [priceData, etfData, filter]);

  const signal = useMemo(() => analyzeSmartMoney(chartData[chartData.length - 1]), [chartData]);

  if (!chartData.length) return <div className="p-10 text-center text-slate-500 animate-pulse">Đang tải dữ liệu biểu đồ...</div>;

  return (
    <div className="space-y-4">
      {/* Header: AI Signal + Filter */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        {/* Hộp Nhận định AI */}
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
        
        {/* Nút Lọc Thời gian */}
        <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-700 h-fit shrink-0">
          {[
            {id: '1W', l: '1 Tuần'}, 
            {id: '1M', l: '1 Tháng'}, 
            {id: '3M', l: '3 Tháng'}, 
            {id: 'ALL', l: 'Tất cả'}
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)} className={`px-4 py-1.5 text-[10px] font-bold rounded transition-all ${filter===f.id?'bg-slate-700 text-white shadow':'text-slate-500 hover:text-slate-300'}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="bg-[#151921] border border-slate-700 rounded-xl p-4 shadow-2xl relative">
        
        {/* BIỂU ĐỒ CHÍNH: GIÁ vs FLOW */}
        <div className="h-[320px] w-full relative">
          <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400 z-10 bg-black/50 px-2 rounded backdrop-blur-sm border border-slate-800">
            GIÁ (Vàng) vs DÒNG TIỀN RÒNG (Cột)
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} syncId="mktSync">
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10, fill:'#94A3B8'}} minTickGap={30} />
              
              {/* Trục Giá (Phải) */}
              <YAxis yAxisId="p" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 10, fill:'#FBBF24'}} tickFormatter={(v)=>`$${fmt(v)}`} width={50}/>
              
              {/* Trục Flow (Trái - Ẩn scale để chart đẹp hơn) */}
              <YAxis yAxisId="f" orientation="left" domain={['dataMin', 'dataMax']} hide />
              
              <Tooltip 
                contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155', borderRadius: '8px'}}
                itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}} // Chữ trắng
                labelStyle={{color: '#94A3B8', marginBottom: '5px'}}
                labelFormatter={(l, p) => p[0]?.payload?.fullDate || l}
                formatter={(v:any, n:any, p:any) => {
                    if (n === 'etfFlow') {
                        return p.payload.isMarketClosed ? ['Đóng cửa', 'Dòng tiền Ròng'] : [`$${fmt(v)}M`, 'Dòng tiền Ròng'];
                    }
                    if (n === 'price') return [`$${fmt(v)}`, 'Giá BTC'];
                    return [v, n];
                }}
              />
              
              {/* Cột Flow */}
              <Bar yAxisId="f" dataKey="etfFlow" barSize={filter==='ALL'?2:12} radius={[2,2,0,0]}>
                {chartData.map((d, i) => (
                    <Cell key={i} fill={d.isMarketClosed ? '#334155' : (d.etfFlow >= 0 ? '#10B981' : '#F43F5E')} opacity={d.isMarketClosed ? 0.3 : 0.8} />
                ))}
              </Bar>
              {/* Đường Giá */}
              <Line yAxisId="p" type="monotone" dataKey="price" stroke="#FBBF24" strokeWidth={2} dot={false} animationDuration={1000} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* BIỂU ĐỒ PHỤ: OI & FUNDING */}
        <div className="h-[100px] w-full mt-2 border-t border-slate-800 pt-2 relative grid grid-cols-2 gap-2">
             
             {/* Chart OI */}
             <div className="relative">
                <span className="absolute top-0 left-0 text-[9px] font-bold text-purple-400 bg-black/40 px-1 rounded z-10 pointer-events-none">HỢP ĐỒNG MỞ (OI)</span>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="mktSync">
                        <YAxis hide domain={['auto', 'auto']}/>
                        <Tooltip content={<></>} cursor={{stroke:'#fff', strokeOpacity:0.1}}/>
                        <Area type="monotone" dataKey="oi" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} dot={false} strokeWidth={1}/>
                    </ComposedChart>
                </ResponsiveContainer>
             </div>

             {/* Chart Funding */}
             <div className="relative">
                <span className="absolute top-0 left-0 text-[9px] font-bold text-blue-400 bg-black/40 px-1 rounded z-10 pointer-events-none">FUNDING RATE</span>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="mktSync">
                        <YAxis hide domain={['auto', 'auto']}/>
                        <Tooltip content={<></>} cursor={{stroke:'#fff', strokeOpacity:0.1}}/>
                        {/* Reference Line 0 */}
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2}/>
                        <Bar dataKey="funding" barSize={filter==='ALL'?2:6}>
                             {chartData.map((d, i) => (
                                <Cell key={i} fill={d.funding > 0.015 ? '#ef4444' : '#3b82f6'} />
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
