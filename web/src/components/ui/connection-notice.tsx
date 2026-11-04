'use client';
import * as uiText from '@/content/fa';
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
export function ConnectionNotice({
  cached,
  error = false,
  onRetry,
}: {
  cached: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (online && !error) return null;
  return (
    <div className="connection-notice" role="status">
      <WifiOff size={20} />
      <p>{cached ? uiText.text_6c3f309202ba : uiText.text_e295c9d4fa1a}</p>
      {onRetry && (
        <button
          type="button"
          disabled={!online}
          aria-label={uiText.text_3e76fdc3cf0b}
          onClick={onRetry}
        >
          <RefreshCw size={19} />
        </button>
      )}
    </div>
  );
}
