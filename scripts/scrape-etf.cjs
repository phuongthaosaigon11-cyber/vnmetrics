const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  { type: 'BTC', url: 'https://farside.co.uk/btc/' },
  { type: 'ETH', url: 'https://farside.co.uk/eth-etf-flow-all-data/' },
  { type: 'SOL', url: 'https://farside.co.uk/solana-etf-flow-all-data/' }
];

async function scrapeWithBrowser() {
  console.log("🚀 [PUPPETEER] Khởi động trình duyệt Chrome ảo...");
  
  const browser = await puppeteer.launch({
    headless: "new", // Chạy ngầm
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Bắt buộc cho GitHub Actions
  });

  const finalData = { last_updated: new Date().toISOString() };

  try {
    const page = await browser.newPage();
    // Giả lập là người dùng thật trên Windows
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    for (const target of TARGETS) {
      console.log(`\n🔍 Đang truy cập: ${target.type} (${target.url})`);
      
      try {
        // Vào trang và đợi mạng rảnh rỗi (nghĩa là đã load xong)
        await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Đợi thẻ table xuất hiện (để chắc chắn đã qua được Cloudflare)
        try {
            await page.waitForSelector('table', { timeout: 15000 });
        } catch (e) {
            console.warn("   ⚠️ Hết giờ chờ bảng. Có thể bị chặn hoặc trang load chậm.");
        }

        // Chạy code lấy dữ liệu ngay bên trong trình duyệt
        const result = await page.evaluate((type) => {
          const tables = document.querySelectorAll('table');
          let bestTable = null;
          let maxRows = 0;

          // Tìm bảng to nhất có chứa từ khóa
          tables.forEach(tbl => {
             const txt = tbl.innerText.toUpperCase();
             const rows = tbl.querySelectorAll('tr').length;
             let keyword = 'IBIT';
             if (type === 'ETH') keyword = 'ETHA';
             if (type === 'SOL') keyword = 'SOL';

             if (txt.includes(keyword) && rows > maxRows) {
                maxRows = rows;
                bestTable = tbl;
             }
          });

          if (!bestTable) return null;

          // Parse dữ liệu
          const data = [];
          const rows = Array.from(bestTable.querySelectorAll('tr'));
          
          // Lấy Header
          let headerIndex = -1;
          const headers = [];
          
          rows.forEach((row, i) => {
             const txt = row.innerText.trim();
             // Tìm dòng header (không phải ngày tháng, nhiều cột)
             if (!/^\d{1,2}\s+[A-Za-z]{3}/.test(txt) && row.querySelectorAll('td,th').length > 2) {
                headerIndex = i;
             }
          });

          if (headerIndex === -1) headerIndex = 0;

          // Map Header Name
          rows[headerIndex].querySelectorAll('td,th').forEach((el, i) => {
             let name = el.innerText.trim().replace(/\n/g, '').replace(/\s+/g, ' ');
             if (!name) name = `Col_${i}`;
             headers.push(name);
          });

          // Map Rows
          for (let i = headerIndex + 1; i < rows.length; i++) {
             const cells = rows[i].querySelectorAll('td');
             if (cells.length < 2) continue;
             const firstCol = cells[0].innerText.trim();

             // Bỏ dòng tổng kết
             if (['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE'].some(k => firstCol.toUpperCase().includes(k))) continue;

             // Check ngày tháng
             if (/^\d{1,2}\s+[A-Za-z]{3}/.test(firstCol) || /^\d{4}-\d{2}-\d{2}/.test(firstCol)) {
                const rowObj = {};
                cells.forEach((cell, idx) => {
                   const key = headers[idx] || `Col_${idx}`;
                   let valText = cell.innerText.trim().replace(/,/g, '');
                   if (idx === 0) {
                      rowObj['Date'] = valText;
                   } else {
                      let val = 0;
                      if (valText.includes('(') || valText.includes(')')) {
                         val = -Math.abs(parseFloat(valText.replace(/[()]/g, '')));
                      } else {
                         val = parseFloat(valText);
                      }
                      rowObj[key] = isNaN(val) ? 0 : val;
                   }
                });
                data.push(rowObj);
             }
          }
          return { headers, rows: data.reverse() };

        }, target.type); // Truyền biến type vào trong browser

        if (result && result.rows.length > 0) {
            console.log(`   ✅ Thành công! Lấy được ${result.rows.length} dòng.`);
            finalData[target.type] = result;
        } else {
            console.warn(`   ⚠️ Không tìm thấy dữ liệu cho ${target.type}`);
            finalData[target.type] = { headers: [], rows: [] };
        }

      } catch (err) {
        console.error(`   ❌ Lỗi khi tải trang: ${err.message}`);
        finalData[target.type] = { error: true, headers: [], rows: [] };
      }
    }

  } catch (error) {
    console.error("❌ Lỗi trình duyệt:", error);
  } finally {
    await browser.close();
  }

  // Lưu file
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  const outputPath = path.join(publicDir, 'etf_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Đã lưu dữ liệu: public/etf_data.json`);
}

scrapeWithBrowser();
