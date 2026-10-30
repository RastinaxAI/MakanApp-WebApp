import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
type Page = components['schemas']['AccountChangePageResult'];
/** Opaque cursor belongs to this instance only. Never persisted/shared across sessions. */
export class AccountReplay {
  private cursor: string | undefined;
  private boundary: string | undefined;
  private seen = new Set<string>();
  private running = false;
  private stopped = false;
  constructor(
    private read: (path: string) => Promise<Page>,
    private invalidate: () => Promise<unknown> | void,
    private scope?: 'Personal',
  ) {}
  stop() {
    this.stopped = true;
    this.cursor = undefined;
    this.seen.clear();
  }
  async catchUp(): Promise<number> {
    if (this.running || this.stopped) return 5000;
    this.running = true;
    let dirty = false;
    try {
      for (let page = 0; page < 20 && !this.stopped; page++) {
        let next: Page;
        try {
          next = await this.read(
            '/api/v1/realtime/changes?' +
              new URLSearchParams({
                limit: '100',
                ...(this.scope ? { scope: this.scope } : {}),
                ...(this.cursor ? { cursor: this.cursor } : {}),
              }),
          );
        } catch (error) {
          if (this.stopped) return 5000;
          if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
            this.stop();
            await this.invalidate();
            return 60000;
          }
          if (
            error instanceof ApiError &&
            error.status === 409 &&
            error.problem.code === 'REALTIME_RESYNC_REQUIRED'
          ) {
            this.cursor = undefined;
            this.boundary = undefined;
            this.seen.clear();
            await this.invalidate();
            return 1000;
          }
          // In particular 503 preserves the cursor, including retry-after guidance.
          // Earlier pages may already have advanced the cursor. Their hints must
          // still refresh snapshots if a later replay page is temporarily down.
          if (dirty) await this.invalidate();
          return error instanceof ApiError && error.problem.retryAfter
            ? Math.max(1000, Math.min(error.problem.retryAfter * 1000, 60000))
            : 5000;
        }
        if (this.stopped) return 5000;
        const boundary = JSON.stringify([next.epoch, next.contextRevision]);
        if (this.cursor && this.boundary !== boundary) {
          this.cursor = undefined;
          this.boundary = undefined;
          this.seen.clear();
          await this.invalidate();
          return 1000;
        }
        const initial = this.cursor === undefined;
        this.boundary = boundary;
        for (const event of next.changes) {
          if (this.seen.has(event.eventId)) continue;
          this.seen.add(event.eventId);
          dirty = true;
          if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value!);
        }
        this.cursor = next.nextCursor;
        // Establish boundary first, then refresh snapshots to close startup races.
        if (initial) dirty = true;
        if (!next.hasMore) {
          if (dirty) await this.invalidate();
          return Math.max(1000, Math.min(next.retryAfterMilliseconds ?? 5000, 60000));
        }
      }
      if (dirty && !this.stopped) await this.invalidate();
      return 1000;
    } finally {
      this.running = false;
    }
  }
}
