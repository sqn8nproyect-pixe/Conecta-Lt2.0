"""P1.3: logo-cerotraba.png (136KB) → webp liviano para el crédito del footer.
Se muestra a h-6 (24px); 256px de altura cubre retina 8x con holgura."""
from PIL import Image

SRC = '/home/z/my-project/public/images/logo-cerotraba.png'
OUT = '/home/z/my-project/public/images/logo-cerotraba.webp'

img = Image.open(SRC)
w, h = img.size
print(f'original: {w}x{h}, {len(open(SRC, "rb").read())//1024}KB')

target_h = 256
target_w = round(w * target_h / h)
if img.mode in ('RGBA', 'P', 'LA'):
    img = img.convert('RGBA')
else:
    img = img.convert('RGB')

img.resize((target_w, target_h), Image.LANCZOS).save(
    OUT, 'WEBP', quality=85, method=6
)
import os
print(f'generado: {target_w}x{target_h}, {os.path.getsize(OUT)//1024}KB')
