const https = require('https');

// URL từ log của bạn (Build ID: VXC1Zhg...)
const url = 'https://www.coinglass.com/_next/data/VXC1Zhg8niJSEgIbMMxCG/en/etf/bitcoin.json';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

console.log('🔄 Đang tải dữ liệu ETF từ Next.js Cache...');

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ TẢI THÀNH CÔNG!');
      
      // Đường dẫn vào dữ liệu ETF trong cấu trúc Next.js thường rất sâu
      // Thường là: pageProps -> etfList hoặc pageProps -> data
      const props = json.pageProps || {};
      
      // Thử tìm các mảng dữ liệu tiềm năng
      const etfList = props.etfList || props.data || (props.dehydratedState ? "Cần giải nén State" : null);

      if (Array.isArray(etfList)) {
        console.log(`📊 Tìm thấy ${etfList.length} quỹ ETF.`);
        console.log('--------------------------------------------------');
        console.log('Top 3 Quỹ dẫn đầu:');
        etfList.slice(0, 3).forEach(etf => {
            console.log(`- ${etf.symbol || etf.ticker}: Price $${etf.price}, Prem ${etf.premium || 0}%`);
        });
        
        console.log('\n👇 CẤU TRÚC 1 ITEM ĐẦY ĐỦ (Để tích hợp):');
        console.dir(etfList[0], { depth: 1, colors: true });
      } else {
        console.log('⚠️ Không tìm thấy mảng etfList trực tiếp. Cấu trúc pageProps:');
        console.log(Object.keys(props));
        // In thử một phần dữ liệu để soi
        if (props.etfData) console.dir(props.etfData, { depth: 1 });
      }

    } catch (e) {
      console.error('❌ Lỗi:', e.message);
    }
  });
});
