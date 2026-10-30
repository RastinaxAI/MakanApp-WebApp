const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

// Canonicalize local aliases before the form is rendered. POST origin checks stay strict.
export function canonicalLocalLoginUrl(host: string | null, appOrigin: string): string | null {
  if (!host) return null;
  const expected = new URL(appOrigin);
  if (!loopbackHosts.has(expected.hostname) || host === expected.host) return null;
  try {
    const incoming = new URL(`${expected.protocol}//${host}`);
    if (
      incoming.host !== host ||
      !loopbackHosts.has(incoming.hostname) ||
      incoming.port !== expected.port
    )
      return null;
    return new URL('/enter', expected.origin).href;
  } catch {
    return null;
  }
}
