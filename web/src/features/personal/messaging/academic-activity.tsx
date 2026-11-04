'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { BookOpen, ClipboardList, FileQuestion, RefreshCw, CalendarDays } from 'lucide-react';
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
  if (!card || !academicActivityMatches(message, summary)) return <p>{uiText.text_734d018ac4a2}</p>;
  const matching =
    session.context.workspaceType === 'Organization' &&
    session.context.organizationId === card.organizationId;
  const current = matching && card.isActionable && card.state !== 'Superseded';
  const Icon = {
    Lesson: BookOpen,
    Assignment: ClipboardList,
    Exam: FileQuestion,
    Session: CalendarDays,
  }[card.kind];
  const name = {
    Lesson: uiText.text_24bd7a24b162,
    Assignment: uiText.text_b9bdf50e5da3,
    Exam: uiText.text_206d5b48e297,
    Session: uiText.text_69450aad3cb7,
  }[card.kind];
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
        card.kind === 'Session'
          ? `/api/v1/academic/classes/${card.classId}/sessions`
          : card.kind === 'Exam'
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
    <section className={s.activity} aria-label={uiText.text_2b89c5e7c77c + name}>
      <span className={s.badge}>
        <Icon size={19} />
        {card.kind === 'Session'
          ? {
              Scheduled: uiText.text_dbc69e9ad1f5,
              Rescheduled: uiText.text_e8d6542230fa,
              Cancelled: uiText.text_2c7adbf2d789,
              Completed: uiText.text_fb55e9f21f27,
            }[card.sessionAction ?? 'Scheduled']
          : name + uiText.text_51f78cd291fd}
      </span>
      <h3>{card.title}</h3>
      <dl>
        {card.dueAtUtc && (
          <div>
            <dt>{uiText.text_2b26e703adf2}</dt>
            <dd>{date(card.dueAtUtc, true)}</dd>
          </div>
        )}
        {card.availableFromUtc && (
          <div>
            <dt>{uiText.text_8ea5a5c720cd}</dt>
            <dd>{date(card.availableFromUtc, true)}</dd>
          </div>
        )}
        {card.availableUntilUtc && (
          <div>
            <dt>{uiText.text_5cff509ed1c9}</dt>
            <dd>{date(card.availableUntilUtc, true)}</dd>
          </div>
        )}
      </dl>
      {current ? (
        <Button asChild>
          <Link href={academicActivityHref(card)}>
            {uiText.text_ea1fc651da61}
            {name}
          </Link>
        </Button>
      ) : (
        <>
          <Button disabled variant="outline">
            {uiText.text_15f8a8202db0}
          </Button>
          <small>{uiText.text_9097c960cf50}</small>
          {matching && (
            <Button variant="ghost" disabled={busy} onClick={() => void refreshCurrent()}>
              <RefreshCw size={16} />
              {busy ? uiText.text_25384e522776 : uiText.text_382037f6b1a3}
            </Button>
          )}
        </>
      )}
      {!!error && <ErrorState error={error} onRetry={() => void refreshCurrent()} />}
    </section>
  );
}
