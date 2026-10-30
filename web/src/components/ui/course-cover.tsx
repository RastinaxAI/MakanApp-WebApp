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
        <span className={s.footnote}>یک مسئله، یک نگاه تازه</span>
      </div>
      <div className={s.art} aria-hidden="true">
        <span className={s.tile}>x²</span>
        <span className={s.formula}>2x + 3 = 11</span>
        <span className={s.dot} />
      </div>
    </div>
  );
}
