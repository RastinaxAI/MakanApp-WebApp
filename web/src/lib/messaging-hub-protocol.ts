// JSON SignalR framing used by the existing messaging client. Events are hints only;
// protected data is always loaded again through the authorized REST contract.
const separator = '\u001e';
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function frames(text: string): Record<string, unknown>[] {
  if (!text.endsWith(separator)) throw new Error('Incomplete hub frame');
  return text
    .slice(0, -1)
    .split(separator)
    .map((part) => {
      const value: unknown = JSON.parse(part);
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid hub frame');
      return value as Record<string, unknown>;
    });
}
export function validateHubControl(text: string) {
  const input = frames(text);
  for (const frame of input) {
    if (frame.protocol === 'json' && frame.version === 1 && Object.keys(frame).length === 2)
      continue;
    if (frame.type === 6 && Object.keys(frame).length === 1) continue;
    if (
      frame.type !== 1 ||
      typeof frame.invocationId !== 'string' ||
      !/^\d{1,12}$/.test(frame.invocationId)
    )
      throw new Error('Invalid invocation');
    const args = frame.arguments;
    if (!Array.isArray(args) || frame.streamIds || frame.headers)
      throw new Error('Invalid invocation');
    if (frame.target === 'Heartbeat' && args.length === 0) continue;
    if (
      ['SubscribeConversation', 'UnsubscribeConversation'].includes(String(frame.target)) &&
      args.length === 1 &&
      typeof args[0] === 'string' &&
      guid.test(args[0])
    )
      continue;
    throw new Error('Unsupported hub method');
  }
  return text;
}
export function notificationFrames(text: string) {
  if (!text) return '';
  const output: Record<string, unknown>[] = [];
  for (const frame of frames(text)) {
    if (!('type' in frame)) {
      output.push(frame.error ? { error: 'Messaging handshake failed' } : {});
    } else if (
      frame.type === 1 &&
      [
        'ConversationChanged',
        'PeerReadStateChanged',
        'ChecklistChanged',
        'ClientInvalidated',
      ].includes(String(frame.target))
    ) {
      output.push({ type: 1, target: frame.target, arguments: [] });
    } else if (frame.type === 3 && typeof frame.invocationId === 'string') {
      output.push({
        type: 3,
        invocationId: frame.invocationId,
        ...(frame.error ? { error: 'Messaging action failed' } : {}),
      });
    } else if (frame.type === 6) output.push({ type: 6 });
    else if (frame.type === 7)
      output.push({
        type: 7,
        allowReconnect: frame.allowReconnect === true,
        ...(frame.error ? { error: 'Messaging connection closed' } : {}),
      });
  }
  return output.map((frame) => JSON.stringify(frame) + separator).join('');
}
export function negotiation(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid negotiation');
  const data = value as Record<string, unknown>;
  if (
    data.url ||
    data.accessToken ||
    data.error ||
    typeof data.connectionId !== 'string' ||
    typeof data.connectionToken !== 'string' ||
    data.connectionToken.length > 2048 ||
    !Array.isArray(data.availableTransports)
  )
    throw new Error('Invalid negotiation');
  if (
    !data.availableTransports.some(
      (item) => item?.transport === 'LongPolling' && item.transferFormats?.includes('Text'),
    )
  )
    throw new Error('Long polling unavailable');
  return {
    negotiateVersion: 1,
    connectionId: data.connectionId,
    connectionToken: data.connectionToken,
    availableTransports: [{ transport: 'LongPolling', transferFormats: ['Text'] }],
  };
}
