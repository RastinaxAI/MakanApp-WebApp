'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import {
  School,
  UsersRound,
  BotMessageSquare,
  MessagesSquare,
  CircleUserRound,
} from 'lucide-react';
import { activeNavigation, navigation } from '@/config/navigation';
import * as uiText from '@/content/fa';
import s from './app-navigation.module.css';
import tokens from '../../../design/tokens.json';

const icons = {
  education: School,
  extracurricular: UsersRound,
  assistant: BotMessageSquare,
  messages: MessagesSquare,
  profile: CircleUserRound,
};
const previewViews = {
  education: 'MK-04',
  extracurricular: 'MK-11',
  assistant: 'MK-38',
  messages: 'MK-35',
  profile: 'MK-47',
};

/** One set of destinations, glyphs and selected states for every application surface. */
export function AppNavigation({
  presentation = 'adaptive',
  activeHref,
  preview = false,
}: {
  presentation?: 'sidebar' | 'dock' | 'adaptive';
  activeHref?: string;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const current = activeHref ?? activeNavigation(pathname);
  return (
    <nav
      className={`${s.navigation} ${s[presentation]}`}
      aria-label={uiText.text_049e4c61b067}
      data-app-navigation
      data-navigation-presentation={presentation}
      style={{ '--navigation-icon-size': `${tokens.layout.navIcon}px` } as CSSProperties}
    >
      {navigation.map((item) => {
        const Icon = icons[item.icon];
        const href = preview ? '/preview/reference/' + previewViews[item.icon] : item.href;
        return (
          <Link
            key={item.href}
            href={href}
            prefetch={false}
            className={s.item}
            aria-label={item.name}
            title={item.name}
            aria-current={current === item.href ? 'page' : undefined}
            data-navigation-target={href}
          >
            <span className={s.glyph} aria-hidden="true">
              <Icon size={tokens.layout.navIcon} strokeWidth={1.8} />
            </span>
            <span className={s.label}>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
