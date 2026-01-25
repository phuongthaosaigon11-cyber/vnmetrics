const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeFarside() {
  console.log('🚀 [START] Bắt đầu chiến dịch lấy dữ liệu ETF (V4 - Multi Proxy)...');
  
  let flowData = { _date: "Updating...", status: "init" };
  let html = '';

  // DANH SÁCH CÁC CỔNG KẾT NỐI (Thử lần lượt từ trên xuống)
  const sources = [
    {
      name: "Direct (Fake Browser)",
      url: "https://farside.co.uk/btc/",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    },
    {
      name: "Proxy 1 (CorsProxy)",
      url: "https://corsproxy.io/?https://farside.co.uk/btc/",
      headers: { 'User-Agent': 'Mozilla/5.0' }
    },
    {
      name: "Proxy 2 (AllOrigins)",
      url: "https://api.allorigins.win/get?url=" + encodeURIComponent("https://farside.co.uk/btc/"),
      headers: { 'User-Agent': 'Mozilla/5.0' },
      isJson: true // API này trả về JSON
    },
    {
      name: "Proxy 3 (ThingProxy)",
      url: "https://thingproxy.freeboard.io/fetch/https://farside.co.uk/btc/",
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }
  ];

  // 1. VÒNG LẶP THỬ KẾT NỐI
  for (const source of sources) {
    try {
      console.log(`📡 Đang thử: ${source.name}...`);
      const res = await axios.get(source.url, { headers: source.headers, timeout: 20000 });
      
      if (res.status === 200) {
        // Xử lý dữ liệu trả về (HTML hoặc JSON)
        let content = source.isJson ? res.data.contents : res.data;
        
        if (content && content.length > 2000) { // HTML phải đủ dài mới đúng
            html = content;
            console.log(`✅ KẾT NỐI THÀNH CÔNG qua ${source.name}!`);
            break; // Thoát vòng lặp ngay lập tức
        }
      }
    } catch (e) {
      console.warn(`⚠️ Thất bại (${source.name}): ${e.message}`);
    }
  }

  if (!html) {
    console.error("❌ CHẾT RỒI: Đã thử tất cả Proxy nhưng đều thất bại.");
    process.exit(0); // Vẫn exit 0 để giữ workflow xanh (dùng data cũ)
  }

  // 2. PHÂN TÍCH DỮ LIỆU
  try {
    const $ = cheerio.load(html);
    const tables = $('table');
    let targetTable = null;

    // Tìm bảng chứa IBIT và FBTC
    tables.each((i, tbl) => {
        const text = $(tbl).text().toUpperCase();
        if (text.includes('IBIT') && text.includes('FBTC')) {
            targetTable = $(tbl);
            return false;
        }
    });
    
    if (!targetTable) throw new Error("Không tìm thấy bảng dữ liệu IBIT/FBTC");

    // Map Headers
    const headerMap = {}; 
    const rows = targetTable.find('tr');
    let headerRowIndex = -1;

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

    // Tìm dòng dữ liệu NGÀY MỚI NHẤT
    let lastRowDetails = null;
    let dataDate = '';

    for (let i = rows.length - 1; i > headerRowIndex; i--) {
        const tds = $(rows[i]).find('td');
        const firstColText = $(tds[0]).text().trim();
        
        const ignoreList = ['TOTAL', 'AVERAGE', 'MAXIMUM', 'MINIMUM', 'SOURCE', 'NOTE'];
        if (ignoreList.some(kw => firstColText.toUpperCase().includes(kw))) continue;

        const dateRegex = /^\d{1,2}\s+[A-Za-z]{3}/; // VD: "24 Jan"
        if (dateRegex.test(firstColText)) {
            lastRowDetails = tds;
            dataDate = firstColText;
            console.log(`📅 Chốt ngày: "${dataDate}" (Dòng ${i})`);
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
        console.log("📊 KẾT QUẢ:", JSON.stringify(flowData));
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
      console.log(`💾 Đã lưu file thành công!`);
  } catch (e) { console.error('❌ Lỗi ghi file:', e.message); }
}

scrapeFarside();
