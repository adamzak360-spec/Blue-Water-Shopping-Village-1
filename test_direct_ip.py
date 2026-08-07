import psycopg2

ip = "104.18.38.10"
PASSWORDS = ["Nasara1!2", "Nasara1! 2"]

for pwd in PASSWORDS:
    for sslmode in ["require", "prefer"]:
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user="postgres",
                password=pwd,
                host=ip,
                port=5432,
                sslmode=sslmode,
                connect_timeout=10,
            )
            cur = conn.cursor()
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='businesses' ORDER BY ordinal_position"
            )
            print("SUCCESS pwd=%s ssl=%s" % (pwd, sslmode))
            print("businesses cols:", [r[0] for r in cur.fetchall()])
            cur.close()
            conn.close()
            raise SystemExit("done")
        except Exception as e:
            m = str(e)
            print("FAIL pwd=%s ssl=%s: %s" % (pwd, sslmode, m[:150]))
