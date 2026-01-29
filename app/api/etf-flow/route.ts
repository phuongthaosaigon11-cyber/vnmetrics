import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const response = await fetch('https://farside.co.uk/bitcoin-etf-flow-all-data/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 300 }
    });
    
    const html = await response.text();
    
    // SỬA LỖI REGEX: Dùng [\s\S] thay cho . và bỏ cờ 's' để tương thích ES cũ
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    
    let rows = [];
    let match;
    while ((match = rowRegex.exec(html)) !== null) rows.push(match[1]);

    let dateCol = 0, ibitCol = 1, fbtcCol = 2, totalCol = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const headerCells = rows[i].split(/<\/t[dh]>/);
        headerCells.forEach((cellRaw, index) => {
            const txt = cellRaw.replace(/<[^>]*>/g, '').trim().toUpperCase();
            if (txt.includes('DATE')) dateCol = index;
            if (txt.includes('IBIT')) ibitCol = index;
            if (txt.includes('FBTC')) fbtcCol = index;
            if (txt.includes('TOTAL') && totalCol === -1) totalCol = index;
        });
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

        if (cells.length > 3) {
            const dateStr = cells[dateCol]?.replace(/<[^>]*>/g, '').trim();
            if (dateStr && dateStr.length > 5 && dateStr.match(/\d/)) {
                const actualTotalCol = totalCol !== -1 ? totalCol : cells.length - 1;
                data.push({
                    date: dateStr,
                    ibit: parseNum(cells[ibitCol]),
                    fbtc: parseNum(cells[fbtcCol]),
                    total: parseNum(cells[actualTotalCol])
                });
            }
        }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
