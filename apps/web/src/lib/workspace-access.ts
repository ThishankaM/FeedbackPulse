import type { WorkspaceMembership } from '../context/AuthContext';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Resolve the authenticated user's role for the active workspace slug.
 */
export function getWorkspaceRole(
  memberships: WorkspaceMembership[],
  workspaceSlug?: string | null
): WorkspaceRole | null {
  if (!workspaceSlug) return null;
  const match = memberships.find((m) => m.workspaceSlug === workspaceSlug);
  if (!match) return null;
  if (match.role === 'OWNER' || match.role === 'ADMIN' || match.role === 'MEMBER') {
    return match.role;
  }
  return null;
}

/**
 * Return true when a workspace role grants management permissions (OWNER or ADMIN).
 */
export function isWorkspaceManagerRole(role: string | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Derive the shared management capability for the active workspace.
 */
export function canManageActiveWorkspace(
  memberships: WorkspaceMembership[],
  workspaceSlug?: string | null
): boolean {
  return isWorkspaceManagerRole(getWorkspaceRole(memberships, workspaceSlug));
}
