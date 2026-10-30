'use client';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date, latinDigits } from '@/lib/formatting';
import { useState } from 'react';
import { usePersonalApi } from '../provider';
import { SchoolSearch } from './directory';
import s from './school.module.css';
import { Field, Pager, toUtc, useSchoolAction, useSchoolCommand } from './shared';
type S = components['schemas'];

export function GuardianInvitationForm() {
  const [target, setTarget] = useState(''),
    [mode, setMode] = useState('username'),
    [learner, setLearner] = useState(''),
    [expires, setExpires] = useState(''),
    [reason, setReason] = useState('');
  const [page, setPage] = useState(1),
    [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<S['SchoolGuardianInvitationResult']>();
  const [frozen, setFrozen] = useState<S['CreateSchoolGuardianInvitationCommand'] | null>(null);
  const q = usePersonalApi<S['OrganizationPeoplePage']>(
    `/api/v1/organization/people?page=${page}&pageSize=30&search=${encodeURIComponent(search)}`,
  );
  const a = useSchoolAction();
  const command = useSchoolCommand();
  if (receipt)
    return (
      <div className={s.receipt}>
        <h2>
          {receipt.status === 'Pending' ? 'دعوت در انتظار تأیید والد' : label(receipt.status)}
        </h2>
        <p>دسترسی فرزند پس از تأیید صریح حساب مقصد و معتبرشدن رابطه برقرار می‌شود.</p>
        <p>انقضا: {date(receipt.expiresAtUtc)}</p>
        {receipt.status === 'Pending' && (
          <ConfirmAction
            title="لغو دعوت والد"
            trigger="لغو دعوت"
            confirm="تأیید لغو دعوت"
            description="این دعوت پایان می‌یابد و از طریق آن دسترسی جدیدی به فرزند برقرار نمی‌شود."
            destructive
            onConfirm={async () => {
              const result = await command<S['SchoolGuardianInvitationResult']>(
                `/api/v1/organization/guardian-invitations/${receipt.id}/revoke`,
                { expectedRowVersion: receipt.version, reason: 'لغو دعوت از سوی مدیر آموزشگاه' },
              );
              setReceipt(result);
              return true;
            }}
          />
        )}
        {a.feedback}
      </div>
    );
  return (
    <>
      <p className={s.hint}>
        دعوت را با نام کاربری دقیق یا شمارهٔ حساب موجود بفرستید. والد در حساب خودش، رابطه با همین
        فرزند را تأیید یا رد می‌کند.
      </p>
      <SchoolSearch
        label="جستجوی پروندهٔ فرزند"
        disabled={a.busy || !!frozen}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
          setLearner('');
        }}
      />
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Field label="پروندهٔ فرزند">
            <select
              disabled={a.busy || !!frozen}
              value={learner}
              onChange={(e) => setLearner(e.target.value)}
            >
              <option value="">انتخاب فرزند…</option>
              {q.data.items.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.displayName || [p.firstName, p.lastName].join(' ')}
                </option>
              ))}
            </select>
          </Field>
          <Pager
            page={page}
            total={q.data.totalCount}
            onChange={(p) => {
              if (!frozen) {
                setPage(p);
                setLearner('');
              }
            }}
          />
        </>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const command = frozen ?? {
            clientOperationId: crypto.randomUUID(),
            username: mode === 'username' ? target.trim().replace(/^@/, '') : null,
            phoneNumber: mode === 'phone' ? latinDigits(target).trim() : null,
            expiresAtUtc: toUtc(expires),
            reason: reason.trim(),
          };
          setFrozen(command);
          const result = await a.run<S['SchoolGuardianInvitationResult']>(
            `/api/v1/organization/people/${learner}/guardian-invitations`,
            command,
          );
          if (result) setReceipt(result);
        }}
      >
        <fieldset disabled={a.busy || !!frozen}>
          <Field label="روش معرفی والد">
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setTarget('');
              }}
            >
              <option value="username">نام کاربری</option>
              <option value="phone">شمارهٔ همراه</option>
            </select>
          </Field>
          <Field label={mode === 'phone' ? 'شمارهٔ همراه والد' : 'نام کاربری والد'}>
            <input
              dir="ltr"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={mode === 'phone' ? '0912…' : '@username'}
            />
          </Field>
          <Field label="زمان انقضای دعوت">
            <JalaliDateInput withTime required value={expires} onValueChange={setExpires} />
          </Field>
          <p className={s.hint}>زمان انقضا را در آینده و حداکثر تا ۳۰ روز دیگر انتخاب کنید.</p>
          <Field label="دلیل دعوت والد">
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </fieldset>
        <Button
          type="submit"
          disabled={a.busy || !learner || !target.trim() || !expires || !reason.trim()}
        >
          {frozen ? 'بررسی دوبارهٔ همان دعوت' : 'ارسال دعوت والد'}
        </Button>
        {!!a.error && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFrozen(null);
              setReceipt(undefined);
              setTarget((v) => v);
            }}
          >
            ویرایش اطلاعات دعوت
          </Button>
        )}
      </form>
      {a.feedback}
    </>
  );
}
export { InvitationsPage } from './invitations';
