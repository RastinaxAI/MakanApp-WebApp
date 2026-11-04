'use client';
import * as uiText from '@/content/fa';
import Link from '@/components/ui/app-link';
import { usePathname, useSearchParams } from 'next/navigation';
export function SectionTabs({
  tabs,
  defaultTab,
}: {
  tabs: { key: string; label: string }[];
  defaultTab: string;
}) {
  const path = usePathname(),
    params = useSearchParams();
  const current = params.get('tab') ?? defaultTab;
  return (
    <nav className="tabs" aria-label={uiText.text_26d553849a89}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          className={`tab ${current === t.key ? 'active' : ''}`}
          href={path + '?tab=' + t.key}
          aria-current={current === t.key ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
