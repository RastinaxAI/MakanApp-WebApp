'use client';
import * as uiText from '@/content/fa';
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
import { latinDigits } from '@/lib/formatting';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { takeBrowserAuthReturn, safeAuthReturnPath } from '@/lib/auth-return';
import { AuthLayout } from './auth-layout';
import { BrandMark } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { ChevronRight, Ellipsis, LoaderCircle, ShieldCheck } from 'lucide-react';
import s from './login.module.css';
import { network } from '@/config/network';
type LoginValues = { phoneNumber: string; code: string };
export function LoginForm({ returnPath = null }: { returnPath?: string | null } = {}) {
  const authBase = network.clientApiPrefix + '/auth';
  const router = useRouter();
  const [challenge, setChallenge] = useState<components['schemas']['RequestOtpResult'] | null>(
      null,
    ),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState<ApiError | null>(null),
    [rateUntil, setRateUntil] = useState(0),
    [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const [help, setHelp] = useState(false);
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
    const pasted = normalizeAuthDigits(event.clipboardData.getData('text')).replace(/[^0-9]/g, '');
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
        router.replace(
          takeBrowserAuthReturn() ?? safeAuthReturnPath(returnPath) ?? '/personal/workspaces',
        );
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
  const phone = form.watch('phoneNumber'),
    code = form.watch('code');
  const activeField = challenge ? 'code' : 'phoneNumber';
  const phoneRegistration = form.register('phoneNumber', {
    validate: (value) => validLoginPhone(value) || phoneInputMessage,
  });
  const codeRegistration = form.register('code', {
    validate: (value) => !challenge || validLoginOtp(value) || otpInputMessage,
  });
  const registration = challenge ? codeRegistration : phoneRegistration;
  const issue = form.formState.errors[activeField]?.message;
  const unavailable =
    busy ||
    form.formState.isSubmitting ||
    now < rateUntil ||
    (!!challenge && (remaining <= 0 || !validLoginOtp(code)));
  function back() {
    if (challenge) {
      setChallenge(null);
      setError(null);
      form.setValue('code', '');
    } else router.push('/welcome');
  }
  function identifierInput(value: string) {
    form.setValue(activeField, normalizeAuthDigits(value).replace(/[^0-9]/g, ''), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
  return (
    <>
      <AuthLayout>
        <form
          className={s.form}
          onSubmit={form.handleSubmit(submit)}
          noValidate
          aria-label={challenge ? uiText.text_7f02906d0bda : uiText.text_a307da4d1ec4}
        >
          <header className={s.header}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={back}
              disabled={busy}
              aria-label={uiText.common_back}
            >
              <ChevronRight size={22} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setHelp(true)}
              aria-label={uiText.text_a0f446ea0a11}
            >
              <Ellipsis size={22} />
            </Button>
          </header>
          <div className={s.identity}>
            <BrandMark />
            <h1>{challenge ? uiText.auth_codeTitle : uiText.auth_phoneTitle}</h1>
            <p>
              {challenge
                ? uiText.text_43de2faf100b + phone + uiText.text_bdb15bbda1e3
                : uiText.text_5d9c3b2dee3e}
            </p>
          </div>
          <div className={s.field}>
            <label htmlFor={challenge ? 'otp-code' : 'phone-number'}>
              {challenge ? uiText.auth_codeLabel : uiText.auth_phoneLabel}
            </label>
            <div className={challenge ? s.otp : undefined}>
              <input
                {...registration}
                id={challenge ? 'otp-code' : 'phone-number'}
                type={challenge ? 'text' : 'tel'}
                dir="ltr"
                inputMode="numeric"
                autoComplete={challenge ? 'one-time-code' : 'tel'}
                value={challenge ? code : phone}
                maxLength={challenge ? 6 : 11}
                minLength={challenge ? 6 : 11}
                pattern={challenge ? '[0-9]{6}' : '09[0-9]{9}'}
                autoFocus
                key={activeField}
                disabled={busy}
                aria-invalid={!!issue}
                aria-describedby={issue ? 'identifier-error' : 'identifier-hint'}
                onKeyDown={(event) => {
                  if (
                    event.key.length === 1 &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey &&
                    !/^[0-9۰-۹٠-٩]$/.test(event.key)
                  )
                    event.preventDefault();
                }}
                onChange={(event) => identifierInput(event.target.value)}
                onPaste={(event) => pasteIdentifier(event, activeField, challenge ? 6 : 11)}
              />
              {challenge && (
                <div className={s.digits} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      data-active={index === Math.min(code?.length ?? 0, 5)}
                      data-invalid={!!issue}
                    >
                      {code?.[index] === undefined
                        ? ''
                        : Number(code[index]).toLocaleString('fa-IR')}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {issue ? (
              <p id="identifier-error" role="alert" className={s.error}>
                {issue}
              </p>
            ) : (
              <p id="identifier-hint" className={s.hint}>
                {challenge ? uiText.text_c7b877a28050 : uiText.text_0ec3b647b2d7}
              </p>
            )}
          </div>
          {challenge && (
            <>
              <div className={s.codeActions}>
                <button type="button" className={s.edit} disabled={busy} onClick={back}>
                  {uiText.text_8ec609305663}
                </button>
                <button
                  type="button"
                  className={s.edit}
                  disabled={busy || now < resendAt}
                  onClick={() => void resend()}
                >
                  {now < resendAt
                    ? Number(Math.ceil((resendAt - now) / 1000)).toLocaleString('fa-IR') +
                      uiText.text_f0868fd5d933
                    : uiText.text_cbe0e1ea7c4c}
                </button>
              </div>
              <aside className={s.security}>
                <ShieldCheck size={21} />
                <p>{uiText.text_edf1c5e3751f}</p>
              </aside>
            </>
          )}
          <div className={s.actions}>
            <Button type="submit" disabled={unavailable} aria-busy={busy}>
              {busy && <LoaderCircle className={s.spinner} size={18} />}{' '}
              {busy
                ? uiText.text_ee2ee0a2117a
                : challenge
                  ? uiText.auth_verify
                  : uiText.auth_requestCode}
            </Button>
          </div>
          <p className={s.policy}>{uiText.text_7982e7b03d4c}</p>
        </form>
        {error && (
          <div className="mk-auth-error" role="alert">
            {loginFailureMessage(error, !!challenge)}
            {error.problem.traceId && (
              <small>
                {uiText.text_324357b2beef}
                <bdi dir="ltr">{error.problem.traceId}</bdi>
              </small>
            )}
          </div>
        )}
      </AuthLayout>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent title={uiText.text_b55a7e83c439}>
          <p>{uiText.text_a55bf6a5c36c}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
