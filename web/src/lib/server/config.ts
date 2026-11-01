import 'server-only';
import path from 'node:path';
export function serverConfig() {
  const backend = new URL(process.env.BACKEND_BASE_URL ?? 'http://94.184.32.84:8090');
  if (
    process.env.MAKAN_TEST_MODE === 'fixture' &&
    !['127.0.0.1', 'localhost', '[::1]'].includes(backend.hostname)
  )
    throw new Error('Fixture tests cannot use an external backend');
  if (
    !['http:', 'https:'].includes(backend.protocol) ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/' ||
    backend.search ||
    backend.hash
  )
    throw new Error('BACKEND_BASE_URL must be an origin');
  const secret = process.env.SESSION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret))
    throw new Error('Set SESSION_SECRET to a random 32-byte hex value');
  const origin = new URL(
    process.env.APP_ORIGIN ??
      (process.env.NODE_ENV === 'production'
        ? 'https://app.makanapp.org'
        : 'http://127.0.0.1:3000'),
  );
  return {
    backend: backend.origin,
    origin: origin.origin,
    key: Buffer.from(secret, 'hex'),
    sessionDirectory: path.resolve(
      /* turbopackIgnore: true */ process.env.SESSION_DIRECTORY ?? '.makan-sessions',
    ),
    secure: process.env.COOKIE_SECURE === 'true',
  };
}
