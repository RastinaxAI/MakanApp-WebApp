'use client';
import * as uiText from '@/content/fa';
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
    <section className={s.card} aria-label={uiText.text_14130edb2ced} aria-busy={busy || loading}>
      <div className={s.heading}>
        <span className={s.icon}>
          <UsersRound size={23} />
        </span>
        <div>
          <h2>{uiText.text_c5dc986b8129}</h2>
          <p id={description}>
            {busy
              ? uiText.text_7c4ad9f5aae7
              : active
                ? active.organizationName
                : uiText.text_86937d1bb9f1}
          </p>
        </div>
        {active && !busy && (
          <span className={s.selected}>
            <Check size={16} />
            {uiText.text_3958c9bcedb4}
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
            )?.displayName.slice(0, 1) ?? uiText.text_7d06b69aad65}
          </span>
          <div>
            <label htmlFor={id}>{uiText.text_91082bc0cbdc}</label>
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
                {uiText.text_665daedc1ba7}
              </option>
              {children.map((child) => (
                <option
                  key={child.learnerOrganizationPersonId}
                  value={child.learnerOrganizationPersonId}
                  disabled={child.relationStatus !== 'Active'}
                >
                  {child.displayName}
                  {child.relationStatus !== 'Active' ? uiText.text_503b02cb8da5 : ''}
                </option>
              ))}
            </select>
          </div>
          {busy && <LoaderCircle className={s.spinner} size={21} />}
        </div>
      ) : (
        !error && (
          <EmptyState title={uiText.text_a27cb9baf762} description={uiText.text_c02cc9f23833} />
        )
      )}
      {!!error && <ErrorState error={error} onRetry={onRetry} />}
    </section>
  );
}
