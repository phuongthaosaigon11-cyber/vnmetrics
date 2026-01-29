import { NextResponse } from 'next/server';

export const runtime = 'edge';

// CẬP NHẬT URL THEO YÊU CẦU:
// BTC & ETH dùng trang "all-data" để lấy full lịch sử.
// SOL dùng trang "/sol/" (vì chưa có trang all-data).
const URLS: Record<string, string> = {
  'BTC': 'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  'ETH': 'https://farside.co.uk/ethereum-etf-flow-all-data/',
  'SOL': 'https://farside.co.uk/sol/'
};

// Danh sách mã quỹ để nhận diện Header (Mỏ neo)
const KNOWN_TICKERS = [
    'IBIT', 'FBTC', 'BITB', 'ARKB', 'BTCO', 'EZBC', 'BRRR', 'HODL', 'BTCW', 'GBTC', 'BTC', // BTC
    'ETHA', 'FETH', 'ETHW', 'TETH', 'ETHV', 'QETH', 'EZET', 'ETHE', 'ETH', // ETH
    'BSOL', 'VSOL', 'FSOL', 'TSOL', 'SOEZ', 'GSOL' // SOL
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'BTC').toUpperCase();
    const targetUrl = URLS[type];

    if (!targetUrl) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 300 }
    });
    
    const html = await response.text();
    
    // Regex lấy dòng (tr) và ô (td/th) chấp nhận mọi ký tự xuống dòng
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
    
    let rows = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) rows.push(match[1]);

    // 1. TÌM HEADER & MAP CỘT
    let headerMap: Record<number, string> = {}; 
    let headerRowIndex = -1;
    
    // Quét 30 dòng đầu tiên để tìm Header chuẩn nhất
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const cellsRaw = rows[i].split(/<\/t[dh]>/);
        let tempMap: Record<number, string> = {};
        let tickerCount = 0;

        cellsRaw.forEach((cellRaw, index) => {
            const txt = cellRaw.replace(/<[^>]*>/g, '').trim();
            const upperTxt = txt.toUpperCase();

            // Nếu ô chứa Ticker quỹ -> Lưu lại
            if (KNOWN_TICKERS.some(t => upperTxt === t || upperTxt.includes(t))) {
                tempMap[index] = txt; 
                tickerCount++;
            } else if (upperTxt.includes('DATE')) {
                tempMap[index] = 'date';
            } else if (upperTxt === 'TOTAL' || upperTxt.includes('TOTAL FLOW')) {
                tempMap[index] = 'total';
            }
        });

        // Dòng nào chứa nhiều mã quỹ nhất (>=2) -> Chính là Header bảng dữ liệu
        if (tickerCount >= 2) {
            headerMap = tempMap;
            headerRowIndex = i;
            break;
        }
    }

    // FALLBACK CHO SOL (Vì bảng SOL hay bị lệch header/data)
    // Cấu trúc quan sát được: Cột 1 (sau ngày) là GSOL, cột cuối là Total
    if (type === 'SOL' && !headerMap[1]) {
         headerMap = {
             0: 'date',
             1: 'GSOL', 2: 'BSOL', 3: 'VSOL', 4: 'FSOL', 5: 'TSOL', 6: 'SOEZ',
             7: 'total'
         };
    }

    // FALLBACK CHO ETH (Nếu không tìm thấy header tự động)
    // Trang all-data thường có cột: Date | ETHA | FETH ... | Total
    if (type === 'ETH' && Object.keys(headerMap).length < 3) {
        // Thứ tự phổ biến trên Farside cho ETH
        headerMap = {
            0: 'date',
            1: 'ETHA', 2: 'FETH', 3: 'ETHW', 4: 'TETH', 5: 'ETHV', 6: 'QETH', 7: 'EZET', 8: 'ETHE', 9: 'ETH',
            10: 'total'
        };
    }

    // 2. PARSE DỮ LIỆU
    const recentRows = rows.slice(-90).reverse(); // Lấy 90 ngày gần nhất
    const data = [];

    const parseNum = (str: string) => {
        if (!str) return 0;
        let clean = str.replace(/<[^>]*>/g, '').trim();
        if (!clean || clean === '-' || clean === '0.0') return 0;
        if (clean.includes('(')) clean = '-' + clean.replace(/[()]/g, '');
        return parseFloat(clean.replace(/,/g, '')) || 0;
    };

    for (const rowHtml of recentRows) {
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) cells.push(cellMatch[1]);

        if (cells.length > 2) {
            // Lấy ngày ở cột 0
            const dateStr = cells[0]?.replace(/<[^>]*>/g, '').trim();
            
            // Regex chấp nhận "28 Jan 2026" hoặc "Jan 28 2026"
            if (dateStr && dateStr.length > 5 && /\d/.test(dateStr)) {
                let rowData: any = { date: dateStr };
                let hasValue = false;

                // Lấy dữ liệu các quỹ theo Header Map
                Object.keys(headerMap).forEach((colIdx: any) => {
                    const key = headerMap[colIdx];
                    // Chỉ lấy dữ liệu nếu ô đó tồn tại
                    if (key !== 'date' && cells[colIdx]) {
                        const val = parseNum(cells[colIdx]);
                        // Nếu key là total, ta ưu tiên lấy, nếu là quỹ thì check !== 0
                        rowData[key] = val;
                        if (val !== 0) hasValue = true;
                    }
                });

                // XỬ LÝ CỘT TOTAL (Quan trọng)
                // 1. Nếu map có total -> dùng nó.
                // 2. Nếu map không có total hoặc giá trị = 0 -> Thử lấy cột cuối cùng.
                // 3. Nếu vẫn = 0 -> Tự cộng tay các quỹ thành phần.
                
                if (!rowData.total) {
                    rowData.total = parseNum(cells[cells.length - 1]);
                }

                if (!rowData.total && hasValue) {
                     let sum = 0;
                     Object.keys(rowData).forEach(k => {
                         if (k !== 'date' && k !== 'total') sum += rowData[k];
                     });
                     if (sum !== 0) rowData.total = parseFloat(sum.toFixed(1));
                }

                if (hasValue || rowData.total !== 0) {
                    data.push(rowData);
                }
            }
        }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
