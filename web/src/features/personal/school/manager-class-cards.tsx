'use client';
import Link from 'next/link';
import { BookOpen, Users, ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { label, EmptyState } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { base } from './shared';
import s from './manager-workspace.module.css';
export function ManagerClassCards({ items }: { items: components['schemas']['ClassResult'][] }) {
  if (!items.length)
    return (
      <EmptyState title="کلاسی با این مشخصات پیدا نشد" description="عبارت جستجو را تغییر دهید." />
    );
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
                {item.courseTitle} · {item.academicPeriodTitle}
              </p>
            </div>
            <span className={s.badge}>{label(item.status)}</span>
          </header>
          <p className={s.hint}>ظرفیت {item.capacity.toLocaleString('fa-IR')} نفر</p>
          <footer>
            <Button asChild>
              <Link href={`${base}/classes/${item.id}`} aria-label={'مدیریت کلاس ' + item.title}>
                <Users size={17} />
                مدیریت اعضا
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/classes/${item.id}?tab=reports`}>
                <ChartNoAxesCombined size={17} />
                عملکرد کلاس
              </Link>
            </Button>
          </footer>
        </article>
      ))}
    </div>
  );
}
