const fs = require('fs');
const path = require('path');

// DỮ LIỆU SOLANA (Copy từ bạn gửi)
const solRawText = `
06 Jan 20260.0 0.5 7.7 0.0 0.0 1.0 9.2
07 Jan 20262.0 0.0 0.0 0.0 0.0 0.0 2.0
08 Jan 20267.8 0.0 1.2 0.0 0.0 4.6 13.6
09 Jan 20260.0 0.0 0.0 0.0 0.0 0.0 0.0
12 Jan 20268.6 0.5 1.7 0.0 0.0 0.0 10.8
13 Jan 20260.0 0.0 5.9 0.0 0.0 0.0 5.9
14 Jan 202620.9 0.0 1.7 0.0 0.0 1.0 23.6
15 Jan 20262.8 0.0 1.2 0.0 0.0 4.9 8.9
16 Jan 20260.0 0.0 0.4 (0.7) 0.0 (1.9) (2.2)
20 Jan 20260.0 0.0 2.3 (0.5) 1.1 0.0 2.9
21 Jan 20260.0 1.3 1.2 0.0 0.0 0.5 3.0
22 Jan 20261.7 0.0 0.0 0.0 0.0 0.0 1.7
23 Jan 20260.0 0.0 1.9 0.0 0.0 0.0 1.9
`;

function parseSolData(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const rows = [];
    // Định nghĩa cột theo thứ tự trong file của bạn
    const headers = ["Date", "BSOL", "VSOL", "FSOL", "TSOL", "SOEZ", "GSOL", "Total"];

    for (const line of lines) {
        // Xử lý lỗi dính chữ: "20260.0" -> "2026 0.0"
        let cleanLine = line.replace(/(\d{4})([-\d\(])/, '$1 $2');
        
        // Regex tìm ngày tháng
        const dateMatch = cleanLine.match(/^(\d{2}\s+[A-Za-z]{3}\s+\d{4})/);
        if (!dateMatch) continue;

        const dateStr = dateMatch[1];
        let remaining = cleanLine.replace(dateStr, '').trim();
        const parts = remaining.split(/[\t\s]+/);

        // Đảm bảo đủ cột dữ liệu
        if (parts.length < 7) continue;

        const row = { "Date": dateStr };
        const valueKeys = headers.slice(1);

        valueKeys.forEach((key, index) => {
            let valStr = parts[index];
            if (!valStr || valStr === '-') valStr = "0";
            valStr = valStr.replace(/,/g, '');
            
            let val = 0;
            if (valStr.includes('(') || valStr.includes(')')) {
                val = -Math.abs(parseFloat(valStr.replace(/[()]/g, '')));
            } else {
                val = parseFloat(valStr);
            }
            row[key] = isNaN(val) ? 0 : val;
        });
        rows.push(row);
    }
    // Đảo ngược để ngày mới nhất lên đầu
    return rows.reverse();
}

// 1. ĐỌC FILE HIỆN TẠI
const filePath = path.join(__dirname, '../public/etf_data.json');
let currentData = {};

try {
    if (fs.existsSync(filePath)) {
        currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log("✅ Đã đọc dữ liệu hiện tại (BTC & ETH).");
    } else {
        console.warn("⚠️ Không tìm thấy file dữ liệu, sẽ tạo mới.");
    }
} catch (e) {
    console.error("❌ Lỗi đọc file:", e.message);
    process.exit(1);
}

// 2. CẬP NHẬT SOL
const solRows = parseSolData(solRawText);

currentData.SOL = {
    headers: ["Date", "BSOL", "VSOL", "FSOL", "TSOL", "SOEZ", "GSOL", "Total"],
    rows: solRows
};
currentData.last_updated = new Date().toISOString();

// 3. LƯU FILE
fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
console.log(`🎉 Đã cập nhật thành công SOL (${solRows.length} dòng) vào file chung!`);
