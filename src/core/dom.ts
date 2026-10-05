/** Minimal typed hyperscript. No framework, no diffing — direct, fast DOM ops. */

type Child = Node | string | number | false | null | undefined | Child[];

/**
 * `append` is used across the UI with conditional children (`cond && node`,
 * nullable lookups). Widening the accepted child type keeps call sites free of
 * `if (x)` noise; null/false/undefined are filtered out at runtime.
 */
declare global {
  interface Node {
    append(...nodes: Child[]): void;
    replaceChildren(...nodes: Child[]): void;
  }
}

type Props = {
  class?: string | (string | false | null | undefined)[];
  text?: string | number;
  html?: string;
  style?: Partial<CSSStyleDeclaration> | string;
  dataset?: Record<string, string>;
  on?: Record<string, EventListenerOrEventListenerObject>;
} & Record<string, unknown>;

const PROP_KEYS = new Set(['value', 'checked', 'disabled', 'selected', 'indeterminate', 'open']);

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) applyProps(el, props);
  append(el, children);
  return el;
}

export function applyProps(el: HTMLElement, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      const cls = Array.isArray(value)
        ? value.filter(Boolean).join(' ')
        : String(value);
      if (cls) el.className = cls;
    } else if (key === 'text') {
      el.textContent = String(value);
    } else if (key === 'html') {
      el.innerHTML = String(value);
    } else if (key === 'style') {
      if (typeof value === 'string') el.setAttribute('style', value);
      else Object.assign(el.style, value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value as Record<string, string>);
    } else if (key === 'on') {
      for (const [evt, fn] of Object.entries(value as Record<string, EventListener>)) {
        el.addEventListener(evt, fn);
      }
    } else if (PROP_KEYS.has(key)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.append(child);
    else parent.append(document.createTextNode(String(child)));
  }
}

export function frag(...children: Child[]): DocumentFragment {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function qs<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(sel);
}

export function qsa<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

/** Event delegation bound once at the document level. */
export function delegate(
  type: string,
  selector: string,
  handler: (target: HTMLElement, event: Event) => void,
): void {
  document.addEventListener(
    type,
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const match = target.closest<HTMLElement>(selector);
      if (match) handler(match, event);
    },
    { passive: type === 'click' },
  );
}

export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}