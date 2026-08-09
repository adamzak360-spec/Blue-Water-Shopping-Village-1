import psycopg2
import sys
import socket

try:
    ipv4 = socket.gethostbyname("db.iwouhwizzwwykchgflyk.supabase.co")
    print(f"Resolved to IPv4: {ipv4}")
except Exception as e:
    print(f"DNS resolution error: {e}")
    ipv4 = "db.iwouhwizzwwykchgflyk.supabase.co"

passwords = ["Nasara1!2", "Nasara1! 2"]
success = False

for pwd in passwords:
    try:
        print(f"Attempting connection with password: {pwd}")
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password=pwd,
            host=ipv4,
            port="5432",
            connect_timeout=10
        )
        print("Connection successful!")
        cur = conn.cursor()
        
        # Read multi-tenant migration
        with open("migrations/20260807_multi_tenant_foundation.sql", "r") as f:
            sql1 = f.read()
        
        print("Executing multi-tenant migration...")
        cur.execute(sql1)
        conn.commit()
        print("Multi-tenant migration executed successfully!")

        # Read subscription foundation migration
        with open("migrations/20260807_subscription_foundation.sql", "r") as f:
            sql2 = f.read()
        
        print("Executing subscription foundation migration...")
        cur.execute(sql2)
        conn.commit()
        print("Subscription foundation migration executed successfully!")
        
        cur.close()
        conn.close()
        success = True
        break
    except Exception as e:
        print(f"Error: {e}")

if not success:
    sys.exit(1)
