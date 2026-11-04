import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
import { ApiError } from '@/lib/api/errors';
export type QueuedMessage = {
  id: string;
  userId: string;
  conversationId: string;
  scopeKey: string;
  command: components['schemas']['SendMessageCommand'];
  attachments?: components['schemas']['MessageAttachmentResult'][];
  createdAt: string;
  state: 'sending' | 'uncertain' | 'rate-limited' | 'rejected';
  error?: string;
  retryAt?: number;
  retryable?: boolean;
};
export interface QueueStorage {
  list(): Promise<QueuedMessage[]>;
  put(message: QueuedMessage): Promise<void>;
  remove(id: string): Promise<void>;
}
export class MessageQueue {
  constructor(private storage: QueueStorage) {}
  async list(userId: string, conversationId: string, scopeKey: string) {
    return (await this.storage.list())
      .filter(
        (m) =>
          m.userId === userId && m.conversationId === conversationId && m.scopeKey === scopeKey,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  put(message: QueuedMessage) {
    return this.storage.put(message);
  }
  remove(id: string) {
    return this.storage.remove(id);
  }
  async send(
    message: QueuedMessage,
    owner: { userId: string; conversationId: string; scopeKey: string },
    transport: (
      command: components['schemas']['SendMessageCommand'],
    ) => Promise<components['schemas']['MessageReceiptResult']>,
  ) {
    if (
      message.userId !== owner.userId ||
      message.conversationId !== owner.conversationId ||
      message.scopeKey !== owner.scopeKey ||
      message.command.clientMessageId !== message.id
    )
      throw new ApiError(409, { code: 'CONTEXT_CHANGED' });
    if (message.retryAt && message.retryAt > Date.now())
      throw new ApiError(429, { code: 'RATE_LIMITED' });
    if (message.retryable === false)
      throw new ApiError(422, { code: 'MESSAGE_SAFETY_REVIEW_REQUIRED' });
    await this.storage.put({ ...message, state: 'sending', error: undefined });
    try {
      const receipt = await transport(message.command);
      if (
        receipt.clientMessageId !== message.id ||
        receipt.conversationId !== message.conversationId ||
        receipt.status !== 'Sent'
      )
        throw new ApiError(502, { code: 'CONTRACT_MISMATCH' });
      await this.storage.remove(message.id);
      return receipt;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const state: QueuedMessage['state'] =
        status === 429
          ? 'rate-limited'
          : status >= 400 && status < 500 && ![401, 408, 409].includes(status)
            ? 'rejected'
            : 'uncertain';
      const retryAfter = error instanceof ApiError ? error.problem.retryAfter : undefined;
      await this.storage.put({
        ...message,
        state,
        retryable:
          error instanceof ApiError &&
          (error.problem.code === 'MESSAGE_SAFETY_REVIEW_REQUIRED' ||
            error.problem.retryable === false)
            ? false
            : undefined,
        error:
          state === 'rejected'
            ? error instanceof ApiError
              ? error.message
              : uiText.text_5fd06a3c4c14
            : state === 'rate-limited'
              ? uiText.text_80457c1dd4a2
              : uiText.text_27fa67add2f7,
        retryAt: status === 429 && retryAfter ? Date.now() + retryAfter * 1000 : undefined,
      });
      throw error;
    }
  }
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error(uiText.text_7a962146b807));
      return;
    }
    const request = indexedDB.open('makan-personal-outbox-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('messages', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(new Error(uiText.text_7ea74f37862c));
    };
  }));
}
async function transaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('messages', mode);
    const result = work(tx.objectStore('messages'));
    tx.oncomplete = () => resolve(result.result);
    tx.onerror = () => reject(new Error(uiText.text_7ea74f37862c));
    tx.onabort = () => reject(new Error(uiText.text_3a9949fcd7d5));
  });
}
export const personalMessageQueue = new MessageQueue({
  list: () => transaction('readonly', (store) => store.getAll()),
  put: async (message) => {
    await transaction('readwrite', (store) => store.put(message));
  },
  remove: async (id) => {
    await transaction('readwrite', (store) => store.delete(id));
  },
});
