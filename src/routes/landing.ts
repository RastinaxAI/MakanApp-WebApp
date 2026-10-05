import { h } from '../core/dom';
import { icon } from '../core/icons';
import { session } from '../data/session';
import type { PageRenderer } from '../core/router';

/** Splash / bootstrap decision point (C-01). */
const render: PageRenderer = () => {
  const el = h('div', { class: 'page' });
  const card = h(
    'div',
    { class: 'card', style: { padding: '28px', justifyItems: 'center', textAlign: 'center', gap: '14px' } },
    h('div', { class: 'brand-mark', style: { width: '52px', height: '52px', borderRadius: '17px' } }),
    h('h1', { style: { fontSize: '1.3rem' }, text: 'ماکان' }),
    h('p', { class: 'small muted', text: 'در حال بررسی نشست…' }),
    h('div', { class: 'skel', style: { width: '160px', height: '8px' } }),
  );
  el.append(card);

  const signedIn = session.get().signedIn;
  const target = signedIn ? '/school' : '/login';
  setTimeout(() => {
    location.replace(target);
  }, 420);

  card.addEventListener('click', () => location.replace(target));
  el.append(
    h(
      'button',
      { class: 'btn ghost sm', type: 'button', on: { click: () => location.replace(target) } },
      icon('refresh', 'icon sm'),
      h('span', { text: 'ادامه' }),
    ),
  );
  return el;
};

export { render };