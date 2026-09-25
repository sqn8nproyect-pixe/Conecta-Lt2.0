#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fusiona portada + cuerpo en el PDF final (normalizado a A4, con metadatos)."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

COVER = '/home/z/my-project/scripts/chat_plan_assets/cover.pdf'
BODY = '/home/z/my-project/scripts/chat_plan_assets/body.pdf'
OUT = '/home/z/my-project/download/Plan_Chat_CONECTA-LT_Viabilidad.pdf'

TITLE = 'Chat CONECTA-LT — Plan de implementación y estudio de viabilidad'


def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.5 or abs(h - A4_H) > 0.5:
        page.scale_to(A4_W, A4_H)
    return page


def main():
    writer = PdfWriter()
    cover_page = PdfReader(COVER).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    for page in PdfReader(BODY).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': TITLE,
        '/Author': 'Z.ai',
        '/Creator': 'Z.ai',
        '/Subject': 'Plan de implementación y estudio de viabilidad del chat usuario-a-usuario de CONECTA-LT',
    })
    with open(OUT, 'wb') as f:
        writer.write(f)
    r = PdfReader(OUT)
    print(f'OK {OUT} — {len(r.pages)} páginas')


if __name__ == '__main__':
    main()
