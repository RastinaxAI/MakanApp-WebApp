export function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function displayDateOnly(value: string | null | undefined) {
  if (!value || !validDateOnly(value)) return 'ثبت نشده';
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(value + 'T00:00:00Z'),
  );
}
export function profilePatch(values: {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  dateOfBirth: string;
}) {
  if (values.dateOfBirth && !validDateOnly(values.dateOfBirth))
    throw new Error('تاریخ تولد معتبر وارد کنید.');
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    displayName: values.displayName.trim() || null,
    username: values.username.trim(),
    ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
  };
}
export function localToday() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}
