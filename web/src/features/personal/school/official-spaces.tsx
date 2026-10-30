'use client';
import Link from 'next/link';
import { MessageCircle, Megaphone, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingSkeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api/errors';
import { usePersonal, usePersonalApi } from '../provider';
import { readableOfficialEndpoint, type OfficialPair } from '../messaging/official-model';
import s from './official-spaces.module.css';
const stateLabels: Record<string, string> = {
  Missing: 'هنوز آماده نیست',
  Pending: 'در حال آماده‌سازی',
  Ready: 'آماده',
  RepairRequired: 'نیازمند بررسی آموزشگاه',
};
export function OfficialSpaces({ classId }: { classId?: string }) {
  const { session } = usePersonal();
  const path = classId
    ? `/api/v1/organization/classes/${classId}/official-spaces`
    : '/api/v1/organization/official-spaces';
  const q = usePersonalApi<OfficialPair>(path, { poll: 10000 });
  const title = classId ? 'گروه و کانال رسمی کلاس' : 'گروه و کانال رسمی آموزشگاه';
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
          aria-label="دریافت دوبارهٔ فضاهای رسمی"
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={18} />
        </Button>
      </header>
      <div className={s.pair}>
        {(['Group', 'Channel'] as const).map((purpose) => {
          const endpoint = purpose === 'Group' ? pair.group : pair.channel;
          const readable = readableOfficialEndpoint(pair, purpose);
          const name = purpose === 'Group' ? 'گروه رسمی' : 'کانال رسمی';
          const Icon = purpose === 'Group' ? MessageCircle : Megaphone;
          return (
            <article key={purpose}>
              <Icon size={25} />
              <div>
                <h3>{name}</h3>
                <p>{stateLabels[endpoint.state] ?? 'وضعیت در دسترس نیست'}</p>
                {readable && (
                  <small>
                    {endpoint.capabilities.canSend ? 'مشاهده و ارسال پیام' : 'فقط مشاهده'}
                  </small>
                )}
              </div>
              {readable ? (
                <Button asChild>
                  <Link href={`/personal/messages/${endpoint.conversationId}?view=organization`}>
                    ورود به {purpose === 'Group' ? 'گروه' : 'کانال'}
                  </Link>
                </Button>
              ) : (
                <Button disabled variant="outline">
                  {endpoint.state === 'Ready' ? 'دسترسی ندارید' : 'در دسترس نیست'}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
