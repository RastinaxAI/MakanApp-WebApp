'use client';
import { ReferenceBrand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import type { components } from '@/generated/api/schema';
import { request } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { loginFailureMessage } from '@/lib/auth-feedback';
import {
  normalizeAuthDigits,
  validLoginPhone,
  validLoginOtp,
  phoneInputMessage,
  otpInputMessage,
} from '@/lib/auth-identifiers';
import { latinDigits, number } from '@/lib/formatting';
import { ArrowRight } from 'lucide-react';
import s from './login-reference.module.css';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { useForm } from 'react-hook-form';
type LoginValues = { phoneNumber: string; code: string };
export function LoginForm() {
  const authBase = '/api/client/auth';
  const router = useRouter();
  const [challenge, setChallenge] = useState<components['schemas']['RequestOtpResult'] | null>(
      null,
    ),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState<ApiError | null>(null),
    [rateUntil, setRateUntil] = useState(0),
    [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const form = useForm<LoginValues>({
    defaultValues: { phoneNumber: '', code: '' },
  });
  useEffect(() => {
    if (!challenge && rateUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge, rateUntil]);
  const remaining = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAtUtc) - now) / 1000))
    : 0;
  const resendAt = Math.max(rateUntil, challenge ? Date.parse(challenge.resendAvailableAtUtc) : 0);
  function pasteIdentifier(
    event: ClipboardEvent<HTMLInputElement>,
    field: keyof LoginValues,
    limit: number,
  ) {
    const input = event.currentTarget;
    const pasted = normalizeAuthDigits(event.clipboardData.getData('text'));
    const candidate =
      input.value.slice(0, input.selectionStart ?? 0) +
      pasted +
      input.value.slice(input.selectionEnd ?? input.value.length);
    event.preventDefault();
    if (candidate.length > limit) {
      form.setError(field, { message: field === 'code' ? otpInputMessage : phoneInputMessage });
      return;
    }
    form.setValue(field, candidate, { shouldDirty: true, shouldValidate: true });
  }
  async function submit(values: LoginValues) {
    if (operation.current) return;
    const phoneNumber = normalizeAuthDigits(values.phoneNumber);
    if (!validLoginPhone(phoneNumber)) {
      form.setError('phoneNumber', { message: phoneInputMessage });
      return;
    }
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!challenge) {
        const result = await request<components['schemas']['RequestOtpResult']>(
          `${authBase}/challenge`,
          { method: 'POST', body: JSON.stringify({ phoneNumber }) },
        );
        setChallenge(result);
        setNow(Date.now());
        setTimeout(() => document.getElementById('otp-code')?.focus(), 50);
      } else {
        const code = normalizeAuthDigits(values.code ?? '');
        if (!validLoginOtp(code)) {
          form.setError('code', { message: otpInputMessage });
          return;
        }
        await request<{ authenticated: true }>(`${authBase}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            phoneNumber,
            code,
            deviceName: 'Makan Client Web',
          }),
        });
        const channel = new BroadcastChannel('makan-client-session');
        channel.postMessage('changed');
        channel.close();
        router.replace('/personal/workspaces');
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setRateUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function resend() {
    if (now < resendAt || busy || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError(null);
    try {
      setChallenge(
        await request(`${authBase}/challenge`, {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: latinDigits(form.getValues('phoneNumber')).replace(/[\s-]/g, ''),
          }),
        }),
      );
      form.setValue('code', '');
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(503);
      setError(err);
      if (err.status === 429) setRateUntil(Date.now() + (err.problem.retryAfter ?? 60) * 1000);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={s.page} data-reference-public>
      <header className={s.header}>ماکان</header>
      <main className={s.main}>
        <div className={s.card}>
          <div className={s.brand}>
            <ReferenceBrand />
          </div>
          <h1>{challenge ? 'کد تأیید را وارد کنید' : 'به ماکان خوش آمدید'}</h1>
          <p className={s.intro}>
            {challenge ? (
              <>
                کد ارسال‌شده به <bdi dir="ltr">{form.getValues('phoneNumber')}</bdi> را وارد کنید.
              </>
            ) : (
              'یادگیری و ارتباط، در کنار هم.'
            )}
          </p>
          <form className={s.form} onSubmit={form.handleSubmit(submit)} noValidate>
            {!challenge ? (
              <label htmlFor="phone-number">
                شماره همراه
                <input
                  id="phone-number"
                  aria-label="شماره همراه"
                  dir="ltr"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="09123456789"
                  minLength={11}
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  onPaste={(e) => pasteIdentifier(e, 'phoneNumber', 11)}
                  autoFocus
                  disabled={busy}
                  aria-invalid={!!form.formState.errors.phoneNumber}
                  aria-describedby={
                    form.formState.errors.phoneNumber ? 'phone-error phone-help' : 'phone-help'
                  }
                  {...form.register('phoneNumber', {
                    setValueAs: normalizeAuthDigits,
                    validate: (value) => validLoginPhone(value) || phoneInputMessage,
                  })}
                />
                {form.formState.errors.phoneNumber && (
                  <span id="phone-error" className="field-error">
                    {form.formState.errors.phoneNumber.message}
                  </span>
                )}
                <span id="phone-help" className="field-help">
                  شماره همراه ۱۱ رقمی، مانند 09100000000، وارد کنید.
                </span>
              </label>
            ) : (
              <>
                <label htmlFor="otp-code">
                  کد ورود
                  <input
                    id="otp-code"
                    aria-label="کد ورود"
                    className="otp-input"
                    dir="ltr"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    onPaste={(e) => pasteIdentifier(e, 'code', 6)}
                    disabled={busy}
                    aria-invalid={!!form.formState.errors.code}
                    aria-describedby={form.formState.errors.code ? 'otp-error' : undefined}
                    {...form.register('code', {
                      setValueAs: normalizeAuthDigits,
                      validate: (value) => !challenge || validLoginOtp(value) || otpInputMessage,
                    })}
                  />
                  {form.formState.errors.code && (
                    <span id="otp-error" className="field-error">
                      {form.formState.errors.code.message}
                    </span>
                  )}
                </label>
                <div className="timer">
                  <span>
                    {remaining > 0
                      ? 'اعتبار کد: ' +
                        number(Math.floor(remaining / 60)) +
                        ':' +
                        String(remaining % 60).padStart(2, '0')
                      : 'اعتبار کد تمام شده است'}
                  </span>
                  <button
                    type="button"
                    className="button button-ghost button-sm"
                    disabled={busy || now < resendAt}
                    onClick={() => void resend()}
                  >
                    {now < resendAt
                      ? number(Math.ceil((resendAt - now) / 1000)) + ' ثانیه تا ارسال مجدد'
                      : 'ارسال دوباره کد'}
                  </button>
                </div>
              </>
            )}
            {error && (
              <div className="form-message error" role="alert">
                {loginFailureMessage(error, !!challenge)}
                {error.problem.traceId && (
                  <small className="block mt-2">
                    کد پیگیری: <bdi dir="ltr">{error.problem.traceId}</bdi>
                  </small>
                )}
              </div>
            )}
            <div className={s.actions}>
              <Button
                type="submit"
                disabled={
                  busy ||
                  form.formState.isSubmitting ||
                  now < rateUntil ||
                  (!!challenge && remaining <= 0)
                }
              >
                {busy ? 'لطفاً صبر کنید…' : challenge ? 'تأیید و ورود' : 'دریافت کد ورود'}
              </Button>
            </div>
            {challenge && (
              <Button
                variant="ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setChallenge(null);
                  setError(null);
                  form.setValue('code', '');
                }}
              >
                <ArrowRight size={16} />
                تغییر شماره همراه
              </Button>
            )}
          </form>
          <p className={s.terms}>ادامه به معنی پذیرش شرایط استفاده است.</p>
        </div>
      </main>
    </div>
  );
}
