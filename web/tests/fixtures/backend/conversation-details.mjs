import { make, id } from './state.mjs';
export function seedConversationDetails(state, body) {
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
  const v = state.conversationDetail,
    p = url.pathname;
  if (!v) return false;
  if (p === '/api/v1/conversations') {
    const member = v.participants.some(
      (m) => m.user.userId === auth.user.id && m.status === 'Active',
    );
    return send(
      member && Number(url.searchParams.get('page') ?? 1) === 1
        ? [
            make('ConversationSummaryResult', {
              conversationId: v.conversationId,
              type: v.type,
              scope: v.scope,
              organizationId: v.organizationId,
              title: v.title,
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
        isArchived: false,
        unreadCount: 0,
      }),
    );
  if (p === '/api/v1/conversations/' + v.conversationId) return send(v);
  if (p.endsWith('/members')) {
    const page = Number(url.searchParams.get('page') ?? 1);
    return send(
      make('ConversationParticipantPageResult', {
        items: v.participants.slice(page - 1, page),
        page,
        pageSize: 1,
        hasMore: page < 2,
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
