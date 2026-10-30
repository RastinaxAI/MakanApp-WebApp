'use client';
import { Button } from '@/components/ui/button';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="bootstrap state" role="alert">
      <h1>نمایش صفحه ممکن نشد</h1>
      <p>دوباره تلاش کنید. اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.</p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </div>
  );
}
