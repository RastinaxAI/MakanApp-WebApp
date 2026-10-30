'use client';
import { draftPrefix, parseTextDraft } from '@/lib/draft-storage';
import { useEffect, useState } from 'react';
import { useUnsavedChanges } from './use-unsaved-changes';

export function useTextDraft(scope: string, initialText: string, version: string) {
  const key = draftPrefix + scope;
  const [text, setText] = useState(initialText),
    [baseVersion, setBaseVersion] = useState(version),
    [ready, setReady] = useState(false);
  const dirty = text !== initialText;
  useEffect(() => {
    try {
      const saved = parseTextDraft(sessionStorage.getItem(key));
      if (saved) {
        setText(saved.text);
        setBaseVersion(saved.version);
      }
    } catch {
      /* Server draft remains usable when browser storage is unavailable. */
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      if (dirty) sessionStorage.setItem(key, JSON.stringify({ text, version: baseVersion }));
      else sessionStorage.removeItem(key);
    } catch {}
  }, [key, text, baseVersion, ready, dirty]);
  useUnsavedChanges(dirty);
  function reset(nextText = initialText, nextVersion = version) {
    setText(nextText);
    setBaseVersion(nextVersion);
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }
  return { text, setText, baseVersion, dirty, ready, reset };
}
