const https = require('https');

console.log("🔍 Đang kiểm tra API Phú Quý...");

const options = {
  hostname: 'be.phuquy.com.vn',
  path: '/jewelry/product-payment-service/api/products/get-price',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://phuquy.com.vn',
    'Referer': 'https://phuquy.com.vn/'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';

  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      // Thử parse JSON
      const json = JSON.parse(data);
      console.log("✅ KẾT QUẢ TRẢ VỀ (5 dòng đầu):");
      console.log(JSON.stringify(json.data ? json.data.slice(0,3) : json, null, 2));
    } catch (e) {
      console.log("❌ LỖI: Không phải JSON hợp lệ. Nội dung nhận được:");
      console.log(data.substring(0, 200) + "...");
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ LỖI KẾT NỐI: ${e.message}`);
});

req.end();
