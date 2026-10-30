'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { ErrorState, LoadingSkeleton, EmptyState, label } from '@/components/ui/states';
import { useUnsavedChanges } from '@/components/hooks/use-unsaved-changes';
import { PageBack } from '@/components/navigation/page-back';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
import { date } from '@/lib/formatting';
import { usePersonal, usePersonalApi } from './provider';
import { useAccountAction } from './use-account-action';
import { quotaLabels, quotaRemaining, subscriptionLabels, summaryMatches } from './commerce-model';
import s from './service-layout.module.css';
type S = components['schemas'];
export function CommercePage() {
  const org = useSearchParams().get('scope') === 'organization';
  return <Commerce key={String(org)} organization={org} />;
}
function Commerce({ organization }: { organization: boolean }) {
  const { session, call } = usePersonal();
  const allowed =
    !organization ||
    (session.context.workspaceType === 'Organization' && session.context.activeRole === 'Manager');
  const scope = organization ? 'organization' : 'personal',
    owner = organization ? 'Organization' : 'Individual',
    prefix = '/api/v1/commerce/' + scope;
  const summary = usePersonalApi<S['CommercialSummaryDto']>(prefix + '/subscription', {
    enabled: allowed,
    poll: 15000,
  });
  const plans = usePersonalApi<S['CommercialPlanDto'][]>(
    '/api/v1/commerce/catalog?audience=' + owner,
    { enabled: allowed },
  );
  const [quote, setQuote] = useState<S['CommercialQuoteDto']>(),
    [purpose, setPurpose] = useState<S['CommercialOrderPurpose']>('Purchase'),
    [reason, setReason] = useState(''),
    [selected, setSelected] = useState(''),
    [order, setOrder] = useState<S['OrderDto']>(),
    [now, setNow] = useState(Date.now());
  const [orderUncertain, setOrderUncertain] = useState(false);
  useUnsavedChanges(orderUncertain);
  const command = useRef<S['CreateOrderCommand'] | undefined>(undefined),
    a = useAccountAction();
  useEffect(() => {
    if (!quote) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [quote]);
  if (!allowed) return <ErrorState error={new ApiError(403)} />;
  if (summary.isPending) return <LoadingSkeleton />;
  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  const current = summary.data;
  if (
    !summaryMatches(current, owner, organization ? session.context.organizationId : session.user.id)
  )
    return <ErrorState error={new ApiError(502, { code: 'CONTRACT_MISMATCH' })} />;
  const previewReady =
    !!quote && quote.planVersionId === selected && Date.parse(quote.expiresAtUtc ?? '') > now;
  return (
    <div className={s.page}>
      <PageBack href={organization ? '/personal/education' : '/personal/profile'} />
      <header className={s.heading}>
        <div>
          <h1>{organization ? 'اشتراک آموزشگاه' : 'اشتراک و مصرف شخصی'}</h1>
          <p>
            {organization
              ? 'مصرف و قرارداد آموزشگاه فعال'
              : 'این اشتراک متعلق به حساب شماست و نقش آموزشی ایجاد نمی‌کند.'}
          </p>
        </div>
        {(organization ||
          (session.context.workspaceType === 'Organization' &&
            session.context.activeRole === 'Manager')) &&
          !orderUncertain && (
            <Button variant="outline" asChild>
              <Link href={'/personal/subscription' + (organization ? '' : '?scope=organization')}>
                {organization ? 'اشتراک شخصی' : 'اشتراک آموزشگاه'}
              </Link>
            </Button>
          )}
      </header>
      <section className={s.panel}>
        <span className={s.status}>{subscriptionLabels[current.state] ?? current.state}</span>
        <h2>{current.planDisplayName ?? 'وضعیت قرارداد'}</h2>
        <dl className={s.detail}>
          <div>
            <dt>دورهٔ فعلی</dt>
            <dd>
              {current.periodStartsAtUtc && current.periodEndsAtUtc
                ? date(current.periodStartsAtUtc) + ' تا ' + date(current.periodEndsAtUtc)
                : 'هنوز دوره‌ای اعلام نشده است'}
            </dd>
          </div>
          {current.scheduledPlanVersionId && (
            <div>
              <dt>تغییر دورهٔ بعد</dt>
              <dd>ثبت شده است</dd>
            </div>
          )}
        </dl>
        {current.hasPendingPayment && (
          <p className={s.hint}>
            پرداخت هنوز تأیید نشده است؛ امکانات پولی از روی این وضعیت فعال نمی‌شوند.
          </p>
        )}
      </section>
      <section className={s.panel}>
        <h2>مصرف و سهمیه</h2>
        {current.quotas.length ? (
          <div className={s.grid}>
            {current.quotas.map((q) => (
              <div className={s.quota} key={q.key} data-exceeded={q.isOverQuota}>
                <h3>{quotaLabels[q.key]}</h3>
                <strong>باقی‌مانده: {quotaRemaining(q)}</strong>
                <p>
                  مصرف:{' '}
                  {q.isUsageAvailable === true
                    ? q.consumed.toLocaleString('fa-IR') + ' ' + q.unit
                    : 'هنوز گزارش نشده'}
                </p>
                {q.isOverQuota && <p>سقف مصرف این سهمیه تمام شده است.</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className={s.hint}>سهمیه‌ای برای نمایش گزارش نشده است.</p>
        )}
        <p className={s.meta}>اطلاعات سرویس: {date(current.observedAtUtc, true)}</p>
      </section>
      <section className={s.panel}>
        <h2>پلن‌ها و برآورد هزینه</h2>
        {plans.isPending ? (
          <LoadingSkeleton />
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
        ) : !plans.data.length ? (
          <EmptyState title="پلنی برای خرید عرضه نشده است" />
        ) : (
          <>
            <label className={s.field}>
              پلن
              <select
                value={selected}
                disabled={a.busy || orderUncertain}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setQuote(undefined);
                  command.current = undefined;
                }}
              >
                <option value="">انتخاب پلن…</option>
                {plans.data
                  .filter((p) => p.audience === owner)
                  .map((p) => (
                    <option key={p.planVersionId} value={p.planVersionId}>
                      {p.displayName} · {p.priceToman.toLocaleString('fa-IR')} {p.displayCurrency}
                    </option>
                  ))}
              </select>
            </label>
            <label className={s.field}>
              نوع درخواست
              <select
                value={purpose}
                disabled={a.busy || orderUncertain}
                onChange={(e) => {
                  setPurpose(e.target.value as S['CommercialOrderPurpose']);
                  setQuote(undefined);
                  command.current = undefined;
                }}
              >
                <option value="Purchase">خرید</option>
                <option value="Renewal">تمدید</option>
                <option value="Upgrade">ارتقا</option>
              </select>
            </label>
            <Button
              disabled={a.busy || orderUncertain || !selected}
              onClick={async () => {
                const result = await a.run<S['CommercialQuoteDto']>(prefix + '/quote', {
                  planVersionId: selected,
                  clientOperationId: crypto.randomUUID(),
                  purpose,
                  subscriptionId: current.subscriptionId,
                });
                if (result) {
                  setQuote(result);
                  setNow(Date.now());
                  command.current = undefined;
                }
              }}
            >
              دریافت برآورد هزینه
            </Button>
            {quote && (
              <div className={s.panel}>
                <strong className={s.price}>
                  {quote.priceToman.toLocaleString('fa-IR')} {quote.displayCurrency}
                </strong>
                <p className={s.hint}>
                  اعتبار برآورد:{' '}
                  {quote.expiresAtUtc ? date(quote.expiresAtUtc, true) : 'اعلام نشده'} · آغاز دوره و
                  دسترسی به تأیید معتبر سرویس وابسته است.
                </p>
                {!previewReady && (
                  <p role="status">اعتبار این برآورد پایان یافته؛ دوباره هزینه را دریافت کنید.</p>
                )}
                {!organization && (
                  <ConfirmAction
                    trigger="ساخت سفارش در انتظار پرداخت"
                    title="ثبت سفارش شخصی"
                    description="ثبت سفارش به‌تنهایی پرداخت یا فعال‌شدن اشتراک نیست."
                    disabled={!previewReady && !command.current}
                    confirm="ثبت سفارش"
                    onConfirm={async () => {
                      command.current ??= {
                        planVersionId: quote.planVersionId,
                        clientOperationId: crypto.randomUUID(),
                        purpose,
                        subscriptionId: current.subscriptionId,
                      };
                      setOrderUncertain(true);
                      let result: S['CreateOrderResult'];
                      try {
                        result = await call<S['CreateOrderResult']>(prefix + '/orders', {
                          method: 'POST',
                          body: JSON.stringify(command.current),
                        });
                      } catch (e) {
                        if (
                          e instanceof ApiError &&
                          e.status < 500 &&
                          ![408, 409].includes(e.status)
                        ) {
                          setOrderUncertain(false);
                          command.current = undefined;
                        }
                        throw e;
                      }
                      setOrderUncertain(false);
                      setOrder(result.order);
                      await summary.refetch();
                      return true;
                    }}
                  />
                )}
              </div>
            )}
            {current.subscriptionId && (
              <>
                <label className={s.field}>
                  دلیل تغییر پلن دورهٔ بعد
                  <input value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <ConfirmAction
                  trigger="درخواست کاهش پلن دورهٔ بعد"
                  title="برنامه‌ریزی تغییر پلن"
                  description="تغییر، در صورت پذیرش سرویس برای دورهٔ بعد ثبت می‌شود؛ اطلاعات شخصی حذف نمی‌شوند."
                  disabled={orderUncertain || !selected || !reason.trim() || !current.version}
                  onConfirm={async () => {
                    await call(prefix + '/subscription/downgrade', {
                      method: 'POST',
                      body: JSON.stringify({
                        planVersionId: selected,
                        expectedVersion: current.version,
                        reason: reason.trim(),
                      }),
                    });
                    await summary.refetch();
                    return true;
                  }}
                />
              </>
            )}
          </>
        )}
        {!!a.error && <ErrorState error={a.error} />}
      </section>
      {order && (
        <section className={s.panel} role="status">
          <h2>سفارش ثبت شد</h2>
          <p>
            وضعیت: {label(order.status)} · انجام خدمت: {label(order.fulfillmentState)}
          </p>
          <p className={s.hint}>
            پرداخت آنلاین در انتشار فعلی فعال نیست. ثبت سفارش، مجوز یا نقش آموزشی ایجاد نمی‌کند.
          </p>
        </section>
      )}
      {!organization && <PersonalOrders />}
    </div>
  );
}
function PersonalOrders() {
  const q = usePersonalApi<S['OrderListResult']>('/api/v1/commerce/personal/orders?limit=20', {
    poll: 15000,
  });
  const [selected, setSelected] = useState<string>();
  const detail = usePersonalApi<S['OrderDto']>('/api/v1/commerce/personal/orders/' + selected, {
    enabled: !!selected,
  });
  return (
    <section className={s.panel}>
      <h2>۲۰ سفارش اخیر</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length ? (
        <ul className={s.list}>
          {q.data.items.map((o) => (
            <li key={o.orderId}>
              <strong>
                {label(o.status)} · {(o.priceToman ?? o.amount).toLocaleString('fa-IR')}{' '}
                {o.displayCurrency ?? o.currency}
              </strong>
              <p className={s.meta}>{date(o.createdAtUtc, true)}</p>
              <Button variant="outline" onClick={() => setSelected(o.orderId)}>
                جزئیات سفارش
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="سفارشی ثبت نشده است" />
      )}
      {selected &&
        (detail.isPending ? (
          <LoadingSkeleton />
        ) : detail.isError ? (
          <ErrorState error={detail.error} />
        ) : (
          <dl className={s.detail}>
            <div>
              <dt>وضعیت سفارش</dt>
              <dd>{label(detail.data.status)}</dd>
            </div>
            <div>
              <dt>انجام خدمت</dt>
              <dd>{label(detail.data.fulfillmentState)}</dd>
            </div>
            <div>
              <dt>پرداخت تأییدشده</dt>
              <dd>
                {detail.data.paidAtUtc ? date(detail.data.paidAtUtc, true) : 'تأیید نشده است'}
              </dd>
            </div>
          </dl>
        ))}
    </section>
  );
}
