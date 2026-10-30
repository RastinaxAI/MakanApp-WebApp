'use client';
import Link from 'next/link';
import { FolderPlus, FolderOpen, Users, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base } from './shared';
import s from './people.module.css';

export function DirectoryHeader({ records = false }: { records?: boolean }) {
  return (
    <>
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>مدیریت آموزشگاه</span>
          <h1>{records ? 'پرونده‌های آموزشی' : 'اعضای آموزشگاه'}</h1>
          <p>
            {records
              ? 'اطلاعات فردی و وضعیت اتصال پرونده‌ها به حساب کاربران'
              : 'معلمان، دانش‌آموزان و والدین آموزشگاه، در یک فهرست'}
          </p>
        </div>
        <Button asChild>
          <Link href={base + '/people/new'}>
            <FolderPlus size={18} />
            افزودن پرونده
          </Link>
        </Button>
      </header>
      <nav className={s.sections} aria-label="اعضا و پرونده‌ها">
        <Link href={base + '/members'} aria-current={!records ? 'page' : undefined}>
          <Users size={19} />
          اعضای آموزشگاه
        </Link>
        <Link href={base + '/people'} aria-current={records ? 'page' : undefined}>
          <FolderOpen size={19} />
          پرونده‌های آموزشی
        </Link>
      </nav>
    </>
  );
}
export function RecordIdentity({
  name,
  username,
  caption,
}: {
  name: string;
  username?: string | null;
  caption?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => Array.from(n)[0])
    .join('');
  return (
    <div className={s.identity}>
      <span className={s.avatar} aria-hidden="true">
        {initials || <UserRound size={22} />}
      </span>
      <div>
        <strong>{name}</strong>
        <small>{caption ?? (username ? <bdi>@{username}</bdi> : 'نام کاربری ثبت نشده')}</small>
      </div>
    </div>
  );
}
