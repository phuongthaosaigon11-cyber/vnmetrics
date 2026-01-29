import os
import json
from dune_client.client import DuneClient

# --- CẤU HÌNH ---

# SỬA QUAN TRỌNG: Lấy Key từ biến môi trường để bảo mật
# Nếu chạy trên máy cá nhân, bạn có thể set biến môi trường hoặc nó sẽ báo lỗi
DUNE_API_KEY = os.environ.get("DUNE_API_KEY")

QUERIES = [
    {
        "id": 3379919, 
        "name": "Whale Flows (SQL 1)",
        "file": "public/onchain_flows.json"
    },
    {
        "id": 3378009, 
        "name": "ETF Holdings (SQL 2)", 
        "file": "public/etf_holdings.json"
    }
]

def fetch_dune_data():
    if not DUNE_API_KEY:
        print("❌ LỖI: Không tìm thấy DUNE_API_KEY trong biến môi trường.")
        print("   -> Trên GitHub: Hãy vào Settings > Secrets and variables > Actions để thêm key.")
        return

    dune = DuneClient(DUNE_API_KEY)
    print("🚀 Bắt đầu đồng bộ dữ liệu Dune Analytics...")
    
    for q in QUERIES:
        try:
            print(f"   ⏳ Đang lấy {q['name']} (ID: {q['id']})...")
            results = dune.get_latest_result(q['id'])
            rows = results.get_rows()
            
            if rows:
                # Đảm bảo thư mục public tồn tại
                os.makedirs(os.path.dirname(q['file']), exist_ok=True)
                
                with open(q['file'], "w", encoding="utf-8") as f:
                    json.dump(rows, f, indent=2, ensure_ascii=False)
                print(f"   ✅ Đã lưu {len(rows)} dòng vào {q['file']}")
            else:
                print(f"   ⚠️ {q['name']} trả về rỗng.")
                
        except Exception as e:
            print(f"   ❌ Lỗi khi lấy {q['name']}: {str(e)}")

    print("\n🎉 Hoàn tất!")

if __name__ == "__main__":
    fetch_dune_data()