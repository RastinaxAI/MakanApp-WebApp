import './styles/app.css';

import { h } from './core/dom';
import { Router } from './core/router';
import { mountShell, openInstallSheet, syncChrome } from './shell/shell';
import { installCommandKeys, commandPalette } from './shell/command';
import { app } from './data/app-state';
import { session } from './data/session';
import { install, initInstall, registerServiceWorker, watchStandalone } from './core/pwa';
import { watchNetwork } from './core/net';
import { setLocale } from './core/format';
import { setUiLocale } from './core/i18n';
import { rich } from './ui/kit';

const router = new Router();

/* ------------------------------------------------------------------ routes */

router.add('/', () => import('./routes/landing.js'), { tab: 'school' });
router.add('/splash', () => import('./routes/auth.js').then((m) => ({ render: m.splashPage })), { tab: 'auth' });
router.add('/login', () => import('./routes/auth.js').then((m) => ({ render: m.loginPage })), { tab: 'auth' });
router.add('/otp', () => import('./routes/auth.js').then((m) => ({ render: m.otpPage })), { tab: 'auth' });
router.add('/org-activate', () => import('./routes/auth.js').then((m) => ({ render: m.orgPage })), { tab: 'auth' });
router.add('/setup', () => import('./routes/auth.js').then((m) => ({ render: m.setupPage })), { tab: 'auth' });
router.add('/invites', () => import('./routes/auth.js').then((m) => ({ render: m.invitesPage })), { tab: 'auth' });

router.add('/school', () => import('./routes/school-home.js'), { tab: 'school' });
router.add('/school/schedule', () => import('./routes/classes.js').then((m) => ({ render: m.schedulePage })), { tab: 'school' });
router.add('/school/classes', () => import('./routes/classes.js').then((m) => ({ render: m.classListPage })), { tab: 'school' });
router.add('/school/classes/:id', () => import('./routes/classes.js').then((m) => ({ render: m.classDetailPage })), { tab: 'school' });
router.add('/school/sessions/:id', () => import('./routes/classes.js').then((m) => ({ render: m.sessionPage })), { tab: 'school' });
router.add('/school/sessions/new', () => import('./routes/classes.js').then((m) => ({ render: m.sessionEditorPage })), { tab: 'school' });
router.add('/school/attendance/:id', () => import('./routes/classes.js').then((m) => ({ render: m.attendancePage })), { tab: 'school' });
router.add('/school/resources', () => import('./routes/classes.js').then((m) => ({ render: m.resourcesPage })), { tab: 'school' });
router.add('/school/resources/:id', () => import('./routes/classes.js').then((m) => ({ render: m.resourceViewerPage })), { tab: 'school' });

router.add('/school/assignments', () => import('./routes/assignments.js').then((m) => ({ render: m.assignmentListPage })), { tab: 'school' });
router.add('/school/assignments/new', () => import('./routes/assignments.js').then((m) => ({ render: m.assignmentEditorPage })), { tab: 'school' });
router.add('/school/assignments/:id', () => import('./routes/assignments.js').then((m) => ({ render: m.assignmentPage })), { tab: 'school' });
router.add('/school/assignments/:id/submit', () => import('./routes/assignments.js').then((m) => ({ render: m.submissionEditorPage })), { tab: 'school' });
router.add('/school/submissions/:id', () => import('./routes/assignments.js').then((m) => ({ render: m.receiptPage })), { tab: 'school' });
router.add('/school/grading', () => import('./routes/assignments.js').then((m) => ({ render: m.gradingQueuePage })), { tab: 'school' });
router.add('/school/grading/:id', () => import('./routes/assignments.js').then((m) => ({ render: m.gradingPage })), { tab: 'school' });

router.add('/school/exams', () => import('./routes/exams.js').then((m) => ({ render: m.examListPage })), { tab: 'school' });
router.add('/school/exams/new', () => import('./routes/exams.js').then((m) => ({ render: m.examEditorPage })), { tab: 'school' });
router.add('/school/exams/:id', () => import('./routes/exams.js').then((m) => ({ render: m.examRulesPage })), { tab: 'school' });
router.add('/school/exams/:id/attempt', () => import('./routes/exams.js').then((m) => ({ render: m.examAttemptPage })), { tab: 'school' });
router.add('/school/exams/:id/result', () => import('./routes/exams.js').then((m) => ({ render: m.examResultPage })), { tab: 'school' });
router.add('/school/exams/:id/manage', () => import('./routes/exams.js').then((m) => ({ render: m.examManagePage })), { tab: 'school' });
router.add('/school/exams/:id/review', () => import('./routes/exams.js').then((m) => ({ render: m.examReviewPage })), { tab: 'school' });

router.add('/school/progress', () => import('./routes/progress.js').then((m) => ({ render: m.progressPage })), { tab: 'school' });
router.add('/school/insights/:id', () => import('./routes/progress.js').then((m) => ({ render: m.insightPage })), { tab: 'school' });
router.add('/school/students', () => import('./routes/progress.js').then((m) => ({ render: m.classRosterPage })), { tab: 'school' });
router.add('/school/insights-queue', () => import('./routes/progress.js').then((m) => ({ render: m.insightQueuePage })), { tab: 'school' });

router.add('/school/manage', () => import('./routes/manage.js').then((m) => ({ render: m.manageHomePage })), { tab: 'school' });
router.add('/school/manage/curriculum', () => import('./routes/manage.js').then((m) => ({ render: m.curriculumPage })), { tab: 'school' });
router.add('/school/manage/classes', () => import('./routes/manage.js').then((m) => ({ render: m.manageClassesPage })), { tab: 'school' });
router.add('/school/manage/people', () => import('./routes/manage.js').then((m) => ({ render: m.peoplePage })), { tab: 'school' });
router.add('/school/manage/people/:id', () => import('./routes/manage.js').then((m) => ({ render: m.personPage })), { tab: 'school' });
router.add('/school/manage/invites', () => import('./routes/manage.js').then((m) => ({ render: m.invitesAdminPage })), { tab: 'school' });
router.add('/school/manage/import', () => import('./routes/manage.js').then((m) => ({ render: m.importPage })), { tab: 'school' });
router.add('/school/manage/guardians', () => import('./routes/manage.js').then((m) => ({ render: m.guardiansPage })), { tab: 'school' });
router.add('/school/manage/reports', () => import('./routes/manage.js').then((m) => ({ render: m.reportsPage })), { tab: 'school' });
router.add('/school/manage/settings', () => import('./routes/manage.js').then((m) => ({ render: m.settingsPage })), { tab: 'school' });
router.add('/school/manage/plan', () => import('./routes/manage.js').then((m) => ({ render: m.planPage })), { tab: 'school' });

router.add('/school/child', () => import('./routes/guardian.js').then((m) => ({ render: m.guardianHomePage })), { tab: 'school' });
router.add('/school/child/:id', () => import('./routes/guardian.js').then((m) => ({ render: m.guardianChildPage })), { tab: 'school' });
router.add('/school/child/:id/relationship', () => import('./routes/guardian.js').then((m) => ({ render: m.relationshipPage })), { tab: 'school' });

router.add('/msg', () => import('./routes/messenger.js').then((m) => ({ render: m.inboxPage })), { tab: 'msg' });
router.add('/msg/new', () => import('./routes/messenger.js').then((m) => ({ render: m.newChatPage })), { tab: 'msg' });
router.add('/msg/new-group', () => import('./routes/messenger.js').then((m) => ({ render: m.newGroupPage })), { tab: 'msg' });
router.add('/msg/new-channel', () => import('./routes/messenger.js').then((m) => ({ render: m.newChannelPage })), { tab: 'msg' });
router.add('/msg/search', () => import('./routes/messenger.js').then((m) => ({ render: m.searchPage })), { tab: 'msg' });
router.add('/msg/safety', () => import('./routes/messenger.js').then((m) => ({ render: m.safetyPage })), { tab: 'msg' });
router.add('/msg/:id', () => import('./routes/messenger.js').then((m) => ({ render: m.chatPage })), { tab: 'msg' });
router.add('/msg/:id/info', () => import('./routes/messenger.js').then((m) => ({ render: m.chatInfoPage })), { tab: 'msg' });
router.add('/msg/:id/media', () => import('./routes/messenger.js').then((m) => ({ render: m.chatMediaPage })), { tab: 'msg' });

router.add('/ai', () => import('./routes/ai.js').then((m) => ({ render: m.aiHomePage })), { tab: 'ai' });
router.add('/ai/notebooks', () => import('./routes/ai.js').then((m) => ({ render: m.notebooksPage })), { tab: 'ai' });
router.add('/ai/chat/:id', () => import('./routes/ai.js').then((m) => ({ render: m.aiChatPage })), { tab: 'ai' });
router.add('/ai/sources/:id', () => import('./routes/ai.js').then((m) => ({ render: m.aiSourcesPage })), { tab: 'ai' });
router.add('/ai/sources', () => import('./routes/ai.js').then((m) => ({ render: m.aiMySourcesPage })), { tab: 'ai' });
router.add('/ai/practice', () => import('./routes/ai.js').then((m) => ({ render: m.aiPracticePage })), { tab: 'ai' });

router.add('/profile', () => import('./routes/account.js').then((m) => ({ render: m.profilePage })), { tab: 'profile' });
router.add('/profile/security', () => import('./routes/account.js').then((m) => ({ render: m.securityPage })), { tab: 'profile' });
router.add('/profile/notifications', () => import('./routes/account.js').then((m) => ({ render: m.notificationSettingsPage })), { tab: 'profile' });
router.add('/profile/privacy', () => import('./routes/account.js').then((m) => ({ render: m.privacyPage })), { tab: 'profile' });
router.add('/profile/subscription', () => import('./routes/account.js').then((m) => ({ render: m.subscriptionPage })), { tab: 'profile' });
router.add('/profile/finance', () => import('./routes/account.js').then((m) => ({ render: m.financePage })), { tab: 'profile' });
router.add('/profile/support', () => import('./routes/account.js').then((m) => ({ render: m.supportPage })), { tab: 'profile' });
router.add('/profile/recovery', () => import('./routes/account.js').then((m) => ({ render: m.recoveryPage })), { tab: 'profile' });
router.add('/notifications', () => import('./routes/account.js').then((m) => ({ render: m.notificationsPage })), { tab: 'profile' });

router.add('/library', () => import('./routes/library.js').then((m) => ({ render: m.libraryPage })), { tab: 'profile' });
router.add('/library/:id', () => import('./routes/library.js').then((m) => ({ render: m.sourcePage })), { tab: 'profile' });

router.add('/apply', () => import('./routes/sales.js').then((m) => ({ render: m.applyPage })), { tab: 'profile' });
router.add('/apply/status', () => import('./routes/sales.js').then((m) => ({ render: m.applyStatusPage })), { tab: 'profile' });
router.add('/admin', () => import('./routes/sales.js').then((m) => ({ render: m.adminHomePage })), { tab: 'profile' });

/* -------------------------------------------------------------------- boot */

function applyTheme(): void {
  const pref = session.get().theme;
  const dark =
    pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (meta) meta.content = dark ? '#1b1f26' : '#ffffff';
}

function boot(): void {
  const root = document.getElementById('boot');
  const shell = mountShell();
  root?.remove();
  document.body.prepend(shell);

  applyTheme();
  const locale = session.get().locale;
  setLocale(locale);
  setUiLocale(locale);

  initInstall();
  watchStandalone();
  registerServiceWorker();
  watchNetwork();
  installCommandKeys();

  let activeTab = 'school';
  const paintChrome = () => syncChrome(activeTab);
  router.onChange((ctx) => {
    const hit = router.match(ctx.path);
    activeTab = hit?.def.tab ?? 'school';
    if (!activeTab || activeTab === 'auth') {
      document.documentElement.dataset.accent = 'school';
      for (const btn of document.querySelectorAll('.tab')) btn.removeAttribute('aria-current');
    } else {
      paintChrome();
    }
    document.title = hit?.def.title ? `${hit.def.title} — ماکان` : 'ماکان — آموزش مجازی هوشمند';
  });

  for (const source of [app, session, install]) source.subscribe(paintChrome);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  session.subscribe(applyTheme);

  const view = document.getElementById('view');
  if (view) router.start(view, location.pathname);

  // Opt-in hook for QA of the install flow on devices that cannot report it.
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as Record<string, unknown>).__makan = { openInstallSheet, router, session, app, install };
  }
}

function notFound(path: string): HTMLElement {
  const el = h('div', { class: 'page' });
  el.append(
    h(
      'div',
      { class: 'empty' },
      h('div', { class: 'glyph' }, h('span', { text: '۴۰۴' })),
      h('h3', { text: 'این صفحه در این نسخه وجود ندارد' }),
      h('p', { class: 'small muted' }, rich(`نشانی ${path} با هیچ بخشی مطابقت ندارد.`)),
      h(
        'div',
        { class: 'btn-row' },
        h('a', { class: 'btn primary', href: '/school', text: 'بازگشت به آموزشگاه' }),
        h('button', { class: 'btn ghost', type: 'button', text: 'جست‌وجوی سریع', on: { click: () => commandPalette() } }),
      ),
    ),
  );
  return el;
}

router.notFound = (path) => notFound(path);

void notFound;

boot();