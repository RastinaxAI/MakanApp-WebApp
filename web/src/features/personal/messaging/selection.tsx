'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
const Context = createContext<{ last?: string; remember: (id: string) => void } | null>(null);
/** Mounted under the user/revision keyed live provider; nothing is written to shared storage. */
export function ConversationSelectionProvider({ children }: { children: ReactNode }) {
  const [last, remember] = useState<string>();
  return <Context.Provider value={{ last, remember }}>{children}</Context.Provider>;
}
export function useConversationSelection() {
  const value = useContext(Context);
  if (!value) throw Error('ConversationSelectionProvider required');
  return value;
}
