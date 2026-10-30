import { randomUUID } from 'node:crypto';
import { userFor, ids, make, id } from './state.mjs';
export function authRoute(ctx) {
  const { state, url, body, send, req } = ctx,
    p = url.pathname;
  if (p === '/api/v1/auth/otp/challenges') {
    if (!/^(?:\+98|0)9\d{9}$/.test(body.phoneNumber ?? ''))
      return send({ code: 'PHONE_INVALID' }, 400);
    return send(
      {
        challengeId: randomUUID(),
        expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
        resendAvailableAtUtc: new Date().toISOString(),
      },
      202,
    );
  }
  if (p === '/api/v1/auth/otp/verify') {
    if (body.code !== '123456') return send({ code: 'OTP_INVALID' }, 400);
    const a = userFor(state, body.phoneNumber);
    a.context = make('AccessContext', {
      actorId: a.user.id,
      userId: a.user.id,
      sessionId: randomUUID(),
      workspaceType: 'Personal',
      organizationId: null,
      membershipId: null,
      activeRole: null,
      subjectOrganizationPersonId: null,
    });
    state.auth.set(a.token, a);
    return send({
      accessToken: a.token,
      tokenType: 'Bearer',
      expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: randomUUID(),
      refreshExpiresAtUtc: new Date(Date.now() + 7200000).toISOString(),
      user: a.user,
    });
  }
  const a = state.auth.get(req.headers.authorization?.replace(/^Bearer /, ''));
  ctx.auth = a;
  if (!a) return send({ code: 'FIXTURE_UNAUTHENTICATED' }, 401);
  if (p === '/api/v1/auth/logout') {
    state.auth.delete(a.token);
    return send(null, 204);
  }
  if (p === '/api/v1/me') return send(a.user);
  if (p === '/api/v1/workspaces/current') return send(a.context);
  if (p === '/api/v1/workspaces/me' || p === '/api/v1/workspaces/snapshot') {
    const rows = [
      {
        workspaceType: 'Personal',
        organizationId: null,
        organizationName: null,
        membershipId: null,
        role: null,
        displayName: 'فضای شخصی نمونه',
        status: 'Active',
        canEnter: true,
        isVisible: !a.role,
        isEffective: true,
      },
      ...(a.role
        ? [
            {
              workspaceType: 'Organization',
              organizationId: ids.org,
              organizationName: state.design ? 'آموزشگاه آفتاب' : 'آموزشگاه نمونهٔ کیفیت',
              membershipId: a.membershipId,
              role: a.role,
              displayName: 'نقش آزمایشی',
              status: 'Active',
              canEnter: true,
              isVisible: true,
              isEffective: true,
              membershipStatus: 'Active',
              roleStatus: 'Active',
              organizationStatus: 'Active',
            },
          ]
        : []),
    ];
    return send(
      p.endsWith('/snapshot')
        ? {
            version: 'fixture-workspaces-1',
            hasEffectiveEducationalRole: !!a.role,
            personalWorkspaceVisible: state.workspaceVisibility === 'unresolved' ? null : !a.role,
            personalVisibilityDecision:
              state.workspaceVisibility === 'unresolved'
                ? 'ProductDecisionRequired'
                : a.role
                  ? 'HiddenByEducationalRole'
                  : 'Visible',
            workspaces: rows,
          }
        : rows,
    );
  }
  if (p === '/api/v1/workspaces/select') {
    if (
      body.workspaceType === 'Organization' &&
      (body.membershipId !== a.membershipId || body.role !== a.role)
    )
      return send({ code: 'WORKSPACE_NOT_ALLOWED' }, 403);
    Object.assign(a.context, {
      workspaceType: body.workspaceType,
      organizationId: body.workspaceType === 'Organization' ? ids.org : null,
      membershipId: body.membershipId,
      activeRole: body.role,
      subjectOrganizationPersonId: null,
    });
    return send(a.context);
  }
  if (p === '/api/v1/me/messaging-status')
    return send(
      make('MessagingStatusResult', {
        verificationStatus: 'Verified',
        effectiveAgeCategory: 'Adult',
        nextAction: 'None',
        allowedActions: [
          'ReadExistingConversations',
          'DiscoverUsers',
          'CreateDirect',
          'CreatePersonalGroup',
          'CreatePersonalChannel',
        ],
        version: '1',
      }),
    );
  if (p === '/api/v1/me/profile') {
    if (body.dateOfBirth && body.dateOfBirth > new Date().toISOString().slice(0, 10))
      return send({ code: 'PROFILE_VALIDATION_FAILED' }, 400);
    Object.assign(a.user, Object.fromEntries(Object.entries(body).filter(([, v]) => v !== null)));
    return send(a.user);
  }
  if (p === '/api/v1/auth/sessions' || p.startsWith('/api/v1/auth/sessions/')) {
    state.sessionRows ??= new Map();
    const key = a.user.id;
    if (!state.sessionRows.has(key))
      state.sessionRows.set(key, [
        make('UserSessionResult', {
          id: id(Number(key.slice(-5)) * 10 + 1),
          deviceName: 'مرورگر فعلی',
          isCurrent: true,
          expiresAtUtc: '2099-01-01T00:00:00Z',
          absoluteExpiresAtUtc: '2099-01-01T00:00:00Z',
        }),
        make('UserSessionResult', {
          id: id(Number(key.slice(-5)) * 10 + 2),
          deviceName: 'دستگاه آزمایشی دوم',
          isCurrent: false,
          expiresAtUtc: '2099-01-01T00:00:00Z',
          absoluteExpiresAtUtc: '2099-01-01T00:00:00Z',
        }),
      ]);
    const rows = state.sessionRows.get(key);
    if (req.method === 'GET') return send(rows);
    if (p.endsWith('/revoke-others')) {
      state.sessionRows.set(
        key,
        rows.filter((row) => row.isCurrent),
      );
      return send(null, 204);
    }
    const target = p.split('/').at(-1);
    if (!rows.some((row) => row.id === target && !row.isCurrent))
      return send({ code: 'SESSION_NOT_FOUND' }, 404);
    state.sessionRows.set(
      key,
      rows.filter((row) => row.id !== target),
    );
    return send(null, 204);
  }
}
