const key = 'makan:auth:return-to';
export const AUTH_RETURN_COOKIE = 'makan_auth_return';
export function safeAuthReturnPath(value: string | null | undefined): string | null {
  if (!value || /[\\\r\n]/.test(value) || !value.startsWith('/personal')) return null;
  try {
    const url = new URL(value, 'https://makan.invalid');
    if (url.origin !== 'https://makan.invalid' || !/^\/personal(?:\/|$)/.test(url.pathname))
      return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
export function rememberAuthReturn(storage: Pick<Storage, 'setItem'>, value: string) {
  const safe = safeAuthReturnPath(value);
  if (safe)
    try {
      storage.setItem(key, safe);
    } catch {}
}
export function takeAuthReturn(storage: Pick<Storage, 'getItem' | 'removeItem'>) {
  try {
    const value = safeAuthReturnPath(storage.getItem(key));
    storage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
export function rememberBrowserAuthReturn() {
  try {
    rememberAuthReturn(
      window.sessionStorage,
      window.location.pathname + window.location.search + window.location.hash,
    );
  } catch {}
}
export function takeBrowserAuthReturn() {
  try {
    return takeAuthReturn(window.sessionStorage);
  } catch {
    return null;
  }
}
