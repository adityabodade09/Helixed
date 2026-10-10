/**
 * Opt-in, real PostgreSQL smoke test. Run AFTER build and prisma generate:
 *   node backend/scripts/deployment-smoke.mjs
 * Loads backend/.env without overriding the caller's environment. Never seeds/migrates.
 * Requires exclusive use of the demo accounts while running (snapshot restoration).
 * Exit 1 means a failed assertion, missing prerequisite, or cleanup failure.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const target = new URL(process.env.DATABASE_URL ?? 'invalid:');
assert(['postgres:', 'postgresql:'].includes(target.protocol), 'DATABASE_URL must be PostgreSQL');
assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.port === '5433',
  'Refusing database outside localhost/127.0.0.1:5433');
assert(!target.searchParams.has('host'), 'Refusing PostgreSQL host override');
assert(['development', 'test'].includes(process.env.NODE_ENV ?? 'development'),
  'Refusing production/unknown NODE_ENV');
process.env.NODE_ENV ??= 'development';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.ACCESS_TOKEN_SECRET ??= `local-smoke-only-${randomUUID()}`;
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.LOG_LEVEL = 'silent';

// Dynamic imports are deliberately below the guards and environment initialization.
const { default: request } = await import('supertest');
const { PrismaClient } = await import('@prisma/client');
const { createApp } = await import('../dist/app.js');
const { prisma: appDb } = await import('../dist/database/prisma.js');
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const app = createApp(); // No dependency injection or mock repositories.
const runId = `smoke-${randomUUID()}`;
const cleanup = [];
const results = [];
const sessions = new Set();
const auth = {};
const users = {};
const base = '/api/v1';
const origin = process.env.CORS_ORIGIN;
const features = ['chat', 'doubt', 'study-plan', 'revision', 'daily-plan', 'workload',
  'opportunities', 'career', 'documents', 'certificates', 'achievements', 'insights'];
const growth = ['', '/overview', '/academics', '/activities', '/patterns', '/achievements'];
const limitations = [
  'No external AI inference: deployed default provider is DevelopmentAiProvider.',
  'No browser, binary document storage, load testing, or exhaustive concurrency/interleavings.',
  'No mutation APIs exist for academy CRUD, task completion, assessment creation, or activity progress/certificates.',
  'Teacher Assignment does not fan out StudentTask; applying does not create ParentApprovalRequest. Approval fixture is explicit.',
];

async function check(name, fn) {
  try { await fn(); results.push({ name, status: 'PASS' }); console.log(`PASS ${name}`); }
  catch (error) {
    // Do not print response bodies, credentials, tokens, or connection strings.
    results.push({ name, status: 'FAIL', error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function need(value, label) { assert(value, `Missing prerequisite: ${label}`); return value; }
async function http(role, method, path, body, expected = 200, cookie) {
  const token = typeof role === 'string' ? need(auth[role], `${role} login`).token : role?.token;
  let call = request(app)[method](`${base}${path}`).set('Origin', origin);
  if (token) call = call.set('Authorization', `Bearer ${token}`);
  if (cookie) call = call.set('Cookie', cookie);
  if (body !== undefined) call = call.send(body);
  const response = await call.timeout({ response: 15000, deadline: 20000 });
  assert([].concat(expected).includes(response.status),
    `${method.toUpperCase()} ${path}: expected ${expected}, received ${response.status} (${response.body?.code ?? 'no code'})`);
  return response;
}
const get = async (role, path) => (await http(role, 'get', path)).body;
const contains = (body, value) => assert(JSON.stringify(body).includes(value), `Readback missing ${value}`);
function removeLater(model, where) {
  // Resolve marker-scoped rows to concrete IDs before deleting; never delete by user or time range.
  cleanup.push(async () => {
    const rows = await db[model].findMany({ where, select: { id: true } });
    for (const { id } of rows) await db[model].delete({ where: { id } });
    assert.equal(await db[model].count({ where }), 0, `${model} cleanup incomplete`);
  });
}
async function fixture(model, data) {
  const id = randomUUID();
  removeLater(model, { id }); // Registered before write, including partial failures.
  return db[model].create({ data: { ...data, id } });
}
async function login(role) {
  const password = { student: 'DemoStudent!2026', parent: 'DemoParent!2026',
    teacher: 'DemoTeacher!2026', academy: 'DemoAcademy!2026' }[role];
  const response = await http(null, 'post', '/auth/login',
    { loginIdentifier: `${role}-demo`, password });
  const token = need(response.body.accessToken, 'access token');
  const { sid } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  sessions.add(need(sid, 'session claim'));
  const cookie = need(response.headers['set-cookie']?.find(value =>
    value.startsWith(`${process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'helixed_refresh'}=`)), 'refresh cookie').split(';')[0];
  const session = await db.session.findUniqueOrThrow({ where: { id: sid }, include: { refreshTokens: true } });
  assert.equal(session.userId, users[role].id);
  assert.equal(session.refreshTokens.length, 1);
  return { token, cookie, sid };
}

try {
  await db.$connect();
  const [identity] = await db.$queryRaw`SELECT current_database() AS name, inet_server_port() AS port`;
  // Container host port 5433 can map to server port 5432; the URL is the guard.
  console.log(`Real PostgreSQL smoke ${runId}; database=${identity.name}; serverPort=${identity.port}`);
  for (const role of ['student', 'parent', 'teacher', 'academy']) {
    users[role] = need(await db.user.findUnique({ where: { normalizedLoginIdentifier: `${role}-demo` } }), `${role}-demo seed`);
  }
  const studentId = users.student.id;
  const teacherId = users.teacher.id;
  const classAssignment = need(await db.teacherClassAssignment.findFirst({
    where: { teacherId, revokedAt: null, activeFrom: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      schoolClass: { studentMemberships: { some: { studentId, revokedAt: null } } } },
    include: { schoolClass: true },
  }), 'seeded active teacher/student class');
  const classId = classAssignment.classId;
  const subject = need(await db.studentSubject.findFirst({ where: { studentId } }), 'student subject');
  const sessionSubject = need(await db.attendanceSession.findFirst({ where: { schoolClassId: classId } }), 'class subject');
  const batch = need(await db.batchStudentMembership.findFirst({
    where: { enrollment: { studentId }, revokedAt: null }, include: { batch: true },
  }), 'seeded academy batch');

  for (const role of Object.keys(users)) await check(`login ${role}, persisted session`, async () => { auth[role] = await login(role); });
  const range = new URLSearchParams({ from: new Date(Date.now() - 180 * 86400000).toISOString(),
    to: new Date(Date.now() + 180 * 86400000).toISOString() }).toString();
  const paths = {
    student: ['/auth/me', '/student/dashboard', '/student/profile', '/student/settings',
      ...['', '/schedule', '/tasks', '/class-summary', '/notes', '/exams', '/syllabus', '/resources', '/doubts'].map(p => `/student/academics${p}`),
      '/student/activities', '/student/activities/certificates', `/student/calendar?${range}`,
      ...['', '/inbox', '/sent', '/groups', '/direct'].map(p => `/student/community${p}`),
      ...growth.map(p => `/student/growth${p}`),
      ...['', '/recommended', '/saved', '/applied'].map(p => `/student/opportunities${p}`), '/student/ai/conversations'],
    parent: ['/auth/me', '/parent', '/parent/academics', '/parent/activities', `/parent/calendar?${range}`,
      ...growth.map(p => `/parent/growth${p}`), '/parent/children', `/parent/children/${studentId}`,
      ...['academics', 'attendance', 'tasks', 'activities', 'teachers'].map(p => `/parent/children/${studentId}/${p}`),
      `/parent/children/${studentId}/calendar?${range}`, '/parent/messages', '/parent/approvals',
      '/parent/insights', '/parent/documents', '/parent/opportunities', '/parent/settings'],
    teacher: ['/auth/me', '/teacher', '/teacher/classes', `/teacher/classes/${classId}`,
      '/teacher/students', `/teacher/students/${studentId}`, '/teacher/attendance', '/teacher/assignments',
      '/teacher/marks', `/teacher/class-summary?classId=${classId}`, '/teacher/development',
      `/teacher/development?classId=${classId}&studentId=${studentId}`, '/teacher/opportunities', '/teacher/messages', '/teacher/settings'],
    academy: ['/auth/me', '/academy', '/academy/students', `/academy/students/${studentId}`,
      '/academy/batches', `/academy/batches/${batch.batchId}`, '/academy/coaches', '/academy/settings'],
  };
  await check('health (liveness only)', () => get(null, '/health'));
  for (const [role, urls] of Object.entries(paths)) for (const url of urls)
    await check(`GET ${role} ${url}`, () => get(role, url));

  // All seeded detail resources, including calendar sources outside today's window.
  const details = [
    ['studentTask', { studentId }, id => [['student', `/student/academics/tasks/${id}`]]],
    ['studentActivity', { studentId }, id => [['student', `/student/activities/${id}`], ['student', `/student/activities/${id}/progress`], ['parent', `/parent/activities/${id}?childId=${studentId}`]]],
    ['opportunity', {}, id => [['student', `/student/opportunities/${id}`]]],
    ['attendanceSession', { schoolClassId: classId }, id => [['teacher', `/teacher/attendance/${id}`]]],
    ['assessment', { classId }, id => [['teacher', `/teacher/marks/${id}`]]],
  ];
  for (const [model, where, urls] of details) {
    const rows = await db[model].findMany({ where, select: { id: true } });
    if (!rows.length) results.push({ name: `${model} seeded details`, status: 'SKIP' });
    for (const row of rows) for (const [role, url] of urls(row.id)) await check(`GET ${url}`, () => get(role, url));
  }
  for (const [model, kind, date] of [['studentScheduleItem', 'schedule', 'startsAt'], ['studentTask', 'task', 'dueAt'],
    ['studentExam', 'exam', 'startsAt'], ['studentActivity', 'activity', 'occursAt']]) {
    const rows = await db[model].findMany({ where: { studentId }, select: { id: true, [date]: true } });
    for (const row of rows.filter(row => row[date])) for (const role of ['student', 'parent']) {
      const url = `/${role}/calendar/event/${encodeURIComponent(`${kind}:${row.id}`)}${role === 'parent' ? `?childId=${studentId}` : ''}`;
      await check(`GET ${url}`, () => get(role, url));
    }
  }

  await check('doubt create, direct persistence, reread, cross-role rejection', async () => {
    const where = { studentId, question: runId };
    removeLater('studentDoubt', where);
    await http('parent', 'post', '/student/academics/doubts', { question: runId, subjectId: subject.id }, 403);
    assert.equal(await db.studentDoubt.count({ where }), 0);
    const { body } = await http('student', 'post', '/student/academics/doubts', { question: runId, subjectId: subject.id }, 201);
    assert.equal((await db.studentDoubt.findUniqueOrThrow({ where: { id: body.id } })).studentId, studentId);
    contains(await get('student', '/student/academics/doubts'), body.id);
  });
  await check('activity create and student/parent rereads', async () => {
    removeLater('studentActivity', { studentId, title: runId });
    const { body } = await http('student', 'post', '/student/activities', { title: runId, category: 'Technology', startedAt: new Date().toISOString() }, 201);
    assert.equal((await db.studentActivity.findUniqueOrThrow({ where: { id: body.id } })).title, runId);
    contains(await get('student', `/student/activities/${body.id}`), runId);
    contains(await get('parent', `/parent/activities/${body.id}?childId=${studentId}`), runId);
  });
  await check('profile update and exact field restoration', async () => {
    const before = await db.studentProfile.findUnique({ where: { userId: studentId } });
    cleanup.push(async () => {
      if (before) {
        await db.studentProfile.update({ where: { userId: studentId }, data: { bio: before.bio, interests: before.interests, updatedAt: before.updatedAt } });
        assert.deepEqual(await db.studentProfile.findUnique({ where: { userId: studentId } }), before);
      } else await db.studentProfile.deleteMany({ where: { userId: studentId, bio: runId } });
    });
    await http('student', 'patch', '/student/profile', { bio: runId, interests: ['smoke'] });
    assert.equal((await db.studentProfile.findUniqueOrThrow({ where: { userId: studentId } })).bio, runId);
    contains(await get('student', '/student/profile'), runId);
  });
  await check('opportunity save/unsave/apply, duplicate and parent decision', async () => {
    const opportunity = await fixture('opportunity', { title: runId, isOpen: true, verifiedAt: new Date(), deadline: new Date(Date.now() + 86400000) });
    const url = `/student/opportunities/${opportunity.id}`;
    await http('student', 'post', `${url}/save`, {}, 201);
    await http('student', 'post', `${url}/save`, {}, 201);
    assert.equal(await db.savedOpportunity.count({ where: { studentId, opportunityId: opportunity.id } }), 1);
    contains(await get('student', '/student/opportunities/saved'), opportunity.id);
    await http('student', 'delete', `${url}/save`, undefined, 204);
    assert.equal(await db.savedOpportunity.count({ where: { studentId, opportunityId: opportunity.id } }), 0);
    assert.equal((await get('student', url)).saved, false);
    await http('student', 'post', `${url}/apply`, { note: runId }, 201);
    const application = await db.opportunityApplication.findUniqueOrThrow({ where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } } });
    assert.equal(application.state, 'SUBMITTED');
    contains(await get('student', '/student/opportunities/applied'), application.id);
    await http('student', 'post', `${url}/apply`, { note: runId }, 409);
    // This relationship is not created by the apply API in the current implementation.
    assert.equal(await db.parentApprovalRequest.count({ where: { opportunityApplicationId: application.id } }), 0);
    const approval = await fixture('parentApprovalRequest', { childId: studentId, opportunityApplicationId: application.id, type: 'OPPORTUNITY_APPLICATION' });
    const decisionUrl = `/parent/approvals/${approval.id}/decision`;
    await http('student', 'post', decisionUrl, { decision: 'APPROVED' }, 403);
    await http('parent', 'post', decisionUrl, { decision: 'APPROVED' });
    const stored = await db.parentApprovalRequest.findUniqueOrThrow({ where: { id: approval.id } });
    assert.equal(stored.status, 'APPROVED'); assert.equal(stored.resolvedById, users.parent.id);
    contains(await get('parent', '/parent/approvals'), approval.id);
    await http('parent', 'post', decisionUrl, { decision: 'DECLINED' }, 409);
  });
  await check('community join idempotency and student messages', async () => {
    const group = await fixture('communityGroup', { slug: runId, name: runId });
    const conversation = await fixture('communityConversation', { kind: 'GROUP', groupId: group.id });
    const url = `/student/community/groups/${group.id}/join`;
    await http('student', 'post', url, {}, 201);
    const repeated = await http('student', 'post', url, {}, 201);
    assert.equal(await db.communityGroupMembership.count({ where: { groupId: group.id, userId: studentId } }), 1);
    assert.equal(await db.communityConversationMember.count({ where: { conversationId: conversation.id, userId: studentId } }), 1);
    await http('student', 'post', `/student/community/conversations/${conversation.id}/messages`, { body: runId }, 201);
    assert.equal(await db.communityMessage.count({ where: { conversationId: conversation.id, body: runId, senderId: studentId } }), 1);
    contains(await get('student', `/student/community/groups/${group.id}`), runId);
    // A known defect is reported as FAIL, not silently accepted as the expected result.
    assert.equal(repeated.body.memberCount, 1, 'Repeat join inflates returned memberCount');
  });
  await check('parent/teacher message persistence and reciprocal rereads', async () => {
    const conversation = await fixture('communityConversation', { kind: 'DIRECT', members: { create: [{ userId: users.parent.id }, { userId: teacherId }] } });
    for (const role of ['parent', 'teacher']) {
      await http(role, 'post', `/${role}/messages/${conversation.id}/messages`, { body: `${runId}-${role}` }, 201);
      assert.equal(await db.communityMessage.count({ where: { conversationId: conversation.id, senderId: users[role].id, body: `${runId}-${role}` } }), 1);
    }
    for (const role of ['parent', 'teacher']) {
      const body = await get(role, `/${role}/messages/${conversation.id}`);
      contains(body, `${runId}-parent`); contains(body, `${runId}-teacher`);
    }
    await http('student', 'post', `/student/community/conversations/${conversation.id}/messages`, { body: runId }, [403, 404]);
    assert.equal(await db.communityMessage.count({ where: { conversationId: conversation.id } }), 2);
  });
  await check('teacher assignment create, persistence, list and forbidden class', async () => {
    removeLater('assignment', { createdById: teacherId, title: runId });
    const input = { classId, title: runId, subjectName: sessionSubject.subjectName, status: 'PUBLISHED' };
    await http('student', 'post', '/teacher/assignments', input, 403);
    const { body } = await http('teacher', 'post', '/teacher/assignments', input, 201);
    const row = await db.assignment.findFirstOrThrow({ where: { title: runId, createdById: teacherId } });
    assert.equal(row.classId, classId); contains(body, row.id);
    contains(await get('teacher', `/teacher/assignments?search=${runId}`), row.id);
    assert.equal(await db.studentTask.count({ where: { studentId, title: runId } }), 0);
  });
  for (const kind of ['attendance', 'marks']) await check(`${kind}: create, correction, no-op, stale conflict, persistence`, async () => {
    const attendance = kind === 'attendance';
    const resource = attendance
      ? await fixture('attendanceSession', { schoolClassId: classId, subjectName: sessionSubject.subjectName, startsAt: new Date(), endsAt: new Date(Date.now() + 60000), state: 'COMPLETED' })
      : await fixture('assessment', { classId, createdById: teacherId, title: runId, subjectName: sessionSubject.subjectName, maximumMarks: 100, assessedAt: new Date() });
    const url = `/teacher/${kind}/${resource.id}`;
    const model = attendance ? 'attendanceRecord' : 'mark';
    const where = { [attendance ? 'sessionId' : 'assessmentId']: resource.id, studentId };
    const payload = (expected, value) => ({ [attendance ? 'records' : 'marks']: [{ studentId,
      [attendance ? 'state' : 'value']: value, [attendance ? 'expectedRecordId' : 'expectedMarkId']: expected }] });
    await http('parent', 'patch', url, payload(null, attendance ? 'PRESENT' : 70), 403);
    assert.equal(await db[model].count({ where }), 0);
    await http('teacher', 'patch', url, payload(null, attendance ? 'PRESENT' : 70));
    const first = await db[model].findFirstOrThrow({ where: { ...where, supersededAt: null } });
    await http('teacher', 'patch', url, payload(first.id, attendance ? 'ABSENT' : 80));
    const current = await db[model].findFirstOrThrow({ where: { ...where, supersededAt: null } });
    assert.notEqual(current.id, first.id);
    assert.equal(current[attendance ? 'state' : 'value'], attendance ? 'ABSENT' : 80);
    assert((await db[model].findUniqueOrThrow({ where: { id: first.id } })).supersededAt);
    if (attendance) assert.equal(await db.attendanceAudit.count({ where: { sessionId: resource.id, actorId: teacherId } }), 2);
    else { assert.equal(current.previousMarkId, first.id); assert.equal(current.recordedById, teacherId); }
    await http('teacher', 'patch', url, payload(first.id, attendance ? 'LATE' : 90), 409);
    await http('teacher', 'patch', url, payload(current.id, attendance ? 'ABSENT' : 80));
    assert.equal(await db[model].count({ where }), 2);
    contains(await get('teacher', url), current.id);
    if (attendance) contains(await get('parent', `/parent/children/${studentId}/attendance`), resource.id);
  });
  for (const feature of features) await check(`AI ${feature}: persistence and reread`, async () => {
    const prompt = `${runId}-${feature}`;
    removeLater('aiConversation', { studentId, title: prompt });
    const { body } = await http('student', 'post', `/student/ai/${feature}`, { prompt }, 201);
    const row = await db.aiConversation.findFirstOrThrow({ where: { studentId, title: prompt }, include: { messages: true } });
    assert.equal(row.messages.length, 2); assert.equal(row.feature, feature); contains(body, row.id);
    contains(await get('student', `/student/ai/conversations/${row.id}`), prompt);
    if (feature === 'chat') {
      await http('student', 'post', '/student/ai/chat', { prompt: `${prompt}-followup`, conversationId: row.id }, 201);
      assert.equal(await db.aiMessage.count({ where: { conversationId: row.id } }), 4);
    }
  });

  await check('existing foreign organization resources denied with no writes', async () => {
    const school = await fixture('school', { name: runId, verifiedAt: new Date() });
    const foreignClass = await fixture('schoolClass', { schoolId: school.id, name: runId });
    const academy = await fixture('academy', { name: runId, verifiedAt: new Date() });
    const foreignBatch = await fixture('academyBatch', { academyId: academy.id, name: runId });
    await http('teacher', 'get', `/teacher/classes/${foreignClass.id}`, undefined, 403);
    await http('academy', 'get', `/academy/batches/${foreignBatch.id}`, undefined, 403);
    await http('teacher', 'post', '/teacher/assignments', { classId: foreignClass.id, title: runId, subjectName: 'Mathematics', status: 'DRAFT' }, 403);
    assert.equal(await db.assignment.count({ where: { classId: foreignClass.id } }), 0);
    await http('parent', 'get', `/parent/children/${teacherId}/academics`, undefined, 403);
  });
  await check('cross-role read denial', async () => {
    for (const [role, url] of [['student', '/teacher'], ['teacher', '/academy'], ['academy', '/parent'], ['parent', '/student/dashboard']])
      await http(role, 'get', url, undefined, 403);
  });
  await check('refresh rotation, reuse revocation, separate user remains valid', async () => {
    const original = await login('student');
    const refreshed = await http(null, 'post', '/auth/refresh', {}, 200, original.cookie);
    assert(refreshed.body.accessToken);
    assert.notEqual(refreshed.headers['set-cookie'][0].split(';')[0], original.cookie);
    const tokens = await db.refreshToken.findMany({ where: { sessionId: original.sid } });
    assert.equal(tokens.length, 2); assert.equal(tokens.filter(t => t.usedAt).length, 1);
    await http({ token: refreshed.body.accessToken }, 'get', '/auth/me');
    await http(null, 'post', '/auth/refresh', {}, 401, original.cookie);
    assert((await db.session.findUniqueOrThrow({ where: { id: original.sid } })).revokedAt);
    assert.equal(await db.refreshToken.count({ where: { sessionId: original.sid, revokedAt: null } }), 0);
    await http({ token: refreshed.body.accessToken }, 'get', '/auth/me', undefined, 401);
    await get('parent', '/auth/me');
  });
  await check('logout invalidates own session only', async () => {
    const own = await login('student');
    await http(own, 'post', '/auth/logout', {}, 204, own.cookie);
    assert((await db.session.findUniqueOrThrow({ where: { id: own.sid } })).revokedAt);
    await http(own, 'get', '/auth/me', undefined, 401);
    await get('parent', '/auth/me');
  });
  for (const url of ['/auth/logout-all', '/student/settings/logout-all']) await check(`${url}: all own sessions invalid, another user valid`, async () => {
    // Restore only fields this API changes, on exact rows captured before the request.
    const oldSessions = await db.session.findMany({ where: { userId: studentId }, select: { id: true, revokedAt: true } });
    const oldTokens = await db.refreshToken.findMany({ where: { sessionId: { in: oldSessions.map(s => s.id) } }, select: { id: true, revokedAt: true } });
    cleanup.push(async () => {
      for (const [model, rows] of [['session', oldSessions], ['refreshToken', oldTokens]]) for (const row of rows) {
        await db[model].update({ where: { id: row.id }, data: { revokedAt: row.revokedAt } });
        assert.deepEqual((await db[model].findUniqueOrThrow({ where: { id: row.id } })).revokedAt, row.revokedAt);
      }
    });
    const first = await login('student'); const second = await login('student');
    await http(first, 'post', url, {}, 204);
    assert.equal(await db.session.count({ where: { userId: studentId, revokedAt: null } }), 0);
    await http(first, 'get', '/auth/me', undefined, 401);
    await http(second, 'get', '/auth/me', undefined, 401);
    await get('parent', '/auth/me');
  });
} catch (error) {
  results.push({ name: 'preflight/unhandled failure', status: 'FAIL', error: error.message });
  console.error(`FAIL preflight/unhandled failure: ${error.message}`);
} finally {
  for (const restore of cleanup.reverse()) await check('cleanup/restore', restore);
  for (const id of sessions) await check(`cleanup session ${id}`, async () => {
    await db.session.delete({ where: { id } }); // RefreshToken FK cascades, exact created session only.
    assert.equal(await db.refreshToken.count({ where: { sessionId: id } }), 0);
  });
  await Promise.allSettled([db.$disconnect(), appDb.$disconnect()]);
  const failed = results.filter(r => r.status === 'FAIL');
  const skipped = results.filter(r => r.status === 'SKIP');
  console.log(JSON.stringify({ runId, passed: results.filter(r => r.status === 'PASS').length,
    failed, skipped, untested: limitations }, null, 2));
  if (failed.length || skipped.length) process.exitCode = 1;
}
