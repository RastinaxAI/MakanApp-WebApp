'use client';
import { Button } from '@/components/ui/button';
import { Bell, MonitorSmartphone, Settings, UserRound, Wallet, BookOpen } from 'lucide-react';
import { ArrowRight, Ban, ChevronLeft, Mail, Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import Link from 'next/link';
import s from './personal.module.css';
import { useThemePreference } from './theme';
import { InstallPanel } from '@/features/pwa/install';
import p from './preferences.module.css';
export function ProfilePreferences() {
  return (
    <div className={p.page}>
      <div className={p.heading}>
        <h1>حساب و ترجیحات</h1>
      </div>
      <section className={p.list} aria-label="حساب و ترجیحات">
        <Link className={p.row} href="/personal/settings/privacy">
          <span className={p.icon}>
            <ShieldCheck size={21} />
          </span>
          <strong>حریم خصوصی</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
        {[
          { title: 'اعلان‌ها', Icon: Bell, href: '/personal/settings/notifications' },
          { title: 'اشتراک و مصرف', Icon: Wallet, href: '/personal/subscription' },
          { title: 'کلاس‌های شخصی', Icon: BookOpen, href: '/personal/classes' },
          {
            title: 'امنیت و دستگاه‌ها',
            Icon: MonitorSmartphone,
            href: '/personal/settings/devices',
          },
        ].map(({ title, Icon, href }) => (
          <Link className={p.row} key={href} href={href}>
            <span className={p.icon}>
              <Icon size={21} />
            </span>
            <strong>{title}</strong>
            <ChevronLeft className={p.chevron} size={18} />
          </Link>
        ))}
        <Link className={p.row} href="/personal/contacts">
          <span className={p.icon}>
            <UserRound size={21} />
          </span>
          <strong>مخاطبین</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
        <Link className={p.row} href="/personal/settings">
          <span className={p.icon}>
            <Settings size={21} />
          </span>
          <strong>تنظیمات</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
      </section>
    </div>
  );
}
export function PersonalSettings() {
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>حساب من</span>
          <h1>تنظیمات</h1>
          <p>برنامه را متناسب با خودتان تنظیم کنید.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/profile">
            <ArrowRight size={18} />
            حساب من
          </Link>
        </Button>
      </div>
      <section className={s.settingsList} aria-label="بخش‌های تنظیمات">
        {[
          {
            href: '/personal/settings/notifications',
            title: 'اعلان‌ها',
            description: 'تنظیم دریافت اعلان و ساعت سکوت',
            icon: Bell,
          },
          {
            href: '/personal/settings/devices',
            title: 'امنیت و دستگاه‌ها',
            description: 'بررسی نشست‌ها و پایان دسترسی دستگاه‌های دیگر',
            icon: MonitorSmartphone,
          },
          {
            href: '/personal/education/invitations',
            title: 'دعوت‌های من',
            description: 'پذیرش عضویت آموزشگاه و تأیید رابطهٔ والد و فرزند',
            icon: Mail,
          },
          {
            href: '/personal/settings/appearance',
            title: 'ظاهر برنامه',
            description: 'انتخاب حالت روشن یا تاریک',
            icon: Palette,
          },
          {
            href: '/personal/settings/privacy',
            title: 'حریم خصوصی',
            description: 'پیام مستقیم، شمارهٔ همراه و آخرین بازدید',
            icon: ShieldCheck,
          },
          {
            href: '/personal/settings/blocked',
            title: 'حساب‌های مسدودشده',
            description: 'مشاهده و رفع مسدودی حساب‌ها',
            icon: Ban,
          },
        ].map((item) => (
          <Link href={item.href} key={item.href}>
            <span className={s.settingIcon}>
              <item.icon size={23} />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
            <ChevronLeft size={20} />
          </Link>
        ))}
      </section>
      <InstallPanel compact />
    </>
  );
}
export function AppearanceSettings() {
  const { theme, changeTheme, error } = useThemePreference();
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>تنظیمات</span>
          <h1>ظاهر برنامه</h1>
          <p>انتخاب شما روی همین مرورگر ذخیره می‌شود.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/settings">
            <ArrowRight size={18} />
            تنظیمات
          </Link>
        </Button>
      </div>
      <fieldset className={s.themeOptions}>
        <legend>حالت نمایش</legend>
        {(
          [
            { value: 'light', title: 'روشن', icon: Sun },
            { value: 'dark', title: 'تاریک', icon: Moon },
          ] as const
        ).map((item) => (
          <label
            key={item.value}
            className={`${s.themeOption} ${theme === item.value ? s.themeSelected : ''}`}
          >
            <input
              type="radio"
              name="appearance"
              value={item.value}
              checked={theme === item.value}
              onChange={() => changeTheme(item.value)}
            />
            <span
              className={`${s.themeMiniature} ${item.value === 'dark' ? s.themeMiniatureDark : ''}`}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
            <strong>
              <item.icon size={19} />
              {item.title}
            </strong>
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </>
  );
}
