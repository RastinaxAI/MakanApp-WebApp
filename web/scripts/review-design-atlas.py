"""Verify the assembled atlas and render every PDF page for human visual review."""
import hashlib
import json
import math
import subprocess
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
folder = root / 'tmp/pdfs/design-atlas'
review = folder / 'qa'
review.mkdir(parents=True, exist_ok=True)
artifact = root / 'output/pdf/MakanApp_Complete_Implemented_Designs_FA.pdf'
index = json.loads((folder / 'index.json').read_text())
layout = json.loads((folder / 'layout.json').read_text())
coverage = json.loads((root / 'docs/quality/IMPLEMENTED_DESIGN_ATLAS.json').read_text())
reader = PdfReader(artifact)
assert len(reader.pages) == len(index['pages']) == len(layout)
assert not any(row['overflow'] or row['horizontalOverflow'] or row['brokenImages'] for row in layout)

def flatten(outlines):
    for entry in outlines:
        if isinstance(entry, list):
            yield from flatten(entry)
        else:
            yield entry

outline_count = len(list(flatten(reader.outline)))
assert outline_count == len(index['chapters']) + len(index['views'])
assert len(index['views']) == coverage['capturedViews'] == 211
assert index['images'] == coverage['images'] == 637
image_count = 0
link_count = 0
for number, page in enumerate(reader.pages, 1):
    assert abs(float(page.mediabox.width) - 1190.55) < 2
    assert abs(float(page.mediabox.height) - 841.89) < 2
    resources = page.get('/Resources', {})
    if hasattr(resources, 'get_object'):
        resources = resources.get_object()
    for obj in resources.get('/XObject', {}).values():
        image_count += obj.get_object().get('/Subtype') == '/Image'
    expected = [link for link in index['tocLinks'] if link['page'] == number]
    links = [obj.get_object() for obj in page.get('/Annots', [])
             if obj.get_object().get('/Subtype') == '/Link']
    link_count += len(links)
    assert len(links) == len(expected), (number, 'link count')
    for actual, destination in zip(links, expected):
        target = actual['/Dest'][0].get_object()
        assert reader.get_page_number(target) == destination['destination'] - 1
assert link_count == len(index['tocLinks']) == 211
assert image_count == 637, image_count
inventory = json.loads(reader.attachments['Makan_Implemented_UI_Inventory.json'][0])
assert inventory['syntheticData'] and len(inventory['views']) == 211

subprocess.run(['pdftoppm', '-r', '36', '-png', str(artifact), str(review / 'page')], check=True)
renders = sorted(review.glob('page-*.png'))
assert len(renders) == len(reader.pages)
sheet_names = []
for start in range(0, len(renders), 16):
    sheet = Image.new('RGB', (1640, 1248), '#dae3ee')
    draw = ImageDraw.Draw(sheet)
    for offset, filename in enumerate(renders[start:start + 16]):
        image = Image.open(filename).convert('RGB')
        assert image.width > 500 and image.height > 350
        image.thumbnail((394, 279), Image.Resampling.LANCZOS)
        x, y = 10 + (offset % 4) * 410, 26 + (offset // 4) * 312
        draw.text((x, y - 18), f'Page {start + offset + 1}', fill='#18334e')
        sheet.paste(image, (x + (394 - image.width) // 2, y))
    target = review / f'sheet-{start // 16 + 1:03d}.jpg'
    sheet.save(target, quality=92)
    sheet_names.append(str(target.relative_to(root)))

result = {
    'artifact': str(artifact.relative_to(root)),
    'pages': len(reader.pages),
    'views': len(index['views']),
    'images': image_count,
    'pageKinds': dict(Counter(page['kind'] for page in index['pages'])),
    'paper': 'A3 landscape',
    'outlineItems': outline_count,
    'linkedIndexEntries': link_count,
    'embeddedInventoryViews': len(inventory['views']),
    'layoutErrors': 0,
    'brokenImages': 0,
    'renderedPages': len(renders),
    'overviewSheets': sheet_names,
    'bytes': artifact.stat().st_size,
    'sha256': hashlib.sha256(artifact.read_bytes()).hexdigest(),
    'sourceFingerprint': coverage['sourceFingerprint'],
    'syntheticData': True,
    'liveDomainWrites': False,
    'localContractAdapters': coverage['localContractAdapters'],
    'humanVisualReview': {'status': 'pending'},
}
(review / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items()
                  if key not in ('overviewSheets', 'localContractAdapters')}, ensure_ascii=False))
