import { constants, accessSync, mkdirSync, readFileSync } from 'node:fs';

// Validate runtime settings before listening; do not print environment values or secrets.
try {
  if (process.env.MAKAN_TEST_MODE === 'fixture' || process.env.MAKAN_REFERENCE_PREVIEW === 'true')
    throw new Error('Test fixtures and reference preview must be disabled in the deployed image.');
  if (
    process.env.CLIENT_COOKIE_NAME &&
    !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(process.env.CLIENT_COOKIE_NAME)
  )
    throw new Error('CLIENT_COOKIE_NAME is invalid.');
  if (!/^[a-f0-9]{64}$/i.test(process.env.SESSION_SECRET ?? '')) {
    throw new Error('SESSION_SECRET must contain 64 hexadecimal characters. See docs/docker.md.');
  }
  if (!process.env.BACKEND_BASE_URL) {
    try {
      process.env.BACKEND_BASE_URL = JSON.parse(
        readFileSync(new URL('./config/network.json', import.meta.url), 'utf8'),
      ).backendOrigin;
    } catch {
      throw new Error('config/network.json is missing or invalid.');
    }
  }
  for (const key of ['BACKEND_BASE_URL', 'APP_ORIGIN']) {
    let url;
    try {
      url = new URL(process.env[key]);
    } catch {
      throw new Error(`${key} must be an HTTP(S) origin.`);
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(`${key} must be an HTTP(S) origin.`);
    }
  }
  if (!['true', 'false'].includes(process.env.COOKIE_SECURE))
    throw new Error('COOKIE_SECURE must be true or false.');
  if (new URL(process.env.APP_ORIGIN).protocol === 'https:' && process.env.COOKIE_SECURE !== 'true')
    throw new Error('HTTPS deployment requires COOKIE_SECURE=true.');
  const directory = process.env.SESSION_DIRECTORY;
  if (!directory) throw new Error('SESSION_DIRECTORY is required.');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  accessSync(directory, constants.W_OK);
} catch (error) {
  console.error(`MakanApp startup failed: ${error.message}`);
  process.exit(1);
}

if (process.argv.includes('--check')) console.log('MakanApp runtime configuration is valid.');
else await import('./server.js');
