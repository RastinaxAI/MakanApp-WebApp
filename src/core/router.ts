/**
 * Tiny history router. Every page is its own lazily-loaded module, so the
 * first paint only ships the shell plus the landing route.
 */

import { clear, qs } from './dom';

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  /** Same-tab navigation marker: used to skip enter animations on back/forward. */
  restored: boolean;
}

export type PageRenderer = (ctx: RouteContext) => Node | Promise<Node>;

export interface RouteDef {
  pattern: string;
  load: () => Promise<{ render: PageRenderer }>;
  /** Tab grouping for the primary navigation. */
  tab?: 'school' | 'msg' | 'ai' | 'profile' | 'auth';
  title?: string;
}

interface Compiled extends RouteDef {
  regex: RegExp;
  keys: string[];
}

export class Router {
  private routes: Compiled[] = [];
  private listeners = new Set<(ctx: RouteContext) => void>();
  private currentCtx: RouteContext | null = null;
  private scrollMemory = new Map<string, number>();
  private inflight: Promise<{ render: PageRenderer }> | null = null;
  private lastPattern = '';

  add(pattern: string, load: RouteDef['load'], opts: Pick<RouteDef, 'tab' | 'title'> = {}): this {
    const keys: string[] = [];
    const source = pattern
      .split('/')
      .map((part) => {
        if (!part.startsWith(':')) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        keys.push(part.slice(1));
        return '([^/]+)';
      })
      .join('/');
    this.routes.push({ pattern, regex: new RegExp(`^${source}/?$`), keys, load, ...opts });
    return this;
  }

  match(path: string): { def: Compiled; params: Record<string, string> } | null {
    for (const def of this.routes) {
      const m = def.regex.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      def.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(m[i + 1] ?? '');
      });
      return { def, params };
    }
    return null;
  }

  get current(): RouteContext | null {
    return this.currentCtx;
  }

  get pattern(): string {
    return this.currentCtx ? (this.match(this.currentCtx.path)?.def.pattern ?? '') : '';
  }

  onChange(fn: (ctx: RouteContext) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Prefetch a route chunk (used on link hover / touch intent). */
  prefetch(pattern: string): void {
    for (const def of this.routes) {
      if (def.pattern === pattern) {
        void def.load();
        return;
      }
    }
  }

  prefetchFor(path: string): void {
    const hit = this.match(path);
    if (hit) void hit.def.load();
  }

  start(outlet: HTMLElement, initial?: string): void {
    const go = (path: string, replace: boolean, restored: boolean) => {
      const hit = this.match(path);
      if (!hit) {
        // Unknown path → soft 404 inside the current shell.
        this.renderNotFound(outlet, path, restored);
        return;
      }
      this.render(outlet, {
        path,
        params: hit.params,
        query: new URLSearchParams(location.search),
        restored,
      });
    };

    window.addEventListener('popstate', () => {
      const path = location.pathname;
      if (this.currentCtx) this.scrollMemory.set(this.currentCtx.path, window.scrollY);
      go(path, true, true);
    });

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>('a[href^="/"]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      event.preventDefault();
      this.navigate(anchor.getAttribute('href') ?? '/');
    });

    // Intent prefetching: warm the chunk before the tap lands.
    const warm = (path: string | null) => {
      if (!path || !path.startsWith('/')) return;
      this.prefetchFor(path);
    };
    document.addEventListener('pointerover', (e) => {
      const el = (e.target as Element | null)?.closest?.('a[href^="/"]');
      warm(el?.getAttribute('href') ?? null);
    });
    document.addEventListener(
      'touchstart',
      (e) => {
        const el = (e.target as Element | null)?.closest?.('a[href^="/"]');
        warm(el?.getAttribute('href') ?? null);
      },
      { passive: true },
    );

    go(initial ?? location.pathname, true, false);
  }

  navigate(to: string, opts: { replace?: boolean } = {}): void {
    if (this.currentCtx) this.scrollMemory.set(this.currentCtx.path, window.scrollY);
    const url = new URL(to, location.origin);
    if (opts.replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    this.lastPattern = this.pattern;
    const outlet = qs<HTMLElement>('#view') ?? document.body;
    if (!this.match(url.pathname)) {
      this.renderNotFound(outlet, url.pathname, false);
      return;
    }
    this.render(outlet, {
      path: url.pathname,
      params: {},
      query: url.searchParams,
      restored: false,
    });
  }

  private renderNotFound(outlet: HTMLElement, path: string, restored: boolean): void {
    const ctx: RouteContext = { path, params: {}, query: new URLSearchParams(location.search), restored };
    this.currentCtx = ctx;
    for (const fn of [...this.listeners]) fn(ctx);
    const host = qs<HTMLElement>('#view') ?? outlet;
    clear(host);
    host.append(this.notFound(path));
    window.scrollTo(0, 0);
  }

  private async render(outlet: HTMLElement, ctx: RouteContext): Promise<void> {
    const hit = this.match(ctx.path);
    this.currentCtx = hit ? { ...ctx, params: hit.params } : ctx;
    for (const fn of [...this.listeners]) fn(this.currentCtx);
    if (!hit) return;

    const paint = async () => {
      const mod = this.inflight && this.lastPattern === hit.def.pattern ? this.inflight : hit.def.load();
      this.inflight = mod;
      this.lastPattern = hit.def.pattern;
      const { render } = await mod;
      const node = await render(this.currentCtx as RouteContext);
      const host = qs<HTMLElement>('#view') ?? outlet;
      const swap = () => {
        clear(host);
        host.append(node);
        const remembered = this.scrollMemory.get(ctx.path);
        if (ctx.restored && remembered !== undefined) window.scrollTo(0, remembered);
        else window.scrollTo(0, 0);
      };
      const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
      if (doc.startViewTransition && !ctx.restored && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        doc.startViewTransition(swap);
      } else {
        swap();
      }
    };

    if (this.pendingPaint) this.pendingPaint = this.pendingPaint.then(paint, paint);
    else this.pendingPaint = paint();
  }

  /** Renderer for unknown paths; overridable so the app can style its own 404. */
  notFound(_path: string): Node {
    const wrap = document.createElement('div');
    wrap.className = 'page';
    wrap.textContent = 'صفحه پیدا نشد';
    return wrap;
  }

  private pendingPaint: Promise<void> | null = null;
}

/** Anchor helper: renders a real link so middle-click and copy-link work. */
export function href(path: string): string {
  return path;
}

/**
 * SPA navigation for code that has no anchor to click ("create it, then open
 * it"). Pushes history and lets the popstate listener repaint, so the in-memory
 * stores survive — a full page load would drop everything just written.
 */
export function go(path: string): void {
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}