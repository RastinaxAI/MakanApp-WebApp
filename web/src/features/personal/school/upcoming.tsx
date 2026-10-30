import Link from 'next/link';
import { CalendarDays, ClipboardList, FileQuestion, ChevronLeft } from 'lucide-react';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { date } from '@/lib/formatting';
import s from './upcoming.module.css';
export type UpcomingItem = {
  title: string;
  classTitle: string;
  time: string | null | undefined;
  href: string;
};
export function UpcomingSummary({
  session,
  assignment,
  exam,
  loading = false,
  errors = [],
}: {
  session?: UpcomingItem | null;
  assignment?: UpcomingItem | null;
  exam?: UpcomingItem | null;
  loading?: boolean;
  errors?: unknown[];
}) {
  const cards = [
    {
      name: 'نزدیک‌ترین جلسه',
      empty: 'جلسهٔ نزدیکی در برنامه نیست',
      item: session,
      Icon: CalendarDays,
    },
    {
      name: 'نزدیک‌ترین تکلیف',
      empty: 'تکلیف نزدیکی در برنامه نیست',
      item: assignment,
      Icon: ClipboardList,
    },
    {
      name: 'نزدیک‌ترین آزمون',
      empty: 'آزمون نزدیکی در برنامه نیست',
      item: exam,
      Icon: FileQuestion,
    },
  ];
  return (
    <div className={s.cards} data-education-upcoming>
      {cards.map(({ name, empty, item, Icon }, i) => (
        <section key={name} aria-label={name} className={s.card}>
          <header>
            <span data-kind={i}>
              <Icon size={21} />
            </span>
            <h2>{name}</h2>
          </header>
          {loading ? (
            <LoadingSkeleton />
          ) : errors[i] ? (
            <ErrorState error={errors[i]} />
          ) : item ? (
            <>
              <h3>{item.title}</h3>
              <p>{item.classTitle}</p>
              <time>{date(item.time, true)}</time>
              <Link href={item.href}>
                مشاهده
                <ChevronLeft size={17} />
              </Link>
            </>
          ) : (
            <p className={s.empty}>{empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}
