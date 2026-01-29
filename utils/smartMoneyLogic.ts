// FILE: utils/smartMoneyLogic.ts

const normalizeDate = (input: any): string => {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "";
    // Chuyển về UTC+0 hoặc Local Date string yyyy-mm-dd để so sánh
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ""; }
};

export const alignMarketData = (priceData: any[], farsideData: any[], oiData: any[], fundingData: any[]) => {
  if (!priceData || !priceData.length) return [];

  // 1. Map ETF Data
  const etfMap = new Map<string, number>();
  if (farsideData && Array.isArray(farsideData)) {
    farsideData.forEach((row: any) => {
      if (row?.date) {
         // Farside date: "28 Jan 2026"
         const dKey = normalizeDate(new Date(row.date)); 
         // row.total là triệu USD -> nhân 1 triệu
         const val = (row.total || 0) * 1000000; 
         if (dKey) etfMap.set(dKey, val);
      }
    });
  }

  // 2. Map OI Data (Binance trả về timestamp)
  const oiMap = new Map<string, number>();
  if (Array.isArray(oiData)) {
    oiData.forEach((d: any) => {
        // sumOpenInterestValue là giá trị USD, sumOpenInterest là số lượng BTC
        const val = parseFloat(d.sumOpenInterestValue || d.sumOpenInterest || '0');
        oiMap.set(normalizeDate(d.timestamp), val);
    });
  }

  // 3. Map Funding Data
  const fundMap = new Map<string, number>();
  if (Array.isArray(fundingData)) {
      const tempGroup: Record<string, number[]> = {};
      fundingData.forEach((d:any) => {
          const key = normalizeDate(d.fundingTime);
          if(!tempGroup[key]) tempGroup[key] = [];
          tempGroup[key].push(parseFloat(d.fundingRate));
      });
      // Tính trung bình cộng Funding Rate trong ngày
      Object.keys(tempGroup).forEach(k => {
          const sum = tempGroup[k].reduce((a,b)=>a+b,0);
          fundMap.set(k, sum / tempGroup[k].length); 
      });
  }

  // 4. Merge All dựa trên Price Data (làm gốc)
  return priceData.map((p) => {
    const timestamp = p[0];
    const priceVal = p[1];
    
    const dateObj = new Date(timestamp);
    const dateKey = normalizeDate(dateObj); 
    
    // Format hiển thị: 29/01
    const displayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); 
    const fullDate = dateObj.toLocaleDateString('vi-VN');

    const etfFlow = etfMap.get(dateKey) || 0;
    const hasEtfData = etfMap.has(dateKey);

    // Nếu không có ETF data -> Có thể là cuối tuần hoặc chưa có dữ liệu
    // Tuy nhiên để biểu đồ đẹp, ta vẫn trả về 0 thay vì null
    
    const oi = oiMap.get(dateKey) || 0;
    const funding = fundMap.get(dateKey) || 0;

    return {
      date: displayDate,
      fullDate: fullDate,
      timestamp: timestamp,
      price: priceVal,
      etfFlow,
      oi,       
      funding, 
      isMarketClosed: !hasEtfData // Cờ báo hiệu thị trường đóng cửa hoặc chưa có data
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
};

export const analyzeSmartMoney = (lastItem: any) => {
  if (!lastItem) return null;
  
  // Logic phân tích text hiển thị
  const flowM = lastItem.etfFlow / 1000000; // Đổi về Triệu USD
  const flowStr = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(flowM));

  if (lastItem.isMarketClosed && lastItem.etfFlow === 0) return {
    label: 'CHỜ DỮ LIỆU',
    desc: `Dữ liệu ETF hôm nay chưa được công bố (hoặc thị trường nghỉ).`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  
  if (lastItem.etfFlow > 0) return {
    label: 'DÒNG TIỀN DƯƠNG (INFLOW)',
    desc: `Cá mập ETF đang MUA RÒNG (+$${flowStr}M). Tín hiệu tích cực.`,
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  };

  return {
    label: 'ÁP LỰC BÁN (OUTFLOW)',
    desc: `Dòng tiền đang RÚT RA (-$${flowStr}M). Cẩn trọng điều chỉnh.`,
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };
};
