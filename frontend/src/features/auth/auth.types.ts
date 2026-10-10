export type Role =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'academy_owner'
  | 'academy_admin'
  | 'academy_coach'
  | 'platform_admin'
  | 'security_admin'
  | 'safety_admin'
  | 'moderation_admin'
  | 'ai_admin'
  | 'support_admin'
  | 'analytics_admin';

export type AccountState = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface AuthUser {
  id: string;
  loginIdentifier: string;
  displayName: string | null;
  accountState: AccountState;
}

export interface AuthenticationResult {
  accessToken: string;
  user: AuthUser;
}

export type AuthenticationStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthorizationScope = 'platform' | 'school' | 'academy';

export interface RoleAssignment {
  id: string;
  role: Role;
  scope: AuthorizationScope;
  scopeId: string | null;
  permissions: string[];
}

export interface AuthorizationSnapshot {
  assignments: RoleAssignment[];
}
