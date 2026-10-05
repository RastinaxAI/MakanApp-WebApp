/** C-01 … C-07 — sign-in, verification, activation, first profile, invitations. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import { banner, field, inlineBtn } from '../ui/kit';
import { toast } from '../core/overlays';
import { session } from '../data/session';
import type { PageRenderer, RouteContext } from '../core/router';

const DEMO_CODE = '1234';

function digits(raw: string): string {
  return raw.replace(/\D/g, '');
}

function validMobile(value: string): boolean {
  return /^09\d{9}$/.test(digits(value));
}

function authShell(...kids: (Node | string)[]): HTMLElement {
  const el = h('div', { class: 'auth' });
  const top = h(
    'div',
    { class: 'row between' },
    h('a', { class: 'brand', href: '/' }, h('span', { class: 'brand-mark' }), h('span', { class: 'brand-name', text: 'ماکان' })),
    h('span', { class: 'tiny muted', text: 'محیط آزمایشی' }),
  );
  el.append(top, h('div', { class: 'stack lg' }, ...kids), h('div', { class: 'tiny muted center', text: 'با ورود، قوانین استفاده و سیاست حریم خصوصی را می‌پذیرید.' }));
  return el;
}

/* ------------------------------------------------------------------ C-01 */

export const splashPage: PageRenderer = (ctx: RouteContext) => {
  const el = h('div', { class: 'auth' });
  el.append(
    h(
      'div',
      { class: 'stack center', style: { placeSelf: 'center', justifyItems: 'center' } },
      h('div', { class: 'brand-mark', style: { width: '64px', height: '64px', borderRadius: '22px' } }),
      h('h1', { style: { fontSize: '1.6rem' }, text: 'ماکان' }),
      h('p', { class: 'small muted', text: 'در حال بررسی نشست و ارتباط…' }),
    ),
  );
  const go = () => location.replace(ctx.query.get('next') ?? '/school');
  setTimeout(go, 500);
  return el;
};

/* ------------------------------------------------------------------ C-02 */

export const loginPage: PageRenderer = () => {
  const body = h('div', { class: 'stack lg' });

  body.append(
    h(
      'div',
      { class: 'auth-hero' },
      h('h1', { text: 'ورود به ماکان' }),
      h('p', { class: 'small muted', text: 'با شماره همراه خود وارد شوید یا با حسابی که آموزشگاه برایتان ساخته وارد شوید.' }),
    ),
  );

  const phone = field({
    label: 'شماره همراه',
    placeholder: '۰۹۱۲۳۴۵۶۷۸۹',
    inputMode: 'numeric',
    dir: 'ltr',
    hint: 'شماره همراهی که در آموزشگاه ثبت شده است.',
  });
  phone.input.addEventListener('input', () => {
    phone.input.value = digits(phone.input.value).slice(0, 11);
  });
  const phoneError = h('div', { class: 'err' });
  phoneError.style.display = 'none';

  const send = h('button', { class: 'btn primary block', type: 'button', text: 'دریافت کد یک‌بارمصرف' });
  send.addEventListener('click', () => {
    if (!validMobile(phone.input.value)) {
      phoneError.textContent = 'شماره همراه را کامل وارد کنید (۱۱ رقم با ۰۹).';
      phoneError.style.display = '';
      phone.input.focus();
      return;
    }
    session.set({ signedIn: false });
    location.assign(`/otp?phone=${encodeURIComponent(phone.input.value)}`);
  });

  const orgToggle = h('button', { class: 'btn ghost block', type: 'button' });
  orgToggle.append(icon('key', 'icon sm'));
  orgToggle.append(h('span', { text: 'ورود با حساب آموزشگاهی' }));
  orgToggle.addEventListener('click', () => location.assign('/org-activate'));

  body.append(
    h(
      'div',
      { class: 'stack sm' },
      phone.wrap,
      phoneError,
      send,
      h('div', { class: 'row between tiny muted' }, h('a', { href: '/profile/recovery', text: 'دسترسی ندارم؟' }), h('a', { href: '/apply', text: 'درخواست آموزشگاه' })),
      h('hr', { class: 'divider' }),
      orgToggle,
    ),
  );

  body.append(
    banner('در این نسخه هیچ پیامک واقعی ارسال نمی‌شود. کد ورود همیشه ۱۲۳۴ است و فقط برای آزمون جریان است.', { tone: 'warn', glyph: 'alert' }),
  );

  return authShell(body);
};

/* ------------------------------------------------------------------ C-03 */

export const otpPage: PageRenderer = (ctx: RouteContext) => {
  const phone = ctx.query.get('phone') ?? '۰۹۱۲۳۴۵۶۷۸۹';
  const masked = `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  const body = h('div', { class: 'stack lg' });

  body.append(
    h(
      'div',
      { class: 'auth-hero' },
      h('h1', { text: 'کد تأیید' }),
      h('p', { class: 'small muted', text: `کد چهاررقمی به ${masked} پیامک شد.` }),
    ),
  );

  const boxes = h('div', { class: 'otp-boxes' });
  const inputs: HTMLInputElement[] = [];
  for (let i = 0; i < 4; i += 1) {
    const input = h('input', {
      type: 'text',
      inputmode: 'numeric',
      maxlength: 1,
      'aria-label': `رقم ${i + 1} کد`,
      autocomplete: i === 0 ? 'one-time-code' : 'off',
    });
    input.addEventListener('input', () => {
      input.value = digits(input.value).slice(-1);
      if (input.value && inputs[i + 1]) inputs[i + 1].focus();
      check();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && inputs[i - 1]) inputs[i - 1].focus();
    });
    inputs.push(input);
    boxes.append(input);
  }

  const error = banner('', { tone: 'bad', glyph: 'alert' });
  error.style.display = 'none';

  const verify = h('button', { class: 'btn primary block', type: 'button', text: 'تأیید و ادامه' });
  const check = () => {
    const code = inputs.map((i) => i.value).join('');
    if (code.length < 4) return;
    if (code !== DEMO_CODE) {
      error.style.display = '';
      error.firstElementChild!.nextElementSibling!.textContent = 'کد واردشده درست نیست. کد آزمایشی: ۱۲۳۴';
      inputs.forEach((i) => (i.value = ''));
      inputs[0].focus();
      return;
    }
    session.set({ signedIn: true });
    toast('ورود انجام شد', 'ok');
    location.assign(ctx.query.get('mode') === 'existing' ? '/school' : '/setup');
  };
  verify.addEventListener('click', check);

  let seconds = 45;
  const resend = h('button', { class: 'btn ghost block', type: 'button' });
  const label = () => {
    resend.replaceChildren(
      ...(seconds > 0 ? [h('span', { text: `ارسال دوباره تا ${seconds} ثانیه دیگر` })] : [icon('refresh', 'icon sm'), h('span', { text: 'ارسال دوباره کد' })]),
    );
  };
  label();
  const timer = setInterval(() => {
    seconds -= 1;
    label();
    if (seconds <= 0) clearInterval(timer);
  }, 1000);
  resend.addEventListener('click', () => {
    if (seconds > 0) return;
    seconds = 45;
    label();
    timer && clearInterval(timer);
    const again = setInterval(() => {
      seconds -= 1;
      label();
      if (seconds <= 0) clearInterval(again);
    }, 1000);
    toast('کد تازه ارسال شد', 'ok');
  });

  body.append(boxes, error, verify, h('a', { class: 'btn ghost', href: '/login', text: 'تغییر شماره' }), resend);
  body.append(banner('کد تأییدشده هرگز در اعلان عمومی یا گزارش پشتیبانی نمایش داده نمی‌شود.', { glyph: 'shield' }));

  const el = authShell(body);
  setTimeout(() => inputs[0].focus(), 60);
  return el;
};

/* ------------------------------------------------------------------ C-04 */

export const orgPage: PageRenderer = () => {
  const body = h('div', { class: 'stack lg' });
  body.append(
    h(
      'div',
      { class: 'auth-hero' },
      h('h1', { text: 'فعال‌سازی حساب آموزشگاهی' }),
      h('p', { class: 'small muted', text: 'حسابی که آموزشگاه برای شما ساخته با شناسه و رمز اولیه فعال می‌شود.' }),
    ),
  );

  const id = field({ label: 'شناسه پرونده یا نام کاربری', placeholder: 'makan-1024', dir: 'ltr' });
  const first = field({ label: 'رمز اولیه', type: 'password', placeholder: '••••••', dir: 'ltr' });
  const next = field({ label: 'رمز تازه', type: 'password', placeholder: 'حداقل ۸ نویسه', dir: 'ltr' });
  const again = field({ label: 'تکرار رمز تازه', type: 'password', dir: 'ltr' });
  const error = h('div', { class: 'err' });
  error.style.display = 'none';

  const submit = h('button', { class: 'btn primary block', type: 'button', text: 'فعال‌سازی و ورود' });
  submit.addEventListener('click', () => {
    const problems: string[] = [];
    if (!id.input.value.trim()) problems.push('شناسه پرونده را وارد کنید.');
    if (first.input.value.length < 4) problems.push('رمز اولیه معتبر نیست.');
    if (next.input.value.length < 8) problems.push('رمز تازه باید حداقل ۸ نویسه باشد.');
    if (next.input.value !== again.input.value) problems.push('تکرار رمز تازه یکسان نیست.');
    if (problems.length) {
      error.textContent = problems[0];
      error.style.display = '';
      return;
    }
    session.set({ signedIn: true });
    toast('حساب فعال شد؛ رمز اولیه مصرف شد', 'ok');
    location.assign('/invites');
  });

  body.append(h('div', { class: 'stack sm' }, id.wrap, first.wrap, next.wrap, again.wrap, error, submit));
  body.append(
    banner('پس از فعال‌سازی، رمز تازه فقط برای خودتان است. آموزشگاه و والد به آن دسترسی ندارند و ورود مخفی ممکن نیست.', { glyph: 'lock' }),
  );
  body.append(h('a', { class: 'btn ghost', href: '/profile/recovery', text: 'رمز اولیه را ندارم' }));
  return authShell(body);
};

/* ------------------------------------------------------------------ C-05 */

export const setupPage: PageRenderer = () => {
  const body = h('div', { class: 'stack lg' });
  body.append(
    h(
      'div',
      { class: 'auth-hero' },
      h('h1', { text: 'تکمیل مشخصات' }),
      h('p', { class: 'small muted', text: 'نامی که دیگران می‌بینند و نام کاربری برای ارتباط.' }),
    ),
  );

  const first = field({ label: 'نام', placeholder: 'سارا' });
  const last = field({ label: 'نام خانوادگی', placeholder: 'نیک‌پور' });
  const username = field({ label: 'نام کاربری', placeholder: 'sara.n', dir: 'ltr', hint: 'بین ۳ تا ۲۴ نویسه، بدون فاصله.' });
  const error = h('div', { class: 'err' });
  error.style.display = 'none';

  const submit = h('button', { class: 'btn primary block', type: 'button', text: 'ذخیره و ادامه' });
  submit.addEventListener('click', () => {
    if (first.input.value.trim().length < 2) {
      error.textContent = 'نام را کامل وارد کنید.';
      error.style.display = '';
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username.input.value.trim())) {
      error.textContent = 'نام کاربری معتبر نیست؛ نمونه: sara.n';
      error.style.display = '';
      return;
    }
    toast('مشخصات ذخیره شد', 'ok');
    location.assign('/invites');
  });

  body.append(h('div', { class: 'stack sm' }, first.wrap, last.wrap, username.wrap, error, submit));
  body.append(
    banner('نقش از این صفحه انتخاب نمی‌شود. نقش شما از عضویت آموزشگاه یا دعوت می‌آید.', { glyph: 'shield' }),
  );
  return authShell(body);
};

/* ------------------------------------------------------------------ C-06 */

export const invitesPage: PageRenderer = () => {
  const body = h('div', { class: 'stack lg' });
  body.append(
    h(
      'div',
      { class: 'auth-hero' },
      h('h1', { text: 'دعوت‌ها' }),
      h('p', { class: 'small muted', text: 'پذیرش دعوت عضویت می‌سازد؛ ثبت‌نام قطعی کلاس جداگانه تأیید می‌شود.' }),
    ),
  );

  const invitations = [
    {
      school: 'آموزشگاه ندا',
      by: 'کامران دهقان — مدیر',
      role: 'دانش‌آموز کلاس ریاضی دهم',
      classHint: 'کلاس پیشنهادی: ریاضی دهم — گروه الف',
      expires: 'تا ۳ روز دیگر',
    },
  ];

  for (const invite of invitations) {
    let declineBtn: HTMLButtonElement | null = null;
    const card = h(
      'div',
      { class: 'card' },
      h('div', { class: 'row between' }, h('h3', { text: invite.school }), h('span', { class: 'chip warn', text: invite.expires })),
      h('p', { class: 'small muted', text: `دعوت‌کننده: ${invite.by}` }),
      h('div', { class: 'chip info' }, icon('user', 'icon sm'), h('span', { text: invite.role })),
      h('p', { class: 'tiny muted', text: invite.classHint }),
      h(
        'div',
        { class: 'btn-row' },
        (() => {
          const accept = h('button', { class: 'btn primary grow', type: 'button', text: 'پذیرش دعوت' });
          accept.addEventListener('click', () => {
            card.querySelector('.status')!.textContent = 'پذیرفته شد — در انتظار ثبت‌نام کلاس';
            (card.querySelector('.status') as HTMLElement).className = 'status banner ok';
            accept.toggleAttribute('disabled', true);
            declineBtn?.toggleAttribute('disabled', true);
          });
          return accept;
        })(),
        (() => {
          const decline = h('button', { class: 'btn ghost', type: 'button', text: 'رد' });
          declineBtn = decline;
          decline.addEventListener('click', () => {
            card.querySelector('.status')!.textContent = 'دعوت رد شد.';
            (card.querySelector('.status') as HTMLElement).className = 'status banner';
          });
          return decline;
        })(),
        inlineBtn('بعداً', () => toast('می‌توانید بعداً از پروفایل بررسی کنید')),
      ),
      h('div', { class: 'status banner warn', text: 'هنوز در حال بررسی است.' }),
    );
    body.append(card);
  }

  body.append(
    h(
      'div',
      { class: 'card' },
      h('h3', { text: 'بدون دعوت چه می‌شود؟' }),
      h('p', { class: 'small muted', text: 'فضای شخصی شما فعال است و تب آموزشگاه حالت «عضو آموزشگاهی نیستید» را با مسیر دعوت نشان می‌دهد.' }),
      h('a', { class: 'btn soft', href: '/school', text: 'رفتن به فضای شخصی' }),
    ),
  );

  return authShell(body);
};