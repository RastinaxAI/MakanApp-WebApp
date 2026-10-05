// Serves the built dist/ over plain HTTP with the headers a PWA needs.
// Zero dependencies — the point is to prove the build works without Vite in the loop,
// and to control the service-worker headers that `vite preview` does not set for us.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolveInDist(urlPath) {
  // Normalize first, then confirm containment: a request for "/../../etc/passwd"
  // must not escape dist/ after the SPA fallback appends index.html.
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const target = normalize(join(dist, decoded));
  if (target !== dist && !target.startsWith(dist + sep)) return null;
  try {
    return statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  let file = resolveInDist(req.url || '/');

  // Unknown path with no extension -> SPA shell, so deep links such as /classes/c-math work.
  if (!file && !extname(req.url || '')) file = join(dist, 'index.html');

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
    return;
  }

  const isShell = file.endsWith(`${sep}index.html`);
  const isServiceWorker = file.endsWith(`${sep}sw.js`);
  const headers = {
    'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    // Hashed assets are immutable; the shell and the worker must always revalidate
    // or an installed PWA would keep serving a stale app after a deploy.
    'cache-control': isShell || isServiceWorker ? 'no-cache' : 'public, max-age=31536000, immutable',
  };
  if (isServiceWorker) headers['service-worker-allowed'] = '/';

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`ماکان — dist/ served at http://${host}:${port}`);
  console.log('Service worker + install prompt require a secure context: localhost or HTTPS.');
});