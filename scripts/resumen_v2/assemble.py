#!/usr/bin/env python3
"""Ensambla el HTML final del Resumen Ejecutivo v2:
concatena las partes, inyecta el CSS de fuentes (TTF data-URI) y sustituye
el placeholder del logo Cerotraba por su data-URI base64.
"""
import os

BASE = "/home/z/my-project"
PARTS = os.path.join(BASE, "scripts/resumen_v2")
FONTS_CSS = os.path.join(BASE, "download/resumen-ejecutivo-v2/fonts/fonts-ttf-inline.css")
CEROTRABA_B64 = os.path.join(BASE, "scripts/resumen_v2/assets/cerotraba.b64")
OUT_HTML = os.path.join(BASE, "download/resumen-ejecutivo-v2/resumen-ejecutivo-conectalt-v2.html")

order = [
    "part0_head.html",
    "part1_cover_toc.html",
    "part2_sec01_02.html",
    "part3_sec02b_03.html",
    "part4_sec04_05.html",
    "part5_sec06_07_creditos.html",
]

html = "\n".join(open(os.path.join(PARTS, p), encoding="utf-8").read() for p in order)

# 1) fuentes embebidas (antes de </head>)
fonts = open(FONTS_CSS, encoding="utf-8").read()
html = html.replace("</head>", f"<style>{fonts}</style>\n</head>")

# 2) logo cerotraba
b64 = open(CEROTRABA_B64).read().strip()
html = html.replace("{{CEROTRABA}}", b64)

# sanity: no quedan placeholders
assert "{{CEROTRABA}}" not in html, "placeholder sin reemplazar"

with open(OUT_HTML, "w", encoding="utf-8") as fh:
    fh.write(html)

print(f"OK: {OUT_HTML} ({os.path.getsize(OUT_HTML)/1e6:.2f} MB)")
