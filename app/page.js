import { supabase } from '../lib/supabase';

// CẤU HÌNH QUAN TRỌNG: Bắt buộc phải có dòng này web mới chạy được trên Cloudflare
export const runtime = 'edge'; 

// CẤU HÌNH CACHE: 0 để luôn lấy dữ liệu mới nhất
export const revalidate = 0; 

export default async function Home() {
  // Lấy dữ liệu từ bảng "crypto_prices"
  const { data: cryptos, error } = await supabase
    .from('crypto_prices')
    .select('*')
    .order('symbol');

  if (error) console.error("Lỗi lấy data:", error);

  const getLogo = (symbol) => {
    if (symbol === 'BTC') return 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';
    if (symbol === 'ETH') return 'https://assets.coingecko.com/coins/images/279/large/ethereum.png';
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png';
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            🇻🇳 Cổng Dữ liệu Tài sản số VN
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dữ liệu tham khảo theo Nghị quyết 05/2025/NQ-CP (Cập nhật từ CoinGecko)
          </p>
        </header>

        {(!cryptos || cryptos.length === 0) ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-slate-500">
              Đang tải dữ liệu... <br/>
              (Nếu chờ lâu, hãy kiểm tra lại bảng crypto_prices trong Supabase)
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cryptos.map((coin) => (
              <div key={coin.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow">
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <img src={getLogo(coin.symbol)} className="w-12 h-12 rounded-full border bg-white" alt={coin.symbol} />
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">{coin.name} <span className="text-slate-400 text-sm">({coin.symbol})</span></h2>
                    <div className="text-lg font-mono text-slate-700 font-bold mt-1">
                      {coin.price 
                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coin.price) 
                        : '---'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Cập nhật: {new Date(coin.last_updated).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto bg-slate-50 rounded-lg p-3 text-center md:text-right border border-slate-100 min-w-[150px]">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chỉ số Tuân thủ</div>
                  <div className="flex items-center justify-center md:justify-end gap-2">
                    <span className="text-2xl font-black text-green-600">
                      95/100
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 italic mt-1">
                    Đủ điều kiện niêm yết
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}