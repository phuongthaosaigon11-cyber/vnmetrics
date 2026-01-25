const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Cấu hình nguồn dữ liệu
const TARGETS = [
  { type: 'BTC', url: 'https://farside.co.uk/btc/', keywords: ['IBIT', 'FBTC'] },
  { type: 'ETH', url: 'https://farside.co.uk/eth-etf-flow-all-data/', keywords: ['ETHA', 'FETH'] },
  { type: 'SOL', url: 'https://farside.co.uk/solana-etf-flow-all-data/', keywords: ['QSOL', 'SOL'] }
];

async function fetchHtml(targetUrl) {
  // DANH SÁCH PROXY (Ưu tiên AllOrigins vì nó bypass tốt nhất)
  const proxies = [
    { 
      name: "AllOrigins (JSON)", 
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, 
      isJson: true 
    },
    { 
      name: "CorsProxy", 
      url: `https://corsproxy.io/?${targetUrl}`, 
      isJson: false 
    },
    { 
      name: "Direct", 
      url: targetUrl, 
      isJson: false,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    }
  ];

  for (const p of proxies) {
    try {
      console.log(`      Trying ${p.name}...`);
      const config = p.headers ? { headers: p.headers, timeout: 15000 } : { timeout: 15000 };
      const res = await axios.get(p.url, config);
      
      let html = p.isJson ? res.data.contents : res.data;
      
      if (html && html.length > 2000) {
        return html;
      }
    } catch (e) {
      // Lỗi thì bỏ qua, thử cái tiếp theo
    }
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

  // Tìm Header
  let headerIndex = -1;
  rows.each((i, row) => {
    const txt = $(row).text().trim();
    // Header không bắt đầu bằng ngày và có > 2 cột
    if (!/^\d{1,2}\s+[A-Za-z]{3}/.test(txt) && $(row).find('td,th').length > 2) {
       headerIndex = i;
    }
  });
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
    if (['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE'].some(k => firstCol.toUpperCase().includes(k))) continue;

    // Regex nhận diện ngày (hỗ trợ nhiều định dạng)
    if (/^\d{1,2}\s+[A-Za-z]{3}/.test(firstCol) || /^\d{4}-\d{2}-\d{2}/.test(firstCol)) {
      const rowObj = {};
      cells.each((idx, cell) => {
        const key = headers[idx] || `Col_${idx}`;
        let valText = $(cell).text().trim().replace(/,/g, '');
        
        if (idx === 0) rowObj['Date'] = valText;
        else {
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

  return { headers, rows: data.reverse() }; // Mới nhất lên đầu
}

async function run() {
  console.log("🚀 [AXIOS] Bắt đầu lấy dữ liệu (Fast Mode)...");
  const finalData = { last_updated: new Date().toISOString() };

  for (const target of TARGETS) {
    console.log(`\n🔍 Xử lý: ${target.type}`);
    const html = await fetchHtml(target.url);
    
    if (html) {
      const result = parseTable(html, target.type);
      if (result && result.rows.length > 0) {
        console.log(`   ✅ Thành công! Lấy được ${result.rows.length} dòng.`);
        finalData[target.type] = result;
      } else {
        console.warn(`   ⚠️ Lấy được HTML nhưng không tìm thấy bảng dữ liệu.`);
        finalData[target.type] = { headers: [], rows: [] };
      }
    } else {
      console.error(`   ❌ Thất bại: Không kết nối được nguồn nào.`);
      finalData[target.type] = { error: true, headers: [], rows: [] };
    }
  }

  const outputPath = path.join(__dirname, '../public/etf_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Đã lưu file: public/etf_data.json`);
}

run();
