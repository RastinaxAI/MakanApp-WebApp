import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
export const ageVerificationLabels: Record<
  components['schemas']['CommunicationAgeVerificationStatus'],
  string
> = {
  Unverified: uiText.text_c4e5e84cee8d,
  Verified: uiText.text_09d532dc89b6,
  Conflict: uiText.text_4f7ffccf7e7d,
};
export const ageCategoryLabels: Record<components['schemas']['CommunicationAgeCategory'], string> =
  {
    Unknown: uiText.text_53e6049febad,
    Minor: uiText.text_6061ba58845e,
    Adult: uiText.text_5b90087ef961,
  };
export const messagingNextLabels: Record<components['schemas']['MessagingNextAction'], string> = {
  None: uiText.text_6f41c3160dce,
  VerificationRequired: uiText.text_712e7c54338d,
  ProfileCompletionRequired: uiText.text_42cad11a8844,
  VerificationConflictResolutionRequired: uiText.text_25c400b0f133,
  MessagingRestrictionActive: uiText.text_b7da574dc0b7,
  SelectPersonalWorkspace: uiText.text_38adbb3eb81b,
};
