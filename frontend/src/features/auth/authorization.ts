import type { AuthorizationSnapshot, Role } from './auth.types';

export function hasRole(authorization: AuthorizationSnapshot | null, role: Role): boolean {
  return authorization?.assignments.some((assignment) => assignment.role === role) ?? false;
}

export function hasPermission(
  authorization: AuthorizationSnapshot | null,
  roleAssignmentId: string,
  permission: string,
): boolean {
  return (
    authorization?.assignments
      .find((assignment) => assignment.id === roleAssignmentId)
      ?.permissions.includes(permission) ?? false
  );
}
