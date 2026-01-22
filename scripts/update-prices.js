const { createClient } = require('@supabase/supabase-js');

// 1. Cấu hình Supabase (Tôi đã điền sẵn Key của bạn)
const supabaseUrl = 'https://reefordgdyclhstnqxhe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZWZvcmRnZHljbGhzdG5xeGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgxOTAsImV4cCI6MjA4NDYyNDE5MH0.jOHR4NonItIc8vHpR0BdizfIrlg2grsjuOfRvUVYvVY';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Hàm lấy giá từ CoinGecko (API miễn phí)
async function fetchPrices() {
  try {
    console.log('⏳ Đang lấy giá từ CoinGecko...');
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const data = await response.json();
    
    const prices = [
      { symbol: 'BTC', name: 'Bitcoin', price: data.bitcoin.usd },
      { symbol: 'ETH', name: 'Ethereum', price: data.ethereum.usd }
    ];

    console.log('✅ Đã lấy được giá:', prices);
    return prices;
  } catch (error) {
    console.error('❌ Lỗi lấy giá:', error);
    return null;
  }
}

// 3. Hàm lưu vào Supabase
async function updateSupabase(prices) {
  if (!prices) return;

  for (const coin of prices) {
    // Tìm xem coin đã có chưa
    const { data: existing } = await supabase
      .from('crypto_prices')
      .select('*')
      .eq('symbol', coin.symbol)
      .single();

    if (existing) {
      // Nếu có rồi thì cập nhật giá
      await supabase
        .from('crypto_prices')
        .update({ price: coin.price, last_updated: new Date() })
        .eq('symbol', coin.symbol);
      console.log(`🔄 Đã cập nhật giá ${coin.symbol}: $${coin.price}`);
    } else {
      // Nếu chưa có thì tạo mới
      await supabase
        .from('crypto_prices')
        .insert([{ 
          symbol: coin.symbol, 
          name: coin.name, 
          price: coin.price, 
          last_updated: new Date() 
        }]);
      console.log(`🆕 Đã thêm mới ${coin.symbol}: $${coin.price}`);
    }
  }
}

// Chạy chương trình
(async () => {
  const prices = await fetchPrices();
  await updateSupabase(prices);
})();