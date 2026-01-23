import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Gọi sang CoinGlass (Dữ liệu thật)
    const response = await fetch('https://capi.coinglass.com/api/etf/flow', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.coinglass.com/',
        'Origin': 'https://www.coinglass.com'
      },
      next: { revalidate: 300 } // Cập nhật mỗi 5 phút
    });

    if (!response.ok) {
      throw new Error(`CoinGlass API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Trả về dữ liệu sạch cho Frontend
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}