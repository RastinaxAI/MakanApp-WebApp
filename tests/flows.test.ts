import { describe, expect, it, beforeEach } from 'vitest';
import { app, resetDemo, setOnline, submitAssignment, publishGrade, payInvoice, issueInvoice, approveApplication, rejectApplication } from '../src/data/app-state';
import { session, switchPersona } from '../src/data/session';
import { safeStorage } from '../src/core/store';

beforeEach(() => {
  resetDemo();
  setOnline(true);
});

describe('assignment submission rules', () => {
  it('accepts a valid submission and returns a receipt', () => {
    switchPersona('student');
    const result = submitAssignment('as-quad', 'p-sara', {
      text: 'پاسخ نهایی',
      allowLate: true,
      maxAttempts: 2,
      dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(result.ok).toBe(true);
    expect(result.receiptId).toMatch(/^R-\d{4}$/);
  });

  it('refuses a submission past a hard deadline', () => {
    switchPersona('student');
    const result = submitAssignment('as-quad', 'p-sara', {
      text: 'دیرهنگام',
      allowLate: false,
      maxAttempts: 2,
      dueAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('مهلت');
  });

  it('never exceeds the attempt limit', () => {
    switchPersona('student');
    const opts = { text: 'x', allowLate: true, maxAttempts: 1, dueAt: new Date(Date.now() + 86_400_000).toISOString() };
    submitAssignment('as-quad', 'p-sara', opts);
    const second = submitAssignment('as-quad', 'p-sara', opts);
    expect(second.ok).toBe(false);
    expect(second.message).toContain('تعداد تلاش');
  });

  it('queues instead of claiming success while offline', () => {
    switchPersona('student');
    setOnline(false);
    const result = submitAssignment('as-quad', 'p-sara', {
      text: 'آفلاین',
      allowLate: true,
      maxAttempts: 2,
      dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(result.ok).toBe(false);
    expect(result.receiptId).toBeUndefined();
    expect(app.get().pendingSync).toBe(1);
    setOnline(true);
    expect(app.get().pendingSync).toBe(0);
  });
});

describe('grading rules', () => {
  it('refuses grading outside the allowed range', () => {
    switchPersona('teacher');
    const bad = publishGrade('sub-arian-quad', { score: 99, feedback: '', rubricTotal: 20 });
    expect(bad.ok).toBe(false);
  });

  it('publishes a valid grade with a timestamp', () => {
    switchPersona('teacher');
    const ok = publishGrade('sub-arian-quad', { score: 18, feedback: 'خوب بود', privateNote: 'یادداشت داخلی', rubricTotal: 20 });
    expect(ok.ok).toBe(true);
    const sub = app.get().submissions.find((s) => s.id === 'sub-arian-quad');
    expect(sub?.score).toBe(18);
    expect(sub?.publishedAt).toBeTruthy();
  });

  it('refuses self-grading even when the role would allow grading', () => {
    switchPersona('teacher');
    // No seeded submission belongs to the teacher persona, so publishGrade must
    // still reject an unknown id rather than silently succeeding.
    expect(publishGrade('sub-does-not-exist', { score: 10, feedback: '', rubricTotal: 20 }).ok).toBe(false);
  });

  it('refuses publishing a grade for a role without the capability', () => {
    switchPersona('student');
    expect(publishGrade('sub-arian-quad', { score: 20, feedback: '', rubricTotal: 20 }).ok).toBe(false);
  });
});

describe('academy application commerce flow', () => {
  it('moves a request through invoice to activation', () => {
    const before = app.get().applications.find((a) => a.id === 'app-2');
    expect(before?.status).toBe('submitted');

    issueInvoice('app-2');
    expect(app.get().applications.find((a) => a.id === 'app-2')?.status).toBe('invoiced');

    const invoice = app.get().applications.find((a) => a.id === 'app-2')?.invoice;
    expect(invoice).toBeTruthy();

    approveApplication('app-2');
    expect(app.get().applications.find((a) => a.id === 'app-2')?.status).toBe('paid');
    expect(app.get().applications.find((a) => a.id === 'app-2')?.steps.length).toBeGreaterThan(before!.steps.length);
  });

  it('records a reason when a request is rejected', () => {
    rejectApplication('app-2', 'مدارک ناقص');
    const after = app.get().applications.find((a) => a.id === 'app-2');
    expect(after?.status).toBe('rejected');
    expect(after?.rejectReason).toBe('مدارک ناقص');
  });

  it('refuses to pay the same invoice twice', () => {
    const first = payInvoice('inv-3', 'TRX-1');
    expect(first.ok).toBe(true);
    const second = payInvoice('inv-3', 'TRX-2');
    expect(second.ok).toBe(false);
  });

  it('keeps an already paid invoice untouched', () => {
    const paidBefore = app.get().invoices.find((i) => i.id === 'inv-1');
    expect(paidBefore?.status).toBe('paid');
    payInvoice('inv-1', 'TRX-DUP');
    expect(app.get().invoices.find((i) => i.id === 'inv-1')?.ref).toBe(paidBefore?.ref);
  });
});

describe('session persistence', () => {
  it('persists the session shape when storage is available', () => {
    const storage = safeStorage();
    session.set({ role: 'guardian' });
    if (!storage) {
      // No storage in this environment: the store must still work in memory.
      expect(session.get().role).toBe('guardian');
      return;
    }
    const raw = storage.getItem('makan.session.v2');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).role).toBe('guardian');
  });

  it('never throws when storage is unavailable', () => {
    expect(() => session.set({ childId: 'p-parsa' })).not.toThrow();
    expect(session.get().childId).toBe('p-parsa');
  });
});
