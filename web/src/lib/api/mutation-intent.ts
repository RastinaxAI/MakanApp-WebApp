export type MutationIntent = { path: string; method: string; body: Record<string, unknown> };
export function freezeIntent(
  previous: MutationIntent | undefined,
  path: string,
  payload: Record<string, unknown>,
  method: string,
): MutationIntent {
  const withoutId = (body: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'clientOperationId'));
  if (
    previous?.path === path &&
    previous.method === method &&
    previous.body &&
    JSON.stringify(withoutId(previous.body)) === JSON.stringify(payload)
  )
    return previous;
  return { path, method, body: { ...payload, clientOperationId: crypto.randomUUID() } };
}
