'use client';
import * as uiText from '@/content/fa';
import Link from 'next/link';
import { MessageCircle, Megaphone, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { usePersonal, usePersonalApi } from '../provider';
import { readableOfficialEndpoint, type OfficialPair } from '../messaging/official-model';
import s from './official-spaces.module.css';
const stateLabels: Record<string, string> = {
  Missing: uiText.text_ab55214d3f76,
  Pending: uiText.text_99f45229feff,
  Ready: uiText.text_376e9c9561e2,
  RepairRequired: uiText.text_7038382709a2,
};
export function OfficialSpaces({ classId }: { classId?: string }) {
  const { session } = usePersonal();
  const path = classId
    ? `/api/v1/organization/classes/${classId}/official-spaces`
    : '/api/v1/organization/official-spaces';
  const q = usePersonalApi<OfficialPair>(path, { poll: 10000 });
  const title = classId ? uiText.text_42fb54edaf34 : uiText.text_cf55a848d0e2;
  if (q.isPending)
    return (
      <section className={s.panel} aria-label={title}>
        <LoadingSkeleton />
      </section>
    );
  if (q.isError)
    return (
      <section className={s.panel} aria-label={title}>
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </section>
    );
  const pair = q.data;
  if (
    pair.organizationId !== session.context.organizationId ||
    pair.sourceId !== (classId ?? session.context.organizationId) ||
    pair.sourceKind !== (classId ? 'Class' : 'Organization')
  )
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  return (
    <section className={s.panel} aria-label={title}>
      <header className={s.heading}>
        <h2>
          <ShieldCheck size={20} />
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={uiText.text_75b5481cd1a2}
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={18} />
        </Button>
      </header>
      <div className={s.pair}>
        {(['Group', 'Channel'] as const).map((purpose) => {
          const endpoint = purpose === 'Group' ? pair.group : pair.channel;
          const readable = readableOfficialEndpoint(pair, purpose);
          const name = purpose === 'Group' ? uiText.text_50eee55c9937 : uiText.text_872445576c9b;
          const Icon = purpose === 'Group' ? MessageCircle : Megaphone;
          return (
            <article key={purpose}>
              <Icon size={25} />
              <div>
                <h3>{name}</h3>
                <p>{stateLabels[endpoint.state] ?? uiText.text_12bdeb2febff}</p>
                {readable && (
                  <small>
                    {endpoint.capabilities.canSend
                      ? uiText.text_26261794dfe5
                      : uiText.text_2e9c466baa88}
                  </small>
                )}
              </div>
              {readable ? (
                <Button asChild>
                  <Link href={`/personal/messages/${endpoint.conversationId}?view=organization`}>
                    {uiText.text_71d8ee4e0bc6}
                    {purpose === 'Group' ? uiText.text_774668d4acc7 : uiText.text_2db356b462dd}
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  {endpoint.state === 'Ready' ? uiText.text_8889e15c5832 : uiText.text_cf473a776359}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
