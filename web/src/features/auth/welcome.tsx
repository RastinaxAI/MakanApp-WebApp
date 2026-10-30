import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { CourseCover } from '@/components/ui/course-cover';
import s from './welcome.module.css';
export function WelcomePage() {
  return (
    <div className={s.page} data-reference-public>
      <header>
        <strong>ماکان</strong>
        <Link href="/enter">ورود</Link>
      </header>
      <main>
        <span className={s.badge}>برای آموزشگاه، برای هر روز</span>
        <h1>
          یادگیری،
          <br />
          کنار هم.
        </h1>
        <p>کلاس‌ها، تمرین‌ها و گفتگوها را در یک فضای ساده و منظم کنار هم داشته باشید.</p>
        <CourseCover title="آموزش را نزدیک‌تر کنیم." caption="یک حساب · مسیرهای متفاوت" />
        <h2>همهٔ نقش‌ها، در یک فضا</h2>
        {[
          ['دانشجو', 'یادگیری و تمرین، قدم‌به‌قدم'],
          ['استاد', 'تدریس، ارزیابی و بازخورد'],
          ['والد', 'همراهی با مسیر رشد'],
          ['مدیر آموزشگاه', 'مدیریت منظم آموزشگاه'],
        ].map(([title, description]) => (
          <Link key={title} href="/enter" className={s.role}>
            <span>{title[0]}</span>
            <div>
              <strong>{title}</strong>
              <small>{description}</small>
            </div>
            <ChevronLeft size={16} />
          </Link>
        ))}
      </main>
      <footer>
        <Link href="/enter" className="button button-primary">
          شروع با شماره همراه
        </Link>
      </footer>
    </div>
  );
}
