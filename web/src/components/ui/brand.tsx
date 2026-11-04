import * as uiText from '@/content/fa';
export function BrandMark() {
  return (
    <img
      className="brand-mark"
      src="/brand/makan-logo-v2.webp"
      width="56"
      height="56"
      alt={uiText.text_3e23e3fb6347}
      decoding="async"
    />
  );
}
export function ReferenceBrand() {
  return (
    <>
      <BrandMark />
      <span>{uiText.brand_name}</span>
    </>
  );
}
