import { NextResponse } from 'next/server';

export const runtime = 'edge';

// --- HEADERS CHUẨN (TỪ CODE DENO CỦA BẠN) ---
const FAKE_HEADERS_COINGLASS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://www.coinglass.com/",
  "Origin": "https://www.coinglass.com",
  "Accept": "application/json",
  "client-type": "web"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    // CHỈ XỬ LÝ ETF COINGLASS QUA PROXY
    if (type === 'coinglass') {
      const res = await fetch('https://capi.coinglass.com/api/etf/flow', {
        headers: FAKE_HEADERS_COINGLASS,
        next: { revalidate: 300 } // Cache 5 phút
      });

      if (!res.ok) {
        return NextResponse.json({ error: `CoinGlass Error ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json(data);
    } 
    
    return NextResponse.json({ error: 'Invalid Type' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}