import { z } from 'zod';
import {
  normalizeAuthDigits,
  validLoginPhone,
  validLoginOtp,
  phoneInputMessage,
  otpInputMessage,
} from './auth-identifiers';

// This panel accepts Iranian mobile numbers in the user-requested 11-digit national format.
export const phoneInputSchema = z
  .string()
  .transform(normalizeAuthDigits)
  .refine(validLoginPhone, phoneInputMessage);
export const otpInputSchema = z
  .string()
  .transform(normalizeAuthDigits)
  .refine(validLoginOtp, otpInputMessage);
