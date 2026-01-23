import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval');
  const limit = searchParams.get('limit');

  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

  try {
    const targetUrl = `https://api.binance.com/api/v3/uiKlines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    // KỸ THUẬT FAKE HEADER (Học từ code của bạn)
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.binance.com/en/trade",
        "Origin": "https://www.binance.com",
        "client-type": "web"
      }
    });

    if (!res.ok) {
        throw new Error(`Binance API Error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}