// Only the active UI instance is retained; values and account data are not stored here.
export const jalaliPickerState: { current?: { input: HTMLInputElement; close: () => void } } = {};
export function dismissJalaliPickerWithin(container: HTMLElement | null) {
  const active = jalaliPickerState.current;
  if (!active || !container?.contains(active.input)) return false;
  active.close();
  active.input.focus();
  return true;
}
