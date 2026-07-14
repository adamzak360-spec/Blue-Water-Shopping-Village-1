import requests
import json
import sys

url = "https://iwouhwizzwwykchgflyk.supabase.co/rest/v1/"
service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3b3Vod2l6end3eWtjaGdmbHlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMyOTkwMSwiZXhwIjoyMDk4OTA1OTAxfQ.jlsiVZOImF3_I--m6D0uTKgrD7PUSP0qtpLmi0XJgBs"

with open("migrations/20260714_supplier_management.sql", "r") as f:
    sql = f.read()

# The REST API doesn't support running arbitrary SQL.
# We need to use the SQL editor or a management API.
# However, we can try to use the rpc call if we have a function that executes SQL.
# Since we don't have one, we'll have to rely on the user to run the SQL if direct connection fails.

print("Direct SQL execution via REST API is not supported.")
print("Please run the following SQL in your Supabase SQL Editor:")
print("-" * 20)
print(sql)
print("-" * 20)
