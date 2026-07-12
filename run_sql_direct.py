import psycopg2
import sys

# Connection details
# Host: db.iwouhwizzwwykchgflyk.supabase.co
# Port: 5432
# User: postgres
# Password: Nasara1!2 (trying both versions)

passwords = ["Nasara1!2", "Nasara1! 2"]
success = False

for pwd in passwords:
    try:
        print(f"Attempting connection with password: {pwd}")
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password=pwd,
            host="db.iwouhwizzwwykchgflyk.supabase.co",
            port="5432"
        )
        print("Connection successful!")
        cur = conn.cursor()
        
        # Read the migration file
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
