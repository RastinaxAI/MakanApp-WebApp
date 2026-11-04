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
for folder in ['src', 'public', 'config', 'contracts', 'design', 'scripts', 'tests', 'output/design',
               'docs/user-guide']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file()
                 and 'evidence' not in p.parts and '__pycache__' not in p.parts)
for name in ['README.md', 'AGENTS.md', '.nvmrc', '.gitignore', '.prettierignore',
             '.prettierrc.json', '.dockerignore', '.env.example', '.env.docker.example',
             'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts',
             'next-env.d.ts', 'postcss.config.mjs', 'vitest.config.mts',
             'playwright.config.ts', 'playwright.personal.config.ts', 'playwright.guide.config.ts', 'Dockerfile',
             'compose.yaml', 'compose.local.yaml', 'docker-compose.yml']:
    if (root / name).is_file(): files.append(root / name)
guide_pdf = root / 'output/pdf/MakanApp_Panel_User_Guide_FA.pdf'
if guide_pdf.is_file(): files.append(guide_pdf)
for name in ['PLAN.md', 'DESIGN.md', 'API_GAPS.md', 'PROGRESS.md', 'docker.md',
             'deployment.md', 'api-matrix.md', 'RELEASE_80C_INTEGRATION_FA.md']:
    if (root / 'docs' / name).is_file(): files.append(root / 'docs' / name)
# The server handoff does not need historical traces/logs or authentication captures.
for name in ['RELEASE_80C_CHECKS.json', 'RELEASE_80C_LIVE_READS.json',
             'RELEASE_80C_LIVE_BFF.json', 'RELEASE_80C_LIVE_DRAFT.json',
             'DEPLOYMENT_80C_CHECKS.json']:
    if (root / 'docs/quality' / name).is_file(): files.append(root / 'docs/quality' / name)
files.extend(p for p in (root / 'docs/product').glob('*') if p.is_file())
manifest = []
output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(set(files)):
        relative = file.relative_to(root)
        if any(part.startswith('.env') and not part.endswith('.example') for part in relative.parts):
            raise RuntimeError('Private environment file in source handoff')
        if file.is_symlink():
            raise RuntimeError('Symlink is not allowed in source handoff: ' + str(relative))
        data = file.read_bytes()
        # Refuse embedded bearer/JWT credentials rather than silently distributing them.
        if re.search(rb'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}', data):
            raise RuntimeError('Credential-like value in source: ' + str(relative))
        name = 'web/' + relative.as_posix()
        info = zipfile.ZipInfo.from_file(file, name)
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
        manifest.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    # The root contains only launchers; include them so the documented root commands work.
    for name in ['.github/workflows/makan-client-quality.yml',
                 '.github/workflows/makan-deployment-helper.yml', 'compose.yaml',
                 'package.json', 'README.md', 'readme.md', 'setup.sh', 'AGENTS.md', '.env.example',
                 '.gitignore', '.gitattributes']:
        launcher = root.parent / name
        if not launcher.is_file(): continue
        data = launcher.read_bytes()
        info = zipfile.ZipInfo.from_file(launcher, name)
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, data)
        manifest.append({'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    archive.writestr('SOURCE_MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise RuntimeError('Archive CRC verification failed')
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(digest + '  ' + output.name + '\n')
print(json.dumps({'output': str(output), 'files': len(manifest),
                  'sha256': digest}))
