// scripts/scrape-etf.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeFarside() {
  console.log('🚀 [START] Bắt đầu cào dữ liệu ETF...');
  
  // Data mặc định (nếu lỗi thì dùng cái này đỡ)
  let flowData = { _date: "Updating...", status: "init" };

  try {
    // 1. Kết nối
    const url = 'https://farside.co.uk/btc/';
    console.log(`📡 Đang kết nối: ${url}`);
    
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000 // 10s timeout
    });
    console.log(`✅ Kết nối OK. HTML length: ${html.length}`);

    // 2. Parse HTML
    const $ = cheerio.load(html);
    const table = $('table').first();
    
    if (!table.length) throw new Error("Không tìm thấy thẻ <table>");

    // 3. Lấy Header
    const headers = [];
    table.find('tr').first().find('td, th').each((i, el) => headers.push($(el).text().trim()));
    
    // 4. Tìm dòng dữ liệu
    const rows = table.find('tr');
    let lastRowDetails = null;
    let dataDate = '';

    for (let i = rows.length - 1; i >= 0; i--) {
        const tds = $(rows[i]).find('td');
        const firstCol = $(tds[0]).text().trim();
        // Tìm dòng có ngày tháng (VD: "24 Jan") và không phải dòng Total
        if (firstCol && tds.length > 5 && !firstCol.includes('Total') && !firstCol.includes('Day')) {
            lastRowDetails = tds;
            dataDate = firstCol;
            console.log(`📅 Đã tìm thấy dữ liệu ngày: ${dataDate}`);
            break;
        }
    }

    if (!lastRowDetails) throw new Error("Không tìm thấy dòng dữ liệu ngày nào.");

    // 5. Map dữ liệu
    flowData = { _date: dataDate, status: "success" };
    
    headers.forEach((h, index) => {
        // Map tên cột Farside -> Symbol của mình
        let symbol = null;
        if (h.includes('IBIT')) symbol = 'IBIT';
        else if (h.includes('FBTC')) symbol = 'FBTC';
        else if (h.includes('BITB')) symbol = 'BITB';
        else if (h.includes('ARKB')) symbol = 'ARKB';
        else if (h.includes('BTCO')) symbol = 'BTCO';
        else if (h.includes('EZBC')) symbol = 'EZBC';
        else if (h.includes('BRRR')) symbol = 'BRRR';
        else if (h.includes('HODL')) symbol = 'HODL';
        else if (h.includes('BTCW')) symbol = 'BTCW';
        else if (h.includes('GBTC')) symbol = 'GBTC';

        if (symbol) {
            const cellText = $(lastRowDetails[index]).text().trim().replace(/,/g, '');
            let val = parseFloat(cellText);
            // Xử lý số âm (12.5) -> -12.5
            if (cellText.includes('(') || cellText.includes(')')) {
                val = -Math.abs(parseFloat(cellText.replace(/[()]/g, '')));
            }
            flowData[symbol] = isNaN(val) ? 0 : val;
        }
    });

    console.log('✅ Dữ liệu Parse được:', JSON.stringify(flowData));

  } catch (error) {
    console.error('❌ LỖI:', error.message);
    flowData.status = "error";
    flowData.error = error.message;
  }

  // 6. Lưu file (Luôn chạy dù lỗi)
  try {
      const publicDir = path.join(__dirname, '../public');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      
      const outputPath = path.join(publicDir, 'etf_data.json');
      fs.writeFileSync(outputPath, JSON.stringify(flowData, null, 2));
      console.log(`💾 Đã lưu file: public/etf_data.json`);
  } catch (e) {
      console.error('❌ Lỗi ghi file:', e.message);
  }
}

scrapeFarside();