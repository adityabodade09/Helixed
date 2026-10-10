import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashPassword } from '../src/modules/auth/password.service.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import type {
  AttendanceFilters,
  TeacherAttendanceRepository,
} from '../src/modules/teacher-attendance/teacher-attendance.repository.js';
import { TeacherAttendanceService } from '../src/modules/teacher-attendance/teacher-attendance.service.js';
import type {
  AttendanceValue,
  AttendanceWrite,
  AttendanceWriteResult,
  TeacherAttendanceRecord,
  TeacherAttendanceSessionRecord,
} from '../src/modules/teacher-attendance/teacher-attendance.types.js';
import { InMemoryAuthRepository } from './support/in-memory-auth.repository.js';
import { InMemoryAuthorizationRepository } from './support/in-memory-authorization.repository.js';

const teacherId = randomUUID();
const schoolId = randomUUID();
const classId = randomUUID();
const unassignedClassId = randomUUID();
const firstStudentId = randomUUID();
const secondStudentId = randomUUID();
const outsideStudentId = randomUUID();
const completedSessionId = randomUUID();
const scheduledSessionId = randomUUID();
const cancelledSessionId = randomUUID();
const unrelatedSessionId = randomUUID();
const originalRecordId = randomUUID();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('correct password');
});

class AttendanceRepository implements TeacherAttendanceRepository {
  assignment = true;
  current = new Map<string, { id: string; state: AttendanceValue; recordedAt: Date }>([
    [
      firstStudentId,
      { id: originalRecordId, state: 'PRESENT', recordedAt: new Date('2026-09-01T09:00:00Z') },
    ],
  ]);
  history: { id: string; studentId: string; state: AttendanceValue; supersededAt: Date | null }[] =
    [
      {
        id: originalRecordId,
        studentId: firstStudentId,
        state: 'PRESENT',
        supersededAt: null,
      },
    ];
  audits: {
    studentId: string;
    actorId: string;
    previousState: AttendanceValue | null;
    newState: AttendanceValue;
    action: 'RECORDED' | 'CORRECTED';
  }[] = [];
  listQueries: AttendanceFilters[] = [];

  async findTeacherRoleAssignment(userId: string) {
    return this.assignment && userId === teacherId ? { id: 'teacher-role', schoolId } : null;
  }

  async list(
    queriedTeacherId: string,
    queriedSchoolId: string,
    _now: Date,
    filters: AttendanceFilters,
  ): Promise<TeacherAttendanceRecord | null> {
    if (queriedTeacherId !== teacherId || queriedSchoolId !== schoolId) return null;
    this.listQueries.push(filters);
    const sessions = [
      this.session(completedSessionId, 'COMPLETED'),
      this.session(scheduledSessionId, 'SCHEDULED'),
      this.session(cancelledSessionId, 'CANCELLED'),
    ].filter(
      (session) =>
        (!filters.state || session.state === filters.state) &&
        (!filters.date || session.startsAt.toISOString().startsWith(filters.date)),
    );
    return {
      teacher: { id: teacherId, displayName: 'Neha Kapoor' },
      school: { id: schoolId, name: 'Helixed Demo School' },
      classes: [
        { id: classId, name: 'Class 12', studentIds: [firstStudentId, secondStudentId], sessions },
      ],
    };
  }

  async findSession(
    queriedTeacherId: string,
    queriedSchoolId: string,
    sessionId: string,
  ): Promise<TeacherAttendanceSessionRecord | null> {
    if (queriedTeacherId !== teacherId || queriedSchoolId !== schoolId) return null;
    const state =
      sessionId === completedSessionId
        ? 'COMPLETED'
        : sessionId === scheduledSessionId
          ? 'SCHEDULED'
          : sessionId === cancelledSessionId
            ? 'CANCELLED'
            : null;
    if (!state) return null;
    const session = this.session(sessionId, state);
    return {
      ...session,
      schoolClass: { id: classId, name: 'Class 12' },
      students: [
        {
          id: firstStudentId,
          displayName: 'Aarav Sharma',
          record: this.current.get(firstStudentId) ?? null,
        },
        {
          id: secondStudentId,
          displayName: 'Priya Demo',
          record: this.current.get(secondStudentId) ?? null,
        },
      ],
    };
  }

  async record(
    queriedTeacherId: string,
    queriedSchoolId: string,
    sessionId: string,
    writes: AttendanceWrite[],
    now: Date,
  ): Promise<AttendanceWriteResult> {
    if (
      queriedTeacherId !== teacherId ||
      queriedSchoolId !== schoolId ||
      sessionId !== completedSessionId ||
      writes.some(
        ({ studentId }) => !new Set<string>([firstStudentId, secondStudentId]).has(studentId),
      )
    )
      return 'NOT_AVAILABLE';
    if (
      writes.some(
        ({ studentId, expectedRecordId }) =>
          (this.current.get(studentId)?.id ?? null) !== expectedRecordId,
      )
    )
      return 'CONFLICT';

    for (const write of writes) {
      const current = this.current.get(write.studentId);
      if (current?.state === write.state) continue;
      if (current) {
        const historical = this.history.find(({ id }) => id === current.id)!;
        historical.supersededAt = now;
      }
      const created = { id: randomUUID(), state: write.state, recordedAt: now };
      this.current.set(write.studentId, created);
      this.history.push({
        id: created.id,
        studentId: write.studentId,
        state: write.state,
        supersededAt: null,
      });
      this.audits.push({
        studentId: write.studentId,
        actorId: teacherId,
        previousState: current?.state ?? null,
        newState: write.state,
        action: current ? 'CORRECTED' : 'RECORDED',
      });
    }
    return 'SUCCESS';
  }

  private session(
    id: string,
    state: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
  ): TeacherAttendanceRecord['classes'][number]['sessions'][number] {
    return {
      id,
      subjectName: 'Mathematics',
      startsAt: new Date('2026-09-01T08:00:00Z'),
      endsAt: new Date('2026-09-01T08:45:00Z'),
      state,
      records: [...this.current].map(([studentId, record]) => ({
        studentId,
        state: record.state,
      })),
    };
  }
}

async function setup({
  role = 'teacher',
  permissions = ['teacher_attendance:read', 'teacher_attendance:update'],
  membership = true,
  assignment = true,
}: {
  role?: 'teacher' | 'student' | 'parent';
  permissions?: string[];
  membership?: boolean;
  assignment?: boolean;
} = {}) {
  const auth = new AuthService(
    new InMemoryAuthRepository([
      {
        id: teacherId,
        loginIdentifier: 'teacher-demo',
        displayName: 'Neha Kapoor',
        accountState: 'ACTIVE',
        passwordHash,
      },
    ]),
  );
  const authorization = new InMemoryAuthorizationRepository();
  authorization.assignments = [
    {
      id: 'teacher-role',
      userId: teacherId,
      role,
      scope: 'school',
      schoolId,
      academyId: null,
      permissions,
    },
  ];
  if (membership) authorization.schoolMembers.add(`${teacherId}:${schoolId}`);
  if (assignment) authorization.teacherClasses.add(`${teacherId}:${schoolId}:${classId}`);
  const repository = new AttendanceRepository();
  repository.assignment = assignment;
  const app = createApp({
    authService: auth,
    teacherAttendanceService: new TeacherAttendanceService(
      repository,
      new AuthorizationService(authorization),
    ),
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ loginIdentifier: 'teacher-demo', password: 'correct password' });
  return { app, accessToken: login.body.accessToken as string, repository, authorization };
}

describe('teacher attendance API', () => {
  it('denies unauthenticated access and requires Teacher read scope', async () => {
    expect((await request(createApp()).get('/api/v1/teacher/attendance')).status).toBe(401);
    for (const options of [
      { role: 'student' as const },
      { role: 'parent' as const },
      { permissions: ['teacher_attendance:update'] },
      { membership: false },
      { assignment: false },
    ]) {
      const { app, accessToken } = await setup(options);
      expect(
        (
          await request(app)
            .get('/api/v1/teacher/attendance')
            .set('Authorization', `Bearer ${accessToken}`)
        ).status,
      ).toBe(403);
    }
  });

  it('lists only assigned sessions and preserves explicit lifecycle and missing state', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get('/api/v1/teacher/attendance')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.sessions.map(({ state }: { state: string }) => state).sort()).toEqual([
      'CANCELLED',
      'COMPLETED',
      'SCHEDULED',
    ]);
    const completed = response.body.sessions.find(
      ({ id }: { id: string }) => id === completedSessionId,
    );
    expect(completed).toMatchObject({
      rosterCount: 2,
      recordedCount: 1,
      missingCount: 1,
      absentCount: 0,
      recordingStatus: 'PARTIAL',
    });
    expect(JSON.stringify(response.body)).not.toContain(unrelatedSessionId);
  });

  it('validates filters and independently authorizes an exact class filter', async () => {
    const { app, accessToken, repository } = await setup();
    const get = (path: string) =>
      request(app).get(path).set('Authorization', `Bearer ${accessToken}`);
    expect((await get(`/api/v1/teacher/attendance?classId=${classId}`)).status).toBe(200);
    expect(repository.listQueries.at(-1)).toMatchObject({ classId });
    expect((await get(`/api/v1/teacher/attendance?classId=${unassignedClassId}`)).status).toBe(403);
    expect((await get('/api/v1/teacher/attendance?classId=bad')).status).toBe(400);
    expect((await get('/api/v1/teacher/attendance?date=2026-99-99')).status).toBe(400);
    expect((await get('/api/v1/teacher/attendance?state=FINALIZED')).status).toBe(400);
    expect((await get('/api/v1/teacher/attendance?teacherId=forged')).status).toBe(400);
  });

  it('returns a minimized roster with null for not recorded rather than absence', async () => {
    const { app, accessToken } = await setup();
    const response = await request(app)
      .get(`/api/v1/teacher/attendance/${completedSessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.roster).toEqual([
      expect.objectContaining({
        studentId: firstStudentId,
        displayName: 'Aarav Sharma',
        status: 'PRESENT',
        currentRecordId: originalRecordId,
      }),
      expect.objectContaining({
        studentId: secondStudentId,
        displayName: 'Priya Demo',
        status: null,
        currentRecordId: null,
      }),
    ]);
    expect(Object.keys(response.body.roster[0])).toEqual([
      'studentId',
      'displayName',
      'status',
      'currentRecordId',
      'recordedAt',
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|token|community|doubt|profile|settings|document|application|parent|permission/i,
    );
  });

  it('creates only explicitly supplied initial records with actor audit provenance', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .patch(`/api/v1/teacher/attendance/${completedSessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        records: [{ studentId: secondStudentId, state: 'ABSENT', expectedRecordId: null }],
      });
    expect(response.status).toBe(200);
    expect(repository.current.get(secondStudentId)?.state).toBe('ABSENT');
    expect(repository.current.get(firstStudentId)).toMatchObject({
      id: originalRecordId,
      state: 'PRESENT',
    });
    expect(repository.audits).toEqual([
      {
        studentId: secondStudentId,
        actorId: teacherId,
        previousState: null,
        newState: 'ABSENT',
        action: 'RECORDED',
      },
    ]);
  });

  it('revises by preserving history, superseding once, and appending an audit event', async () => {
    const { app, accessToken, repository } = await setup();
    const response = await request(app)
      .patch(`/api/v1/teacher/attendance/${completedSessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        records: [{ studentId: firstStudentId, state: 'LATE', expectedRecordId: originalRecordId }],
      });
    expect(response.status).toBe(200);
    expect(repository.history).toHaveLength(2);
    expect(
      repository.history.find(({ id }) => id === originalRecordId)?.supersededAt,
    ).not.toBeNull();
    expect(repository.history.filter(({ supersededAt }) => supersededAt === null)).toHaveLength(1);
    expect(repository.current.get(firstStudentId)).toMatchObject({ state: 'LATE' });
    expect(repository.audits[0]).toMatchObject({
      actorId: teacherId,
      previousState: 'PRESENT',
      newState: 'LATE',
      action: 'CORRECTED',
    });
  });

  it('rejects stale writes without changing current state, history, or audit', async () => {
    const { app, accessToken, repository } = await setup();
    const before = JSON.stringify({
      current: [...repository.current],
      history: repository.history,
      audits: repository.audits,
    });
    const response = await request(app)
      .patch(`/api/v1/teacher/attendance/${completedSessionId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        records: [{ studentId: firstStudentId, state: 'ABSENT', expectedRecordId: randomUUID() }],
      });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('ATTENDANCE_CONFLICT');
    expect(
      JSON.stringify({
        current: [...repository.current],
        history: repository.history,
        audits: repository.audits,
      }),
    ).toBe(before);
  });

  it('separates update permission and rejects unauthorized students and invalid payloads', async () => {
    const readOnly = await setup({ permissions: ['teacher_attendance:read'] });
    expect(
      (
        await request(readOnly.app)
          .patch(`/api/v1/teacher/attendance/${completedSessionId}`)
          .set('Authorization', `Bearer ${readOnly.accessToken}`)
          .send({
            records: [{ studentId: secondStudentId, state: 'PRESENT', expectedRecordId: null }],
          })
      ).status,
    ).toBe(403);

    const { app, accessToken } = await setup();
    const patch = (sessionId: string, body: object) =>
      request(app)
        .patch(`/api/v1/teacher/attendance/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);
    expect(
      (
        await patch(completedSessionId, {
          records: [{ studentId: outsideStudentId, state: 'PRESENT', expectedRecordId: null }],
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await patch(completedSessionId, {
          records: [{ studentId: secondStudentId, state: 'UNKNOWN', expectedRecordId: null }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await patch(completedSessionId, {
          records: [
            { studentId: secondStudentId, state: 'PRESENT', expectedRecordId: null },
            { studentId: secondStudentId, state: 'ABSENT', expectedRecordId: null },
          ],
        })
      ).status,
    ).toBe(400);
    expect((await patch('not-a-uuid', { records: [] })).status).toBe(400);
  });

  it('allows writes only for completed assigned sessions and exposes no alternate mutation route', async () => {
    const { app, accessToken, authorization } = await setup();
    const headers = { Authorization: `Bearer ${accessToken}` };
    const body = {
      records: [{ studentId: secondStudentId, state: 'PRESENT', expectedRecordId: null }],
    };
    expect(
      (
        await request(app)
          .patch(`/api/v1/teacher/attendance/${scheduledSessionId}`)
          .set(headers)
          .send(body)
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch(`/api/v1/teacher/attendance/${cancelledSessionId}`)
          .set(headers)
          .send(body)
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app)
          .patch(`/api/v1/teacher/attendance/${unrelatedSessionId}`)
          .set(headers)
          .send(body)
      ).status,
    ).toBe(403);
    authorization.teacherClasses.clear();
    expect(
      (await request(app).get(`/api/v1/teacher/attendance/${completedSessionId}`).set(headers))
        .status,
    ).toBe(403);
    expect(
      (await request(app).post('/api/v1/teacher/attendance').set(headers).send(body)).status,
    ).toBe(404);
  });
});
