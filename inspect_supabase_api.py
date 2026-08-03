import requests
import json

url = "https://iwouhwizzwwykchgflyk.supabase.co/rest/v1/"
headers = {
    "apikey": "sb_publishable_JQ1j1pmK11ur1sK5AL_3tg__MLqaG5a",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b3Vod2l6end3eWtjaGdmbHlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyOTkwMSwiZXhwIjoyMDk4OTA1OTAxfQ.jlsiVZOImF3_I--m6D0uTKgrD7PUSP0qtpLmi0XJgBs"
}

def inspect_table(table_name):
    print(f"--- Inspecting {table_name} ---")
    response = requests.get(f"{url}{table_name}?limit=1", headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data:
            print(json.dumps(data[0], indent=2))
        else:
            print("Table is empty.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

inspect_table("orders")
inspect_table("products")
inspect_table("product_variants")
inspect_table("variants")
