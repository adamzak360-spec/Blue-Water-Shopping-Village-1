import os
import requests
import json

def run_sql():
    supabase_url = os.environ.get('VITE_SUPABASE_URL')
    supabase_key = os.environ.get('VITE_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set")
        return

    # Try to use the service role key if available for SQL execution
    # Since we don't have it, we'll inform the user to run the SQL in the dashboard
    # However, I'll try to use the anon key just in case the project has relaxed permissions (unlikely)
    
    print("Please run the following SQL in your Supabase SQL Editor:")
    with open('migrations/20260723_add_notifications.sql', 'r') as f:
        print(f.read())

if __name__ == "__main__":
    run_sql()
