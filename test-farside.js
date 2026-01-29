const https = require('https');

console.log('🔄 Đang kết nối Farside (V2 - Smart Parser)...');

const url = 'https://farside.co.uk/bitcoin-etf-flow-all-data/';

https.get(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    // 1. Lấy tất cả các dòng bảng (tr)
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
    const cellRegex = /<td[^>]*>(.*?)<\/td>/gs;
    
    let rows = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
        rows.push(match[1]);
    }

    // 2. Logic thông minh: Tìm dòng Header để xác định vị trí cột
    // Tìm dòng chứa "Date" và "IBIT"
    let dateCol = 0, ibitCol = 1, fbtcCol = 2, totalCol = -1;
    
    // Quét 10 dòng đầu để tìm Header
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const headerCells = rows[i].split(/<\/t[dh]>/); // Split thô
        headerCells.forEach((cellRaw, index) => {
            const txt = cellRaw.replace(/<[^>]*>/g, '').trim().toUpperCase();
            if (txt.includes('DATE')) dateCol = index;
            if (txt.includes('IBIT')) ibitCol = index;
            if (txt.includes('FBTC')) fbtcCol = index;
            if (txt.includes('TOTAL') && totalCol === -1) totalCol = index;
        });
    }
    
    // Nếu không tìm thấy header Total, mặc định là cột cuối
    console.log(`ℹ️ Cấu hình cột: Date[${dateCol}], IBIT[${ibitCol}], FBTC[${fbtcCol}], Total[${totalCol}]`);

    // 3. Parse dữ liệu (Lấy 10 dòng cuối cùng - Mới nhất)
    const recentRows = rows.slice(-15).reverse();
    const data = [];

    const parseNum = (str) => {
        if (!str) return 0;
        let clean = str.replace(/<[^>]*>/g, '').trim();
        if (!clean || clean === '-') return 0;
        if (clean.includes('(')) clean = '-' + clean.replace(/[()]/g, '');
        return parseFloat(clean.replace(/,/g, '')) || 0;
    };

    console.log('\n📊 KẾT QUẢ DỮ LIỆU ETF (MỚI NHẤT):');
    console.log('-------------------------------------------------------------');
    console.log('NGÀY          | IBIT (BlackRock) | FBTC (Fidelity) | TỔNG FLOW');
    console.log('-------------------------------------------------------------');

    recentRows.forEach(rowHtml => {
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
            cells.push(cellMatch[1]);
        }

        if (cells.length > 3) {
            // Lấy text ngày và làm sạch
            const dateStr = cells[dateCol]?.replace(/<[^>]*>/g, '').trim();
            
            // Regex linh hoạt: Chấp nhận "27 Jan 2025", "Jan 27 2025", "27/01/2025"
            // Chỉ cần có số và chữ đan xen
            if (dateStr && dateStr.length > 5 && dateStr.match(/\d/)) {
                
                // Xử lý cột Total (nếu không tìm thấy header thì lấy cột cuối)
                const actualTotalCol = totalCol !== -1 ? totalCol : cells.length - 1;

                const ibit = parseNum(cells[ibitCol]);
                const fbtc = parseNum(cells[fbtcCol]);
                const total = parseNum(cells[actualTotalCol]);

                console.log(`${dateStr.padEnd(13)} | ${ibit.toString().padEnd(16)} | ${fbtc.toString().padEnd(15)} | ${total}`);
                data.push({ date: dateStr, total });
            }
        }
    });

    if (data.length === 0) {
        console.log('\n⚠️ Vẫn chưa lấy được? Hãy xem dòng dữ liệu thô đầu tiên để debug:');
        console.log(recentRows[0]);
    }
  });
}).on('error', (e) => console.error('Lỗi:', e.message));
