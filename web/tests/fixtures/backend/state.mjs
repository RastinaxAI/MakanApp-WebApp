import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
export const schemas = JSON.parse(
  fs.readFileSync(new URL('../../../contracts/openapi.json', import.meta.url), 'utf8'),
).components.schemas;
export const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ids = {
  org: id(1),
  class: id(2),
  assignment: id(3),
  attempt: id(4),
  lesson: id(5),
  exam: id(6),
  examAttempt: id(7),
  question: id(8),
  chat: id(9),
};
export function sample(schema) {
  if (schema.$ref) return sample(schemas[schema.$ref.split('/').at(-1)]);
  if (schema.nullable) return null;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'object')
    return Object.fromEntries(
      (schema.required ?? []).map((k) => [k, sample(schema.properties[k])]),
    );
  if (schema.type === 'array') return [];
  if (['integer', 'number'].includes(schema.type)) return 0;
  if (schema.type === 'boolean') return false;
  if (schema.format === 'uuid') return id(1000);
  if (schema.format === 'date-time') return '2026-10-29T10:00:00Z';
  if (schema.format === 'date') return '2000-01-01';
  return 'نمونهٔ آزمون';
}
export const make = (name, overrides = {}) => ({ ...sample(schemas[name]), ...overrides });
export function createState() {
  const state = {
    auth: new Map(),
    users: new Map(),
    assets: new Map(),
    messages: [],
    requests: [],
    faults: [],
    files: new Map(),
    invitations: [],
    schedule: [],
    dashboardOverrides: {},
    attempt: null,
    examAttempt: null,
    examAnswers: [],
    answerSetVersion: 1,
    lessons: new Map([
      [
        ids.lesson,
        make('ClassLessonResult', {
          id: ids.lesson,
          classId: ids.class,
          organizationId: ids.org,
          title: 'درس منتشرشدهٔ آزمایشی',
          body: 'محتوای مجاز درس نمونه',
          status: 'Published',
          version: '1',
          attachments: [],
        }),
      ],
    ]),
    privacy: new Map(),
    blocked: new Map(),
  };
  for (const phone of ['09120000101', '09120000102', '09120000103', '09120000104'])
    userFor(state, phone);
  return state;
}
export function userFor(state, phone) {
  const suffix = Number(phone.slice(-3));
  const role = { 101: 'Student', 102: 'Teacher', 103: 'Parent', 104: 'Manager' }[suffix] ?? null;
  const uid = id(suffix);
  if (!state.users.has(uid))
    state.users.set(
      uid,
      make('CurrentUserResult', {
        id: uid,
        phoneNumber: phone,
        isProfileComplete: true,
        firstName: 'کاربر',
        lastName: role ?? 'شخصی',
        displayName: role ? `کاربر آزمایشی ${role}` : 'کاربر شخصی آزمایشی',
        username: role ? `test.${role}` : 'test.personal',
        dateOfBirth: '2000-01-01',
        profilePhoto: null,
      }),
    );
  return { user: state.users.get(uid), role, membershipId: id(suffix + 200), token: randomUUID() };
}
export const classRow = () =>
  make('ClassResult', {
    id: ids.class,
    organizationId: ids.org,
    title: 'کلاس آزمایشی ریاضی با نام بلند برای بررسی واکنش‌گرایی',
    courseTitle: 'ریاضی',
    academicPeriodTitle: 'دورهٔ آزمایشی',
    status: 'Active',
    capacity: 20,
  });
export const assignment = () =>
  make('AssignmentResult', {
    id: ids.assignment,
    organizationId: ids.org,
    classId: ids.class,
    classTitle: 'کلاس ریاضی',
    title: 'تکلیف آزمایشی',
    description: 'پاسخ را بنویسید و پیش از تحویل نهایی بازبینی کنید.',
    status: 'Published',
    maxAttempts: 3,
    maxScore: 30,
    dueAtUtc: '2099-11-01T12:00:00Z',
  });
export const paged = (name, items, url) =>
  make(name, {
    items,
    page: Number(url.searchParams.get('Page') ?? url.searchParams.get('page') ?? 1),
    pageSize: Number(url.searchParams.get('PageSize') ?? url.searchParams.get('pageSize') ?? 30),
    totalCount: items.length,
  });
