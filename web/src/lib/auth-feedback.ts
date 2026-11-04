import * as uiText from '@/content/fa';
import { ApiError } from './api/errors';

export function loginFailureMessage(error: ApiError, verifying: boolean) {
  if (error.status === 504) return uiText.text_050985dab36b;
  // An unstructured 404 from the app/server is not evidence that the phone/account is absent.
  if (error.status === 404 && !error.problem.code)
    return verifying ? uiText.text_e0490943e820 : uiText.text_4a9646071ab5;
  if (error.status !== 500 || (error.problem.code && error.problem.code !== 'UNEXPECTED_ERROR'))
    return error.message;
  return verifying ? uiText.text_4d331365b93f : uiText.text_586075f939b9;
}
