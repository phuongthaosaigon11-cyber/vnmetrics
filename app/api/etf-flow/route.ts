import { NextResponse } from 'next/server';

export const runtime = 'edge';

const URLS: Record<string, string> = {
  'BTC': 'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  'ETH': 'https://farside.co.uk/eth-etf-flow-all-data/',
  'SOL': 'https://farside.co.uk/solana-etf-flow-all-data/'
};

export async function GET(request: Request) {
  try {
    // 1. Lấy tham số type (BTC, ETH, SOL) từ URL
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'BTC').toUpperCase();
    const targetUrl = URLS[type];

    if (!targetUrl) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // 2. Fetch dữ liệu
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 300 }
    });
    
    if (!response.ok) return NextResponse.json([], { status: 200 }); // Trả về rỗng nếu 404 (ví dụ chưa có SOL ETF)

    const html = await response.text();
    
    // 3. Phân tích HTML
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g; // Regex đa năng cho mọi phiên bản node
    
    let rows = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) rows.push(match[1]);

    // 4. Tự động xác định các cột (Dynamic Column Mapping)
    // Quét 10 dòng đầu để tìm dòng Header (chứa chữ "Date")
    let headerMap: Record<number, string> = {}; 
    let dateColIndex = -1;
    
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const cells = rows[i].split(/<\/t[dh]>/);
        let tempMap: Record<number, string> = {};
        let foundDate = false;

        cells.forEach((cellRaw, index) => {
            // Lấy text trong thẻ, bỏ tag html
            let txt = cellRaw.replace(/<[^>]*>/g, '').trim();
            // Chuẩn hóa tên cột
            if (txt.toUpperCase() === 'DATE') {
                foundDate = true;
                dateColIndex = index;
                tempMap[index] = 'date';
            } else if (txt.toUpperCase().includes('TOTAL')) {
                tempMap[index] = 'total';
            } else if (txt.length >= 2 && txt.length <= 6) { 
                // Giả định ticker quỹ thường 3-5 ký tự (IBIT, FBTC...)
                tempMap[index] = txt; 
            }
        });

        if (foundDate && Object.keys(tempMap).length > 2) {
            headerMap = tempMap;
            break; // Đã tìm thấy header xịn
        }
    }

    // 5. Parse dữ liệu dựa trên HeaderMap đã tìm được
    const recentRows = rows.slice(-90).reverse();
    const data = [];

    const parseNum = (str: string) => {
        if (!str) return 0;
        let clean = str.replace(/<[^>]*>/g, '').trim();
        if (!clean || clean === '-') return 0;
        if (clean.includes('(')) clean = '-' + clean.replace(/[()]/g, '');
        return parseFloat(clean.replace(/,/g, '')) || 0;
    };

    for (const rowHtml of recentRows) {
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) cells.push(cellMatch[1]);

        if (cells.length > 3 && dateColIndex !== -1 && cells[dateColIndex]) {
            const dateStr = cells[dateColIndex].replace(/<[^>]*>/g, '').trim();
            
            // Validate ngày tháng (chấp nhận cả 28 Jan 2026 lẫn Jan 28 2026)
            if (dateStr && dateStr.length > 5 && dateStr.match(/\d/)) {
                let rowData: any = { date: dateStr };
                
                // Duyệt qua map header để lấy đúng dữ liệu từng cột
                Object.keys(headerMap).forEach((colIdx: any) => {
                    const key = headerMap[colIdx];
                    if (key !== 'date') {
                        rowData[key] = parseNum(cells[colIdx]);
                    }
                });

                // Đảm bảo luôn có field total (nếu parse sót)
                if (rowData.total === undefined) {
                     rowData.total = parseNum(cells[cells.length - 1]);
                }

                data.push(rowData);
            }
        }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
