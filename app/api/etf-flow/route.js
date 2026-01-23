import { NextResponse } from 'next/server';

export const runtime = 'edge';

// --- CHUẨN HÓA HEADER THEO CODE DENO CỦA BẠN ---
const FAKE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "client-type": "web", // Quan trọng với Binance
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    let targetUrl = '';
    const fetchOptions = {
      method: 'GET',
      headers: { ...FAKE_HEADERS },
      next: { revalidate: 0 } // Tắt cache Next.js để tránh lưu lại lỗi 403
    };

    // --- 1. BINANCE CHART (Dùng API Public chuẩn) ---
    if (type === 'binance') {
      const symbol = searchParams.get('symbol');
      const interval = searchParams.get('interval') || '1d';
      const limit = searchParams.get('limit') || '100';
      
      targetUrl = `https://api.binance.com/api/v3/uiKlines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      // Header riêng cho Binance (Tránh xung đột Alpha)
      fetchOptions.headers['Referer'] = 'https://www.binance.com/en/trade';
      fetchOptions.headers['Origin'] = 'https://www.binance.com';
    }

    // --- 2. COINGLASS ETF ---
    else if (type === 'coinglass') {
      targetUrl = 'https://capi.coinglass.com/api/etf/flow';
      
      // Header riêng cho CoinGlass
      fetchOptions.headers['Referer'] = 'https://www.coinglass.com/';
      fetchOptions.headers['Origin'] = 'https://www.coinglass.com';
    }

    else {
      return NextResponse.json({ error: 'Invalid Type' }, { status: 400 });
    }

    // --- GỌI API ---
    const res = await fetch(targetUrl, fetchOptions);

    if (!res.ok) {
      // Trả về lỗi chi tiết để Frontend biết đường chuyển sang backup
      return NextResponse.json({ error: `Upstream Error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}