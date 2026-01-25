const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Danh sách các nguồn dữ liệu cần lấy
const TARGETS = [
  { type: 'BTC', url: 'https://farside.co.uk/btc/' },
  { type: 'ETH', url: 'https://farside.co.uk/eth-etf-flow-all-data/' },
  { type: 'SOL', url: 'https://farside.co.uk/solana-etf-flow-all-data/' }
];

async function fetchHtml(url) {
  const proxies = [
    { name: "Direct", url: url },
    { name: "AllOrigins", url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, isJson: true }
  ];

  for (const proxy of proxies) {
    try {
      console.log(`   📡 Đang tải qua ${proxy.name}...`);
      const res = await axios.get(proxy.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 20000
      });
      
      let html = proxy.isJson ? res.data.contents : res.data;
      if (html && html.length > 2000) return html;
    } catch (e) {
      console.warn(`   ⚠️ Lỗi ${proxy.name}`);
    }
  }
  return null;
}

function parseTable(html) {
  const $ = cheerio.load(html);
  const data = [];
  const headers = [];

  // Tìm bảng chứa từ khóa IBIT, ETHA hoặc SOL
  let table = null;
  $('table').each((i, tbl) => {
    const text = $(tbl).text().toUpperCase();
    if (text.includes('IBIT') || text.includes('ETHA') || text.includes('SOL')) {
      table = $(tbl);
      return false;
    }
  });

  if (!table) return null;

  const rows = table.find('tr');
  let headerIndex = -1;

  // Tìm dòng tiêu đề
  rows.each((i, row) => {
    const rowText = $(row).text().trim(); 
    // Dòng tiêu đề không phải là ngày tháng và có nhiều cột
    if (!/^\d{1,2}\s+[A-Za-z]{3}/.test(rowText) && $(row).find('td, th').length > 3) {
       headerIndex = i;
    }
  });

  if (headerIndex === -1) return null;

  // Lấy tên cột
  $(rows[headerIndex]).find('td, th').each((i, el) => {
    let name = $(el).text().trim().replace(/\n/g, '');
    if (!name) name = `Col_${i}`;
    headers.push(name);
  });

  // Lấy dữ liệu các dòng
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const cells = $(rows[i]).find('td');
    const firstCol = $(cells[0]).text().trim();
    
    if (['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE'].some(k => firstCol.toUpperCase().includes(k))) continue;
    
    // Nếu cột đầu là ngày tháng
    if (/^\d{1,2}\s+[A-Za-z]{3}/.test(firstCol)) {
      const rowObj = {};
      cells.each((idx, cell) => {
        const key = headers[idx] || `Col_${idx}`;
        let valText = $(cell).text().trim().replace(/,/g, '');
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
  // Đảo ngược để ngày mới nhất lên đầu
  return { headers, rows: data.reverse() };
}

async function run() {
  console.log("🚀 [BOT] Bắt đầu lấy toàn bộ dữ liệu (Full History)...");
  const finalData = { last_updated: new Date().toISOString() };

  for (const target of TARGETS) {
    console.log(`\n🔍 Đang xử lý: ${target.type}`);
    const html = await fetchHtml(target.url);
    if (!html) {
      finalData[target.type] = { error: true, headers:[], rows: [] };
      continue;
    }
    const result = parseTable(html);
    if (result) {
      console.log(`✅ ${target.type}: Lấy thành công ${result.rows.length} dòng.`);
      finalData[target.type] = result;
    } else {
      finalData[target.type] = { headers: [], rows: [] };
    }
  }

  const outputPath = path.join(__dirname, '../public/etf_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Đã lưu file chuẩn mới: public/etf_data.json`);
}

run();
