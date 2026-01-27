// Hàm chuẩn hóa ngày về dạng YYYY-MM-DD để so khớp dữ liệu
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

export const alignMarketData = (priceData: any[], etfRows: any[]) => {
  if (!priceData || priceData.length === 0) return [];

  // 1. Tạo Map dữ liệu ETF (Key: YYYY-MM-DD -> Value: Flow)
  const etfMap = new Map<string, number>();
  
  if (etfRows) {
    etfRows.forEach((row: any) => {
      if (row?.Date) {
         const dateKey = normalizeDate(row.Date);
         // Xử lý số liệu: Bỏ dấu phẩy, ép kiểu số thực
         const val = parseFloat(String(row.Total).replace(/,/g, ''));
         if (dateKey && !isNaN(val)) {
            etfMap.set(dateKey, val);
         }
      }
    });
  }

  // 2. Duyệt qua dữ liệu Giá (Làm trục thời gian chính)
  return priceData.map((p) => {
    const dateObj = new Date(p.timestamp || p.time);
    const dateKey = normalizeDate(dateObj); 
    
    // Format ngày hiển thị: "26/01"
    const displayDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); 
    // Format ngày đầy đủ cho Tooltip: "26/01/2026"
    const fullDate = dateObj.toLocaleDateString('vi-VN'); 

    // Kiểm tra xem ngày này có dữ liệu ETF không
    const hasData = etfMap.has(dateKey);
    const etfFlow = hasData ? etfMap.get(dateKey)! : 0;
    
    // Cờ báo thị trường đóng cửa (Nếu không có data)
    const isMarketClosed = !hasData;

    // Giả lập chỉ số phái sinh (để demo)
    // Funding rate thường dương nhẹ (0.01%)
    let funding = 0.01 + (etfFlow > 0 ? 0.005 : -0.003) + (Math.random() * 0.002);
    
    // OI (Hợp đồng mở) thường biến động theo giá và vol
    const oi = (p.price * 150) + (Math.abs(etfFlow) * 10000) + 5000000;

    return {
      date: displayDate,
      fullDate: fullDate,
      timestamp: dateObj.getTime(),
      price: p.price,
      etfFlow,
      oi,
      funding,
      isMarketClosed
    };
  }).sort((a, b) => a.timestamp - b.timestamp); // Sắp xếp cũ -> mới để vẽ biểu đồ
};

export const analyzeSmartMoney = (lastItem: any) => {
  if (!lastItem) return null;
  
  // Nếu thị trường đóng cửa/chưa có data
  if (lastItem.isMarketClosed) return {
    label: 'CHỜ DỮ LIỆU / ĐÓNG CỬA',
    desc: `Dữ liệu ETF ngày ${lastItem.fullDate} chưa cập nhật hoặc thị trường nghỉ lễ.`,
    color: 'text-slate-400', bg: 'bg-slate-800/50 border-slate-700', iconColor: 'bg-slate-500'
  };
  
  // Phân tích đơn giản dựa trên Flow
  if (lastItem.etfFlow > 0) return {
    label: 'DÒNG TIỀN MUA MẠNH',
    desc: 'Tổ chức đang gom hàng (Net Inflow dương). Tín hiệu tích cực.',
    color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/50', iconColor: 'bg-emerald-500'
  };

  return {
    label: 'ÁP LỰC BÁN / RÚT VỐN',
    desc: 'Dòng tiền ETF đang rút ra (Net Outflow âm). Cẩn trọng điều chỉnh.',
    color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/50', iconColor: 'bg-rose-500'
  };
};
