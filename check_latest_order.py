import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def check_latest_order():
    url = f"{SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=1"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        orders = response.json()
        if orders:
            print("Latest Order:")
            for k, v in orders[0].items():
                if k != 'items':
                    print(f"{k}: {v}")
                else:
                    print(f"items count: {len(v)}")
        else:
            print("No orders found.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    check_latest_order()
