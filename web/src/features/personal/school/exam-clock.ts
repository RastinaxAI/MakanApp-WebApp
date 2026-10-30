/** Server time anchors the deadline; elapsed time comes from a monotonic client clock. */
export function remainingExamSeconds(deadlineUtc: string, serverNowUtc: string, elapsedMs = 0) {
  const deadline = Date.parse(deadlineUtc),
    now = Date.parse(serverNowUtc);
  if (!Number.isFinite(deadline) || !Number.isFinite(now) || !Number.isFinite(elapsedMs))
    return null;
  return Math.max(0, Math.ceil((deadline - now - Math.max(0, elapsedMs)) / 1000));
}

export function examClockLabel(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60),
    rest = String(value % 60).padStart(2, '0');
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${rest}`
    : `${String(minutes).padStart(2, '0')}:${rest}`;
}
