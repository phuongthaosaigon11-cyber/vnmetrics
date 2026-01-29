const https = require('https');

const urls = [
  // 1. Check Inflow (Dòng tiền)
  'https://capi.coinglass.com/api/stock/spot/inFlow?ticker=all',
  
  // 2. Check Danh sách ETF (Type 2 thường là US ETF)
  'https://capi.coinglass.com/api/stock/v2/list?type=2' 
];

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.coinglass.com',
    'Referer': 'https://www.coinglass.com/'
  }
};

urls.forEach(url => {
  console.log(`\n🔄 Đang thử: ${url}`);
  https.get(url, options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.data && json.data.length > 0) {
           console.log(`✅ THÀNH CÔNG! Tìm thấy ${json.data.length} dòng dữ liệu.`);
           console.log('Mẫu dữ liệu đầu tiên:');
           // In gọn gàng để dễ đọc
           const item = json.data[0];
           console.log(JSON.stringify(item, null, 2));
        } else {
           console.log('⚠️ Không có dữ liệu (Mảng rỗng hoặc bị chặn).');
        }
      } catch (e) { console.log('❌ Lỗi JSON:', e.message); }
    });
  });
});
