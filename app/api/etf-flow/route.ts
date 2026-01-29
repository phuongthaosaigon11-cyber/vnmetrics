import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Cập nhật URL chuẩn theo bạn cung cấp
const URLS: Record<string, string> = {
  'BTC': 'https://farside.co.uk/bitcoin-etf-flow-all-data/',
  'ETH': 'https://farside.co.uk/eth/',
  'SOL': 'https://farside.co.uk/sol/'
};

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
    
    // Regex tương thích mọi phiên bản (Fix lỗi build trước đó)
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    
    let rows = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) rows.push(match[1]);

    // Tự động tìm cột (Header Detection)
    let headerMap: Record<number, string> = {}; 
    let dateColIndex = -1;
    
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const cells = rows[i].split(/<\/t[dh]>/);
        let tempMap: Record<number, string> = {};
        let foundDate = false;

        cells.forEach((cellRaw, index) => {
            let txt = cellRaw.replace(/<[^>]*>/g, '').trim();
            // Chuẩn hóa tên cột
            if (txt.toUpperCase().includes('DATE')) {
                foundDate = true;
                dateColIndex = index;
                tempMap[index] = 'date';
            } else if (txt.toUpperCase().includes('TOTAL') || txt.toUpperCase().includes('FLOW')) {
                tempMap[index] = 'total';
            } else if (txt.length >= 2 && txt.length <= 10) { 
                // Tên quỹ (IBIT, ETHE,...)
                tempMap[index] = txt; 
            }
        });

        if (foundDate && Object.keys(tempMap).length > 2) {
            headerMap = tempMap;
            break;
        }
    }

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
            // Chấp nhận mọi định dạng ngày có chứa số
            if (dateStr && dateStr.length > 4 && /\d/.test(dateStr)) {
                let rowData: any = { date: dateStr };
                let hasValue = false;

                Object.keys(headerMap).forEach((colIdx: any) => {
                    const key = headerMap[colIdx];
                    if (key !== 'date') {
                        const val = parseNum(cells[colIdx]);
                        rowData[key] = val;
                        if (val !== 0) hasValue = true;
                    }
                });

                // Chỉ lấy dòng có dữ liệu
                if (hasValue) {
                    if (rowData.total === undefined) {
                         rowData.total = parseNum(cells[cells.length - 1]);
                    }
                    data.push(rowData);
                }
            }
        }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
