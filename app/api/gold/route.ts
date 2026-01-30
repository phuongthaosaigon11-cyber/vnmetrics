import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const debugLog = [];
  try {
    let items: any[] = [];
    let sourceUsed = '';

    // URL API GỐC CỦA PHÚ QUÝ
    const targetUrl = 'https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price';
    
    // DANH SÁCH PROXY ĐỂ LUÂN PHIÊN (NẾU CÁI NÀY BỊ CHẶN THÌ DÙNG CÁI KHÁC)
    const proxies = [
        // Cách 1: CodeTabs Proxy (Thường xuyên xuyên qua được tường lửa VN)
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        // Cách 2: AllOrigins (IP khác, dùng làm dự phòng)
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        // Cách 3: CorsProxy (Cũ, hay bị chặn nhưng vẫn giữ để vét)
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    // Vòng lặp thử từng Proxy
    for (const url of proxies) {
        try {
            console.log(`Trying proxy: ${url.substring(0, 30)}...`);
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://phuquy.com.vn'
                },
                next: { revalidate: 0 }
            });

            if (res.ok) {
                const text = await res.text();
                // Kiểm tra xem có phải JSON không hay là HTML lỗi
                if (text.startsWith('[') || text.startsWith('{')) {
                    const json = JSON.parse(text);
                    if (Array.isArray(json)) {
                        items = json;
                    } else if (json.data && Array.isArray(json.data)) {
                        items = json.data;
                    }
                    
                    if (items.length > 0) {
                        sourceUsed = url;
                        break; // Lấy được rồi thì thoát vòng lặp ngay
                    }
                }
            }
        } catch (err) {
            debugLog.push(`Proxy failed: ${err}`);
        }
    }

    const processedData = [];

    // 1. VÀNG THẾ GIỚI (BINANCE - LUÔN SỐNG)
    try {
        const worldRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        const worldData = await worldRes.json();
        if (worldData.price) {
            processedData.push({
                name: 'Vàng Thế Giới (PAXG)',
                buy: parseFloat(worldData.price),
                sell: parseFloat(worldData.price),
                change: 0,
                type: 'WORLD'
            });
        }
    } catch (e) {}

    // 2. XỬ LÝ DỮ LIỆU PHÚ QUÝ (NẾU LẤY ĐƯỢC)
    if (items.length > 0) {
        items.forEach((item: any) => {
            // Lọc ID: B (Bạc), V (Vàng PQ), S (SJC)
            if (item.id === 'B' || item.id === 'V' || (item.name && item.name.includes('SJC'))) {
                // Logic tính giá chuẩn: Ưu tiên priceBuyTael (giá Lượng)
                let buy = item.priceBuyTael || (item.buyprice ? item.buyprice * 10 : 0);
                let sell = item.priceSellTael || (item.sellprice ? item.sellprice * 10 : 0);

                processedData.push({
                    name: item.name.trim(),
                    buy: buy,
                    sell: sell,
                    change: item.priceChangePercent || 0,
                    type: (item.id === 'B' || item.name.includes('Bạc')) ? 'SILVER' : 'GOLD'
                });
            }
        });
    } else {
        // NẾU TẤT CẢ PROXY ĐỀU THẤT BẠI -> TRẢ VỀ LỖI CỤ THỂ
        return NextResponse.json([
            { name: 'Lỗi: Server Phú Quý chặn IP Cloudflare', buy: 0, sell: 0, change: 0, type: 'ERROR' }
        ]);
    }

    return NextResponse.json(processedData);

  } catch (error: any) {
    return NextResponse.json([
        { name: `System Error: ${error.message}`, buy: 0, sell: 0, change: 0, type: 'ERROR' }
    ]);
  }
}
