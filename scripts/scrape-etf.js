// scripts/scrape-etf.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeFarside() {
  console.log('🚀 Bắt đầu chạy Bot cào dữ liệu...');
  
  // Dữ liệu mặc định (Phòng trường hợp lỗi thì web vẫn có cái để hiển thị)
  let flowData = { 
    _date: new Date().toISOString(),
    status: "failed_use_default",
    IBIT: 0, FBTC: 0, BITB: 0, ARKB: 0, BTCO: 0, EZBC: 0, BRRR: 0, HODL: 0, BTCW: 0, GBTC: 0 
  };

  try {
    // BƯỚC 1: KẾT NỐI
    console.log('Step 1: Đang kết nối tới Farside Investors...');
    const url = 'https://farside.co.uk/btc/';
    
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000 // 15 giây timeout
    });
    console.log(`✅ Kết nối thành công! Độ dài HTML: ${html.length} ký tự.`);

    // BƯỚC 2: PHÂN TÍCH HTML
    console.log('Step 2: Đang phân tích HTML...');
    const $ = cheerio.load(html);
    const table = $('table').first();
    
    if (!table.length) {
      console.warn("⚠️ CẢNH BÁO: Không tìm thấy thẻ <table> nào trong HTML.");
      // Có thể in ra một phần HTML để debug nếu cần
      throw new Error("Cấu trúc trang web đã thay đổi, không tìm thấy bảng dữ liệu.");
    }

    // BƯỚC 3: XỬ LÝ HEADER
    const headers = [];
    table.find('tr').first().find('td, th').each((i, el) => {
      headers.push($(el).text().trim());
    });
    console.log('ℹ️ Headers tìm thấy:', headers.join(', '));

    // BƯỚC 4: TÌM DỮ LIỆU
    const rows = table.find('tr');
    let lastRowDetails = null;
    let dataDate = '';

    // Quét từ dưới lên để tìm ngày có dữ liệu
    console.log(`Step 3: Đang quét ${rows.length} dòng dữ liệu...`);
    for (let i = rows.length - 1; i >= 0; i--) {
        const tds = $(rows[i]).find('td');
        const firstCol = $(tds[0]).text().trim();
        
        // Bỏ qua dòng Total, Day, hoặc dòng trống
        if (firstCol && tds.length > 5 && !firstCol.includes('Total') && !firstCol.includes('Day')) {
            lastRowDetails = tds;
            dataDate = firstCol;
            console.log(`✅ Đã tìm thấy dữ liệu ngày: "${dataDate}" tại dòng ${i}`);
            break;
        }
    }

    if (!lastRowDetails) {
      throw new Error("Không tìm thấy dòng dữ liệu ngày nào hợp lệ.");
    }

    // BƯỚC 5: MAP DỮ LIỆU
    flowData = { _date: dataDate, status: "success" }; // Reset lại data chuẩn
    
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
            
            if (cellText.includes('(') || cellText.includes(')')) {
                val = -Math.abs(parseFloat(cellText.replace(/[()]/g, '')));
            }
            
            flowData[symbol] = isNaN(val) ? 0 : val;
        }
    });

    console.log('✅ Dữ liệu đã xử lý:', JSON.stringify(flowData));

  } catch (error) {
    console.error('❌ LỖI NGHIÊM TRỌNG:', error.message);
    if (error.response) {
        console.error('   - Status Code:', error.response.status);
        console.error('   - Status Text:', error.response.statusText);
    }
    console.log('⚠️ Đang sử dụng dữ liệu mặc định/rỗng để không làm crash website.');
    // Giữ nguyên flowData mặc định ở đầu hàm
  } finally {
    // BƯỚC 6: LƯU FILE (LUÔN CHẠY)
    try {
        const publicDir = path.join(__dirname, '../public');
        if (!fs.existsSync(publicDir)){
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const outputPath = path.join(publicDir, 'etf_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(flowData, null, 2));
        console.log(`💾 Đã lưu file thành công tại: ${outputPath}`);
    } catch (writeErr) {
        console.error("❌ Lỗi khi ghi file:", writeErr.message);
    }
    
    console.log("🏁 Hoàn tất quy trình (Exit Code 0)");
    process.exit(0); // Luôn thoát xanh để GitHub không báo lỗi đỏ
  }
}

scrapeFarside();