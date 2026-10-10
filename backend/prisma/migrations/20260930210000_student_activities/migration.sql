CREATE TYPE "StudentActivityStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "StudentCertificateState" AS ENUM ('VERIFIED', 'PENDING', 'NOT_VERIFIED');

ALTER TABLE "student_activities" ADD COLUMN "category" VARCHAR(80),
ADD COLUMN "status" "StudentActivityStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "organization" VARCHAR(240),
ADD COLUMN "description" TEXT;

CREATE TABLE "student_activity_progress_entries" (
  "id" UUID NOT NULL, "studentId" UUID NOT NULL, "activityId" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL, "detail" VARCHAR(500), "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_activity_progress_entries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "student_activity_milestones" (
  "id" UUID NOT NULL, "studentId" UUID NOT NULL, "activityId" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL, "progress" INTEGER NOT NULL DEFAULT 0, "completedAt" TIMESTAMP(3),
  CONSTRAINT "student_activity_milestones_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "student_activity_certificates" (
  "id" UUID NOT NULL, "studentId" UUID NOT NULL, "activityId" UUID,
  "title" VARCHAR(240) NOT NULL, "issuer" VARCHAR(240), "issuedAt" TIMESTAMP(3), "state" "StudentCertificateState" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "student_activity_certificates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_activity_progress_entries_studentId_occurredAt_idx" ON "student_activity_progress_entries"("studentId", "occurredAt");
CREATE INDEX "student_activity_progress_entries_activityId_occurredAt_idx" ON "student_activity_progress_entries"("activityId", "occurredAt");
CREATE INDEX "student_activity_milestones_studentId_activityId_idx" ON "student_activity_milestones"("studentId", "activityId");
CREATE INDEX "student_activity_certificates_studentId_issuedAt_idx" ON "student_activity_certificates"("studentId", "issuedAt");
CREATE INDEX "student_activity_certificates_activityId_idx" ON "student_activity_certificates"("activityId");

ALTER TABLE "student_activity_progress_entries" ADD CONSTRAINT "student_activity_progress_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_activity_progress_entries" ADD CONSTRAINT "student_activity_progress_entries_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "student_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_activity_milestones" ADD CONSTRAINT "student_activity_milestones_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_activity_milestones" ADD CONSTRAINT "student_activity_milestones_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "student_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_activity_certificates" ADD CONSTRAINT "student_activity_certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_activity_certificates" ADD CONSTRAINT "student_activity_certificates_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "student_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description") VALUES
  ('student_activities:read', 'View the authenticated student activities'),
  ('student_activities:create', 'Create an activity for the authenticated student')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('STUDENT', 'student_activities:read'), ('STUDENT', 'student_activities:create')
ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
