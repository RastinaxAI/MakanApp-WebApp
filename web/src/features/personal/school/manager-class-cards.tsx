'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { BookOpen, Users, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { label, EmptyState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { base } from './shared';
import s from './manager-workspace.module.css';
export function ManagerClassCards({ items }: { items: components['schemas']['ClassResult'][] }) {
  if (!items.length)
    return <EmptyState title={uiText.text_9928a795474d} description={uiText.text_010c3bbd979e} />;
  return (
    <div className={s.classCards}>
      {items.map((item) => (
        <article key={item.id} className={s.classCard}>
          <header>
            <span className={s.courseIcon}>
              <BookOpen size={22} />
            </span>
            <div>
              <h2>{item.title}</h2>
              <p>
                {item.courseTitle}
                {uiText.text_588da4105320}
                {item.academicPeriodTitle}
              </p>
            </div>
            <span className={s.badge}>{label(item.status)}</span>
          </header>
          <p className={s.hint}>
            {uiText.text_1141507339bc}
            {item.capacity.toLocaleString('fa-IR')}
            {uiText.text_56bfaedd15bf}
          </p>
          <footer>
            <Button asChild>
              <Link
                href={`${base}/classes/${item.id}`}
                aria-label={uiText.text_ea1397131af1 + item.title}
              >
                <Users size={17} />
                {uiText.text_8d178554791f}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/classes/${item.id}?tab=reports`}>
                <ChartNoAxesCombined size={17} />
                {uiText.text_8a4c6b93d372}
              </Link>
            </Button>
          </footer>
        </article>
      ))}
    </div>
  );
}
