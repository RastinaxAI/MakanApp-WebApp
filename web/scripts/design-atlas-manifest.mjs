// Current implemented views, audited against routes and feature modules, not the old 130-screen prototype.
export const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const ids = {
  class: id(2),
  assignment: id(3),
  attempt: id(4),
  lesson: id(5),
  exam: id(6),
  examAttempt: id(7),
  question: id(8),
  chat: id(9),
  group: id(950),
  source: id(1500),
  library: id(1503),
};
const e = '/personal/education',
  m = '/personal/messages',
  c = `${e}/classes/${ids.class}`,
  a = `${e}/assignments/${ids.assignment}`,
  x = `${e}/exams/${ids.exam}`,
  g = `${m}/${ids.group}`;
const entries = [];
function add(section, key, title, route, role = 'Student', features = [], options = {}) {
  entries.push({
    id: 'UI-' + String(entries.length + 1).padStart(3, '0'),
    section,
    key,
    title,
    route,
    role,
    school: ![
      'public',
      'account',
      'contacts',
      'messaging',
      'sources',
      'assistant',
      'commerce',
      'states',
      'themes',
    ].includes(section),
    status: 'connected',
    features,
    ...options,
  });
}
const account = (key, title, route, features = [], options = {}) =>
  add('account', key, title, route, 'Student', features, options);
add('public', 'welcome', 'معرفی ماکان', '/welcome', 'Public', [
  'معرفی محصول و ورود به حساب',
  'نمای واکنش‌گرا و هویت مشترک',
]);
add('public', 'phone', 'ورود با شماره همراه', '/enter', 'Public', [
  'اعتبارسنجی شماره همراه فارسی/لاتین',
  'درخواست کد پیامکی و نمایش خطای سرویس',
]);
add(
  'public',
  'otp',
  'تأیید کد پیامکی',
  '/enter',
  'Public',
  ['ورود کد، تغییر شماره و ارسال دوباره', 'حفظ وضعیت شمارش و خطا'],
  { action: 'otp' },
);
account('home', 'نمای حساب و دسترسی‌های من', '/personal', [
  'میان‌برهای حساب و فضای مجاز',
  'تفکیک حساب شخصی و نقش آموزشگاه',
]);
account('workspaces', 'انتخاب نقش و فضای مجاز', '/personal/workspaces', [
  'انتخاب فقط از عضویت‌های مجاز سرور',
  'ورود به آموزشگاه با حفظ مرز نقش‌ها',
]);
account(
  'workspace-dialog',
  'پنجرهٔ جابه‌جایی نقش و فضا',
  '/personal/profile',
  ['نمایش فضاها و نقش‌های مجاز', 'تغییر فضا و حفظ هویت حساب'],
  { action: 'workspace-dialog' },
);
account('profile', 'پروفایل من', '/personal/profile', [
  'عکس و هویت حساب، نام کاربری و اطلاعات عمومی',
  'فضاهای من و دسترسی به منابع/ترجیحات',
]);
account('profile-edit', 'ویرایش پروفایل', '/personal/profile/edit', [
  'ویرایش نام و نام کاربری',
  'تاریخ تولد و تصویر حساب',
  'حفظ نوشته در خطای ذخیره',
]);
account(
  'profile-calendar',
  'انتخاب تاریخ تولد',
  '/personal/profile/edit',
  ['تقویم شمسی و انتخاب تاریخ', 'تبدیل تاریخ برای سرویس'],
  { action: 'profile-calendar' },
);
account(
  'profile-photo',
  'انتخاب و پیش‌نمایش عکس پروفایل',
  '/personal/profile/edit',
  ['انتخاب تصویر و پیش‌نمایش', 'آماده‌شدن فایل و تأیید ثبت'],
  { action: 'profile-photo' },
);
account('preferences', 'حساب و ترجیحات', '/personal/profile/preferences', [
  'پیوندهای حریم خصوصی، اعلان‌ها، اشتراک و کلاس شخصی',
  'امنیت، مخاطبین و تنظیمات',
]);
account('settings', 'تنظیمات حساب', '/personal/settings', [
  'بخش‌بندی تنظیمات و بازگشت به پروفایل',
  'نمایش یکدست در موبایل و دسکتاپ',
]);
account('appearance', 'تنظیم ظاهر', '/personal/settings/appearance', [
  'انتخاب روشن/تاریک/سیستم',
  'ماندگاری انتخاب کاربر',
]);
account('privacy', 'حریم خصوصی پیام‌رسان', '/personal/settings/privacy', [
  'تنظیمات مجاز سرور برای ارتباط و دعوت',
  'حفظ انتخاب‌های ثبت‌نشده و نسخهٔ سرور',
]);
account('blocked', 'افراد مسدودشده', '/personal/settings/blocked', [
  'فهرست مسدودها و رفع مسدودی مجاز',
  'تفکیک حذف مخاطب از مسدودکردن',
]);
account('notification-categories', 'دسته‌های اعلان', '/personal/settings/notifications', [
  'اعلان‌های حساب و آموزشگاه',
  'ورود به تنظیم دستهٔ مورد نظر',
]);
for (const [category, title] of [
  ['Messages', 'پیام‌ها'],
  ['Assignments', 'تکلیف‌ها'],
  ['Results', 'نتایج'],
  ['Sessions', 'جلسه‌ها'],
  ['Reports', 'گزارش‌ها'],
  ['Invitations', 'دعوت‌ها'],
  ['AccountSecurity', 'امنیت حساب'],
])
  account(
    'notification-' + category,
    'تنظیم اعلان ' + title,
    '/personal/settings/notifications/' + category,
    ['اعلان دستگاه، پیامک و درون‌برنامه‌ای', 'رعایت اعلان‌های اجباری و ساعات سکوت'],
  );
account('notifications', 'مرکز اعلان‌ها', '/personal/notifications', [
  'فهرست اعلان‌های حساب، خوانده‌شده و خوانده‌نشده',
  'ورود به مورد مرتبط با مجوز خودش',
]);
account('devices', 'امنیت و دستگاه‌ها', '/personal/settings/devices', [
  'فهرست نشست‌ها و دستگاه فعلی',
  'پایان نشست منتخب یا دیگر دستگاه‌ها',
]);
account(
  'device-detail',
  'جزئیات یک دستگاه',
  '/personal/settings/devices',
  ['زمان ورود، اعتبار و اطلاعات نشست', 'عملیات خروج با تأیید'],
  { action: 'device-detail' },
);
account(
  'logout-dialog',
  'تأیید خروج از حساب',
  '/personal/settings/devices',
  ['تأیید روشن خروج از دستگاه', 'عدم پایان نشست پیش از تأیید'],
  { action: 'logout-dialog' },
);
const contact = (key, title, features, action) =>
  add('contacts', key, title, '/personal/contacts', 'Student', features, { action });
contact('contact-list', 'دفترچهٔ مخاطبین', [
  'فهرست و جستجوی مخاطبین',
  'نام ذخیره‌شده، برگزیده و آغاز گفتگو',
]);
contact(
  'contact-add',
  'افزودن مخاطب',
  ['حل نام کاربری یا پیوند ماکان', 'بررسی دسترسی شروع گفتگو و نام ذخیره‌شده'],
  'contact-add',
);
contact(
  'contact-search',
  'جستجوی افراد',
  ['جستجوی نام کاربری و هویت مجاز', 'نتیجه و آغاز گفتگوی مستقیم'],
  'contact-search',
);
contact(
  'contact-edit',
  'ویرایش و مدیریت مخاطب',
  ['ویرایش نام ذخیره‌شده و برگزیده', 'حذف و مسدودی به‌عنوان دو عمل مستقل'],
  'contact-edit',
);
const message = (key, title, route, features = [], options = {}) =>
  add('messaging', key, title, route, 'Student', features, options);
message('inbox', 'فهرست یکپارچهٔ گفتگوهای حساب', m, [
  'ترتیب و صفحه‌بندی سراسری سرور',
  'جستجو، خوانده‌نشده، سنجاق و زمان آخرین پیام',
]);
message(
  'inbox-menu',
  'منوی ایجاد گفتگو و مخاطب',
  m,
  ['آغاز مخاطب/گروه/کانال از مسیر مشخص', 'دکمهٔ نوشتن و ناوبری یکدست'],
  { action: 'inbox-menu' },
);
for (const [filter, title] of [
  ['Group', 'گروه‌ها'],
  ['Channel', 'کانال‌ها'],
  ['Unread', 'خوانده‌نشده'],
  ['Archived', 'آرشیو'],
  ['Saved', 'ذخیره‌شده'],
])
  message('inbox-' + filter, 'فیلتر ' + title, `${m}?filter=${filter}`, [
    'فیلتر سمت سرور و cursor مستقل',
    'حالت خالی صادقانه در نبود گفتگو',
  ]);
message('direct', 'صفحهٔ چت مستقیم', `${m}/${ids.chat}`, [
  'حباب‌های جهت‌دار، زمان و وضعیت ارسال',
  'متن، پیوست، پاسخ و منوی پیام',
]);
message(
  'saved',
  'پیام‌های ذخیره‌شده',
  `${m}/${ids.chat}`,
  ['فضای Saved با همان تاریخچهٔ معتبر', 'ارسال و نگهداری شخصی'],
  { seed: 'saved' },
);
message('peer-info', 'پروفایل فرد مقابل', `${m}/${ids.chat}/info`, [
  'هویت مجاز و تصویر مخاطب',
  'عملیات پیام، بی‌صدا و رسانه',
]);
message('peer-media', 'رسانه‌های گفتگوی مستقیم', `${m}/${ids.chat}/media`, [
  'فهرست و فیلتر پیوست‌های مجاز',
  'دریافت احراز‌شدهٔ فایل',
]);
message(
  'message-menu',
  'گزینه‌های یک پیام',
  `${m}/${ids.chat}`,
  ['پاسخ و اقدامات مجاز برای همان پیام', 'عملیات وابسته به هویت و وضعیت پیام'],
  { action: 'message-menu' },
);
message(
  'message-reply',
  'پاسخ به یک پیام',
  `${m}/${ids.chat}`,
  ['نقل پیام و بازگشت به متن اصلی', 'حفظ پیش‌نویس در تغییر اندازه'],
  { action: 'message-reply' },
);
message(
  'attachment-preview',
  'انتخاب و پیش‌نمایش پیوست پیام',
  `${m}/${ids.chat}`,
  ['انتخاب فایل، نام و پیشرفت انتقال', 'عدم ارسال فایل ناآماده و امکان لغو'],
  { action: 'message-file' },
);
for (const type of ['Group', 'Channel']) {
  const noun = type === 'Group' ? 'گروه' : 'کانال';
  message(
    type + '-room',
    'صفحهٔ گفتگوی ' + noun,
    g,
    ['ردیف پیام با هویت فرستنده', 'نمایش متن/رسانه، پاسخ و وضعیت معتبر'],
    { seed: type },
  );
  for (const [section, title, facts] of [
    ['info', 'اطلاعات', ['هویت و توضیحات گفتگو', 'دسترسی سریع به اعضا، رسانه و تنظیمات']],
    ['edit', 'ویرایش', ['نام، توضیحات و عکس JPEG/PNG', 'expectedVersion و حفظ پیش‌نویس در تعارض']],
    ['settings', 'تنظیمات', ['عمومی/خصوصی و تاریخچهٔ عضو جدید', 'کنترل مستقل canChangeSettings']],
    ['members', 'اعضا و مدیران', ['فهرست اعضا و نقش‌ها', 'افزودن و مدیریت فقط با قابلیت مؤثر']],
    ['media', 'رسانه و فایل', ['فیلتر رسانه و صفحه‌بندی', 'نمایش/دریافت با مجوز فایل']],
    [
      'invites',
      'لینک‌ها و درخواست‌های عضویت',
      ['ساخت و لغو لینک و تأیید درخواست', 'انقضا و مجوز از سرور'],
    ],
  ])
    message(type + '-' + section, title + ' ' + noun, g + '/' + section, facts, { seed: type });
  message(
    type + '-add-member',
    'افزودن عضو به ' + noun,
    g + '/members',
    ['جستجوی مخاطب و افزودن مجاز', 'پذیرش نهایی و خطا از سرور'],
    { seed: type, action: 'member-add' },
  );
  message(
    type + '-member-role',
    'مدیریت نقش عضو ' + noun,
    g + '/members',
    ['مدیریت اعضا و مدیران دو مجوز جدا هستند', 'تأیید تغییر نقش یا پایان عضویت'],
    { seed: type, action: 'member-manage' },
  );
  message(
    type + '-photo',
    'پیش‌نمایش عکس ' + noun,
    g + '/edit',
    ['انتخاب JPEG/PNG و پیش‌نمایش', 'upload، Ready و اتصال نسخه‌دار مستقل'],
    { seed: type, action: 'group-photo' },
  );
  message(
    type + '-invite-new',
    'ساخت لینک دعوت ' + noun,
    g + '/invites',
    ['محدودیت استفاده و نیاز به تأیید', 'شناسهٔ فرمان پایدار برای تلاش مجدد'],
    { seed: type, action: 'invite-new' },
  );
  for (const step of [1, 2])
    message(
      type + '-create-' + step,
      `ساخت ${noun} - مرحلهٔ ${step}`,
      `${m}/new?kind=${type === 'Group' ? 'groups' : 'channels'}`,
      ['نام و توضیحات در مرحلهٔ اول', 'انتخاب مخاطبین اولیه در مرحلهٔ دوم'],
      { action: step === 2 ? 'create-step2' : undefined },
    );
}
message(
  'topics',
  'موضوع‌های گروه',
  g + '/topics',
  ['فهرست، ایجاد و باز/بسته‌کردن موضوع', 'رعایت canManageTopics'],
  { seed: 'Group', action: 'topic-seed' },
);
message(
  'topic-close',
  'تأیید تغییر وضعیت موضوع',
  g + '/topics',
  ['تأیید بستن/بازکردن موضوع', 'نمایش خطا داخل همان تأیید'],
  { seed: 'Group', action: 'topic-dialog' },
);
message(
  'join-preview',
  'ورود کد دعوت گفتگو',
  m + '/join',
  ['دریافت کد دعوت از پیوند یا ورود دستی', 'پیوستن یا درخواست عضویت'],
  { seed: 'Channel', action: 'join-preview', role: 'Parent' },
);
message(
  'join-pending',
  'رسید درخواست عضویت',
  m + '/join',
  ['در انتظار تأیید با عضو فعال متفاوت است', 'عدم ورود زودهنگام به محتوای خصوصی'],
  { seed: 'Channel', action: 'join-pending', role: 'Parent' },
);
message(
  'initial-pending',
  'نتیجهٔ دعوت اعضای اولیه',
  m + '/new?kind=groups',
  ['Added / InvitationPending / NotAvailable جدا هستند', 'تاریخ انقضا از پاسخ سرور'],
  { action: 'initial-pending' },
);
const school = (key, title, route, role = 'Student', features = [], options = {}) =>
  add('school', key, title, route, role, features, options);
for (const role of ['Student', 'Teacher', 'Manager', 'Parent'])
  school(
    'overview-' + role,
    'نمای آموزشگاه - ' +
      { Student: 'دانشجو', Teacher: 'استاد', Manager: 'مدیر', Parent: 'والد' }[role],
    e,
    role,
    ['نمای متناسب نقش و دادهٔ مجاز', 'دسترسی به کلاس، برنامه و دعوت‌ها'],
    { seed: role === 'Manager' ? 'manager' : undefined, child: role === 'Parent' },
  );
school(
  'no-school',
  'انتخاب آموزشگاه از حساب شخصی',
  e,
  'Personal',
  ['انتخاب عضویت مجاز و حالت بدون آموزشگاه', 'عدم ساخت نقش با انتخاب رابط'],
  { school: false, status: 'state' },
);
school(
  'parent-child',
  'انتخاب فرزند مجاز',
  e,
  'Parent',
  ['نمایش فقط رابطهٔ والد معتبر', 'اطلاعات آموزشی پس از انتخاب فرزند'],
  { child: false },
);
school('classes', 'کلاس‌های دانشجو', e + '/classes', 'Student', [
  'کارت کلاس و محتوای مجاز',
  'ورود به صفحهٔ مستقل کلاس',
]);
school('classes-teacher', 'کلاس‌های استاد', e + '/classes', 'Teacher', [
  'کلاس‌های منتسب و دسترسی تولید محتوا',
  'ناوبری فعالیت و اعضا',
]);
for (const [tab, title] of [
  ['sessions', 'جلسه‌ها و برنامهٔ هفتگی'],
  ['lessons', 'درس و جزوه'],
  ['assignments', 'تکلیف‌ها'],
  ['exams', 'آزمون‌ها'],
  ['members', 'اعضای کلاس'],
])
  school('class-' + tab, title + ' در کلاس', c + '?tab=' + tab, 'Teacher', [
    'ناوبری مبتنی بر URL و نقش',
    'فهرست و عملیات مجاز همین کلاس',
  ]);
school('schedule', 'برنامهٔ هفتگی آموزشگاه', e + '/schedule', 'Teacher', [
  'جابجایی هفته و بازگشت به هفتهٔ جاری',
  'نمایش وضعیت و بازهٔ زمانی جلسه',
]);
school('school-search', 'جستجوی یکپارچهٔ آموزشی', e + '/search', 'Teacher', [
  'جستجوی کلاس، تکلیف، آزمون و جزوه',
  'نتیجهٔ مجاز و ورود به منبع',
]);
school('school-invitations', 'دعوت‌های عضویت و رضایت', e + '/invitations', 'Parent', [
  'فیلتر دعوت‌ها، جزئیات و وضعیت',
  'پذیرش با رضایت لازم و رد دعوت',
]);
school(
  'official-activity',
  'کارت فعالیت در گروه رسمی',
  m + '/' + id(970),
  'Teacher',
  ['نشان فضای رسمی و وابستگی به کلاس', 'کارت فعالیت معتبر و ورود به منبع'],
  { seed: 'official' },
);
school('session-detail', 'جزئیات جلسه', e + '/sessions/' + id(300), 'Teacher', [
  'زمان، وضعیت و لینک مجاز جلسه',
  'ویرایش، تکمیل یا لغو با تأیید',
]);
school('session-new', 'ایجاد جلسهٔ کلاس', c + '/sessions/new', 'Teacher', [
  'عنوان، شروع و پایان جلسه',
  'بازبینی پیش از ثبت',
]);
school(
  'session-review',
  'بازبینی جلسهٔ جدید',
  c + '/sessions/new',
  'Teacher',
  ['بازبینی زمان و اطلاعات', 'ثبت فقط پس از تأیید'],
  { action: 'session-review' },
);
school('session-edit', 'ویرایش جلسه', e + '/sessions/' + id(300) + '/edit', 'Teacher', [
  'ویرایش نسخه‌دار اطلاعات جلسه',
  'رعایت ترتیب زمان و وضعیت',
]);
school(
  'session-cancel',
  'تأیید لغو جلسه',
  e + '/sessions/' + id(300),
  'Teacher',
  ['تأیید صریح لغو', 'خطا به معنی انجام‌شدن لغو نیست'],
  { action: 'session-cancel' },
);
school('lesson-list', 'درس‌ها و جزوه‌های کلاس', e + '/resources', 'Student', [
  'انتخاب کلاس و ورود به منابع آموزشی',
  'خواندن محتوای منتشرشده',
]);
school('lesson-read', 'مطالعهٔ درس منتشرشده', e + '/lessons/' + ids.lesson, 'Student', [
  'متن درس و پیوست مجاز',
  'بدون ویرایش محتوای منتشرشده',
]);
school('lesson-new', 'ایجاد درس و جزوه', c + '/lessons/new', 'Teacher', [
  'عنوان، متن و پیوست',
  'ذخیرهٔ پیش‌نویس و بازبینی',
]);
school(
  'lesson-edit',
  'ویرایش پیش‌نویس درس',
  c + '/lessons/new',
  'Teacher',
  ['ویرایش نسخه‌دار پیش‌نویس', 'عدم ویرایش نسخهٔ منتشرشده'],
  { action: 'lesson-edit' },
);
school(
  'lesson-review',
  'بازبینی و انتشار درس',
  c + '/lessons/new',
  'Teacher',
  ['پیش‌نمایش متن و پیوست', 'انتشار صریح برای مخاطبان کلاس'],
  { action: 'lesson-review' },
);
school('assignments', 'فهرست تکلیف‌ها', e + '/assignments', 'Student', [
  'فهرست، جستجو و وضعیت تکلیف',
  'ورود به تکلیف و تاریخچهٔ تلاش',
]);
school('assignment-detail', 'جزئیات تکلیف برای دانشجو', a, 'Student', [
  'مهلت، نمره و شرایط تحویل',
  'آغاز پاسخ و مشاهدهٔ تلاش‌ها',
]);
school('assignment-new', 'ایجاد تکلیف کلاس', c + '/assignments/new', 'Teacher', [
  'متن، مهلت، دفعات تلاش و نمره',
  'نسخهٔ پیش‌نویس مستقل',
]);
school(
  'assignment-edit',
  'ویرایش پیش‌نویس تکلیف',
  a + '/edit',
  'Teacher',
  ['ویرایش محتوا و سیاست تحویل', 'توکن نسخه و حفظ پیش‌نویس'],
  { seed: 'assignment-draft' },
);
school(
  'assignment-review',
  'بازبینی و انتشار تکلیف',
  a + '/publish-review',
  'Teacher',
  ['بازبینی اطلاعات قبل از انتشار', 'تأیید انتشار نسخه برای کلاس'],
  { seed: 'assignment-draft' },
);
for (const [stage, title] of [
  ['answer', 'پاسخ و پیوست تکلیف'],
  ['review', 'بازبینی پاسخ تکلیف'],
  ['receipt', 'رسید تحویل تکلیف'],
])
  school(
    'submission-' + stage,
    title,
    a + '/answer',
    'Student',
    ['ذخیرهٔ پیش‌نویس و فایل آماده', 'ثبت نهایی و رسید فقط پس از تأیید سرور'],
    { action: 'submission-' + stage },
  );
school(
  'assignment-history',
  'تاریخچهٔ تحویل تکلیف',
  a + '/history',
  'Student',
  ['تلاش‌ها و وضعیت انتشار نتیجه', 'ورود به نتیجهٔ مجاز'],
  { seed: 'assessments' },
);
school('exams', 'فهرست آزمون‌ها', e + '/exams', 'Student', [
  'وضعیت و شرایط آزمون',
  'ورود به نسخهٔ مجاز',
]);
school('exam-before', 'پیش از شروع آزمون', x, 'Student', [
  'زمان و مدت، دفعات و وضعیت شرکت',
  'آغاز آزمون با مجوز سرور',
]);
for (const [action, title] of [
  ['exam-taking', 'پاسخ‌دادن به آزمون'],
  ['exam-review', 'مرور پاسخ‌های آزمون'],
  ['exam-receipt', 'رسید ثبت نهایی آزمون'],
])
  school(
    action,
    title,
    x,
    'Student',
    ['ذخیرهٔ پاسخ و زمان معتبر سرور', 'بازبینی و ثبت نهایی کنترل‌شده'],
    { action },
  );
school('exam-new', 'ایجاد آزمون کلاس', c + '/exams/new', 'Teacher', [
  'زمان دسترسی، مدت، دفعات و نمره',
  'ایجاد پیش‌نویس پیش از پرسش‌ها',
]);
for (const [action, title] of [
  ['exam-author-edit', 'ویرایش پیش‌نویس آزمون'],
  ['exam-question', 'افزودن پرسش و سیاست پیوست'],
  ['exam-publish', 'بازبینی و انتشار آزمون'],
])
  school(
    action,
    title,
    c + '/exams/new',
    'Teacher',
    ['نسخهٔ آزمون و پرسش‌های آن', 'سیاست فایل، نمره و انتشار صریح'],
    { action },
  );
const ev = e + '/submissions/' + ids.attempt,
  gr = e + '/exam-submissions/' + ids.examAttempt;
school(
  'evaluation-queue',
  'صف ارزیابی تکلیف‌ها',
  e + '/evaluations',
  'Teacher',
  ['فیلتر پاسخ‌های قابل ارزیابی', 'وضعیت پیش‌نویس، انتشار و اصلاحیه'],
  { seed: 'assessments' },
);
school(
  'evaluation-edit',
  'ارزیابی پاسخ تکلیف',
  ev + '/evaluate',
  'Teacher',
  ['نمره و بازخورد دانشجو/والد', 'یادداشت خصوصی ارزیاب و پیوست پاسخ'],
  { seed: 'assessments' },
);
school(
  'evaluation-review',
  'بازبینی انتشار ارزیابی تکلیف',
  ev + '/evaluate',
  'Teacher',
  ['بازبینی مخاطبان بازخورد', 'عدم نمایش یادداشت خصوصی در نتیجه'],
  { seed: 'assessments', action: 'evaluation-review' },
);
school(
  'assignment-result',
  'نتیجهٔ منتشرشدهٔ تکلیف',
  ev + '/result',
  'Student',
  ['نمایش نمره و بازخورد مجاز دانشجو', 'عدم نمایش یادداشت خصوصی و بازخورد ویژهٔ والد'],
  { seed: 'assessments', action: 'assignment-result' },
);
school(
  'grading-queue',
  'صف تصحیح آزمون',
  x + '/grading',
  'Teacher',
  ['فهرست پاسخ‌برگ‌های قابل تصحیح', 'وضعیت تصحیح و انتشار'],
  { seed: 'assessments' },
);
for (const [action, title] of [
  ['grading', 'تصحیح پاسخ‌برگ آزمون'],
  ['grading-question', 'تصحیح یک پرسش'],
  ['grading-review', 'بازبینی نتیجهٔ آزمون'],
  ['exam-result', 'نتیجهٔ منتشرشدهٔ آزمون'],
])
  school(
    action,
    title,
    gr + '/grading',
    action === 'exam-result' ? 'Student' : 'Teacher',
    ['ذخیره، تکمیل و انتشار سه مرحلهٔ مستقل', 'تفکیک بازخورد دانشجو، والد و یادداشت خصوصی'],
    { seed: 'assessments', action },
  );
const manager = (key, title, route, features = [], options = {}) =>
  add('manager', key, title, route, 'Manager', features, { seed: 'manager', ...options });
manager('manager-classes', 'کلاس‌های مدیر', e + '/classes', [
  'فهرست کلاس‌ها و جستجو',
  'ایجاد و ورود به مدیریت هر کلاس',
]);
for (const [tab, title] of [
  ['members', 'اعضا'],
  ['sessions', 'جلسه‌ها'],
  ['lessons', 'درس و جزوه'],
  ['assignments', 'تکلیف‌ها'],
  ['exams', 'آزمون‌ها'],
  ['reports', 'گزارش کلاس'],
])
  manager('manager-class-' + tab, 'مدیریت کلاس - ' + title, c + '?tab=' + tab, [
    'دسترسی در محدودهٔ آموزشگاه فعلی',
    'عملیات مرتبط همین کلاس',
  ]);
manager('class-new', 'ایجاد کلاس آموزشگاه', e + '/classes/new', [
  'نام، ظرفیت، کاتالوگ درس و دوره',
  'بازبینی پیش از ثبت',
]);
manager(
  'class-review',
  'بازبینی کلاس جدید',
  e + '/classes/new',
  ['مرور اطلاعات انتخاب‌شده', 'شناسهٔ فرمان پایدار و تأیید ثبت'],
  { action: 'class-review' },
);
manager('class-add-teachers', 'افزودن چند معلم به کلاس', c + '/teachers/new', [
  'انتخاب چندتایی افراد واجد شرایط',
  'موفقیت و خطای هر عضو مستقل',
]);
manager('class-add-students', 'ثبت‌نام چند دانشجو در کلاس', c + '/enrollments/new', [
  'انتخاب دانشجویان مجاز آموزشگاه',
  'ثبت و پایان رابطهٔ کلاس',
]);
manager('members', 'اعضا و نقش‌های آموزشگاه', e + '/members', [
  'جستجو، فیلتر نقش و وضعیت',
  'نمایش هویت و پروندهٔ مرتبط',
]);
manager('people', 'پرونده‌های افراد', e + '/people', [
  'فهرست افراد و فیلترهای سرور',
  'بازکردن یا ایجاد پرونده',
]);
manager('person-new', 'ایجاد پروندهٔ فرد', e + '/people/new', [
  'نام، اطلاعات مجاز و دلیل ثبت',
  'بازبینی و ثبت نسخه‌دار',
]);
manager('person-detail', 'جزئیات پروندهٔ فرد', e + '/people/' + id(830), [
  'هویت و وضعیت پیوند حساب',
  'نام‌ها و عملیات طبق canEditNames',
]);
manager(
  'person-edit',
  'ویرایش پروندهٔ فرد',
  e + '/people/new',
  ['نگهداری دلیل و نسخهٔ پرونده', 'عدم ویرایش نام‌های قفل‌شده'],
  { action: 'person-edit', seed: 'workflow' },
);
manager('guardians', 'رابطهٔ والد و فرزند', e + '/guardians', [
  'فهرست روابط مجاز',
  'دعوت و پایان رابطه طبق مجوز',
]);
manager('guardian-new', 'ایجاد دعوت والد', e + '/guardians/new', [
  'انتخاب پروندهٔ دانشجو و اطلاعات مخاطب',
  'رضایت و پذیرش توسط دریافت‌کننده',
]);
manager('manager-invitations', 'مدیریت دعوت‌های آموزشگاه', e + '/invitations', [
  'دسترسی به دعوت والد و پرونده‌ها',
  'نمایش وضعیت دعوت‌های مجاز',
]);
manager('course-new', 'ایجاد درس در کاتالوگ', e + '/courses/new', [
  'عنوان و شناسهٔ درس',
  'بازبینی پیش از ایجاد',
]);
manager('period-new', 'ایجاد دورهٔ آموزشی', e + '/periods/new', [
  'عنوان و بازهٔ زمانی دوره',
  'اعتبارسنجی و بازبینی',
]);
for (const [kind, title] of [
  ['teacher-workload', 'کارکرد معلمان'],
  ['attendance', 'حضور کلاس‌ها'],
  ['assessments', 'تکلیف‌ها و آزمون‌ها'],
  ['enrollments', 'ثبت‌نام‌ها'],
])
  manager('report-' + kind, 'گزارش مدیر - ' + title, e + '/reports?kind=' + kind, [
    'فیلتر کلاس و صفحه‌بندی گزارش',
    'حالت خالی بدون آمار ساختگی',
  ]);
for (const [key, title, route] of [
  ['parent-classes', 'کلاس‌های فرزند', e + '/classes'],
  ['parent-class', 'جزئیات کلاس فرزند', c],
  ['parent-schedule', 'برنامهٔ فرزند', e + '/schedule'],
  ['parent-assignments', 'گزارش تکلیف‌های فرزند', e + '/assignments'],
  ['parent-exams', 'گزارش آزمون‌های فرزند', e + '/exams'],
])
  add(
    'parent',
    key,
    title,
    route,
    'Parent',
    ['رابطهٔ معتبر و فرزند انتخاب‌شده', 'فقط داده و بازخورد منتشرشدهٔ مجاز'],
    { child: true },
  );
for (const [scope, title] of [
  ['Personal', 'شخصی'],
  ['Class', 'کلاس'],
  ['Organization', 'آموزشگاه'],
  ['Library', 'کتابخانه'],
])
  add(
    'sources',
    'sources-' + scope,
    'منابع ' + title,
    '/personal/resources',
    scope === 'Organization' ? 'Manager' : 'Student',
    ['جستجو و صفحه‌بندی منابع همان فضا', 'تفکیک fileReady، sourceReady و aiReady'],
    {
      school: scope !== 'Personal' && scope !== 'Library',
      action: 'source-scope-' + scope,
      status: scope === 'Library' ? 'limited' : 'connected',
    },
  );
add(
  'sources',
  'source-detail',
  'جزئیات و مدیریت منبع',
  '/personal/resources/' + ids.source,
  'Student',
  [
    'عنوان، وضعیت فایل/منبع/AI و revision',
    'ویرایش، انتشار، بایگانی، نمایش و نسخهٔ جدید طبق capability',
  ],
);
add(
  'sources',
  'source-library',
  'جزئیات منبع کتابخانه',
  '/personal/resources/' + ids.library,
  'Student',
  ['فقط metadata عمومی منتشرشده', 'فایل و استفاده در AI در دسترس نیست'],
  { status: 'limited' },
);
add(
  'sources',
  'source-file',
  'بارگذاری و ثبت منبع',
  '/personal/resources',
  'Student',
  ['بارگذاری فایل جدا از ایجاد منبع', 'فرمان پایدار و نگهداری فایل آماده'],
  { action: 'source-file' },
);
add(
  'sources',
  'source-version',
  'نسخهٔ جدید منبع',
  '/personal/resources/' + ids.source,
  'Student',
  ['فایل و نسخهٔ جدید با token معتبر', 'بازبینی تعارض پیش از ایجاد دوباره'],
  { action: 'source-version' },
);
add('commerce', 'personal-classes', 'کلاس‌های شخصی', '/personal/classes', 'Student', [
  'مستقل از نقش و فضای آموزشگاه',
  'ایجاد، اعضا و بایگانی مجاز',
]);
add('commerce', 'personal-class-new', 'ایجاد کلاس شخصی', '/personal/classes/new', 'Student', [
  'نام و توضیحات کلاس شخصی',
  'ثبت مستقل از عضویت آموزشگاه',
]);
add(
  'commerce',
  'personal-class-detail',
  'جزئیات کلاس شخصی',
  '/personal/classes',
  'Student',
  ['اطلاعات، اعضا و بایگانی', 'مرزبندی مستقل از کلاس رسمی'],
  { action: 'personal-class-detail' },
);
add('commerce', 'subscription', 'اشتراک و مصرف شخصی', '/personal/subscription', 'Student', [
  'پلن جاری، سهمیه و مصرف واقعی',
  'کاتالوگ، پیش‌فاکتور و سفارش مجاز',
]);
add(
  'commerce',
  'subscription-org',
  'اشتراک آموزشگاه',
  '/personal/subscription?scope=organization',
  'Manager',
  ['خریدار آموزشگاه و مجوز مدیر', 'مصرف و entitlement بدون جایگزینی با پرداخت‌کنندهٔ شخصی'],
  { school: true },
);
add(
  'commerce',
  'quote',
  'پیش‌فاکتور و سفارش در انتظار',
  '/personal/subscription',
  'Student',
  ['بررسی قیمت و اعتبار زمانی پیش‌فاکتور', 'ثبت سفارش، بدون ادعای پرداخت موفق'],
  { action: 'quote' },
);
for (const [action, title, status] of [
  ['assistant-base', 'گفتگو با دستیار پیش از فعال‌سازی', 'limited'],
  ['assistant-sources', 'منابع واقعی و نمونهٔ دستیار', 'limited'],
  ['assistant-chat', 'پرسش و پاسخ نمونه با استناد', 'demo'],
  ['assistant-studio', 'استودیوی مطالعه', 'demo'],
  ['assistant-summary', 'خلاصهٔ نمونه', 'demo'],
  ['assistant-cards', 'فلش‌کارت نمونه', 'demo'],
  ['assistant-quiz', 'خودآزمایی نمونه', 'demo'],
  ['assistant-map', 'نقشهٔ مفهومی نمونه', 'demo'],
  ['assistant-audio', 'طرح مرور شنیداری', 'limited'],
  ['assistant-guide', 'راهنمای مطالعهٔ نمونه', 'demo'],
])
  add(
    'assistant',
    action,
    title,
    '/personal/assistant',
    'Student',
    ['پوستهٔ واقعی محصول و تب‌های منابع/گفتگو/استودیو', 'نمونه و وضعیت سرویس فعال از هم مشخص‌اند'],
    { action, status },
  );
add(
  'assistant',
  'assistant-preflight',
  'بررسی دسترسی منابع واقعی دستیار',
  '/personal/assistant',
  'Student',
  ['انتخاب منابع مجاز و preflight بدون مصرف اعتبار', 'حفظ انتخاب در نبود بازیابی محتوا'],
  { action: 'assistant-preflight', status: 'limited' },
);
for (const [key, title, route, options] of [
  ['empty-messages', 'فهرست خالی پیام‌ها', m + '?q=بدون_نتیجه_مستند', {}],
  [
    'service-error',
    'خطای دریافت و امکان تلاش مجدد',
    '/personal/resources',
    { action: 'service-error' },
  ],
  ['permission-denied', 'نمای دسترسی محدود', e + '/reports', { school: true }],
  [
    'source-pending',
    'انتظار آماده‌شدن فایل منبع',
    '/personal/resources',
    { action: 'source-pending' },
  ],
  [
    'source-conflict',
    'تعارض نسخه و حفظ متن منبع',
    '/personal/resources/' + ids.source,
    { action: 'source-conflict' },
  ],
  [
    'profile-save-error',
    'خطای ذخیره و حفظ ویرایش پروفایل',
    '/personal/profile/edit',
    { action: 'profile-save-error' },
  ],
])
  add(
    'states',
    key,
    title,
    route,
    'Student',
    ['پیام روشن و اقدام قابل فهم', 'عدم نمایش موفقیت پیش از تأیید سرور'],
    { status: 'state', allowErrors: true, ...options },
  );
for (const [key, title, route, seed, action] of [
  ['dark-profile', 'پروفایل', '/personal/profile'],
  ['dark-inbox', 'صندوق پیام‌ها', m],
  ['dark-direct', 'چت مستقیم', m + '/' + ids.chat],
  ['dark-group', 'چت گروه', g, 'Group'],
  ['dark-settings', 'تنظیمات', '/personal/settings'],
  ['dark-education', 'آموزشگاه', e, undefined, undefined],
  ['dark-resources', 'منابع', '/personal/resources'],
  ['dark-assistant', 'دستیار', '/personal/assistant', undefined, 'assistant-chat'],
])
  add(
    'themes',
    key,
    'تم تاریک - ' + title,
    route,
    'Student',
    ['همان اجزا و رفتار در تم تاریک', 'رنگ و کنتراست مشترک در محصول'],
    {
      theme: 'dark',
      seed,
      action,
      school: key === 'dark-education',
      status: key === 'dark-assistant' ? 'demo' : 'connected',
      tablet: true,
    },
  );
add(
  'school',
  'evaluation-correction',
  'اصلاح ارزیابی منتشرشده',
  e + '/submissions/' + ids.attempt + '/evaluate?correction=1',
  'Teacher',
  ['دلیل اصلاح، نمره و بازخوردها', 'نسخهٔ اصلاحیه مستقل از نتیجهٔ منتشرشده'],
  { seed: 'assessments', action: 'evaluation-correction' },
);
add(
  'school',
  'grading-correction',
  'اصلاح نتیجهٔ منتشرشدهٔ آزمون',
  e + '/exam-submissions/' + ids.examAttempt + '/grading?correction=1',
  'Teacher',
  ['دلیل اصلاح و ساخت پیش‌نویس اصلاحیه', 'نتیجهٔ منتشرشدهٔ قبلی تا انتشار تازه حفظ می‌شود'],
  { seed: 'assessments', action: 'grading-correction' },
);
add(
  'messaging',
  'attachment-options',
  'گزینه‌های انتخاب پیوست پیام',
  m + '/' + ids.chat,
  'Student',
  ['دوربین، گالری عکس، ویدئو و فایل', 'انتخاب و پیش‌نمایش پیش از ارسال'],
  { action: 'attachment-options' },
);
add(
  'messaging',
  'leave-confirm',
  'تأیید ترک گروه',
  g + '/info',
  'Student',
  ['تأیید روشن پایان عضویت', 'رعایت انتقال مدیریت و پاسخ سرور'],
  { seed: 'Group', action: 'leave-confirm' },
);
for (const [action, title] of [
  ['source-publish-confirm', 'تأیید انتشار منبع'],
  ['source-archive-confirm', 'تأیید بایگانی منبع'],
  ['source-visibility-confirm', 'تأیید تغییر نمایش منبع'],
])
  add(
    'sources',
    action,
    title,
    '/personal/resources/' + ids.source,
    'Student',
    ['دلیل تغییر و token نسخهٔ فعلی', 'تأیید صریح پیش از اجرای عملیات'],
    { action },
  );
add(
  'account',
  'quiet-hours',
  'تنظیم ساعات سکوت اعلان',
  '/personal/settings/notifications/Messages',
  'Student',
  ['شروع و پایان ساعات سکوت', 'منطقهٔ زمانی و اعمال پس از ثبت'],
  { action: 'quiet-hours' },
);
add(
  'account',
  'roleless-profile',
  'پروفایل حساب شخصی بدون نقش آموزشی',
  '/personal/profile',
  'Personal',
  ['فضای شخصی قابل ورود و هویت حساب', 'امکانات مستقل بدون ساخت نقش آموزشی'],
);
add(
  'school',
  'exam-descriptive',
  'پاسخ آزمون تشریحی و پیوست فایل',
  x,
  'Student',
  ['پاسخ متنی یا فایل مطابق سیاست پرسش', 'آماده‌شدن فایل، حجم و تعداد مجاز'],
  { seed: 'exam-descriptive', action: 'exam-descriptive' },
);
add(
  'states',
  'offline-page',
  'صفحهٔ آفلاین برنامه',
  '/offline.html',
  'Public',
  ['راهنمای قطع ارتباط و بازگشت به پنل', 'صفحهٔ آماده برای fallback آفلاین'],
  { status: 'state' },
);
add(
  'account',
  'install-help',
  'راهنمای نصب روی دستگاه',
  '/personal/settings',
  'Student',
  ['راهنمای نصب برای مرورگر و دستگاه', 'تفکیک راهنمای نصب از نصب واقعی دستگاه'],
  { action: 'install-help', status: 'limited' },
);
export { entries };
