'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, Info } from 'lucide-react';
import { alignMarketData, analyzeSmartMoney } from '../utils/smartMoneyLogic';

const fmt = (v: number) => new Intl.NumberFormat('en-US').format(Math.round(v));

export default function SmartMoneyDashboard({ priceData, etfData }: { priceData: any[], etfData: any }) {
  const [filter, setFilter] = useState<'1W'|'1M'|'1Y'|'ALL'>('1M');

  const chartData = useMemo(() => {
    if (!priceData.length || !etfData?.BTC?.rows) return [];
    const aligned = alignMarketData(priceData, etfData.BTC.rows);
    const len = aligned.length;
    if (filter === '1W') return aligned.slice(-7);
    if (filter === '1M') return aligned.slice(-30);
    if (filter === '1Y') return aligned.slice(-365);
    return aligned;
  }, [priceData, etfData, filter]);

  const signal = useMemo(() => analyzeSmartMoney(chartData[chartData.length - 1]), [chartData]);

  if (!chartData.length) return <div className="p-10 text-center text-slate-500 animate-pulse">Đang đồng bộ dữ liệu lịch sử...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {signal && (
          <div className={`flex-1 p-4 rounded-xl border ${signal.bg} flex items-center gap-3`}>
            <BrainCircuit size={20} className={signal.color}/>
            <div>
              <div className={`font-bold text-xs ${signal.color}`}>{signal.label}</div>
              <div className="text-[10px] text-slate-300">{signal.desc}</div>
            </div>
          </div>
        )}
        <div className="flex bg-[#151921] p-1 rounded-lg border border-slate-700 h-fit">
          {['1W', '1M', '1Y', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-1.5 text-[10px] font-bold rounded ${filter===f?'bg-slate-700 text-white':'text-slate-500'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-[#151921] border border-slate-700 rounded-xl p-4 shadow-2xl">
        <div className="h-[300px] w-full relative">
          <div className="absolute top-0 left-0 text-[10px] font-bold text-slate-400 z-10">PRICE vs NET FLOW</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} syncId="mktSync">
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 9, fill:'#94A3B8'}} />
              <YAxis yAxisId="p" orientation="left" domain={['auto', 'auto']} tick={{fontSize: 9, fill:'#FBBF24'}} tickFormatter={(v)=>`$${fmt(v)}`}/>
              <YAxis yAxisId="f" orientation="right" hide />
              <Tooltip 
                contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}}
                formatter={(v:any, n:any, p:any) => [p.payload.isMarketClosed && n==='etfFlow' ? 'CLOSED' : fmt(v), n]}
              />
              <Bar yAxisId="f" dataKey="etfFlow" barSize={filter==='ALL'?2:10}>
                {chartData.map((d, i) => <Cell key={i} fill={d.isMarketClosed ? '#334155' : (d.etfFlow>0?'#10B981':'#F43F5E')} />)}
              </Bar>
              <Line yAxisId="p" type="monotone" dataKey="price" stroke="#FBBF24" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="h-[80px] w-full mt-2 border-t border-slate-800 pt-2">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="mktSync">
                    <YAxis hide domain={['auto', 'auto']}/>
                    <Area type="monotone" dataKey="oi" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
