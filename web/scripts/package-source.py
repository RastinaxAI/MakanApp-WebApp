"""Optional source handoff: Python 3 standard library; no dependencies or private env.

Run from web: python scripts/package-source.py
The archive is laid out as web/ plus its parent GitHub workflow.
"""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'output/delivery/makan-client-source.zip'
files = []
for folder in ['src', 'public', 'contracts', 'design', 'scripts', 'tests', 'output/design',
               'docs/user-guide']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file()
                 and 'evidence' not in p.parts and '__pycache__' not in p.parts)
for name in ['README.md', 'AGENTS.md', '.nvmrc', '.gitignore', '.prettierignore',
             '.prettierrc.json', '.dockerignore', '.env.example', '.env.docker.example',
             'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts',
             'next-env.d.ts', 'postcss.config.mjs', 'vitest.config.mts',
             'playwright.config.ts', 'playwright.personal.config.ts', 'playwright.guide.config.ts', 'Dockerfile',
             'compose.yaml', 'docker-compose.yml']:
    if (root / name).is_file(): files.append(root / name)
guide_pdf = root / 'output/pdf/MakanApp_Panel_User_Guide_FA.pdf'
if guide_pdf.is_file(): files.append(guide_pdf)
for name in ['PLAN.md', 'DESIGN.md', 'API_GAPS.md', 'PROGRESS.md', 'docker.md',
             'deployment.md', 'api-matrix.md']:
    if (root / 'docs' / name).is_file(): files.append(root / 'docs' / name)
files.extend(p for p in (root / 'docs/quality').glob('*') if p.is_file())
files.extend(p for p in (root / 'docs/product').glob('*') if p.is_file())
manifest = []
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(set(files)):
        relative = file.relative_to(root)
        data = file.read_bytes()
        # Refuse embedded bearer/JWT credentials rather than silently distributing them.
        if re.search(rb'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}', data):
            raise RuntimeError('Credential-like value in source: ' + str(relative))
        name = 'web/' + relative.as_posix()
        archive.writestr(name, data)
        manifest.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    # The root contains only launchers; include them so the documented root commands work.
    for name in ['.github/workflows/makan-client-quality.yml', 'compose.yaml',
                 'package.json', 'readme.md', 'AGENTS.md', '.env.example',
                 '.gitignore', '.gitattributes']:
        launcher = root.parent / name
        if not launcher.is_file(): continue
        data = launcher.read_bytes()
        archive.writestr(name, data)
        manifest.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    archive.writestr('SOURCE_MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('Archive CRC verification failed')
print(json.dumps({'output': str(output), 'files': len(manifest),
                  'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
