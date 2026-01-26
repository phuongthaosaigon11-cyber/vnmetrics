export interface MarketPoint {
  date: string;
  fullDate: string;
  timestamp: number;
  price: number;
  etfFlow: number;
  oi: number;
  funding: number;
  isMarketClosed: boolean;
}

export const alignMarketData = (priceData: any[], etfRows: any[]): MarketPoint[] => {
  if (!priceData || priceData.length === 0) return [];

  // 1. Map ETF Data (Key chuẩn: "26 Jan")
  const etfMap = new Map();
  if (etfRows) {
    etfRows.forEach((row: any) => {
      if (row?.Date) {
         const d = new Date(row.Date);
         const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
         etfMap.set(key, parseFloat(String(row.Total).replace(/,/g, '')) || 0);
      }
    });
  }

  // 2. Duyệt qua Price Data làm chuẩn (Luôn có dữ liệu mới nhất từ CoinGecko)
  return priceData.map((p, index) => {
    const dateObj = new Date(p.timestamp || p.time);
    if (isNaN(dateObj.getTime())) return null;

    const dayStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fullDate = dateObj.toLocaleDateString('en-GB');

    // Nếu không tìm thấy trong Map => Chưa có dữ liệu ETF (Hôm nay hoặc Cuối tuần)
    const hasData = etfMap.has(dayStr);
    const etfFlow = hasData ? etfMap.get(dayStr) : 0;

    // Giả lập Derivatives dựa trên giá
    const volatility = Math.abs(p.price - (priceData[index-1]?.price || p.price));
    const oi = (p.price * 500) + (volatility * 150000) + 50000000;
    let funding = 0.01 + (etfFlow > 0 ? 0.005 : -0.003) + (Math.random() * 0.004);

    return {
      date: dayStr,
      fullDate,
      timestamp: dateObj.getTime(),
      price: p.price,
      etfFlow,
      oi,
      funding,
      isMarketClosed: !hasData
    };
  })
  .filter((item): item is MarketPoint => item !== null)
  .sort((a, b) => a.timestamp - b.timestamp); // Chart cần sort từ cũ đến mới
};

export const analyzeSmartMoney = (last: MarketPoint) => {
  if (!last) return null;
  if (last.isMarketClosed) return {
    label: 'MARKET PENDING / CLOSED',
    desc: `Dữ liệu ETF ngày ${last.date} chưa được cập nhật. Đang theo dõi biến động giá Spot.`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  return last.etfFlow > 0 ? {
    label: 'INSTITUTIONAL BUYING',
    desc: 'Dòng tiền tổ chức đang vào mạnh. Cấu trúc thị trường lành mạnh.',
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  } : {
    label: 'CAPITAL OUTFLOW',
    desc: 'ETF đang bị rút ròng. Áp lực bán từ phía tổ chức gia tăng.',
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };
};
