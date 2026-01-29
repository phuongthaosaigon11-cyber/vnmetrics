const https = require('https');

const candidates = [
  { type: 'BTC', url: 'https://farside.co.uk/bitcoin-etf-flow-all-data/' },
  { type: 'ETH (Option 1)', url: 'https://farside.co.uk/eth-etf-flow-all-data/' },
  { type: 'ETH (Option 2)', url: 'https://farside.co.uk/ethereum-etf-flow-all-data/' },
  { type: 'SOL (Option 1)', url: 'https://farside.co.uk/solana-etf-flow-all-data/' },
  { type: 'SOL (Option 2)', url: 'https://farside.co.uk/sol-etf-flow-all-data/' }
];

console.log('🔄 Đang kiểm tra các đường dẫn Farside...');
console.log('----------------------------------------');

candidates.forEach(item => {
  https.get(item.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  }, (res) => {
    const icon = res.statusCode === 200 ? '✅' : '❌';
    console.log(`${icon} ${item.type}: ${res.statusCode} \n   👉 ${item.url}`);
    
    // Nếu thành công, đọc thử 1 đoạn để xem có bảng dữ liệu không
    if (res.statusCode === 200) {
        let chunk = '';
        res.on('data', c => {
            chunk += c;
            if (chunk.length > 5000) { // Đọc 5kb đầu
                res.destroy(); 
                const hasTable = chunk.includes('<table') || chunk.includes('<tr');
                if(hasTable) console.log('   📊 Tìm thấy bảng dữ liệu!');
                else console.log('   ⚠️ Trang OK nhưng chưa thấy bảng (cần check kỹ hơn)');
            }
        });
    }
  }).on('error', (e) => {
    console.log(`❌ ${item.type}: Lỗi kết nối (${e.message})`);
  });
});
