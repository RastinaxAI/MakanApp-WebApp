'use client';
import { PageBack } from '@/components/navigation/page-back';
import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { AtSign, UserRound, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JalaliDateInput } from '@/components/ui/jalali-date-input';
import { ErrorState } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { usePersonal } from './provider';
import { ProfilePhotoEditor } from './profile-photo';
import { localToday, profilePatch } from './profile-model';
import s from './profile-edit.module.css';

export function PersonalProfileEdit() {
  const { session, call, reload } = usePersonal(),
    router = useRouter();
  const [values, setValues] = useState({
    firstName: session.user.firstName ?? '',
    lastName: session.user.lastName ?? '',
    displayName: session.user.displayName ?? '',
    username: session.user.username ?? '',
    dateOfBirth: session.user.dateOfBirth ?? '',
  });
  const [busy, setBusy] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const dirty = Object.entries(values).some(
    ([key, value]) => value !== (session.user[key as keyof typeof values] ?? ''),
  );
  useUnsavedChanges(dirty);
  return (
    <div className={s.page} data-profile-form>
      <header className={s.heading}>
        <span>حساب من</span>
        <h1>ویرایش پروفایل</h1>
        <p>اطلاعات و تصویر حساب خود را به‌روز کنید.</p>
      </header>
      <div className={s.photoPanel}>
        <ProfilePhotoEditor disabled={busy || dirty} onBusyChange={setPhotoBusy} />
      </div>
      <form
        className={s.form}
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || photoBusy) return;
          setBusy(true);
          setError(undefined);
          try {
            await call('/api/v1/me/profile', {
              method: 'PATCH',
              body: JSON.stringify(profilePatch(values)),
            });
            await reload();
            router.replace('/personal/profile');
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className={s.section} disabled={busy || photoBusy}>
          <legend>
            <UserRound size={20} />
            مشخصات فردی
          </legend>
          <div className={s.fields}>
            {(
              [
                { key: 'firstName', label: 'نام', autoComplete: 'given-name' },
                { key: 'lastName', label: 'نام خانوادگی', autoComplete: 'family-name' },
                { key: 'displayName', label: 'نام نمایشی', autoComplete: 'nickname' },
              ] as const
            ).map((field) => (
              <label key={field.key} className={field.key === 'displayName' ? s.full : undefined}>
                {field.label}
                <input
                  autoComplete={field.autoComplete}
                  value={values[field.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={s.section} disabled={busy || photoBusy}>
          <legend>
            <AtSign size={20} />
            نام کاربری
          </legend>
          <label htmlFor="profile-username">نام کاربری</label>
          <div className={s.username}>
            <span aria-hidden="true">@</span>
            <input
              id="profile-username"
              dir="ltr"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={values.username}
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            />
          </div>
        </fieldset>
        <fieldset className={s.section} disabled={busy || photoBusy}>
          <legend>
            <CalendarDays size={20} />
            تاریخ تولد
          </legend>
          <label htmlFor="profile-birth-date">تاریخ تولد (اختیاری)</label>
          <JalaliDateInput
            id="profile-birth-date"
            value={values.dateOfBirth}
            max={localToday()}
            disabled={busy || photoBusy}
            aria-describedby="birth-date-help"
            onValueChange={(dateOfBirth) => setValues((v) => ({ ...v, dateOfBirth }))}
          />
          <p id="birth-date-help" className={s.help}>
            این تاریخ خوداظهاری است و جای تأیید سن را نمی‌گیرد.
            {session.user.dateOfBirth && !values.dateOfBirth
              ? ' خالی‌گذاشتن این فیلد، تاریخ قبلی را حفظ می‌کند.'
              : ''}
          </p>
        </fieldset>
        {!!error && <ErrorState error={error} />}
        <footer className={s.actions}>
          <Button type="submit" disabled={busy || photoBusy}>
            {busy ? 'در حال ثبت…' : 'ثبت تغییرات'}
          </Button>
          <PageBack href="/personal/profile" />
        </footer>
      </form>
    </div>
  );
}
