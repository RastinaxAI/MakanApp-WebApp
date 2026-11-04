'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { CalendarDays, MessagesSquare, UsersRound } from 'lucide-react';
import { BrandMark } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import s from './welcome.module.css';
export function WelcomePage() {
  return (
    <main className={s.page}>
      <div className={s.content}>
        <BrandMark />
        <h1>
          {uiText.text_f1f1352e3a44}
          <br />
          {uiText.text_f51cf6c76e5a}
        </h1>
        <p>{uiText.text_e4edd014da62}</p>
        <div className={s.features}>
          {[
            [CalendarDays, uiText.text_3b85559794f7, uiText.text_9561aa5b11b0],
            [UsersRound, uiText.text_973a4cd40e8c, uiText.text_87721ba89db6],
            [MessagesSquare, uiText.text_2f8fb5d35b1a, uiText.text_b76881edda77],
          ].map(([Icon, title, description]) => {
            const Glyph = Icon as typeof CalendarDays;
            return (
              <article key={String(title)}>
                <Glyph size={24} />
                <div>
                  <h2>{String(title)}</h2>
                  <p>{String(description)}</p>
                </div>
              </article>
            );
          })}
        </div>
        <p>{uiText.text_ce6a15857208}</p>
        <Button asChild>
          <Link href="/enter">{uiText.text_b788f2ef91e8}</Link>
        </Button>
      </div>
    </main>
  );
}
