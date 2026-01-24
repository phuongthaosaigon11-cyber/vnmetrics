// scripts/scrape-etf.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeFarside() {
  console.log('⏳ Đang cào dữ liệu từ Farside Investors...');
  try {
    // 1. Lấy HTML
    const { data: html } = await axios.get('https://farside.co.uk/btc/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(html);
    const table = $('table').first();
    if (!table.length) throw new Error("Không tìm thấy bảng");

    // 2. Xác định vị trí cột (Header)
    const headers = [];
    table.find('tr').first().find('td, th').each((i, el) => {
      headers.push($(el).text().trim());
    });

    // 3. Tìm dòng dữ liệu của ngày gần nhất (Bỏ qua các dòng chú thích)
    const rows = table.find('tr');
    let lastRowDetails = null;
    let dataDate = '';

    // Quét từ dưới lên để tìm ngày có dữ liệu
    for (let i = rows.length - 1; i >= 0; i--) {
        const tds = $(rows[i]).find('td');
        const firstCol = $(tds[0]).text().trim();
        
        // Logic: Cột đầu tiên phải là ngày tháng (VD: "24 Jan") và dòng phải đủ cột
        if (firstCol && tds.length > 5 && !firstCol.includes('Total') && !firstCol.includes('Day')) {
            lastRowDetails = tds;
            dataDate = firstCol;
            console.log(`✅ Tìm thấy dữ liệu ngày: ${dataDate}`);
            break;
        }
    }

    if (!lastRowDetails) throw new Error("Không tìm thấy dòng dữ liệu hợp lệ");

    // 4. Map dữ liệu vào từng mã ETF
    const flowData = { _date: dataDate }; // Lưu thêm ngày để hiển thị
    
    headers.forEach((h, index) => {
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
            
            // Xử lý số âm trong ngoặc đơn (12.5) -> -12.5
            if (cellText.includes('(') || cellText.includes(')')) {
                val = -Math.abs(parseFloat(cellText.replace(/[()]/g, '')));
            }
            
            // Nếu ô trống hoặc lỗi thì cho bằng 0
            flowData[symbol] = isNaN(val) ? 0 : val;
        }
    });

    // 5. Lưu file JSON vào thư mục public để web đọc được
    // Đảm bảo thư mục public tồn tại
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)){
        fs.mkdirSync(publicDir);
    }

    const outputPath = path.join(publicDir, 'etf_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(flowData, null, 2));
    console.log('💾 Đã lưu: public/etf_data.json');
    console.log(flowData);

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1); // Báo lỗi để GitHub Action biết và gửi mail nếu cần
  }
}

scrapeFarside();