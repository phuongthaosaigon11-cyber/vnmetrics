import { NextResponse } from 'next/server';

// --- QUAN TRỌNG: BẮT BUỘC ĐỂ CHẠY TRÊN CLOUDFLARE ---
export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'binance' hoặc 'coinglass'

  // Header giả lập trình duyệt (Dùng chung)
  const BASE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "client-type": "web"
  };

  try {
    let targetUrl = '';
    const fetchOptions = {
      headers: { ...BASE_HEADERS },
      next: { revalidate: 60 } // Cache 60 giây
    };

    // --- CASE 1: LẤY CHART TỪ BINANCE ---
    if (type === 'binance') {
      const symbol = searchParams.get('symbol');
      const interval = searchParams.get('interval') || '1d';
      const limit = searchParams.get('limit') || '100';

      if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

      targetUrl = `https://api.binance.com/api/v3/uiKlines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      // Fake Referer của Binance
      fetchOptions.headers['Referer'] = 'https://www.binance.com/en/trade';
      fetchOptions.headers['Origin'] = 'https://www.binance.com';
    }

    // --- CASE 2: LẤY ETF TỪ COINGLASS ---
    else if (type === 'coinglass') {
      targetUrl = 'https://capi.coinglass.com/api/etf/flow';
      
      // Fake Referer của CoinGlass
      fetchOptions.headers['Referer'] = 'https://www.coinglass.com/';
      fetchOptions.headers['Origin'] = 'https://www.coinglass.com';
      fetchOptions.next.revalidate = 300; // Cache 5 phút cho ETF
    }

    // --- TRƯỜNG HỢP KHÔNG HỢP LỆ ---
    else {
      return NextResponse.json({ error: 'Invalid type. Use ?type=binance or ?type=coinglass' }, { status: 400 });
    }

    // --- GỌI DỮ LIỆU ---
    const res = await fetch(targetUrl, fetchOptions);

    if (!res.ok) {
      throw new Error(`API Error [${type}]: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Proxy Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}