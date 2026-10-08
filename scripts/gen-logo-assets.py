#!/usr/bin/env python3
"""Genera assets optimizados del logo desde public/images/logo.png (1254×1254, 946KB).
   - logo.webp     512×512 q82 → <img> de Navbar/Footer/AgeGate (~20KB)
   - logo-192.png  192×192    → favicon/apple-touch/shortcut (~15KB)
   - og-logo.png   512×512    → openGraph + JSON-LD (~40-60KB)
   NO toca logo.png original (referencia/fallback)."""
from PIL import Image
import os

SRC = '/home/z/my-project/public/images/logo.png'
OUT = '/home/z/my-project/public/images'

im = Image.open(SRC).convert('RGB')

jobs = [
    ('logo.webp', 512, dict(format='WEBP', quality=82, method=6)),
    ('logo-192.png', 192, dict(format='PNG', optimize=True)),
    ('og-logo.png', 512, dict(format='PNG', optimize=True)),
]

for name, size, kwargs in jobs:
    dst = os.path.join(OUT, name)
    im.resize((size, size), Image.LANCZOS).save(dst, **kwargs)
    print(f"{name:16s} {size}×{size}  {round(os.path.getsize(dst)/1024)} KB")

print(f"\noriginal logo.png: {round(os.path.getsize(SRC)/1024)} KB (sin tocar)")
