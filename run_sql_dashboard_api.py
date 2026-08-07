#!/usr/bin/env python3
"""Run SQL on the Supabase project via the dashboard API using a captured session JWT.

Usage:
  python3 run_sql_dashboard_api.py <access_token> <sql_file>
"""
import json
import sys
import requests

TOKEN = sys.argv[1]
SQL_FILE = sys.argv[2]
REF = "iwouhwizzwwykchgflyk"

sql = open(SQL_FILE).read()

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "x-supabase-project-id": REF,
    "x-supabase-access-token": TOKEN,
    "Cookie": f"sb_dashboard_token={TOKEN}; sb_access_token={TOKEN}",
}

# The dashboard API supports running SQL via the management proxy.
# Endpoint: POST /v2/projects/{ref}/sql
url = f"https://api.supabase.com/v2/projects/{REF}/sql"
body = {"query": sql}

resp = requests.post(url, headers=headers, json=body, timeout=60)
print("STATUS:", resp.status_code)
try:
    data = resp.json()
    print(json.dumps(data, indent=2)[:3000])
except Exception:
    print(resp.text[:2000])
