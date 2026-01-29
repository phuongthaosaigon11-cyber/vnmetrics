const https = require('https');

// Lấy API Key từ tham số dòng lệnh (Argument)
const API_KEY = process.argv[2]; 

if (!API_KEY) {
  console.error('\n❌ LỖI: Bạn chưa nhập API Key!');
  console.error('👉 Cách chạy đúng: node check-cmc.js <KEY_CUA_BAN>');
  console.error('Ví dụ: node check-cmc.js 8888-9999-aaaa-bbbb\n');
  process.exit(1);
}

const options = {
  hostname: 'pro-api.coinmarketcap.com',
  path: '/v1/cryptocurrency/listings/latest?start=1&limit=1&sort=volume_24h&convert=USD',
  method: 'GET',
  headers: {
    'X-CMC_PRO_API_KEY': API_KEY,
    'Accept': 'application/json'
  }
};

console.log('🔄 Đang kết nối CoinMarketCap...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.status && json.status.error_code !== 0) {
        console.error('❌ API Trả về lỗi:', json.status.error_message);
      } else {
        console.log('\n✅ KẾT QUẢ CALL API THÀNH CÔNG!');
        console.log('-----------------------------------');
        if (json.data && json.data.length > 0) {
            const token = json.data[0];
            console.log(`Token Top 1 Volume: ${token.name} (${token.symbol})`);
            console.log(`Tags: ${token.tags ? token.tags.join(', ') : 'Không có'}`);
            console.log(`Volume 24h: $${token.quote.USD.volume_24h.toLocaleString()}`);
            console.log(`Market Cap: $${token.quote.USD.market_cap.toLocaleString()}`);
            console.log('\n👇 CẤU TRÚC DỮ LIỆU GỐC (JSON):');
            console.dir(token, { depth: null, colors: true });
        } else {
            console.log('API trả về mảng rỗng (Không có data).');
        }
      }
    } catch (e) { console.error('Lỗi xử lý JSON:', e); }
  });
});

req.on('error', (e) => { console.error('Lỗi kết nối:', e); });
req.end();
