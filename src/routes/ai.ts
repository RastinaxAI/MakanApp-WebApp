/** AI-01 … AI-05 — a ChatGPT-style assistant plus a NotebookLM-style sources pane. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import { banner, card, chip, empty, field, listItem, pageHead, sectionHead } from '../ui/kit';
import { formatDate, relative } from '../core/format';
import { sourceById, sources } from '../data/seed';
import { addPersonalSource, app, personalSourcesFor, removePersonalSource } from '../data/app-state';
import { currentPerson, currentRole } from '../data/session';
import { confirmDialog, openSheet, toast } from '../core/overlays';
import { missing } from './classes';
import type { PageRenderer, RouteContext } from '../core/router';
import { go } from '../core/router';

/** A notebook names itself from its first message, the way a chat folder does
    in ChatGPT: the user never has to invent a title for a blank page. */
export function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'دفتر تازه';
  if (clean.length <= 34) return clean;
  const cut = clean.slice(0, 34);
  const space = cut.lastIndexOf(' ');
  return `${(space > 18 ? cut.slice(0, space) : cut).trim()}…`;
}

/* ------------------------------------------------------------------ AI-01 */

/** The assistant opens straight into a conversation, like ChatGPT: one thread,
    a composer at the bottom, and the notebook's sources as its grounding. */
export const aiHomePage: PageRenderer = () => {
  const page = h('div', { class: 'page fill chat-page ai-page' });

  const notebooks = app.get().notebooks.filter((nb) => !nb.archived);
  // The most recently touched notebook grounds the fresh conversation; with no
  // notebooks the assistant still chats, just without a sources pane.
  const notebook = notebooks[0];

  const head = h(
    'header',
    { class: 'chat-head' },
    h('a', { class: 'icon-btn chat-back', href: '/ai/notebooks', 'aria-label': 'دفترها' }, icon('chevronEnd')),
    h(
      'a',
      { class: 'chat-who', href: '/ai/notebooks' },
      h('div', { class: 'avatar sm', style: { background: 'var(--accent)' } }, icon('ai', 'icon sm')),
      h(
        'span',
        { class: 'chat-who-text' },
        h('span', { class: 'chat-title truncate', text: 'دستیار ماکان' }),
        h('span', { class: 'chat-sub truncate', text: notebook ? `بر پایه «${notebook.title}»` : 'پاسخ از دانش عمومی — منبعی متصل نیست' }),
      ),
    ),
    h('div', { class: 'chat-head-actions' }, h('a', { class: 'icon-btn', href: '/ai/notebooks', 'aria-label': 'مدیریت منابع' }, icon('folder'))),
  );

  const thread = h('div', { class: 'thread' });
  const greet = h(
    'div',
    { class: 'ai-greet' },
    h('div', { class: 'ai-greet-mark logo-tile' }),
    h('h2', { text: 'سلام! چطور می‌توانم کمک کنم؟' }),
    h(
      'div',
      { class: 'ai-suggest' },
      suggest('این جزوه را در سه نکته خلاصه کن', 'book'),
      suggest('یک آزمونک ۵ سؤالی از این منبع بساز', 'quiz'),
      suggest('مفهوم درس را ساده‌تر توضیح بده', 'school'),
    ),
  );

  const paintThread = () => {
    thread.replaceChildren();
    if (!notebook || !notebook.messages.length) {
      thread.append(greet);
      return;
    }
    const current = app.get().notebooks.find((nb) => nb.id === notebook.id)!;
    for (const message of current.messages) thread.append(aiBubble(message.text, message.role, message.citations ?? []));
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
  };

  const input = h('textarea', { class: 'textarea', rows: 1, placeholder: 'پیام خود را بنویسید…', 'aria-label': 'پیام به دستیار' });
  input.style.minHeight = '44px';
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    if (!notebook) {
      toast('اول یک دفتر بسازید تا گفتگو ذخیره شود', 'info');
      return;
    }
    const ready = notebook.sourceIds.filter((id) => sourceById.get(id)?.status === 'ready');
    const answer =
      ready.length === 0
        ? 'هیچ منبع آماده‌ای به این دفتر متصل نیست، بنابراین نمی‌توانم پاسخ مستند بدهم. از پنل «منابع» یک فایل یا پیوند اضافه کنید تا پاسخ‌ها به همان منابع تکیه کنند.'
        : 'بر پایه منابع متصل: نکته اصلی این است که ابتدا مسئله به صورت کمی نوشته و سپس ریشه‌ها بررسی شوند. اگر مجموع و حاصل‌ضرب ریشه‌ها را بدانید، می‌توانید معادله را بازسازی کنید. این خلاصه است و جای متن کامل جزوه را نمی‌گیرد.';
    app.set((s) => ({
      notebooks: s.notebooks.map((nb) =>
        nb.id === notebook.id
          ? {
              ...nb,
              updatedAt: new Date().toISOString(),
              messages: [
                ...nb.messages,
                { role: 'user', text, at: new Date().toISOString() },
                { role: 'assistant', text: answer, at: new Date().toISOString(), citations: ready.slice(0, 2) },
              ],
            }
          : nb,
      ),
    }));
    input.value = '';
    paintThread();
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  });

  const composer = h(
    'div',
    { class: 'composer' },
    input,
    h('button', { class: 'btn primary', type: 'button', 'aria-label': 'ارسال', on: { click: send } }, icon('send', 'icon sm')),
  );

  page.append(head, thread, composer);
  paintThread();
  return page;
};

function suggest(text: string, glyph: Parameters<typeof icon>[0]): HTMLElement {
  const el = h('button', { class: 'ai-suggest-item', type: 'button' });
  el.append(icon(glyph, 'icon sm'));
  el.append(h('span', { text }));
  el.addEventListener('click', () => {
    const box = document.querySelector<HTMLTextAreaElement>('.ai-page .composer textarea');
    if (!box) return;
    box.value = text;
    box.focus();
  });
  return el;
}

function aiBubble(text: string, role: 'user' | 'assistant', citations: string[]): HTMLElement {
  const row = h('div', { class: `msg-row ${role === 'user' ? 'mine' : 'other'}` });
  const face = h('span', { class: 'msg-av' });
  if (role === 'assistant') face.append(h('div', { class: 'avatar sm', style: { background: 'var(--accent)' } }, icon('ai', 'icon sm')));
  else face.append(h('div', { class: 'avatar sm', text: 'شما' }));
  row.append(face);
  const bubble = h('div', { class: 'bubble' });
  bubble.append(h('span', { text }));
  if (citations.length) {
    const cites = h('div', { class: 'row wrap', style: { gap: '6px', flexBasis: '100%', marginBlockStart: '6px' } });
    for (const citation of citations) {
      const source = sourceById.get(citation);
      if (!source) continue;
      cites.append(h('a', { class: 'cite', href: `/ai/sources/${citation}` }, icon('bookmark', 'icon sm'), h('span', { text: source.title })));
    }
    bubble.append(cites);
  } else if (role === 'assistant') {
    bubble.append(h('span', { class: 'tiny muted', text: 'بدون منبع — پاسخ کامل نیست' }));
  }
  row.append(bubble);
  return row;
}

/* ------------------------------------------------------------------ notebooks (the NotebookLM part) */

/** Sources management, NotebookLM-style: one screen per notebook that lists
    its sources, accepts files/links, and never hides the grounding rules. */
export const notebooksPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('منابع دستیار', 'هر دفتر منابع و تاریخچه خودش را دارد'));

  const create = h('button', { class: 'btn primary block', type: 'button' });
  create.append(icon('plus', 'icon sm'));
  create.append(h('span', { text: 'دفتر تازه' }));
  /* No name prompt: the notebook is created empty and titles itself from the
     first message, the way a chat thread names itself. */
  create.addEventListener('click', () => {
    const id = `nb-${Date.now().toString(36)}`;
    app.set((s) => ({
      notebooks: [{ id, title: '', sourceIds: [], archived: false, updatedAt: new Date().toISOString(), messages: [] }, ...s.notebooks],
    }));
    go(`/ai/chat/${id}`);
  });
  page.append(create);

  for (const nb of app.get().notebooks) {
    const readyCount = nb.sourceIds.filter((id) => sourceById.get(id)?.status === 'ready').length;
    page.append(
      card(
        {},
        h('div', { class: 'row between' }, h('h3', { text: nb.title || 'دفتر تازه' }), nb.archived ? chip('بایگانی', { tone: 'plain', glyph: 'folder' }) : chip('فعال', { tone: 'ok', glyph: '●' })),
        h('p', { class: 'small muted', text: `${readyCount} منبع آماده · ${nb.messages.length} پیام · ${relative(nb.updatedAt)}` }),
        h(
          'div',
          { class: 'btn-row' },
          h('a', { class: 'btn soft sm', href: `/ai/chat/${nb.id}`, text: nb.messages.length ? 'ادامه گفتگو' : 'شروع گفتگو' }),
          h('button', {
            class: 'btn ghost sm',
            type: 'button',
            text: nb.archived ? 'خروج از بایگانی' : 'بایگانی',
            on: {
              click: () => {
                app.set((s) => ({ notebooks: s.notebooks.map((item) => (item.id === nb.id ? { ...item, archived: !item.archived } : item)) }));
                toast('وضعیت دفتر تغییر کرد', 'ok');
              },
            },
          }),
          h('button', {
            class: 'btn danger sm',
            type: 'button',
            text: 'حذف',
            on: {
              click: async () => {
                const ok = await confirmDialog({ title: 'حذف دفتر', message: 'گفتگو و منابع این دفتر حذف می‌شوند.', confirmLabel: 'حذف', danger: true });
                if (!ok) return;
                app.set((s) => ({ notebooks: s.notebooks.filter((item) => item.id !== nb.id) }));
                toast('دفتر حذف شد', 'ok');
              },
            },
          }),
        ),
      ),
    );
  }

  page.append(
    card(
      {},
      sectionHead('منابع آماده مشترک', chip(`${sources.filter((s) => s.status === 'ready').length} منبع`)),
      ...sources.slice(0, 6).map((source) =>
        listItem({
          href: `/ai/sources/${source.id}`,
          leading: h('div', { class: 'avatar sm sq' }, icon(source.kind === 'file' ? 'file' : 'link', 'icon sm')),
          title: source.title,
          subtitle: source.status === 'ready' ? (source.quality === 'low' ? 'کیفیت متن پایین — مرجع دقیق نیست' : 'آماده ارجاع') : 'در حال آماده‌سازی',
          trailing: chip(source.status === 'ready' ? 'آماده' : 'در حال پردازش', { tone: source.status === 'ready' ? 'ok' : 'warn' }),
        }),
      ),
    ),
  );
  return page;
};

/* ------------------------------------------------------------------ AI-02 */

export const aiChatPage: PageRenderer = (ctx: RouteContext) => {
  const notebook = app.get().notebooks.find((nb) => nb.id === ctx.params.id);
  if (!notebook) return missing('دفتر پیدا نشد');
  const chatTitle = h('span', { class: 'chat-title truncate', text: notebook.title || 'دفتر تازه' });

  const page = h('div', { class: 'page fill chat-page ai-page' });

  const head = h(
    'header',
    { class: 'chat-head' },
    h('a', { class: 'icon-btn chat-back', href: '/ai/notebooks', 'aria-label': 'دفترها' }, icon('chevronEnd')),
    h(
      'div',
      { class: 'chat-who' },
      h('div', { class: 'avatar sm', style: { background: 'var(--accent)' } }, icon('ai', 'icon sm')),
      h(
        'span',
        { class: 'chat-who-text' },
        chatTitle,
        h('span', { class: 'chat-sub truncate', text: notebook.title ? `${notebook.sourceIds.length} منبع متصل` : 'اولین پیام، عنوان این دفتر می‌شود' }),
      ),
    ),
    h('div', { class: 'chat-head-actions' }, h('a', { class: 'icon-btn', href: '/ai/notebooks', 'aria-label': 'مدیریت منابع' }, icon('folder'))),
  );

  if (currentRole() === 'guardian') {
    page.append(banner('در زمینه والد، دستیار فقط از داده آموزشی منتشرشده استفاده می‌کند.', { glyph: 'shield' }));
  }

  const thread = h('div', { class: 'thread' });
  const paintThread = () => {
    thread.replaceChildren();
    const current = app.get().notebooks.find((nb) => nb.id === notebook.id)!;
    if (!current.messages.length) {
      thread.append(
        h(
          'div',
          { class: 'ai-greet' },
          h('div', { class: 'ai-greet-mark logo-tile' }),
          h('h2', { text: 'از منابع این دفتر بپرس' }),
          h('p', { class: 'small muted', text: 'پاسخ‌ها فقط بر پایه منابع متصل ساخته می‌شوند؛ اگر منبع کافی نباشد، همان را صریح می‌گوید.' }),
        ),
      );
      return;
    }
    for (const message of current.messages) thread.append(aiBubble(message.text, message.role, message.citations ?? []));
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
  };

  const input = h('textarea', { class: 'textarea', rows: 1, placeholder: 'پیام خود را بنویسید…', 'aria-label': 'پیام به دستیار' });
  input.style.minHeight = '44px';
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    const fresh = app.get().notebooks.find((nb) => nb.id === notebook.id)!;
    const ready = fresh.sourceIds.filter((id) => sourceById.get(id)?.status === 'ready');
    const answer =
      ready.length === 0
        ? 'هیچ منبع آماده‌ای به این دفتر متصل نیست، بنابراین نمی‌توانم پاسخ مستند بدهم. از پنل «منابع من» یک فایل یا پیوند اضافه کنید.'
        : 'بر پایه منابع متصل: نکته اصلی این است که ابتدا مسئله به صورت کمی نوشته و سپس ریشه‌ها بررسی شوند. اگر مجموع و حاصل‌ضرب ریشه‌ها را بدانید، می‌توانید معادله را بازسازی کنید.';
    /* First message names the notebook — no separate title field. */
    const nextTitle = fresh.title || titleFromText(text);
    if (nextTitle !== fresh.title) chatTitle.textContent = nextTitle;
    app.set((s) => ({
      notebooks: s.notebooks.map((nb) =>
        nb.id === notebook.id
          ? {
              ...nb,
              title: nextTitle,
              updatedAt: new Date().toISOString(),
              messages: [
                ...nb.messages,
                { role: 'user', text, at: new Date().toISOString() },
                { role: 'assistant', text: answer, at: new Date().toISOString(), citations: ready.slice(0, 2) },
              ],
            }
          : nb,
      ),
    }));
    input.value = '';
    paintThread();
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  });

  const composer = h(
    'div',
    { class: 'composer' },
    input,
    h('button', { class: 'btn primary', type: 'button', 'aria-label': 'ارسال', on: { click: send } }, icon('send', 'icon sm')),
  );

  page.append(head, thread, composer);
  paintThread();
  return page;
};

/* ------------------------------------------------------------------ AI-03 */

export const aiSourcesPage: PageRenderer = (ctx: RouteContext) => {
  const source = sourceById.get(ctx.params.id);
  if (!source) return missing('منبع پیدا نشد');
  const page = h('div', { class: 'page' });
  page.append(pageHead(source.title, 'مبنای پاسخ دستیار', '/ai/notebooks'));

  page.append(
    card(
      { tint: true },
      h('div', { class: 'row wrap', style: { gap: '6px' } },
        chip(source.status === 'ready' ? 'آماده ارجاع' : source.status === 'processing' ? 'در حال پردازش' : 'ناموفق', { tone: source.status === 'ready' ? 'ok' : source.status === 'failed' ? 'bad' : 'warn', glyph: source.status === 'ready' ? '✓' : '⏱' }),
        chip(source.quality === 'high' ? 'کیفیت متن بالا' : source.quality === 'low' ? 'کیفیت متن پایین' : 'کیفیت نامشخص', { tone: source.quality === 'low' ? 'warn' : 'plain' }),
        chip(source.license, { glyph: 'shield' }),
      ),
      source.processingNote ? h('p', { class: 'small muted', text: source.processingNote }) : null,
      h('p', { class: 'small', text: `آخرین به‌روزرسانی: ${formatDate(new Date(Date.now() - 86400000), { short: true })}` }),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('محدودیت‌ها'),
      h(
        'ul',
        { class: 'stack sm small muted' },
        h('li', { text: 'منبعی که کنار گذاشته شود، در پاسخ‌های بعدی استفاده نمی‌شود.' }),
        h('li', { text: 'شناسه پیام خصوصی یا نقل مکالمه در منبع نمایش داده نمی‌شود.' }),
        h('li', { text: 'پیوند هر منبع فقط به داده‌ای باز می‌شود که مخاطب واقعاً مجاز است.' }),
      ),
    ),
  );

  page.append(h('a', { class: 'btn soft block', href: `/school/resources/${source.id}`, text: 'مشاهده سند' }));
  return page;
};

/* ------------------------------------------------------------------ AI-04 */

/** Personal sources: the signed-in person's own material for the assistant.
    They belong to that person alone — no class, no school — and the page is the
    only place they can be added or removed. */
export const aiMySourcesPage: PageRenderer = () => {
  const me = currentPerson();
  const page = h('div', { class: 'page' });
  page.append(pageHead('منابع من', 'منابع شخصی خودت برای دستیار'));

  const add = h('button', { class: 'btn primary block', type: 'button' });
  add.append(icon('plus', 'icon sm'));
  add.append(h('span', { text: 'افزودن منبع شخصی' }));
  add.addEventListener('click', () => {
    let kind: 'file' | 'link' | 'note' = 'link';
    const kindRow = h('div', { class: 'pill-row' });
    const paintKind = () => {
      kindRow.replaceChildren();
      for (const option of [
        { id: 'link', label: 'پیوند' },
        { id: 'file', label: 'فایل' },
        { id: 'note', label: 'یادداشت' },
      ] as const) {
        const btn = h('button', { class: `chip btn-like ${kind === option.id ? '' : 'ghost'}`, type: 'button', 'aria-pressed': String(kind === option.id), text: option.label });
        btn.addEventListener('click', () => {
          kind = option.id;
          paintKind();
        });
        kindRow.append(btn);
      }
    };
    paintKind();

    const title = field({ label: 'عنوان', placeholder: 'مثلاً جزوهٔ فصل سوم' });
    const link = field({ label: 'نشانی پیوند', placeholder: 'https://…', dir: 'ltr' });
    const note = field({ label: 'یادداشت', placeholder: 'خلاصه‌ای از محتوا' });
    const linkWrap = h('div', { class: 'stack sm' }, link.wrap, note.wrap);

    const save = h('button', {
      class: 'btn primary block',
      type: 'button',
      text: 'افزودن',
      on: {
        click: () => {
          const name = title.input.value.trim();
          if (!name) {
            toast('عنوان منبع لازم است', 'bad');
            return;
          }
          const url = link.input.value.trim();
          if (kind === 'link' && !url) {
            toast('برای منبع پیوندی نشانی لازم است', 'bad');
            return;
          }
          addPersonalSource(me.id, {
            title: name,
            kind,
            url: url || undefined,
            note: note.input.value.trim() || undefined,
          });
          close();
          toast('منبع شخصی افزوده شد', 'ok');
          paintList();
        },
      },
    });
    const body = h('div', { class: 'stack sm' }, kindRow, title.wrap, linkWrap, save);
    const close = openSheet({ title: 'منبع شخصی تازه', body });
  });
  page.append(add);

  const mineHost = h('div', { class: 'stack sm' });
  /* Repainted in place after add/remove: the runtime store is in memory, so a
     page reload would throw away the change it was meant to show. */
  const paintList = () => {
    mineHost.replaceChildren();
    const mine = personalSourcesFor(me.id);
    if (!mine.length) {
      mineHost.append(empty({ glyph: 'folder', title: 'هنوز منبع شخصی ندارید', text: 'یک پیوند، فایل یا یادداشت اضافه کنید تا دستیار پاسخ‌ها را بر پایهٔ آن بدهد.' }));
      return;
    }
    mineHost.append(
      card(
        {},
        sectionHead('منابع شخصی من', chip(`${mine.length} منبع`, { tone: 'ok' })),
        ...mine.map((item) =>
          listItem({
            leading: h('div', { class: 'avatar sm sq' }, icon(item.kind === 'link' ? 'link' : item.kind === 'file' ? 'file' : 'edit', 'icon sm')),
            title: item.title,
            subtitle: item.note || item.url || (item.kind === 'file' ? 'فایل شخصی' : 'یادداشت شخصی'),
            meta: relative(item.addedAt),
            trailing: h('button', {
              class: 'icon-btn',
              type: 'button',
              'aria-label': 'حذف منبع',
              on: {
                click: async (event: Event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const ok = await confirmDialog({ title: 'حذف منبع شخصی', message: 'این منبع فقط از فهرست شخصی شما پاک می‌شود.', confirmLabel: 'حذف', danger: true });
                  if (!ok) return;
                  removePersonalSource(me.id, item.id);
                  toast('منبع حذف شد', 'ok');
                  paintList();
                },
              },
            }, icon('trash', 'icon sm')),
          }),
        ),
      ),
    );
  };
  paintList();
  page.append(mineHost);

  page.append(banner('این منابع فقط برای خودت نگه داشته می‌شوند؛ در کلاس و آموزشگاه نمایش داده نمی‌شوند و برای دیگران قابل دسترسی نیستند.', { glyph: 'lock' }));
  return page;
};

function kvGridLike(entries: [string, string][]): HTMLElement {
  const el = h('dl', { class: 'kv-grid' });
  for (const [key, value] of entries) {
    el.append(h('div', { class: 'kv' }, h('dt', { text: key }), h('dd', { text: value })));
  }
  return el;
}

/* ------------------------------------------------------------------ AI-05 */

export const aiPracticePage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('برنامه تمرین', 'پیشنهاد کمکی، جدا از تکلیف و آزمون رسمی'));

  page.append(
    card(
      { tint: true },
      sectionHead('پیشنهاد برای شما', chip('کمکی', { tone: 'info', glyph: 'ai' })),
      h('h2', { text: 'مرور ۲۰ دقیقه‌ای: بررسی ریشه‌های معادله درجه دو' }),
      h('p', { class: 'small muted', text: 'دلیل پیشنهاد: دو تمرین اخیر در مرحله بررسی ریشه‌ها خطا داشته‌اند.' }),
      kvGridLike([
        ['زمان تقریبی', '۲۰ دقیقه'],
        ['منابع', 'جزوه معادله درجه دو'],
        ['وضعیت', 'پیشنهاد داده شده'],
      ]),
      h('div', { class: 'btn-row' }, acceptBtn(), skipBtn()),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('این تمرین چه نیست'),
      h(
        'ul',
        { class: 'stack sm small muted' },
        h('li', { text: 'آزمون یا تکلیف رسمی مدرسه نیست.' }),
        h('li', { text: 'نمره رسمی تولید نمی‌کند و به کارنامه اضافه نمی‌شود.' }),
        h('li', { text: 'انجام تمرین به‌معنای اثبات تسلط نیست.' }),
      ),
    ),
  );

  page.append(
    banner('اگر والد به این صفحه نگاه کند، می‌تواند پیشنهاد را ببیند و حمایت کند، اما نمی‌تواند تمرین را به نام دانش‌آموز ثبت کند.', { glyph: 'shield' }),
  );
  return page;
};

function acceptBtn(): HTMLElement {
  const btn = h('button', { class: 'btn primary grow', type: 'button', text: 'پذیرفتن و شروع' });
  btn.addEventListener('click', () => toast('تمرین کمکی شروع شد — نمره رسمی ندارد', 'ok'));
  return btn;
}

function skipBtn(): HTMLElement {
  const btn = h('button', { class: 'btn ghost', type: 'button', text: 'کنارگذاشتن' });
  btn.addEventListener('click', () => toast('پیشنهاد کنار گذاشته شد', 'info'));
  return btn;
}
