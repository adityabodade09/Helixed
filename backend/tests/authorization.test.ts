import express from 'express';
import request from 'supertest';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { requestId } from '../src/middleware/request-id.middleware.js';
import { authorize } from '../src/modules/authorization/authorization.middleware.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type { AuthorizationRequest } from '../src/modules/authorization/authorization.types.js';
import type { AuthenticatedPrincipal } from '../src/modules/auth/auth.types.js';
import {
  InMemoryAuthorizationRepository,
  type TestRoleAssignment,
} from './support/in-memory-authorization.repository.js';

const ids = {
  student1: 'student-1',
  student2: 'student-2',
  parent: 'parent-1',
  teacher: 'teacher-1',
  schoolAdmin: 'school-admin-1',
  academyAdmin: 'academy-admin-1',
  platformAdmin: 'platform-admin-1',
  school1: 'school-1',
  school2: 'school-2',
  academy1: 'academy-1',
  academy2: 'academy-2',
  class1: 'class-1',
  class2: 'class-2',
} as const;

function assignment(
  id: string,
  userId: string,
  role: TestRoleAssignment['role'],
  permissions: string[],
  scope: TestRoleAssignment['scope'] = 'platform',
  organizationId?: string,
): TestRoleAssignment {
  return {
    id,
    userId,
    role,
    permissions,
    scope,
    schoolId: scope === 'school' ? (organizationId ?? null) : null,
    academyId: scope === 'academy' ? (organizationId ?? null) : null,
  };
}

function principal(userId: string): AuthenticatedPrincipal {
  return { userId, sessionId: `session-${userId}` };
}

function authorizationRequest(
  roleAssignmentId: string | undefined,
  type: AuthorizationRequest['resource']['type'],
  id: string,
  action = 'read',
): AuthorizationRequest {
  return {
    action,
    resource: { type, id },
    context: roleAssignmentId ? { roleAssignmentId } : undefined,
  };
}

function setup() {
  const repository = new InMemoryAuthorizationRepository();
  repository.assignments = [
    assignment('student-role', ids.student1, 'student', ['student:read']),
    assignment('parent-role', ids.parent, 'parent', ['student:read']),
    assignment(
      'teacher-role',
      ids.teacher,
      'teacher',
      ['student:read', 'class:read'],
      'school',
      ids.school1,
    ),
    assignment(
      'school-admin-role',
      ids.schoolAdmin,
      'school_admin',
      ['student:read'],
      'school',
      ids.school1,
    ),
    assignment(
      'academy-admin-role',
      ids.academyAdmin,
      'academy_admin',
      ['student:read'],
      'academy',
      ids.academy1,
    ),
    assignment('platform-admin-role', ids.platformAdmin, 'platform_admin', []),
  ];
  repository.schoolMembers.add(`${ids.teacher}:${ids.school1}`);
  repository.schoolMembers.add(`${ids.schoolAdmin}:${ids.school1}`);
  repository.academyMembers.add(`${ids.academyAdmin}:${ids.academy1}`);
  repository.schoolResources.add(`${ids.school1}:student:${ids.student1}`);
  repository.schoolResources.add(`${ids.school2}:student:${ids.student2}`);
  repository.academyResources.add(`${ids.academy1}:student:${ids.student1}`);
  repository.academyResources.add(`${ids.academy2}:student:${ids.student2}`);
  repository.teacherClasses.add(`${ids.teacher}:${ids.school1}:${ids.class1}`);
  repository.teacherStudents.add(`${ids.teacher}:${ids.school1}:${ids.student1}:${ids.class1}`);
  return { repository, authorization: new AuthorizationService(repository) };
}

describe('authorization foundation', () => {
  it('denies unauthenticated access in middleware', async () => {
    const { authorization } = setup();
    const app = express();
    app.use(requestId);
    app.get(
      '/protected',
      authorize(authorization, () => authorizationRequest('student-role', 'student', ids.student1)),
      (_request, response) => response.status(204).send(),
    );
    app.use(errorHandler);

    const response = await request(app).get('/protected');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('denies an authenticated user without the explicit permission', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.platformAdmin),
      authorizationRequest('platform-admin-role', 'platform', 'platform', 'manage'),
    );
    expect(decision).toEqual({ allowed: false, reason: 'missing_permission' });
  });

  it('allows the correct explicit permission within scope', async () => {
    const { authorization } = setup();
    await expect(
      authorization.can(
        principal(ids.student1),
        authorizationRequest('student-role', 'student', ids.student1),
      ),
    ).resolves.toEqual({ allowed: true, reason: 'allowed' });
  });

  it('prevents a student from changing an ID to access another student', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.student1),
      authorizationRequest('student-role', 'student', ids.student2),
    );
    expect(decision.allowed).toBe(false);
  });

  it('denies a parent access to an unrelated student', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.parent),
      authorizationRequest('parent-role', 'student', ids.student2),
    );
    expect(decision.allowed).toBe(false);
  });

  it('allows a parent access to a verified linked student when permission exists', async () => {
    const { repository, authorization } = setup();
    repository.parentRelationships.add(`${ids.parent}:${ids.student1}`);

    const decision = await authorization.can(
      principal(ids.parent),
      authorizationRequest('parent-role', 'student', ids.student1),
    );
    expect(decision.allowed).toBe(true);
  });

  it('denies a teacher access to an unassigned student and class', async () => {
    const { authorization } = setup();
    const [studentDecision, classDecision] = await Promise.all([
      authorization.can(
        principal(ids.teacher),
        authorizationRequest('teacher-role', 'student', ids.student2),
      ),
      authorization.can(
        principal(ids.teacher),
        authorizationRequest('teacher-role', 'class', ids.class2),
      ),
    ]);
    expect(studentDecision.allowed).toBe(false);
    expect(classDecision.allowed).toBe(false);
  });

  it('prevents academy users from crossing academy boundaries', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.academyAdmin),
      authorizationRequest('academy-admin-role', 'student', ids.student2),
    );
    expect(decision.allowed).toBe(false);
  });

  it('prevents school users from crossing school boundaries', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.schoolAdmin),
      authorizationRequest('school-admin-role', 'student', ids.student2),
    );
    expect(decision.allowed).toBe(false);
  });

  it('does not give an administrator every permission automatically', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.platformAdmin),
      authorizationRequest('platform-admin-role', 'student', ids.student1),
    );
    expect(decision.allowed).toBe(false);
  });

  it('allows an explicit administrative permission only inside its scope', async () => {
    const { authorization } = setup();
    const [inside, outside] = await Promise.all([
      authorization.can(
        principal(ids.schoolAdmin),
        authorizationRequest('school-admin-role', 'student', ids.student1),
      ),
      authorization.can(
        principal(ids.schoolAdmin),
        authorizationRequest('school-admin-role', 'student', ids.student2),
      ),
    ]);
    expect(inside.allowed).toBe(true);
    expect(outside.allowed).toBe(false);
  });

  it('defaults to deny when role context is missing', async () => {
    const { authorization } = setup();
    const decision = await authorization.can(
      principal(ids.student1),
      authorizationRequest(undefined, 'student', ids.student1),
    );
    expect(decision).toEqual({ allowed: false, reason: 'missing_context' });
  });
});
