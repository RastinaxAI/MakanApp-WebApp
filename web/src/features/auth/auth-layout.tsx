'use client';
import * as uiText from '@/content/fa';
import type { ReactNode } from 'react';
import { CalendarDays, MessagesSquare, UsersRound, ShieldCheck } from 'lucide-react';
import s from './auth-layout.module.css';
import { ReferenceBrand } from '@/components/ui/brand';
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={s.page} data-auth-layout>
      <aside className={s.intro} aria-label={uiText.text_4ba03a40a8d4}>
        <div className={s.brand}>
          <ReferenceBrand />
        </div>
        <h1>
          {uiText.text_f1f1352e3a44}
          <br />
          {uiText.text_f51cf6c76e5a}
        </h1>
        <p className={s.lead}>{uiText.text_be6525cc039a}</p>
        <div className={s.features}>
          {[
            [CalendarDays, uiText.text_3b85559794f7, uiText.text_83762c213935],
            [UsersRound, uiText.text_973a4cd40e8c, uiText.text_fc5cf6c16c2b],
            [MessagesSquare, uiText.text_2f8fb5d35b1a, uiText.text_f59e7370a798],
          ].map(([Icon, title, description]) => {
            const Glyph = Icon as typeof CalendarDays;
            return (
              <div className={s.feature} key={String(title)}>
                <span>
                  <Glyph size={23} />
                </span>
                <div>
                  <h2>{String(title)}</h2>
                  <p>{String(description)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className={s.privacy}>
          <ShieldCheck size={20} />
          {uiText.text_caafa211ea9f}
        </p>
      </aside>
      <section className={s.formPane} aria-label={uiText.text_53e6fda46753}>
        {children}
      </section>
    </main>
  );
}
