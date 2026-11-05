"""Build the Persian backend audit from structured evidence with ReportLab.

Use the bundled Python runtime (reportlab, pypdf, Pillow) and system libfribidi.
FriBidi shapes and reorders each already-wrapped line. PDF ActualText retains
the logical Unicode text for copying/searching; API paths remain left-to-right.
"""
import ctypes
import ctypes.util
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable, KeepInFrame, PageBreak, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/product/BACKEND_AUDIT_20261104_FA.json'
CHECKS = ROOT / 'docs/quality/BACKEND_AUDIT_20261104_CHECKS.json'
OUT = ROOT / 'output/pdf/MakanApp_Backend_Gaps_Test_Report_FA_20261104.pdf'
BLUE = colors.HexColor('#176FEA')
INK = colors.HexColor('#182A45')
MUTED = colors.HexColor('#5C6D85')
LINE = colors.HexColor('#D9E4F4')
PALE = colors.HexColor('#EDF4FF')
DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')

lib = ctypes.CDLL(ctypes.util.find_library('fribidi'))
U32, INT = ctypes.c_uint32, ctypes.c_int
lib.fribidi_get_bidi_type.argtypes = [U32]
lib.fribidi_get_bidi_type.restype = U32
lib.fribidi_log2vis.argtypes = [
    ctypes.POINTER(U32), INT, ctypes.POINTER(U32), ctypes.POINTER(U32),
    ctypes.POINTER(INT), ctypes.POINTER(INT), ctypes.c_void_p,
]
lib.fribidi_log2vis.restype = None
RTL = lib.fribidi_get_bidi_type(ord('\u05d0'))


@lru_cache(maxsize=8192)
def visual(text):
    if not text:
        return text
    source = (U32 * len(text))(*map(ord, text))
    destination = (U32 * len(text))()
    direction = U32(RTL)
    lib.fribidi_log2vis(source, len(text), ctypes.byref(direction), destination, None, None, None)
    return ''.join(map(chr, destination))


def actual(canvas, text):
    canvas.addLiteral('/Span << /ActualText <FEFF' + text.encode('utf-16-be').hex().upper() + '> >> BDC')


class Text(Flowable):
    def __init__(self, text, size=10.4, bold=False, color=INK, leading=None,
                 left=False, pad=0, after=5):
        super().__init__()
        self.text = str(text)
        self.size = size
        self.font = 'Mono' if left else ('FaBold' if bold else 'Fa')
        self.color = color
        self.leading = leading or size * 1.65
        self.left = left
        self.pad = pad
        self.spaceAfter = after
        self.lines = []

    def display(self, text):
        return text if self.left else visual(text)

    def width_of(self, text):
        return pdfmetrics.stringWidth(self.display(text), self.font, self.size)

    def wrap(self, availWidth, availHeight):
        width = availWidth - self.pad * 2
        self.lines = []
        for paragraph in self.text.split('\n'):
            if not paragraph:
                self.lines.append('')
                continue
            current = ''
            for word in paragraph.split():
                trial = (current + ' ' + word).strip()
                if self.width_of(trial) <= width:
                    current = trial
                    continue
                if current:
                    self.lines.append(current)
                    current = ''
                # Break a long API identifier only when it cannot fit the line.
                chunk = ''
                for char in word:
                    if chunk and self.width_of(chunk + char) > width:
                        self.lines.append(chunk)
                        chunk = ''
                    chunk += char
                current = chunk
            if current:
                self.lines.append(current)
        self.width = availWidth
        self.height = len(self.lines) * self.leading + self.pad * 2
        return self.width, self.height

    def split(self, availWidth, availHeight):
        self.wrap(availWidth, availHeight)
        count = int((availHeight - self.pad * 2) // self.leading)
        if count < 2 or count >= len(self.lines):
            return []
        options = dict(size=self.size, bold=self.font == 'FaBold', color=self.color,
                       leading=self.leading, left=self.left, pad=self.pad, after=self.spaceAfter)
        return [Text('\n'.join(self.lines[:count]), **options),
                Text('\n'.join(self.lines[count:]), **options)]

    def draw(self):
        c = self.canv
        c.setFont(self.font, self.size)
        c.setFillColor(self.color)
        y = self.height - self.pad - self.size
        for line in self.lines:
            actual(c, line + '\n')
            if self.left:
                c.drawString(self.pad, y, line)
            else:
                c.drawRightString(self.width - self.pad, y, self.display(line))
            c.addLiteral('EMC')
            y -= self.leading


def title(text):
    return Text(text, 19, bold=True, leading=28, after=15)


def heading(text):
    return Text(text, 12, bold=True, color=BLUE, after=7)


def paragraph(text, size=10.4):
    return Text(text, size=size)


def bullet(text):
    return Text('• ' + text, size=10, after=4)


def code(text):
    return Text(text, size=8.1, leading=12, left=True, after=4)


def table(headers, rows, widths, size=9.3):
    # Input columns are in logical RTL order; Table columns are physical LTR.
    data = [[Text(h, size, bold=True, color=BLUE, leading=size * 1.5, after=0) for h in reversed(headers)]]
    for row in rows:
        data.append([Text(value, size, leading=size * 1.55, after=0) for value in reversed(row)])
    result = Table(data, colWidths=list(reversed(widths)), hAlign='RIGHT', repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PALE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7FAFF')]),
        ('LINEBELOW', (0, 0), (-1, 0), .8, LINE),
        ('LINEBELOW', (0, 1), (-1, -1), .35, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return result


def page_header(c, doc):
    w, h = A4
    c.setFillColor(BLUE)
    c.rect(0, h - 8, w, 8, fill=1, stroke=0)
    logo = ROOT / 'public/brand/makan-logo-v2.webp'
    if logo.exists():
        c.drawImage(str(logo), w - 73, h - 58, width=27, height=27, mask='auto')
    c.setFillColor(MUTED)
    c.setFont('Fa', 8.5)
    c.drawRightString(w - 83, h - 45, visual('ماکان | گزارش آزمون و درخواست تکمیل بک‌اند'))
    c.setStrokeColor(LINE)
    c.line(45, h - 68, w - 45, h - 68)
    c.line(45, 40, w - 45, 40)
    c.setFont('Fa', 8)
    c.drawRightString(w - 45, 25, visual('۴ نوامبر ۲۰۲۶ | محیط تست | 80c2e61'))
    c.drawString(45, 25, visual('صفحه ' + str(doc.page).translate(DIGITS)))


def section(story, text):
    story.extend([PageBreak(), title(text)])


def finding(story, item):
    story.append(heading(item['id'] + ' | ' + item['title']))
    story.append(paragraph('اولویت: ' + item['priority'] + '    •    نوع: ' + item['kind'], 9.5))
    story.append(paragraph('شاهد: ' + item['evidence']))
    story.append(paragraph('اثر: ' + item['impact']))
    story.append(paragraph('درخواست: ' + item['request']))
    story.append(Text('معیار پذیرش', 10.3, bold=True, after=3))
    for item_text in item['acceptance']:
        story.append(bullet(item_text))
    if item['endpoints']:
        story.append(Text('مسیرهای موجود و مرتبط', 9, bold=True, color=MUTED, after=4))
        story.extend(code(endpoint) for endpoint in item['endpoints'])
    for source in item['sources']:
        story.append(Text('شاهد مرجع: ' + source, 8.4, color=MUTED, after=3))
    story.append(Spacer(1, 10))


def main():
    font_dir = ROOT / 'public/fonts/makan-reference'
    for name, filename in [('Fa', 'Vazirmatn-Regular.ttf'), ('FaBold', 'Vazirmatn-Bold.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(font_dir / filename), shapable=False))
    pdfmetrics.registerFont(TTFont('Mono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', shapable=False))
    document = json.loads(SOURCE.read_text())
    checks = json.loads(CHECKS.read_text()) if CHECKS.exists() else {}
    unit = checks.get('unit', {}).get('passed', 'در حال بررسی')
    browser = checks.get('browser', {}).get('passed', 'در حال بررسی')
    live = checks.get('live', {})
    story = [Spacer(1, 8), Text('گزارش آزمون و\nکمبودهای بک‌اند ماکان', 28, bold=True, leading=43, after=16)]
    story.append(Text(document['dateFa'], 11, color=MUTED, after=10))
    story.append(paragraph(document['scope']))
    story.append(code(document['backend']))
    story.append(Spacer(1, 12))
    story.append(table(['بخش', 'نتیجهٔ اجرای این نوبت'], [
        ['آزمون واحد', str(unit).translate(DIGITS) + ' موفق؛ نتیجهٔ واقعی و تازه'],
        ['مرورگر', str(browser).translate(DIGITS) + ' موفق؛ محیط fixture محلی'],
        ['سرور زنده', 'پنج نقش؛ ' + str(live.get('directRequests', 113)).translate(DIGITS) + ' درخواست مستقیم و ' + str(live.get('readinessRequests', 72)).translate(DIGITS) + ' درخواست آمادگی/دسترسی'],
        ['برنامه و BFF', 'پنج نقش؛ ' + str(live.get('bffChecks', 110)).translate(DIGITS) + ' بررسی درخواست و نمایش'],
    ], [130, 375]))
    story.append(Spacer(1, 16))
    story.append(heading('ابتدا این سه مورد پیگیری شوند'))
    for text in ['آماده‌سازی گروه و کانال رسمی داده‌های موجود و بررسی علت ۴۰۴ اعلان انتشار.',
                 'تکمیل قرارداد دعوت ارسالی، مدیریت نقش و ویرایش/ساخت امن کلاس سازمانی.',
                 'آماده‌سازی Web Push و پیش‌نیازهای AI/پرداخت فقط برای قابلیت‌های مصوبِ قابل عرضه.']:
        story.append(bullet(text))
    story.append(Spacer(1, 10))
    story.append(paragraph(document['interpretation'], 9.5))

    section(story, 'روش آزمون و معنای نتیجه')
    story.append(table(['لایه', 'وضعیت و دامنه'], [
        ['واحد', f'{unit} تست؛ اعتبارسنجی، BFF، نشست، مجوز منبع، فرمان پایدار و تعامل‌های مدل.'],
        ['مرورگر', f'{browser} سناریو در Chrome و fixture محلی؛ نوشتن‌های آموزشی و پیام‌رسان به سرور واقعی ارسال نمی‌شوند.'],
        ['قرارداد', 'GET زندهٔ OpenAPI: ۴۳۳ عملیات، ۷۰۲ schema؛ تعداد و مسیرهای عملیات با snapshot برابرند.'],
        ['خواندن زنده', 'Student، Teacher، Parent، Manager و Personal؛ نشست QA مستقل، خروج در پایان و حفظ زمینه.'],
        ['برنامهٔ متصل', 'BFF و سه صفحهٔ پیام‌ها، منابع و درخواست تشکیل برای هر پنج نقش؛ نوشتن ناخواسته مسدود است.'],
        ['بررسی منفی زنده', '۹ موردِ ۴۰۱/۴۰۳ مورد انتظار: ناشناس، پروندهٔ سازمان برای Teacher/Student و کلاس عمومی برای Parent/Personal.'],
        ['نصب و runtime', '۱۶ آزمون setup و ۹ آزمون runtime؛ Docker شبیه‌سازی‌شده/سرور موقت، بدون اجرای استقرار مقصد.'],
        ['کنترل‌های کد', 'lint، TypeScript، generated و قالب‌بندی؛ SDK کلاینت ۲۷۷ عملیات و ۴۹۲ schema، بدون platform-admin.'],
    ], [115, 390]))
    story.append(Spacer(1, 12))
    story.append(heading('چرا موفقیت تست، کمبود محصول را رد نمی‌کند؟'))
    story.append(paragraph('GET زوج رسمی با پاسخ درست ۲۰۰ می‌تواند state=Missing داشته باشد. آزمون transport و قرارداد موفق است، اما مقصد محصول آماده نیست. ۴۰۴ مشاهده‌شدهٔ اعلان، داخل گزارش جدا آمده و به موفقیت تحویل تبدیل نشده است.'))
    story.append(paragraph('آمار آزمون‌های بک‌اندِ درج‌شده در PDF ورودی بازاجرا نشده و به اعداد این گزارش اضافه نشده است. سناریوهای نوشتن fixture، گواهی DB یا ACL واقعی محسوب نمی‌شوند.'))
    story.append(paragraph('اجرای کامل مرورگر: ۲۰۸ موفق و یک شکست هنگام بسته‌شدن context با route.fetch فعال. تست با انتظار صریح برای پاسخ، بررسی اتصال کلاس و انتظار پایان handler اصلاح شد؛ بازاجرای هر ۱۲ سناریوی همان فایل موفق بود. آخرین نتیجهٔ هر ۲۰۹ سناریوی یکتا موفق است؛ شکست اولیه حفظ شده و retry خودکار صفر است.', 9.5))

    groups = [
        ('یافته‌های زنده: فضاهای رسمی و اعلان', ['OPS-01', 'OPS-02']),
        ('پیش‌نیازهای محیط: Push و هوش مصنوعی', ['OPS-03', 'OPS-04']),
        ('مدیریت آموزشگاه: دعوت و نقش', ['API-01', 'API-02']),
        ('کلاس سازمانی: ویرایش و ثبت مطمئن', ['API-03']),
        ('هویت مجاز و گزارش‌های مدیریتی', ['API-04', 'API-05']),
        ('آزمون و نتیجهٔ آموزشی', ['API-06', 'API-07']),
        ('تجارت، پشتیبانی و حساب', ['API-08', 'API-09']),
        ('جزئیات پیام‌رسان و دامنهٔ بعدی', ['API-10', 'NEXT-01']),
    ]
    by_id = {item['id']: item for item in document['findings']}
    for text, ids in groups:
        section(story, text)
        content = []
        for item_id in ids:
            finding(content, by_id[item_id])
        story.append(KeepInFrame(505, 640, content, mode='shrink', hAlign='RIGHT'))

    section(story, 'موارد رفع‌شده؛ دوباره درخواست نشوند')
    story.append(paragraph('این جدول اصلاح تاریخچهٔ API_GAPS است. وجود قرارداد به معنی موفقیت تمام mutationهای زنده نیست، ولی دیگر نباید این موارد را «فاقد API» معرفی کرد.'))
    story.append(table(['موضوع', 'وضعیت امروز'], document['resolved'], [110, 395], size=9.1))

    section(story, 'پذیرش مشترک لازم روی بک‌اند واقعی')
    story.append(paragraph('موارد این صفحه معیار تحویل‌اند؛ در این نوبت روی سرور واقعی انجام نشده‌اند و باگ اثبات‌شده نامیده نمی‌شوند. حساب/دادهٔ QA اختصاصی و برنامهٔ پاکسازی یا نگهداشت آزمایش لازم است.'))
    for index, (name, text) in enumerate(document['acceptance'], 1):
        story.append(heading(str(index).translate(DIGITS) + ' - ' + name))
        story.append(paragraph(text, 10))

    section(story, 'شواهد، بازتولید و حدود بررسی')
    for text in document['limitations']:
        story.append(bullet(text))
    story.append(Spacer(1, 10))
    story.append(heading('فایل‌های شاهد در web/docs/quality'))
    for name in ['BACKEND_AUDIT_20261104_CHECKS.json', 'BACKEND_AUDIT_20261104_LIVE_READS.json',
                 'BACKEND_AUDIT_20261104_LIVE_BFF.json', 'BACKEND_AUDIT_20261104_READINESS.json',
                 'BACKEND_AUDIT_20261104_CONTRACT.json']:
        story.append(code(name))
    story.append(heading('دستورهای بازتولید'))
    story.extend(code(command) for command in [
        'npm test', 'PLAYWRIGHT_CHANNEL=chrome npx playwright test',
        'MAKAN_TEST_READ_SMOKE=1 node scripts/audit-backend-readiness.mjs',
        'MAKAN_DEPLOY_TEST_RUNNER=bwrap python3 tests/deployment/test_setup.py',
        'python3 tests/deployment/test_runtime.py',
    ])
    story.append(paragraph('ابزار زنده فقط برای اپراتور محلی و سرور تست مشخص است؛ وارد CI نیست. توکن، کوکی، شمارهٔ حساب‌ها و شناسهٔ خصوصی منابع در گزارش قرار نگرفته‌اند.', 9.1))
    if checks.get('contract', {}).get('sha256'):
        story.append(code('OpenAPI SHA256: ' + checks['contract']['sha256']))

    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else OUT
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=45, leftMargin=45,
                            topMargin=85, bottomMargin=55,
                            title=document['title'], author='MakanApp',
                            subject='Verified frontend tests and backend contract/environment gaps; Test server 8090')
    doc.build(story, onFirstPage=page_header, onLaterPages=page_header)
    print(json.dumps({'pdf': str(output), 'bytes': output.stat().st_size,
                      'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
