# Monta la comparativa de las 3 variantes (escaparate para el dueño).
from PIL import Image, ImageDraw, ImageFont

BASE = "/home/z/my-project/download/sugerencias-anuncios"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

FILAS = [
    ("OPCIÓN A — VITRINA: arte completo sobre fondo oscuro sólido (marco de galería)", "A-vitrina"),
    ("OPCIÓN B — COLOR DEL ARTE: el fondo toma el color del arte, muy oscurecido (tipo Spotify)", "B-color-arte"),
    ("OPCIÓN C — ANUNCIO NATIVO: arte + panel con título y botón dorado VER MÁS (estilo del sitio)", "C-anuncio-nativo"),
]
CAPS = [("01-cuadrada-blanca.png", "LOGO BLANCO"), ("02-flyer-rojo.png", "FLYER ROJO"), ("03-flyer-vertical.png", "FLYER VERTICAL")]

PW, PH = 400, 281  # panel desktop escalado
MW, MH = 132, 285  # panel móvil escalado
PAD, TITLE_H, HDR = 14, 44, 64

W = PAD + 3 * (PW + PAD) + MW + PAD * 2
H = HDR + len(FILAS) * (TITLE_H + PH + PAD) + PAD
canvas = Image.new("RGB", (W, H), (10, 10, 20))
d = ImageDraw.Draw(canvas)

f_h = ImageFont.truetype(F, 26)
f_t = ImageFont.truetype(F, 21)
f_c = ImageFont.truetype(F, 15)

d.text((PAD, 20), "SUGERENCIAS PARA EL CARRUSEL DE ANUNCIOS — conectalt.com", font=f_h, fill=(212, 175, 55))

y = HDR
for titulo, carpeta in FILAS:
    d.text((PAD, y + 8), titulo, font=f_t, fill="white")
    y += TITLE_H
    for i, (arch, cap) in enumerate(CAPS):
        im = Image.open(f"{BASE}/{carpeta}/{arch}").resize((PW, PH), Image.LANCZOS)
        x = PAD + i * (PW + PAD)
        canvas.paste(im, (x, y))
        d.rectangle([x, y, x + PW, y + PH], outline=(60, 60, 80), width=1)
        d.text((x + 4, y + PH + 2), cap, font=f_c, fill=(170, 170, 185))
    im = Image.open(f"{BASE}/{carpeta}/04-movil-blanca.png").resize((MW, MH), Image.LANCZOS)
    x = PAD + 3 * (PW + PAD) + PAD
    canvas.paste(im, (x, y - 2))
    d.rectangle([x, y - 2, x + MW, y - 2 + MH], outline=(60, 60, 80), width=1)
    d.text((x + 4, y + PH + 2), "MÓVIL", font=f_c, fill=(170, 170, 185))
    y += PH + PAD

canvas.save(f"{BASE}/00-COMPARATIVA.png")
print("OK", canvas.size)
