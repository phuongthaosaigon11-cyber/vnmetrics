export interface MarketPoint {
  date: string;
  price: number;
  etfFlow: number;
  oi: number;
  funding: number;
}

export const alignMarketData = (priceData: any[], etfRows: any[]): MarketPoint[] => {
  if (!priceData || priceData.length === 0 || !etfRows || etfRows.length === 0) return [];

  // 1. Map ETF Data (Key chuẩn hóa: "20 Jan")
  const etfMap = new Map();
  etfRows.forEach((row: any) => {
    if (row && row.Date) {
       let key = row.Date;
       // Cố gắng lấy format "DD Mon" (ví dụ: 20 Jan)
       try {
         const parts = row.Date.split(' ');
         if (parts.length >= 2) key = `${parts[0]} ${parts[1]}`;
       } catch (e) {}
       
       const flow = parseFloat(String(row.Total).replace(/,/g, '')) || 0;
       etfMap.set(key, flow);
    }
  });

  // 2. Merge Price Data (Dùng Timestamp để tránh lỗi Invalid Date)
  const merged: MarketPoint[] = priceData.map((p, index) => {
    // Ưu tiên dùng timestamp số nguyên, nếu không mới parse chuỗi
    let dateObj: Date;
    if (p.timestamp) {
        dateObj = new Date(p.timestamp);
    } else {
        dateObj = new Date(p.fullTime || p.time);
    }

    // Nếu ngày lỗi -> Bỏ qua
    if (isNaN(dateObj.getTime())) return null;

    // Format ngày ngắn gọn: "20 Jan" (Locale Anh để khớp key ETF)
    const dayStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    const etfFlow = etfMap.get(dayStr) || 0;

    // Logic giả lập chỉ số phái sinh
    const volatility = Math.abs(p.price - (priceData[index-1]?.price || p.price));
    const oi = (p.price * 500) + (volatility * 150000) + 50000000; 
    
    let funding = 0.01; 
    if (etfFlow > 50) funding += 0.008; 
    if (etfFlow < -50) funding -= 0.005; 
    funding += (Math.random() * 0.004 - 0.002);

    return {
      date: dayStr,
      price: p.price,
      etfFlow,
      oi,
      funding
    };
  }).filter((item): item is MarketPoint => item !== null); // Lọc bỏ giá trị null

  return merged;
};

export const analyzeSmartMoney = (lastPoint: MarketPoint, prevPoint: MarketPoint) => {
  if (!lastPoint || !prevPoint) return null;

  const { etfFlow, funding, price, oi } = lastPoint;
  const prevPrice = prevPoint.price;
  const priceTrend = price > prevPrice ? 'UP' : 'DOWN';
  const oiTrend = oi > prevPoint.oi ? 'UP' : 'DOWN';

  if (etfFlow > 0 && priceTrend === 'UP' && funding < 0.02) {
    return {
      type: 'HEALTHY',
      label: 'SPOT-DRIVEN RALLY',
      desc: 'Giá tăng nhờ dòng tiền thực. Đòn bẩy thấp. Xu hướng bền.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-500/50',
      iconColor: 'bg-emerald-500'
    };
  }

  if (etfFlow <= 0 && priceTrend === 'UP' && oiTrend === 'UP') {
    return {
      type: 'DANGER',
      label: 'LEVERAGE BUBBLE',
      desc: 'Giá tăng do đầu cơ đòn bẩy (OI tăng) nhưng ETF không mua.',
      color: 'text-rose-400',
      bg: 'bg-rose-950/40 border-rose-500/50',
      iconColor: 'bg-rose-500'
    };
  }

  if (priceTrend === 'DOWN' && etfFlow > 0) {
    return {
      type: 'OPPORTUNITY',
      label: 'SMART MONEY BUY DIP',
      desc: 'Giá giảm nhưng Cá voi đang gom hàng mạnh.',
      color: 'text-blue-400',
      bg: 'bg-blue-950/40 border-blue-500/50',
      iconColor: 'bg-blue-500'
    };
  }

  return {
    type: 'NEUTRAL',
    label: 'NEUTRAL MARKET',
    desc: 'Thị trường đi ngang, chưa rõ xu hướng.',
    color: 'text-slate-200',
    bg: 'bg-slate-800/60 border-slate-600',
    iconColor: 'bg-slate-500'
  };
};
