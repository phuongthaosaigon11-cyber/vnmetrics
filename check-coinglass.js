const https = require('https');

// URL bạn tìm được
const url = 'https://capi.coinglass.com/api/etf/flow';

const options = {
  headers: {
    // Giả danh trình duyệt để không bị chặn (Quan trọng)
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.coinglass.com',
    'Referer': 'https://www.coinglass.com/'
  }
};

console.log('🔄 Đang kết nối Coinglass API (Hidden)...');

https.get(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => { data += chunk; });

  res.on('end', () => {
    try {
      // 1. Parse JSON
      const json = JSON.parse(data);
      
      console.log('✅ KẾT NỐI THÀNH CÔNG!');
      console.log('----------------------');

      // 2. Kiểm tra xem có dữ liệu không
      // Coinglass thường trả về data trong mảng 'data'
      if (json.data && Array.isArray(json.data)) {
         console.log(`📊 Tìm thấy ${json.data.length} dòng dữ liệu.`);
         
         // Lấy mẫu 1 dòng mới nhất để xem cấu trúc
         const latest = json.data[0]; 
         console.log('\n👇 CẤU TRÚC DỮ LIỆU TRẢ VỀ (MẪU MỚI NHẤT):');
         console.dir(latest, { depth: null, colors: true });

         console.log('\n💡 GỢI Ý:');
         console.log('Kiểm tra xem có trường "totalInflow", "btcPrice", "date" không nhé.');
      } else {
         console.log('⚠️ API trả về nhưng không đúng cấu trúc mong đợi.');
         console.log(JSON.stringify(json).slice(0, 200));
      }

    } catch (e) {
      console.error('❌ Lỗi xử lý dữ liệu:', e.message);
      console.log('Raw Data (có thể bị chặn):', data.slice(0, 200));
    }
  });

}).on('error', (e) => {
  console.error('❌ Lỗi kết nối:', e.message);
});
