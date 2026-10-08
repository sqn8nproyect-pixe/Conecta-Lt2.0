#!/usr/bin/env python3
"""Parsea lh-mobile.json → resumen ejecutivo de Lighthouse para conectalt.com"""
import json, sys

d = json.load(open('/home/z/my-project/.session/psi/lh-mobile.json'))
lr = d
cats = lr['categories']
print('=== PUNTAJES (0-100) ===')
for k, c in cats.items():
    print(f"  {k:15s}: {round(c['score']*100)}")

a = lr['audits']

def s(ref, dec=1):
    v = a.get(ref, {}).get('score')
    return 'n/a' if v is None else round(v, dec)

print('\n=== MÉTRICAS (lab, móvil) ===')
for m in ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time',
          'cumulative-layout-shift', 'speed-index', 'interactive']:
    au = a.get(m, {})
    val = au.get('displayValue', 'n/a')
    sc = au.get('score')
    print(f"  {m:28s}: {val:14s} score={sc}")

print('\n=== FIELD DATA (CrUX usuarios reales) ===')
le = d.get('loadingExperience')
if le and le.get('metrics'):
    print('  overall:', le.get('overall_category'))
    for k, v in le['metrics'].items():
        print(f"  {k:28s}: {v.get('percentile')} ({v.get('category')})")
else:
    print('  (sin datos CrUX — sitio con poco tráfico aún)')

print('\n=== OPPORTUNITIES (ahorro estimado) ===')
opps = []
for k, au in a.items():
    det = au.get('details') or {}
    sav = det.get('overallSavingsMs') or 0
    savb = det.get('overallSavingsBytes') or 0
    if sav > 0 or savb > 0:
        opps.append((sav, savb, k, au.get('displayValue', '')))
for sav, savb, k, dv in sorted(opps, reverse=True):
    extra = f" | {round(savb/1024)} KB" if savb else ''
    print(f"  {k:34s}: {round(sav)} ms{extra}  ({dv})")

print('\n=== DIAGNÓSTICOS con score bajo (impacto render) ===')
for k in ['render-blocking-resources', 'unused-javascript', 'uses-responsive-images',
          'modern-image-formats', 'uses-optimized-images', 'offscreen-images',
          'mainthread-work-breakdown', 'bootup-time', 'dom-size', 'font-display',
          'uses-long-cache-ttl', 'server-response-time', 'third-party-summary',
          'lcp-lazy-loaded', 'priority-hints', 'layout-shifts', 'lcp-breakdown']:
    au = a.get(k)
    if au and au.get('score') is not None and au['score'] < 0.9:
        dv = au.get('displayValue', '')
        print(f"  [{round(au['score'],2)}] {k}: {dv}")

print('\n=== ACCESIBILIDAD / SEO / BP items fallados ===')
for cat in ['accessibility', 'best-practices', 'seo']:
    failed = []
    for ref in cats[cat]['auditRefs']:
        au = a.get(ref['id'], {})
        if au.get('score') is not None and au['score'] < 1:
            failed.append(f"{ref['id']} ({round(au['score'],2)})")
    print(f"  {cat}: {', '.join(failed) if failed else 'todo OK'}")

print('\n=== LCP: elemento y desglose ===')
lcpel = a.get('largest-contentful-paint-element')
if lcpel:
    items = (lcpel.get('details') or {}).get('items', [])
    try:
        el = items[0]['items'][0].get('node', {}).get('snippet', 'n/a')
        print('  elemento LCP:', el[:200])
    except Exception:
        pass
bd = a.get('lcp-breakdown') or a.get('largest-contentful-paint-element')
for k in ['lcp-phases']:
    au = a.get(k)
    if au and au.get('details'):
        for it in au['details'].get('items', []):
            print('  fase:', it.get('phase'), it.get('timing'), 'ms' if it.get('timing') else '')
