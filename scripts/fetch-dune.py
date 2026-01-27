
import os

import json

from dune_client.client import DuneClient



# --- CẤU HÌNH ---

# Dán API Key của bạn vào dòng dưới (giữ nguyên dấu ngoặc kép)

DUNE_API_KEY = "81E4tsyyw6f4kZZVutnM7NNPB9JCQFDQ"



# Danh sách Query ID tương ứng với SQL bạn cung cấp

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

    if "DÁN_KEY" in DUNE_API_KEY:

        print("❌ LỖI: Bạn chưa dán API Key vào file scripts/fetch-dune.py")

        return



    dune = DuneClient(DUNE_API_KEY)

    print("🚀 Bắt đầu đồng bộ dữ liệu Dune Analytics...")

    

    for q in QUERIES:

        try:

            print(f"   ⏳ Đang lấy {q['name']} (ID: {q['id']})...")

            # Lấy kết quả mới nhất từ Dune

            results = dune.get_latest_result(q['id'])

            rows = results.get_rows()

            

            if rows:

                with open(q['file'], "w", encoding="utf-8") as f:

                    json.dump(rows, f, indent=2, ensure_ascii=False)

                print(f"   ✅ Đã lưu {len(rows)} dòng vào {q['file']}")

            else:

                print(f"   ⚠️ {q['name']} trả về rỗng.")

                

        except Exception as e:

            print(f"   ❌ Lỗi khi lấy {q['name']}: {str(e)}")



    print("\n🎉 Hoàn tất! Hãy refresh website.")



if __name__ == "__main__":

    fetch_dune_data()

