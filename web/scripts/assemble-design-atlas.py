"""Combine verified PDF chunks and add Persian bookmarks, index links and the UI inventory."""
import json
import sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import Link
from pypdf.generic import Fit, RectangleObject
ROOT = Path(__file__).resolve().parents[1]
preview = '--preview' in sys.argv
folder = ROOT / 'tmp' / 'pdfs' / ('design-atlas-preview' if preview else 'design-atlas')
index = json.loads((folder / 'index.json').read_text())
writer = PdfWriter()
for number in range(1, (len(index['pages']) + 13) // 14 + 1):
    chunk = folder / f'chunk-{number:03d}.pdf'
    writer.append(str(chunk), import_outline=False)
if len(writer.pages) != len(index['pages']):
    raise RuntimeError('Unexpected printed page count')
parents = {}
for chapter in index['chapters']:
    parents[chapter['section']] = writer.add_outline_item(chapter['title'], chapter['page'] - 1, bold=True, color=(0.09, 0.30, 0.51))
for view in index['views']:
    page = index['pages'][view['page'] - 1]
    writer.add_outline_item(view['id'] + ' · ' + view['title'], view['page'] - 1, parent=parents.get(page.get('section')))
for link in index.get('tocLinks', []):
    rect = RectangleObject([
        link['x'] * .75,
        (link['pageHeight'] - link['y'] - link['height']) * .75,
        (link['x'] + link['width']) * .75,
        (link['pageHeight'] - link['y']) * .75,
    ])
    annotation = writer.add_annotation(link['page'] - 1, Link(rect=rect, target_page_index=link['destination'] - 1, fit=Fit.fit(), border=[0, 0, 0]))
    # Local destinations require a page reference, rather than the deferred index.
    annotation['/Dest'][0] = writer.pages[link['destination'] - 1].indirect_reference
writer.add_attachment('Makan_Implemented_UI_Inventory.json', (folder / 'inventory.json').read_bytes())
writer.add_metadata({
    '/Title': 'اطلس کامل رابط پیاده‌شدهٔ ماکان',
    '/Author': 'Makan Product',
    '/Subject': 'صفحه‌ها، فرم‌ها، پنجره‌ها و حالت‌های پیاده‌شده؛ تصاویر دادهٔ آزمایشی',
    '/Keywords': 'Makan, RTL, Persian, Telegram, UI, implemented, design atlas',
})
output = folder / 'preview.pdf' if preview else ROOT / 'output/pdf/MakanApp_Complete_Implemented_Designs_FA.pdf'
writer.write(output)
reader = PdfReader(output)
if len(reader.pages) != len(index['pages']):
    raise RuntimeError('Output page count mismatch')
print(json.dumps({'output': str(output), 'pages': len(reader.pages), 'views': len(index['views']), 'indexLinks': len(index.get('tocLinks', [])), 'bytes': output.stat().st_size}, ensure_ascii=False))
