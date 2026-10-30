'use client';
import { PageBack } from '@/components/navigation/page-back';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { Ban, CheckCircle2, Save, ShieldCheck } from 'lucide-react';

import { useRef, useState } from 'react';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { useQueryClient } from '@tanstack/react-query';
import f from './privacy.module.css';
import s from '../personal.module.css';
import { usePersonal, usePersonalApi } from '../provider';

export function MessagingPrivacyPage() {
  const privacy = usePersonalApi<components['schemas']['MessagingPrivacySettingsResult']>(
    '/api/v1/messaging/privacy',
  );
  return (
    <div className={f.page}>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>تنظیمات / پیام‌رسان</span>
          <h1>حریم خصوصی</h1>
          <p>انتخاب کنید چه کسانی بتوانند با شما ارتباط بگیرند.</p>
        </div>
        <PageBack href="/personal/settings" />
      </div>
      {privacy.isPending ? (
        <LoadingSkeleton />
      ) : privacy.isError && !privacy.data ? (
        <ErrorState error={privacy.error} onRetry={() => void privacy.refetch()} />
      ) : (
        <PrivacyForm
          current={privacy.data!}
          reload={async () => {
            const result = await privacy.refetch();
            if (result.isError) throw result.error;
            return result.data;
          }}
        />
      )}
    </div>
  );
}
const privacyFields = [
  ['directMessagesAudience', 'دریافت پیام مستقیم', 'چه کسانی بتوانند برای شما پیام بفرستند؟'],
  ['phoneNumberVisibilityAudience', 'نمایش شمارهٔ همراه', 'چه کسانی شمارهٔ همراه شما را ببینند؟'],
  [
    'phoneNumberDiscoveryAudience',
    'پیداشدن با شمارهٔ همراه',
    'چه کسانی با واردکردن شماره، حساب شما را پیدا کنند؟',
  ],
  ['groupInvitesAudience', 'دعوت به گروه', 'چه کسانی بتوانند شما را به گروه دعوت کنند؟'],
  ['onlineAudience', 'نمایش آنلاین‌بودن', 'چه کسانی وضعیت آنلاین شما را ببینند؟'],
  ['lastSeenAudience', 'نمایش آخرین بازدید', 'چه کسانی زمان آخرین حضور شما را ببینند؟'],
] as const;
function PrivacyForm({
  current,
  reload,
}: {
  current: components['schemas']['MessagingPrivacySettingsResult'];
  reload: () => Promise<components['schemas']['MessagingPrivacySettingsResult'] | undefined>;
}) {
  const { call, session } = usePersonal();
  const cache = useQueryClient();
  const [values, setValues] = useState(current),
    [baseline, setBaseline] = useState(current),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const dirty = privacyFields.some(([key]) => values[key] !== baseline[key]);
  useUnsavedChanges(dirty);
  return (
    <form
      className={f.form}
      data-privacy-form
      onSubmit={async (event) => {
        event.preventDefault();
        if (lock.current || !dirty) return;
        lock.current = true;
        setBusy(true);
        setError(undefined);
        setSaved(false);
        try {
          const body: components['schemas']['UpdateMessagingPrivacyCommand'] = {
            directMessagesAudience: values.directMessagesAudience,
            phoneNumberVisibilityAudience: values.phoneNumberVisibilityAudience,
            phoneNumberDiscoveryAudience: values.phoneNumberDiscoveryAudience,
            groupInvitesAudience: values.groupInvitesAudience,
            expectedVersion: baseline.version,
            ...(values.onlineAudience !== undefined
              ? { onlineAudience: values.onlineAudience }
              : {}),
            ...(values.lastSeenAudience !== undefined
              ? { lastSeenAudience: values.lastSeenAudience }
              : {}),
          };
          const result = await call<components['schemas']['MessagingPrivacySettingsResult']>(
            '/api/v1/messaging/privacy',
            { method: 'PUT', body: JSON.stringify(body) },
          );
          setValues(result);
          setBaseline(result);
          setSaved(true);
          cache.setQueryData(
            ['personal', session.user.id, session.revision, '/api/v1/messaging/privacy'],
            result,
          );
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
          lock.current = false;
        }
      }}
    >
      <div className={f.intro}>
        <ShieldCheck size={24} />
        <div>
          <h2>کنترل ارتباطات شما</h2>
          <p>تغییرات پس از زدن «ثبت تنظیمات» اعمال می‌شوند.</p>
        </div>
      </div>
      {[
        { title: 'ارتباط و پیدا شدن', keys: privacyFields.slice(0, 4) },
        { title: 'وضعیت حضور', keys: privacyFields.slice(4) },
      ]
        .filter((group) => group.keys.some(([key]) => values[key] !== undefined))
        .map((group) => (
          <fieldset key={group.title} className={f.group}>
            <legend>{group.title}</legend>
            {group.keys
              .filter(([key]) => values[key] !== undefined)
              .map(([key, title, description]) => (
                <div className={f.field} key={key}>
                  <div>
                    <label htmlFor={'privacy-' + key}>{title}</label>
                    <p id={'hint-' + key}>{description}</p>
                  </div>
                  <select
                    id={'privacy-' + key}
                    aria-describedby={'hint-' + key}
                    disabled={busy}
                    value={values[key] ?? ''}
                    onChange={(e) => {
                      setSaved(false);
                      setValues((previous) => ({ ...previous, [key]: e.target.value }));
                    }}
                  >
                    <option value="" disabled>
                      تنظیم مؤثر گزارش نشده
                    </option>
                    <option value="Everyone">همه</option>
                    <option value="Contacts">مخاطبین من</option>
                    <option value="Nobody">هیچ‌کس</option>
                  </select>
                </div>
              ))}
          </fieldset>
        ))}
      <div className={f.feedback}>
        {!!error && <ErrorState error={error} />}
        {saved && (
          <p className={f.success} role="status">
            <CheckCircle2 size={18} />
            تنظیمات در سرور ثبت شد.
          </p>
        )}
      </div>
      <footer className={f.footer} data-privacy-actions>
        <p>{dirty ? 'تغییرات ثبت‌نشده دارید.' : 'تنظیمات با آخرین نسخهٔ دریافت‌شده یکسان است.'}</p>
        <div className={f.buttons}>
          <Button type="submit" disabled={busy || !dirty}>
            <Save size={18} />
            {busy ? 'در حال ثبت…' : 'ثبت تنظیمات'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (dirty && !window.confirm('تغییرات ثبت‌نشده کنار گذاشته شوند؟')) return;
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              try {
                const next = await reload();
                if (next) {
                  setValues(next);
                  setBaseline(next);
                  setSaved(false);
                  setError(undefined);
                }
              } catch (problem) {
                setError(problem);
              } finally {
                setBusy(false);
                lock.current = false;
              }
            }}
          >
            دریافت نسخهٔ تازه
          </Button>
        </div>
      </footer>
    </form>
  );
}
export function BlockedAccountsPage() {
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>تنظیمات / پیام‌رسان</span>
          <h1>حساب‌های مسدودشده</h1>
          <p>مسدودکردن ارتباط با حذف مخاطب از دفترچه تفاوت دارد.</p>
        </div>
        <PageBack href="/personal/settings" />
      </div>
      <BlockedPeople />
    </>
  );
}
function BlockedPeople() {
  const { call } = usePersonal();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<unknown>();
  const blocked = usePersonalApi<components['schemas']['BlockedUserResult'][]>(
    '/api/v1/messaging/blocks',
  );
  return (
    <section className={s.profileCard}>
      {blocked.isPending ? (
        <LoadingSkeleton />
      ) : blocked.isError ? (
        <ErrorState error={blocked.error} onRetry={() => void blocked.refetch()} />
      ) : !blocked.data.length ? (
        <EmptyState
          title="حساب مسدودشده‌ای ندارید"
          description="حساب‌هایی که مسدود می‌کنید، برای مدیریت در این بخش نمایش داده می‌شوند."
        />
      ) : (
        <div className={s.contactRows}>
          {blocked.data.map((item) => (
            <article key={item.blockId} className={s.contactRow}>
              <span className={s.avatar}>
                <Ban size={18} />
              </span>
              <div>
                <strong>{item.user.displayName}</strong>
                <small>{date(item.createdAtUtc)}</small>
              </div>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy(item.user.userId);
                  setError(undefined);
                  try {
                    await call('/api/v1/messaging/blocks/' + item.user.userId, {
                      method: 'DELETE',
                    });
                    await blocked.refetch();
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === item.user.userId ? 'در حال ثبت…' : 'رفع مسدودی'}
              </Button>
            </article>
          ))}
        </div>
      )}
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
