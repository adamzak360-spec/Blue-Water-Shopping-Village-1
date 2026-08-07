import psycopg2

REF = "iwouhwizzwwykchgflyk"

# Pooler 5432 with require TLS, user postgres.<ref>
for host in ["aws-0-eu-central-1.pooler.supabase.com", "aws-0-us-east-1.pooler.supabase.com"]:
    for user in [f"postgres.{REF}", "postgres"]:
        for pwd in ["Nasara1!2", "Nasara1! 2"]:
            try:
                conn = psycopg2.connect(
                    dbname="postgres", user=user, password=pwd,
                    host=host, port=5432, sslmode="require", connect_timeout=10,
                )
                cur = conn.cursor()
                cur.execute("SELECT 1")
                print("SUCCESS", host, user[:14], pwd[:4])
                cur.close(); conn.close()
                raise SystemExit("ok")
            except psycopg2.Error as e:
                msg = str(e)
                import re
                m = re.search(r'FATAL:\s*(.*)', msg)
                print("FAIL", host, user[:14], '->', (m.group(1) if m else msg)[:90])
