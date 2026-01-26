export interface MarketPoint {
  date: string;       // "26 Jan"
  fullDate: string;   // "26/01/2026" (Dùng cho tooltip)
  timestamp: number;
  price: number;
  etfFlow: number;
  cumulativeFlow: number; // Dòng tiền tích lũy (Optional)
  oi: number;
  funding: number;
  isMarketClosed: boolean; // Cờ đánh dấu ngày nghỉ/chưa có data
}

export const alignMarketData = (priceData: any[], etfRows: any[]): MarketPoint[] => {
  if (!priceData || priceData.length === 0) return [];

  // 1. Tạo Map ETF Data (Key chuẩn hóa: "DD/MM/YYYY")
  const etfMap = new Map<string, number>();
  
  if (etfRows && etfRows.length > 0) {
      etfRows.forEach((row: any) => {
        if (row && row.Date) {
           const dateObj = new Date(row.Date);
           if (!isNaN(dateObj.getTime())) {
              // Key: 26/1/2026
              const key = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
              const flow = parseFloat(String(row.Total).replace(/,/g, '')) || 0;
              etfMap.set(key, flow);
           }
        }
      });
  }

  // 2. Duyệt qua Price Data (Làm xương sống vì luôn có dữ liệu mới nhất)
  let accFlow = 0;
  
  const merged = priceData.map((p, index) => {
    let dateObj: Date;
    if (typeof p.timestamp === 'number') {
        dateObj = new Date(p.timestamp);
    } else {
        dateObj = new Date(p.fullTime || p.time);
    }

    if (isNaN(dateObj.getTime())) return null;

    // Key đối chiếu: 26/1/2026
    const key = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
    
    // Format hiển thị
    const displayDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fullDate = dateObj.toLocaleDateString('en-GB'); // 26/01/2026

    // Lấy Flow
    let etfFlow = 0;
    let isMarketClosed = true;

    if (etfMap.has(key)) {
        etfFlow = etfMap.get(key) || 0;
        isMarketClosed = false; // Có dữ liệu trong file JSON => Market mở
    } else {
        // Không có trong JSON (Cuối tuần hoặc Hôm nay chưa update)
        // Check thứ trong tuần (0 = CN, 6 = T7)
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            isMarketClosed = true;
        } else {
            // Ngày thường mà không có data -> Coi như chưa update (Pending)
            isMarketClosed = true; 
        }
    }
    
    accFlow += etfFlow;

    // Logic giả lập chỉ số phái sinh
    const volatility = Math.abs(p.price - (priceData[index-1]?.price || p.price));
    const oi = (p.price * 200) + (volatility * 50000) + 10000000; 
    
    let funding = 0.01;
    if (etfFlow > 0) funding += 0.005;
    if (etfFlow < 0) funding -= 0.005;
    funding += (Math.random() * 0.002);

    return {
      date: displayDate,
      fullDate: fullDate,
      timestamp: dateObj.getTime(),
      price: p.price,
      etfFlow,
      cumulativeFlow: accFlow,
      oi,
      funding,
      isMarketClosed
    };
  })
  .filter((item): item is MarketPoint => item !== null)
  .sort((a, b) => a.timestamp - b.timestamp); // Sắp xếp cũ -> mới để vẽ Chart

  return merged;
};

export const analyzeSmartMoney = (lastPoint: MarketPoint, prevPoint: MarketPoint) => {
  if (!lastPoint || !prevPoint) return null;
  
  // Nếu market đóng cửa, phân tích dựa trên hành động giá và OI
  if (lastPoint.isMarketClosed) {
      return {
        type: 'WAITING',
        label: 'MARKET CLOSED / PENDING',
        desc: `Dữ liệu ETF ngày ${lastPoint.date} chưa được cập nhật hoặc thị trường đóng cửa.`,
        color: 'text-slate-400',
        bg: 'bg-slate-800/50 border-slate-700',
        iconColor: 'bg-slate-600'
      };
  }

  const { etfFlow, price } = lastPoint;
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
  // ... (Giữ nguyên các logic khác)
  return {
    type: 'NEUTRAL',
    label: 'NEUTRAL',
    desc: 'Thị trường đi ngang.',
    color: 'text-slate-300',
    bg: 'bg-slate-800/50 border-slate-700',
    iconColor: 'bg-slate-500'
  };
};
