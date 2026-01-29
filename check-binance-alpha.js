const https = require('https');

// 1. Nhập API Key của bạn từ dòng lệnh
const API_KEY = process.argv[2]; 

// 2. Danh sách các Token Binance Alpha (Theo bạn cung cấp)
// Lưu ý: GWEI, STAR, KOGE... có thể trùng tên, ta sẽ kiểm tra kỹ.
const ALPHA_SYMBOLS = 'OWL,TIMI,FIGHT,MGO,KOGE,ESPORTS,GWEI,STAR,ZTC,ZENT';

if (!API_KEY) {
  console.error('\n❌ LỖI: Thiếu API Key!');
  console.error('👉 Chạy lại: node check-binance-alpha.js <API_KEY_CUA_BAN>\n');
  process.exit(1);
}

const options = {
  hostname: 'pro-api.coinmarketcap.com',
  // Gọi endpoint quotes/latest để lấy giá trị hiện tại của danh sách coin
  path: `/v1/cryptocurrency/quotes/latest?symbol=${ALPHA_SYMBOLS}&convert=USD`,
  method: 'GET',
  headers: {
    'X-CMC_PRO_API_KEY': API_KEY,
    'Accept': 'application/json'
  }
};

console.log(`🔄 Đang lấy dữ liệu cho: ${ALPHA_SYMBOLS}...`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.status && json.status.error_code !== 0) {
        console.error('❌ API Error:', json.status.error_message);
      } else {
        console.log('\n✅ DỮ LIỆU TÌM THẤY (Mẫu):');
        console.log('---------------------------------------------------------------');
        console.log('| SYMBOL | NAME           | PRICE ($)   | VOL 24H ($)    | CHANGE 24H |');
        console.log('---------------------------------------------------------------');
        
        Object.values(json.data).forEach(coin => {
            // Xử lý hiển thị
            const price = coin.quote.USD.price < 1 ? coin.quote.USD.price.toFixed(6) : coin.quote.USD.price.toFixed(2);
            const vol = (coin.quote.USD.volume_24h / 1000000).toFixed(2) + 'M';
            const change = coin.quote.USD.percent_change_24h.toFixed(2) + '%';
            
            console.log(`| ${coin.symbol.padEnd(6)} | ${coin.name.padEnd(14)} | $${price.padEnd(9)} | $${vol.padEnd(12)} | ${change.padEnd(10)} |`);
        });
        console.log('---------------------------------------------------------------');
        console.log('\n⚠️ LƯU Ý: Volume này là "Aggregate Volume" (Tổng toàn thị trường).');
        console.log('   Với các token Alpha mới, Volume này thường 90% đến từ Binance.');
      }
    } catch (e) { console.error('Lỗi parse JSON:', e); }
  });
});

req.on('error', (e) => { console.error('Lỗi kết nối:', e); });
req.end();
