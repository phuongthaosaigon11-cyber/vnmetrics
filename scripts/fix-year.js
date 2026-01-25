const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/etf_data.json');

try {
    if (!fs.existsSync(filePath)) {
        console.error("❌ Không tìm thấy file dữ liệu!");
        process.exit(1);
    }

    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let count = 0;

    // Hàm sửa lỗi năm
    const fixRows = (rows) => {
        if (!rows) return [];
        return rows.map(row => {
            if (row.Date && row.Date.includes('2027')) {
                row.Date = row.Date.replace('2027', '2026'); // Sửa 2027 -> 2026
                count++;
            }
            return row;
        });
    };

    // Quét và sửa cả BTC và ETH
    if (data.BTC) data.BTC.rows = fixRows(data.BTC.rows);
    if (data.ETH) data.ETH.rows = fixRows(data.ETH.rows);
    if (data.SOL) data.SOL.rows = fixRows(data.SOL.rows);

    // Lưu lại file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Đã sửa thành công ${count} dòng dữ liệu bị sai năm 2027 về 2026.`);

} catch (e) {
    console.error("❌ Lỗi:", e.message);
}
