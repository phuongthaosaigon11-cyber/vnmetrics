const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Cấu hình nguồn dữ liệu (Đã cập nhật Link BTC Full History)
const TARGETS = [
  { 
    type: 'BTC', 
    url: 'https://farside.co.uk/bitcoin-etf-flow-all-data/', // Link mới bạn gửi
    keywords: ['IBIT', 'FBTC'] 
  },
  { 
    type: 'ETH', 
    url: 'https://farside.co.uk/eth-etf-flow-all-data/', 
    keywords: ['ETHA', 'FETH'] 
  },
  { 
    type: 'SOL', 
    url: 'https://farside.co.uk/solana-etf-flow-all-data/', 
    keywords: ['QSOL', 'SOL'] 
  }
];

async function fetchHtml(targetUrl) {
  // Dùng AllOrigins để bypass Cloudflare và lấy toàn bộ nội dung
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  
  try {
    console.log(`      Requesting via AllOrigins...`);
    const res = await axios.get(proxyUrl, { timeout: 20000 });
    
    // AllOrigins trả về JSON, HTML nằm trong field 'contents'
    const html = res.data.contents;
    
    if (html && html.length > 5000) {
      return html;
    } else {
      console.warn("      ⚠️ HTML too short or empty.");
    }
  } catch (e) {
    console.warn(`      ❌ Error: ${e.message}`);
  }
  return null;
}

function parseTable(html, type) {
  const $ = cheerio.load(html);
  let bestTable = null;
  let maxRows = 0;

  // 1. Tìm bảng chứa dữ liệu (Logic: Chứa từ khóa coin và có nhiều dòng nhất)
  $('table').each((i, tbl) => {
    const text = $(tbl).text().toUpperCase();
    const rowsCount = $(tbl).find('tr').length;
    
    const keywords = TARGETS.find(t => t.type === type).keywords;
    
    // Bảng phải chứa từ khóa VÀ có nhiều dòng (tránh bảng menu)
    if (keywords.some(k => text.includes(k)) && rowsCount > maxRows) {
      maxRows = rowsCount;
      bestTable = $(tbl);
    }
  });

  if (!bestTable) return null;

  // 2. Phân tích dòng
  const data = [];
  const headers = [];
  const rows = bestTable.find('tr');

  // Tìm Header (Dòng chứa tên các quỹ, không phải ngày tháng)
  let headerIndex = -1;
  rows.each((i, row) => {
    const txt = $(row).text().trim();
    if (!/^\d{1,2}\s+[A-Za-z]{3}/.test(txt) && $(row).find('td,th').length > 2) {
       headerIndex = i;
    }
  });
  
  // Fallback nếu không tìm thấy header rõ ràng
  if (headerIndex === -1) headerIndex = 0;

  // Lấy tên cột
  $(rows[headerIndex]).find('td, th').each((i, el) => {
    let name = $(el).text().trim().replace(/\n/g, '').replace(/\s+/g, ' ');
    if (!name) name = `Col_${i}`;
    headers.push(name);
  });

  // Lấy dữ liệu
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = $(rows[i]).find('td');
    if (cells.length < 2) continue;

    const firstCol = $(cells[0]).text().trim();
    
    // Bỏ qua các dòng tổng kết/rác
    if (['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE', 'NOTE'].some(k => firstCol.toUpperCase().includes(k))) continue;

    // Regex nhận diện ngày (Hỗ trợ "24 Jan", "2026-01-24")
    const isDate = /^\d{1,2}\s+[A-Za-z]{3}/.test(firstCol) || /^\d{4}-\d{2}-\d{2}/.test(firstCol);

    if (isDate) {
      const rowObj = {};
      cells.each((idx, cell) => {
        const key = headers[idx] || `Col_${idx}`;
        let valText = $(cell).text().trim().replace(/,/g, '');
        
        if (idx === 0) {
            rowObj['Date'] = valText;
        } else {
          // Xử lý số âm trong ngoặc: (12.5) -> -12.5
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

  // Đảo ngược để ngày mới nhất lên đầu (cho dễ xem)
  return { headers, rows: data.reverse() }; 
}

async function run() {
  console.log("🚀 [BOT] Starting Scraper (Full History Source)...");
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
      console.error(`   ❌ Failed: Could not fetch HTML.`);
      finalData[target.type] = { error: true, headers: [], rows: [] };
    }
  }

  const outputPath = path.join(__dirname, '../public/etf_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Data saved to: public/etf_data.json`);
}

run();
