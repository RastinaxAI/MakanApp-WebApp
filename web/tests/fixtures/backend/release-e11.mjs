import { randomUUID } from 'node:crypto';
import { make, ids, id } from './state.mjs';
// Local contract scenarios only; no real services or payment gateway.
export function releaseRoute({ state, url, req, body, auth, send }) {
  const p = url.pathname,
    user = auth.user.id;
  state.release ??= {
    classes: [],
    invitations: [],
    participants: new Map(),
    orders: new Map(),
    operations: new Map(),
  };
  const r = state.release;
  if (p.startsWith('/api/v1/commerce/')) {
    const org = p.includes('/organization/');
    if (
      org &&
      (auth.context.workspaceType !== 'Organization' || auth.context.activeRole !== 'Manager')
    )
      return send({ code: 'FORBIDDEN' }, 403);
    const quota = make('CommercialQuotaDto', {
      key: 'StorageBytes',
      unit: 'بایت',
      limit: null,
      remaining: null,
      isUsageAvailable: false,
      isUnlimited: false,
    });
    const audience = org ? 'Organization' : 'Individual';
    if (p.endsWith('/catalog'))
      return send([
        make('CommercialPlanDto', {
          planId: id(980),
          planVersionId: id(981),
          displayName: 'پلن آزمون محلی',
          audience: url.searchParams.get('audience'),
          priceToman: 100,
          displayCurrency: 'تومان',
          entitlements: { AI: false },
          quotas: { PersonalStorageBytes: 1000 },
        }),
      ]);
    if (p.endsWith('/subscription'))
      return send(
        make('CommercialSummaryDto', {
          ownerType: audience,
          ownerId: org ? ids.org : user,
          state: 'NoSubscription',
          subscriptionId: null,
          planVersionId: null,
          entitlements: { AI: false },
          quotas: [quota],
        }),
      );
    if (p.endsWith('/quote'))
      return send(
        make('CommercialQuoteDto', {
          purpose: body.purpose,
          planVersionId: body.planVersionId,
          priceToman: 100,
          displayCurrency: 'تومان',
          effectiveQuotas: [quota],
          expiresAtUtc: new Date(Date.now() + 60000).toISOString(),
          previewOnly: true,
          startsUponVerifiedPayment: true,
        }),
      );
    if (p.endsWith('/personal/orders')) {
      if (req.method === 'GET')
        return send(
          make('OrderListResult', {
            items: [...r.orders.values()]
              .filter((o) => o.user === user)
              .map((o) => ({ ...o, orderId: o.orderId })),
          }),
        );
      const key = user + body.clientOperationId;
      if (!r.operations.has(key)) {
        const order = make('OrderDto', {
          orderId: randomUUID(),
          planVersionId: body.planVersionId,
          status: 'PendingPayment',
          fulfillmentState: 'NotStarted',
          amount: 100,
          currency: 'IRR',
          paidAtUtc: null,
          paymentAttempts: [],
        });
        r.orders.set(order.orderId, { ...order, user });
        r.operations.set(key, make('CreateOrderResult', { order, alreadyExisted: false }));
      }
      return send(r.operations.get(key));
    }
    const o = r.orders.get(p.split('/').at(-1));
    if (o && o.user === user) return send(o);
    return send({ code: 'NOT_FOUND' }, 404);
  }
  if (!p.startsWith('/api/v1/personal-classes')) return false;
  if (p === '/api/v1/personal-classes/invitations')
    return send(r.invitations.filter((i) => i.destinationUserId === user));
  const accept = /\/invitations\/([^/]+)\/accept$/.exec(p);
  if (accept) {
    const invitation = r.invitations.find(
      (i) => i.id === accept[1] && i.destinationUserId === user,
    );
    if (!invitation) return send({ code: 'NOT_FOUND' }, 404);
    if (!invitation.accepted)
      r.participants.get(invitation.personalClassId).push(
        make('PersonalClassParticipantDto', {
          id: randomUUID(),
          studentUserId: user,
          active: true,
        }),
      );
    invitation.accepted = true;
    return send({ ...r.classes.find((c) => c.id === invitation.personalClassId), isHost: false });
  }
  if (p === '/api/v1/personal-classes') {
    if (req.method === 'GET')
      return send(
        r.classes
          .filter(
            (c) =>
              c.hostUserId === user ||
              r.participants.get(c.id).some((m) => m.studentUserId === user && m.active),
          )
          .map((c) => ({ ...c, isHost: c.hostUserId === user })),
      );
    const key = user + body.clientOperationId;
    if (!r.operations.has(key)) {
      const c = make('PersonalClassDto', {
        id: randomUUID(),
        hostUserId: user,
        title: body.title,
        archived: false,
        isHost: true,
        canCreateEducationalContent: false,
        educationalWorkflowStatus: 'Unavailable',
      });
      r.classes.push(c);
      r.participants.set(c.id, []);
      r.operations.set(key, c);
    }
    return send(r.operations.get(key), 201);
  }
  const c = r.classes.find((c) => c.id === p.split('/')[4]);
  if (!c) return send({ code: 'NOT_FOUND' }, 404);
  const host = c.hostUserId === user,
    members = r.participants.get(c.id),
    member = members.some((m) => m.studentUserId === user && m.active);
  if (!host && !member) return send({ code: 'NOT_FOUND' }, 404);
  if (req.method === 'GET')
    return send(p.endsWith('/participants') ? members : { ...c, isHost: host });
  if (!host || c.archived) return send({ code: 'FORBIDDEN' }, 403);
  if (p.endsWith('/archive')) {
    c.archived = true;
    return send({ ...c, isHost: true });
  }
  if (p.endsWith('/invitations')) {
    const key = user + body.clientOperationId;
    if (!r.operations.has(key)) {
      const invitation = make('PersonalClassInvitationDto', {
        id: randomUUID(),
        personalClassId: c.id,
        destinationUserId: body.destinationUserId,
        accepted: false,
        expiresAtUtc: '2099-01-01T00:00:00Z',
      });
      r.invitations.push(invitation);
      r.operations.set(key, invitation);
    }
    return send(r.operations.get(key), 201);
  }
  const m = members.find((m) => m.id === p.split('/').at(-1));
  if (req.method === 'DELETE' && m) {
    m.active = false;
    return send(null, 204);
  }
  return send({ code: 'NOT_FOUND' }, 404);
}
