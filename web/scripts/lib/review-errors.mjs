/** Operator diagnostics contain reasons, never Playwright request headers or credentials. */
export function scrubReviewError(value) {
  return String(value)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/, 1)[0]
    .replace(/(?:authorization|set-cookie|cookie)\s*:.*/gi, '[redacted header]')
    .replace(/Bearer\s+\S+/gi, '[redacted credential]')
    .replace(/makan_client_session[^=;\s]*=[^;\s]+/gi, '[redacted session]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted credential]')
    .replace(/09\d{9}/g, '[test-phone]');
}
