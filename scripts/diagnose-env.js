const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function runDiagnosis() {
    console.log("🔍 --- BẮT ĐẦU CHẨN ĐOÁN HỆ THỐNG GITHUB ACTIONS ---");

    // 1. KIỂM TRA MÔI TRƯỜNG NODE
    console.log(`📦 Node Version: ${process.version}`);
    console.log(`📂 Thư mục hiện tại: ${process.cwd()}`);

    // 2. KIỂM TRA QUYỀN GHI FILE (Ổ CỨNG)
    console.log("\n🛠 [TEST 1] Kiểm tra quyền ghi file...");
    try {
        const publicDir = path.join(__dirname, '../public');
        if (!fs.existsSync(publicDir)) {
            console.log("   - Thư mục public chưa có -> Đang tạo...");
            fs.mkdirSync(publicDir, { recursive: true });
        }
        const testPath = path.join(publicDir, 'write_test.txt');
        fs.writeFileSync(testPath, 'Hello Write Test');
        console.log("✅ Ghi file thành công!");
        fs.unlinkSync(testPath); // Xóa sau khi test
    } catch (e) {
        console.error("❌ LỖI GHI FILE:", e.message);
        // Không exit để test tiếp các phần khác
    }

    // 3. KIỂM TRA KẾT NỐI MẠNG (INTERNET)
    console.log("\n🌐 [TEST 2] Kiểm tra Internet (Google)...");
    try {
        await axios.get('https://google.com', { timeout: 5000 });
        console.log("✅ Internet OK.");
    } catch (e) {
        console.error("❌ MẤT KẾT NỐI INTERNET:", e.message);
    }

    // 4. KIỂM TRA KẾT NỐI FARSIDE (DIRECT)
    console.log("\n📡 [TEST 3] Kiểm tra Farside (Trực tiếp)...");
    try {
        const res = await axios.get('https://farside.co.uk/btc/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        console.log(`ℹ️ Status: ${res.status}`);
        console.log(res.status === 200 ? "✅ Kết nối trực tiếp OK!" : "⚠️ Kết nối được nhưng Status lạ.");
    } catch (e) {
        console.warn(`⚠️ Lỗi kết nối trực tiếp: ${e.message}`);
        if (e.response) console.warn(`   Status Code: ${e.response.status} (Khả năng cao là 403 Forbidden)`);
    }

    // 5. KIỂM TRA KẾT NỐI QUA PROXY (QUAN TRỌNG NHẤT)
    console.log("\n🛡 [TEST 4] Kiểm tra Proxy (CorsProxy.io)...");
    try {
        const res = await axios.get('https://corsproxy.io/?https://farside.co.uk/btc/', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        console.log(`ℹ️ Proxy Status: ${res.status}`);
        if (res.data && typeof res.data === 'string' && res.data.includes('<table')) {
             console.log("✅ Proxy hoạt động tốt! (Tìm thấy thẻ <table>)");
        } else {
             console.log("⚠️ Proxy trả về data, nhưng không thấy thẻ <table>. Có thể bị Cloudflare chặn.");
             console.log("   Data mẫu (100 ký tự):", res.data.substring(0, 100));
        }
    } catch (e) {
        console.error("❌ Lỗi Proxy:", e.message);
    }

    console.log("\n🏁 KẾT THÚC CHẨN ĐOÁN (Exit Code 0)");
}

runDiagnosis();
