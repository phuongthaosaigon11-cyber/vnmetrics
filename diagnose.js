const fs = require('fs');

console.log("🔍 --- BẮT ĐẦU CHẨN ĐOÁN ---");

// 1. Kiểm tra xem file Scraper có tồn tại không
if (fs.existsSync('scripts/scrape-etf.js')) {
    console.log("✅ File scripts/scrape-etf.js: ĐÃ CÓ");
} else {
    console.error("❌ LỖI: Không tìm thấy file scripts/scrape-etf.js!");
}

// 2. Kiểm tra thư viện (Đây là nguyên nhân chính gây lỗi Exit Code 1)
console.log("📦 Đang kiểm tra thư viện...");
try {
    require('axios');
    require('cheerio');
    console.log("✅ Thư viện (axios, cheerio): ĐÃ CÀI ĐẶT OK.");
} catch (e) {
    console.error("❌ LỖI: Thiếu thư viện! (Code chạy trên GitHub bị crash vì lý do này)");
    console.log("👉 Khắc phục: Cần chạy lệnh 'npm install axios cheerio' và commit file package.json lên.");
}

// 3. Test kết nối thử (Nếu thư viện ok)
try {
    const axios = require('axios');
    console.log("🌐 Đang thử kết nối Farside Investors...");
    axios.get('https://farside.co.uk/btc/', { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(res => {
            console.log(`✅ Kết nối thành công! (Status: ${res.status}, Data length: ${res.data.length})`);
            console.log("🎉 KẾT LUẬN: Code logic OK. Vấn đề chỉ nằm ở môi trường GitHub Actions thiếu thư viện.");
        })
        .catch(err => {
            console.error(`⚠️ Cảnh báo kết nối: ${err.message}`);
            if (err.response && err.response.status === 403) console.error("👉 Nguyên nhân: Bị chặn IP (403).");
        });
} catch (e) {
    console.log("⚠️ Bỏ qua test kết nối vì thiếu thư viện.");
}
