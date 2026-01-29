const https = require('https');

const targets = [
  { name: 'ETH', url: 'https://farside.co.uk/eth/' },
  { name: 'SOL', url: 'https://farside.co.uk/sol/' }
];

const fetchUrl = (item) => {
  return new Promise((resolve) => {
    console.log(`\n🔄 Đang tải: ${item.url} ...`);
    https.get(item.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        // Lấy tất cả các dòng <tr>
        const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) || [];
        console.log(`   ✅ Đã tải xong! Tìm thấy ${rows.length} dòng bảng.`);
        
        if (rows.length > 0) {
            console.log(`   👇 KẾT QUẢ SOI HEADER (Dòng 1-3):`);
            // In 3 dòng đầu để xem tiêu đề cột là gì
            rows.slice(0, 3).forEach((row, i) => {
                // Lấy text trong các ô <td> hoặc <th>
                const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || [];
                const cleanCells = cells.map(c => c.replace(/<[^>]*>/g, '').trim()).filter(c => c);
                
                if (cleanCells.length > 0) {
                    console.log(`   Row ${i}: [ ${cleanCells.join(' | ')} ]`);
                }
            });
        } else {
            console.log('   ⚠️ Không tìm thấy bảng dữ liệu nào!');
        }
        resolve();
      });
    }).on('error', (e) => {
      console.log(`   ❌ Lỗi: ${e.message}`);
      resolve();
    });
  });
};

(async () => {
    for (const t of targets) await fetchUrl(t);
})();
