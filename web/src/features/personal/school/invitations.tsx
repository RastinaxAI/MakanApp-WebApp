'use client';
import * as uiText from '@/content/fa';
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
  ['all', uiText.text_15270886eadd],
  ['Pending', uiText.text_caac18ea6580],
  ['Accepted', uiText.text_479574e266a4],
  ['Declined', uiText.text_c7009e8ab420],
] as const;
const number = (value: number) => value.toLocaleString('fa-IR');
const emptyTitles: Record<string, string> = {
  all: uiText.text_34e352a86527,
  Pending: uiText.text_5c91e0906d2b,
  Accepted: uiText.text_522b5b16dc24,
  Declined: uiText.text_112ea868a35b,
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
          <h1>{uiText.text_9b8c54ad174a}</h1>
          <p>{uiText.text_e3198594c669}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={uiText.text_21c00a2ccfa2}
          title={uiText.text_21c00a2ccfa2}
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={18} />
        </Button>
      </header>
      <section className={s.panel} aria-label={uiText.text_ae57af37bd8e}>
        <nav className={s.filters} aria-label={uiText.text_d153e2c3035c}>
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
              {filter === 'all'
                ? uiText.text_d4b0fea5ef5e
                : filters.find(([key]) => key === filter)?.[1]}
            </h2>
            {q.isSuccess && (
              <span role="status">
                {number(rows?.length ?? 0)}
                {uiText.text_b3edaffbfcc7}
              </span>
            )}
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
              <p>{filter === 'all' ? uiText.text_59825af86252 : uiText.text_95cc4b7c9c91}</p>
              {filter !== 'all' && (
                <Button onClick={() => setFilter('all')}>{uiText.text_d8500c556282}</Button>
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
    <article className={s.card} aria-label={uiText.text_e287db188fec + i.organizationName}>
      <header>
        <span className={s.icon}>
          <Building2 size={23} />
        </span>
        <div>
          <h2>{i.organizationName}</h2>
          <p>
            {uiText.text_52b5719c93bf}
            {i.guardianLearnerDisplayName ? uiText.text_d4add45dd348 : uiText.text_fbf138fe1b5a}
          </p>
        </div>
        <span className={s.status} data-status={status}>
          {label(status)}
        </span>
      </header>
      <div className={s.overview}>
        <div className={s.role}>
          <Mail size={18} />
          <span>
            {uiText.text_7749ac890d07}
            <strong>{label(i.role)}</strong>
          </span>
        </div>
        <div className={s.deadline}>
          <CalendarDays size={17} />
          <span>
            {uiText.text_36a9f930995b}
            <strong>{date(i.expiresAtUtc)}</strong>
          </span>
        </div>
      </div>
      {i.guardianLearnerDisplayName && (
        <p className={s.person}>
          {uiText.text_9a8ff9e33a79}
          <strong>{i.guardianLearnerDisplayName}</strong>
        </p>
      )}
      {i.organizationPersonDisplayName && (
        <p className={s.person}>
          {uiText.text_fe34977f1c1d}
          <strong>{i.organizationPersonDisplayName}</strong>
        </p>
      )}
      <details className={s.details}>
        <summary>
          {uiText.text_fc6edfd5cebe}
          <ChevronDown size={17} />
        </summary>
        <dl>
          <div>
            <dt>{uiText.navigation_education}</dt>
            <dd>{i.organizationName}</dd>
          </div>
          <div>
            <dt>{uiText.text_628d512903fe}</dt>
            <dd>{label(i.role)}</dd>
          </div>
          <div>
            <dt>{uiText.text_68d7eb08efbc}</dt>
            <dd>{label(status)}</dd>
          </div>
          <div>
            <dt>{uiText.text_b4f08dbb3ac5}</dt>
            <dd>{date(i.expiresAtUtc, true)}</dd>
          </div>
        </dl>
        {i.requiresPersonLinkConsent && <p>{uiText.text_55e6bc158c7d}</p>}
        {i.requiresGuardianConsent && <p>{uiText.text_7c074caf8735}</p>}
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
              {uiText.text_f187d8d6bfc6}
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
              {uiText.text_0cd10f957b27}
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
              {uiText.text_89c9d5704210}
            </Button>
            <Button
              variant="outline"
              disabled={a.busy}
              onClick={() => {
                if (window.confirm(uiText.text_a403d91d1d93))
                  void a.run(`/api/v1/invitations/${i.id}/decline`);
              }}
            >
              <X size={18} />
              {uiText.text_60b03c070e6f}
            </Button>
          </div>
        </div>
      )}
      {a.feedback}
    </article>
  );
}
