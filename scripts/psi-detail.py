#!/usr/bin/env python3
"""Detalle profundo: LCP, unused JS, layout shift, bootup, third parties"""
import json

d = json.load(open('/home/z/my-project/.session/psi/lh-mobile.json'))
a = d['audits']

def items(k):
    au = a.get(k) or {}
    return ((au.get('details') or {}).get('items')) or []

def kb(b):
    return f"{round(b/1024)} KB" if b else "—"

print('=== 1) ELEMENTO LCP (qué tarda 13.2s) ===')
for it in items('largest-contentful-paint-element'):
    sub = it.get('items', [])
    for s in sub:
        node = s.get('node') or {}
        print('  selector:', node.get('selector', '—'))
        print('  snippet :', (node.get('snippet') or '—')[:250])
        print('  url     :', s.get('url') or node.get('url') or '—')
# fases LCP
for it in items('lcp-lazy-loaded'):
    print('  lazy-loaded warning:', json.dumps(it)[:150])
au = a.get('prioritize-lcp-image') or {}
print('  prioritize-lcp-image score:', au.get('score'), au.get('displayValue',''))

print('\n=== 2) UNUSED JS por script (top 12) ===')
rows = []
for it in items('unused-javascript'):
    rows.append((it.get('wastedBytes', 0), it.get('wastedMilliseconds', 0), it.get('url', '?')))
for wb, wm, url in sorted(rows, reverse=True)[:12]:
    print(f"  {kb(wb):>9} {wm:>6} ms  {url.split('?')[0][-100:]}")

print('\n=== 3) LAYOUT SHIFT (fuentes) ===')
for it in items('layout-shifts'):
    for s in (it.get('subItems', {}) or {}).get('items', []):
        n = s.get('node') or s.get('extra', {}).get('node') or {}
        print('  score:', round(it.get('score', 0), 3), '|', (n.get('selector') or s.get('cause','—'))[:120])
        print('    snippet:', (n.get('snippet') or '')[:180])

print('\n=== 4) BOOTUP-TIME (JS que bloquea hilo, top 10) ===')
rows = []
for it in items('bootup-time'):
    rows.append((it.get('total', 0), it.get('scripting', 0), it.get('url', '?')))
for tot, scr, url in sorted(rows, reverse=True)[:10]:
    print(f"  {round(tot):>5} ms (eval {round(scr)} ms)  {url.split('?')[0][-95:]}")

print('\n=== 5) THIRD PARTIES ===')
for it in items('third-party-summary')[:0]:
    pass
tp = a.get('third-party-summary') or {}
for it in ((tp.get('details') or {}).get('items') or [])[:10]:
    ent = it.get('entity') or {}
    print(f"  blocking={round(it.get('blockingTime',0))} ms  size={kb(it.get('transferSize',0))}  {ent.get('text','?')}")

print('\n=== 6) DOM / fuente render-block / fuentes ===')
print('  dom-size:', a.get('dom-size', {}).get('displayValue'))
for it in items('render-blocking-resources'):
    print('  render-block:', it.get('url', '')[-90:], kb(it.get('wastedBytes', 0)))
for it in items('font-display'):
    print('  font-display:', it.get('url', '')[-90:])
for it in items('lcp-breakdown'):
    pass
au = a.get('network-requests') or {}
nets = ((au.get('details') or {}).get('items')) or []
print(f'\n=== 7) Requests totales: {len(nets)} | transfer total: {kb(sum(n.get("transferSize",0) for n in nets))} ===')
big = sorted(nets, key=lambda n: n.get('transferSize', 0), reverse=True)[:15]
for n in big:
    print(f"  {kb(n.get('transferSize',0)):>9}  {n.get('resourceType','?'):10s} {n.get('priority','?'):8s} {str(n.get('url',''))[-90:]}")
