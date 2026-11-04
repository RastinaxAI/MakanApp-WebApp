import type { ReferenceBlueprint } from './types';
const views = new Map<string, ReferenceBlueprint>();
export function registerBlueprints(blueprints: ReferenceBlueprint[]) {
  for (const view of blueprints) views.set(view.id, view);
}
export function referenceBlueprint(id: string) {
  const view = views.get(id);
  if (!view) throw Error('Reference view was not loaded: ' + id);
  return view;
}
