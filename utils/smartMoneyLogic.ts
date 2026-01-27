// Hàm chuẩn hóa ngày bất chấp định dạng đầu vào -> YYYY-MM-DD
const normalizeDate = (input: any): string => {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "";
    // Trả về YYYY-MM-DD theo giờ địa phương để khớp đúng ngày
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) { return ""; }
};

export const alignMarketData = (priceData: any[], etfRows: any[]) => {
  if (!priceData || priceData.length === 0) return [];

  // 1. Tạo Map ETF Data: Key là "YYYY-MM-DD" -> Value là Flow
  const etfMap = new Map<string, number>();
  
  if (etfRows) {
    etfRows.forEach((row: any) => {
      if (row?.Date) {
         const dateKey = normalizeDate(row.Date); // Chuẩn hóa key
         // Xử lý số liệu: Bỏ dấu phẩy, ép kiểu float
         const val = parseFloat(String(row.Total).replace(/,/g, ''));
         if (dateKey && !isNaN(val)) {
            etfMap.set(dateKey, val);
         }
      }
    });
  }

  // 2. Duyệt qua Price Data (Xương sống thời gian)
  return priceData.map((p) => {
    // Lấy ngày từ timestamp của CoinGecko
    const dateObj = new Date(p.timestamp || p.time);
    const dateKey = normalizeDate(dateObj); 
    const displayDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }); // dd/mm
    const fullDate = dateObj.toLocaleDateString('en-GB'); // dd/mm/yyyy

    // Check xem ngày này có ETF Flow không
    const hasData = etfMap.has(dateKey);
    const etfFlow = hasData ? etfMap.get(dateKey)! : 0;
    
    // Kiểm tra cuối tuần (0=CN, 6=T7)
    const dayOfWeek = dateObj.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    // Logic Market Closed: Nếu không có data VÀ (là cuối tuần HOẶC là ngày hôm nay chưa có report)
    const isMarketClosed = !hasData;

    // Giả lập chỉ số phụ
    let funding = 0.01 + (etfFlow > 0 ? 0.005 : -0.003) + (Math.random() * 0.002);
    // OI giả lập biến động theo giá
    const oi = (p.price * 150) + (Math.abs(etfFlow) * 10000) + 5000000;

    return {
      date: displayDate,      // Hiển thị trục X: "26/01"
      fullDate: fullDate,     // Tooltip: "26/01/2026"
      timestamp: dateObj.getTime(),
      price: p.price,
      etfFlow,
      oi,
      funding,
      isMarketClosed,         // Cờ báo thị trường đóng cửa
      rawDate: dateKey        // Dùng để debug nếu cần
    };
  }).sort((a, b) => a.timestamp - b.timestamp); // Sắp xếp cũ -> mới cho biểu đồ
};

export const analyzeSmartMoney = (lastItem: any) => {
  if (!lastItem) return null;
  if (lastItem.isMarketClosed) return {
    label: 'MARKET CLOSED / PENDING',
    desc: `Dữ liệu ETF ngày ${lastItem.fullDate} chưa có hoặc thị trường nghỉ.`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  
  if (lastItem.etfFlow > 0) return {
    label: 'STRONG INFLOW',
    desc: 'Dòng tiền tổ chức đang mua ròng mạnh mẽ.',
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  };

  return {
    label: 'OUTFLOW / WEAK',
    desc: 'Áp lực bán từ ETF hoặc chốt lời ngắn hạn.',
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };
};
