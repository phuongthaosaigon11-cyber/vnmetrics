'use client';

import React, { useMemo } from 'react';
import { 
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { BrainCircuit, Info, Zap } from 'lucide-react';
import { alignMarketData, analyzeSmartMoney } from '../utils/smartMoneyLogic';

export default function SmartMoneyDashboard({ priceData, etfData }: { priceData: any[], etfData: any }) {
  
  const chartData = useMemo(() => {
    if (!etfData?.BTC?.rows || !priceData) return [];
    // Clone và đảo ngược để xếp theo thời gian tăng dần
    const rows = [...etfData.BTC.rows].reverse(); 
    // Lấy dữ liệu và cắt 30 ngày gần nhất
    return alignMarketData(priceData, rows).slice(-30); 
  }, [priceData, etfData]);

  const currentSignal = useMemo(() => {
    if (chartData.length < 2) return null;
    return analyzeSmartMoney(chartData[chartData.length - 1], chartData[chartData.length - 2]);
  }, [chartData]);

  if (!chartData.length) return (
    <div className="p-8 text-center border border-slate-800 rounded-xl bg-[#151921] text-slate-500 flex flex-col items-center gap-2">
        <Zap className="animate-bounce text-yellow-500"/>
        <span>Đang đồng bộ dữ liệu Price & ETF... Vui lòng chọn BTC ở tab Thị trường trước.</span>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      
      {/* 1. AI INSIGHT BOX */}
      {currentSignal && (
        <div className={`p-5 rounded-xl border flex items-start gap-4 shadow-lg ${currentSignal.bg}`}>
           <div className={`p-3 rounded-full shadow-inner ${currentSignal.iconColor}/20`}>
              <BrainCircuit size={24} className={currentSignal.color.replace('text-', 'stroke-')} />
           </div>
           <div>
              <h4 className={`font-bold text-lg ${currentSignal.color} flex items-center gap-2`}>
                 {currentSignal.label}
                 <span className="text-[10px] px-2 py-0.5 border border-current rounded opacity-60 font-mono">AI-SIGNAL</span>
              </h4>
              <p className="text-slate-300 text-sm mt-1 leading-relaxed opacity-90">{currentSignal.desc}</p>
           </div>
        </div>
      )}

      {/* 2. STACKED CHARTS CONTAINER */}
      <div className="bg-[#151921] border border-slate-800 rounded-xl p-4 shadow-2xl">
        
        {/* CHART A: PRICE vs ETF FLOW */}
        <div className="h-[280px] w-full mb-1 relative group">
            <div className="absolute top-2 left-2 z-10 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">PRICE (Vàng) vs ETF FLOW (Cột)</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="marketSync" margin={{top: 10, right: 0, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis yAxisId="price" orientation="left" domain={['auto', 'auto']} hide />
                    <YAxis yAxisId="flow" orientation="right" domain={['auto', 'auto']} hide />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155', borderRadius: '8px'}}
                        itemStyle={{fontSize: '12px', fontFamily: 'monospace'}}
                        labelStyle={{display: 'none'}}
                        formatter={(val:any) => typeof val === 'number' ? val.toLocaleString() : val}
                    />
                    <Bar yAxisId="flow" dataKey="etfFlow" barSize={8} opacity={0.4} animationDuration={1000}>
                        {chartData.map((d, i) => <Cell key={i} fill={d.etfFlow > 0 ? '#10B981' : '#F43F5E'} />)}
                    </Bar>
                    <Line yAxisId="price" type="monotone" dataKey="price" stroke="#FBBF24" strokeWidth={2} dot={false} activeDot={{r: 6, fill:'#FBBF24'}} animationDuration={1500}/>
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* CHART B: OPEN INTEREST */}
        <div className="h-[100px] w-full mb-1 border-t border-slate-800/50 pt-1 relative">
             <div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                OPEN INTEREST <Info size={10}/>
             </div>
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="marketSync" margin={{top: 5, right: 0, left: 0, bottom: 0}}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}} labelStyle={{display: 'none'}}/>
                    <Area type="monotone" dataKey="oi" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={1.5} animationDuration={1000}/>
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* CHART C: FUNDING RATE */}
        <div className="h-[100px] w-full border-t border-slate-800/50 pt-1 relative">
             <div className="absolute top-2 left-2 z-10 text-[10px] font-bold text-slate-500">FUNDING RATE</div>
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} syncId="marketSync" margin={{top: 5, right: 0, left: 0, bottom: 0}}>
                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748B'}} tickMargin={5}/>
                    <YAxis hide />
                    <ReferenceLine y={0.01} stroke="#334155" strokeDasharray="3 3"/>
                    <Tooltip contentStyle={{backgroundColor: '#0B0E14', borderColor: '#334155'}} labelStyle={{color: '#94A3B8'}}/>
                    <Bar dataKey="funding" barSize={12} animationDuration={1000}>
                        {chartData.map((d, i) => (
                            <Cell key={i} fill={d.funding > 0.015 ? '#F43F5E' : (d.funding < 0 ? '#10B981' : '#64748B')} />
                        ))}
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
