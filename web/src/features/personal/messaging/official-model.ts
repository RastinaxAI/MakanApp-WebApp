import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export type OfficialPair = S['OfficialSpacesPairResult'];
export type OfficialMetadata = NonNullable<S['OfficialSpaceMetadata']>;
export function officialMetadataMatches(summary: S['ConversationSummaryResult']) {
  const m = summary.official;
  return (
    !!m &&
    summary.scope === 'Organization' &&
    m.organizationId === summary.organizationId &&
    m.purpose === summary.type &&
    ['Group', 'Channel'].includes(m.purpose) &&
    ['Class', 'Organization'].includes(m.sourceKind) &&
    (m.sourceKind !== 'Organization' || m.sourceId === m.organizationId)
  );
}
export function officialPairPath(metadata: OfficialMetadata) {
  return metadata.sourceKind === 'Class'
    ? `/api/v1/organization/classes/${metadata.sourceId}/official-spaces`
    : '/api/v1/organization/official-spaces';
}
export function officialEndpoint(pair: OfficialPair, purpose: 'Group' | 'Channel') {
  return purpose === 'Group' ? pair.group : pair.channel;
}
export function boundOfficialEndpoint(pair: OfficialPair, purpose: 'Group' | 'Channel') {
  const endpoint = officialEndpoint(pair, purpose),
    m = endpoint.official;
  return (
    !!m &&
    m.sourceKind === pair.sourceKind &&
    m.sourceId === pair.sourceId &&
    m.organizationId === pair.organizationId &&
    m.purpose === purpose
  );
}
export function readableOfficialEndpoint(pair: OfficialPair, purpose: 'Group' | 'Channel') {
  const endpoint = officialEndpoint(pair, purpose);
  return (
    boundOfficialEndpoint(pair, purpose) &&
    endpoint.state === 'Ready' &&
    endpoint.capabilities.canRead &&
    !!endpoint.conversationId
  );
}
export function officialConversationCapabilities(
  summary: S['ConversationSummaryResult'],
  pair: OfficialPair,
) {
  if (
    !officialMetadataMatches(summary) ||
    !summary.official ||
    pair.sourceKind !== summary.official.sourceKind ||
    pair.sourceId !== summary.official.sourceId ||
    pair.organizationId !== summary.organizationId
  )
    return null;
  const purpose = summary.type === 'Group' ? 'Group' : 'Channel';
  const endpoint = officialEndpoint(pair, purpose);
  if (
    endpoint.conversationId !== summary.conversationId ||
    !readableOfficialEndpoint(pair, purpose)
  )
    return null;
  return endpoint.capabilities;
}

export function academicActivityMatches(
  message: S['ConversationMessageResult'],
  summary: S['ConversationSummaryResult'],
) {
  const card = message.academicActivity;
  return (
    message.originKind === 'System' &&
    !!card &&
    officialMetadataMatches(summary) &&
    summary.official?.sourceKind === 'Class' &&
    card.classId === summary.official.sourceId &&
    card.organizationId === summary.organizationId &&
    card.destinationConversationId === summary.conversationId &&
    card.destinationPurpose === summary.type &&
    message.conversationId === summary.conversationId
  );
}
export function academicActivityHref(card: NonNullable<S['AcademicActivityCardResult']>) {
  const area = { Lesson: 'lessons', Assignment: 'assignments', Exam: 'exams' }[card.kind];
  return `/personal/education/${area}/${encodeURIComponent(card.sourceId)}`;
}
