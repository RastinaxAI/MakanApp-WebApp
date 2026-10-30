'use client';
import { useEffect, useState } from 'react';
import { remainingExamSeconds } from './exam-clock';

export function useExamClock(deadlineUtc: string, serverNowUtc: string) {
  const [seconds, setSeconds] = useState(() => remainingExamSeconds(deadlineUtc, serverNowUtc));
  useEffect(() => {
    const anchor = performance.now();
    const update = () =>
      setSeconds(remainingExamSeconds(deadlineUtc, serverNowUtc, performance.now() - anchor));
    update();
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [deadlineUtc, serverNowUtc]);
  return seconds;
}
