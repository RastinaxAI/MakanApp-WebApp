import type { components } from '@/generated/api/schema';

export const routes = {
  enter: '/enter',
  personal: '/personal',
  education: '/personal/education',
  messages: '/personal/messages',
  contacts: '/personal/contacts',
  assistant: '/personal/assistant',
  profile: '/personal/profile',
  profileEdit: '/personal/profile/edit',
  settings: '/personal/settings',
} as const;
export const roleLabels = {
  Manager: 'مدیر آموزشگاه',
  Teacher: 'استاد',
  Student: 'دانشجو',
  Parent: 'والدین',
} as const;
export type SchoolRole = keyof typeof roleLabels;
export const isSchoolRole = (value: unknown): value is SchoolRole =>
  typeof value === 'string' && Object.hasOwn(roleLabels, value);
export const navigation = [
  { href: routes.education, name: 'آموزشگاه', icon: 'education' },
  { href: routes.assistant, name: 'دستیار ماکان', icon: 'assistant' },
  { href: routes.messages, name: 'پیام‌ها', icon: 'messages' },
  { href: routes.profile, name: 'پروفایل', icon: 'profile' },
] as const;
export function activeNavigation(path: string) {
  if (path.startsWith('/personal/subscription') || path.startsWith('/personal/classes'))
    return routes.profile;
  if (path === routes.personal) return routes.education;
  if (path === '/personal/ai') return routes.assistant;
  if (path === routes.contacts) return routes.messages;
  if (path.startsWith(routes.settings) || path === '/personal/privacy') return routes.profile;
  return navigation.find((item) => path === item.href || path.startsWith(item.href + '/'))?.href;
}
export function isMessageRoom(path: string) {
  return /^\/personal\/messages\/[0-9a-f-]{36}$/i.test(path);
}
/** Semantic fallback for direct entry; never navigate outside the app via browser history. */
export function defaultBackTarget(path: string) {
  if (path === routes.settings || path.startsWith(routes.profile + '/')) return routes.profile;
  if (path.startsWith(routes.settings + '/')) return path.slice(0, path.lastIndexOf('/'));
  if (path === routes.contacts || path === routes.messages + '/new') return routes.messages;
  if (path.startsWith(routes.messages + '/')) {
    const parts = path.split('/');
    return parts.length > 4 ? parts.slice(0, 4).join('/') : routes.messages;
  }
  if (path.startsWith(routes.education + '/')) {
    const parts = path.slice(routes.education.length + 1).split('/'),
      [area, id, action] = parts;
    if (parts.length === 1) return routes.education;
    if (area === 'classes')
      return parts.length > 2 ? `${routes.education}/classes/${id}` : `${routes.education}/classes`;
    if (area === 'exams' && action === 'questions') return `${routes.education}/exams/${id}/edit`;
    if (area === 'exam-submissions')
      return action === 'questions' || action === 'grading-review'
        ? `${routes.education}/exam-submissions/${id}/grading`
        : `${routes.education}/exams`;
    if (area === 'submissions') return `${routes.education}/evaluations`;
    if (['lessons', 'assignments', 'exams', 'sessions', 'people'].includes(area))
      return parts.length > 2 ? `${routes.education}/${area}/${id}` : `${routes.education}/classes`;
    return routes.education;
  }
  return routes.education;
}
export function isFocusedPage(path: string) {
  return (
    isMessageRoom(path) ||
    /\/(edit|new|answer|review|receipt|attempt|evaluate|evaluation-review|grading|grading-review|publish-review)$/.test(
      path,
    ) ||
    /\/exam-submissions\/[0-9a-f-]{36}\/questions\/[0-9a-f-]{36}$/i.test(path) ||
    path.includes('/attempts/')
  );
}
export function workspaceDestination(path: string, kind: components['schemas']['WorkspaceType']) {
  return path.startsWith(routes.messages)
    ? kind === 'Organization'
      ? ('/personal/messages?view=organization' as const)
      : routes.messages
    : routes.personal;
}
export const schoolRoutes = {
  class: (id: string) => `${routes.education}/classes/${encodeURIComponent(id)}`,
  assignment: (id: string) => `${routes.education}/assignments/${encodeURIComponent(id)}`,
  answer: (id: string) => `${routes.education}/assignments/${encodeURIComponent(id)}/answer`,
  review: (id: string) => `${routes.education}/assignments/${encodeURIComponent(id)}/review`,
  receipt: (id: string) => `${routes.education}/assignments/${encodeURIComponent(id)}/receipt`,
  lessonNew: (classId: string) =>
    `${routes.education}/classes/${encodeURIComponent(classId)}/lessons/new`,
  lessonEdit: (id: string) => `${routes.education}/lessons/${encodeURIComponent(id)}/edit`,
  lessonReview: (id: string) => `${routes.education}/lessons/${encodeURIComponent(id)}/review`,
};
/** Catch-all routes must not silently render another page for an unknown suffix. */
export function isSchoolPath(section: readonly string[]) {
  if (section.length === 0) return true;
  const [area, id, action, extra] = section;
  if (section.length === 1)
    return [
      'overview',
      'invitations',
      'search',
      'classes',
      'people',
      'members',
      'teachers',
      'students',
      'guardians',
      'assignments',
      'exams',
      'schedule',
      'resources',
      'evaluations',
      'reports',
    ].includes(area);
  if (section.length === 2 && id === 'new')
    return ['classes', 'people', 'courses', 'periods', 'guardians'].includes(area);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return false;
  if (section.length === 2)
    return ['classes', 'lessons', 'assignments', 'exams', 'sessions', 'people'].includes(area);
  if (section.length === 4)
    return (
      (area === 'exam-submissions' &&
        action === 'questions' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(extra)) ||
      (((area === 'classes' &&
        ['lessons', 'assignments', 'sessions', 'exams', 'enrollments', 'teachers'].includes(
          action,
        )) ||
        (area === 'exams' && action === 'questions')) &&
        extra === 'new')
    );
  if (section.length !== 3) return false;
  if (area === 'submissions') return ['evaluate', 'evaluation-review', 'result'].includes(action);
  if (area === 'exam-submissions') return ['grading', 'grading-review', 'result'].includes(action);
  if (
    area === 'assignments' &&
    ['evaluations', 'history', 'edit', 'publish-review'].includes(action)
  )
    return true;
  if (area === 'exams' && ['grading', 'history'].includes(action)) return true;
  if (area === 'classes' && action === 'members') return true;
  if (area === 'exams' && action === 'review') return true;
  return area === 'lessons'
    ? ['edit', 'review'].includes(action)
    : area === 'assignments'
      ? ['answer', 'review', 'receipt'].includes(action)
      : ['exams', 'sessions', 'people'].includes(area) && action === 'edit';
}
