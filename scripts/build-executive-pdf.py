#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Conectalt — Documento Ejecutivo (PDF)
Genera un PDF profesional describiendo qué es Conectalt.
Salida: /home/z/my-project/public/downloads/conectalt-documento-ejecutivo.pdf
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, PageBreak, KeepTogether, NextPageTemplate,
    HRFlowable, Image, Flowable,
)
from reportlab.platypus.flowables import HRFlowable

# ─────────────────────────────────────────────────────────────
# FONTS — Liberation Sans (body) + Liberation Serif (headings)
# Robusto para Latin/Español, sin dependencias exóticas.
# ─────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts/truetype/liberation'
pdfmetrics.registerFont(TTFont('Sans',       f'{FONT_DIR}/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold',  f'{FONT_DIR}/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Italic', f'{FONT_DIR}/LiberationSans-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Sans-BoldItalic', f'{FONT_DIR}/LiberationSans-BoldItalic.ttf'))
registerFontFamily('Sans', normal='Sans', bold='Sans-Bold', italic='Sans-Italic', boldItalic='Sans-BoldItalic')

pdfmetrics.registerFont(TTFont('Serif',      f'{FONT_DIR}/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Serif-Bold', f'{FONT_DIR}/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Serif-Italic', f'{FONT_DIR}/LiberationSerif-Italic.ttf'))
registerFontFamily('Serif', normal='Serif', bold='Serif-Bold', italic='Serif-Italic')

pdfmetrics.registerFont(TTFont('Mono', f'{FONT_DIR}/LiberationMono-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Mono-Bold', f'{FONT_DIR}/LiberationMono-Bold.ttf'))

# ─────────────────────────────────────────────────────────────
# PALETTE — dark mode con acentos dorados (alineado a Conectalt)
# Generada con palette.cascade --mode dark
# ─────────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#0f0e0d')   # casi negro, fondo página
SECTION_BG    = colors.HexColor('#1c1b18')   # bloques de sección
CARD_BG       = colors.HexColor('#25231d')   # tarjetas
TABLE_STRIPE  = colors.HexColor('#1d1c19')
HEADER_FILL   = colors.HexColor('#57503d')
COVER_BLOCK   = colors.HexColor('#1a1815')
BORDER        = colors.HexColor('#5f5843')
ICON          = colors.HexColor('#b5a882')
ACCENT        = colors.HexColor('#d4af37')   # oro Conectalt
ACCENT_2      = colors.HexColor('#8266d5')
TEXT_PRIMARY  = colors.HexColor('#e8e6e0')
TEXT_MUTED    = colors.HexColor('#908e87')
SEM_SUCCESS   = colors.HexColor('#87c39b')
SEM_WARNING   = colors.HexColor('#bba881')
SEM_ERROR     = colors.HexColor('#c17871')

# ─────────────────────────────────────────────────────────────
# DOCUMENT GEOMETRY
# ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN_L = 22 * mm
MARGIN_R = 22 * mm
MARGIN_T = 28 * mm
MARGIN_B = 25 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

OUTPUT_PATH = '/home/z/my-project/public/downloads/conectalt-documento-ejecutivo.pdf'

# ─────────────────────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────────────────────
S = {}
S['cover_eyebrow'] = ParagraphStyle(
    'cover_eyebrow', fontName='Mono-Bold', fontSize=9, textColor=ACCENT,
    alignment=TA_LEFT, leading=12, spaceAfter=8,
    letterSpace=2,
)
S['cover_title'] = ParagraphStyle(
    'cover_title', fontName='Serif-Bold', fontSize=46, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leading=50, spaceAfter=8,
)
S['cover_subtitle'] = ParagraphStyle(
    'cover_subtitle', fontName='Serif-Italic', fontSize=18, textColor=ICON,
    alignment=TA_LEFT, leading=24, spaceAfter=24,
)
S['cover_summary_label'] = ParagraphStyle(
    'cover_summary_label', fontName='Mono-Bold', fontSize=8, textColor=ACCENT,
    alignment=TA_LEFT, leading=11, spaceAfter=6, letterSpace=2,
)
S['cover_summary'] = ParagraphStyle(
    'cover_summary', fontName='Sans', fontSize=11, textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY, leading=16, spaceAfter=6,
)
S['cover_meta'] = ParagraphStyle(
    'cover_meta', fontName='Mono', fontSize=8, textColor=TEXT_MUTED,
    alignment=TA_LEFT, leading=12,
)
S['cover_meta_strong'] = ParagraphStyle(
    'cover_meta_strong', fontName='Mono-Bold', fontSize=8, textColor=ACCENT,
    alignment=TA_LEFT, leading=12,
)
S['h1_eyebrow'] = ParagraphStyle(
    'h1_eyebrow', fontName='Mono-Bold', fontSize=8, textColor=ACCENT,
    alignment=TA_LEFT, leading=11, spaceAfter=4, letterSpace=2,
)
S['h1'] = ParagraphStyle(
    'h1', fontName='Serif-Bold', fontSize=22, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leading=28, spaceAfter=10,
)
S['h2'] = ParagraphStyle(
    'h2', fontName='Sans-Bold', fontSize=13, textColor=ACCENT,
    alignment=TA_LEFT, leading=18, spaceBefore=14, spaceAfter=6,
)
S['body'] = ParagraphStyle(
    'body', fontName='Sans', fontSize=10.5, textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY, leading=15.5, spaceAfter=8,
)
S['body_muted'] = ParagraphStyle(
    'body_muted', fontName='Sans-Italic', fontSize=9.5, textColor=TEXT_MUTED,
    alignment=TA_LEFT, leading=13, spaceAfter=8,
)
S['bullet'] = ParagraphStyle(
    'bullet', fontName='Sans', fontSize=10.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leading=15, leftIndent=14, bulletIndent=2, spaceAfter=4,
)
S['stat_num'] = ParagraphStyle(
    'stat_num', fontName='Serif-Bold', fontSize=28, textColor=ACCENT,
    alignment=TA_CENTER, leading=32, spaceAfter=2,
)
S['stat_label'] = ParagraphStyle(
    'stat_label', fontName='Mono-Bold', fontSize=7.5, textColor=TEXT_MUTED,
    alignment=TA_CENTER, leading=10, letterSpace=1.5,
)
S['card_title'] = ParagraphStyle(
    'card_title', fontName='Sans-Bold', fontSize=11, textColor=ACCENT,
    alignment=TA_LEFT, leading=14, spaceAfter=6,
)
S['card_body'] = ParagraphStyle(
    'card_body', fontName='Sans', fontSize=9.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leading=13.5, spaceAfter=0,
)
S['table_head'] = ParagraphStyle(
    'table_head', fontName='Mono-Bold', fontSize=8.5, textColor=ACCENT,
    alignment=TA_LEFT, leading=11, letterSpace=1.2,
)
S['table_cell'] = ParagraphStyle(
    'table_cell', fontName='Sans', fontSize=9.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leading=13.5,
)
S['footer'] = ParagraphStyle(
    'footer', fontName='Mono', fontSize=7.5, textColor=TEXT_MUTED,
    alignment=TA_LEFT, leading=10, letterSpace=1.2,
)
S['footer_right'] = ParagraphStyle(
    'footer_right', fontName='Mono-Bold', fontSize=7.5, textColor=ACCENT,
    alignment=TA_RIGHT, leading=10, letterSpace=1.2,
)

# ─────────────────────────────────────────────────────────────
# PAGE TEMPLATES — Cover (no header/footer) + Body (with header/footer)
# ─────────────────────────────────────────────────────────────
def draw_cover_bg(canvas, doc):
    """Cover page background — dark with gold accent stripes."""
    canvas.saveState()
    # Full dark background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Left gold stripe (vertical, accent)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, 0, 6 * mm, PAGE_H, fill=1, stroke=0)
    # Top thin gold line
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_L, PAGE_H - 18 * mm, PAGE_W - MARGIN_R, PAGE_H - 18 * mm)
    # Bottom thin gold line
    canvas.line(MARGIN_L, 18 * mm, PAGE_W - MARGIN_R, 18 * mm)
    # Footer mono label
    canvas.setFont('Mono-Bold', 7.5)
    canvas.setFillColor(ACCENT)
    canvas.drawString(MARGIN_L, 12 * mm, 'CONECTA-LT  ·  DOCUMENTO EJECUTIVO  ·  LOS TEQUES, MIRANDA')
    canvas.setFont('Mono', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawRightString(PAGE_W - MARGIN_R, 12 * mm, 'Edición 2026 · Uso interno y comercial')
    canvas.restoreState()

def draw_body_bg(canvas, doc):
    """Body page background + header/footer chrome."""
    canvas.saveState()
    # Full dark background
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Top header strip
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_L, PAGE_H - 18 * mm, PAGE_W - MARGIN_R, PAGE_H - 18 * mm)
    # Header text
    canvas.setFont('Mono-Bold', 7.5)
    canvas.setFillColor(ACCENT)
    canvas.drawString(MARGIN_L, PAGE_H - 14 * mm, 'CONECTA-LT')
    canvas.setFont('Mono', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN_L + 32 * mm, PAGE_H - 14 * mm, 'Documento Ejecutivo · Qué es Conectalt')
    canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 14 * mm, f'Edición 2026')
    # Bottom footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(MARGIN_L, 16 * mm, PAGE_W - MARGIN_R, 16 * mm)
    canvas.setFont('Mono', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN_L, 11 * mm, 'conectalt.com  ·  Los Teques, Miranda, Venezuela')
    canvas.setFont('Mono-Bold', 7.5)
    canvas.setFillColor(ACCENT)
    canvas.drawRightString(PAGE_W - MARGIN_R, 11 * mm, f'Página {doc.page - 1}')
    canvas.restoreState()

# ─────────────────────────────────────────────────────────────
# CONTENT BUILDERS
# ─────────────────────────────────────────────────────────────
def cover_page():
    """Cover page content."""
    story = []
    story.append(Spacer(1, 60 * mm))
    story.append(Paragraph('DOCUMENTO EJECUTIVO  ·  EDICIÓN 2026', S['cover_eyebrow']))
    story.append(Paragraph('Conectalt', S['cover_title']))
    story.append(Paragraph('La guía nocturna de Los Teques.', S['cover_subtitle']))

    # Gold rule
    story.append(HRFlowable(width=60 * mm, thickness=2, color=ACCENT, spaceAfter=18))

    # Summary block
    story.append(Paragraph('RESUMEN EJECUTIVO', S['cover_summary_label']))
    story.append(Paragraph(
        'Conectalt es la plataforma digital de descubrimiento y conexión para la vida '
        'nocturna de Los Teques, Venezuela. Reúne en un solo lugar a licorerías, tascas '
        'y discotecas, ofreciendo a los usuarios un directorio inteligente con mapa '
        'interactivo, reservas en tiempo real, promociones verificadas, reseñas '
        'genuinas y un recomendador personalizado de planes nocturnos llamado '
        '<b>Night Planner</b>. Para los comercios, proporciona un panel de control '
        'para gestionar su presencia, atender reservas, publicar promociones y '
        'reportar aforo en vivo. La plataforma opera bajo estricta verificación de '
        'edad (18+) y cumplimiento de la normativa venezolana sobre consumo '
        'responsable de alcohol.',
        S['cover_summary']
    ))
    story.append(Spacer(1, 16 * mm))

    # Meta block (2-col table)
    meta_rows = [
        [Paragraph('PLATAFORMA', S['cover_summary_label']),
         Paragraph('Web (Next.js 16) + App futura', S['cover_meta'])],
        [Paragraph('DOMINIO', S['cover_summary_label']),
         Paragraph('conectalt.com', S['cover_meta_strong'])],
        [Paragraph('UBICACIÓN', S['cover_summary_label']),
         Paragraph('Los Teques, Estado Miranda, Venezuela', S['cover_meta'])],
        [Paragraph('AUDIENCIA', S['cover_summary_label']),
         Paragraph('Adultos 18+ residentes o visitantes de Los Teques', S['cover_meta'])],
        [Paragraph('SECTORES', S['cover_summary_label']),
         Paragraph('Licorerías · Tascas · Discotecas', S['cover_meta'])],
        [Paragraph('CONTACTO', S['cover_summary_label']),
         Paragraph('sqn8nproyect@gmail.com', S['cover_meta_strong'])],
    ]
    meta_table = Table(meta_rows, colWidths=[35 * mm, CONTENT_W - 35 * mm])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -2), 0.3, BORDER),
    ]))
    story.append(meta_table)

    story.append(NextPageTemplate('body'))
    story.append(PageBreak())
    return story


def section_header(eyebrow, title):
    """Section header with eyebrow label and big title."""
    return [
        Paragraph(eyebrow, S['h1_eyebrow']),
        Paragraph(title, S['h1']),
        HRFlowable(width=40 * mm, thickness=1.5, color=ACCENT, spaceAfter=12),
    ]


def stats_row(stats):
    """3-column stats row. stats = [(num, label), ...]"""
    cells = []
    for num, label in stats:
        cells.append([
            Paragraph(num, S['stat_num']),
            Paragraph(label, S['stat_label']),
        ])
    # Transpose into single row of N columns, each cell stacked vertically
    row_data = []
    for c in cells:
        # Each cell is a nested mini-table for vertical stacking
        mini = Table([[c[0]], [c[1]]], colWidths=[CONTENT_W / len(stats) - 4])
        mini.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        row_data.append(mini)
    t = Table([row_data], colWidths=[CONTENT_W / len(stats)] * len(stats))
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
        ('LINEAFTER', (0, 0), (-2, -1), 0.4, BORDER),
    ]))
    return t


def card(title, body, accent_color=ACCENT):
    """Single card with title + body. Used in feature grid."""
    inner = [
        Paragraph(title, S['card_title']),
        Paragraph(body, S['card_body']),
    ]
    t = Table([[c] for c in inner], colWidths=[None])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, accent_color),
    ]))
    return t


def card_grid_2col(items, accent_color=ACCENT):
    """Grid of cards, 2 columns."""
    rows = []
    for i in range(0, len(items), 2):
        left = card(items[i][0], items[i][1], accent_color)
        right = card(items[i + 1][0], items[i + 1][1], accent_color) if i + 1 < len(items) else ''
        rows.append([left, right])
    col_w = (CONTENT_W - 6) / 2
    t = Table(rows, colWidths=[col_w, col_w])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def bullet_list(items):
    """Custom bullet list with gold square markers."""
    rows = []
    for it in items:
        rows.append([
            Paragraph('<font color="#d4af37">■</font>', ParagraphStyle(
                'bullet_marker', fontName='Sans-Bold', fontSize=8,
                textColor=ACCENT, alignment=TA_LEFT, leading=15,
            )),
            Paragraph(it, S['bullet']),
        ])
    t = Table(rows, colWidths=[10, CONTENT_W - 10])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


# ─────────────────────────────────────────────────────────────
# BUILD STORY
# ─────────────────────────────────────────────────────────────
story = []

# === COVER PAGE ===
story.extend(cover_page())

# === PAGE 2: ¿Qué es Conectalt? + Misión/Visión/Valores ===
story.extend(section_header('01  ·  PRESENTACIÓN', '¿Qué es Conectalt?'))

story.append(Paragraph(
    'Conectalt es la plataforma digital que organiza, visibiliza y conecta la oferta '
    'de vida nocturna de Los Teques, capital del Estado Miranda, Venezuela. Nace '
    'para resolver un problema concreto: la dispersión de información sobre bares, '
    'licorerías, tascas y discotecas de la ciudad, que obliga a los usuarios a '
    'consultar múltiples redes sociales, chats de WhatsApp y listas desactualizadas '
    'para planificar una salida. Al mismo tiempo, los comercios carecen de un canal '
    'único y profesional para promocionar sus ofertas, gestionar reservas y '
    'comunicarse con su clientela.',
    S['body']
))

story.append(Paragraph(
    'La plataforma resuelve esta fricción integrando cinco capas de valor en un '
    'mismo producto: un directorio enriquecido de comercios con fotografías, '
    'horarios y ubicación; un mapa interactivo con geolocalización; un sistema de '
    'reservas con control de aforo en tiempo real; un motor de promociones con '
    'códigos de canje verificables; y un recomendador inteligente de seis pasos '
    'llamado Night Planner que sugiere locales según las preferencias del usuario. '
    'Todo bajo verificación estricta de edad (18+) y cumplimiento de la normativa '
    'venezolana sobre consumo responsable de alcohol.',
    S['body']
))

story.append(Spacer(1, 8))
story.append(stats_row([
    ('21', 'COMERCIOS ACTIVOS'),
    ('6.027', 'EVENTOS DE ANALYTICS'),
    ('42', 'PROMOCIONES PUBLICADAS'),
]))
story.append(Spacer(1, 14))

# Misión / Visión / Valores en cards horizontales
story.extend(section_header('02  ·  IDENTIDAD', 'Misión, Visión y Valores'))

story.append(Paragraph('Misión', S['h2']))
story.append(Paragraph(
    'Conectar a los habitantes y visitantes de Los Teques con la vida nocturna '
    'de la ciudad, ofreciendo una plataforma confiable, moderna y segura donde '
    'descubrir lugares, reservar mesas, aprovechar promociones y compartir '
    'experiencias. Al mismo tiempo, empoderar a los comercios con herramientas '
    'digitales que antes solo estaban al alcance de grandes cadenas: panel de '
    'control, gestión de reservas, métricas de visitas y canal directo de '
    'promociones hacia su clientela.',
    S['body']
))

story.append(Paragraph('Visión', S['h2']))
story.append(Paragraph(
    'Convertir a Conectalt en la referencia obligatoria de la noche de Los '
    'Teques para 2027, y sentar las bases para expandir el modelo a otras '
    'ciudades de Venezuela. Aspiramos a que la plataforma sea el punto de '
    'partida natural de cualquier plan nocturno en la región, integrando '
    'comercios, usuarios y autoridades locales en un ecosistema digital '
    'transparente, responsable y vibrante.',
    S['body']
))

story.append(Paragraph('Valores', S['h2']))
story.append(card_grid_2col([
    ('Descubrimiento',
     'Curamos y enriquecemos la información de cada comercio para que el usuario '
     'encuentre exactamente lo que busca, sin fricción ni datos desactualizados.'),
    ('Conexión real',
     'No somos un directorio pasivo: conectamos usuarios y comercios mediante '
     'reservas, promociones y mensajería directa por WhatsApp.'),
    ('Comunidad local',
     'Cada negocio listado es parte del tejido económico de Los Teques. '
     'Trabajamos para visibilizar al comerciante independiente, no solo al grande.'),
    ('Responsabilidad',
     'Verificación de edad obligatoria, promoción del consumo responsable de '
     'alcohol y cumplimiento de la legislación venezolana aplicable.'),
]))

story.append(PageBreak())

# === PAGE 3: Propuesta de valor + Features ===
story.extend(section_header('03  ·  PROPUESTA DE VALOR', 'Por qué Conectalt es diferente'))

story.append(Paragraph(
    'Existen alternativas como Instagram, Google Maps o listados de WhatsApp, pero '
    'ninguna combina descubrimiento, reservas, promociones y recomendación '
    'personalizada en un producto único enfocado en Los Teques. Conectalt ocupa '
    'ese espacio con un enfoque hiperlocal: conocemos los barrios, los horarios '
    'reales de cada comercio y las dinámicas culturales de la ciudad. Esto '
    'permite ofrecer una experiencia que las plataformas globales no pueden replicar.',
    S['body']
))

story.append(Paragraph('Funcionalidades principales', S['h2']))
story.append(card_grid_2col([
    ('Directorio enriquecido',
     '21 comercios activos con fichas detalladas: 10 fotografías por local, '
     'horarios, categoría (licorería, tasca, discoteca), ubicación, redes sociales '
     'y enlace directo a WhatsApp.'),
    ('Mapa interactivo',
     'Visualización geolocalizada de todos los comercios con tu ubicación en '
     'tiempo real. Filtrado por categoría, distancia y estado de apertura.'),
    ('Reservas con aforo en vivo',
     'Sistema de reservas gratuito que respeta el aforo real reportado por cada '
     'comercio. El usuario ve cuántos cupos quedan antes de reservar.'),
    ('Promociones con códigos',
     'Cada comercio puede publicar promos con título, descripción, vigencia y '
     'código de canje opcional. El usuario presenta el código en el local.'),
    ('Night Planner',
     'Recomendador de 6 pasos que sugiere locales según vibe, bebida preferida, '
     'presupuesto, zona, horario y tamaño del grupo. Devuelve ranking con score '
     'y razones de cada recomendación.'),
    ('Dashboard de dueños',
     'Panel exclusivo para comercios con 3 pestañas: Info del local, Reservas '
     'y Promociones. Actualización de aforo en un clic, métricas de visitas y '
     'gestión completa de la presencia digital.'),
    ('Reseñas y ratings',
     'Usuarios autenticados pueden calificar locales de 1 a 5 estrellas y dejar '
     'reseñas textuales. Sistema de promedio visible en cada ficha.'),
    ('Favoritos y notificaciones',
     'Marcar locales favoritos para acceso rápido. Sistema de notificaciones '
     'in-app para reservas confirmadas, nuevas promos y novedades.'),
]))

story.append(PageBreak())

# === PAGE 4: Audiencia + Modelo + Tecnología ===
story.extend(section_header('04  ·  MERCADO', 'Audiencia objetivo y modelo'))

story.append(Paragraph('Audiencia objetivo', S['h2']))
story.append(bullet_list([
    '<b>Usuarios finales (B2C):</b> Adultos de 18 a 45 años residentes o visitantes '
    'de Los Teques que buscan planes nocturnos. Perfil principal: jóvenes '
    'profesionales, estudiantes universitarios y parejas que valoran la '
    'información veraz antes de salir.',
    '<b>Dueños de comercios (B2B):</b> Licorerías, tascas y discotecas de Los '
    'Teques que necesitan visibilidad digital, gestión de reservas y un canal '
    'profesional de promociones. Típicamente negocios independientes sin '
    'presupuesto para marketing digital propio.',
    '<b>Visitantes y turistas:</b> Personas que llegan a Los Teques por trabajo, '
    'familia o eventos y necesitan descubrir la oferta nocturna local sin '
    'depender de recomendaciones verbales.',
]))

story.append(Spacer(1, 8))
story.append(Paragraph('Modelo de negocio', S['h2']))
story.append(Paragraph(
    'Conectalt opera con un modelo híbrido de monetización escalable:',
    S['body']
))

# Table: revenue streams
table_data = [
    [Paragraph('STREAM', S['table_head']),
     Paragraph('DESCRIPCIÓN', S['table_head']),
     Paragraph('ESTADO', S['table_head'])],
    [Paragraph('Listado básico gratuito', S['table_cell']),
     Paragraph('Ficha en el directorio con datos esenciales para cualquier '
               'comercio verificado. Sin costo para el comercio ni el usuario.',
               S['table_cell']),
     Paragraph('Activo', S['table_cell'])],
    [Paragraph('Dashboard premium', S['table_cell']),
     Paragraph('Panel avanzado para dueños: métricas detalladas, promociones '
               'ilimitadas, gestión multi-local y reportes de aforo históricos.',
               S['table_cell']),
     Paragraph('Roadmap 2026', S['table_cell'])],
    [Paragraph('Promociones destacadas', S['table_cell']),
     Paragraph('Posicionamiento premium en home y push a usuarios cercanos '
               'para promociones pagadas por el comercio.',
               S['table_cell']),
     Paragraph('Roadmap 2026', S['table_cell'])],
    [Paragraph('Publicidad contextual', S['table_cell']),
     Paragraph('Espacios publicitarios no intrusivos en el mapa y en fichas '
               'de locales relacionados (ej: marca de cerveza en licorerías).',
               S['table_cell']),
     Paragraph('Roadmap 2027', S['table_cell'])],
]
t = Table(table_data, colWidths=[42 * mm, 90 * mm, 32 * mm])
t.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [SECTION_BG, TABLE_STRIPE]),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ('LINEBELOW', (0, 0), (-1, 0), 1, ACCENT),
    ('LINEAFTER', (0, 1), (-2, -1), 0.3, BORDER),
]))
story.append(t)

story.append(Spacer(1, 14))
story.append(Paragraph('Stack tecnológico', S['h2']))
story.append(Paragraph(
    'Conectalt está construido sobre tecnología moderna de grado productivo, '
    'alojada en infraestructura cloud confiable:',
    S['body']
))
story.append(bullet_list([
    '<b>Frontend:</b> Next.js 16 con App Router, TypeScript estricto, Tailwind CSS 4 '
    'y componentes shadcn/ui. Animaciones con Framer Motion.',
    '<b>Backend:</b> API routes de Next.js (no server actions), Prisma 6 como ORM, '
    'autenticación con NextAuth v4 y Google OAuth.',
    '<b>Base de datos:</b> PostgreSQL alojado en Neon (serverless Postgres con '
    'branching y pooling automático).',
    '<b>Hosting:</b> Vercel (región iad1) con dominio custom conectalt.com y SSL '
    'automático. Cero configuración de servidores.',
    '<b>Mapas:</b> react-leaflet + Leaflet (OpenStreetMap). Sin dependencia de '
    'Google Maps API, lo que reduce costos y mejora privacidad.',
    '<b>Estado:</b> Zustand para cliente, TanStack Query para cache de servidor. '
    'Patrones modernos de React 19.',
]))

story.append(PageBreak())

# === PAGE 5: Cumplimiento + Contacto ===
story.extend(section_header('05  ·  CUMPLIMIENTO', 'Marco legal y responsabilidad'))

story.append(Paragraph(
    'Conectalt opera bajo un marco legal estricto, alineado con la legislación '
    'venezolana y las mejores prácticas de plataformas digitales con contenido '
    'para adultos:',
    S['body']
))

story.append(bullet_list([
    '<b>Verificación de edad obligatoria:</b> El acceso al sitio exige '
    'confirmación explícita de mayoría de edad (18+) mediante un AgeGate '
    'cinematográfico. El consentimiento se registra en sessionStorage.',
    '<b>Política de Privacidad:</b> Documento público que detalla qué datos se '
    'recopilan (Google OAuth, reservas, favoritos, analytics), con qué base '
    'legal (Constitución de Venezuela Art. 60, Ley Especial contra Delitos '
    'Informáticos), y cómo ejercer los derechos ARCO.',
    '<b>Términos de Uso:</b> Reglas claras sobre aceptación, edad mínima, '
    'registro de cuenta, reservas, contenido de usuario, propiedad intelectual '
    'y jurisdicción (tribunales de Miranda).',
    '<b>Consumo responsable de alcohol:</b> Banner permanente en el footer '
    'recordando "Solo mayores de 18 años · Si bebes, no conduzcas · Consumo '
    'responsable". Promoción activa de cultura de responsabilidad.',
    '<b>Datos de usuarios:</b> Autenticación exclusivamente vía Google OAuth. '
    'No se almacenan contraseñas en la plataforma. Las cookies de sesión se '
    'manejan con flags de seguridad (HttpOnly, Secure, SameSite).',
    '<b>Seguridad de la información:</b> Toda la comunicación cifrada con HTTPS '
    '(TLS 1.3 vía Vercel). Control de acceso basado en roles (RBAC) con tres '
    'niveles: USER, BUSINESS_OWNER y ADMIN. El acceso admin está restringido '
    'por allowlist de emails verificada en tres capas.',
]))

story.append(Spacer(1, 14))
story.append(Paragraph('Estado actual del proyecto', S['h2']))

# Status table
status_data = [
    [Paragraph('COMPONENTE', S['table_head']),
     Paragraph('ESTADO', S['table_head']),
     Paragraph('NOTAS', S['table_head'])],
    [Paragraph('Producción en conectalt.com', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Operativo</b></font>', S['table_cell']),
     Paragraph('Vercel + Neon PostgreSQL, dominio custom con SSL', S['table_cell'])],
    [Paragraph('Google OAuth en conectalt.com', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Operativo</b></font>', S['table_cell']),
     Paragraph('Funciona en apex (conectalt.com)', S['table_cell'])],
    [Paragraph('Páginas legales (Privacidad + Términos)', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Desplegado</b></font>', S['table_cell']),
     Paragraph('12 secciones privacidad + 15 secciones términos', S['table_cell'])],
    [Paragraph('Google Safe Browsing', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Limpio</b></font>', S['table_cell']),
     Paragraph('Bloqueo levantado el 24-Ago-2026', S['table_cell'])],
    [Paragraph('Night Planner v2', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Operativo</b></font>', S['table_cell']),
     Paragraph('Recomendador de 6 pasos con scoring 0-100', S['table_cell'])],
    [Paragraph('Dashboard de owners', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Operativo</b></font>', S['table_cell']),
     Paragraph('3 tabs: Info, Reservas, Promociones', S['table_cell'])],
    [Paragraph('Panel de administración', S['table_cell']),
     Paragraph('<font color="#87c39b"><b>Operativo</b></font>', S['table_cell']),
     Paragraph('Acceso por email allowlist + RBAC', S['table_cell'])],
    [Paragraph('Chatbot con n8n', S['table_cell']),
     Paragraph('<font color="#bba881"><b>En pruebas</b></font>', S['table_cell']),
     Paragraph('VPS Hostinger Brasil, FAQ conversacional', S['table_cell'])],
]
t2 = Table(status_data, colWidths=[55 * mm, 28 * mm, 81 * mm])
t2.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [SECTION_BG, TABLE_STRIPE]),
    ('TOPPADDING', (0, 0), (-1, -1), 7),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
    ('LINEBELOW', (0, 0), (-1, 0), 1, ACCENT),
    ('LINEAFTER', (0, 1), (-2, -1), 0.3, BORDER),
]))
story.append(t2)

story.append(Spacer(1, 14))
story.append(Paragraph('Contacto y próximos pasos', S['h2']))
story.append(Paragraph(
    'Para oportunidades de inversión, alianzas comerciales, registro de '
    'comercios o consultas generales sobre Conectalt, el canal oficial de '
    'contacto es:',
    S['body']
))

# Contact block — gold accent box
contact_inner = [
    Paragraph('CONTACTO OFICIAL', S['cover_summary_label']),
    Spacer(1, 4),
    Paragraph('sqn8nproyect@gmail.com', ParagraphStyle(
        'contact_email', fontName='Mono-Bold', fontSize=14,
        textColor=ACCENT, alignment=TA_LEFT, leading=18,
    )),
    Spacer(1, 4),
    Paragraph('Los Teques, Estado Miranda, Venezuela', S['cover_meta']),
    Spacer(1, 4),
    Paragraph('Sitio web: conectalt.com', S['cover_meta_strong']),
]
ct = Table([[c] for c in contact_inner], colWidths=[CONTENT_W - 24])
ct.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 16),
    ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ('LINEABOVE', (0, 0), (-1, 0), 1.5, ACCENT),
    ('LINEBELOW', (0, -1), (-1, -1), 0.5, BORDER),
]))
story.append(ct)

story.append(Spacer(1, 16))
story.append(Paragraph(
    '<i>Documento generado el 24 de agosto de 2026. La información contenida '
    'refleja el estado del proyecto a esa fecha y puede evolucionar conforme '
    'se implementen nuevas funcionalidades.</i>',
    S['body_muted']
))

# ─────────────────────────────────────────────────────────────
# BUILD DOCUMENT
# ─────────────────────────────────────────────────────────────
class ConectaltDoc(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        # Cover template (no header/footer chrome, full bleed bg)
        cover_frame = Frame(
            MARGIN_L, MARGIN_B,
            CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B,
            leftPadding=0, rightPadding=0,
            topPadding=0, bottomPadding=0,
            id='cover',
            showBoundary=0,
        )
        # Body template (with header/footer chrome)
        body_frame = Frame(
            MARGIN_L, MARGIN_B,
            CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B,
            leftPadding=0, rightPadding=0,
            topPadding=0, bottomPadding=0,
            id='body',
            showBoundary=0,
        )
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[cover_frame], onPage=draw_cover_bg),
            PageTemplate(id='body', frames=[body_frame], onPage=draw_body_bg),
        ])

# Build
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
doc = ConectaltDoc(
    OUTPUT_PATH,
    pagesize=A4,
    title='Conectalt — Documento Ejecutivo',
    author='CONECTA-LT',
    subject='Qué es Conectalt: plataforma de vida nocturna de Los Teques',
    creator='CONECTA-LT',
)
doc.build(story)
print(f'PDF generated: {OUTPUT_PATH}')
print(f'Size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB')
