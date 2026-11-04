'use client';
import * as uiText from '@/content/fa';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton, label } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { usePersonalApi, usePersonal } from '../provider';
import { Card, safeMeetingUrl, base } from './shared';
import Link from 'next/link';
import {
  currentSchoolWeek,
  shiftSchoolWeek,
  schoolWeekRange,
  localCalendarDay,
  sessionEndDayLabel,
} from './calendar-model';
import s from './schedule.module.css';
type S = components['schemas'];
export function Schedule({ classId, teach }: { classId?: string; teach: boolean }) {
  const thisWeek = currentSchoolWeek();
  const [week, setWeek] = useState(() => thisWeek),
    range = schoolWeekRange(week),
    { session } = usePersonal();
  const q = usePersonalApi<S['SessionResult'][]>(
    '/api/v1/academic/schedule?' +
      new URLSearchParams({ fromUtc: range.fromUtc, toUtc: range.toUtc }),
    { poll: 10000 },
  );
  const invalid = q.data?.some((item) => item.organizationId !== session.context.organizationId);
  const items = (q.data ?? [])
    .filter(
      (item) =>
        (!classId || item.classId === classId) &&
        Date.parse(item.startUtc) >= Date.parse(range.fromUtc) &&
        Date.parse(item.startUtc) <= Date.parse(range.toUtc),
    )
    .sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
  const groups = range.days
    .map((day) => ({
      ...day,
      items: items.filter((item) => localCalendarDay(item.startUtc) === day.date),
    }))
    .filter((day) => day.items.length > 0);
  const time = (value: string) =>
    new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(value),
    );
  return (
    <Card
      title={uiText.text_2fdcd8a1bdba}
      className={s.schedule}
      action={
        teach &&
        classId && (
          <Button asChild>
            <Link href={`${base}/classes/${classId}/sessions/new`}>{uiText.text_8a8bca7672c8}</Link>
          </Button>
        )
      }
    >
      <nav
        className={s.weekNavigation}
        aria-label={uiText.text_ba767b9a0d5e}
        data-week-start={range.first}
        data-week-end={range.last}
      >
        <Button
          variant="outline"
          className={`${s.navigationButton} ${s.previous}`}
          aria-label={uiText.text_e32082a4e12f}
          onClick={() => setWeek((v) => shiftSchoolWeek(v, -1))}
        >
          <ChevronRight size={18} />
          <span>{uiText.text_e32082a4e12f}</span>
        </Button>
        <div className={s.range}>
          <p className={s.weekLabel} aria-live="polite" aria-atomic="true">
            {range.label}
          </p>
          <span>{uiText.text_fcd0612e300b}</span>
        </div>
        <Button
          variant="ghost"
          className={`${s.navigationButton} ${s.current}`}
          disabled={week === thisWeek}
          onClick={() => setWeek(thisWeek)}
        >
          {uiText.text_cf12b2fabd7e}
        </Button>
        <Button
          variant="outline"
          className={`${s.navigationButton} ${s.next}`}
          aria-label={uiText.text_4c6c8570d091}
          onClick={() => setWeek((v) => shiftSchoolWeek(v, 1))}
        >
          <span>{uiText.text_4c6c8570d091}</span>
          <ChevronLeft size={18} />
        </Button>
      </nav>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : invalid ? (
        <p role="alert">{uiText.text_be58b9137dd7}</p>
      ) : groups.length ? (
        <div className={s.agenda} aria-label={uiText.text_85454321f228}>
          {groups.map((day) => (
            <section
              key={day.date}
              className={s.dayGroup}
              aria-label={day.weekday + ' ' + day.label}
            >
              <header>
                <h3>{day.weekday}</h3>
                <time dateTime={day.date}>{day.label}</time>
              </header>
              <div className={s.sessions}>
                {day.items.map((item) => (
                  <article key={item.id} className={s.session}>
                    <div className={s.sessionBody}>
                      <h4>
                        <Link href={`${base}/sessions/${item.id}`}>{item.title}</Link>
                      </h4>
                      {!classId && <p>{item.classTitle}</p>}
                      <div className={s.sessionMeta}>
                        <span>
                          <Clock3 size={15} />
                          <bdi>
                            {time(item.startUtc)}
                            {uiText.text_7168a3799fbf}
                            {time(item.endUtc)}
                            {sessionEndDayLabel(item.startUtc, item.endUtc) && (
                              <time
                                dateTime={localCalendarDay(item.endUtc)}
                                title={uiText.text_d61ca8f948c8}
                              >
                                {' '}
                                {uiText.text_32ebb1abcc1c}
                                {sessionEndDayLabel(item.startUtc, item.endUtc)}
                                {uiText.text_ba5ec51d07a4}
                              </time>
                            )}
                          </bdi>
                        </span>
                        <span className={s.status}>{label(item.status)}</span>
                      </div>
                    </div>
                    {item.status === 'Scheduled' && safeMeetingUrl(item.meetingUrl) && (
                      <Button asChild variant="outline">
                        <a
                          href={safeMeetingUrl(item.meetingUrl)!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {uiText.text_b1fa64d456bf}
                        </a>
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <EmptyState title={uiText.text_0ebd449a5ce9} description={uiText.text_a2a9b91a28ef} />
        </div>
      )}
    </Card>
  );
}
