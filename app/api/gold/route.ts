import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio'; // Cần cài thêm thư viện này nếu chưa có, nhưng ta dùng regex cho nhẹ

export const dynamic = 'force-dynamic'; // Chuyển sang Node.js runtime để ổn định hơn Edge

export async function GET() {
  try {
    const data = await getPhuQuyData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Gold API Final Error:", error);
    return NextResponse.json([
        { name: `Lỗi: ${error.message}`, buy: 0, sell: 0, change: 0, type: 'ERROR' }
    ]);
  }
}

async function getPhuQuyData() {
    const result = [];

    // 1. LẤY GIÁ THẾ GIỚI (Binance) - Luôn ổn định
    try {
        const worldRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', { next: { revalidate: 30 } });
        const worldJson = await worldRes.json();
        if (worldJson.price) {
            result.push({
                name: 'Vàng Thế Giới (PAXG)',
                buy: parseFloat(worldJson.price),
                sell: parseFloat(worldJson.price),
                change: 0,
                type: 'WORLD'
            });
        }
    } catch (e) {}

    // 2. THỬ GỌI API PHÚ QUÝ (Cách 1)
    try {
        console.log("Fetching Phu Quy API...");
        const res = await fetch('https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://phuquy.com.vn/',
                'Origin': 'https://phuquy.com.vn',
                'Host': 'be.phuquy.com.vn'
            },
            next: { revalidate: 0 }
        });

        if (res.ok) {
            const json = await res.json();
            const items = Array.isArray(json) ? json : (json.data || []);
            
            if (items.length > 0) {
                items.forEach((item: any) => {
                    if (item.id === 'B' || item.id === 'V' || (item.name && item.name.includes('SJC'))) {
                        result.push({
                            name: item.name.trim(),
                            buy: item.priceBuyTael || (item.buyprice * 10) || 0,
                            sell: item.priceSellTael || (item.sellprice * 10) || 0,
                            change: item.priceChangePercent || 0,
                            type: (item.id === 'B' || item.name.includes('Bạc')) ? 'SILVER' : 'GOLD'
                        });
                    }
                });
                console.log("Success with Phu Quy API");
                return result; // Nếu thành công thì trả về luôn
            }
        }
    } catch (e) {
        console.error("Phu Quy API failed, switching to Fallback...", e);
    }

    // 3. FALLBACK: CÀO TỪ WEBGIA (Cách 2 - Nếu API trên bị chặn)
    // Trang này HTML tĩnh, dễ lấy hơn nhiều
    try {
        console.log("Fetching WebGia Fallback...");
        const res = await fetch('https://webgia.com/gia-vang/phu-quy/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
            next: { revalidate: 0 }
        });
        
        const html = await res.text();
        
        // Regex bóc tách dữ liệu từ HTML của WebGia
        // Cấu trúc thường là: <td...SJC...</td><td>4.100.000</td>...
        
        // Vàng SJC
        const sjcBuy = extractPrice(html, 'SJC', 1);
        const sjcSell = extractPrice(html, 'SJC', 2);
        if (sjcBuy > 0) {
            result.push({ name: 'SJC (WebGia)', buy: sjcBuy * 1000000, sell: sjcSell * 1000000, change: 0, type: 'GOLD' });
        }

        // Vàng Nhẫn (PNJ/Phú Quý)
        const ringBuy = extractPrice(html, 'Nhẫn', 1);
        const ringSell = extractPrice(html, 'Nhẫn', 2);
        if (ringBuy > 0) {
            result.push({ name: 'Vàng Nhẫn Tròn', buy: ringBuy * 1000000, sell: ringSell * 1000000, change: 0, type: 'GOLD' });
        }
        
        // Vàng Thần Tài 
        const thanTaiBuy = extractPrice(html, 'Thần Tài', 1);
        const thanTaiSell = extractPrice(html, 'Thần Tài', 2);
        if (thanTaiBuy > 0) {
            result.push({ name: 'Vàng Thần Tài', buy: thanTaiBuy * 1000000, sell: thanTaiSell * 1000000, change: 0, type: 'GOLD' });
        }

    } catch (e) {
        console.error("WebGia Fallback failed", e);
    }

    if (result.length === 0) {
        throw new Error("Tất cả nguồn dữ liệu đều bị chặn IP.");
    }

    return result;
}

// Hàm hỗ trợ Regex lấy giá từ HTML
function extractPrice(html: string, keyword: string, position: number) {
    // Tìm keyword, sau đó tìm các con số trong thẻ td tiếp theo
    // Pattern đơn giản hóa để chạy nhanh
    try {
        const regex = new RegExp(`${keyword}[\\s\\S]*?<td>([0-9,.]+)</td>[\\s\\S]*?<td>([0-9,.]+)</td>`, 'i');
        const match = html.match(regex);
        if (match && match[position]) {
            return parseFloat(match[position].replace(/[.,]/g, '').replace(' ', '')) / 1000; // WebGia thường để dạng 80,000 (nghìn đồng) -> chia bớt hoặc nhân tùy nguồn
            // WebGia: 85.000 -> parse ra 85000. Đơn vị triệu/lượng -> nhân 1.000.000 ở trên là đúng.
            // Tuy nhiên hàm parse trên xóa hết dấu , . nên 85,000 -> 85000.
            // Logic chuẩn: WebGia hiện "85,000" (nghìn/lượng) -> 85.000.000
        }
    } catch(e) {}
    return 0;
}
