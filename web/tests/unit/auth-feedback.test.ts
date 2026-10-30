import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { loginFailureMessage } from '@/lib/auth-feedback';
describe('account login navigation and actual service failures', () => {
  it('describes a 500 as a failed login without presenting it as a code or role problem', () => {
    const error = new ApiError(500, { code: 'UNEXPECTED_ERROR', traceId: 'diagnostic-trace' });
    expect(loginFailureMessage(error, true)).toContain('ورود به‌دلیل خطای سرویس انجام نشد');
    expect(loginFailureMessage(error, false)).toContain('سرویس دریافت کد ورود');
    expect(error.problem.traceId).toBe('diagnostic-trace');
  });
  it('preserves actionable configuration, authorization and retry errors', () => {
    for (const error of [
      new ApiError(403),
      new ApiError(429, { retryAfter: 60 }),
      new ApiError(503, { code: 'UPSTREAM_UNAVAILABLE' }),
      new ApiError(502, { code: 'CONTRACT_MISMATCH' }),
    ])
      expect(loginFailureMessage(error, true)).toBe(error.message);
  });
  it('does not present an unstructured missing login endpoint as a missing person', () => {
    const error = new ApiError(404);
    expect(loginFailureMessage(error, false)).toContain('دریافت کد ورود فعلاً ممکن نیست');
    expect(loginFailureMessage(error, true)).toContain('سرویس ورود در دسترس نیست');
    const coded = new ApiError(404, { code: 'OTP_CHALLENGE_NOT_FOUND' });
    expect(loginFailureMessage(coded, true)).toBe(coded.message);
  });
});
