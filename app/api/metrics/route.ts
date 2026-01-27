import { NextResponse } from 'next/server';

// QUAN TRỌNG: Dòng này bắt buộc để deploy lên Cloudflare Pages
export const runtime = 'edge';

export async function GET() {
  try {
    // Gọi song song 3 API: Giá (CoinGecko), Open Interest (Binance), Funding Rate (Binance)
    const [priceRes, oiRes, fundRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90", { next: { revalidate: 300 } }),
      fetch("https://fapi.binance.com/fapi/v1/openInterestHist?symbol=BTCUSDT&period=1d&limit=90", { next: { revalidate: 300 } }),
      fetch("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=270", { next: { revalidate: 300 } }) 
    ]);

    const priceData = await priceRes.json();
    const oiData = await oiRes.json();
    const fundData = await fundRes.json();

    return NextResponse.json({
      prices: priceData.prices || [],
      oi: oiData,
      funding: fundData
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ prices: [], oi: [], funding: [] }, { status: 500 });
  }
}
