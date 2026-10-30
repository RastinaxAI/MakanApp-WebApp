'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { BookOpen, ClipboardList, FileQuestion, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { date } from '@/lib/formatting';
import type { components } from '@/generated/api/schema';
import { usePersonal } from '../provider';
import { academicActivityHref, academicActivityMatches } from './official-model';
import s from '../school/official-spaces.module.css';
type S = components['schemas'];

export function AcademicActivity({
  message,
  summary,
  onRefresh,
}: {
  message: S['ConversationMessageResult'];
  summary: S['ConversationSummaryResult'];
  onRefresh: () => Promise<unknown>;
}) {
  const { session, call } = usePersonal();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const lock = useRef(false);
  const card = message.academicActivity;
  if (!card || !academicActivityMatches(message, summary))
    return <p>اطلاعات این فعالیت در دسترس نیست.</p>;
  const matching =
    session.context.workspaceType === 'Organization' &&
    session.context.organizationId === card.organizationId;
  const current = matching && card.isActionable && card.state !== 'Superseded';
  const Icon = { Lesson: BookOpen, Assignment: ClipboardList, Exam: FileQuestion }[card.kind];
  const name = { Lesson: 'جزوه و درس', Assignment: 'تکلیف', Exam: 'آزمون' }[card.kind];
  async function refreshCurrent() {
    if (!card || !matching || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await call(
        `/api/v1/organization/classes/${card.classId}/official-spaces/activities/${card.eventId}`,
      );
      const path =
        card.kind === 'Exam'
          ? `/api/v1/academic/exams/${card.sourceId}/${session.context.activeRole === 'Student' ? 'student-preview' : 'editor'}`
          : `/api/v1/academic/${card.kind === 'Lesson' ? 'lessons' : 'assignments'}/${card.sourceId}`;
      await call(path);
      await onRefresh();
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className={s.activity} aria-label={'اعلان رسمی ' + name}>
      <span className={s.badge}>
        <Icon size={19} />
        {name} منتشرشده
      </span>
      <h3>{card.title}</h3>
      <dl>
        {card.dueAtUtc && (
          <div>
            <dt>مهلت تحویل</dt>
            <dd>{date(card.dueAtUtc, true)}</dd>
          </div>
        )}
        {card.availableFromUtc && (
          <div>
            <dt>آغاز دسترسی</dt>
            <dd>{date(card.availableFromUtc, true)}</dd>
          </div>
        )}
        {card.availableUntilUtc && (
          <div>
            <dt>پایان دسترسی</dt>
            <dd>{date(card.availableUntilUtc, true)}</dd>
          </div>
        )}
      </dl>
      {current ? (
        <Button asChild>
          <Link href={academicActivityHref(card)}>مشاهدهٔ {name}</Link>
        </Button>
      ) : (
        <>
          <Button disabled variant="outline">
            این نسخه قابل استفاده نیست
          </Button>
          <small>اطلاعات جاری فعالیت باید دوباره بررسی شود.</small>
          {matching && (
            <Button variant="ghost" disabled={busy} onClick={() => void refreshCurrent()}>
              <RefreshCw size={16} />
              {busy ? 'در حال بررسی…' : 'بررسی نسخهٔ جاری'}
            </Button>
          )}
        </>
      )}
      {!!error && <ErrorState error={error} onRetry={() => void refreshCurrent()} />}
    </section>
  );
}
