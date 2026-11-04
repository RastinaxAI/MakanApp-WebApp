import * as uiText from '@/content/fa';
import type { components } from '@/generated/api/schema';
type S = components['schemas'];
export const sourceScopes: Record<S['EducationalSourceScope'], string> = {
  Personal: uiText.text_8957887c2b2f,
  Class: uiText.text_56c43e096bb9,
  Organization: uiText.navigation_education,
  Library: uiText.text_8dfd6e9f41b6,
};
export function sourceDownloadable(source: S['EducationalSourceResult']) {
  return (
    source.scope !== 'Library' &&
    source.capabilities.canDownload &&
    source.fileReady &&
    !!source.file &&
    source.file.status === 'Ready'
  );
}
export function sourceAiSelectable(source: S['EducationalSourceResult']) {
  return (
    source.scope !== 'Library' &&
    source.capabilities.canUseForAi &&
    source.fileReady &&
    source.sourceReady &&
    source.aiReady
  );
}
export function sourceReadiness(source: S['EducationalSourceResult']) {
  return [
    { title: uiText.text_d099cfd756e0, ready: source.fileReady },
    { title: uiText.text_8a52f7bc3f5c, ready: source.sourceReady },
    { title: uiText.text_5e10fc66488f, ready: source.aiReady },
  ];
}
export function preflightMessage(result: S['AiSourcePreflightResult']) {
  if (!result.authorized) return uiText.text_86add7acc8b6;
  if (!result.retrievalAvailable) return uiText.text_c72e1757d1e6;
  return uiText.text_a4a0809f295d;
}
