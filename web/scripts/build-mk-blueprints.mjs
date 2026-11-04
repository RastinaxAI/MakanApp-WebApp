// Convert the supplied design to native React blueprints, not embedded HTML/images.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import postcss from 'postcss';
import prettier from 'prettier';
process.chdir(path.resolve(fileURLToPath(new URL('..', import.meta.url))));
const { directory: source } = JSON.parse(await fs.readFile('design/reference.json', 'utf8'));
const formatOptions = await prettier.resolveConfig(`${source}/blueprints.source.json`);
const manifest = JSON.parse(await fs.readFile(`${source}/screens.json`, 'utf8'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
try {
  await page.setContent(await fs.readFile(`${source}/MakanApp_Visual_Reference.html`, 'utf8'));
  const data = await page.evaluate((manifest) => {
    const controlSelector =
      '.edu-q-item,.edu-editor-option,.question-nos>span,.btn,.ibtn,.seg>span,.desk-tabs>span,.chip,.q-row,.link-card,.text-action,.toggle,.input,.checkbox,.check-circle,.radio,.search,.chat-row,.action-row,.quiz-option,.compose-input,.upload,.date-cell,.navitem,.source-chip,.file .grow,.send,.bubble,.otp';
    return manifest.screens.map((spec) => {
      const parent =
        spec.kind === 'desktop'
          ? document.querySelector('#page-' + spec.page + ' .desktop')
          : [...document.querySelectorAll('.phone-wrap')]
              .find((e) => e.querySelector('.cid')?.textContent.trim() === spec.id)
              ?.querySelector('.screen');
      if (!parent) throw Error('Missing reference ' + spec.id);
      const root = parent.cloneNode(true);
      root.querySelectorAll('.status,.home-safe,.browserbar').forEach((e) => e.remove());
      let sequence = 0;
      const controls = [];
      function node(element) {
        if (element.nodeType === Node.TEXT_NODE) return element.textContent;
        if (element.nodeType !== Node.ELEMENT_NODE) return null;
        const key = String(sequence++),
          classes = element.getAttribute('class') || '';
        const attrs = Object.fromEntries(
          [...element.attributes]
            .filter(
              (a) => !['style', 'class', 'xmlns'].includes(a.name) && !a.name.startsWith('on'),
            )
            .map((a) => [a.name, a.value]),
        );
        if (element.tagName === 'TD')
          attrs['data-label'] =
            element
              .closest('table')
              ?.querySelectorAll('thead th')
              [element.cellIndex]?.textContent.trim() || 'گزینه‌ها';
        if (classes)
          attrs.className = classes
            .split(/\s+/)
            .map((c) => (c === 'screen' ? 'mk-screen' : c === 'desktop' ? 'mk-desktop' : c))
            .join(' ');
        const style = Object.fromEntries(
          [...element.style].map((k) => [
            k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
            k === 'font-size'
              ? element.style
                  .getPropertyValue(k)
                  .replace(/([\d.]+)px/g, (_, n) => Number(n) / 16 + 'rem')
              : element.style.getPropertyValue(k),
          ]),
        );
        let control;
        const row = element.matches('.row') && !element.querySelector(controlSelector);
        const navigation = element.matches('.tabbar .tab');
        if (element.matches(controlSelector) || row || navigation) {
          let kind = element.matches('.question-nos>span')
            ? 'questionNumber'
            : element.matches('.input') &&
                element.closest('.field')?.querySelector('label')?.textContent.trim() ===
                  'اعتبار دعوت'
              ? 'calendar'
              : element.matches('.otp')
                ? 'otp'
                : element.matches('.input')
                  ? 'field'
                  : element.matches('.check-circle')
                    ? 'checkCircle'
                    : element.matches('.search')
                      ? element.textContent.includes('سؤالتان')
                        ? 'assistantCompose'
                        : 'search'
                      : element.matches('.compose-input')
                        ? 'compose'
                        : element.matches('.toggle')
                          ? 'toggle'
                          : element.matches('.checkbox')
                            ? 'check'
                            : element.matches('.radio')
                              ? 'radio'
                              : navigation
                                ? 'navigation'
                                : element.matches('.upload')
                                  ? 'upload'
                                  : element.matches('.bubble')
                                    ? 'message'
                                    : element.matches('.quiz-option,.edu-editor-option')
                                      ? 'quizOption'
                                      : 'action';
          const svg = element.querySelector('svg');
          const label =
            element.closest('.field')?.querySelector('label')?.textContent.trim() ||
            element.textContent.trim() ||
            (['radio', 'check', 'checkCircle', 'toggle'].includes(kind)
              ? element.parentElement.textContent.trim()
              : element.matches('.send')
                ? 'ارسال پیام'
                : svg?.innerHTML.includes('m9 18 6-6-6-6')
                  ? 'بازگشت'
                  : svg?.querySelectorAll('circle').length === 3
                    ? 'گزینه‌های بیشتر'
                    : 'اقدام صفحه');
          control = {
            key,
            kind,
            label,
            initial: element.textContent.trim(),
            classes,
            checked: element.matches('.on,.checked,.selected'),
            disabled: element.classList.contains('disabled'),
            multiline: element.classList.contains('textarea'),
            select: kind === 'field' && !!svg?.querySelector('path[d="m6 9 6 6 6-6"]'),
            icon: kind === 'field' && !!svg,
            placeholder: kind === 'field' && !!element.querySelector(':scope>.muted'),
          };
          controls.push(control);
        }
        const result = {
          tag: element.tagName.toLowerCase(),
          key,
          attrs,
          style,
          ...(control ? { control } : {}),
          children: [...element.childNodes].map(node).filter((x) => x !== null),
        };
        if (element.matches('.composer>svg,.file>svg,.between.small.muted>.flex>svg')) {
          const index = [...element.parentElement.children].indexOf(element);
          const label = element.parentElement.classList.contains('composer')
            ? 'افزودن پیوست'
            : element.parentElement.classList.contains('file')
              ? ['MK-45', 'MK-64'].includes(spec.id)
                ? 'دریافت پیوست'
                : 'حذف پیوست'
              : (['کپی پاسخ', 'پاسخ مفید بود', 'پاسخ مفید نبود'][index] ?? 'گزینهٔ پاسخ');
          const button = {
            key,
            kind: 'action',
            label,
            initial: '',
            classes: 'mk-inline-icon',
            checked: false,
            disabled: false,
            multiline: false,
            select: false,
          };
          controls.push(button);
          return {
            tag: 'button',
            key,
            attrs: { className: 'mk-inline-icon' },
            style: {},
            control: button,
            children: [{ ...result, key: key + '-graphic' }],
          };
        }
        if (element.matches('td.more')) {
          const button = {
            key: key + '-menu',
            kind: 'action',
            label:
              'گزینه‌های ' + element.parentElement.querySelector('.person')?.textContent.trim(),
            initial: '',
            classes: 'mk-inline-icon',
            checked: false,
            disabled: false,
            multiline: false,
            select: false,
          };
          controls.push(button);
          return {
            ...result,
            children: [
              {
                tag: 'button',
                key: button.key,
                attrs: { className: 'mk-inline-icon' },
                style: {},
                control: button,
                children: result.children,
              },
            ],
          };
        }
        return result;
      }
      const tree = node(root);
      return { ...spec, tree, controls };
    });
  }, manifest);
  await fs.mkdir('src/features/reference', { recursive: true });
  await fs.writeFile(
    `${source}/blueprints.source.json`,
    await prettier.format(JSON.stringify(data), { ...formatOptions, parser: 'json' }),
  );
  const allClasses = new Set();
  const rootClasses = new Set(data.flatMap((s) => (s.tree.attrs.className ?? '').split(/\s+/)));
  const visit = (node) => {
    if (typeof node === 'string') return;
    node.attrs?.className?.split(/\s+/).forEach((c) => allClasses.add(c));
    node.children?.forEach(visit);
  };
  data.forEach((s) => visit(s.tree));
  const css = postcss.parse(
    (await fs.readFile(`${source}/ui.css`, 'utf8')) +
      '\n' +
      (await fs.readFile(`${source}/education.css`, 'utf8')) +
      '\n' +
      (await fs.readFile(`${source}/blue-theme.css`, 'utf8')),
  );
  const result = postcss.root();
  const chrome =
    /\.(sheet(?![\w-])|status|home-safe|phone-wrap|phone-caption|device|cover|toc-|board|swatch|type-|token-|page-|visuals|stage|aside(?:\W|$)|rule|mini-tag|lede|wide-caption|responsive-frame|browserbar)/;
  css.walkRules((rule) => {
    if (rule.parent.type !== 'root') return;
    const selectors = rule.selector.split(',').map((x) => x.trim());
    const valid = selectors.filter(
      (s) =>
        !chrome.test(s) &&
        !/^(html|body)(\W|$)/.test(s) &&
        !s.includes('@') &&
        ((s.match(/\.([\w-]+)/g) || []).some(
          (c) => allClasses.has(c.slice(1)) || ['screen', 'desktop'].includes(c.slice(1)),
        ) ||
          /^(svg|b|strong|button|input|a)$/.test(s)),
    );
    if (!valid.length) return;
    const clone = rule.clone();
    clone.walkDecls('font-size', (decl) => {
      decl.value = decl.value.replace(/([\d.]+)px/g, (_, n) => Number(n) / 16 + 'rem');
    });
    clone.selector = valid
      .map((s) =>
        s.replace(/\.screen(?![\w-])/g, '.mk-screen').replace(/\.desktop(?![\w-])/g, '.mk-desktop'),
      )
      .map((s) => (rootClasses.has(s.match(/^\.([\w-]+)/)?.[1]) ? '.mk-ui' + s : '.mk-ui ' + s))
      .join(',');
    result.append(clone);
  });
  await fs.writeFile(
    'src/features/reference/blueprints.css',
    await prettier.format(
      '/* Derived from the user reference. Presentation chrome excluded. */\n' +
        result.toString() +
        '\n',
      { ...formatOptions, parser: 'css' },
    ),
  );
  await fs.writeFile(
    'tmp/mk-reference/controls.json',
    JSON.stringify(
      data.map((s) => ({ id: s.id, controls: s.controls })),
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      screens: data.length,
      controls: data.reduce((n, s) => n + s.controls.length, 0),
      styleRules: result.nodes.length,
    }),
  );
} finally {
  await browser.close();
}
