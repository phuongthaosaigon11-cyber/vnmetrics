import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    let targetUrl = '';
    
    // --- 1. DEFILLAMA CHART (Thay thế Binance) ---
    // Docs: https://coins.llama.fi/chart/{coins}
    if (type === 'defillama') {
      const coins = searchParams.get('coins'); // VD: coingecko:bitcoin
      const start = searchParams.get('start');
      const span = searchParams.get('span');
      const period = searchParams.get('period');
      
      targetUrl = `https://coins.llama.fi/chart/${coins}?start=${start}&span=${span}&period=${period}`;
    }

    // --- 2. COINGLASS ETF (Giữ nguyên) ---
    else if (type === 'coinglass') {
      targetUrl = 'https://capi.coinglass.com/api/etf/flow';
    }

    else {
      return NextResponse.json({ error: 'Invalid Type' }, { status: 400 });
    }

    // Gọi API (Không cần Fake Header phức tạp nữa vì DefiLlama rất thoáng)
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(type === 'coinglass' ? { "Referer": "https://www.coinglass.com/", "Origin": "https://www.coinglass.com" } : {})
      },
      next: { revalidate: type === 'defillama' ? 60 : 300 } 
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream Error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}