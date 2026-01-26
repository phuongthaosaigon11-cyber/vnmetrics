export interface MarketPoint {
  date: string;
  price: number;
  etfFlow: number;
  oi: number;
  funding: number;
}

export const alignMarketData = (priceData: any[], etfRows: any[]): MarketPoint[] => {
  if (!priceData || priceData.length === 0 || !etfRows || etfRows.length === 0) return [];

  // 1. Map ETF Data theo ngày (Key: "20 Jan")
  const etfMap = new Map();
  etfRows.forEach((row: any) => {
    if (row && row.Date) {
       // Lấy 2 phần đầu của ngày: "20 Jan 2025" -> "20 Jan"
       const key = row.Date.split(' ').slice(0, 2).join(' '); 
       const flow = parseFloat(String(row.Total).replace(/,/g, '')) || 0;
       etfMap.set(key, flow);
    }
  });

  // 2. Merge vào Price Data
  const merged: MarketPoint[] = priceData.map((p, index) => {
    const dateObj = new Date(p.fullTime || p.time); 
    // Format ngày từ Price Data thành "20 Jan" để khớp với ETF
    const dayStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); 
    
    const etfFlow = etfMap.get(dayStr) || 0;

    // 3. GIẢ LẬP DERIVATIVES (Simulation Logic)
    // Nếu bạn có API thật, thay thế đoạn này
    const volatility = Math.abs(p.price - (priceData[index-1]?.price || p.price));
    
    // OI thường tăng khi giá biến động
    const oi = (p.price * 500) + (volatility * 100000) + (Math.sin(index) * 2000000); 
    
    // Funding Rate phản ánh độ hưng phấn
    let funding = 0.01; // Baseline
    if (etfFlow > 50) funding += 0.005; // Flow mạnh -> Funding tăng
    if (etfFlow < -50) funding -= 0.005; // Flow rút -> Funding giảm
    funding += (Math.random() * 0.004 - 0.002); // Noise nhẹ

    return {
      date: dayStr,
      price: p.price,
      etfFlow,
      oi,
      funding
    };
  });

  return merged;
};

export const analyzeSmartMoney = (lastPoint: MarketPoint, prevPoint: MarketPoint) => {
  if (!lastPoint || !prevPoint) return null;

  const { etfFlow, funding, price, oi } = lastPoint;
  const prevPrice = prevPoint.price;
  const priceTrend = price > prevPrice ? 'UP' : 'DOWN';
  const oiTrend = oi > prevPoint.oi ? 'UP' : 'DOWN';

  // LOGIC 1: SPOT-DRIVEN (Tốt)
  if (etfFlow > 0 && priceTrend === 'UP' && funding < 0.02) {
    return {
      type: 'HEALTHY',
      label: 'SPOT-DRIVEN RALLY',
      desc: 'Giá tăng nhờ dòng tiền ETF thực. Đòn bẩy thấp. Xu hướng bền vững.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/50',
      iconColor: 'bg-emerald-500'
    };
  }

  // LOGIC 2: LEVERAGE BUBBLE (Xấu)
  if (etfFlow <= 0 && priceTrend === 'UP' && oiTrend === 'UP') {
    return {
      type: 'DANGER',
      label: 'LEVERAGE BUBBLE',
      desc: 'Cảnh báo: Giá tăng do đầu cơ đòn bẩy (OI tăng) nhưng ETF không mua. Rủi ro sập hầm.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/50',
      iconColor: 'bg-rose-500'
    };
  }

  // LOGIC 3: ACCUMULATION (Cơ hội)
  if (priceTrend === 'DOWN' && etfFlow > 0) {
    return {
      type: 'OPPORTUNITY',
      label: 'SMART MONEY BUY DIP',
      desc: 'Giá giảm nhưng Cá voi/ETF đang âm thầm gom hàng. Tín hiệu đảo chiều.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/50',
      iconColor: 'bg-blue-500'
    };
  }

  return {
    type: 'NEUTRAL',
    label: 'NEUTRAL MARKET',
    desc: 'Thị trường đi ngang hoặc biến động chưa rõ xu hướng dòng tiền.',
    color: 'text-slate-400',
    bg: 'bg-slate-800 border-slate-700',
    iconColor: 'bg-slate-600'
  };
};
