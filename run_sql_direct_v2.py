import psycopg2
import sys
import socket

# Try to resolve to IPv4
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
        
        with open("final_migration.sql", "r") as f:
            sql = f.read()
        
        print("Executing migration...")
        cur.execute(sql)
        conn.commit()
        print("Migration executed successfully!")
        
        cur.close()
        conn.close()
        success = True
        break
    except Exception as e:
        print(f"Error: {e}")

if not success:
    sys.exit(1)
