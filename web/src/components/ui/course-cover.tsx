import * as uiText from '@/content/fa';
import s from './course-cover.module.css';

/** Native CSS artwork from the supplied V2 prototype, never a screenshot of a screen. */
export function CourseCover({
  title,
  caption,
  decorative = false,
}: {
  title: string;
  caption: string;
  decorative?: boolean;
}) {
  return (
    <div className={s.cover} data-reference-cover aria-hidden={decorative || undefined}>
      <div className={s.orbit} />
      <div className={s.copy}>
        <span className={s.chapter}>{caption}</span>
        <h2>{title}</h2>
        <span className={s.footnote}>{uiText.text_ace0c96e567d}</span>
      </div>
      <div className={s.art} aria-hidden="true">
        <span className={s.tile}>{uiText.text_f3b5ff1969c6}</span>
        <span className={s.formula}>{uiText.text_9e1d54350c17}</span>
        <span className={s.dot} />
      </div>
    </div>
  );
}
