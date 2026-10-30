import { afterEach, it, expect, vi } from 'vitest';
import { serverConfig } from '@/lib/server/config';
afterEach(() => vi.unstubAllEnvs());
it('fails closed when fixture tests are configured with the real backend', () => {
  vi.stubEnv('MAKAN_TEST_MODE', 'fixture');
  vi.stubEnv('BACKEND_BASE_URL', 'http://94.184.32.84:8090');
  expect(() => serverConfig()).toThrow('external backend');
});
it('accepts an isolated loopback backend with its own ephemeral secret', () => {
  vi.stubEnv('MAKAN_TEST_MODE', 'fixture');
  vi.stubEnv('BACKEND_BASE_URL', 'http://127.0.0.1:3457');
  vi.stubEnv('SESSION_SECRET', 'a'.repeat(64));
  expect(serverConfig().backend).toBe('http://127.0.0.1:3457');
});
