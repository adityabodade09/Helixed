CREATE TYPE "AttendanceAuditAction" AS ENUM ('RECORDED', 'CORRECTED');

CREATE TABLE "attendance_audits" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "previousRecordId" UUID,
  "newRecordId" UUID,
  "previousState" "AttendanceState",
  "newState" "AttendanceState" NOT NULL,
  "action" "AttendanceAuditAction" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_audits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_audits_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_previousRecordId_fkey" FOREIGN KEY ("previousRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "attendance_audits_newRecordId_fkey" FOREIGN KEY ("newRecordId") REFERENCES "attendance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "attendance_audits_sessionId_studentId_createdAt_idx" ON "attendance_audits"("sessionId", "studentId", "createdAt");
CREATE INDEX "attendance_audits_actorId_createdAt_idx" ON "attendance_audits"("actorId", "createdAt");

INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_attendance:read', 'Read attendance for actively assigned classes'),
  ('teacher_attendance:update', 'Record attendance for actively assigned classes')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_attendance:read'),
  ('TEACHER', 'teacher_attendance:update')
ON CONFLICT DO NOTHING;
