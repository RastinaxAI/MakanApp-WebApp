'use client';
import * as uiText from '@/content/fa';
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
          <span className={s.eyebrow}>{uiText.text_e5b141057b67}</span>
          <h1>{records ? uiText.text_11a6a5d76e76 : uiText.text_34e7820beb9d}</h1>
          <p>{records ? uiText.text_86a659343e8f : uiText.text_318c4a9036f3}</p>
        </div>
        <Button asChild>
          <Link href={base + '/people/new'}>
            <FolderPlus size={18} />
            {uiText.text_68c9cbc200a9}
          </Link>
        </Button>
      </header>
      <nav className={s.sections} aria-label={uiText.text_4f417e40c6d1}>
        <Link href={base + '/members'} aria-current={!records ? 'page' : undefined}>
          <Users size={19} />
          {uiText.text_34e7820beb9d}
        </Link>
        <Link href={base + '/people'} aria-current={records ? 'page' : undefined}>
          <FolderOpen size={19} />
          {uiText.text_11a6a5d76e76}
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
        <small>
          {caption ??
            (username ? (
              <bdi>
                {uiText.text_c3641f8544d7}
                {username}
              </bdi>
            ) : (
              uiText.text_becb77371bdf
            ))}
        </small>
      </div>
    </div>
  );
}
