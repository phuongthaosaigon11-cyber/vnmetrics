const axios = require('axios');
const cheerio = require('cheerio');

// Danh sách link cần test
const TARGETS = [
  { type: 'BTC', url: 'https://farside.co.uk/btc/' },
  { type: 'ETH', url: 'https://farside.co.uk/eth-etf-flow-all-data/' },
  { type: 'SOL', url: 'https://farside.co.uk/solana-etf-flow-all-data/' }
];

async function testScrape() {
  console.log("🔍 --- BẮT ĐẦU KIỂM TRA DỮ LIỆU ---");
  
  for (const target of TARGETS) {
    console.log(`\nTesting: ${target.type} (${target.url})`);
    
    // 1. Thử kết nối qua Proxy (AllOrigins - Cách mạnh nhất hiện tại)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target.url)}`;
    
    try {
      console.log("   📡 Đang gửi request...");
      const res = await axios.get(proxyUrl, { timeout: 15000 });
      
      // AllOrigins trả về JSON có field 'contents' chứa HTML
      const html = res.data.contents;
      
      if (!html || html.length < 1000) {
        console.error("   ❌ LỖI: HTML trả về quá ngắn hoặc rỗng.");
        continue;
      }
      console.log(`   ✅ Đã tải HTML (${html.length} ký tự).`);

      // 2. Phân tích HTML tìm bảng
      const $ = cheerio.load(html);
      let foundTable = false;
      
      $('table').each((i, tbl) => {
        const text = $(tbl).text().toUpperCase();
        // Tìm các từ khóa đặc trưng của từng coin
        const keyword = target.type === 'BTC' ? 'IBIT' : (target.type === 'ETH' ? 'ETHA' : 'SOL');
        
        if (text.includes(keyword)) {
          console.log(`   ✅ Tìm thấy bảng dữ liệu (Table index: ${i})`);
          foundTable = true;
          
          // Đếm số dòng dữ liệu
          const rows = $(tbl).find('tr');
          let dataRowCount = 0;
          let latestDate = '';

          rows.each((j, row) => {
             const cellText = $(row).find('td').first().text().trim();
             // Kiểm tra regex ngày tháng (VD: 20 Jan 2026)
             if (/^\d{1,2}\s+[A-Za-z]{3}/.test(cellText)) {
                dataRowCount++;
                if (!latestDate) latestDate = cellText; // Dòng đầu tiên tìm thấy thường là mới nhất (hoặc ngược lại)
             }
          });
          
          console.log(`      -> Tổng số dòng dữ liệu: ${dataRowCount}`);
          console.log(`      -> Ngày dữ liệu gần nhất tìm thấy: ${latestDate}`);
          return false; // Break loop
        }
      });

      if (!foundTable) {
        console.warn(`   ⚠️ CẢNH BÁO: Tải được HTML nhưng KHÔNG tìm thấy bảng chứa từ khóa.`);
      }

    } catch (e) {
      console.error(`   ❌ LỖI KẾT NỐI: ${e.message}`);
    }
  }
  console.log("\n🏁 --- KẾT THÚC KIỂM TRA ---");
}

testScrape();
