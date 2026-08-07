import socket

ip = socket.gethostbyname("iwouhwizzwwykchgflyk.supabase.co")
print("api host IP:", ip)

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(5)
try:
    sock.connect((ip, 5432))
    print("5432 OPEN on api IP")
except Exception as e:
    print("5432 on api IP:", e)
