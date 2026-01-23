import { NextResponse } from 'next/server';

export const runtime = 'edge';

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    let targetUrl = '';
    
    // 1. COINGLASS (ETF Flows)
    if (type === 'coinglass') {
      targetUrl = 'https://capi.coinglass.com/api/etf/flow';
    } 
    
    // 2. DEFILLAMA DEX (Volume Sàn DEX - API bạn mới gửi)
    else if (type === 'defillama-dex') {
      targetUrl = 'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume';
    }

    else {
      return NextResponse.json({ error: 'Invalid Type' }, { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        ...COMMON_HEADERS,
        ...(type === 'coinglass' ? { "Referer": "https://www.coinglass.com/", "Origin": "https://www.coinglass.com" } : {})
      },
      next: { revalidate: 300 } // Cache 5 phút
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