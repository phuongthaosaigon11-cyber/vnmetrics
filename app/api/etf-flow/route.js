import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Giả lập trình duyệt thật (Chrome on Mac)
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Referer": "https://www.coinglass.com/",
  "Origin": "https://www.coinglass.com",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site"
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); 

  try {
    if (type === 'coinglass') {
      const res = await fetch('https://capi.coinglass.com/api/etf/flow', {
        headers: HEADERS,
        next: { revalidate: 120 } // Cache 2 phút
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ error: 'Invalid Type' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}