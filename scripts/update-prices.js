const { createClient } = require('@supabase/supabase-js');

// 1. Cấu hình (Key của bạn)
const supabaseUrl = 'https://reefordgdyclhstnqxhe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlZWZvcmRnZHljbGhzdG5xeGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDgxOTAsImV4cCI6MjA4NDYyNDE5MH0.jOHR4NonItIc8vHpR0BdizfIrlg2grsjuOfRvUVYvVY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Tỷ giá USD/VND cứng (Sau này có thể lấy API ngân hàng)
const RATE_VND = 25450; 

async function fetchMarketData() {
  try {
    console.log('⏳ Đang lấy dữ liệu Top 20 từ CoinGecko...');
    // Gọi API lấy Top 20 đồng theo vốn hóa, kèm % thay đổi
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false');
    const data = await response.json();
    
    console.log(`✅ Đã lấy được ${data.length} đồng coin.`);
    return data;
  } catch (error) {
    console.error('❌ Lỗi API:', error);
    return [];
  }
}

async function updateSupabase(coins) {
  if (!coins || coins.length === 0) return;

  for (const coin of coins) {
    // Giả lập điểm tuân thủ (Random từ 60-99 để demo)
    const randomScore = Math.floor(Math.random() * (99 - 60 + 1) + 60);

    const payload = {
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      price_vnd: coin.current_price * RATE_VND, // Quy đổi ra VND
      change_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      image_url: coin.image,
      compliance_score: randomScore, // Điểm số quan trọng
      last_updated: new Date()
    };

    // Upsert: Có rồi thì update, chưa có thì insert
    const { error } = await supabase
      .from('crypto_prices')
      .upsert(payload, { onConflict: 'symbol' });

    if (error) console.error(`❌ Lỗi lưu ${coin.symbol}:`, error.message);
    else console.log(`🔄 Đã cập nhật: ${coin.name} (${coin.symbol})`);
  }
}

(async () => {
  const coins = await fetchMarketData();
  await updateSupabase(coins);
})();