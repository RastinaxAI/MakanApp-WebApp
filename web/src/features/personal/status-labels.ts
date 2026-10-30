import type { components } from '@/generated/api/schema';
export const ageVerificationLabels: Record<
  components['schemas']['CommunicationAgeVerificationStatus'],
  string
> = { Unverified: 'تأیید نشده', Verified: 'تأیید شده', Conflict: 'نیازمند رفع مغایرت' };
export const ageCategoryLabels: Record<components['schemas']['CommunicationAgeCategory'], string> =
  { Unknown: 'هنوز مشخص نشده', Minor: 'کم‌سن', Adult: 'بزرگسال' };
export const messagingNextLabels: Record<components['schemas']['MessagingNextAction'], string> = {
  None: 'اقدام دیگری لازم نیست',
  VerificationRequired: 'تأیید سن ارتباطی لازم است',
  ProfileCompletionRequired: 'پروفایل را تکمیل کنید',
  VerificationConflictResolutionRequired: 'مغایرت اطلاعات سن نیاز به بررسی دارد',
  MessagingRestrictionActive: 'محدودیت ارتباطی حساب فعال است',
  SelectPersonalWorkspace: 'فضای شخصی را انتخاب کنید',
};
