'use client';
import * as uiText from '@/content/fa';
import { Button } from '@/components/ui/button';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="bootstrap state" role="alert">
      <h1>{uiText.text_698302cf1af6}</h1>
      <p>{uiText.text_9d597bedb5fd}</p>
      <Button onClick={reset}>{uiText.text_be9b8b4f2b98}</Button>
    </div>
  );
}
