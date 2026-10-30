import { constants, accessSync, mkdirSync } from 'node:fs';

// Validate runtime settings before listening; do not print environment values or secrets.
try {
  if (
    process.env.CLIENT_COOKIE_NAME &&
    !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(process.env.CLIENT_COOKIE_NAME)
  )
    throw new Error('CLIENT_COOKIE_NAME is invalid.');
  if (!/^[a-f0-9]{64}$/i.test(process.env.SESSION_SECRET ?? '')) {
    throw new Error('SESSION_SECRET must contain 64 hexadecimal characters. See docs/docker.md.');
  }
  for (const key of ['BACKEND_BASE_URL', 'APP_ORIGIN']) {
    const url = new URL(process.env[key]);
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
  const directory = process.env.SESSION_DIRECTORY;
  if (!directory) throw new Error('SESSION_DIRECTORY is required.');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  accessSync(directory, constants.W_OK);
} catch (error) {
  console.error(`MakanApp startup failed: ${error.message}`);
  process.exit(1);
}

await import('./server.js');
