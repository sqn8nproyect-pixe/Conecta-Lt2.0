#!/usr/bin/env python3
"""Verificación en vivo de Pusher en producción (https://conectalt.com).
1. Home 200.
2. La clave NEXT_PUBLIC_PUSHER_KEY (build-time) debe aparecer en el HTML o en
   los chunks /_next/static cargados por la home (Navbar import use-chat-badge-sync).
3. Endpoints de chat: 405 en GET pusher/auth (ruta POST-only viva),
   401 en POST pusher/auth y GET chat/users (sin sesión).
Uso: python3 scripts/verify-live.py
"""
import json
import re
import sys
import urllib.error
import urllib.request

BASE = "https://conectalt.com"
KEY = "1e1cb50260627f0f2c2b"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"}


def get(url, timeout=25, headers=None):
    req = urllib.request.Request(url, headers=headers or UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", "ignore")


def probe(method, path):
    req = urllib.request.Request(
        BASE + path, method=method,
        data=b"{}" if method == "POST" else None,
        headers={**UA, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return f"ERR:{e}"


def main():
    ok = True
    st, html = get(BASE + "/")
    print(f"home: HTTP {st} ({len(html)} bytes)")
    ok &= st == 200

    found = KEY in html
    if found:
        print("clave Pusher inline en HTML ✓")
    else:
        chunks = re.findall(r'(?:src|href)="(/_next/static/[^"]+\.js[^"]*)"', html)
        print(f"chunks referenciados en la home: {len(chunks)}")
        for i, u in enumerate(chunks[:30]):
            try:
                s, js = get(BASE + u)
            except Exception as e:
                print(f"  chunk {i} fallo: {e}")
                continue
            if KEY in js:
                print(f"clave Pusher horneada en {u} ✓")
                found = True
                break
        if not found:
            print("clave Pusher NO hallada en HTML ni en los primeros 30 chunks")

    ok &= found

    for method, path, esperado in (
        ("GET", "/api/chat/pusher/auth", (405,)),
        ("POST", "/api/chat/pusher/auth", (401,)),
        ("GET", "/api/chat/users", (401,)),
        ("GET", "/api/chat/conversations", (401,)),
    ):
        code = probe(method, path)
        marca = "✓" if code in esperado else "✗"
        ok &= code in esperado
        print(f"{marca} {method} {path} → {code} (esperado {esperado})")

    print("RESULTADO:", "TODO OK ✓" if ok else "REVISAR ✗")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
