import { make, id, ids } from './state.mjs';
export const officialIds = {
  group: id(970),
  channel: id(971),
  event: id(972),
  organizationGroup: id(976),
  organizationChannel: id(977),
};
export function release42Route({ state, auth, url, req, body, send }) {
  const p = url.pathname;
  const pairRoute =
    /^\/api\/v1\/organization(?:\/classes\/([^/]+))?\/official-spaces(?:\/activities(?:\/([^/]+))?)?$/.exec(
      p,
    );
  const active =
    auth.context.workspaceType === 'Organization' &&
    auth.context.organizationId === ids.org &&
    ['Teacher', 'Student', 'Manager'].includes(auth.context.activeRole);
  const config = state.officialCase;
  function pair(classId) {
    const sourceKind = classId ? 'Class' : 'Organization',
      sourceId = classId ?? ids.org;
    const endpoint = (purpose) => ({
      conversationId: classId
        ? purpose === 'Group'
          ? officialIds.group
          : officialIds.channel
        : purpose === 'Group'
          ? officialIds.organizationGroup
          : officialIds.organizationChannel,
      state: config?.[purpose === 'Group' ? 'groupState' : 'channelState'] ?? 'Missing',
      capabilities: {
        canRead: config?.canRead ?? true,
        canSend: purpose === 'Group' && (config?.canSend ?? true),
        canManage: false,
      },
      official: {
        sourceKind,
        sourceId,
        organizationId: ids.org,
        purpose,
        displayLabel:
          (purpose === 'Group' ? 'گروه رسمی ' : 'کانال رسمی ') +
          (classId ? 'کلاس ریاضی' : 'آموزشگاه'),
        version: '1',
      },
      attemptCount: 0,
      lastFailureCategory: null,
    });
    return {
      sourceKind,
      sourceId,
      organizationId: ids.org,
      version: '1',
      group: endpoint('Group'),
      channel: endpoint('Channel'),
    };
  }
  function delivery() {
    return ['Group', 'Channel'].map((purpose) =>
      make('AcademicActivityDeliveryResult', {
        eventId: officialIds.event,
        purpose,
        state: purpose === 'Group' ? 'Delivered' : 'Pending',
        conversationId: purpose === 'Group' ? officialIds.group : officialIds.channel,
        messageId: purpose === 'Group' ? id(973) : null,
        attemptCount: purpose === 'Group' ? 1 : 0,
        lastFailureCategory: null,
      }),
    );
  }
  if (pairRoute) {
    const [, classId, eventId] = pairRoute;
    if (
      !active ||
      (!classId && auth.context.activeRole !== 'Manager') ||
      config?.revoked ||
      (classId && classId !== ids.class)
    )
      return send({ code: 'OFFICIAL_SPACE_ACCESS_DENIED' }, 403);
    if (p.includes('/activities')) {
      if (!config) return send([]);
      if (eventId && eventId !== officialIds.event) return send({ code: 'NOT_FOUND' }, 404);
      if (
        url.searchParams.has('kind') &&
        url.searchParams.get('kind') !== (config.kind ?? 'Assignment')
      )
        return send([]);
      return send(delivery());
    }
    return send(pair(classId));
  }
  if (!config) return false;
  function summary(purpose, classId = ids.class) {
    const sourcePair = pair(classId);
    const ep = purpose === 'Group' ? sourcePair.group : sourcePair.channel;
    return make('ConversationSummaryResult', {
      conversationId: ep.conversationId,
      type: purpose,
      scope: 'Organization',
      organizationId: ids.org,
      title: purpose === 'Group' ? 'گروه کلاس ریاضی' : 'کانال کلاس ریاضی',
      official: ep.official,
      isOfficial: true,
      organization: { organizationId: ids.org, organizationName: 'آموزشگاه نمونهٔ کیفیت' },
      lastMessagePreview: 'تکلیف تازه منتشر شد',
      lastMessageAtUtc: '2026-10-30T12:00:00Z',
      lastMessageSequence: 1,
      unreadCount: 1,
    });
  }
  if (p === '/api/v1/conversations' && url.searchParams.get('scope') !== 'Personal')
    return send(
      active && !config.revoked
        ? ['Group', 'Channel']
            .filter((x) => pair(ids.class)[x === 'Group' ? 'group' : 'channel'].state === 'Ready')
            .map((purpose) => summary(purpose))
        : [],
    );
  const route = /^\/api\/v1\/conversations\/([^/]+)(.*)$/.exec(p);
  if (
    !route ||
    ![
      officialIds.group,
      officialIds.channel,
      officialIds.organizationGroup,
      officialIds.organizationChannel,
    ].includes(route[1])
  )
    return false;
  const [, conversationId, tail] = route,
    isClass = [officialIds.group, officialIds.channel].includes(conversationId),
    classId = isClass ? ids.class : null,
    purpose = [officialIds.group, officialIds.organizationGroup].includes(conversationId)
      ? 'Group'
      : 'Channel';
  if (
    !active ||
    (!isClass && auth.context.activeRole !== 'Manager') ||
    config.revoked ||
    config.canRead === false
  )
    return send({ code: 'CONVERSATION_NOT_FOUND' }, 404);
  if (tail === '/summary') return send(summary(purpose, classId));
  if (!tail)
    return send(
      make('ManagedConversationResult', {
        ...summary(purpose, classId),
        managementPolicy: 'SystemManagedAcademic',
        visibility: 'Private',
        groupHistoryPolicy: 'FromJoin',
        memberCapabilities: 'SendMessages, SendMedia',
        status: 'Active',
        version: '1',
        participants: [101, 102, 104].map((n) =>
          make('ConversationParticipantResult', {
            participantId: id(n + 300),
            user: make('SafeMessagingIdentityResult', {
              userId: id(n),
              displayName: 'عضو کلاس ' + n,
            }),
            role: 'Member',
            status: 'Active',
            version: '1',
          }),
        ),
      }),
    );
  if (tail === '/me/restriction')
    return send(
      make('MemberRestrictionResult', {
        conversationId,
        userId: auth.user.id,
        isEffective: false,
        isBanned: false,
        deniedCapabilities: 'None',
      }),
    );
  if (tail === '/messages' && req.method === 'GET') {
    const kind = config.kind ?? 'Assignment';
    return send(
      make('ConversationMessagePageResult', {
        messages: [
          make('ConversationMessageResult', {
            messageId: id(973),
            conversationId,
            senderUserId: id(104),
            sender: make('SafeMessagingIdentityResult', { userId: id(104), displayName: 'ماکان' }),
            clientMessageId: id(974),
            sequence: 1,
            kind: 'Text',
            text: 'اعلان انتشار',
            originKind: 'System',
            sentAtUtc: '2026-10-30T12:00:00Z',
            version: '1',
            academicActivity: isClass
              ? make('AcademicActivityCardResult', {
                  eventId: officialIds.event,
                  kind,
                  sourceId:
                    kind === 'Lesson' ? ids.lesson : kind === 'Exam' ? ids.exam : ids.assignment,
                  sourceVersionId: id(1000),
                  sourceRevision: 1,
                  organizationId: ids.org,
                  classId: ids.class,
                  destinationConversationId: conversationId,
                  destinationPurpose: purpose,
                  actorKind: 'User',
                  initiatedByUserId: id(102),
                  occurredAtUtc: '2026-10-30T12:00:00Z',
                  title: 'تکلیف جدید معلم',
                  dueAtUtc: '2099-11-01T12:00:00Z',
                  availableFromUtc: null,
                  availableUntilUtc: null,
                  state: config.cardState ?? 'Published',
                  isActionable: config.actionable ?? true,
                })
              : null,
          }),
        ],
        nextBeforeSequence: null,
      }),
    );
  }
  if (tail === '/messages' && req.method === 'POST') {
    if (purpose === 'Channel' || config.canSend === false)
      return send({ code: 'SEND_NOT_ALLOWED' }, 403);
    return send(
      make('MessageReceiptResult', {
        conversationId,
        clientMessageId: body.clientMessageId,
        messageId: id(975),
        sequence: 2,
      }),
    );
  }
  if (tail === '/read' || tail === '/delivered')
    return send(
      make('ConversationCursorStateResult', {
        conversationId,
        readThroughSequence: body.throughSequence ?? 1,
      }),
    );
  return false;
}
