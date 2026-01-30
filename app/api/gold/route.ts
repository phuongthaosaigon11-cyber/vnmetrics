import { NextResponse } from 'next/server';

// BẮT BUỘC PHẢI LÀ EDGE ĐỂ CHẠY TRÊN CLOUDFLARE
export const runtime = 'edge';

export async function GET() {
  const result: any[] = [];

  try {
    // --- 1. LẤY GIÁ THẾ GIỚI (Binance - Luôn ổn định) ---
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

    // --- 2. LẤY GIÁ PHÚ QUÝ (Dùng Proxy để né chặn IP) ---
    // Đây là cách tốt nhất: Gọi API gốc nhưng đi qua Proxy
    let hasPhuQuyData = false;
    try {
        const targetUrl = 'https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price';
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        
        const res = await fetch(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            next: { revalidate: 0 }
        });

        if (res.ok) {
            const json = await res.json();
            const items = Array.isArray(json) ? json : (json.data || []);
            
            if (items.length > 0) {
                items.forEach((item: any) => {
                    if (item.id === 'B' || item.id === 'V' || (item.name && item.name.includes('SJC'))) {
                        // Logic giá: API trả về đơn vị Chỉ (ví dụ 413,300).
                        // Nếu có priceBuyTael thì dùng, ko thì nhân 10.
                        let buy = item.priceBuyTael || (item.buyprice ? item.buyprice * 10 : 0);
                        let sell = item.priceSellTael || (item.sellprice ? item.sellprice * 10 : 0);

                        result.push({
                            name: item.name.trim(),
                            buy: buy,
                            sell: sell,
                            change: item.priceChangePercent || 0,
                            type: (item.id === 'B' || item.name.includes('Bạc')) ? 'SILVER' : 'GOLD'
                        });
                    }
                });
                if (result.length > 1) hasPhuQuyData = true;
            }
        }
    } catch (e) {
        console.error("Phu Quy API (Proxy) failed:", e);
    }

    // --- 3. FALLBACK: CÀO TỪ WEBGIA (Nếu cách 2 thất bại) ---
    // Sử dụng Regex vì Edge Runtime không hỗ trợ Cheerio
    if (!hasPhuQuyData) {
        try {
            const webGiaUrl = `https://corsproxy.io/?${encodeURIComponent('https://webgia.com/gia-vang/phu-quy/')}`;
            const res = await fetch(webGiaUrl, { next: { revalidate: 0 } });
            const html = await res.text();

            // Hàm regex đơn giản để tìm giá trong HTML
            const extract = (key: string) => {
                // Tìm pattern: Key...<td>Mua</td><td>Bán</td>
                // Pattern WebGia: <td>85,000</td> (nghìn/lượng) -> nhân 1 triệu
                const regex = new RegExp(`${key}[\\s\\S]*?<td>([0-9,.]+)</td>[\\s\\S]*?<td>([0-9,.]+)</td>`, 'i');
                const match = html.match(regex);
                if (match) {
                    const buy = parseFloat(match[1].replace(/[,.]/g, '')) * 1000; // 85,000 -> 85000 * 1000 = 85tr
                    const sell = parseFloat(match[2].replace(/[,.]/g, '')) * 1000;
                    return { buy, sell };
                }
                return null;
            };

            const sjc = extract('SJC');
            if (sjc) result.push({ name: 'SJC (WebGia)', buy: sjc.buy, sell: sjc.sell, change: 0, type: 'GOLD' });

            const nhan = extract('Nhẫn');
            if (nhan) result.push({ name: 'Vàng Nhẫn (WebGia)', buy: nhan.buy, sell: nhan.sell, change: 0, type: 'GOLD' });
            
            const thanTai = extract('Thần Tài');
            if (thanTai) result.push({ name: 'Vàng Thần Tài', buy: thanTai.buy, sell: thanTai.sell, change: 0, type: 'GOLD' });

        } catch (e) {
            console.error("Fallback WebGia failed:", e);
        }
    }

    // NẾU TẤT CẢ ĐỀU CHẾT -> TRẢ VỀ LỖI ĐỂ UI BIẾT
    if (result.length === 0) {
         return NextResponse.json([
            { name: 'Lỗi: Tất cả nguồn dữ liệu bị chặn', buy: 0, sell: 0, change: 0, type: 'ERROR' }
        ]);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json([
        { name: `System Error: ${error.message}`, buy: 0, sell: 0, change: 0, type: 'ERROR' }
    ]);
  }
}
