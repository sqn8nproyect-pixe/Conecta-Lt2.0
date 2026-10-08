"""Zooms finos del capture PSI para leer títulos de auditorías y el elemento img/video."""
from PIL import Image

SRC = '/home/z/my-project/upload/pasted_image_1791431013668.png'
OUT = '/home/z/my-project/upload'

img = Image.open(SRC)
zones = {
    'p1_oport1_header': (778, 495, 1120, 532),
    'p2_imagenes_header': (778, 598, 1120, 628),
    'p3_elemento_video': (810, 720, 1035, 840),
    'p4_js_header': (778, 895, 1120, 930),
}
S = 6
for name, box in zones.items():
    crop = img.crop(box)
    w, h = crop.size
    big = crop.resize((w * S, h * S), Image.LANCZOS)
    big.save(f'{OUT}/{name}.png')
    print('saved', name, big.size)
