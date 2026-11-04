import * as uiText from '@/content/fa';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import manifest from '../../../../design/reference-v3/screens.json';
export const dynamic = 'force-dynamic';
export default function ReferenceIndex() {
  if (process.env.MAKAN_REFERENCE_PREVIEW !== 'true') notFound();
  return (
    <main className="mk-review-index">
      <header>
        <h1>{uiText.text_1d5e00991372}</h1>
        <p>{uiText.text_2601aa49718e}</p>
        <Link href="/enter">{uiText.text_6901f60f571f}</Link>
      </header>
      <div>
        {manifest.screens.map((view) => (
          <Link key={view.id} href={'/preview/reference/' + view.id}>
            <strong>{view.title}</strong>
            <span>
              {view.kind === 'desktop' ? uiText.text_618612770586 : uiText.text_8731b85870ee}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
