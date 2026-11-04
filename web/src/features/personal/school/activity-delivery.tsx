'use client';
import { useAcademicScope } from './academic-scope';
import * as uiText from '@/content/fa';
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
  const scope = useAcademicScope();
  if (scope.personal) return null;
  return (
    <section className={s.panel} aria-label={uiText.text_f45e2124d2b3}>
      <header className={s.heading}>
        <h2>{uiText.text_f45e2124d2b3}</h2>
      </header>
      {sourceVersionId ? (
        <DeliveryLookup classId={classId} kind={kind} sourceVersionId={sourceVersionId} />
      ) : (
        <p>{uiText.text_cbffec0216d9}</p>
      )}
      <Button variant="outline" asChild>
        <Link href={`${base}/classes/${classId}`}>{uiText.text_7e774d827d0c}</Link>
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
  if (!q.data.length) return <EmptyState title={uiText.text_131283425e90} />;
  return (
    <dl className={s.delivery}>
      {q.data.map((row) => (
        <div key={row.eventId + ':' + row.purpose}>
          <dt>
            {row.purpose === 'Group'
              ? uiText.text_50eee55c9937
              : row.purpose === 'Channel'
                ? uiText.text_872445576c9b
                : uiText.text_f6a1af6f6496}
          </dt>
          <dd>
            {
              {
                Pending: uiText.text_41483c9e8785,
                Delivered: uiText.text_cd8457762e8c,
                Superseded: uiText.text_74c4a12d53da,
              }[row.state]
            }
          </dd>
        </div>
      ))}
    </dl>
  );
}
