/**
 * Mutable runtime state. Seed data is copied in once; every write here stands
 * in for what the server would do (and validates the same rules).
 */

import { createStore } from '../core/store';
import {
  applications as seedApplications,
  conversations as seedConversations,
  examAttempts as seedExamAttempts,
  invoices as seedInvoices,
  notifications as seedNotifications,
  notebooks as seedNotebooks,
  submissions as seedSubmissions,
} from './seed';
import type {
  AppNotification,
  ApplicationRequest,
  AttendanceStatus,
  Conversation,
  ExamAttemptRecord,
  Invoice,
  Notebook,
  PersonalSource,
  Submission,
} from './types';
import { session, can, currentRole } from './session';

export interface AppState {
  submissions: Submission[];
  conversations: Conversation[];
  examAttempts: ExamAttemptRecord[];
  notifications: AppNotification[];
  invoices: Invoice[];
  applications: ApplicationRequest[];
  notebooks: Notebook[];
  attendance: Record<string, Record<string, AttendanceStatus>>;
  /** Assignment drafts typed locally, waiting for a receipt. */
  drafts: Record<string, { text: string; fileName?: string; at: string }>;
  /** Profile photos the user picked, keyed by person id (data URL, thumbnail).
      Group/channel pictures share this map, keyed by the conversation id. */
  photos: Record<string, string>;
  /** Assistant sources the signed-in person added for themselves, keyed by
      person id. Personal by design: never attached to a class or a school. */
  personalSources: Record<string, PersonalSource[]>;
  online: boolean;
  pendingSync: number;
}

const cloned = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const app = createStore<AppState>({
  submissions: cloned(seedSubmissions),
  conversations: cloned(seedConversations),
  examAttempts: cloned(seedExamAttempts),
  notifications: cloned(seedNotifications),
  invoices: cloned(seedInvoices),
  applications: cloned(seedApplications),
  notebooks: cloned(seedNotebooks),
  attendance: {},
  drafts: {},
  photos: {},
  personalSources: {},
  online: navigator.onLine,
  pendingSync: 0,
});

/**
 * A profile photo, kept as a small thumbnail. Uploads are re-encoded before
 * they land here: a phone camera hands over 4–8 MB, and the shell only ever
 * paints a 26–64px circle.
 */
export function photoFor(personId: string): string | null {
  return app.get().photos[personId] ?? null;
}

export function setPersonPhoto(personId: string, dataUrl: string | null): void {
  app.set((s) => {
    const photos = { ...s.photos };
    if (dataUrl) photos[personId] = dataUrl;
    else delete photos[personId];
    return { photos };
  });
}

/** A group/channel picture lives in the same map, keyed by the convo id. */
export function setSpacePhoto(conversationId: string, dataUrl: string | null): void {
  setPersonPhoto(conversationId, dataUrl);
}

export function setOnline(next: boolean): void {
  app.set({ online: next });
  if (next) {
    // Anything queued while offline is flushed; the UI reflects the new state.
    app.set((s) => ({ pendingSync: 0 }));
  }
}

export function setAttendance(sessionId: string, records: Record<string, AttendanceStatus>): void {
  app.set((s) => ({ attendance: { ...s.attendance, [sessionId]: records } }));
}

export function attendanceFor(
  sessionId: string,
  fallback: Record<string, AttendanceStatus>,
): Record<string, AttendanceStatus> {
  return app.get().attendance[sessionId] ?? fallback;
}

export function saveDraft(assignmentId: string, text: string, fileName?: string): void {
  app.set((s) => ({
    drafts: { ...s.drafts, [assignmentId]: { text, fileName, at: new Date().toISOString() } },
  }));
}

/**
 * Submit an assignment. Enforces: capability, deadline/late rules, and attempt
 * limit. Returns a receipt only when the "server" accepts it — offline creates
 * a queued attempt that never claims success.
 */
export function submitAssignment(
  assignmentId: string,
  studentId: string,
  opts: { text: string; fileName?: string; allowLate: boolean; maxAttempts: number; dueAt: string },
): { ok: boolean; message: string; receiptId?: string } {
  const state = app.get();
  let sub = state.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
  if (!sub) {
    sub = { id: `sub-${assignmentId}-${studentId}`, assignmentId, studentId, attempts: [], status: 'not-started' };
    app.set((s) => ({ submissions: [...s.submissions, sub!] }));
    sub = app.get().submissions.find((s) => s.id === sub!.id)!;
  }
  if (sub.attempts.length >= opts.maxAttempts) {
    return { ok: false, message: 'سقف تعداد تلاش این تکلیف پر شده است.' };
  }
  const now = Date.now();
  const due = new Date(opts.dueAt).getTime();
  const late = now > due;
  if (late && !opts.allowLate) {
    return { ok: false, message: 'مهلت این تکلیف تمام شده و تحویل دیرهنگام مجاز نیست.' };
  }
  const number = sub.attempts.length + 1;
  if (!state.online) {
    sub = {
      ...sub,
      status: 'draft',
      attempts: [...sub.attempts, { number, text: opts.text, fileName: opts.fileName, createdAt: new Date().toISOString(), state: 'queued' }],
    };
    replaceSubmission(sub);
    app.set((s) => ({ pendingSync: s.pendingSync + 1, drafts: omit(s.drafts, assignmentId) }));
    return { ok: false, message: 'پاسخ روی این دستگاه ذخیره شد؛ در انتظار دریافت رسید از سرور.' };
  }
  const receiptId = `R-${Math.floor(1000 + Math.random() * 8999)}`;
  sub = {
    ...sub,
    status: 'submitted',
    attempts: [
      ...sub.attempts,
      {
        number,
        text: opts.text,
        fileName: opts.fileName,
        createdAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        receiptId,
        state: late ? 'late' : 'received',
      },
    ],
  };
  replaceSubmission(sub);
  app.set((s) => ({ drafts: omit(s.drafts, assignmentId) }));
  return { ok: true, message: 'پاسخ ثبت شد.', receiptId };
}

function replaceSubmission(next: Submission): void {
  app.set((s) => ({ submissions: s.submissions.map((x) => (x.id === next.id ? next : x)) }));
}

function omit<T extends object>(obj: T, key: string): T {
  const copy = { ...obj } as Record<string, unknown>;
  delete copy[key];
  return copy as T;
}

/** Publish a grade. Refuses self-grading and unpublished private notes. */
export function publishGrade(
  submissionId: string,
  opts: { score: number; feedback: string; privateNote?: string; rubricTotal: number },
): { ok: boolean; message: string } {
  const sub = app.get().submissions.find((s) => s.id === submissionId);
  if (!sub) return { ok: false, message: 'پاسخ پیدا نشد.' };
  if (!can('publishGrade')) return { ok: false, message: 'نقش شما اجازه انتشار نتیجه را ندارد.' };
  if (sub.studentId === session.get().personaId) return { ok: false, message: 'تصحیح پاسخ خود مجاز نیست.' };
  if (opts.score < 0 || opts.score > opts.rubricTotal) {
    return { ok: false, message: `نمره باید بین ۰ و ${opts.rubricTotal} باشد.` };
  }
  replaceSubmission({
    ...sub,
    status: 'graded',
    score: opts.score,
    feedback: opts.feedback,
    privateNote: opts.privateNote,
    publishedAt: new Date().toISOString(),
  });
  return { ok: true, message: 'نتیجه برای دانش‌آموز منتشر شد.' };
}

export function sendMessage(conversationId: string, text: string): void {
  const persona = session.get().personaId;
  const id = `m-${Date.now().toString(36)}`;
  app.set((s) => ({
    conversations: s.conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [
              ...c.messages,
              {
                id,
                authorId: persona,
                text,
                at: new Date().toISOString(),
                state: s.online ? 'sent' : 'queued',
              },
            ],
          }
        : c,
    ),
  }));
  if (app.get().online) {
    setTimeout(() => markDelivered(conversationId, id), 420);
  } else {
    app.set((s) => ({ pendingSync: s.pendingSync + 1 }));
  }
}

function markDelivered(conversationId: string, messageId: string): void {
  app.set((s) => ({
    conversations: s.conversations.map((c) =>
      c.id === conversationId
        ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, state: 'delivered' } : m)) }
        : c,
    ),
  }));
}

export function unreadTotal(): number {
  const persona = session.get().personaId;
  return app
    .get()
    .conversations.filter((c) => c.memberIds.includes(persona))
    .reduce((sum, c) => sum + c.unread, 0);
}

export function markConversationRead(conversationId: string): void {
  app.set((s) => ({
    conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
  }));
}

export function markAllNotificationsRead(): void {
  app.set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
}

export function unreadNotifications(): number {
  return app.get().notifications.filter((n) => !n.read).length;
}

/** Pay an invoice. Demo only: no bank call, no proof of payment. */
export function payInvoice(invoiceId: string, trackingRef: string): { ok: boolean; message: string } {
  const invoice = app.get().invoices.find((i) => i.id === invoiceId);
  if (!invoice) return { ok: false, message: 'فاکتور پیدا نشد.' };
  if (invoice.status === 'paid') return { ok: false, message: 'این فاکتور قبلاً پرداخت شده است.' };
  app.set((s) => ({
    invoices: s.invoices.map((i) =>
      i.id === invoiceId ? { ...i, status: 'paid', paidAt: new Date().toISOString(), ref: trackingRef, method: 'online' } : i,
    ),
  }));
  return { ok: true, message: 'پرداخت شبیه‌سازی شد؛ تأیید نهایی با سرور واقعی انجام می‌شود.' };
}

/** Admin approves a paid application → the school becomes active. */
export function approveApplication(applicationId: string): void {
  app.set((s) => ({
    applications: s.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: 'paid',
            steps: [...a.steps, { at: new Date().toISOString(), label: 'پرداخت تأیید و آموزشگاه فعال شد', actor: 'ادمین ماکان' }],
          }
        : a,
    ),
  }));
}

export function rejectApplication(applicationId: string, reason: string): void {
  app.set((s) => ({
    applications: s.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: 'rejected',
            rejectReason: reason,
            steps: [...a.steps, { at: new Date().toISOString(), label: `رد درخواست: ${reason}`, actor: 'ادمین ماکان' }],
          }
        : a,
    ),
  }));
}

export function issueInvoice(applicationId: string): void {
  const number = `MKN-1405-0${Math.floor(100 + Math.random() * 899)}`;
  const invoice: Invoice = {
    id: `inv-${applicationId}`,
    number,
    amount: 6_000_000,
    status: 'unpaid',
    issuedAt: new Date().toISOString(),
    method: 'online',
    plan: 'حرفه‌ای — ۳۰ صندلی',
  };
  app.set((s) => ({
    invoices: [...s.invoices, invoice],
    applications: s.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status: 'invoiced',
            invoice,
            steps: [...a.steps, { at: new Date().toISOString(), label: `فاکتور ${number} صادر شد`, actor: 'ادمین ماکان' }],
          }
        : a,
    ),
  }));
}

export function resetDemo(): void {
  app.set({
    submissions: cloned(seedSubmissions),
    conversations: cloned(seedConversations),
    examAttempts: cloned(seedExamAttempts),
    notifications: cloned(seedNotifications),
    invoices: cloned(seedInvoices),
    applications: cloned(seedApplications),
    notebooks: cloned(seedNotebooks),
    attendance: {},
    drafts: {},
    photos: {},
    personalSources: {},
    pendingSync: 0,
  });
  void currentRole();
}

/* ------------------------------------------------------------------ sources */

/**
 * A source the signed-in person added for their own assistant chats. Kept per
 * person id: a personal note must never leak into a class or a school's shared
 * material, so these ids are not the shared `sources` list.
 */
export function personalSourcesFor(personId: string): PersonalSource[] {
  return app.get().personalSources[personId] ?? [];
}

export function addPersonalSource(personId: string, source: Omit<PersonalSource, 'id' | 'addedAt' | 'ownerId'>): PersonalSource {
  const created: PersonalSource = {
    ...source,
    id: `ps-${Date.now().toString(36)}`,
    ownerId: personId,
    addedAt: new Date().toISOString(),
  };
  app.set((s) => ({
    personalSources: { ...s.personalSources, [personId]: [...personalSourcesFor(personId), created] },
  }));
  return created;
}

/** Only the owner may drop a personal source. */
export function removePersonalSource(personId: string, sourceId: string): void {
  app.set((s) => ({
    personalSources: {
      ...s.personalSources,
      [personId]: personalSourcesFor(personId).filter((item) => item.id !== sourceId),
    },
  }));
}