'use client';
import { useId } from 'react';
import { UsersRound, LoaderCircle, Check } from 'lucide-react';
import type { components } from '@/generated/api/schema';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import s from './child-selector.module.css';
type Child = components['schemas']['AuthorizedChildResult'];
export function ChildSelector({
  children,
  active,
  pendingId,
  busy,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  children: Child[];
  active?: Child;
  pendingId?: string;
  busy: boolean;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  onSelect: (id: string) => void;
}) {
  const id = useId(),
    description = useId();
  return (
    <section className={s.card} aria-label="فرزندان من" aria-busy={busy || loading}>
      <div className={s.heading}>
        <span className={s.icon}>
          <UsersRound size={23} />
        </span>
        <div>
          <h2>فرزند من</h2>
          <p id={description}>
            {busy
              ? 'در حال دریافت اطلاعات فرزند…'
              : active
                ? active.organizationName
                : 'فرزند موردنظر را برای مشاهدهٔ اطلاعاتش انتخاب کنید.'}
          </p>
        </div>
        {active && !busy && (
          <span className={s.selected}>
            <Check size={16} />
            انتخاب‌شده
          </span>
        )}
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : children.length ? (
        <div className={s.selection}>
          <span className={s.avatar}>
            {(
              children.find((c) => c.learnerOrganizationPersonId === pendingId) ?? active
            )?.displayName.slice(0, 1) ?? '؟'}
          </span>
          <div>
            <label htmlFor={id}>انتخاب فرزند</label>
            <select
              id={id}
              aria-describedby={description}
              disabled={busy}
              value={pendingId ?? active?.learnerOrganizationPersonId ?? ''}
              onChange={(ev) => {
                if (ev.target.value) onSelect(ev.target.value);
              }}
            >
              <option value="" disabled>
                یک فرزند انتخاب کنید
              </option>
              {children.map((child) => (
                <option
                  key={child.learnerOrganizationPersonId}
                  value={child.learnerOrganizationPersonId}
                  disabled={child.relationStatus !== 'Active'}
                >
                  {child.displayName}
                  {child.relationStatus !== 'Active' ? ' · رابطه غیرفعال' : ''}
                </option>
              ))}
            </select>
          </div>
          {busy && <LoaderCircle className={s.spinner} size={21} />}
        </div>
      ) : (
        !error && (
          <EmptyState
            title="رابطهٔ فعالی برای نمایش موجود نیست"
            description="پس از تأیید رابطه با فرزند، اطلاعات مجاز او اینجا نمایش داده می‌شود."
          />
        )
      )}
      {!!error && <ErrorState error={error} onRetry={onRetry} />}
    </section>
  );
}
