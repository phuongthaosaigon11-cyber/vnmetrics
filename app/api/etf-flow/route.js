import { NextResponse } from 'next/server';

// --- QUAN TRỌNG: Để chạy trên Cloudflare Pages ---
export const runtime = 'edge';

// --- BỘ HEADERS MỚI (CHUYÊN CHO MARKET DATA) ---
// Đã thay đổi Referer để không dính dáng gì tới Alpha
const FAKE_HEADERS_BINANCE = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.binance.com/en/trade/BTC_USDT?type=spot", // Giả lập đang ở trang Trade Spot
  "Origin": "https://www.binance.com",
  "client-type": "web", // Giữ cái này vì API Binance cần
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};

const FAKE_HEADERS_COINGLASS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.coinglass.com/",
  "Origin": "https://www.coinglass.com",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    let targetUrl = '';
    let fetchOptions = {
      method: 'GET',
      next: { revalidate: 60 } // Cache 60s
    };

    // --- 1. XỬ LÝ BINANCE (Chart) ---
    if (type === 'binance') {
      const symbol = searchParams.get('symbol');
      const interval = searchParams.get('interval') || '1d';
      const limit = searchParams.get('limit') || '100';

      if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

      // Gọi API Public uiKlines
      targetUrl = `https://api.binance.com/api/v3/uiKlines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      fetchOptions.headers = FAKE_HEADERS_BINANCE;
    }

    // --- 2. XỬ LÝ COINGLASS (ETF) ---
    else if (type === 'coinglass') {
      targetUrl = 'https://capi.coinglass.com/api/etf/flow';
      fetchOptions.headers = FAKE_HEADERS_COINGLASS;
      fetchOptions.next.revalidate = 300; // Cache 5 phút
    }

    else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // --- THỰC HIỆN GỌI DỮ LIỆU ---
    const res = await fetch(targetUrl, fetchOptions);

    if (!res.ok) {
      // Nếu Binance chặn (403/429), trả về lỗi rõ ràng để Frontend biết
      throw new Error(`Upstream API Error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Proxy Error [${type}]:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}