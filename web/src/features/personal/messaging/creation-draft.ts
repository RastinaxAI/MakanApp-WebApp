import { z } from 'zod';
const draft = z.object({
  title: z.string(),
  description: z.string(),
  visibility: z.enum(['', 'Private', 'Public']),
  history: z.enum(['', 'FullHistory', 'FromJoin']),
  selected: z.array(z.uuid()),
});
export function readCreationDraft(raw: string | null) {
  if (!raw) return null;
  try {
    const result = draft.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// A consent rejection is definitive, not an unknown result to replay indefinitely.
export function creationWasRejected(status: number, code?: string) {
  return (
    [400, 403, 404, 422].includes(status) ||
    (status === 409 && code === 'CONVERSATION_INVITATION_REQUIRED')
  );
}
