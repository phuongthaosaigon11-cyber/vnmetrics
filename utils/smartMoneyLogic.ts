export interface MarketPoint {
  date: string;       // Hiển thị: "26 Jan"
  timestamp: number;  // Dùng để sort
  price: number;
  etfFlow: number;
  oi: number;
  funding: number;
}

export const alignMarketData = (priceData: any[], etfRows: any[]): MarketPoint[] => {
  if (!priceData || priceData.length === 0 || !etfRows || etfRows.length === 0) return [];

  // 1. Tạo Map cho ETF Data (Chuẩn hóa Key về dạng "D/M/YYYY" hoặc timestamp ngày)
  // Mục tiêu: Dù file JSON ghi "26 Jan 2025" hay "26/1/2025" đều bắt được
  const etfMap = new Map<string, number>();
  
  etfRows.forEach((row: any) => {
    if (row && row.Date) {
       // Thử parse ngày từ chuỗi bất kỳ
       const dateObj = new Date(row.Date);
       if (!isNaN(dateObj.getTime())) {
          // Tạo key chuẩn: "26-1-2026" (dựa trên local time để khớp ngày)
          const key = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;
          const flow = parseFloat(String(row.Total).replace(/,/g, '')) || 0;
          etfMap.set(key, flow);
       }
    }
  });

  // 2. Duyệt qua Price Data (Làm gốc)
  const merged = priceData.map((p, index) => {
    // Price Data từ CoinGecko là timestamp (ms)
    let dateObj: Date;
    if (typeof p.timestamp === 'number') {
        dateObj = new Date(p.timestamp);
    } else {
        // Fallback nếu p là object cũ
        dateObj = new Date(p.fullTime || p.time);
    }

    if (isNaN(dateObj.getTime())) return null;

    // Tạo key tương tự để đối chiếu: "26-1-2026"
    const key = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;
    
    // Format hiển thị ngắn gọn: "26 Jan"
    const displayDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    // Lấy Flow (Nếu không có thì = 0)
    const etfFlow = etfMap.get(key) || 0;

    // Logic giả lập chỉ số phái sinh (giữ nguyên)
    const volatility = Math.abs(p.price - (priceData[index-1]?.price || p.price));
    const oi = (p.price * 200) + (volatility * 50000) + 10000000; 
    
    let funding = 0.01;
    if (etfFlow > 0) funding += 0.005;
    if (etfFlow < 0) funding -= 0.005;
    funding += (Math.random() * 0.002);

    return {
      date: displayDate,
      timestamp: dateObj.getTime(),
      price: p.price,
      etfFlow,
      oi,
      funding
    };
  })
  .filter((item): item is MarketPoint => item !== null)
  // Sắp xếp lại theo thời gian tăng dần
  .sort((a, b) => a.timestamp - b.timestamp);

  // Lấy 30 ngày gần nhất
  return merged.slice(-30);
};

export const analyzeSmartMoney = (lastPoint: MarketPoint, prevPoint: MarketPoint) => {
  if (!lastPoint || !prevPoint) return null;
  const { etfFlow, funding, price, oi } = lastPoint;
  const prevPrice = prevPoint.price;
  const priceTrend = price > prevPrice ? 'UP' : 'DOWN';

  if (etfFlow > 0 && priceTrend === 'UP') {
    return {
      type: 'HEALTHY',
      label: 'SPOT-DRIVEN RALLY',
      desc: 'Giá tăng kèm dòng tiền ETF dương. Xu hướng tích cực.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-500/50',
      iconColor: 'bg-emerald-500'
    };
  }
  if (etfFlow <= 0 && priceTrend === 'UP') {
    return {
      type: 'DANGER',
      label: 'WEAK RALLY',
      desc: 'Giá tăng nhưng ETF không vào tiền. Cẩn thận đảo chiều.',
      color: 'text-rose-400',
      bg: 'bg-rose-950/40 border-rose-500/50',
      iconColor: 'bg-rose-500'
    };
  }
  if (etfFlow > 0 && priceTrend === 'DOWN') {
    return {
      type: 'OPPORTUNITY',
      label: 'SMART MONEY BUY DIP',
      desc: 'Giá giảm nhưng ETF đang gom hàng.',
      color: 'text-blue-400',
      bg: 'bg-blue-950/40 border-blue-500/50',
      iconColor: 'bg-blue-500'
    };
  }
  return {
    type: 'NEUTRAL',
    label: 'NEUTRAL',
    desc: 'Thị trường đi ngang.',
    color: 'text-slate-300',
    bg: 'bg-slate-800/50 border-slate-700',
    iconColor: 'bg-slate-500'
  };
};
