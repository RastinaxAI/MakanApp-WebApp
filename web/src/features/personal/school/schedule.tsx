'use client';
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
      title="برنامهٔ هفتگی کلاس‌ها"
      className={s.schedule}
      action={
        teach &&
        classId && (
          <Button asChild>
            <Link href={`${base}/classes/${classId}/sessions/new`}>ایجاد جلسه</Link>
          </Button>
        )
      }
    >
      <nav
        className={s.weekNavigation}
        aria-label="جابه‌جایی هفته"
        data-week-start={range.first}
        data-week-end={range.last}
      >
        <Button
          variant="outline"
          className={`${s.navigationButton} ${s.previous}`}
          aria-label="هفتهٔ قبل"
          onClick={() => setWeek((v) => shiftSchoolWeek(v, -1))}
        >
          <ChevronRight size={18} />
          <span>هفتهٔ قبل</span>
        </Button>
        <div className={s.range}>
          <p className={s.weekLabel} aria-live="polite" aria-atomic="true">
            {range.label}
          </p>
          <span>شنبه تا جمعه</span>
        </div>
        <Button
          variant="ghost"
          className={`${s.navigationButton} ${s.current}`}
          disabled={week === thisWeek}
          onClick={() => setWeek(thisWeek)}
        >
          هفتهٔ جاری
        </Button>
        <Button
          variant="outline"
          className={`${s.navigationButton} ${s.next}`}
          aria-label="هفتهٔ بعد"
          onClick={() => setWeek((v) => shiftSchoolWeek(v, 1))}
        >
          <span>هفتهٔ بعد</span>
          <ChevronLeft size={18} />
        </Button>
      </nav>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : invalid ? (
        <p role="alert">برنامهٔ این فضای آموزشی قابل نمایش نیست.</p>
      ) : groups.length ? (
        <div className={s.agenda} aria-label="جلسه‌های هفته">
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
                            {time(item.startUtc)} تا {time(item.endUtc)}
                            {sessionEndDayLabel(item.startUtc, item.endUtc) && (
                              <time dateTime={localCalendarDay(item.endUtc)} title="روز پایان جلسه">
                                {' '}
                                ({sessionEndDayLabel(item.startUtc, item.endUtc)})
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
                          ورود به جلسه
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
          <EmptyState
            title="برای این هفته جلسه‌ای ثبت نشده است"
            description="با دکمه‌های هفتهٔ قبل و هفتهٔ بعد، جلسه‌های دیگر را ببینید."
          />
        </div>
      )}
    </Card>
  );
}
