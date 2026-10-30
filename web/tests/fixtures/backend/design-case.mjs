import { make, id, ids } from './state.mjs';
export function seedReferenceCase(state) {
  state.design = true;
  for (const [n, firstName, lastName, username] of [
    [101, 'سارا', 'احمدی', 'sara.ahmadi'],
    [102, 'مریم', 'رضایی', 'maryam.rezaei'],
    [103, 'امید', 'احمدی', 'omid.ahmadi'],
    [104, 'امید', 'رضایی', 'omid.rezaei'],
  ])
    Object.assign(state.users.get(id(n)), {
      firstName,
      lastName,
      displayName: firstName + ' ' + lastName,
      username,
    });
  state.lessons.get(ids.lesson).title = 'معادله‌های خطی';
  state.lessons.get(ids.lesson).body =
    'در یک معادله خطی، مجهول توان اول دارد. برای یافتن x، در دو طرف معادله عمل یکسان انجام می‌دهیم.';
  state.designClasses = [
    ['ریاضی نهم', 'ریاضی نهم'],
    ['زبان انگلیسی', 'زبان'],
    ['علوم تجربی', 'علوم'],
  ].map(([title, courseTitle], i) =>
    make('ClassResult', {
      id: i ? id(20 + i) : ids.class,
      organizationId: ids.org,
      title,
      courseTitle,
      academicPeriodTitle: 'فصل سوم',
      status: 'Active',
      capacity: 20,
    }),
  );
  state.messages = [
    'سلام سارا، تمرین معادله‌ها را دیدم. مسیر حل مسئله را خیلی خوب توضیح داده بودی.',
    'سلام خانم رضایی، ممنونم. برای سؤال سوم یک راه حل دیگر هم پیدا کردم.',
    'عالیه! در جلسهٔ بعدی درباره‌اش صحبت می‌کنیم.',
    'حتماً، تا جلسهٔ بعد.',
  ].map((text, i) =>
    make('ConversationMessageResult', {
      messageId: id(11000 + i),
      conversationId: ids.chat,
      clientMessageId: id(12000 + i),
      senderUserId: id(i % 2 ? 101 : 102),
      sender: make('SafeMessagingIdentityResult', {
        userId: id(i % 2 ? 101 : 102),
        displayName: i % 2 ? 'سارا احمدی' : 'مریم رضایی',
        username: i % 2 ? 'sara.ahmadi' : 'maryam.rezaei',
      }),
      text,
      kind: 'Text',
      sequence: i + 1,
      sentAtUtc: `2026-10-29T12:${String(38 + i).padStart(2, '0')}:00Z`,
      createdAtUtc: `2026-10-29T12:${String(38 + i).padStart(2, '0')}:00Z`,
      attachments: [],
    }),
  );
}
export const referenceChild = () =>
  make('AuthorizedChildResult', {
    learnerOrganizationPersonId: id(501),
    displayName: 'سارا احمدی',
    organizationId: ids.org,
    organizationName: 'آموزشگاه آفتاب',
    relationStatus: 'Active',
  });
export function referenceDashboard(role, context) {
  const next = make('DashboardSessionItem2', {
    sessionId: id(300),
    classId: ids.class,
    classTitle: 'ریاضی نهم',
    title: 'ریاضی نهم',
    startUtc: '2026-10-29T13:00:00Z',
    endUtc: '2026-10-29T14:00:00Z',
    meetingUrl: null,
    status: 'Scheduled',
  });
  const task = make('DashboardAssignmentItem2', {
    assignmentId: ids.assignment,
    assignmentVersionId: id(301),
    classId: ids.class,
    classTitle: 'ریاضی نهم',
    title: 'تمرین فصل سوم',
    dueAtUtc: '2026-10-30T16:30:00Z',
  });
  const row = make(role + 'DashboardDto', { organizationId: ids.org });
  if (role === 'Student')
    Object.assign(row, {
      nextSession: next,
      nearestAssignmentDeadline: task,
      pendingAssignmentCount: 2,
    });
  else if (role === 'Manager')
    Object.assign(row, {
      upcomingSessions: [next],
      operationalCounts: make('ManagerOperationalCounts', {
        activeClassCount: 26,
        enrolledLearnerCount: 248,
        teacherCount: 18,
      }),
    });
  else if (role === 'Teacher')
    Object.assign(row, {
      upcomingSessions: [next],
      assignedClasses: [make('DashboardClassItem', { classId: ids.class })],
    });
  else if (role === 'Parent')
    Object.assign(row, {
      selectedLearner: context.subjectOrganizationPersonId
        ? { learnerOrganizationPersonId: id(501), displayName: 'سارا احمدی' }
        : null,
      upcomingSessions: [next],
      assignments: [task],
      attendanceSummary: make('DashboardAttendanceSummary', {
        recordedCount: 12,
        presentCount: 12,
        notRecordedCount: 1,
      }),
      attentionItemCount: 1,
    });
  return row;
}
