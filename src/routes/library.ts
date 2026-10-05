/** KN-01 / KN-02 — library and source preparation, processing and assignment. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import { banner, card, chip, empty, kvGrid, listItem, pageHead, sectionHead, seg } from '../ui/kit';
import { formatDate, n, relative } from '../core/format';
import { schoolById, sources } from '../data/seed';
import { confirmDialog, toast } from '../core/overlays';
import type { PageRenderer, RouteContext } from '../core/router';

export const libraryPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('کتابخانه منابع', 'منابع آماده‌سازی‌شده برای ارجاع در دستیار'));

  const groups = [
    { id: 'ready', label: 'آماده' },
    { id: 'processing', label: 'در حال پردازش' },
    { id: 'failed', label: 'ناموفق' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'ready';
  const host = h('div', { class: 'stack' });

  const paint = () => {
    host.replaceChildren();
    const list = sources.filter((s) => (filter === 'ready' ? s.status === 'ready' : filter === 'processing' ? s.status === 'processing' : s.status === 'failed'));
    if (!list.length) {
      host.append(empty({ glyph: 'layers', title: 'منبعی در این دسته نیست' }));
      return;
    }
    for (const source of list) {
      host.append(
        card(
          {},
          h(
            'div',
            { class: 'row between wrap' },
            h('h3', { text: source.title }),
            chip(source.status === 'ready' ? (source.quality === 'low' ? 'کیفیت پایین' : 'آماده') : source.status === 'processing' ? 'در حال پردازش' : 'ناموفق', {
              tone: source.status === 'ready' ? (source.quality === 'low' ? 'warn' : 'ok') : source.status === 'failed' ? 'bad' : 'warn',
              glyph: source.status === 'failed' ? '×' : source.status === 'processing' ? 'clock' : '✓',
            }),
          ),
          h('div', { class: 'row wrap', style: { gap: '6px' } },
            chip(source.kind === 'file' ? `${n(source.sizeKb ?? 0)} کیلوبایت` : 'پیوند', { glyph: source.kind === 'file' ? 'file' : 'link' }),
            source.pages ? chip(`${source.pages} صفحه`, { glyph: 'book' }) : null,
            chip(source.license, { glyph: 'shield' }),
            ...source.assignedTo.map((id) => chip(schoolById.get(id)?.name ?? id, { tone: 'info' })),
          ),
          source.processingNote ? h('p', { class: 'tiny muted', text: source.processingNote }) : null,
          h('a', { class: 'btn soft sm', href: `/library/${source.id}`, text: 'جزئیات' }),
        ),
      );
    }
  };

  page.append(seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  page.append(h('button', { class: 'btn primary block', type: 'button', text: 'افزودن منبع', on: { click: () => toast('بارگذاری در نسخه نمایشی انجام نمی‌شود', 'info') } }));
  page.append(banner('بارگذاری سند، مجوز انتشار یا استفاده از آن برای همه نقش‌ها ایجاد نمی‌کند.', { glyph: 'shield' }));
  paint();
  return page;
};

export const sourcePage: PageRenderer = (ctx: RouteContext) => {
  const source = sources.find((s) => s.id === ctx.params.id);
  if (!source) {
    const page = h('div', { class: 'page' });
    page.append(empty({ glyph: 'layers', title: 'منبع پیدا نشد' }));
    return page;
  }

  const page = h('div', { class: 'page' });
  page.append(pageHead(source.title, 'سند، نسخه و تخصیص', '/library'));

  page.append(
    card(
      { tint: true },
      sectionHead('وضعیت پردازش', chip(source.status === 'ready' ? 'Ready' : source.status === 'processing' ? 'Processing' : 'Failed', { tone: source.status === 'ready' ? 'ok' : source.status === 'failed' ? 'bad' : 'warn' })),
      kvGrid([
        ['کیفیت متن', source.quality === 'high' ? 'بالا' : source.quality === 'low' ? 'پایین' : 'در حال بررسی'],
        ['صفحات', String(source.pages ?? 0)],
        ['حق استفاده', source.license],
        ['آخرین تغییر', relative(new Date(Date.now() - 2 * 86400000))],
      ]),
      source.processingNote ? banner(source.processingNote, { tone: 'warn', glyph: 'clock' }) : null,
    ),
  );

  page.append(
    card(
      {},
      sectionHead('تخصیص'),
      ...source.assignedTo.map((id) =>
        listItem({
          title: schoolById.get(id)?.name ?? id,
          subtitle: 'اختصاص‌یافته',
          trailing: chip('برداشتن تخصیص', { glyph: 'x' }),
        }),
      ),
      h('button', { class: 'btn soft block', type: 'button', text: 'افزودن تخصیص', on: { click: () => toast('در نسخه نمایشی تخصیص تازه ثبت نمی‌شود', 'info') } }),
      h('p', { class: 'tiny muted', text: 'برداشتن تخصیص، استفاده آینده از متن و منابع مشتق را می‌بندد — نه فقط فهرست ظاهری.' }),
    ),
  );

  const retire = h('button', { class: 'btn danger block', type: 'button', text: 'کنارگذاشتن با تأیید' });
  retire.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'کنارگذاشتن سند', message: 'سند از دسترس کلاس‌های تخصیص‌یافته خارج می‌شود و در پاسخ‌های دستیار استفاده نخواهد شد.', confirmLabel: 'کنارگذاشتن', danger: true });
    if (ok) toast('سند کنار گذاشته شد (نمایشی)', 'ok');
  });
  page.append(retire);
  void icon;
  void formatDate;
  return page;
};