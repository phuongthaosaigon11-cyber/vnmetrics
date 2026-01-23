import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Gọi trực tiếp sang Coinglass từ Server (Phần này trình duyệt không chặn được)
    const response = await fetch('https://capi.coinglass.com/api/etf/flow', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.coinglass.com/',
      },
      // Cache dữ liệu trong 1 giờ (3600 giây) để website chạy nhanh và không bị Coinglass khóa IP
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Coinglass' }, { status: response.status });
    }

    const data = await response.json();

    // 2. Trả dữ liệu sạch về cho Frontend của bạn
    return NextResponse.json(data);

  } catch (error) {
    console.error('ETF Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}