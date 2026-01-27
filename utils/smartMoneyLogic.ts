// Format ngày chuẩn YYYY-MM-DD
const normalizeDate = (input: any): string => {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ""; }
};

export const alignMarketData = (priceData: any[], etfRows: any[], oiData: any[], fundingData: any[]) => {
  if (!priceData || !priceData.length) return [];

  // 1. Map ETF Data
  const etfMap = new Map<string, number>();
  if (etfRows) {
    etfRows.forEach((row: any) => {
      if (row?.Date) {
         const dKey = normalizeDate(row.Date);
         const val = parseFloat(String(row.Total).replace(/,/g, ''));
         if (dKey && !isNaN(val)) etfMap.set(dKey, val);
      }
    });
  }

  // 2. Map OI Data (Binance trả về timestamp ms)
  // Data Binance: { symbol, sumOpenInterest, sumOpenInterestValue, timestamp }
  const oiMap = new Map<string, number>();
  if (Array.isArray(oiData)) {
    oiData.forEach((d: any) => {
        oiMap.set(normalizeDate(d.timestamp), parseFloat(d.sumOpenInterestValue)); // Lấy giá trị USD
    });
  }

  // 3. Map Funding Data (Binance 8h/lần -> Lấy trung bình ngày hoặc cú chốt cuối ngày)
  const fundMap = new Map<string, number>();
  if (Array.isArray(fundingData)) {
      // Group by day -> Average
      const tempGroup: Record<string, number[]> = {};
      fundingData.forEach((d:any) => {
          const key = normalizeDate(d.fundingTime);
          if(!tempGroup[key]) tempGroup[key] = [];
          tempGroup[key].push(parseFloat(d.fundingRate));
      });
      Object.keys(tempGroup).forEach(k => {
          const sum = tempGroup[k].reduce((a,b)=>a+b,0);
          fundMap.set(k, sum / tempGroup[k].length); // Average daily funding
      });
  }

  // 4. Merge All (Dùng Price làm trục chính)
  return priceData.map((p) => {
    const dateObj = new Date(p[0]); // CoinGecko: [timestamp, price]
    const dateKey = normalizeDate(dateObj); 
    
    const displayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); 
    const fullDate = dateObj.toLocaleDateString('vi-VN');

    // Lấy ETF Flow
    const hasData = etfMap.has(dateKey);
    const etfFlow = hasData ? etfMap.get(dateKey)! : 0;
    const isMarketClosed = !hasData;

    // Lấy OI & Funding (Nếu không có data ngày đó, lấy ngày liền trước hoặc 0)
    const oi = oiMap.get(dateKey) || 0;
    const funding = fundMap.get(dateKey) || 0;

    return {
      date: displayDate,
      fullDate: fullDate,
      timestamp: dateObj.getTime(),
      price: p[1],
      etfFlow,
      oi,       // Real USD Value
      funding,  // Real Rate
      isMarketClosed
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
};

export const analyzeSmartMoney = (lastItem: any) => {
  if (!lastItem) return null;
  
  if (lastItem.isMarketClosed) return {
    label: 'THỊ TRƯỜNG ĐÓNG CỬA',
    desc: `Dữ liệu ETF chưa cập nhật.`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  
  // Logic kết hợp ETF + Funding
  if (lastItem.etfFlow > 0 && lastItem.funding > 0.01) return {
    label: 'BULLISH MẠNH',
    desc: 'ETF mua ròng + Funding dương (Long áp đảo).',
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  };

  if (lastItem.etfFlow < 0) return {
    label: 'ÁP LỰC BÁN',
    desc: 'ETF đang rút ròng. Cẩn trọng.',
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };

  return {
    label: 'TRUNG TÍNH / TÍCH LŨY',
    desc: 'Dòng tiền chưa rõ xu hướng.',
    color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/50', iconColor: 'bg-amber-500'
  };
};
