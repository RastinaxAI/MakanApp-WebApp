/** Mock dataset. Everything here is fictional and generated relative to "now"
 *  so the UI always looks live. No real person, school or document is used. */

import type {
  AppNotification,
  ApplicationRequest,
  Assignment,
  ClassRoom,
  Conversation,
  Exam,
  ExamAttemptRecord,
  GuardianLink,
  Invoice,
  Lesson,
  LiveSession,
  Notebook,
  Person,
  Resource,
  School,
  Source,
  Submission,
  Term,
  Ticket,
} from './types';

const now = new Date();
const base = new Date(now);
base.setHours(0, 0, 0, 0);

/** Offset from today, at a local hour. */
function at(dayOffset: number, hour = 9, minute = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function minutesFromNow(mins: number): string {
  return new Date(now.getTime() + mins * 60_000).toISOString();
}

/* ------------------------------------------------------------------ people */

export const people: Person[] = [
  { id: 'p-sara', name: 'سارا نیک‌پور', phone: '۰۹۱۲۳۴۵۶۷۸۹', username: 'sara.n', grade: 'دهم', roles: ['student'], bio: 'علاقه‌مند به ریاضی و نجوم' },
  { id: 'p-arian', name: 'آرین احمدی', phone: '۰۹۱۲۹۸۷۶۵۴۳', username: 'arian.a', grade: 'دهم', roles: ['student'] },
  { id: 'p-parsa', name: 'پارسا مرادی', phone: '۰۹۱۲۱۱۲۲۳۳', username: 'p.m', grade: 'نهم', roles: ['student'] },
  { id: 'p-taraneh', name: 'ترانه صادقی', phone: '۰۹۳۵۲۲۱۱۰۰', username: 'taraneh', grade: 'دهم', roles: ['student'] },
  { id: 'p-hadi', name: 'هادی یزدانی', phone: '۰۹۱۲۵۵۵۴۴۳۳', username: 'hadi.y', grade: 'نهم', roles: ['student'] },
  { id: 'p-niloofar', name: 'نیلوفر کریمی', phone: '۰۹۱۹۳۳۲۲۱۱', username: 'niloofar', grade: 'دهم', roles: ['student'] },

  { id: 'p-arash', name: 'آرش فروتن', phone: '۰۹۱۲۷۷۷۱۲۳۴', username: 'arash', roles: ['teacher'], bio: 'تدریس ریاضی و فیزیک' },
  { id: 'p-maryam', name: 'مریم اسدی', phone: '۰۹۱۲۴۰۰۱۱۲۲', username: 'maryam', roles: ['teacher'] },
  { id: 'p-bahram', name: 'بهرام زمانی', phone: '۰۹۱۲۸۸۸۹۹۰۰', username: 'bahram', roles: ['teacher'] },

  { id: 'p-negar', name: 'نگار احمدی', phone: '۰۹۱۲۳۳۳۴۴۵۵', username: 'negar.a', roles: ['guardian'] },
  { id: 'p-farhad', name: 'فرهاد احمدی', phone: '۰۹۱۲۶۶۶۵۵۴۴', username: 'farhad', roles: ['guardian'] },

  { id: 'p-kamran', name: 'کامران دهقان', phone: '۰۹۱۲۱۰۰۰۰۰۱', username: 'kamran', roles: ['manager'] },
  { id: 'p-leila', name: 'لیلا موسوی', phone: '۰۹۱۲۹۹۹۸۸۷۷', username: 'leila.m', roles: ['manager'] },

  { id: 'p-admin', name: 'آرمان رستمی', phone: '۰۹۱۲۰۰۰۰۰۰۰', username: 'arman', roles: ['admin'] },
];

export const personaIds = {
  student: 'p-sara',
  teacher: 'p-arash',
  guardian: 'p-negar',
  manager: 'p-kamran',
  admin: 'p-admin',
} as const;

/* ----------------------------------------------------------------- schools */

export const schools: School[] = [
  {
    id: 's-neda',
    name: 'آموزشگاه ندا',
    city: 'تهران',
    plan: 'حرفه‌ای',
    seats: 40,
    usedSeats: 34,
    active: true,
    weekStart: 'شنبه',
    timezone: 'Asia/Tehran',
    aiQuota: { used: 62, total: 100 },
  },
  {
    id: 's-mehr',
    name: 'آموزشگاه مهر',
    city: 'کرج',
    plan: 'پایه',
    seats: 18,
    usedSeats: 11,
    active: true,
    weekStart: 'شنبه',
    timezone: 'Asia/Tehran',
    aiQuota: { used: 18, total: 50 },
  },
];

/* ------------------------------------------------------- curriculum, classes */

export const terms: Term[] = [
  { id: 't-1', name: 'پاییز ۱۴۰۵', from: at(-45), to: at(50) },
  { id: 't-2', name: 'بهار ۱۴۰۶', from: at(51), to: at(130) },
];

export const lessons: Lesson[] = [
  { id: 'l-math', name: 'ریاضی', field: 'ریاضیات', level: 'دهم', goals: ['توانایی حل معادله درجه دو', 'تشخیص نمودار تابع'] },
  { id: 'l-physics', name: 'فیزیک', field: 'علوم', level: 'دهم', goals: ['درک حرکت پرتابی', 'کار با نیرو و انرژی'] },
  { id: 'l-lit', name: 'ادبیات', field: 'ادبیات', level: 'نهم', goals: ['آشنایی با سبک نثر کلاسیک', 'تحلیل شخصیت و درون‌مایه'] },
];

export const classes: ClassRoom[] = [
  {
        id: 'c-math',
    schoolId: 's-neda',
    name: 'ریاضی دهم — گروه الف',
    lessonId: 'l-math',
    termId: 't-1',
    teacherIds: ['p-arash'],
    studentIds: ['p-sara', 'p-arian', 'p-taraneh', 'p-niloofar'],
    capacity: 12,
    status: 'active',
    groupChatId: 'g-class-math',
    color: 'var(--m-500)',
  },
  {
        id: 'c-physics',
    schoolId: 's-neda',
    name: 'فیزیک دهم — گروه ب',
    lessonId: 'l-physics',
    termId: 't-1',
    teacherIds: ['p-arash'],
    studentIds: ['p-sara', 'p-parsa', 'p-hadi'],
    capacity: 10,
    status: 'active',
    groupChatId: 'g-class-physics',
    color: 'var(--sky-500)',
  },
  {
        id: 'c-lit',
    schoolId: 's-neda',
    name: 'ادبیات نهم',
    lessonId: 'l-lit',
    termId: 't-1',
    teacherIds: ['p-maryam'],
    studentIds: ['p-arian', 'p-parsa', 'p-hadi', 'p-taraneh'],
    capacity: 15,
    status: 'active',
    groupChatId: 'g-class-lit',
    color: 'var(--rose-500)',
  },
  {
        id: 'c-math-old',
    schoolId: 's-neda',
    name: 'ریاضی دهم — ترم پیش',
    lessonId: 'l-math',
    termId: 't-2',
    teacherIds: ['p-arash'],
    studentIds: ['p-sara', 'p-niloofar'],
    capacity: 10,
    status: 'completed',
    groupChatId: '',
    color: 'var(--m-400)',
  },
];

/* ---------------------------------------------------------------- resources */

export const resources: Resource[] = [
  {
    id: 'res-eq',
    title: 'حل معادله درجه دو — جزوه',
    kind: 'pdf',
    sizeKb: 1840,
    version: 3,
    publishedAt: at(-6, 8),
    status: 'ready',
    classIds: ['c-math'],
    aiReady: true,
    pages: 24,
  },
  {
    id: 'res-graph',
    title: 'نمودارهای تابع',
    kind: 'pdf',
    sizeKb: 920,
    version: 1,
    publishedAt: at(-3, 8),
    status: 'ready',
    classIds: ['c-math'],
    aiReady: true,
    pages: 12,
  },
  {
    id: 'res-motion',
    title: 'حرکت پرتابی — ارائه جلسه',
    kind: 'pdf',
    sizeKb: 3120,
    version: 2,
    publishedAt: at(-1, 8),
    status: 'processing',
    classIds: ['c-physics'],
    aiReady: false,
    pages: 41,
  },
  {
    id: 'res-energy',
    title: 'فرمول‌نامه فیزیک',
    kind: 'pdf',
    sizeKb: 480,
    version: 1,
    publishedAt: at(-12, 8),
    status: 'ready',
    classIds: ['c-physics'],
    aiReady: true,
    pages: 6,
  },
  {
    id: 'res-lit',
    title: 'درسنامه نثر کلاسیک',
    kind: 'pdf',
    sizeKb: 2260,
    version: 1,
    publishedAt: at(-8, 8),
    status: 'ready',
    classIds: ['c-lit'],
    aiReady: true,
    pages: 33,
  },
];

/* ----------------------------------------------------------------- sessions */

export const sessions: LiveSession[] = [
  {
    id: 'sess-today-1',
    classId: 'c-math',
    title: 'حل معادله درجه دو — جلسه سوم',
    startsAt: at(0, 16, 0),
    durationMin: 75,
    meetLink: 'https://meet.google.com/abc-defg-hij',
    status: 'scheduled',
    provider: 'Google Meet',
    attendance: {},
    materialIds: ['res-eq'],
    homeworkId: 'as-quad',
  },
  {
    id: 'sess-today-2',
    classId: 'c-physics',
    title: 'حرکت پرتابی — مرور مثال‌ها',
    startsAt: at(0, 18, 30),
    durationMin: 60,
    meetLink: 'https://meet.google.com/mno-pqrs-tuv',
    status: 'scheduled',
    provider: 'Google Meet',
    attendance: {},
    materialIds: ['res-motion'],
  },
  {
    id: 'sess-yesterday',
    classId: 'c-math',
    title: 'نمودارهای تابع',
    startsAt: at(-2, 16, 0),
    durationMin: 75,
    meetLink: 'https://meet.google.com/abc-defg-hij',
    status: 'done',
    provider: 'Google Meet',
    attendance: {
      'p-sara': 'present',
      'p-arian': 'late',
      'p-taraneh': 'present',
      'p-niloofar': 'unset',
    },
    materialIds: ['res-graph'],
  },
  {
    id: 'sess-next',
    classId: 'c-math',
    title: 'جمع‌بندی فصل و آزمون',
    startsAt: at(3, 16, 0),
    durationMin: 90,
    meetLink: 'https://meet.google.com/zzz-yyy-xxx',
    status: 'scheduled',
    provider: 'Google Meet',
    attendance: {},
    materialIds: [],
  },
  {
    id: 'sess-lit',
    classId: 'c-lit',
    title: 'نثر کلاسیک — تحلیل متن',
    startsAt: at(1, 15, 0),
    durationMin: 60,
    meetLink: 'https://meet.google.com/lit-001',
    status: 'scheduled',
    provider: 'Google Meet',
    attendance: {},
    materialIds: ['res-lit'],
  },
  {
    id: 'sess-cancelled',
    classId: 'c-physics',
    title: 'آزمایشگاه (لغو شد)',
    startsAt: at(-5, 17, 0),
    durationMin: 60,
    status: 'cancelled',
    provider: 'Google Meet',
    attendance: {},
    materialIds: [],
  },
];

/* -------------------------------------------------------------- assignments */

export const assignments: Assignment[] = [
  {
    id: 'as-quad',
    classId: 'c-math',
    title: 'تمرین معادله درجه دو',
    body: 'چهار معادله صفحه ۱۲ جزوه را حل کنید و برای هر ریشه، تعداد ریشه را بررسی کنید. پاسخ تشریحی باشد.',
    version: 2,
    publishedAt: at(-5, 9),
    dueAt: at(2, 22, 0),
    allowLate: true,
    maxAttempts: 2,
    scoredAttempt: 'latest',
    resourceIds: ['res-eq'],
    rubric: [
      { label: 'درستی محاسبه', points: 10 },
      { label: 'بررسی ریشه‌ها', points: 5 },
      { label: 'نگارش', points: 5 },
    ],
  },
  {
    id: 'as-graph',
    classId: 'c-math',
    title: 'تحلیل نمودار تابع',
    body: 'برای سه تابع داده‌شده، نقطه صفر و بازه یکنوایی را مشخص کنید.',
    version: 1,
    publishedAt: at(-8, 9),
    dueAt: at(-1, 22, 0),
    allowLate: false,
    maxAttempts: 1,
    scoredAttempt: 'best',
    resourceIds: ['res-graph'],
    rubric: [
      { label: 'تشخیص نقطه صفر', points: 8 },
      { label: 'بازه یکنوایی', points: 8 },
    ],
  },
  {
    id: 'as-motion',
    classId: 'c-physics',
    title: 'مسئله پرتاب',
    body: 'دو مسئله صفحه ۹ کار را حل کنید و نمودار سرعت-زمان را رسم کنید.',
    version: 1,
    publishedAt: at(-2, 10),
    dueAt: at(1, 20, 0),
    allowLate: true,
    maxAttempts: 3,
    scoredAttempt: 'latest',
    resourceIds: ['res-motion'],
    rubric: [{ label: 'حل مستند', points: 20 }],
  },
  {
    id: 'as-lit',
    classId: 'c-lit',
    title: 'تحلیل شخصیت داستان',
    body: 'دو صفحه درباره انگیزه‌های شخصیت اصلی بنویسید و سه نقل از متن بیاورید.',
    version: 1,
    publishedAt: at(-4, 9),
    dueAt: at(4, 21, 0),
    allowLate: true,
    maxAttempts: 1,
    scoredAttempt: 'best',
    resourceIds: ['res-lit'],
    rubric: [
      { label: 'تحلیل', points: 12 },
      { label: 'شواهد متنی', points: 8 },
    ],
  },
];

export const submissions: Submission[] = [
  {
    id: 'sub-sara-quad',
    assignmentId: 'as-quad',
    studentId: 'p-sara',
    status: 'draft',
    attempts: [
      {
        number: 1,
        text: 'پاسخ اولیه چهار معادله…',
        createdAt: minutesFromNow(-180),
        state: 'draft',
      },
    ],
  },
  {
    id: 'sub-arian-quad',
    assignmentId: 'as-quad',
    studentId: 'p-arian',
    status: 'submitted',
    attempts: [{ number: 1, text: 'حل کامل صفحه ۱۲', fileName: 'arian-quad.pdf', createdAt: at(-1, 21), receivedAt: at(-1, 21), receiptId: 'R-8841', state: 'received' }],
  },
  {
    id: 'sub-taraneh-quad',
    assignmentId: 'as-quad',
    studentId: 'p-taraneh',
    status: 'submitted',
    attempts: [{ number: 1, text: 'همراه با تصویر دست‌نویس', fileName: 'taraneh.jpg', createdAt: at(-1, 23), receivedAt: at(-2, 0), receiptId: 'R-8839', state: 'late' }],
  },
  {
    id: 'sub-sara-graph',
    assignmentId: 'as-graph',
    studentId: 'p-sara',
    status: 'graded',
    score: 17,
    feedback: 'نقطه صفر درست است؛ در بازه یکنوایی دقت کنید که بازه بسته است.',
    privateNote: 'برای پایه‌یازی بهتر، تمرین دامنه بیشتری بدهیم.',
    publishedAt: at(-1, 12),
    attempts: [{ number: 1, text: 'تحلیل سه تابع', createdAt: at(-2, 20), receivedAt: at(-2, 20), receiptId: 'R-8790', state: 'received' }],
  },
  {
    id: 'sub-sara-motion',
    assignmentId: 'as-motion',
    studentId: 'p-sara',
    status: 'returned',
    feedback: 'نمودار را کامل کنید و دوباره بفرستید.',
    publishedAt: at(-1, 15),
    attempts: [{ number: 1, text: 'حل دو مسئله', createdAt: at(-3, 19), receivedAt: at(-3, 19), receiptId: 'R-8712', state: 'received' }],
  },
  {
    id: 'sub-parsa-motion',
    assignmentId: 'as-motion',
    studentId: 'p-parsa',
    status: 'submitted',
    attempts: [{ number: 1, text: 'حل با گام‌ها', fileName: 'parsa-motion.jpg', createdAt: at(-1, 18), receivedAt: at(-1, 18), receiptId: 'R-8820', state: 'received' }],
  },
  {
    id: 'sub-hadi-motion',
    assignmentId: 'as-motion',
    studentId: 'p-hadi',
    status: 'not-started',
    attempts: [],
  },
  {
    id: 'sub-sara-lit',
    assignmentId: 'as-lit',
    studentId: 'p-sara',
    status: 'not-started',
    attempts: [],
  },
];

/* -------------------------------------------------------------------- exams */

export const exams: Exam[] = [
  {
    id: 'ex-mid',
    classId: 'c-math',
    title: 'آزمون میان‌ترم ریاضی دهم',
    topic: 'معادله و تابع',
    durationMin: 25,
    opensAt: minutesFromNow(-10),
    closesAt: at(0, 22, 0),
    maxAttempts: 1,
    releasePolicy: 'after-review',
    resultsPublished: false,
    questions: [
      { id: 'q1', prompt: 'ریشه‌های x² − 5x + 6 = 0 کدام‌اند؟', options: ['۱ و ۶', '۲ و ۳', '−۲ و −۳', '۳ و ۲ (تکراری)'], answer: 1, points: 2 },
      { id: 'q2', prompt: 'اگر f(x) = 2x − 3 باشد، f(4) چقدر است؟', options: ['۵', '۸', '۱۱', '−۵'], answer: 0, points: 1 },
      { id: 'q3', prompt: 'دامنه تابع ۱/(x−2) کدام است؟', options: ['همه اعداد', 'اعداد به جز ۲', 'اعداد مثبت', 'اعداد کوچک‌تر از ۲'], answer: 1, points: 2 },
      { id: 'q4', prompt: 'vertex تابع y = (x−3)² + ۱ کجاست؟', options: ['(۳، ۱)', '(۰، ۱۰)', '(۳، ۰)', '(۱، ۳)'], answer: 0, points: 2 },
      { id: 'q5', prompt: 'تعداد ریشه‌های گنگی x² − 8 = 0 چند است؟', options: ['صفر', 'یک', 'دو', 'نامشخص'], answer: 2, points: 1 },
    ],
  },
  {
    id: 'ex-phys',
    classId: 'c-physics',
    title: 'آزمون کوتاه حرکت پرتابی',
    topic: 'حرکت پرتابی',
    durationMin: 15,
    opensAt: at(6, 8),
    closesAt: at(7, 22),
    maxAttempts: 2,
    releasePolicy: 'auto',
    resultsPublished: false,
    questions: [
      { id: 'q1', prompt: 'در پرتاب افقی، شتاب افقی صفر است.', options: ['درست', 'نادرست'], answer: 1, points: 1 },
      { id: 'q2', prompt: 'زمان سقوط از ارتفاع h برابر چیست؟', options: ['√(h/g)', 'h/g', '۲h/g', '√(2h)'], answer: 0, points: 2 },
      { id: 'q3', prompt: 'در رانش افقی ایده‌آل، سرعت افقی ثابت است.', options: ['درست', 'نادرست'], answer: 0, points: 1 },
    ],
  },
];

export const examAttempts: ExamAttemptRecord[] = [
  {
    id: 'ea-mid-sara',
    examId: 'ex-mid',
    studentId: 'p-sara',
    startedAt: minutesFromNow(-8),
    answers: { q1: 1, q2: 0, q3: 1 },
    pending: { q4: 0 },
    autoScore: 5,
    released: false,
  },
];

/* ------------------------------------------------------------ conversations */

export const conversations: Conversation[] = [
  {
    id: 'g-class-math',
    kind: 'group',
    title: 'ریاضی دهم — گروه الف',
    subtitle: 'گروه رسمی کلاس · ۴ عضو',
    memberIds: ['p-arash', 'p-sara', 'p-arian', 'p-taraneh', 'p-niloofar'],
    ownerId: 'system',
    adminIds: ['p-arash'],
    classId: 'c-math',
    schoolId: 's-neda',
    pinned: true,
    muted: false,
    unread: 2,
    aiPolicy: 'class-only',
    messages: [
      { id: 'm1', authorId: 'p-arash', text: 'جلسه امروز ساعت ۱۶ با لینک همین گروه شروع می‌شود.', at: at(0, 9, 10), state: 'read' },
      { id: 'm2', authorId: 'p-arian', text: 'جزوه صفحه ۱۲ هم آماده است؟', at: at(0, 9, 40), state: 'read' },
      { id: 'm3', authorId: 'p-arash', text: 'بله، در بخش منابع کلاس گذاشتم. لطفاً پیش از جلسه مرور کنید.', at: at(0, 10, 5), state: 'read', attachment: { name: 'eq-neshomat.pdf', sizeKb: 1840, kind: 'pdf' } },
      { id: 'm4', authorId: 'p-taraneh', text: 'ممنون آقای فرونی 🌸', at: minutesFromNow(-40), state: 'delivered' },
      { id: 'm5', authorId: 'p-sara', text: 'اگر سؤالی درباره درجه دو داشتم همین‌جا بپرسم؟', at: minutesFromNow(-12), state: 'read' },
    ],
  },
  {
    id: 'g-class-physics',
    kind: 'group',
    title: 'فیزیک دهم — گروه ب',
    subtitle: 'گروه رسمی کلاس · ۳ عضو',
    memberIds: ['p-arash', 'p-sara', 'p-parsa', 'p-hadi'],
    ownerId: 'system',
    adminIds: ['p-arash'],
    classId: 'c-physics',
    schoolId: 's-neda',
    pinned: false,
    muted: false,
    unread: 0,
    aiPolicy: 'class-only',
    messages: [
      { id: 'm1', authorId: 'p-arash', text: 'حل مسئله ۳ کار را با نمودار همراه بفرستید.', at: at(-1, 20), state: 'read' },
      { id: 'm2', authorId: 'p-parsa', text: 'فرستادم، ممنون.', at: at(-1, 21), state: 'read' },
    ],
  },
  {
    id: 'd-teacher',
    kind: 'direct',
    title: 'آرش فروتن',
    subtitle: 'معلم ریاضی دهم',
    memberIds: ['p-sara', 'p-arash'],
    ownerId: 'p-sara',
    adminIds: [],
    schoolId: 's-neda',
    pinned: false,
    muted: false,
    unread: 1,
    aiPolicy: 'off',
    messages: [
      { id: 'm1', authorId: 'p-sara', text: 'سلام، برای تمرین دیروز می‌توانم تلاش دوم بزنم؟', at: at(-1, 18), state: 'read' },
      { id: 'm2', authorId: 'p-arash', text: 'بله، چون مهلت با اجازه تمدید شد.', at: minutesFromNow(-90), state: 'delivered' },
    ],
  },
  {
    id: 'd-guardian',
    kind: 'direct',
    title: 'نگار احمدی',
    subtitle: 'والد آرین',
    memberIds: ['p-sara', 'p-negar'],
    ownerId: 'p-sara',
    adminIds: [],
    pinned: false,
    muted: false,
    unread: 0,
    aiPolicy: 'off',
    messages: [
      { id: 'm1', authorId: 'p-negar', text: 'سلام، ممنون که جزوه را گذاشتی.', at: at(-2, 19), state: 'read' },
      { id: 'm2', authorId: 'p-sara', text: 'خواهش می‌کنم 🌷', at: at(-2, 20), state: 'read' },
    ],
  },
  {
    id: 'ch-school',
    kind: 'channel',
    title: 'اطلاعیه‌های آموزشگاه ندا',
    subtitle: 'کانال رسمی · فقط مدیران می‌نویسند',
    memberIds: ['p-kamran', 'p-arash', 'p-sara', 'p-arian', 'p-taraneh', 'p-niloofar', 'p-parsa', 'p-hadi'],
    ownerId: 'p-kamran',
    adminIds: ['p-kamran'],
    schoolId: 's-neda',
    pinned: false,
    muted: false,
    unread: 1,
    aiPolicy: 'off',
    messages: [
      { id: 'm1', authorId: 'p-kamran', text: 'تعطیلی روز پنج‌شنبه به مناسبت مراسم بازگشایی سال تحصیلی.', at: at(-1, 12), state: 'read' },
      { id: 'm2', authorId: 'p-kamran', text: 'ثبت‌نام ترم بهار از ابتدای هفته آینده آغاز می‌شود.', at: minutesFromNow(-200), state: 'delivered' },
    ],
  },
];

/* ------------------------------------------------------------ AI notebooks */

export const sources: Source[] = [
  { id: 'src-eq', title: 'حل معادله درجه دو — جزوه', kind: 'file', sizeKb: 1840, status: 'ready', quality: 'high', pages: 24, license: 'استفاده آموزشی', assignedTo: ['s-neda', 'c-math'] },
  { id: 'src-graph', title: 'نمودارهای تابع', kind: 'file', sizeKb: 920, status: 'ready', quality: 'high', pages: 12, license: 'استفاده آموزشی', assignedTo: ['s-neda', 'c-math'] },
  { id: 'src-motion', title: 'حرکت پرتابی — ارائه', kind: 'file', sizeKb: 3120, status: 'processing', quality: 'pending', pages: 41, license: 'استفاده آموزشی', assignedTo: ['s-neda'], processingNote: 'استخراج متن در حال انجام است' },
  { id: 'src-scan', title: 'اسکن جزوه دست‌نویس کلاس', kind: 'file', sizeKb: 5400, status: 'ready', quality: 'low', pages: 8, license: 'نامشخص', assignedTo: ['s-neda'], processingNote: 'کیفیت متن پایین است؛ برای ارجاع دقیق مناسب نیست' },
  { id: 'src-link', title: 'مقاله: روش‌های حل معادله درجه دو', kind: 'link', status: 'ready', quality: 'high', url: 'https://example.org/quadratic', license: 'دسترسی آزاد', assignedTo: ['s-neda'] },
  { id: 'src-bad', title: 'آزمون ارسالی ناقص', kind: 'file', sizeKb: 120, status: 'failed', quality: 'pending', license: 'نامشخص', assignedTo: [], processingNote: 'بارگذاری ناموفق بود' },
];

export const notebooks: Notebook[] = [
  {
    id: 'nb-eq',
    title: 'معادله درجه دو',
    sourceIds: ['src-eq', 'src-graph', 'src-link'],
    archived: false,
    updatedAt: at(-1, 20),
    messages: [
      { role: 'user', text: 'دو ریشه را چطور از رابطه ویتا بگیرم؟', at: at(-1, 19) },
      {
        role: 'assistant',
        text: 'مجموع ریشه‌ها برابر منفی ضریب x و حاصل‌ضرب برابر ضریب ثابت است. برای ax²+ bx + c، مجموع ریشه‌ها −b/a و حاصل‌ضرب c/a است. اگر مجموع و حاصل‌ضرب را بدانید، معادله درجه دو را بازسازی می‌کنید.',
        at: at(-1, 19, 1),
        citations: ['src-eq', 'src-link'],
      },
    ],
  },
  {
    id: 'nb-exam',
    title: 'آمادگی آزمون میان‌ترم',
    sourceIds: ['src-eq', 'src-graph'],
    archived: false,
    updatedAt: at(0, 8),
    messages: [
      { role: 'user', text: 'ضعیف‌ترین مبحثم کجاست؟', at: at(0, 8) },
      {
        role: 'assistant',
        text: 'بر پایه شواهد موجود (۲ تمرین با نمره ۱۲ از ۲۰ و یک تمرین بدون نمره)، برای نتیجه‌گیری قطعی داده کافی نیست. پیشنهاد می‌کنم دو تمرین دیگر حل کنید؛ اگر خواستید، یک مرور ۲۰ دقیقه‌ای هم می‌سازم.',
        at: at(0, 8, 1),
        citations: [],
      },
    ],
  },
  { id: 'nb-old', title: 'فیزیک — پروژه پایانی', sourceIds: ['src-motion'], archived: true, updatedAt: at(-20, 12), messages: [] },
  { id: 'nb-new', title: 'دفتر تازه', sourceIds: [], archived: false, updatedAt: at(0, 9), messages: [] },
];

/* -------------------------------------------------------- commerce & requests */

export const invoices: Invoice[] = [
  { id: 'inv-1', number: 'MKN-1405-0182', amount: 4_800_000, status: 'paid', issuedAt: at(-40), paidAt: at(-38), ref: 'TRX-77412', method: 'online', plan: 'حرفه‌ای — ۴۰ صندلی' },
  { id: 'inv-2', number: 'MKN-1405-0201', amount: 1_200_000, status: 'paid', issuedAt: at(-12), paidAt: at(-11), ref: 'TRX-78120', method: 'online', plan: 'افزایش سهمیه دستیار' },
  { id: 'inv-3', number: 'MKN-1405-0229', amount: 2_400_000, status: 'unpaid', issuedAt: at(-2), plan: 'تمدید سالانه' },
];

export const applications: ApplicationRequest[] = [
  {
    id: 'app-1',
    applicantName: 'سمیه برهانی',
    phone: '۰۹۱۲۵۵۵۱۱۲۲',
    username: 'sobeheh.b',
    nationalId: '۰۰۲۳۴۵۶۷۸۹',
    schoolName: 'آموزشگاه روشن',
    foundedAt: at(-900),
    parentOrg: 'مؤسسه فرهنگی آوا',
    licenseName: 'license-sobeheh.pdf',
    licenseKb: 312,
    city: 'تهران',
    topic: 'ریاضی و علوم',
    level: 'دهم تا دوازدهم',
    capacity: 25,
    needs: '۳ کلاس، یک حساب آموزشی برای هر معلم',
    resourceIds: ['src-eq'],
    status: 'invoiced',
    steps: [
      { at: at(-6, 10), label: 'درخواست ثبت شد', actor: 'سمیه برهانی' },
      { at: at(-5, 12), label: 'تأیید اولیه ادمین', actor: 'آرمان رستمی' },
      { at: at(-3, 9), label: 'فاکتور صادر شد', actor: 'آرمان رستمی' },
    ],
    invoice: { id: 'inv-a1', number: 'MKN-1405-0231', amount: 6_000_000, status: 'pending', issuedAt: at(-3), method: 'online', plan: 'حرفه‌ای — ۳۰ صندلی' },
  },
  {
    id: 'app-2',
    applicantName: 'وحید فلاحی',
    phone: '۰۹۱۹۳۳۳۲۲۲۲',
    username: 'vahid.f',
    nationalId: '۰۰۹۸۷۶۵۴۳۲',
    schoolName: 'آماج',
    foundedAt: at(-300),
    parentOrg: 'ندارد',
    licenseName: 'license-vahid.jpg',
    licenseKb: 428,
    city: 'اصفهان',
    topic: 'زبان',
    level: 'هفتم تا نهم',
    capacity: 12,
    needs: 'یک کلاس آنلاین با گروه کلاسی',
    resourceIds: [],
    status: 'submitted',
    steps: [{ at: at(-1, 15), label: 'درخواست ثبت شد', actor: 'وحید فلاحی' }],
  },
];

/* ------------------------------------------------------------------ misc */

export const guardianLinks: GuardianLink[] = [
  { studentId: 'p-arian', guardianId: 'p-negar', relation: 'mother', status: 'verified', scopes: { scores: true, attendance: true, reports: true, messaging: true }, verifiedBy: 'p-kamran', expiresAt: at(120) },
  { studentId: 'p-arian', guardianId: 'p-farhad', relation: 'father', status: 'verified', scopes: { scores: true, attendance: true, reports: true, messaging: false }, verifiedBy: 'p-kamran', expiresAt: at(120) },
  { studentId: 'p-taraneh', guardianId: 'p-farhad', relation: 'supervisor', status: 'pending', scopes: { scores: false, attendance: false, reports: false, messaging: false }, verifiedBy: '', expiresAt: at(90) },
];

export const notifications: AppNotification[] = [
  { id: 'nt1', kind: 'exam', title: 'آزمون میان‌ترم باز است', body: '۲۵ دقیقه وقت دارید؛ تلاش شما شروع شده و ذخیره شده است.', at: minutesFromNow(-9), read: false, href: '/school/exams/ex-mid/attempt', schoolId: 's-neda' },
  { id: 'nt2', kind: 'message', title: 'پیام تازه از آرش فرونی', body: 'بله، چون مهلت با اجازه تمدید شد.', at: minutesFromNow(-88), read: false, href: '/msg/d-teacher', schoolId: 's-neda' },
  { id: 'nt3', kind: 'grade', title: 'نمره منتشر شد', body: 'تحلیل نمودار تابع: ۱۷ از ۲۰', at: at(-1, 12), read: true, href: '/school/submissions/sub-sara-graph', schoolId: 's-neda' },
  { id: 'nt4', kind: 'assignment', title: 'تکلیف جدید', body: 'تحلیل شخصیت داستان — مهلت تا چهار روز دیگر', at: at(-4, 9), read: true, href: '/school/assignments/as-lit', schoolId: 's-neda' },
  { id: 'nt5', kind: 'account', title: 'درخواست تمدید فاکتور', body: 'فاکتور MKN-1405-0229 در انتظار پرداخت است.', at: at(-2, 10), read: true, href: '/profile/finance', schoolId: 's-neda' },
  { id: 'nt6', kind: 'ops', title: 'منبع در حال پردازش', body: '«حرکت پرتابی» هنوز آماده ارجاع در دستیار نیست.', at: at(-1, 16), read: true, href: '/library/src-motion' },
];

export const tickets: Ticket[] = [
  {
    id: 't-1',
    code: 'MK-10422',
    subject: 'لینک جلسه باز نمی‌شود',
    status: 'answered',
    createdAt: at(-2, 11),
    assignee: 'پشتیبانی — سارا',
    messages: [
      { from: 'user', text: 'وقتی روی دکمه ورود جلسه می‌زنم، صفحه سفید می‌ماند.', at: at(-2, 11) },
      { from: 'support', text: 'ممنون از گزارش. لینک را بررسی کردیم؛ مشکل از سرویس جلسه بود و به‌روزرسانی شد. لطفاً دوباره امتحان کنید.', at: at(-1, 9) },
    ],
  },
  {
    id: 't-2',
    code: 'MK-10390',
    subject: 'نمره اشتباه محاسبه شده',
    status: 'open',
    createdAt: at(-4, 16),
    assignee: 'مسئول آموزشی آموزشگاه',
    messages: [{ from: 'user', text: 'نمره تمرین صفحه ۱۲ با پاسخ‌نامه فرق دارد.', at: at(-4, 16) }],
  },
];

/* --------------------------------------------------------------- accessors */

export const personById = new Map(people.map((p) => [p.id, p]));
export const classById = new Map(classes.map((c) => [c.id, c]));
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const schoolById = new Map(schools.map((s) => [s.id, s]));
export const conversationById = new Map(conversations.map((c) => [c.id, c]));
export const assignmentById = new Map(assignments.map((a) => [a.id, a]));
export const submissionById = new Map(submissions.map((s) => [s.id, s]));
export const examById = new Map(exams.map((e) => [e.id, e]));
export const sessionById = new Map(sessions.map((s) => [s.id, s]));
export const resourceById = new Map(resources.map((r) => [r.id, r]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));
export const notebookById = new Map(notebooks.map((n) => [n.id, n]));
export const applicationById = new Map(applications.map((a) => [a.id, a]));

export function nameOf(id: string): string {
  return personById.get(id)?.name ?? 'کاربر حذف‌شده';
}

export function sessionsOfClass(classId: string): LiveSession[] {
  return sessions
    .filter((s) => s.classId === classId)
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

export function assignmentsOfClass(classId: string): Assignment[] {
  return assignments.filter((a) => a.classId === classId);
}

export function examsOfClass(classId: string): Exam[] {
  return exams.filter((e) => e.classId === classId);
}

export function submissionFor(assignmentId: string, studentId: string): Submission | undefined {
  return submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
}