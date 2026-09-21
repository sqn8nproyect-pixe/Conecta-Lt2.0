#!/usr/bin/env python3
"""Prepara el entorno del Resumen Ejecutivo v2 (visual):
- download/resumen-ejecutivo-v2/capturas/  (JPG optimizados reutilizados del manual v2)
- download/resumen-ejecutivo-v2/fonts/     (CSS de fuentes TTF data-URI)
- scripts/resumen_v2/assets/cerotraba.b64  (logo para incrustar)
"""
import os
import shutil

ROOT = "/home/z/my-project"
SRC_CAP = os.path.join(ROOT, "download/manual-implementacion-v2/capturas")
SRC_FONTS = os.path.join(ROOT, "download/manual-implementacion-v2/fonts/fonts-ttf-inline.css")
OUT = os.path.join(ROOT, "download/resumen-ejecutivo-v2")
CAP_OUT = os.path.join(OUT, "capturas")
FONTS_OUT = os.path.join(OUT, "fonts")
ASSETS = os.path.join(ROOT, "scripts/resumen_v2/assets")

os.makedirs(CAP_OUT, exist_ok=True)
os.makedirs(FONTS_OUT, exist_ok=True)
os.makedirs(ASSETS, exist_ok=True)

# 1) Capturas reales (ya optimizadas JPEG q88 en el manual v2)
copied = 0
for f in sorted(os.listdir(SRC_CAP)):
    if f.endswith(".jpg"):
        shutil.copy(os.path.join(SRC_CAP, f), os.path.join(CAP_OUT, f))
        copied += 1
size = sum(os.path.getsize(os.path.join(CAP_OUT, f)) for f in os.listdir(CAP_OUT))
print(f"capturas: {copied} JPEG copiados ({size/1e6:.2f} MB)")

# 2) Fuentes TTF data-URI (reuso)
shutil.copy(SRC_FONTS, os.path.join(FONTS_OUT, "fonts-ttf-inline.css"))
print("fonts: fonts-ttf-inline.css copiado")

# 3) Logo Cerotraba -> base64 (reuso del manual v2)
shutil.copy(os.path.join(ROOT, "scripts/manual_v2/assets/cerotraba.b64"),
            os.path.join(ASSETS, "cerotraba.b64"))
print("logo cerotraba:", os.path.getsize(os.path.join(ASSETS, 'cerotraba.b64')) // 1024, "KB b64")
print("OK setup")
