#!/usr/bin/env python3
# Numeración + metadatos — Resumen Ejecutivo Conecta LT v2.0
# Esquema pagination.md: portada sin nº, TOC romano "i", cuerpo arábigo desde 1,
# contraportada sin nº.
import fitz

PDF = "/home/z/my-project/download/resumen-ejecutivo-v2/Resumen_Ejecutivo_ConectaLT_v2_Septiembre2026.pdf"
doc = fitz.open(PDF)
n = len(doc)
GRAY = (0.50, 0.55, 0.60)

for i in range(n):
    page = doc[i]
    w, h = page.rect.width, page.rect.height
    if i == 0 or i == n - 1:
        continue  # portada y contraportada sin número
    label = "i" if i == 1 else str(i - 1)  # p2 = TOC romano; cuerpo arábigo desde 1
    fs = 8.5
    tw = fitz.get_text_length(label, fontname="helv", fontsize=fs)
    page.insert_text(fitz.Point((w - tw) / 2, h - 14), label,
                     fontname="helv", fontsize=fs, color=GRAY)

doc.set_metadata({
    "title": "Resumen Ejecutivo Conecta LT — Versión 2.0 (Septiembre 2026)",
    "author": "Sebastián Quintana · Cerotraba",
    "subject": "Resumen ejecutivo actualizado de la guía nocturna de Los Teques: estado de producción, todas las características nuevas (Night Planner v2, carta digital, aforo en tiempo real, cupones, guías editoriales, carrusel multitarjeta), incidente de almacenamiento en Vercel resuelto, seguridad, SEO/GEO, paneles y próximos pasos. Ilustrado con capturas de pantalla reales de conectalt.com. Realizado por Sebastián Quintana, CEO de la agencia de automatizaciones Cerotraba.",
    "creator": "Z.ai",
    "producer": "Playwright (Chromium)",
    "keywords": "Conecta LT, Los Teques, resumen ejecutivo, guía nocturna, Cerotraba, Sebastián Quintana, Vercel, Neon, SEO, GEO",
})
doc.saveIncr()
doc.close()
print(f"OK: numeración estampada y metadatos aplicados ({n} páginas)")
