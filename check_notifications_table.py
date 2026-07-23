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
        
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications');")
        exists = cur.fetchone()[0]
        print(f"Notifications table exists: {exists}")
        
        if exists:
            cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications';")
            columns = cur.fetchall()
            print("Columns in notifications table:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]})")
        
        cur.close()
        conn.close()
        success = True
        break
    except Exception as e:
        print(f"Error: {e}")

if not success:
    sys.exit(1)
