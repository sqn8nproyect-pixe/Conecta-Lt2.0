#!/usr/bin/env python3
"""Observa un deployment de Vercel hasta que termine (READY/ERROR/CANCELED).
Uso: python3 scripts/vercel-watch.py <TOKEN_VERCEL> <DEPLOY_ID>
- Imprime cambios de readyState.
- En ERROR vuelca las últimas líneas de build log.
- Sale 0 en READY, 2 en ERROR/CANCELED, 3 si se agota el tiempo de esta corrida.
"""
import json
import sys
import time
import urllib.error
import urllib.request

TOKEN, DID = sys.argv[1], sys.argv[2]
BASE = "https://api.vercel.com"
MAX_SECS = 8.5 * 60


def get(path, timeout=30):
    req = urllib.request.Request(f"{BASE}{path}", headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}


def dump_logs():
    st, ev = get(f"/v2/deployments/{DID}/events?limit=100&builds=1")
    if st != 200:
        print(f"  (no pude leer eventos: HTTP {st})")
        return
    lines = []
    for e in ev.get("events", []):
        txt = (e.get("payload") or {}).get("text") or ""
        if txt:
            lines.append(txt)
    print("---- últimas líneas del build log ----")
    for ln in lines[-45:]:
        print("  " + ln.rstrip())


def main():
    last = None
    t0 = time.time()
    while time.time() - t0 < MAX_SECS:
        st, d = get(f"/v13/deployments/{DID}")
        if st != 200:
            print(f"HTTP {st}: {json.dumps(d)[:200]}")
            time.sleep(15)
            continue
        rs = d.get("readyState")
        if rs != last:
            mm = int(time.time() - t0) // 60
            print(f"[+{mm}m] readyState={rs} url={d.get('url')}")
            last = rs
        if rs == "READY":
            alias = d.get("alias") or []
            print("DEPLOY READY ✓")
            print("aliases:", json.dumps(alias) if alias else "(alias asignado luego)")
            sys.exit(0)
        if rs in ("ERROR", "CANCELED"):
            print(f"DEPLOY FALLO: {rs}")
            dump_logs()
            sys.exit(2)
        time.sleep(20)
    print("TIMEOUT de esta corrida (el build sigue) — re-ejecutar el watcher.")
    sys.exit(3)


if __name__ == "__main__":
    main()
