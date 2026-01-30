import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const targetUrl = 'https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price';
    
    // DANH SÁCH PROXY LUÂN PHIÊN (Để né chặn IP)
    const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    ];

    let items: any[] = [];
    let success = false;

    // Vòng lặp thử từng Proxy
    for (const url of proxies) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                next: { revalidate: 0 }
            });
            if (res.ok) {
                const text = await res.text();
                // Lọc rác do Proxy chèn vào (nếu có)
                const cleanText = text.substring(text.indexOf('[')); 
                const json = JSON.parse(cleanText);
                
                if (Array.isArray(json)) { items = json; success = true; break; }
                if (json.data && Array.isArray(json.data)) { items = json.data; success = true; break; }
            }
        } catch (e) { continue; }
    }

    if (!success) {
        return NextResponse.json([{ name: 'Lỗi: Server chặn kết nối', buy: 0, sell: 0, type: 'ERROR' }]);
    }

    const processedData = [];

    // 1. Chỉ lấy VÀNG & BẠC thương hiệu PHÚ QUÝ
    items.forEach((item: any) => {
        const name = item.name ? item.name.toUpperCase() : '';
        // Lọc kỹ: Phải có chữ PQ hoặc ID là V/B
        if (item.id === 'B' || item.id === 'V' || name.includes('VÀNG PQ') || name.includes('BẠC PQ')) {
            // Giá gốc đơn vị là "Chỉ" -> Nhân 10 để ra "Lượng" (1 cây) cho chuyên nghiệp
            // Hoặc dùng priceBuyTael nếu có
            let buy = item.priceBuyTael || (item.buyprice * 10);
            let sell = item.priceSellTael || (item.sellprice * 10);

            processedData.push({
                name: name.includes('BẠC') ? 'Bạc Phú Quý (Sẻ)' : 'Vàng Phú Quý (Sẻ)',
                unit: 'VND / Lượng',
                buy: buy,
                sell: sell,
                change: item.priceChangePercent || 0,
                type: name.includes('BẠC') ? 'SILVER' : 'GOLD'
            });
        }
    });

    return NextResponse.json(processedData);

  } catch (error: any) {
    return NextResponse.json([{ name: `System Error: ${error.message}`, buy: 0, sell: 0, type: 'ERROR' }]);
  }
}
