import { NextResponse } from 'next/server';

export const runtime = 'edge';

const BASE_URL = 'https://fapi.binance.com/fapi/v1';

export async function GET() {
  try {
    // Gọi song song 3 API từ Binance Futures
    // 1. Klines (Giá nến ngày) - Lấy 90 cây nến gần nhất
    // 2. Open Interest History (Lịch sử dòng tiền mở)
    // 3. Funding Rate History (Lịch sử phí funding)
    
    const [klineRes, oiRes, fundRes] = await Promise.all([
      fetch(`${BASE_URL}/klines?symbol=BTCUSDT&interval=1d&limit=90`),
      fetch(`${BASE_URL}/openInterestHist?symbol=BTCUSDT&period=1d&limit=90`),
      fetch(`${BASE_URL}/fundingRate?symbol=BTCUSDT&limit=270`) // Funding 8h/lần -> 90 ngày * 3 = 270
    ]);

    const pricesRaw = await klineRes.json();
    const oiRaw = await oiRes.json();
    const fundRaw = await fundRes.json();

    // Chuẩn hóa dữ liệu trả về
    // Binance Klines trả về mảng: [time, open, high, low, close, ...]
    // Ta chỉ cần [time, close]
    const prices = Array.isArray(pricesRaw) 
        ? pricesRaw.map((k: any) => [k[0], parseFloat(k[4])]) 
        : [];

    return NextResponse.json({
      prices,
      oi: Array.isArray(oiRaw) ? oiRaw : [],
      funding: Array.isArray(fundRaw) ? fundRaw : []
    });

  } catch (error) {
    console.error('Binance API Error:', error);
    return NextResponse.json({ prices: [], oi: [], funding: [] });
  }
}
