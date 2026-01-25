const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Cấu hình các nguồn dữ liệu
const TARGETS = [
  { type: 'BTC', url: 'https://farside.co.uk/btc/', keywords: ['IBIT', 'FBTC'] },
  { type: 'ETH', url: 'https://farside.co.uk/eth-etf-flow-all-data/', keywords: ['ETHA', 'FETH'] },
  { type: 'SOL', url: 'https://farside.co.uk/solana-etf-flow-all-data/', keywords: ['QSOL', 'SOL'] }
];

// Hàm thử tải HTML qua nhiều nguồn (Multi-Proxy)
async function fetchHtml(targetUrl) {
  const proxies = [
    // 1. Kết nối trực tiếp (Giả lập Chrome)
    { 
      name: "Direct", 
      url: targetUrl, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
    },
    // 2. CorsProxy (Mạnh nhất)
    { 
      name: "CorsProxy", 
      url: `https://corsproxy.io/?${targetUrl}`, 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    },
    // 3. ThingProxy (Dự phòng)
    { 
      name: "ThingProxy", 
      url: `https://thingproxy.freeboard.io/fetch/${targetUrl}`, 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    },
    // 4. AllOrigins (Cuối cùng vì hay lỗi 500)
    { 
      name: "AllOrigins", 
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, 
      isJson: true 
    }
  ];

  for (const p of proxies) {
    try {
      console.log(`      Trying ${p.name}...`);
      const res = await axios.get(p.url, { headers: p.headers, timeout: 25000 });
      let html = p.isJson ? res.data.contents : res.data;
      
      // Kiểm tra HTML hợp lệ (phải đủ dài và chứa thẻ table)
      if (html && html.length > 5000 && html.includes('<table')) {
        return html;
      }
    } catch (e) {
      // Bỏ qua lỗi, thử proxy tiếp theo
    }
  }
  return null;
}

// Hàm phân tích dữ liệu thông minh
function parseTable(html, type) {
  const $ = cheerio.load(html);
  let bestTable = null;
  let maxRows = 0;

  // 1. Quét TẤT CẢ các bảng, chọn bảng to nhất (nhiều dòng nhất)
  $('table').each((i, tbl) => {
    const rowCount = $(tbl).find('tr').length;
    const text = $(tbl).text().toUpperCase();
    
    // Điều kiện: Phải chứa từ khóa của coin đó VÀ có trên 5 dòng
    const keywords = TARGETS.find(t => t.type === type).keywords;
    const hasKeyword = keywords.some(k => text.includes(k));

    if (hasKeyword && rowCount > maxRows) {
      maxRows = rowCount;
      bestTable = $(tbl);
    }
  });

  if (!bestTable) return null;

  // 2. Xử lý dữ liệu từ bảng tốt nhất tìm được
  const data = [];
  const headers = [];
  const rows = bestTable.find('tr');

  // Tìm dòng Header (chứa tên các quỹ)
  let headerIndex = -1;
  rows.each((i, row) => {
    const text = $(row).text().trim();
    // Header thường không bắt đầu bằng ngày tháng và có nhiều cột
    if (!/^\d{1,2}\s+[A-Za-z]{3}/.test(text) && $(row).find('td, th').length > 2) {
      headerIndex = i;
    }
  });

  if (headerIndex === -1) headerIndex = 0; // Fallback

  // Lấy tên cột
  $(rows[headerIndex]).find('td, th').each((i, el) => {
    let name = $(el).text().trim().replace(/\n/g, '').replace(/\s+/g, ' ');
    if (!name) name = `Col_${i}`;
    headers.push(name);
  });

  // Quét các dòng dữ liệu
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = $(rows[i]).find('td');
    if (cells.length < 2) continue;

    const firstCol = $(cells[0]).text().trim();
    
    // Bỏ qua các dòng tổng kết
    if (['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE', 'NOTE'].some(k => firstCol.toUpperCase().includes(k))) continue;
    
    // Kiểm tra xem cột đầu có phải là ngày không? (Hỗ trợ nhiều định dạng)
    // VD: "24 Jan", "24 Jan 2026", "2026-01-24"
    const isDate = /^\d{1,2}\s+[A-Za-z]{3}/.test(firstCol) || /^\d{4}-\d{2}-\d{2}/.test(firstCol);

    if (isDate) {
      const rowObj = {};
      cells.each((idx, cell) => {
        const key = headers[idx] || `Col_${idx}`;
        let valText = $(cell).text().trim().replace(/,/g, '');
        
        if (idx === 0) {
          rowObj['Date'] = valText;
        } else {
          // Xử lý số âm trong ngoặc đơn (123) -> -123
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

  // Đảo ngược để ngày mới nhất lên đầu
  return { headers, rows: data.reverse() };
}

async function run() {
  console.log("🚀 [VNMETRICS BOT] Starting Heavy Duty Scraper...");
  const finalData = { last_updated: new Date().toISOString() };

  for (const target of TARGETS) {
    console.log(`\n🔍 Processing: ${target.type}`);
    const html = await fetchHtml(target.url);
    
    if (html) {
      const result = parseTable(html, target.type);
      if (result && result.rows.length > 0) {
        console.log(`   ✅ Success! Found ${result.rows.length} rows.`);
        finalData[target.type] = result;
      } else {
        console.warn(`   ⚠️ Warning: HTML fetched but no data rows found.`);
        finalData[target.type] = { headers: [], rows: [] };
      }
    } else {
      console.error(`   ❌ Failed: Could not fetch HTML from any source.`);
      finalData[target.type] = { error: true, headers: [], rows: [] };
    }
  }

  // Lưu file
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  
  const outputPath = path.join(publicDir, 'etf_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Saved data to: ${outputPath}`);
}

run();
