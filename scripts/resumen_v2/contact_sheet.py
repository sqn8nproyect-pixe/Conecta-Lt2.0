#!/usr/bin/env python3
"""Mapa de contacto del PDF: renderiza cada página en miniatura a una grilla
para inspección visual rápida de huérfanas/desequilibrios."""
import fitz, sys

PDF = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/download/resumen-ejecutivo-v2/Resumen_Ejecutivo_ConectaLT_v2_Septiembre2026.pdf"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/z/my-project/scripts/pdf_assets/resumen_v2_grid.png"

doc = fitz.open(PDF)
n = len(doc)
zoom = 0.32
pixes = []
for p in doc:
    pm = p.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    pixes.append(pm)

pw, ph = pixes[0].width, pixes[0].height
cols = 6
rows = (n + cols - 1) // cols
pad = 10
W = cols * pw + (cols + 1) * pad
H = rows * ph + (rows + 1) * pad
sheet = fitz.open()
page = sheet.new_page(width=W, height=H)
for i, pm in enumerate(pixes):
    r, c = divmod(i, cols)
    x = pad + c * (pw + pad)
    y = pad + r * (ph + pad)
    page.insert_image(fitz.Rect(x, y, x + pw, y + ph), pixmap=pm)
    page.insert_text(fitz.Point(x + 4, y + 12), str(i + 1), fontsize=9, color=(1, 0.2, 0.2))
pix = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6))
pix.save(OUT)
# También texto por página para chequear contenido
print(f"paginas: {n}")
for i, p in enumerate(doc):
    txt = p.get_text().strip().replace("\n", " ")[:80]
    print(f"p{i+1:02d}: {txt}")
