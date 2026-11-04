import * as uiText from '@/content/fa';
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
      name: uiText.text_d35bc9b4b25d,
      empty: uiText.text_611356e361a9,
      item: session,
      Icon: CalendarDays,
    },
    {
      name: uiText.text_d82ca42d9c0d,
      empty: uiText.text_291b5a9c5116,
      item: assignment,
      Icon: ClipboardList,
    },
    {
      name: uiText.text_5699366d499f,
      empty: uiText.text_f8f7ac073471,
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
                {uiText.text_d2c8a80d171e}
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
