import { NextResponse } from 'next/server';

export const runtime = 'edge';

const URLS: Record<string, string> = {
  'BTC': 'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  'ETH': 'https://farside.co.uk/eth/',
  'SOL': 'https://farside.co.uk/sol/'
};

// Danh sách mã quỹ để nhận diện Header
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
    
    // Quét 20 dòng đầu tiên để tìm Header chuẩn nhất
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const cellsRaw = rows[i].split(/<\/t[dh]>/);
        let tempMap: Record<number, string> = {};
        let tickerCount = 0;

        cellsRaw.forEach((cellRaw, index) => {
            const txt = cellRaw.replace(/<[^>]*>/g, '').trim();
            const upperTxt = txt.toUpperCase();

            if (KNOWN_TICKERS.some(t => upperTxt === t || upperTxt.includes(t))) {
                tempMap[index] = txt; // Lưu tên quỹ (VD: IBIT, ETHA)
                tickerCount++;
            } else if (upperTxt.includes('DATE')) {
                tempMap[index] = 'date';
            } else if (upperTxt === 'TOTAL' || upperTxt.includes('TOTAL FLOW')) {
                tempMap[index] = 'total';
            }
        });

        // Dòng nào chứa nhiều mã quỹ nhất -> Chính là Header
        if (tickerCount >= 2) {
            headerMap = tempMap;
            headerRowIndex = i;
            break;
        }
    }

    // Fallback cho SOL: Nếu header bị lệch (như trong text bạn gửi), ta gán cứng một số quy luật
    // Dựa trên dữ liệu bạn gửi: Cột đầu (sau ngày) thường là quỹ lớn nhất (GSOL/IBIT)
    if (type === 'SOL' && !headerMap[1]) {
         // Nếu không tìm thấy header, ta giả định cột 1 là GSOL (vì số liệu Seed nó to nhất: 222.9)
         // Thứ tự này dựa trên quan sát dữ liệu bạn cung cấp
         // Date | GSOL | BSOL | VSOL | FSOL | TSOL | SOEZ | Total
         headerMap = {
             0: 'date',
             1: 'GSOL', 2: 'BSOL', 3: 'VSOL', 4: 'FSOL', 5: 'TSOL', 6: 'SOEZ',
             7: 'total'
         };
    }

    // Fallback cho ETH nếu không tìm thấy
    if (type === 'ETH' && Object.keys(headerMap).length < 3) {
        headerMap = {
            0: 'date',
            1: 'ETHA', 2: 'FETH', 3: 'ETHW', 4: 'TETH', 5: 'ETHV', 6: 'QETH', 7: 'EZET', 8: 'ETHE', 9: 'ETH',
            10: 'total'
        };
    }

    // 2. PARSE DỮ LIỆU
    const recentRows = rows.slice(-90).reverse();
    const data = [];

    const parseNum = (str: string) => {
        if (!str) return 0;
        let clean = str.replace(/<[^>]*>/g, '').trim();
        if (!clean || clean === '-' || clean === '0.0') return 0; // 0.0 coi như 0
        if (clean.includes('(')) clean = '-' + clean.replace(/[()]/g, '');
        return parseFloat(clean.replace(/,/g, '')) || 0;
    };

    for (const rowHtml of recentRows) {
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) cells.push(cellMatch[1]);

        // Cần ít nhất 2 cột (Ngày + Total)
        if (cells.length > 2) {
            // Lấy ngày ở cột 0
            const dateStr = cells[0]?.replace(/<[^>]*>/g, '').trim();
            
            // Regex chấp nhận "28 Jan 2026" (Ngày/Tháng/Năm)
            if (dateStr && dateStr.length > 5 && /\d/.test(dateStr)) {
                let rowData: any = { date: dateStr };
                let hasValue = false;

                // Lấy dữ liệu theo Header Map đã định nghĩa ở trên
                Object.keys(headerMap).forEach((colIdx: any) => {
                    const key = headerMap[colIdx];
                    if (key !== 'date' && cells[colIdx]) {
                        const val = parseNum(cells[colIdx]);
                        rowData[key] = val;
                        if (val !== 0) hasValue = true;
                    }
                });

                // Nếu Total chưa có trong map (do header thiếu), lấy cột cuối cùng
                if (rowData.total === undefined || rowData.total === 0) {
                    rowData.total = parseNum(cells[cells.length - 1]);
                }

                // Chỉ lấy dòng có dữ liệu (tránh dòng trống/header lặp lại)
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
