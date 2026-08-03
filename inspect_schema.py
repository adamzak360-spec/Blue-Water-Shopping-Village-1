import psycopg2
import sys

# Connection details
# Host: db.iwouhwizzwwykchgflyk.supabase.co
# Port: 5432
# User: postgres
# Password: Nasara1!2

try:
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="Nasara1!2",
        host="db.iwouhwizzwwykchgflyk.supabase.co",
        port="5432"
    )
    cur = conn.cursor()
    
    print("--- Orders Table Columns ---")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position;")
    columns = cur.fetchall()
    for col in columns:
        print(f"{col[0]}: {col[1]}")
        
    print("\n--- Products Table Columns ---")
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;")
    columns = cur.fetchall()
    for col in columns:
        print(f"{col[0]}: {col[1]}")

    print("\n--- Variants Table Columns (if exists) ---")
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'variants' OR table_name = 'product_variants';")
    tables = cur.fetchall()
    for table in tables:
        print(f"Table: {table[0]}")
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table[0]}' ORDER BY ordinal_position;")
        cols = cur.fetchall()
        for col in cols:
            print(f"  {col[0]}: {col[1]}")
            
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
