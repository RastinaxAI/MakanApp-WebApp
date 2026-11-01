import { randomUUID } from 'node:crypto';
import { make } from './state.mjs';
export function conversationToolsRoute({ state, auth, url, req, body, send }) {
  const v = state.conversationDetail;
  if (!v) return false;
  const base = '/api/v1/conversations/' + v.conversationId,
    p = url.pathname;
  const member = v.participants.find(
    (m) => m.user.userId === auth.user.id && m.status === 'Active',
  );
  const writable = member?.role === 'Owner' && v.managementPolicy === 'UserManaged';
  const relevant =
    p.startsWith(base + '/invite-links') ||
    p.startsWith(base + '/topics') ||
    p === base + '/mute' ||
    p === base + '/join-requests' ||
    p === '/api/v1/messaging/invite-links/redeem' ||
    p.startsWith('/api/v1/messaging/join-requests/');
  if (!relevant) return false;
  state.qaInviteLinks ??= [];
  state.qaTopics ??= [];
  state.qaJoinRequests ??= [];
  state.qaMuted ??= new Map();
  const addMember = (userId) => {
    if (!v.participants.some((m) => m.user.userId === userId && m.status === 'Active'))
      v.participants.push(
        make('ConversationParticipantResult', {
          participantId: randomUUID(),
          user: make('SafeMessagingIdentityResult', {
            userId,
            displayName: state.users.get(userId).displayName,
          }),
          role: 'Member',
          status: 'Active',
          version: '1',
        }),
      );
  };
  if (p === '/api/v1/messaging/invite-links/redeem') {
    const row = state.qaInviteLinks.find((x) => x.token === body.token);
    if (
      !row ||
      row.link.revokedAtUtc ||
      new Date(row.link.expiresAtUtc) <= new Date() ||
      row.link.usedCount >= row.link.maximumUses
    )
      return send({ code: 'INVITE_LINK_INVALID' }, 404);
    if (member)
      return send(
        make('InviteLinkRedemptionResult', {
          conversationId: v.conversationId,
          alreadyMember: true,
          joinRequest: null,
        }),
      );
    let joinRequest = null;
    if (row.link.requiresApproval) {
      joinRequest = make('ConversationJoinRequestResult2', {
        id: randomUUID(),
        conversationId: v.conversationId,
        userId: auth.user.id,
        status: 'Pending',
        version: '1',
      });
      state.qaJoinRequests.push(joinRequest);
    } else addMember(auth.user.id);
    row.link.usedCount++;
    return send(
      make('InviteLinkRedemptionResult', {
        conversationId: v.conversationId,
        alreadyMember: false,
        joinRequest,
      }),
    );
  }
  if (p.startsWith('/api/v1/messaging/join-requests/')) {
    if (!writable) return send({ code: 'FORBIDDEN' }, 403);
    const parts = p.split('/'),
      row = state.qaJoinRequests.find((x) => x.id === parts.at(-2));
    if (!row) return send({ code: 'NOT_FOUND' }, 404);
    if (row.version !== body.expectedVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    row.status = parts.at(-1) === 'approve' ? 'Approved' : 'Rejected';
    row.version = '2';
    if (row.status === 'Approved') addMember(row.userId);
    return send(row);
  }
  if (!member) return send({ code: 'FORBIDDEN' }, 403);
  if (p.endsWith('/mute')) {
    if (!['PUT', 'DELETE'].includes(req.method)) return send({}, 405);
    state.qaMuted.set(auth.user.id, req.method === 'PUT');
    return send(
      make('ConversationUserStateResult', {
        conversationId: v.conversationId,
        isMuted: req.method === 'PUT',
        muteMode: req.method === 'PUT' ? 'Permanent' : 'None',
        mutedUntilUtc: null,
      }),
    );
  }
  if (p.endsWith('/topics') && req.method === 'GET')
    return send(
      make('ConversationTopicPageResult', {
        items: state.qaTopics,
        hasMore: false,
        canManage: writable,
      }),
    );
  if (!writable) return send({ code: 'FORBIDDEN' }, 403);
  if (p.endsWith('/join-requests'))
    return send(
      make('ConversationJoinRequestPageResult', { items: state.qaJoinRequests, hasMore: false }),
    );
  if (p.endsWith('/topics') && req.method === 'POST') {
    const old = state.qaTopics.find((x) => x.topicId === body.clientTopicId);
    if (old) return send(old);
    const row = make('ConversationTopicResult', {
      topicId: body.clientTopicId,
      conversationId: v.conversationId,
      title: body.title,
      status: 'Open',
      version: '1',
    });
    state.qaTopics.push(row);
    return send(row);
  }
  if (p.includes('/topics/') && req.method === 'PUT') {
    const row = state.qaTopics.find((x) => x.topicId === p.split('/').at(-1));
    if (!row) return send({}, 404);
    if (row.version !== body.expectedVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    Object.assign(row, {
      title: body.title,
      status: body.status,
      version: String(Number(row.version) + 1),
    });
    return send(row);
  }
  if (p.endsWith('/invite-links') && req.method === 'GET')
    return send(
      make('InviteLinkPageResult', {
        items: state.qaInviteLinks.map((x) => x.link),
        hasMore: false,
      }),
    );
  if (p.endsWith('/invite-links') && req.method === 'POST') {
    const old = state.qaInviteLinks.find((x) => x.link.id === body.clientLinkId);
    if (old) return send(make('CreatedInviteLinkResult', { ...old, alreadyExisted: true }));
    const row = {
      link: make('InviteLinkResult', {
        id: body.clientLinkId,
        conversationId: v.conversationId,
        createdByUserId: auth.user.id,
        expiresAtUtc: body.expiresAtUtc,
        maximumUses: body.maximumUses,
        usedCount: 0,
        requiresApproval: body.requiresApproval,
        revokedAtUtc: null,
        version: '1',
      }),
      token: randomUUID(),
    };
    state.qaInviteLinks.push(row);
    return send(make('CreatedInviteLinkResult', { ...row, alreadyExisted: false }));
  }
  if (p.endsWith('/revoke')) {
    const row = state.qaInviteLinks.find((x) => x.link.id === p.split('/').at(-2));
    if (!row) return send({}, 404);
    if (row.link.version !== body.expectedVersion) return send({ code: 'VERSION_CONFLICT' }, 409);
    row.link.revokedAtUtc = new Date().toISOString();
    row.link.version = '2';
    return send(row.link);
  }
  return false;
}
