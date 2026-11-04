'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
import { Bell, MonitorSmartphone, Settings, UserRound, Wallet, BookOpen } from 'lucide-react';
import { ArrowRight, Ban, ChevronLeft, Mail, Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import Link from 'next/link';
import s from './personal.module.css';
import { useThemePreference } from './theme';
import { InstallPanel } from '@/features/pwa/install';
import p from './preferences.module.css';
import layout from './settings-layout.module.css';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { usePersonal } from './provider';
export function ProfilePreferences() {
  return (
    <div className={p.page}>
      <div className={p.heading}>
        <h1>{uiText.text_8aa6893911d9}</h1>
      </div>
      <section className={p.list} aria-label={uiText.text_8aa6893911d9}>
        <Link className={p.row} href="/personal/settings/privacy">
          <span className={p.icon}>
            <ShieldCheck size={21} />
          </span>
          <strong>{uiText.text_f0840638365c}</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
        {[
          { title: uiText.text_9f2a436a61f3, Icon: Bell, href: '/personal/settings/notifications' },
          { title: uiText.text_6b1ac4d74206, Icon: Wallet, href: '/personal/subscription' },
          {
            title: uiText.navigation_extracurricular,
            Icon: BookOpen,
            href: '/personal/extracurricular',
          },
          {
            title: uiText.text_636ff38fb559,
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
          <strong>{uiText.text_759044ca1d2d}</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
        <Link className={p.row} href="/personal/settings">
          <span className={p.icon}>
            <Settings size={21} />
          </span>
          <strong>{uiText.navigation_settings}</strong>
          <ChevronLeft className={p.chevron} size={18} />
        </Link>
      </section>
    </div>
  );
}
export function PersonalSettings() {
  const { theme, changeTheme, error } = useThemePreference();
  const { session, logout } = usePersonal();
  return (
    <div className={layout.page}>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>{uiText.text_8b4cb595cd35}</span>
          <h1>{uiText.navigation_settings}</h1>
          <p>{uiText.text_7298116df730}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/profile">
            <ArrowRight size={18} />
            {uiText.text_8b4cb595cd35}
          </Link>
        </Button>
      </div>
      <div className={layout.columns}>
        <section className={layout.settingsList} aria-label={uiText.text_054c843eeef5}>
          {[
            {
              href: '/personal/settings/notifications',
              title: uiText.text_9f2a436a61f3,
              description: uiText.text_6aaf2a576037,
              icon: Bell,
            },
            {
              href: '/personal/settings/devices',
              title: uiText.text_636ff38fb559,
              description: uiText.text_e4cf913f801a,
              icon: MonitorSmartphone,
            },
            {
              href: '/personal/education/invitations',
              title: uiText.text_9b8c54ad174a,
              description: uiText.text_5d3033724b66,
              icon: Mail,
            },
            {
              href: '/personal/settings/appearance',
              title: uiText.text_11a1d93d127f,
              description: uiText.text_1a40ca7e417f,
              icon: Palette,
            },
            {
              href: '/personal/settings/privacy',
              title: uiText.text_f0840638365c,
              description: uiText.text_6f68a5603b3d,
              icon: ShieldCheck,
            },
            {
              href: '/personal/settings/blocked',
              title: uiText.text_3393e0c3cb74,
              description: uiText.text_a636c65f53a1,
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
        <aside className={layout.aside}>
          <section className={layout.appearance} aria-labelledby="quick-appearance">
            <h2 id="quick-appearance">{uiText.text_11a1d93d127f}</h2>
            <p>{uiText.text_4d67086f8777}</p>
            <fieldset>
              <legend className="sr-only">{uiText.text_88619bd1891f}</legend>
              {(
                [
                  { value: 'light', title: uiText.text_be9fd3bd1ba1, Icon: Sun },
                  { value: 'dark', title: uiText.text_9a0be82749f7, Icon: Moon },
                  { value: 'system', title: uiText.text_f7c6ee7ceb27, Icon: MonitorSmartphone },
                ] as const
              ).map(({ value, title, Icon }) => (
                <label key={value} data-selected={theme === value}>
                  <input
                    type="radio"
                    name="settings-theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => changeTheme(value)}
                  />
                  <Icon size={24} />
                  <span>{title}</span>
                </label>
              ))}
            </fieldset>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </section>
          <section className={layout.account}>
            <span className={s.settingIcon}>
              <UserRound size={23} />
            </span>
            <div>
              <h2>
                {session.user.displayName || session.user.firstName || uiText.text_8b4cb595cd35}
              </h2>
              <p>{uiText.text_c9b857c3a6b2}</p>
            </div>
            <Link href="/personal/profile">
              {uiText.text_93affbaf8fcf}
              <ChevronLeft size={16} />
            </Link>
            <ConfirmAction
              trigger={uiText.account_logout}
              title={uiText.text_2ddbb4f12b8f}
              description={uiText.text_f40112f83ec9}
              confirm={uiText.account_logout}
              destructive
              onConfirm={async () => {
                await logout();
                return true;
              }}
            />
          </section>
          <InstallPanel compact />
        </aside>
      </div>
    </div>
  );
}
export function AppearanceSettings() {
  const { theme, changeTheme, error } = useThemePreference();
  return (
    <>
      <div className={s.headingRow}>
        <div className={s.heading}>
          <span>{uiText.navigation_settings}</span>
          <h1>{uiText.text_11a1d93d127f}</h1>
          <p>{uiText.text_ceac199f616a}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/personal/settings">
            <ArrowRight size={18} />
            {uiText.navigation_settings}
          </Link>
        </Button>
      </div>
      <fieldset className={s.themeOptions}>
        <legend>{uiText.text_88619bd1891f}</legend>
        {(
          [
            { value: 'light', title: uiText.text_be9fd3bd1ba1, icon: Sun },
            { value: 'dark', title: uiText.text_9a0be82749f7, icon: Moon },
            { value: 'system', title: uiText.text_a11180341c26, icon: MonitorSmartphone },
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
