import psycopg2

REF = "iwouhwizzwwykchgflyk"
PASSWORDS = ["Nasara1!2", "Nasara1! 2"]
HOSTS = [
    "aws-0-eu-central-1.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-ap-southeast-1.pooler.supabase.com",
]
USERS = [
    f"postgres.{REF}",
    "postgres",
    REF,
]
PORTS = [6543, 5432]

for host in HOSTS:
    for user in USERS:
        for pwd in PASSWORDS:
            for port in PORTS:
                try:
                    conn = psycopg2.connect(
                        dbname="postgres", user=user, password=pwd,
                        host=host, port=port, connect_timeout=8,
                    )
                    cur = conn.cursor()
                    cur.execute("SELECT 1")
                    print(f"SUCCESS host={host} user={user} port={port} pwd={pwd[:4]}...")
                    cur.close()
                    conn.close()
                    raise SystemExit("done")
                except Exception as e:
                    pass
print("all attempts failed")
