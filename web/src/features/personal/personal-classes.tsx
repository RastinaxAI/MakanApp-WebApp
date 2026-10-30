'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState } from '@/components/ui/states';
import { PageBack } from '@/components/navigation/page-back';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from './provider';
import { useAccountAction } from './use-account-action';
import { resolvePersonInput } from './messaging/directory';
import s from './service-layout.module.css';
type S = components['schemas'];
const base = '/personal/classes',
  api = '/api/v1/personal-classes';
export function PersonalClasses() {
  const q = usePersonalApi<S['PersonalClassDto'][]>(api, { poll: 10000 });
  const invitations = usePersonalApi<S['PersonalClassInvitationDto'][]>(api + '/invitations', {
    poll: 10000,
  });
  return (
    <div className={s.page}>
      <PageBack href="/personal/profile" />
      <header className={s.heading}>
        <div>
          <h1>کلاس‌های شخصی</h1>
          <p>این کلاس‌ها مستقل از آموزشگاه و نقش‌های سازمانی شما هستند.</p>
        </div>
        <Button asChild>
          <Link href={base + '/new'}>ایجاد کلاس شخصی</Link>
        </Button>
      </header>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.length ? (
        <div className={s.grid}>
          {q.data.map((c) => (
            <section className={s.panel} key={c.id}>
              <h2>{c.title}</h2>
              <p className={s.hint}>
                {c.isHost ? 'میزبان کلاس' : 'عضو کلاس'}
                {c.archived ? ' · بایگانی‌شده' : ''}
              </p>
              <Button asChild variant="outline">
                <Link href={base + '/' + c.id}>مشاهدهٔ کلاس شخصی</Link>
              </Button>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="کلاس شخصی ندارید"
          description="در صورت مجازبودن حساب، می‌توانید کلاس شخصی بسازید یا دعوتی را بپذیرید."
        />
      )}
      <section className={s.panel}>
        <h2>دعوت‌های کلاس شخصی</h2>
        {invitations.isPending ? (
          <LoadingSkeleton />
        ) : invitations.isError ? (
          <ErrorState error={invitations.error} />
        ) : invitations.data.length ? (
          invitations.data.map((i) => <PersonalInvitation key={i.id} value={i} />)
        ) : (
          <p className={s.hint}>دعوتی دریافت نشده است.</p>
        )}
      </section>
    </div>
  );
}
function PersonalInvitation({ value }: { value: S['PersonalClassInvitationDto'] }) {
  const { session } = usePersonal(),
    a = useAccountAction();
  const q = usePersonalApi<S['PersonalClassDto']>(api + '/' + value.personalClassId);
  const [accepted, setAccepted] = useState(value.accepted);
  const expired = Date.parse(value.expiresAtUtc) <= Date.now();
  return (
    <div className={s.panel}>
      <strong>{q.data?.title ?? 'دعوت به کلاس شخصی'}</strong>
      <details className={s.meta}>
        <summary>شناسهٔ کلاس و مهلت دعوت</summary>
        <bdi>{value.personalClassId}</bdi>
        <p>{date(value.expiresAtUtc, true)}</p>
      </details>
      {!q.data && (
        <p className={s.hint}>
          نام کلاس در اطلاعات این دعوت در دسترس نیست؛ شناسهٔ آن را با دعوت‌کننده تطبیق دهید.
        </p>
      )}
      <Button
        disabled={a.busy || accepted || expired || value.destinationUserId !== session.user.id}
        onClick={async () => {
          const result = await a.run<S['PersonalClassDto']>(
            api + '/invitations/' + value.id + '/accept',
          );
          if (result) setAccepted(true);
        }}
      >
        {accepted ? 'پذیرفته‌شده' : expired ? 'مهلت دعوت تمام شده' : 'پذیرش دعوت کلاس شخصی'}
      </Button>
      {!!a.error && <ErrorState error={a.error} />}
    </div>
  );
}
export function PersonalClassCreate() {
  const router = useRouter(),
    a = useAccountAction();
  const [title, setTitle] = useState(''),
    [frozen, setFrozen] = useState<S['CreatePersonalClassCommand']>();
  const saved = useRef(false);
  useUnsavedChanges(!saved.current && !!title.trim());
  return (
    <div className={s.page}>
      <PageBack href={base} />
      <h1>ایجاد کلاس شخصی</h1>
      <form
        className={s.panel}
        onSubmit={async (e) => {
          e.preventDefault();
          const command = frozen ?? { title: title.trim(), clientOperationId: crypto.randomUUID() };
          setFrozen(command);
          const result = await a.run<S['PersonalClassDto']>(api, command);
          if (result) {
            saved.current = true;
            router.push(base + '/' + result.id);
          }
        }}
      >
        <label className={s.field}>
          نام کلاس شخصی
          <input
            required
            value={title}
            disabled={a.busy || !!frozen}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <p className={s.hint}>
          ساخت این کلاس، آموزشگاه یا نقش آموزشی رسمی ایجاد نمی‌کند. امکانات درسی مستقل این نوع کلاس
          هنوز ارائه نشده‌اند.
        </p>
        <Button disabled={a.busy || !title.trim()}>
          {frozen ? 'بررسی دوبارهٔ ساخت همین کلاس' : 'ثبت کلاس شخصی'}
        </Button>
        {!!a.error && (
          <>
            <ErrorState error={a.error} />
            <Button type="button" variant="outline" onClick={() => setFrozen(undefined)}>
              ویرایش نام پیش از درخواست تازه
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
export function PersonalClassDetail({ id }: { id: string }) {
  const q = usePersonalApi<S['PersonalClassDto']>(api + '/' + id, { poll: 10000 });
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.data.id !== id)
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  return (
    <PersonalClassBody
      key={id}
      value={q.data}
      refresh={async () => {
        await q.refetch({ throwOnError: true });
      }}
    />
  );
}
function PersonalClassBody({
  value,
  refresh,
}: {
  value: S['PersonalClassDto'];
  refresh: () => Promise<void>;
}) {
  const { call } = usePersonal(),
    a = useAccountAction();
  const participants = usePersonalApi<S['PersonalClassParticipantDto'][]>(
    api + '/' + value.id + '/participants',
    { poll: 10000 },
  );
  const [target, setTarget] = useState(''),
    [person, setPerson] = useState<S['MessagingPublicProfileResult']>(),
    [issue, setIssue] = useState('');
  const operation = useRef<string | undefined>(undefined);
  return (
    <div className={s.page}>
      <PageBack href={base} />
      <header className={s.heading}>
        <div>
          <h1>{value.title}</h1>
          <p>
            {value.archived
              ? 'کلاس بایگانی‌شده'
              : value.isHost
                ? 'شما میزبان این کلاس هستید'
                : 'عضویت در کلاس شخصی'}
          </p>
        </div>
        {value.isHost && !value.archived && (
          <ConfirmAction
            trigger="بایگانی کلاس"
            title="بایگانی کلاس شخصی"
            description="این کلاس بایگانی می‌شود؛ حساب و نقش‌های آموزشگاهی تغییر نمی‌کنند."
            onConfirm={async () => {
              await call(api + '/' + value.id + '/archive', { method: 'POST' });
              await refresh();
              return true;
            }}
          />
        )}
      </header>
      <section className={s.panel}>
        <h2>اعضای کلاس</h2>
        {participants.isPending ? (
          <LoadingSkeleton />
        ) : participants.isError ? (
          <ErrorState error={participants.error} />
        ) : participants.data.length ? (
          <ul className={s.list}>
            {participants.data.map((p, i) => (
              <li key={p.id}>
                <strong>
                  عضو {(i + 1).toLocaleString('fa-IR')} · {p.active ? 'فعال' : 'پایان‌یافته'}
                </strong>
                <details className={s.meta}>
                  <summary>شناسهٔ حساب</summary>
                  <bdi>{p.studentUserId}</bdi>
                </details>
                {value.isHost && !value.archived && p.active && (
                  <ConfirmAction
                    destructive
                    trigger={'پایان عضویت ' + (i + 1).toLocaleString('fa-IR')}
                    title="پایان عضویت در کلاس شخصی"
                    description="عضویت این حساب در همین کلاس پایان می‌یابد؛ عضویت آموزشگاه او تغییر نمی‌کند."
                    onConfirm={async () => {
                      await call(`${api}/${value.id}/participants/${p.id}`, { method: 'DELETE' });
                      await participants.refetch();
                      return true;
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="عضوی در کلاس ثبت نشده است" />
        )}
      </section>
      {value.isHost && !value.archived && (
        <section className={s.panel}>
          <h2>دعوت به کلاس شخصی</h2>
          <label className={s.field}>
            شماره یا نام کاربری
            <input
              value={target}
              disabled={a.busy}
              onChange={(e) => {
                setTarget(e.target.value);
                setPerson(undefined);
                operation.current = undefined;
              }}
            />
          </label>
          <Button
            disabled={a.busy || !target.trim()}
            variant="outline"
            onClick={async () => {
              setIssue('');
              try {
                const result = await a.run<S['PeopleResolveResult']>(
                  '/api/v1/people/resolve',
                  resolvePersonInput(target),
                );
                if (result?.isDiscoverable && result.profile) setPerson(result.profile);
                else if (result) setIssue('حساب قابل دعوت پیدا نشد.');
              } catch {
                setIssue('شماره یا نام کاربری معتبر وارد کنید.');
              }
            }}
          >
            پیدا کردن حساب
          </Button>
          {person && (
            <>
              <strong>{person.displayName}</strong>
              <Button
                disabled={a.busy}
                onClick={async () => {
                  operation.current ??= crypto.randomUUID();
                  const result = await a.run<S['PersonalClassInvitationDto']>(
                    `${api}/${value.id}/invitations`,
                    { destinationUserId: person.userId, clientOperationId: operation.current },
                  );
                  if (result) setIssue('دعوت ارسال شد؛ عضویت پس از پذیرش حساب مقصد برقرار می‌شود.');
                }}
              >
                ارسال دعوت کلاس شخصی
              </Button>
            </>
          )}
          {issue && <p role="status">{issue}</p>}
          {!!a.error && <ErrorState error={a.error} />}
        </section>
      )}
      <p className={s.hint}>
        امکانات تکلیف و آزمون مستقل برای کلاس شخصی در انتشار فعلی ارائه نشده است.
      </p>
    </div>
  );
}
