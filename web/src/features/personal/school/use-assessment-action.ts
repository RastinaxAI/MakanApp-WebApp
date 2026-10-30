'use client';
import { useQueryClient } from '@tanstack/react-query';
import { usePersonal } from '../provider';
import { useSchoolAction } from './shared';
/** Install the confirmed read model before navigating to an editor. An older
 * in-flight GET must not remount the next form and replace its first keystroke. */
export function useAssessmentAction(readPath: string) {
  const action = useSchoolAction(),
    cache = useQueryClient(),
    { session } = usePersonal();
  async function run<T>(path: string, body?: unknown, method = 'POST') {
    const value = await action.run<T>(path, body, method);
    if (value !== undefined) {
      const queryKey = ['personal', session.user.id, session.revision, readPath];
      await cache.cancelQueries({ queryKey, exact: true });
      cache.setQueryData(queryKey, value);
    }
    return value;
  }
  return { ...action, run };
}
