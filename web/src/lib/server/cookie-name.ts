/** Separate local instances can use independent cookies even on the same hostname. */
export function clientCookieName(value?: string) {
  const name = value ?? 'makan_client_session';
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) throw new Error('Invalid CLIENT_COOKIE_NAME');
  return name;
}
