import { describe, expect, it } from 'vitest';
import { negotiation, notificationFrames, validateHubControl } from '@/lib/messaging-hub-protocol';
const frame = (value: unknown) => JSON.stringify(value) + '\u001e';
describe('server-side messaging transport boundary', () => {
  it('permits the observed JSON handshake, subscription and heartbeat controls, never hub message writes', () => {
    const controls =
      frame({ protocol: 'json', version: 1 }) +
      frame({
        type: 1,
        invocationId: '0',
        target: 'SubscribeConversation',
        arguments: ['00000000-0000-0000-0000-000000000001'],
      }) +
      frame({ type: 1, invocationId: '1', target: 'Heartbeat', arguments: [] });
    expect(validateHubControl(controls)).toBe(controls);
    for (const target of ['SendMessage', 'SelectWorkspace', 'SubscribePresence'])
      expect(() =>
        validateHubControl(frame({ type: 1, invocationId: '2', target, arguments: [] })),
      ).toThrow();
    expect(() =>
      validateHubControl(
        frame({
          type: 1,
          invocationId: '3',
          target: 'SubscribeConversation',
          arguments: ['../admin'],
        }),
      ),
    ).toThrow();
  });
  it('forwards notification names while stripping message payloads, unknown events and server error details', () => {
    const input =
      frame({}) +
      frame({
        type: 1,
        target: 'ConversationChanged',
        arguments: [{ text: 'old organization private message' }],
      }) +
      frame({ type: 1, target: 'PresenceChanged', arguments: ['sensitive presence'] }) +
      frame({ type: 3, invocationId: '0', result: { accessToken: 'private-result' } }) +
      frame({ type: 7, error: 'private-server-detail', allowReconnect: true });
    const output = notificationFrames(input);
    expect(output).toContain('ConversationChanged');
    expect(output).not.toMatch(/old organization|PresenceChanged|sensitive|private/);
    expect(output).toContain('"invocationId":"0"');
    expect(notificationFrames('')).toBe('');
    expect(() => notificationFrames('{"type":1}')).toThrow();
  });
  it('rejects negotiation redirects and credentials and advertises only the selected long polling transport', () => {
    const response = {
      connectionId: 'id',
      connectionToken: 'opaque-connection-token',
      availableTransports: [
        { transport: 'WebSockets', transferFormats: ['Text'] },
        { transport: 'LongPolling', transferFormats: ['Text'] },
      ],
    };
    expect(negotiation(response).availableTransports).toEqual([
      { transport: 'LongPolling', transferFormats: ['Text'] },
    ]);
    expect(() => negotiation({ ...response, url: 'https://other-server.test' })).toThrow();
    expect(() => negotiation({ ...response, accessToken: 'jwt' })).toThrow();
  });
});
