import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { serverConfig } from '@/lib/server/config';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'a'.repeat(64));
  vi.stubEnv('BACKEND_BASE_URL', undefined);
  vi.stubEnv('APP_ORIGIN', undefined);
});
afterEach(() => vi.unstubAllEnvs());

it('uses the current backend and public app origin in production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect(serverConfig()).toMatchObject({
    backend: 'http://94.184.32.84:8090',
    origin: 'https://app.makanapp.org',
  });
});

it('keeps local fixture servers isolated through explicit settings', () => {
  vi.stubEnv('MAKAN_TEST_MODE', 'fixture');
  vi.stubEnv('BACKEND_BASE_URL', 'http://127.0.0.1:3457');
  vi.stubEnv('APP_ORIGIN', 'http://127.0.0.1:3132');
  expect(serverConfig()).toMatchObject({
    backend: 'http://127.0.0.1:3457',
    origin: 'http://127.0.0.1:3132',
  });
});

it('uses the approved test backend in development without changing explicit environment settings', () => {
  vi.stubEnv('NODE_ENV', 'development');
  expect(serverConfig().backend).toBe('http://94.184.32.84:8090');
  vi.stubEnv('BACKEND_BASE_URL', 'http://127.0.0.1:3457');
  expect(serverConfig().backend).toBe('http://127.0.0.1:3457');
});
