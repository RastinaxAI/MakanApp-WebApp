'use client';
import { useState } from 'react';
import {
  Mail,
  MailOpen,
  Building2,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from '../provider';
import { useSchoolAction } from './shared';
import s from './invitations.module.css';
type S = components['schemas'];
const filters = [
  ['all', 'همه'],
  ['Pending', 'در انتظار'],
  ['Accepted', 'پذیرفته‌شده'],
  ['Declined', 'ردشده'],
] as const;
const number = (value: number) => value.toLocaleString('fa-IR');
const emptyTitles: Record<string, string> = {
  all: 'هنوز دعوتی دریافت نکرده‌اید',
  Pending: 'دعوتی در انتظار پاسخ ندارید',
  Accepted: 'هنوز دعوتی را نپذیرفته‌اید',
  Declined: 'دعوت ردشده‌ای ندارید',
};
function invitationStatus(i: S['InvitationResult']) {
  return i.status === 'Pending' && Date.parse(i.expiresAtUtc) <= Date.now() ? 'Expired' : i.status;
}
export function InvitationsPage() {
  const q = usePersonalApi<S['InvitationResult'][]>('/api/v1/invitations', { poll: 10000 }),
    [filter, setFilter] = useState('all');
  const rows = q.data?.filter((i) => filter === 'all' || invitationStatus(i) === filter);
  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <span className={s.pageIcon} aria-hidden="true">
          <MailOpen size={24} />
        </span>
        <div>
          <h1>دعوت‌های من</h1>
          <p>دعوت‌های آموزشگاه و ارتباط با فرزندتان را اینجا پیگیری کنید.</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="دریافت دوبارهٔ دعوت‌ها"
          title="دریافت دوبارهٔ دعوت‌ها"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={18} />
        </Button>
      </header>
      <section className={s.panel} aria-label="دعوت‌های دریافتی">
        <nav className={s.filters} aria-label="وضعیت دعوت">
          {filters.map(([key, title]) => (
            <button
              type="button"
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              <span>{title}</span>
              {q.isSuccess && (
                <span className={s.count} aria-hidden="true">
                  {number(
                    q.data.filter((i) => key === 'all' || invitationStatus(i) === key).length,
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className={s.results}>
          <div className={s.resultsHeading}>
            <h2>
              {filter === 'all' ? 'همهٔ دعوت‌ها' : filters.find(([key]) => key === filter)?.[1]}
            </h2>
            {q.isSuccess && <span role="status">{number(rows?.length ?? 0)} دعوت</span>}
          </div>
          {q.isPending ? (
            <LoadingSkeleton />
          ) : q.isError ? (
            <ErrorState error={q.error} onRetry={() => void q.refetch()} />
          ) : rows?.length ? (
            <div className={s.list}>
              {rows.map((i) => (
                <InvitationCard key={i.id} invitation={i} />
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <span className={s.emptyIcon} aria-hidden="true">
                <MailOpen size={32} strokeWidth={1.5} />
              </span>
              <h3>{emptyTitles[filter]}</h3>
              <p>
                {filter === 'all'
                  ? 'وقتی آموزشگاهی برای شما دعوت بفرستد، جزئیات و امکان پاسخ‌دادن همین‌جا نمایش داده می‌شود.'
                  : 'برای دیدن دعوت‌ها با وضعیت‌های دیگر، به فهرست همهٔ دعوت‌ها برگردید.'}
              </p>
              {filter !== 'all' && (
                <Button onClick={() => setFilter('all')}>نمایش همهٔ دعوت‌ها</Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function InvitationCard({ invitation: i }: { invitation: S['InvitationResult'] }) {
  const { reload } = usePersonal(),
    a = useSchoolAction();
  const [personConsent, setPersonConsent] = useState(false),
    [guardianConsent, setGuardianConsent] = useState(false);
  const status = invitationStatus(i),
    expired = status === 'Expired';
  const pending = i.status === 'Pending' && Number.isFinite(Date.parse(i.expiresAtUtc)) && !expired;
  return (
    <article className={s.card} aria-label={'دعوت ' + i.organizationName}>
      <header>
        <span className={s.icon}>
          <Building2 size={23} />
        </span>
        <div>
          <h2>{i.organizationName}</h2>
          <p>دعوت به {i.guardianLearnerDisplayName ? 'رابطهٔ والد و فرزند' : 'عضویت آموزشگاه'}</p>
        </div>
        <span className={s.status} data-status={status}>
          {label(status)}
        </span>
      </header>
      <div className={s.overview}>
        <div className={s.role}>
          <Mail size={18} />
          <span>
            نقش پیشنهادی: <strong>{label(i.role)}</strong>
          </span>
        </div>
        <div className={s.deadline}>
          <CalendarDays size={17} />
          <span>
            اعتبار دعوت <strong>{date(i.expiresAtUtc)}</strong>
          </span>
        </div>
      </div>
      {i.guardianLearnerDisplayName && (
        <p className={s.person}>
          فرزند: <strong>{i.guardianLearnerDisplayName}</strong>
        </p>
      )}
      {i.organizationPersonDisplayName && (
        <p className={s.person}>
          پروندهٔ آموزشی: <strong>{i.organizationPersonDisplayName}</strong>
        </p>
      )}
      <details className={s.details}>
        <summary>
          جزئیات دعوت
          <ChevronDown size={17} />
        </summary>
        <dl>
          <div>
            <dt>آموزشگاه</dt>
            <dd>{i.organizationName}</dd>
          </div>
          <div>
            <dt>نقش</dt>
            <dd>{label(i.role)}</dd>
          </div>
          <div>
            <dt>وضعیت</dt>
            <dd>{label(status)}</dd>
          </div>
          <div>
            <dt>مهلت پاسخ</dt>
            <dd>{date(i.expiresAtUtc, true)}</dd>
          </div>
        </dl>
        {i.requiresPersonLinkConsent && (
          <p>پذیرش این دعوت، پروندهٔ آموزشی نمایش‌داده‌شده را به حساب شما متصل می‌کند.</p>
        )}
        {i.requiresGuardianConsent && (
          <p>پذیرش این دعوت، رابطهٔ والد با فرزند مشخص‌شده را در همین آموزشگاه تأیید می‌کند.</p>
        )}
      </details>
      {pending && (
        <div className={s.response}>
          {i.requiresPersonLinkConsent && (
            <label>
              <input
                type="checkbox"
                checked={personConsent}
                onChange={(e) => setPersonConsent(e.target.checked)}
                disabled={a.busy}
              />
              اتصال این پروندهٔ آموزشی به حساب خودم را تأیید می‌کنم.
            </label>
          )}
          {i.requiresGuardianConsent && (
            <label>
              <input
                type="checkbox"
                checked={guardianConsent}
                onChange={(e) => setGuardianConsent(e.target.checked)}
                disabled={a.busy}
              />
              رابطهٔ والد با فرزند مشخص‌شده در همین آموزشگاه را تأیید می‌کنم.
            </label>
          )}
          <div className={s.actions}>
            <Button
              disabled={
                a.busy ||
                (i.requiresPersonLinkConsent && !personConsent) ||
                (i.requiresGuardianConsent && !guardianConsent)
              }
              onClick={async () => {
                const result = await a.run<S['AcceptInvitationResult']>(
                  `/api/v1/invitations/${i.id}/accept`,
                  { confirmPersonLink: personConsent, confirmGuardianRelation: guardianConsent },
                );
                if (result) await reload();
              }}
            >
              <Check size={18} />
              پذیرش دعوت
            </Button>
            <Button
              variant="outline"
              disabled={a.busy}
              onClick={() => {
                if (window.confirm('این دعوت رد شود؟'))
                  void a.run(`/api/v1/invitations/${i.id}/decline`);
              }}
            >
              <X size={18} />
              رد دعوت
            </Button>
          </div>
        </div>
      )}
      {a.feedback}
    </article>
  );
}
