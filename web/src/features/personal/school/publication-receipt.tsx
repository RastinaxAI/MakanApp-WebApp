'use client';
import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
import { number } from '@/lib/formatting';
export function PublicationReceipt({
  value,
}: {
  value?: components['schemas']['AcademicPublicationReceipt'];
}) {
  if (!value) return null;
  return (
    <p role="status">
      {uiText.text_2b5b12046f6c}
      {number(value.sourceRevision)}
      {uiText.text_ee6d219bd20f}{' '}
      {value.deliveryState === 'Delivered'
        ? uiText.text_be84e1c9d36f
        : value.deliveryState === 'Pending'
          ? uiText.text_3a487c73c31b
          : uiText.text_621141ef80a1}
    </p>
  );
}
