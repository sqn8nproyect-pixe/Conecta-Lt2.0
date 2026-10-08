"""Extrae elemento LCP + fases + greedy del JSON Lighthouse local."""
import json

with open('/home/z/my-project/.session/psi/lh-mobile-lcp.json') as f:
    d = json.load(f)

a = d['audits']
print('Score:', round(d['categories']['performance']['score'] * 100))
print('LCP:', a['largest-contentful-paint']['displayValue'])
print('FCP:', a['first-contentful-paint']['displayValue'])
print('CLS:', a['cumulative-layout-shift']['displayValue'])
print('TBT:', a['total-blocking-time']['displayValue'])
print('SI:', a['speed-index']['displayValue'])
print()

lcp_el = a.get('largest-contentful-paint-element', {})
for group in lcp_el.get('details', {}).get('items', []):
    for sub in group.get('items', []):
        node = sub.get('node', {})
        if node:
            print('NODO LCP  selector:', node.get('selector'))
            print('NODO LCP  snippet :', node.get('snippet', '')[:220])
            print()

bd = a.get('lcp-breakdown') or a.get('prioritize-lcp-image') or {}
if bd.get('details', {}).get('items'):
    print('--- Fases LCP ---')
    for it in bd['details']['items']:
        print(it.get('phase', ''), '→', it.get('timing', ''), it.get('percent', ''))

print()
print('--- Render-blocking (manual) ---')
for it in a.get('render-blocking-resources', {}).get('details', {}).get('items', []):
    print(f"{it['url'][:90]}  {it.get('wastedMs')}ms")

print()
print('--- Top unused JS ---')
for it in a.get('unused-javascript', {}).get('details', {}).get('items', [])[:5]:
    print(f"{it['url'][:90]}  potencial {it.get('wastedBytes', 0)//1024}KB")

print()
print('--- Mainthread work ---')
mt = a.get('mainthread-work-breakdown', {}).get('details', {}).get('items', [])
for it in mt[:6]:
    print(f"{it.get('groupLabel','')}: {it.get('duration',0)/1000:.1f}s")
