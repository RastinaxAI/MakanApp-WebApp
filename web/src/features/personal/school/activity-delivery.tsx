'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '@/components/ui/states';
import type { components } from '@/generated/api/schema';
import { usePersonalApi } from '../provider';
import { base } from './shared';
import s from './official-spaces.module.css';
type S = components['schemas'];
export function ActivityDeliveryStatus({
  classId,
  kind,
  sourceVersionId,
}: {
  classId: string;
  kind: S['AcademicActivityKind'];
  sourceVersionId?: string;
}) {
  return (
    <section className={s.panel} aria-label="اطلاع‌رسانی انتشار">
      <header className={s.heading}>
        <h2>اطلاع‌رسانی انتشار</h2>
      </header>
      {sourceVersionId ? (
        <DeliveryLookup classId={classId} kind={kind} sourceVersionId={sourceVersionId} />
      ) : (
        <p>اعلان انتشار را در گروه و کانال رسمی کلاس بررسی کنید.</p>
      )}
      <Button variant="outline" asChild>
        <Link href={`${base}/classes/${classId}`}>فضاهای رسمی کلاس</Link>
      </Button>
    </section>
  );
}
function DeliveryLookup({
  classId,
  kind,
  sourceVersionId,
}: {
  classId: string;
  kind: S['AcademicActivityKind'];
  sourceVersionId: string;
}) {
  const q = usePersonalApi<S['AcademicActivityDeliveryResult'][]>(
    `/api/v1/organization/classes/${classId}/official-spaces/activities?` +
      new URLSearchParams({ kind, sourceVersionId }),
    { poll: 5000 },
  );
  if (q.isPending) return <LoadingSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data.length) return <EmptyState title="هنوز وضعیتی برای اعلان این نسخه دریافت نشده است" />;
  return (
    <dl className={s.delivery}>
      {q.data.map((row) => (
        <div key={row.eventId + ':' + row.purpose}>
          <dt>
            {row.purpose === 'Group'
              ? 'گروه رسمی'
              : row.purpose === 'Channel'
                ? 'کانال رسمی'
                : 'مقصد اعلان'}
          </dt>
          <dd>
            {
              {
                Pending: 'در انتظار درج اعلان',
                Delivered: 'اعلان درج شده است',
                Superseded: 'با نسخهٔ جدید جایگزین شده',
              }[row.state]
            }
          </dd>
        </div>
      ))}
    </dl>
  );
}
