// FILE: utils/smartMoneyLogic.ts

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

// Hàm xử lý dữ liệu Farside + Binance + CoinGecko
export const alignMarketData = (priceData: any[], farsideData: any[], oiData: any[], fundingData: any[]) => {
  if (!priceData || !priceData.length) return [];

  // 1. Map ETF Data (Farside trả về Millions USD -> cần nhân 1,000,000)
  const etfMap = new Map<string, number>();
  if (farsideData && Array.isArray(farsideData)) {
    farsideData.forEach((row: any) => {
      if (row?.date) {
         const dKey = normalizeDate(row.date); // "28 Jan 2026" -> "2026-01-28"
         const val = (row.total || 0) * 1000000; // Convert Mil to Raw
         if (dKey) etfMap.set(dKey, val);
      }
    });
  }

  // 2. Map OI Data
  const oiMap = new Map<string, number>();
  if (Array.isArray(oiData)) {
    oiData.forEach((d: any) => {
        oiMap.set(normalizeDate(d.timestamp), parseFloat(d.sumOpenInterestValue || d.sumOpenInterest));
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
      Object.keys(tempGroup).forEach(k => {
          const sum = tempGroup[k].reduce((a,b)=>a+b,0);
          fundMap.set(k, sum / tempGroup[k].length); 
      });
  }

  // 4. Merge All
  return priceData.map((p) => {
    const dateObj = new Date(p[0]);
    const dateKey = normalizeDate(dateObj); 
    
    const displayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); 
    const fullDate = dateObj.toLocaleDateString('vi-VN');

    const hasData = etfMap.has(dateKey);
    const etfFlow = hasData ? etfMap.get(dateKey)! : 0;
    const isMarketClosed = !hasData;

    const oi = oiMap.get(dateKey) || 0;
    const funding = fundMap.get(dateKey) || 0;

    return {
      date: displayDate,
      fullDate: fullDate,
      timestamp: dateObj.getTime(),
      price: p[1],
      etfFlow, // Đã chuẩn hóa về USD
      oi,       
      funding, 
      isMarketClosed
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
};

export const analyzeSmartMoney = (lastItem: any) => {
  if (!lastItem) return null;
  
  if (lastItem.isMarketClosed) return {
    label: 'ĐANG CẬP NHẬT',
    desc: `Dữ liệu ETF hôm nay chưa chốt sổ (thường có vào sáng mai).`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  
  if (lastItem.etfFlow > 0) return {
    label: 'DÒNG TIỀN DƯƠNG (INFLOW)',
    desc: `Cá mập ETF đang mua ròng (+$${new Intl.NumberFormat('en-US', {notation: "compact"}).format(lastItem.etfFlow)}).`,
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  };

  return {
    label: 'ÁP LỰC BÁN (OUTFLOW)',
    desc: `Dòng tiền đang rút ra ($${new Intl.NumberFormat('en-US', {notation: "compact"}).format(lastItem.etfFlow)}).`,
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };
};
