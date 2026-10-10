import { hasPermission, hasRole } from './authorization';
import type { AuthorizationSnapshot } from './auth.types';

const authorization: AuthorizationSnapshot = {
  assignments: [
    {
      id: 'school-role',
      role: 'school_admin',
      scope: 'school',
      scopeId: 'school-1',
      permissions: ['student:read'],
    },
    {
      id: 'support-role',
      role: 'support_admin',
      scope: 'platform',
      scopeId: null,
      permissions: ['account:support'],
    },
  ],
};

describe('frontend authorization utilities', () => {
  it('checks roles for UX rendering', () => {
    expect(hasRole(authorization, 'school_admin')).toBe(true);
    expect(hasRole(authorization, 'platform_admin')).toBe(false);
  });

  it('checks permissions within one selected role assignment', () => {
    expect(hasPermission(authorization, 'school-role', 'student:read')).toBe(true);
    expect(hasPermission(authorization, 'support-role', 'student:read')).toBe(false);
    expect(hasPermission(authorization, 'unknown-role', 'student:read')).toBe(false);
  });
});
