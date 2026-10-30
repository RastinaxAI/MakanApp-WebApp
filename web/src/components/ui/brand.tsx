import { BookOpen } from 'lucide-react';
// Original artwork retained for installed-app assets and existing consumers.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="340 235 600 610" aria-hidden="true" focusable="false">
      <image href="/brand/makan-logo.png" width="1254" height="1254" />
    </svg>
  );
}
export function ReferenceBrand() {
  return (
    <>
      <BookOpen size={28} strokeWidth={1.7} aria-hidden="true" />
      <span>ماکان</span>
    </>
  );
}
