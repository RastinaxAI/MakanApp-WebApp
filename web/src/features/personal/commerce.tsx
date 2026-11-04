'use client';
import * as uiText from '@/content/fa';
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
          <h1>{organization ? uiText.text_2ae205425d42 : uiText.text_ab67aa4d93be}</h1>
          <p>{organization ? uiText.text_6ff6f7651ca5 : uiText.text_7341b0ece9cc}</p>
        </div>
        {(organization ||
          (session.context.workspaceType === 'Organization' &&
            session.context.activeRole === 'Manager')) &&
          !orderUncertain && (
            <Button variant="outline" asChild>
              <Link href={'/personal/subscription' + (organization ? '' : '?scope=organization')}>
                {organization ? uiText.text_d86b9666ec8d : uiText.text_2ae205425d42}
              </Link>
            </Button>
          )}
      </header>
      <section className={s.panel}>
        <span className={s.status}>{subscriptionLabels[current.state] ?? current.state}</span>
        <h2>{current.planDisplayName ?? uiText.text_f596b5c9d314}</h2>
        <dl className={s.detail}>
          <div>
            <dt>{uiText.text_7ed97f2495a5}</dt>
            <dd>
              {current.periodStartsAtUtc && current.periodEndsAtUtc
                ? date(current.periodStartsAtUtc) +
                  uiText.text_7168a3799fbf +
                  date(current.periodEndsAtUtc)
                : uiText.text_c71eb9b208c8}
            </dd>
          </div>
          {current.scheduledPlanVersionId && (
            <div>
              <dt>{uiText.text_a92c3461295f}</dt>
              <dd>{uiText.text_82752778baed}</dd>
            </div>
          )}
        </dl>
        {current.hasPendingPayment && <p className={s.hint}>{uiText.text_8731cd667f6e}</p>}
      </section>
      <section className={s.panel}>
        <h2>{uiText.text_86a2d2d4def4}</h2>
        {current.quotas.length ? (
          <div className={s.grid}>
            {current.quotas.map((q) => (
              <div className={s.quota} key={q.key} data-exceeded={q.isOverQuota}>
                <h3>{quotaLabels[q.key]}</h3>
                <strong>
                  {uiText.text_9abd6e4940e3}
                  {quotaRemaining(q)}
                </strong>
                <p>
                  {uiText.text_2f1247d5894e}{' '}
                  {q.isUsageAvailable === true
                    ? q.consumed.toLocaleString('fa-IR') + ' ' + q.unit
                    : uiText.text_257b66a50f43}
                </p>
                {q.isOverQuota && <p>{uiText.text_e2229ea0cb31}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className={s.hint}>{uiText.text_5de725f5f494}</p>
        )}
        <p className={s.meta}>
          {uiText.text_dc39ddb24c12}
          {date(current.observedAtUtc, true)}
        </p>
      </section>
      <section className={s.panel}>
        <h2>{uiText.text_16d1d8fb88d8}</h2>
        {plans.isPending ? (
          <LoadingSkeleton />
        ) : plans.isError ? (
          <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />
        ) : !plans.data.length ? (
          <EmptyState title={uiText.text_13877f13269f} />
        ) : (
          <>
            <label className={s.field}>
              {uiText.text_d9772fd00176}
              <select
                value={selected}
                disabled={a.busy || orderUncertain}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setQuote(undefined);
                  command.current = undefined;
                }}
              >
                <option value="">{uiText.text_c47e8cf0803f}</option>
                {plans.data
                  .filter((p) => p.audience === owner)
                  .map((p) => (
                    <option key={p.planVersionId} value={p.planVersionId}>
                      {p.displayName}
                      {uiText.text_588da4105320}
                      {p.priceToman.toLocaleString('fa-IR')} {p.displayCurrency}
                    </option>
                  ))}
              </select>
            </label>
            <label className={s.field}>
              {uiText.text_a1dbc531a2cd}
              <select
                value={purpose}
                disabled={a.busy || orderUncertain}
                onChange={(e) => {
                  setPurpose(e.target.value as S['CommercialOrderPurpose']);
                  setQuote(undefined);
                  command.current = undefined;
                }}
              >
                <option value="Purchase">{uiText.text_06e54bf7afe6}</option>
                <option value="Renewal">{uiText.text_3225fab3cd96}</option>
                <option value="Upgrade">{uiText.text_a5ebe3e6fe5e}</option>
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
              {uiText.text_d2160f8eb18d}
            </Button>
            {quote && (
              <div className={s.panel}>
                <strong className={s.price}>
                  {quote.priceToman.toLocaleString('fa-IR')} {quote.displayCurrency}
                </strong>
                <p className={s.hint}>
                  {uiText.text_bae7e088f1e1}{' '}
                  {quote.expiresAtUtc ? date(quote.expiresAtUtc, true) : uiText.text_2b1bf830baea}
                  {uiText.text_9ae95d6b5b73}
                </p>
                {!previewReady && <p role="status">{uiText.text_194fed9c2345}</p>}
                {!organization && (
                  <ConfirmAction
                    trigger={uiText.text_6ff723ebc69c}
                    title={uiText.text_cdc6409eb6a5}
                    description={uiText.text_2a70b317c5f5}
                    disabled={!previewReady && !command.current}
                    confirm={uiText.text_0c2133fae476}
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
                  {uiText.text_4097df6f7123}
                  <input value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <ConfirmAction
                  trigger={uiText.text_bca8396dc77f}
                  title={uiText.text_b15663c9902c}
                  description={uiText.text_353836470669}
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
          <h2>{uiText.text_ed47f8b6e65c}</h2>
          <p>
            {uiText.text_2b18443f7114}
            {label(order.status)}
            {uiText.text_5adab0015a6e}
            {label(order.fulfillmentState)}
          </p>
          <p className={s.hint}>{uiText.text_f22a3f010537}</p>
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
      <h2>{uiText.text_efb1be1f18cb}</h2>
      {q.isPending ? (
        <LoadingSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length ? (
        <ul className={s.list}>
          {q.data.items.map((o) => (
            <li key={o.orderId}>
              <strong>
                {label(o.status)}
                {uiText.text_588da4105320}
                {(o.priceToman ?? o.amount).toLocaleString('fa-IR')}{' '}
                {o.displayCurrency ?? o.currency}
              </strong>
              <p className={s.meta}>{date(o.createdAtUtc, true)}</p>
              <Button variant="outline" onClick={() => setSelected(o.orderId)}>
                {uiText.text_f0452fb92a5a}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={uiText.text_f53c7f5829aa} />
      )}
      {selected &&
        (detail.isPending ? (
          <LoadingSkeleton />
        ) : detail.isError ? (
          <ErrorState error={detail.error} />
        ) : (
          <dl className={s.detail}>
            <div>
              <dt>{uiText.text_cb52f9e6dc45}</dt>
              <dd>{label(detail.data.status)}</dd>
            </div>
            <div>
              <dt>{uiText.text_62b1f7b3faed}</dt>
              <dd>{label(detail.data.fulfillmentState)}</dd>
            </div>
            <div>
              <dt>{uiText.text_3962cd7270f8}</dt>
              <dd>
                {detail.data.paidAtUtc
                  ? date(detail.data.paidAtUtc, true)
                  : uiText.text_d2793bd966f1}
              </dd>
            </div>
          </dl>
        ))}
    </section>
  );
}
