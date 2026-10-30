"""Build the Persian visual guide from one content file and isolated screenshots.

Optional documentation dependencies: see docs/user-guide/BUILD.md.
Run from web with Python 3.11+. No backend or credentials are accessed.
"""
from pathlib import Path
import base64
import html
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
# Local optional dependencies do not become application dependencies.
sys.path.insert(0, str(ROOT / 'tmp/pdf-deps'))
import arabic_reshaper
from bidi.algorithm import get_display
from fontTools.ttLib import TTFont as SourceFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

SOURCE = ROOT / 'docs/user-guide'
TEMP = ROOT / 'tmp/pdfs/panel-guide'
OUTPUT = ROOT / 'output/pdf/MakanApp_Panel_User_Guide_FA.pdf'
TEMP.mkdir(parents=True, exist_ok=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
data = json.loads((SOURCE / 'content.json').read_text(encoding='utf-8'))
font_root = ROOT / 'node_modules/@fontsource-variable/vazirmatn/files'
for name, weight in [('Guide', 400), ('GuideBold', 700)]:
    font = SourceFont(font_root / 'vazirmatn-arabic-wght-normal.woff2')
    font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
    # ReportLab identifies embedded faces by PostScript name; keep instances distinct.
    for record in font['name'].names:
        if record.nameID in [1, 2, 4, 6]:
            value = {
                1: 'MakanGuide', 2: 'Bold' if weight == 700 else 'Regular',
                4: 'MakanGuide ' + name, 6: 'MakanGuide-' + name,
            }[record.nameID]
            record.string = value.encode(record.getEncoding())
    font.flavor = None
    path = TEMP / (name + '.ttf')
    font.save(path)
    pdfmetrics.registerFont(TTFont(name, path))

W, H = A4
M = 40
TEXT = HexColor('#20304f')
MUTED = HexColor('#66758c')
PRIMARY = HexColor('#5753df')
SOFT = HexColor('#f1f0ff')
BORDER = HexColor('#e1e5f1')
fa = lambda value: str(value).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
shape = lambda value: get_display(arabic_reshaper.reshape(str(value)), base_dir='R')
layout = []


def lines(value, width, size, font='Guide'):
    result, current = [], ''
    for word in value.split():
        candidate = (current + ' ' + word).strip()
        if current and pdfmetrics.stringWidth(shape(candidate), font, size) > width:
            result.append(current)
            current = word
        else:
            current = candidate
    if current:
        result.append(current)
    if any(pdfmetrics.stringWidth(shape(line), font, size) > width + 1 for line in result):
        raise ValueError('Unbreakable text exceeds its column')
    return result


def paragraph(value, right, y, width, size=10.5, leading=16, font='Guide', color=TEXT):
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines(value, width, size, font):
        c.drawRightString(right, y, shape(line))
        y -= leading
    return y


def image(name, x, top, width, height):
    path = SOURCE / 'images' / (name + '.png')
    with Image.open(path) as picture:
        pw, ph = picture.size
    scale = min(width / pw, height / ph)
    iw, ih = pw * scale, ph * scale
    px, py = x + (width - iw) / 2, top - ih
    c.setFillColor(HexColor('#f8f9fd'))
    c.setStrokeColor(BORDER)
    c.roundRect(px - 4, py - 4, iw + 8, ih + 8, 10, stroke=1, fill=1)
    c.drawImage(str(path), px, py, iw, ih, mask='auto')
    return py


def steps(items, right, top, width):
    y = top
    for index, (title, description) in enumerate(items, 1):
        c.setFillColor(SOFT)
        c.circle(right - 10, y - 2, 10, stroke=0, fill=1)
        c.setFillColor(PRIMARY)
        c.setFont('GuideBold', 10)
        c.drawCentredString(right - 10, y - 6, shape(fa(index)))
        y = paragraph(title, right - 30, y, width - 30, 11.5, 17, 'GuideBold')
        y -= 3
        y = paragraph(description, right - 30, y, width - 30, 10.2, 15.5)
        y -= 15
    return y


c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
c.setTitle(data['title'])
c.setAuthor('MakanApp')
c.setCreator('MakanApp documentation')
c.setSubject('راهنمای تصویری فارسی پنل با تصاویر داده‌های نمونه')
for index, page in enumerate(data['pages'], 1):
    c.setFillColor(HexColor('#ffffff'))
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.bookmarkPage('page-' + str(index))
    c.addOutlineEntry(page['title'], 'page-' + str(index), level=0)
    paragraph('ماکان', W-M, H-38, 110, 22, 27, 'GuideBold', PRIMARY)
    paragraph(page['tag'], W-M-120, H-34, W-2*M-120, 9.2, 14, color=MUTED)
    c.setStrokeColor(BORDER)
    c.line(M, H-57, W-M, H-57)
    y = paragraph(page['title'], W-M, H-92, W-2*M, 22, 30, 'GuideBold') - 2
    y = paragraph(page['intro'], W-M, y, W-2*M, 10.7, 17) - 19
    note_lines = lines(page['note'], W-2*M-28, 9.2)
    note_height = len(note_lines) * 14 + 22
    note_top = 58 + note_height
    c.setFillColor(SOFT)
    c.roundRect(M, 58, W-2*M, note_height, 9, stroke=0, fill=1)
    paragraph(page['note'], W-M-14, note_top-19, W-2*M-28, 9.2, 14, color=TEXT)

    if page['layout'] == 'split':
        bottom = image(page['image'], M+4, y, 211, 340 if page.get('image2') else 440)
        paragraph(page['caption'], M+211, bottom-17, 211, 8, 12, color=MUTED)
        end = steps(page['steps'], W-M, y-4, W-2*M-241)
        if page.get('image2'):
            image(page['image2'], M+4, note_top+115, W-2*M-8, 92)
            end = min(end, note_top+15)
    elif page['layout'] == 'pair':
        half = (W-2*M-24)/2
        bottom_a = image(page['image'], M+4, y, half-8, 245)
        bottom_b = image(page['image2'], M+half+24, y, half-8, 245)
        low = min(bottom_a, bottom_b)
        paragraph(page['caption'], W-M, low-18, W-2*M, 8.5, 13, color=MUTED)
        end = steps(page['steps'], W-M, low-49, W-2*M)
    else:
        bottom = image(page['image'], M+4, y, W-2*M-8, 228)
        paragraph(page['caption'], W-M, bottom-18, W-2*M, 8.5, 13, color=MUTED)
        end = steps(page['steps'], W-M, bottom-48, W-2*M)
        if page.get('image2'):
            if end < note_top + 87:
                raise ValueError(f'Page {index} has no room for its secondary image')
            low = image(page['image2'], M+4, note_top+75, W-2*M-8, 42)
            paragraph(page.get('image2Caption', ''), W-M, low-14, W-2*M, 8, 12, color=MUTED)
    if end < note_top + 8:
        raise ValueError(f'Page {index} overlaps its note: {end:.1f} < {note_top+8:.1f}')
    c.setStrokeColor(BORDER)
    c.line(M, 43, W-M, 43)
    paragraph('راهنمای استفاده از پنل ماکان', W-M, 28, 240, 8, 12, color=MUTED)
    c.setFont('Guide', 8)
    c.setFillColor(MUTED)
    c.drawCentredString(W/2, 28, shape('صفحهٔ ' + fa(index) + ' از ' + fa(len(data['pages']))))
    paragraph(data['date'], M+110, 28, 110, 8, 12, color=MUTED)
    layout.append({'page': index, 'title': page['title'], 'contentBottom': round(end, 1), 'noteTop': note_top, 'overlap': False})
    c.showPage()
c.save()
reader = PdfReader(OUTPUT)
if len(reader.pages) != len(data['pages']):
    raise ValueError('Unexpected PDF page count')

# The browser guide and PDF share content.json and the same screenshot sources.
esc = html.escape
font_css = ''
for part in ['arabic', 'latin']:
    encoded = base64.b64encode((font_root / f'vazirmatn-{part}-wght-normal.woff2').read_bytes()).decode()
    font_css += '@font-face{font-family:V;src:url(data:font/woff2;base64,'+encoded+');font-weight:100 900;'
    font_css += ('unicode-range:U+0000-00FF;' if part == 'latin' else '') + '}'
sections = []
for index, page in enumerate(data['pages'], 1):
    pictures = ''.join(f'<img src="images/{esc(page[key])}.png" alt="{esc(page["caption"])}" loading="lazy">' for key in ['image', 'image2'] if page.get(key))
    body = ''.join(f'<li><h3>{esc(title)}</h3><p>{esc(description)}</p></li>' for title, description in page['steps'])
    sections.append(f'<article id="p{index}"><header><b>ماکان</b><span>{esc(page["tag"])}</span></header><h1>{esc(page["title"])}</h1><p class="intro">{esc(page["intro"])}</p><div class="layout {esc(page["layout"])}"><figure>{pictures}<figcaption>{esc(page["caption"])}</figcaption></figure><ol>{body}</ol></div><aside>{esc(page["note"])}</aside><footer>{esc(data["date"])} · {fa(index)} / {fa(len(data["pages"]))}</footer></article>')
document = '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(data['title'])+'</title><style>'+font_css+'''
*{box-sizing:border-box}body{margin:0;background:#f1f3fa;color:#20304f;font:15px/1.95 V,Arial,sans-serif}nav{max-width:960px;margin:24px auto;padding:18px;background:#fff;border-radius:16px}nav p{margin:4px 0;color:#66758c}nav a{color:#5753df}article{max-width:960px;margin:24px auto;background:#fff;padding:38px 46px;border:1px solid #e1e5f1;border-radius:20px;break-after:page}header{display:flex;align-items:center;gap:24px;border-bottom:1px solid #e1e5f1;padding-bottom:12px}header b{color:#5753df;font-size:28px}header span,figcaption,footer{color:#66758c;font-size:13px}h1{font-size:29px;margin:22px 0 8px;line-height:1.6}.intro{margin-bottom:24px}.layout{display:grid;gap:26px}.split{grid-template-columns:1fr 1fr}.split figure{order:2}.wide figure{max-width:100%;margin:auto}.pair figure{display:flex;flex-wrap:wrap;justify-content:center;gap:16px}.pair img{max-width:44%}figure{margin:0;text-align:center}img{max-width:100%;max-height:530px;object-fit:contain;border:1px solid #e1e5f1;border-radius:12px}figcaption{margin-top:8px;width:100%}ol{margin:0;padding-right:24px}li{padding-right:8px;margin-bottom:19px}li::marker{color:#5753df;font-weight:bold}h3{font-size:17px;margin:0 0 4px}li p{margin:0}aside{padding:14px 18px;border-radius:12px;background:#f1f0ff;margin-top:24px;font-size:14px}footer{margin-top:22px;border-top:1px solid #e1e5f1;padding-top:10px;text-align:center}@media(max-width:680px){article{margin:12px;padding:24px 20px}.split{display:flex;flex-direction:column}.split figure{order:0}.pair img{max-width:100%}}@media print{body{background:white}nav{display:none}article{border:0;border-radius:0;margin:0;max-width:none;break-inside:avoid}}
'''+'</style><nav><b>'+esc(data['title'])+'</b><p>'+esc(data['notice'])+'</p><a href="../../output/pdf/MakanApp_Panel_User_Guide_FA.pdf">دریافت نسخهٔ PDF</a></nav>'+''.join(sections)+'</html>'
(SOURCE / 'index.html').write_text(document, encoding='utf-8')
(TEMP / 'layout.json').write_text(json.dumps(layout, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'pdf': str(OUTPUT), 'html': str(SOURCE / 'index.html'), 'pages': len(reader.pages), 'layoutOverlap': False}))
