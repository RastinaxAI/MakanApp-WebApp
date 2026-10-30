import type { components } from '@/generated/api/schema';
type Snapshot = components['schemas']['WorkspaceSnapshotResult'];
type Workspace = components['schemas']['WorkspaceResult'];

/** Visibility is a server decision, independent from the selected role or capability access. */
export function visibleWorkspaces(snapshot: Snapshot): Workspace[] {
  return snapshot.workspaces.filter(
    (w) =>
      w.isVisible !== false &&
      (w.workspaceType !== 'Personal' || snapshot.personalWorkspaceVisible === true),
  );
}
export function canEnterWorkspace(workspace: Workspace) {
  return workspace.canEnter === true;
}
