/** MSG-01 … MSG-09 — messenger: inbox, chat, new chat, group, info, media, search, safety. */

import { h } from '../core/dom';
import { icon } from '../core/icons';
import {
  avatar,
  avatarStack,
  banner,
  card,
  chip,
  empty,
  field,
  kvGrid,
  listItem,
  pageHead,
  photoAvatar,
  sectionHead,
  seg,
} from '../ui/kit';
import { formatDate, formatTime, dayKey, dayLabel, relative, searchHit } from '../core/format';
import { classById, nameOf, people, personById } from '../data/seed';
import { app, markConversationRead, photoFor, sendMessage, setSpacePhoto } from '../data/app-state';
import { canReadConversation, session as state } from '../data/session';
import { openPhotoSourceSheet } from '../core/media';
import { syncChrome } from '../shell/shell';
import { confirmDialog, openSheet, toast } from '../core/overlays';
import { denied, missing } from './classes';
import type { Conversation } from '../data/types';
import type { PageRenderer, RouteContext } from '../core/router';

function convoMembers(convo: Conversation): string[] {
  return convo.memberIds.filter((id) => id !== 'system');
}

function conversation(id: string) {
  return app.get().conversations.find((c) => c.id === id);
}

function myConversations(): Conversation[] {
  const persona = state.get().personaId;
  return app
    .get()
    .conversations.filter((c) => c.memberIds.includes(persona))
    .sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1]?.at ?? '';
      const lastB = b.messages[b.messages.length - 1]?.at ?? '';
      return +new Date(lastB) - +new Date(lastA);
    });
}

/* ------------------------------------------------------------------ MSG-01 */

export const inboxPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('گفتگوها', 'گفتگوی شخصی، گروه کلاس و کانال رسمی'));

  const groups = [
    { id: 'all', label: 'همه' },
    { id: 'direct', label: 'شخصی' },
    { id: 'group', label: 'گروه کلاس' },
    { id: 'channel', label: 'کانال' },
  ] as const;
  let filter: (typeof groups)[number]['id'] = 'all';
  let query = '';

  const host = h('div', { class: 'stack sm' });
  const paint = () => {
    host.replaceChildren();
    /* Search covers the conversation name *and* everything said inside it —
       message text and who said it — so a word from a group/channel post, or
       a person's name, still finds that chat. Both sides are folded first, so
       `اطلاعیه های` finds `اطلاعیه‌های`. */
    const list = myConversations()
      .filter((c) => (filter === 'all' ? true : c.kind === filter))
      .filter(
        (c) =>
          !query ||
          searchHit(c.title, query) ||
          searchHit(c.subtitle ?? '', query) ||
          convoMembers(c).some((id) => searchHit(nameOf(id), query)) ||
          c.messages.some((m) => searchHit(m.text, query) || searchHit(nameOf(m.authorId), query)),
      );
    if (!list.length) {
      host.append(empty({ glyph: 'chat', title: 'گفتگویی نیست', text: 'گفتگوی تازه را فقط با افراد مجاز بسازید.' }));
      return;
    }
    for (const convo of list) {
      const last = convo.messages[convo.messages.length - 1];
      const members = convoMembers(convo);
      host.append(
        listItem({
          href: `/msg/${convo.id}`,
          unread: convo.unread > 0,
          leading: convo.kind === 'channel' ? h('div', { class: 'avatar sm sq' }, icon('inbox', 'icon sm')) : members.length > 2 ? h('div', { class: 'avatar sm' }, h('span', { text: 'گ' })) : avatar(nameOf(members[0] ?? ''), { size: 'sm' }),
          title: convo.title,
          subtitle: last ? `${convo.kind === 'channel' ? '' : `${nameOf(last.authorId).split(' ')[0]}: `}${last.text}` : 'هنوز پیامی نیست',
          meta: last ? relative(last.at) : '',
          /* Pinned chats show a pin glyph only; the word used to push the row
             wider than the list island. */
          trailing: convo.pinned
            ? h('span', { class: 'side-pin', 'aria-label': 'سنجاق‌شده', role: 'img' }, icon('pin', 'icon sm'))
            : convo.unread
              ? chip(String(convo.unread), { tone: 'solid' })
              : null,
        }),
      );
    }
  };

  const search = field({ label: 'جست‌وجوی گفتگو', placeholder: 'نام گفتگو…' });
  search.input.addEventListener('input', () => {
    query = search.input.value;
    paint();
  });

  page.append(search.wrap, seg({ items: groups.map((g) => ({ id: g.id, label: g.label })), value: filter, onChange: (id) => { filter = id; paint(); } }));
  page.append(host);
  /* Starting a conversation lives in the floating pencil (compose sheet), so
     the page itself stays a pure list. */
  paint();
  page.append(mobileComposeFab());
  return page;
};

/* ------------------------------------------------------------------ MSG-02/03 */

/* ------------------------------------------------------------------ MSG-02/03 */

/**
 * The conversation header. It is its own sticky bar (rather than a row inside
 * the page) so it parks under the app header on phones and at the top of the
 * island on wide screens, and so the day dividers below can stick right under it.
 */
function chatHead(convo: Conversation, members: string[]): HTMLElement {
  const me = state.get().personaId;
  const peer = members.find((id) => id !== me && id !== 'system') ?? convo.ownerId;
  const isGroup = convo.kind === 'group';
  const isChannel = convo.kind === 'channel';
  // Groups and channels paint their own picture when one is set, and fall back
  // to the square glyph tile when it is not.
  const spacePhoto = isGroup || isChannel ? photoFor(convo.id) : null;
  const face = isGroup || isChannel
    ? spacePhoto
      ? photoAvatar(spacePhoto, convo.title, { size: 'sm', square: true })
      : h('div', { class: 'avatar sm sq', style: { background: 'var(--accent)' } }, icon(isChannel ? 'inbox' : 'users', 'icon sm'))
    : photoAvatar(photoFor(peer), nameOf(peer), { size: 'sm' });

  const who = h('a', { class: 'chat-who', href: `/msg/${convo.id}/info` }, face);
  const text = h('span', { class: 'chat-who-text' });
  const className = convo.classId ? classById.get(convo.classId)?.name ?? '' : '';
  text.append(h('span', { class: 'chat-title truncate', text: convo.title }));
  text.append(
    h('span', {
      class: 'chat-sub truncate',
      text: isGroup
        ? // The class name is only worth repeating when it differs from the title.
          `${members.length} عضو${className && className !== convo.title ? ` · ${className}` : ''}`
        : convo.subtitle ?? personById.get(peer)?.roles.join('، ') ?? 'گفتگوی مستقیم',
    }),
  );
  who.append(text);

  const actions = h('div', { class: 'chat-head-actions' });
  if (convo.muted) actions.append(chip('بی‌صدا', { glyph: 'volume' }));
  actions.append(h('a', { class: 'icon-btn', href: `/msg/${convo.id}/info`, 'aria-label': 'اطلاعات گفتگو' }, icon('info')));

  return h(
    'header',
    { class: 'chat-head' },
    h('a', { class: 'icon-btn chat-back', href: '/msg', 'aria-label': 'بازگشت به گفتگوها' }, icon('chevronEnd')),
    who,
    actions,
  );
}

export const chatPage: PageRenderer = (ctx: RouteContext) => {
  const convo = conversation(ctx.params.id);
  if (!convo) return missing('گفتگو پیدا نشد');
  if (!canReadConversation(convo.id)) {
    return denied('عضو این گفتگو نیستید. دسترسی به گفتگو فقط برای اعضای مجاز است و با تغییر نشانی باز نمی‌شود.');
  }
  if (convo.kind === 'channel') return channelView(convo);

  const page = h('div', { class: 'page fill chat-page' });
  const members = convoMembers(convo);
  const named = convo.kind === 'group';

  page.append(chatHead(convo, members));

  const thread = h('div', { class: 'thread' });
  const paintThread = () => {
    thread.replaceChildren();
    const current = conversation(convo.id)!;
    const me = state.get().personaId;
    let lastDay = '';
    let lastAuthor = '';
    for (const message of current.messages) {
      // One divider per calendar day, above its first message — never repeated.
      const day = dayKey(message.at);
      if (day !== lastDay) {
        thread.append(h('div', { class: 'day-sep' }, h('span', { class: 'day-chip', text: dayLabel(message.at) })));
        lastDay = day;
        lastAuthor = '';
      }
      const mine = message.authorId === me;
      const starts = message.authorId !== lastAuthor;
      lastAuthor = message.authorId;

      const row = h('div', { class: `msg-row ${mine ? 'mine' : 'other'}${starts ? '' : ' cont'}` });
      // Consecutive messages from one sender keep the avatar column but drop the
      // picture, the way a chat log reads.
      const face = h('span', { class: 'msg-av' });
      if (starts) face.append(photoAvatar(photoFor(message.authorId), nameOf(message.authorId), { size: 'sm', square: named }));
      row.append(face);

      // The name sits above the message, on the sender's own side; in a direct
      // chat the header already names the only other person, so it is skipped.
      if (!mine && starts && named) {
        row.append(h('span', { class: 'msg-name', text: nameOf(message.authorId) }));
      }

      const bubble = h('div', { class: 'bubble' });
      bubble.append(h('span', { text: message.text }));
      if (message.attachment) {
        bubble.append(
          h('span', { class: 'chip' }, icon(message.attachment.kind === 'image' ? 'image' : 'file', 'icon sm'), h('span', { text: `${message.attachment.name} · ${message.attachment.sizeKb} کیلوبایت` })),
        );
      }
      bubble.append(h('span', { class: 't', text: formatTime(message.at) }));
      row.append(bubble);

      if (mine) {
        const label = message.state === 'queued' ? 'در صف ارسال' : message.state === 'sent' ? 'ارسال شد' : message.state === 'delivered' ? 'تحویل شد' : message.state === 'read' ? 'خوانده شد' : 'ارسال نشد';
        row.append(h('span', { class: 'msg-status', text: `${label} · ${formatTime(message.at)}` }));
      }
      thread.append(row);
    }
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
  };

  const input = h('textarea', { class: 'textarea', rows: 1, placeholder: 'پیام…', 'aria-label': 'متن پیام' });
  input.style.minHeight = '44px';
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    sendMessage(convo.id, text);
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
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'پیوست', on: { click: () => openPhotoSourceSheet({ title: 'پیوست', allowRemove: false, onPick: (dataUrl, source) => { toast(source === 'camera' ? 'تamenti عکس گرفته شد' : 'تصویر پیوست شد', 'ok'); } }) } }, icon('pin')),
    input,
    h('button', { class: 'btn primary', type: 'button', 'aria-label': 'ارسال', on: { click: send } }, icon('send', 'icon sm')),
  );

  page.append(thread, composer);
  paintThread();
  markConversationRead(convo.id);
  return page;
}

/**
 * The floating pencil for phones: opens the same compose sheet the desktop
 * sidebar uses (new chat / group / channel / contact by number). The sidebar
 * island does not exist below 1024px, so this is the only way to start a
 * conversation on a phone — and it belongs to the chat *list* only. Inside an
 * open conversation the header's back button is the way out, so a pencil
 * there would float over the thread for no reason.
 */
function mobileComposeFab(): HTMLElement {
  const fab = h('button', {
    class: 'side-fab msg-fab',
    type: 'button',
    'aria-label': 'ساخت گفتگو، گروه یا کانال',
    on: { click: () => void import('../shell/side-list').then((m) => m.openComposeSheet()) },
  });
  fab.append(icon('edit', 'icon lg'));
  return fab;
}

function channelView(convo: Conversation): HTMLElement {
  const page = h('div', { class: 'page fill chat-page' });
  const isOwner = convo.adminIds.includes(state.get().personaId);
  const paintAll = () => {
    const fresh = conversation(convo.id)!;
    page.replaceChildren(
      chatHead(fresh, convoMembers(fresh)),
      buildChannelFeed(fresh),
      isOwner ? channelComposer(fresh, paintAll) : banner('عضو عادی کانال ابزار انتشار ندارد؛ محدودیت در سمت سرور هم اعمال می‌شود.', { glyph: 'lock' }),
    );
  };
  paintAll();
  return page;
}

function buildChannelFeed(convo: Conversation): HTMLElement {
  const feed = h('div', { class: 'thread channel-feed' });
  let lastDay = '';
  let lastAuthor = '';
  for (const message of convo.messages) {
    const day = dayKey(message.at);
    if (day !== lastDay) {
      feed.append(h('div', { class: 'day-sep' }, h('span', { class: 'day-chip', text: dayLabel(message.at) })));
      lastDay = day;
      lastAuthor = '';
    }
    /* Telegram's channel layout: every post is a full-width bubble that owns
       its own padding; the channel (not the author) names it from above via
       the header, and the author's name sits next to the timestamp as a small,
       same-style label inside the bubble. */
    const starts = message.authorId !== lastAuthor;
    lastAuthor = message.authorId;
    const bubble = h('div', { class: `bubble channel-post${starts ? '' : ' cont'}` });
    bubble.append(h('span', { class: 'channel-text', text: message.text }));
    const meta = h('span', { class: 'channel-meta' });
    meta.append(h('span', { class: 'channel-author', text: nameOf(message.authorId) }));
    meta.append(h('span', { class: 't', text: formatTime(message.at) }));
    bubble.append(meta);
    if (message.attachment) {
      bubble.append(
        h('span', { class: 'chip' }, icon(message.attachment.kind === 'image' ? 'image' : 'file', 'icon sm'), h('span', { text: `${message.attachment.name} · ${message.attachment.sizeKb} کیلوبایت` })),
      );
    }
    feed.append(bubble);
  }
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));
  return feed;
}

function channelComposer(convo: Conversation, repaint: () => void): HTMLElement {
  const input = h('textarea', { class: 'textarea', rows: 1, placeholder: 'پست جدید کانال…', 'aria-label': 'متن پست' });
  input.style.minHeight = '44px';
  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    sendMessage(convo.id, text);
    repaint();
  };
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  });
  return h(
    'div',
    { class: 'composer' },
    input,
    h('button', { class: 'btn primary', type: 'button', 'aria-label': 'انتشار در کانال', on: { click: send } }, icon('send', 'icon sm')),
  );
}


/* ------------------------------------------------------------------ MSG-04 */

export const newChatPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('شروع گفتگو', 'فقط مخاطبان مجاز و مرتبط پیشنهاد می‌شوند'));

  const persona = state.get().personaId;
  const allowed = people.filter((p) => p.id !== persona && (p.roles.includes('teacher') || p.roles.includes('guardian') || p.id === 'p-arash'));
  const search = field({ label: 'جست‌وجوی نام کاربری', placeholder: 'مثلاً negar.a', dir: 'ltr' });
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const query = search.input.value.trim();
    const list = allowed.filter((p) => !query || p.username.includes(query) || p.name.includes(query)).slice(0, 8);
    if (!list.length) {
      host.append(empty({ glyph: 'search', title: 'نتیجه‌ای نیست', text: 'مخاطب نامرئی یا خارج از محدوده ارتباط شماست.' }));
      return;
    }
    for (const person of list) {
      host.append(
        listItem({
          leading: avatar(person.name, { size: 'sm' }),
          title: person.name,
          subtitle: `${person.username} · ${person.roles.join('، ')}`,
          trailing: chip('شروع گفتگو', { glyph: 'chevronEnd' }),
          onClick: () => {
            const existing = conversation(`d-${person.id}`) ?? myConversations().find((c) => c.kind === 'direct' && c.memberIds.includes(person.id) && c.memberIds.includes(persona));
            if (existing) {
              toast('گفتگوی تازه ساخته نشد؛ گفتگوی موجود باز شد', 'info');
              location.assign(`/msg/${existing.id}`);
              return;
            }
            toast('در نسخه نمایشی گفتگو ساخته نمی‌شود', 'info');
          },
        }),
      );
    }
  };

  search.input.addEventListener('input', paint);
  page.append(search.wrap, host);
  page.append(banner('شماره خصوصی در نتیجه جست‌وجو افشا نمی‌شود و تماس با ناشناسان محدود است.', { glyph: 'shield' }));
  paint();
  return page;
};

/* ------------------------------------------------------------------ MSG-05 */

export const newGroupPage = newSpacePage('group');
export const newChannelPage = newSpacePage('channel');

/**
 * One form for both new spaces. `preset` pins the kind: the messenger's compose
 * menu links "گروه جدید" and "کانال جدید" straight to the right one, while
 * /msg/new-group keeps the switcher for people who land there directly.
 */
function newSpacePage(preset: 'group' | 'channel'): PageRenderer {
  return () => {
  const page = h('div', { class: 'page' });
  const pinned = preset === 'channel';
  page.append(
    pageHead(
      pinned ? 'کانال تازه' : 'گروه تازه',
      'نوع انتشار، مالکیت و دامنه پیش از ساخت روشن می‌شود',
      '/msg',
    ),
  );

  let kind: 'group' | 'channel' = preset;
  const kindRow = h('div', { class: 'pill-row' });
  const paintKind = () => {
    kindRow.replaceChildren();
    for (const option of [{ id: 'group', label: 'گفتگوی گروهی' }, { id: 'channel', label: 'کانال اطلاعیه' }] as const) {
      const btn = h('button', { class: `chip btn-like ${kind === option.id ? '' : 'ghost'}`, type: 'button' });
      btn.setAttribute('aria-pressed', String(kind === option.id));
      btn.textContent = option.label;
      btn.addEventListener('click', () => {
        kind = option.id;
        paintKind();
      });
      kindRow.append(btn);
    }
  };
  if (pinned) {
    const locked = h('div', { class: 'chip solid' }, icon('inbox', 'icon sm'), h('span', { text: 'کانال اطلاعیه — فقط مدیران می‌نویسند' }));
    kindRow.append(locked);
  } else {
    paintKind();
  }

  const title = field({ label: 'عنوان', placeholder: pinned ? 'اطلاعیه‌های آموزشگاه' : 'گروه مطالعه ریاضی' });
  const description = field({ label: 'توضیح کوتاه', placeholder: pinned ? 'موضوع کانال' : 'هدف گروه' });
  const persona = state.get().personaId;
  const candidates = people.filter((p) => p.id !== persona).slice(0, 6);
  const selected = new Set<string>();

  const membersHost = h('div', { class: 'stack sm' });
  const paintMembers = () => {
    membersHost.replaceChildren();
    for (const person of candidates) {
      const row = h('div', { class: 'list-item' });
      row.append(avatar(person.name, { size: 'sm' }));
      row.append(h('div', { class: 'body' }, h('span', { text: person.name }), h('span', { class: 'meta', text: person.username })));
      const toggle = h('button', { class: `chip btn-like ${selected.has(person.id) ? '' : 'ghost'}`, type: 'button' });
      toggle.setAttribute('aria-pressed', String(selected.has(person.id)));
      toggle.textContent = selected.has(person.id) ? 'انتخاب شد' : 'افزودن';
      toggle.addEventListener('click', () => {
        if (selected.has(person.id)) selected.delete(person.id);
        else selected.add(person.id);
        paintMembers();
      });
      row.append(toggle);
      membersHost.append(row);
    }
  };
  paintMembers();

  const create = h('button', { class: 'btn primary block', type: 'button', text: kind === 'channel' ? 'ساخت کانال' : 'ساخت گروه' });
  create.addEventListener('click', () => {
    if (!title.input.value.trim() || selected.size === 0) {
      toast('عنوان و حداقل یک عضو لازم است', 'bad');
      return;
    }
    toast(
      kind === 'channel'
        ? 'کانال نمایشی ساخته شد؛ انتشار فقط برای مدیر باز است (نمایشی)'
        : 'گروه کلاس از این مسیر ساخته نمی‌شود؛ گروه شخصی ساخته شد (نمایشی)',
      'ok',
    );
  });

  page.append(
    card(
      {},
      kindRow,
      title.wrap,
      description.wrap,
      sectionHead(kind === 'channel' ? 'اعضای کانال' : 'اعضا', chip(`${selected.size} انتخاب‌شده`)),
      membersHost,
      create,
    ),
  );
  page.append(banner('با نام‌گذاری گروه نمی‌توان آن را گروه رسمی System-managed یک کلاس کرد.', { glyph: 'shield' }));
  return page;
  };
}

/* ------------------------------------------------------------------ MSG-06 */

export const chatInfoPage: PageRenderer = (ctx: RouteContext) => {
  const convo = conversation(ctx.params.id);
  if (!convo) return missing('گفتگو پیدا نشد');
  if (!canReadConversation(convo.id)) return denied('عضو این گفتگو نیستید.');

  const persona = state.get().personaId;
  const members = convoMembers(convo);
  const isOwner = convo.ownerId === persona;
  const isAdmin = convo.adminIds.includes(persona);

  const page = h('div', { class: 'page' });
  page.append(pageHead(convo.title, 'اطلاعات، اعضا و مدیریت', `/msg/${convo.id}`));

  /* Group/channel picture: the same gallery/camera sheet as the profile, keyed
     by the conversation id. Managing it is an admin/owner prerogative. */
  const isSpace = convo.kind !== 'direct';
  const canEditPhoto = isSpace && (isOwner || isAdmin);
  if (isSpace && canEditPhoto) {
    const photoHost = h('div', { class: 'photo-picker' });
    const paintPhoto = () => {
      photoHost.replaceChildren();
      const photo = photoFor(convo.id);
      const face = photoAvatar(photo, convo.title, { size: 'lg', square: true });
      face.classList.add('photo-tappable');
      face.setAttribute('role', 'button');
      face.setAttribute('tabindex', '0');
      face.setAttribute('aria-label', photo ? 'تغییر یا حذف تصویر' : 'افزودن تصویر');
      const openChooser = () =>
        openPhotoSourceSheet({
          title: convo.kind === 'channel' ? 'تصویر کانال' : 'تصویر گروه',
          allowRemove: Boolean(photo),
          onPick: (dataUrl) => {
            setSpacePhoto(convo.id, dataUrl);
            paintPhoto();
            syncChrome('msg');
            toast('تصویر ذخیره شد', 'ok');
          },
          onRemove: () => {
            setSpacePhoto(convo.id, null);
            paintPhoto();
            syncChrome('msg');
            toast('تصویر حذف شد', 'info');
          },
        });
      face.addEventListener('click', openChooser);
      face.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openChooser();
        }
      });
      photoHost.append(
        face,
        h(
          'div',
          { class: 'grow' },
          h('div', { style: { fontWeight: '800' }, text: photo ? 'تصویر ثبت شده' : 'تصویر گفتگو' }),
          h('p', { class: 'tiny muted', text: 'روی عکس بزنید تا از گالری یا دوربین انتخاب شود.' }),
        ),
      );
    };
    paintPhoto();
    page.append(card({ tint: true }, photoHost));
  }

  page.append(
    card(
      { tint: !isSpace },
      kvGrid([
        ['نوع', convo.kind === 'direct' ? 'گفتگوی مستقیم' : convo.kind === 'group' ? 'گروه' : 'کانال'],
        ['مالک', convo.ownerId === 'system' ? 'کلاس (سیستمی)' : nameOf(convo.ownerId)],
        ['اعضا', `${members.length}`],
        ['سیاست تحلیل', convo.aiPolicy === 'off' ? 'خاموش' : convo.aiPolicy === 'class-only' ? 'فقط محتوای کلاس' : 'با درخواست'],
      ]),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('اعضا'),
      h('div', { class: 'row', style: { marginBlockEnd: '8px' } }, avatarStack(members, 6)),
      ...members.map((memberId) =>
        listItem({
          leading: avatar(nameOf(memberId), { size: 'sm' }),
          title: nameOf(memberId),
          subtitle: convo.adminIds.includes(memberId) ? 'مدیر گفتگو' : personById.get(memberId)?.roles.join('، '),
          trailing: isOwner || isAdmin ? chip('مدیریت', { glyph: 'settings' }) : null,
        }),
      ),
    ),
  );

  page.append(
    card(
      {},
      sectionHead('رسانه‌ها'),
      listItem({ href: `/msg/${convo.id}/media`, leading: h('div', { class: 'avatar sm sq' }, icon('image', 'icon sm')), title: 'تصویر و ویدئو', subtitle: '۳ فایل' }),
      listItem({ leading: h('div', { class: 'avatar sm sq' }, icon('file', 'icon sm')), title: 'اسناد و پیوندها', subtitle: '۱ فایل' }),
    ),
  );

  if (convo.classId) {
    page.append(banner('عضویت گروه کلاس از ثبت‌نام کلاس پیروی می‌کند؛ حذف دانش‌آموز از کلاس با اخراج از گفتگو یکی نیست.', { glyph: 'info' }));
    page.append(h('a', { class: 'btn soft block', href: `/school/classes/${convo.classId}`, text: 'مدیریت کلاس (مسیر رسمی)' }));
  }

  const danger = h('button', { class: 'btn danger block', type: 'button', text: isOwner ? 'ترک گروه' : 'مسدودکردن یا گزارش' });
  danger.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: isOwner ? 'ترک گروه' : 'ایمنی', message: isOwner ? 'خروج آخرین مالک بدون انتقال مالکیت یا آرشیو مسدود است.' : 'مسدودکردن می‌تواند مسیر ارتباط را ببندد.', confirmLabel: isOwner ? 'خروج' : 'ادامه' });
    if (ok) location.assign(isOwner ? '/msg' : `/msg/${convo.id}/../safety`.replace('/../', '/'));
  });
  page.append(danger);
  return page;
};

/* ------------------------------------------------------------------ MSG-07/08 */

export const searchPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('جست‌وجوی پیام', 'نتایج فقط از گفتگوهای مجاز'));

  const search = field({ label: 'عبارت', placeholder: 'مثلاً معادله' });
  const host = h('div', { class: 'stack sm' });

  const paint = () => {
    host.replaceChildren();
    const query = search.input.value.trim();
    if (!query) {
      host.append(empty({ glyph: 'search', title: 'عبارت بنویسید', text: 'نتایج به تعداد و محتوای شما محدود است.' }));
      return;
    }
    const hits = myConversations().flatMap((convo) =>
      convo.messages.filter((m) => m.text.includes(query)).map((m) => ({ convo, message: m })),
    );
    if (!hits.length) {
      host.append(empty({ glyph: 'search', title: 'نتیجه‌ای نیست', text: 'عبارت و فیلترها را تغییر دهید؛ نتیجه حدس زده نمی‌شود.' }));
      return;
    }
    for (const hit of hits) {
      host.append(
        listItem({
          href: `/msg/${hit.convo.id}`,
          leading: h('div', { class: 'avatar sm sq' }, icon('chat', 'icon sm')),
          title: hit.convo.title,
          subtitle: hit.message.text,
          meta: formatDate(hit.message.at, { short: true }),
        }),
      );
    }
  };

  search.input.addEventListener('input', paint);
  page.append(search.wrap, host);
  page.append(banner('حذف دسترسی بعد از جست‌وجو، باز کردن نتیجه ذخیره‌شده را دوباره کنترل می‌کند.', { glyph: 'shield' }));
  paint();
  return page;
};

export const chatMediaPage: PageRenderer = (ctx: RouteContext) => {
  const convo = conversation(ctx.params.id);
  if (!convo) return missing('گفتگو پیدا نشد');
  if (!canReadConversation(convo.id)) return denied('عضو این گفتگو نیستید.');

  const page = h('div', { class: 'page' });
  page.append(pageHead('رسانه‌های گفتگو', convo.title, `/msg/${convo.id}`));

  const media = convo.messages.filter((m) => m.attachment);
  const grid = h('div', { class: 'grid-2' });
  for (const message of media) {
    grid.append(
      card(
        {},
        h('div', { class: 'row between' }, h('strong', { class: 'small truncate', text: message.attachment!.name }), chip(message.attachment!.kind.toUpperCase(), { glyph: 'file' })),
        h('p', { class: 'tiny muted', text: `${message.attachment!.sizeKb} کیلوبایت · ${formatDate(message.at, { short: true })} · ${nameOf(message.authorId)}` }),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn soft sm', type: 'button', text: 'پیش‌نمایش' }), h('button', { class: 'btn ghost sm', type: 'button', text: 'دانلود' })),
      ),
    );
  }
  page.append(media.length ? grid : empty({ glyph: 'image', title: 'رسانه‌ای در این گفتگو نیست' }));
  page.append(banner('ارسال فایل به گفتگوی عمومی، سطح دسترسی فایل را خودکار عمومی نمی‌کند.', { glyph: 'shield' }));
  return page;
};

/* ------------------------------------------------------------------ MSG-09 */

export const safetyPage: PageRenderer = () => {
  const page = h('div', { class: 'page' });
  page.append(pageHead('ایمنی', 'مسدودسازی و گزارش سوءاستفاده'));

  const reason = field({ label: 'دلیل', placeholder: 'مثلاً مزاحمت تکراری' });
  const selected = h('textarea', { class: 'textarea', rows: 3, placeholder: 'فقط پیام‌های انتخاب‌شده و زمینه لازم بررسی می‌شود.', 'aria-label': 'پیام‌های انتخاب‌شده' }) as HTMLTextAreaElement;

  const submit = h('button', { class: 'btn danger block', type: 'button', text: 'ثبت گزارش' });
  submit.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'ثبت گزارش',
      message: 'فقط محتوای انتخاب‌شده و زمینه حداقلی به بررسی‌کننده می‌رسد، نه کل تاریخچه حساب.',
      confirmLabel: 'ثبت',
    });
    if (ok) toast('گزارش ثبت شد و کد پیگیری گرفتید', 'ok');
  });

  const block = h('button', { class: 'btn block', type: 'button', text: 'مسدودکردن کاربر' });
  block.addEventListener('click', () => toast('مسدودسازی حضور و ثبت‌نام آموزشی را حذف نمی‌کند', 'info'));

  page.append(
    card({}, h('h3', { text: 'گزارش محتوا' }), reason.wrap, h('label', { class: 'label', text: 'محتوای گزارش' }), selected, submit),
  );
  page.append(card({}, h('h3', { text: 'مسدودسازی' }), h('p', { class: 'small muted', text: 'مسدودکردن، راه ارتباط را می‌بندد اما عضویت آموزشی و اعلان رسمی ادامه دارد.' }), block));
  page.append(h('a', { class: 'btn ghost block', href: '/profile/privacy', text: 'تنظیمات حریم خصوصی' }));
  void openSheet;
  return page;
};