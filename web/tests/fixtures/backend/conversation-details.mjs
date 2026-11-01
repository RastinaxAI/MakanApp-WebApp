import { conversationToolsRoute } from './conversation-tools.mjs';
import { randomUUID } from 'node:crypto';
import { make, id } from './state.mjs';
export function seedConversationDetails(state, body) {
  state.qaInviteLinks = [];
  state.qaTopics = [];
  state.qaJoinRequests = [];
  state.qaMuted = new Map();
  state.conversationMediaTitle = body.mediaTitle ?? 'جزوه';
  state.conversationDetail = make('ManagedConversationResult', {
    conversationId: id(950),
    type: body.type === 'Channel' ? 'Channel' : 'Group',
    scope: 'Personal',
    organizationId: null,
    title: 'گفتگوی آزمایشی جزئیات',
    description: 'توضیحات معتبر گروه آزمایشی',
    managementPolicy: body.system ? 'SystemManagedAcademic' : 'UserManaged',
    visibility: 'Private',
    groupHistoryPolicy: 'FromJoin',
    memberCapabilities: 'SendMessages',
    status: 'Active',
    version: '1',
    participants: [101, 102].map((n, i) =>
      make('ConversationParticipantResult', {
        participantId: id(960 + i),
        user: make('SafeMessagingIdentityResult', {
          userId: id(n),
          displayName: i ? 'عضو آزمایشی دوم' : 'مالک آزمایشی گفتگو',
          username: 'test.' + n,
        }),
        role: i ? 'Member' : 'Owner',
        status: 'Active',
        version: '1',
      }),
    ),
  });
}
export function conversationDetailsRoute({ state, auth, url, req, body, send }) {
  const p = url.pathname;
  if (
    ['/api/v1/conversations/groups', '/api/v1/conversations/channels'].includes(p) &&
    req.method === 'POST'
  ) {
    const operation = auth.user.id + ':' + body.clientOperationId;
    state.createdConversations ??= new Map();
    const old = state.createdConversations.get(operation);
    if (old)
      return JSON.stringify(old.command) === JSON.stringify(body)
        ? send(old.value)
        : send({ code: 'IDEMPOTENCY_CONFLICT' }, 409);
    if (!body.title?.trim() || body.scope !== 'Personal')
      return send({ code: 'VALIDATION_ERROR' }, 400);
    const users = [
      auth.user.id,
      ...new Set((body.initialParticipantUserIds ?? []).filter((id) => id !== auth.user.id)),
    ];
    if (users.some((id) => !state.users.has(id))) return send({ code: 'USER_NOT_FOUND' }, 404);
    const value = make('ManagedConversationResult', {
      conversationId: randomUUID(),
      type: p.endsWith('/channels') ? 'Channel' : 'Group',
      scope: 'Personal',
      organizationId: null,
      title: body.title,
      description: body.description,
      visibility: body.visibility ?? 'Private',
      groupHistoryPolicy: body.groupHistoryPolicy ?? 'FromJoin',
      memberCapabilities: 'SendMessages',
      managementPolicy: 'UserManaged',
      status: 'Active',
      version: '1',
      participants: users.map((userId, i) =>
        make('ConversationParticipantResult', {
          participantId: randomUUID(),
          user: make('SafeMessagingIdentityResult', {
            userId,
            displayName: state.users.get(userId).displayName,
            username: state.users.get(userId).username,
          }),
          role: i ? 'Member' : 'Owner',
          status: 'Active',
          version: '1',
        }),
      ),
    });
    state.conversationDetail = value;
    state.createdConversations.set(operation, { command: body, value });
    return send(value);
  }
  const v = state.conversationDetail;
  if (!v) return false;
  const tools = conversationToolsRoute({ state, auth, url, req, body, send });
  if (tools !== false) return tools;
  if (p === '/api/v1/conversations') {
    const member = v.participants.some(
      (m) => m.user.userId === auth.user.id && m.status === 'Active',
    );
    if (url.searchParams.get('scope') && url.searchParams.get('scope') !== v.scope) return send([]);
    return send(
      member && Number(url.searchParams.get('page') ?? 1) === 1
        ? [
            make('ConversationSummaryResult', {
              conversationId: v.conversationId,
              type: v.type,
              scope: v.scope,
              organizationId: v.organizationId,
              title: v.title,
              isMuted: state.qaMuted?.get(auth.user.id) ?? false,
              isArchived: false,
              unreadCount: 0,
            }),
          ]
        : [],
    );
  }
  if (!p.startsWith('/api/v1/conversations/' + v.conversationId)) return false;
  const member = v.participants.find(
    (m) => m.user.userId === auth.user.id && m.status === 'Active',
  );
  if (!member) return send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
  if (p.endsWith('/summary'))
    return send(
      make('ConversationSummaryResult', {
        conversationId: v.conversationId,
        type: v.type,
        scope: v.scope,
        organizationId: v.organizationId,
        title: v.title,
        isMuted: state.qaMuted?.get(auth.user.id) ?? false,
        isArchived: false,
        unreadCount: 0,
      }),
    );
  if (p === '/api/v1/conversations/' + v.conversationId) return send(v);
  const writable = member.role === 'Owner' && v.managementPolicy === 'UserManaged';
  if (p.endsWith('/info') && req.method === 'PATCH') {
    if (!writable) return send({ code: 'FORBIDDEN' }, 403);
    if (body.expectedVersion !== v.version) return send({ code: 'VERSION_CONFLICT' }, 409);
    if (!body.title?.trim()) return send({ code: 'VALIDATION_ERROR' }, 400);
    v.title = body.title;
    v.description = body.description;
    v.version = String(Number(v.version) + 1);
    return send(
      make('ConversationInfoResult', {
        conversationId: v.conversationId,
        title: v.title,
        description: v.description,
        version: v.version,
      }),
    );
  }
  if (p.endsWith('/members') && req.method === 'POST') {
    if (!writable) return send({ code: 'FORBIDDEN' }, 403);
    const user = state.users.get(body.userId);
    if (!user) return send({ code: 'USER_NOT_FOUND' }, 404);
    if (!v.participants.some((m) => m.user.userId === body.userId && m.status === 'Active'))
      v.participants.push(
        make('ConversationParticipantResult', {
          participantId: randomUUID(),
          user: make('SafeMessagingIdentityResult', {
            userId: user.id,
            displayName: user.displayName,
            username: user.username,
          }),
          role: 'Member',
          status: 'Active',
          version: '1',
        }),
      );
    v.version = String(Number(v.version) + 1);
    return send(v);
  }
  const targetPath = p.match(/\/members\/([^/]+)(\/role)?$/);
  if (targetPath && ['PATCH', 'DELETE'].includes(req.method)) {
    if (!writable) return send({ code: 'FORBIDDEN' }, 403);
    const target = v.participants.find(
      (m) => m.user.userId === targetPath[1] && m.status === 'Active',
    );
    if (!target) return send({ code: 'MEMBER_NOT_FOUND' }, 404);
    if (target.role === 'Owner') return send({ code: 'OWNER_TRANSFER_REQUIRED' }, 409);
    if (req.method === 'DELETE') target.status = 'Removed';
    else {
      if (!['Admin', 'Member'].includes(body.role)) return send({ code: 'INVALID_ROLE' }, 400);
      target.role = body.role;
    }
    v.version = String(Number(v.version) + 1);
    return send(v);
  }
  if (p.endsWith('/messages') && req.method === 'GET')
    return send(
      make('ConversationMessagePageResult', {
        conversationId: v.conversationId,
        messages: [],
        nextBeforeSequence: null,
      }),
    );
  if (p.endsWith('/read-states')) return send([]);
  if (p.endsWith('/me/restriction'))
    return send(
      make('MemberRestrictionResult', { conversationId: v.conversationId, userId: auth.user.id }),
    );
  if (p.endsWith('/members') && req.method === 'GET') {
    const page = Number(url.searchParams.get('page') ?? 1);
    return send(
      make('ConversationParticipantPageResult', {
        items: v.participants.slice(page - 1, page),
        page,
        pageSize: 1,
        hasMore: page < v.participants.length,
      }),
    );
  }
  if (p.endsWith('/media')) {
    if (url.searchParams.get('kind') === 'Image')
      return send(make('ConversationMediaPageResult', { items: [], nextBeforeSequence: null }));
    const next = url.searchParams.get('beforeSequence'),
      sequence = next ? 20 : 50;
    return send(
      make('ConversationMediaPageResult', {
        items: [
          make('ConversationMediaItemResult', {
            messageId: id(sequence),
            sequence,
            senderUserId: id(101),
            attachment: make('MessageAttachmentResult', {
              fileAssetId: id(970 + sequence),
              kind: 'File',
              fileName: `${state.conversationMediaTitle}-${sequence}.pdf`,
              contentType: 'application/pdf',
              sizeBytes: 100,
            }),
          }),
        ],
        nextBeforeSequence: next ? null : 25,
      }),
    );
  }
  if (p.endsWith('/settings') && req.method === 'PATCH') {
    if (member.role !== 'Owner' || v.managementPolicy !== 'UserManaged')
      return send({ code: 'FORBIDDEN' }, 403);
    if (body.expectedVersion !== v.version) return send({ code: 'VERSION_CONFLICT' }, 409);
    Object.assign(v, { ...body, version: String(Number(v.version) + 1) });
    return send(v);
  }
  if (p.endsWith('/leave') && req.method === 'POST') {
    member.status = 'Left';
    return send(v);
  }
  return false;
}
