import psycopg2
import requests

REF = "iwouhwizzwwykchgflyk"
PASSWORDS = ["Nasara1!2", "Nasara1! 2"]

# Resolve db host to IPv4 via DoH (sandbox DNS may only return AAAA, which is unreachable)
r = requests.get("https://dns.google/resolve", params={"name": f"db.{REF}.supabase.co", "type": "A"}, timeout=15)
answers = r.json().get("Answer", [])
if not answers:
    raise SystemExit("Could not resolve db host to IPv4")
host = answers[0]["data"]
print(f"Resolved db host: {host}")

with open("migrations/20260807_seller_store_fields.sql") as f:
    sql = f.read()

for pwd in PASSWORDS:
    try:
        conn = psycopg2.connect(dbname="postgres", user="postgres", password=pwd,
                                host=host, port=5432, connect_timeout=10)
        print("Connection successful!")
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='businesses'")
        print("businesses columns:", [r[0] for r in cur.fetchall()])
        cur.close()
        conn.close()
        print("Migration executed successfully!")
        break
    except Exception as e:
        print(f"FAIL ({pwd}): {e}")
else:
    raise SystemExit("All connection attempts failed")
