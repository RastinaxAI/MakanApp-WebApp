/** Defense in depth: callers can reach only the configured API origin and namespace. */
export function upstreamUrl(path: string, origin: string) {
  if (!path.startsWith('/api/v1/') || /[\\\r\n#]/.test(path))
    throw new Error('Invalid upstream path');
  for (const segment of path.split('?')[0].split('/')) {
    const decoded = decodeURIComponent(segment);
    if (decoded === '.' || decoded === '..' || /[\\/%\u0000-\u001f]/.test(decoded))
      throw new Error('Invalid upstream segment');
  }
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin || !url.pathname.startsWith('/api/v1/'))
    throw new Error('Invalid upstream origin');
  return url;
}
