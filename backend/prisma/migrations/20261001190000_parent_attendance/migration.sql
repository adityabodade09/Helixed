CREATE TYPE "AttendanceSessionState" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceState" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'PARTIAL');

CREATE TABLE "attendance_sessions" (
  "id" UUID NOT NULL,
  "schoolClassId" UUID NOT NULL,
  "subjectName" VARCHAR(120) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "state" "AttendanceSessionState" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_sessions_schoolClassId_fkey" FOREIGN KEY ("schoolClassId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "attendance_records" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "state" "AttendanceState" NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "attendance_sessions_schoolClassId_startsAt_idx" ON "attendance_sessions"("schoolClassId", "startsAt");
CREATE INDEX "attendance_records_studentId_recordedAt_idx" ON "attendance_records"("studentId", "recordedAt");
CREATE INDEX "attendance_records_sessionId_studentId_supersededAt_idx" ON "attendance_records"("sessionId", "studentId", "supersededAt");
CREATE UNIQUE INDEX "attendance_records_current_session_student_key" ON "attendance_records"("sessionId", "studentId") WHERE "supersededAt" IS NULL;

INSERT INTO "permissions" ("key", "description") VALUES ('parent_attendance:read', 'Read authorized child attendance') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_attendance:read') ON CONFLICT DO NOTHING;
