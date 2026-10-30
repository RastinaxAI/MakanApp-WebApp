import { describe, it, expect } from 'vitest';
import { parseProblem, retryAfter, ApiError } from '@/lib/api/errors';
import { latinDigits, date, money } from '@/lib/formatting';
describe('Errors and Persian boundaries', () => {
  it('distinguishes an unavailable recipient from a missing conversation without guessing the privacy or age cause', () => {
    const problem = parseProblem(
      { code: 'DIRECT_RECIPIENT_NOT_AVAILABLE', traceId: 'trace-qa' },
      404,
    );
    const error = new ApiError(404, problem);
    expect(error.message).toContain('این مخاطب');
    expect(error.problem.traceId).toBe('trace-qa');
    expect(new ApiError(404, { code: 'CONVERSATION_NOT_FOUND' }).message).toContain('این گفتگو');
    expect(new ApiError(404).message).toBe('این مورد در دسترس نیست.');
  });
  it('keeps safe extensions and field errors without exposing backend details', () => {
    expect(
      parseProblem(
        {
          code: 'POLICY',
          traceId: 'trace',
          detail: 'secret',
          errors: { phone: ['bad'], bad: 'ignored' },
        },
        422,
      ),
    ).toEqual({
      status: 422,
      code: 'POLICY',
      traceId: 'trace',
      errors: { phone: ['bad'] },
      retryAfter: undefined,
    });
  });
  it('does not expose obsolete verification extensions', () =>
    expect(parseProblem({ needsStepUp: true }, 403)).not.toHaveProperty('needsStepUp'));
  it('distinguishes failed OTP delivery, malformed service responses and browser connectivity', () => {
    const unavailable = new ApiError(502, { code: 'OTP_SERVICE_UNAVAILABLE' });
    const malformed = new ApiError(502, { code: 'OTP_RESPONSE_INVALID' });
    const contract = new ApiError(502, { code: 'CONTRACT_MISMATCH' });
    const browser = new ApiError(503, { code: 'NETWORK_ERROR' });
    expect(unavailable.message).toContain('سرویس ارسال کد ورود');
    expect(malformed.message).toContain('قابل پردازش نیست');
    expect(contract.message).not.toBe(new ApiError(502).message);
    expect(browser.message).toContain('مرورگر');
    expect(new ApiError(400, { code: 'CONTRACT_MISMATCH' }).message).toBe(
      new ApiError(400).message,
    );
  });
  it('parses delta and HTTP-date retry values', () => {
    expect(retryAfter('30')).toBe(30);
    expect(retryAfter('Sun, 18 Oct 2026 10:01:00 GMT', Date.parse('2026-10-18T10:00:00Z'))).toBe(
      60,
    );
  });
  it.each([403, 409, 412, 429, 503])('gives distinct error text for %i', (status) => {
    expect(new ApiError(status).message.length).toBeGreaterThan(10);
    expect(new ApiError(status).status).toBe(status);
  });
  it('normalizes only user-entered digits, preserves technical IDs', () => {
    expect(latinDigits('۰۹۱۲٣٤٥٦٧٨٩')).toBe('09123456789');
    expect(latinDigits('token-ABC-123')).toBe('token-ABC-123');
  });
  it('formats date-only without a Tehran day shift and retains currency', () => {
    expect(date('2026-10-18')).toBe(date('2026-10-18T12:00:00Z'));
    expect(money(100, 'IRR')).toContain('IRR');
    expect(money(null, 'IRR')).toBe('—');
  });
});
