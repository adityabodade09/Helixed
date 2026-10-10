CREATE TYPE "AssignmentStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'OPEN',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED'
);

CREATE TABLE "assignments" (
  "id" UUID NOT NULL,
  "classId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "description" TEXT,
  "subjectName" VARCHAR(120) NOT NULL,
  "dueAt" TIMESTAMP(3),
  "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "assignments_classId_status_dueAt_idx" ON "assignments"("classId", "status", "dueAt");
CREATE INDEX "assignments_createdById_idx" ON "assignments"("createdById");

INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_assignments:read', 'Read assignments for actively assigned classes')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_assignments:read')
ON CONFLICT DO NOTHING;
