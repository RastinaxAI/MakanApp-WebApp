const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isExtracurricularPath(parts: string[]) {
  const [area, id, action, detail] = parts;
  if (parts.length > 7) return false;
  if (area === 'classes' && uuid.test(id ?? '')) {
    if (action === 'evaluations') return parts.length === 3;
    if (['submissions', 'exam-submissions'].includes(action ?? '') && uuid.test(detail ?? '')) {
      if (parts.length === 4) return true;
      if (parts.length === 5)
        return (
          action === 'submissions'
            ? ['evaluate', 'evaluation-review', 'result']
            : ['grading', 'grading-review', 'result']
        ).includes(parts[4]);
      return (
        action === 'exam-submissions' &&
        parts.length === 6 &&
        parts[4] === 'questions' &&
        uuid.test(parts[5])
      );
    }
    if (
      ['assignments', 'exams'].includes(action ?? '') &&
      uuid.test(detail ?? '') &&
      parts.length === 5 &&
      ['edit', 'history', 'review', 'evaluations', 'grading'].includes(parts[4])
    )
      return true;
  }
  if (
    area === 'classes' &&
    uuid.test(id ?? '') &&
    ['assignments', 'exams'].includes(action ?? '')
  ) {
    if (parts.length === 3) return true;
    if (detail === 'new') return parts.length === 4;
    if (!uuid.test(detail ?? '')) return false;
    if (parts.length === 4) return true;
    if (parts.length === 5)
      return (
        action === 'assignments'
          ? ['answer', 'publish-review', 'submissions', 'receipt', 'result']
          : ['conditions', 'questions', 'publish-review', 'attempts', 'submissions', 'result']
      ).includes(parts[4]);
    if (parts.length === 6)
      return (
        ((action === 'assignments' ? ['submissions'] : ['attempts', 'submissions']).includes(
          parts[4],
        ) &&
          uuid.test(parts[5])) ||
        (action === 'exams' && parts[4] === 'result' && parts[5] === 'correction')
      );
    return (
      uuid.test(parts[5]) &&
      (parts[4] === 'attempts' && action === 'exams'
        ? ['review', 'receipt'].includes(parts[6])
        : parts[4] === 'submissions' && parts[6] === 'evaluate')
    );
  }
  if (parts.length > 4) return false;
  if (area === 'requests')
    return (
      (!id && parts.length === 1) ||
      (id === 'new' && parts.length === 2) ||
      (uuid.test(id ?? '') && (parts.length === 2 || (parts.length === 3 && action === 'edit')))
    );
  if (area === 'invitations')
    return parts.length === 1 || (parts.length === 2 && uuid.test(id ?? ''));
  if (area === 'join') return parts.length === 2 && uuid.test(id ?? '');
  if (area !== 'classes' || !uuid.test(id ?? '')) return false;
  if (parts.length === 2) return true;
  if (parts.length === 3)
    return [
      'setup',
      'members',
      'requests',
      'invite',
      'learning',
      'assignments',
      'exams',
      'info',
      'group',
      'channel',
      'archive',
      'edit',
    ].includes(action);
  return ['members', 'assignments', 'exams'].includes(action) && uuid.test(detail ?? '');
}
