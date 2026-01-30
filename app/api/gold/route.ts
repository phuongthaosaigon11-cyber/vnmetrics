import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // URL gốc Phú Quý
    const targetUrl = 'https://be.phuquy.com.vn/jewelry/product-payment-service/api/products/get-price';
    // Dùng Proxy corsproxy.io để đánh lừa Server Phú Quý
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
        // Nếu Proxy cũng bị chặn, thử fallback sang nguồn WebGia
        throw new Error(`Proxy Error: ${response.status}`);
    }

    const json = await response.json();
    let items = [];

    // Xử lý linh hoạt dữ liệu trả về
    if (Array.isArray(json)) {
        items = json;
    } else if (json.data && Array.isArray(json.data)) {
        items = json.data;
    }

    const processedData = [];

    // 1. Lấy giá Vàng Thế Giới (Binance)
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

    // 2. Map dữ liệu Phú Quý
    if (items.length > 0) {
        items.forEach((item: any) => {
            // Lọc ID: B (Bạc), V (Vàng PQ), S (SJC)
            if (item.id === 'B' || item.id === 'V' || (item.name && item.name.toUpperCase().includes('SJC'))) {
                // Logic tính giá: Mặc định API trả về đơn vị Chỉ (1/10 lượng)
                // Ta kiểm tra kỹ xem có trường priceBuyTael (giá Lượng) không, nếu không thì lấy giá Chỉ * 10
                let buy = item.priceBuyTael || (item.buyprice ? item.buyprice * 10 : 0);
                let sell = item.priceSellTael || (item.sellprice ? item.sellprice * 10 : 0);

                processedData.push({
                    name: item.name.trim(),
                    buy: buy,
                    sell: sell,
                    change: item.priceChangePercent || 0,
                    type: (item.id === 'B' || item.name.toUpperCase().includes('BẠC')) ? 'SILVER' : 'GOLD'
                });
            }
        });
    }

    // Nếu sau khi lọc mà không có gì -> Báo lỗi
    if (processedData.length === 0) {
         return NextResponse.json([
            { name: 'Lỗi: Không đọc được dữ liệu', buy: 0, sell: 0, change: 0, type: 'ERROR' }
        ]);
    }

    return NextResponse.json(processedData);

  } catch (error: any) {
    console.error("Gold API Error:", error);
    return NextResponse.json([
        { 
            name: `Lỗi System: ${error.message}`, 
            buy: 0, 
            sell: 0, 
            change: 0, 
            type: 'ERROR' 
        }
    ]);
  }
}
