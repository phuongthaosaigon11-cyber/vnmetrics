const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeFarside() {
  console.log('🚀 [START] Bắt đầu chiến dịch lấy dữ liệu ETF (V3 - Smart Table Search)...');
  
  let flowData = { _date: "Updating...", status: "init" };
  let html = '';

  // 1. KẾT NỐI (Giữ nguyên logic Proxy Fallback)
  const sources = [
    {
      name: "Direct (Fake Browser)",
      url: "https://farside.co.uk/btc/",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    },
    {
      name: "Proxy 1 (CorsProxy)",
      url: "https://corsproxy.io/?https://farside.co.uk/btc/",
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }
  ];

  for (const source of sources) {
    try {
      console.log(`📡 Đang thử kết nối: ${source.name}...`);
      const res = await axios.get(source.url, { headers: source.headers, timeout: 15000 });
      if (res.status === 200 && res.data.length > 1000) {
        html = res.data;
        console.log(`✅ Kết nối THÀNH CÔNG!`);
        break;
      }
    } catch (e) {
      console.warn(`⚠️ Thất bại (${source.name}): ${e.message}`);
    }
  }

  if (!html) {
    console.error("❌ Không lấy được HTML. Giữ nguyên data cũ.");
    process.exit(0);
  }

  // 2. PHÂN TÍCH DỮ LIỆU (Logic mới: Tìm đúng bảng chứa IBIT)
  try {
    const $ = cheerio.load(html);
    const tables = $('table');
    let targetTable = null;

    console.log(`ℹ️ Tìm thấy tổng cộng ${tables.length} bảng.`);

    // Duyệt qua tất cả bảng để tìm bảng ĐÚNG (chứa keyword IBIT và FBTC)
    tables.each((i, tbl) => {
        const text = $(tbl).text().toUpperCase();
        if (text.includes('IBIT') && text.includes('FBTC')) {
            console.log(`✅ Đã tìm thấy Bảng dữ liệu mục tiêu (Bảng số ${i + 1})`);
            targetTable = $(tbl);
            return false; // Break loop
        }
    });
    
    if (!targetTable) throw new Error("Không tìm thấy bảng chứa dữ liệu IBIT/FBTC");

    // A. Xác định vị trí các cột (Map Headers) từ bảng tìm được
    const headerMap = {}; 
    const rows = targetTable.find('tr');
    let headerRowIndex = -1;

    // Tìm dòng Header (chứa chữ IBIT)
    rows.each((i, row) => {
        const rowText = $(row).text().toUpperCase();
        if (rowText.includes('IBIT') && rowText.includes('FBTC')) {
            headerRowIndex = i;
            $(row).find('td, th').each((idx, el) => {
                const txt = $(el).text().trim().toUpperCase();
                if (txt) headerMap[txt] = idx;
            });
            return false; 
        }
    });
    
    console.log("ℹ️ Header Map:", JSON.stringify(headerMap));

    // B. Tìm dòng dữ liệu NGÀY MỚI NHẤT (Quét từ dưới lên)
    let lastRowDetails = null;
    let dataDate = '';

    for (let i = rows.length - 1; i > headerRowIndex; i--) {
        const tds = $(rows[i]).find('td');
        const firstColText = $(tds[0]).text().trim();

        // Bỏ qua các dòng tổng kết
        const ignoreList = ['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE', 'NOTE'];
        if (ignoreList.some(kw => firstColText.toUpperCase().includes(kw))) continue;

        // Regex tìm ngày tháng: "24 Jan 2026" hoặc "24 Jan"
        const dateRegex = /^\d{1,2}\s+[A-Za-z]{3}/;
        
        if (dateRegex.test(firstColText)) {
            lastRowDetails = tds;
            dataDate = firstColText;
            console.log(`📅 Đã chốt dòng dữ liệu ngày: "${dataDate}" (Dòng số ${i})`);
            break; 
        }
    }

    if (lastRowDetails) {
        flowData = { _date: dataDate, status: "success" };
        const targets = ['IBIT', 'FBTC', 'BITB', 'ARKB', 'BTCO', 'EZBC', 'BRRR', 'HODL', 'BTCW', 'GBTC'];

        targets.forEach(symbol => {
            const colIndex = headerMap[symbol];
            if (colIndex !== undefined) {
                const cellText = $(lastRowDetails[colIndex]).text().trim().replace(/,/g, '');
                let val = 0;
                if (cellText.includes('(') || cellText.includes(')')) {
                    val = -Math.abs(parseFloat(cellText.replace(/[()]/g, '')));
                } else {
                    val = parseFloat(cellText);
                }
                flowData[symbol] = isNaN(val) ? 0 : val;
            } else {
                flowData[symbol] = 0;
            }
        });
        
        console.log("📊 Dữ liệu Parse được:", JSON.stringify(flowData));
    } else {
        console.error("❌ Không tìm thấy dòng ngày tháng nào hợp lệ trong bảng mục tiêu.");
    }

  } catch (err) {
    console.error("❌ Lỗi Parse HTML:", err.message);
  }

  // 3. LƯU FILE
  try {
      const publicDir = path.join(__dirname, '../public');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      const outputPath = path.join(publicDir, 'etf_data.json');
      fs.writeFileSync(outputPath, JSON.stringify(flowData, null, 2));
      console.log(`💾 Đã lưu file: ${outputPath}`);
  } catch (e) { console.error('❌ Lỗi ghi file:', e.message); }
}

scrapeFarside();
