import requests, sys

URL = "https://iwouhwizzwwykchgflyk.supabase.co/rest/v1"

def anon_key():
    with open("/tmp/prod.js") as f:
        content = f.read()
    import re
    m = re.search(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*', content)
    return m.group(0)

def q(table, params="", headers_extra=None):
    KEY = anon_key()
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}
    if headers_extra:
        h.update(headers_extra)
    r = requests.get(f"{URL}/{table}?{params}", headers=h, timeout=20)
    print(f"GET /{table}?{params} -> {r.status_code}")
    print(r.text[:800])
    return r

if __name__ == "__main__":
    table = sys.argv[1] if len(sys.argv) > 1 else "profiles"
    params = sys.argv[2] if len(sys.argv) > 2 else "select=*&limit=5"
    q(table, params)
