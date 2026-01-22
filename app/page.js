import { supabase } from '../lib/supabase';

// CẤU HÌNH CACHE: Chỉ lấy dữ liệu mới sau mỗi 60 giây (Tiết kiệm cho gói Free)
export const revalidate = 60; 

export default async function Home() {
  // Lấy dữ liệu từ Supabase (Bảng tokens kèm dữ liệu giá và pháp lý)
  const { data: tokens } = await supabase
    .from('tokens')
    .select(`
      *,
      market_data ( price_vnd, change_24h ),
      compliance ( score, legal_note )
    `);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            🇻🇳 Cổng Dữ liệu Tài sản số VN
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dữ liệu tham khảo theo Nghị quyết 05/2025/NQ-CP
          </p>
        </header>

        {/* Kiểm tra nếu không có dữ liệu */}
        {(!tokens || tokens.length === 0) ? (
          <div className="text-center py-10 bg-white rounded-lg shadow-sm">
            <p className="text-slate-500">
              Chưa có dữ liệu. <br/>
              Hãy đảm bảo bạn đã chạy lệnh SQL tạo bảng trong Supabase.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tokens.map((token) => (
              <div key={token.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* Cột trái: Thông tin Token */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <img src={token.logo_url} className="w-12 h-12 rounded-full border" alt={token.symbol} />
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">{token.name} <span className="text-slate-400 text-sm">({token.symbol})</span></h2>
                    <div className="text-sm text-slate-500">
                      Giá: {token.market_data?.[0]?.price_vnd 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(token.market_data[0].price_vnd) 
                        : '---'}
                    </div>
                  </div>
                </div>

                {/* Cột phải: Điểm Tuân thủ (Tính năng độc quyền) */}
                <div className="w-full md:w-auto bg-slate-50 rounded-lg p-3 text-center md:text-right border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chỉ số Tuân thủ</div>
                  <div className="flex items-center justify-center md:justify-end gap-2">
                    <span className={`text-2xl font-black ${
                      (token.compliance?.[0]?.score || 50) >= 80 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {token.compliance?.[0]?.score || 50}/100
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 italic mt-1">
                    {token.compliance?.[0]?.legal_note || "Đang thẩm định"}
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