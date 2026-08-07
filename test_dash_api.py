#!/usr/bin/env python3
"""Test which Supabase dashboard API endpoints accept the captured JWT."""
import sys
import json
import requests

TOKEN = sys.argv[1]
REF = "iwouhwizzwwykchgflyk"
AUTH = {"Authorization": f"Bearer {TOKEN}"}

urls = [
    ("GET /v2/user", "https://api.supabase.com/v2/user"),
    ("GET /v2/organizations", "https://api.supabase.com/v2/organizations"),
    ("GET /v1/projects", "https://api.supabase.com/v1/projects"),
    ("GET projects/...", f"https://api.supabase.com/v2/projects/{REF}/config/auth"),
]
for label, url in urls:
    try:
        r = requests.get(url, headers=AUTH, timeout=30)
        print(f"{label} -> {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"{label} -> ERROR {e}")
