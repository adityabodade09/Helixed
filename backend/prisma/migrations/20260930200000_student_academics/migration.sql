-- CreateEnum
CREATE TYPE "StudentDoubtState" AS ENUM ('OPEN', 'SOLVED');

-- AlterTable
ALTER TABLE "student_tasks" ADD COLUMN "description" TEXT,
ADD COLUMN "subjectId" UUID;

ALTER TABLE "student_exams" ADD COLUMN "detail" VARCHAR(240),
ADD COLUMN "subjectId" UUID;

-- CreateTable
CREATE TABLE "student_notes" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" UUID,
    "title" VARCHAR(240) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_resources" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" UUID,
    "title" VARCHAR(240) NOT NULL,
    "resourceType" VARCHAR(60) NOT NULL,
    "url" VARCHAR(2000),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_syllabus_items" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "student_syllabus_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_doubts" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "subjectId" UUID,
    "question" TEXT NOT NULL,
    "state" "StudentDoubtState" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "student_doubts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_tasks_subjectId_idx" ON "student_tasks"("subjectId");
CREATE INDEX "student_exams_subjectId_idx" ON "student_exams"("subjectId");
CREATE INDEX "student_notes_studentId_updatedAt_idx" ON "student_notes"("studentId", "updatedAt");
CREATE INDEX "student_notes_subjectId_idx" ON "student_notes"("subjectId");
CREATE INDEX "student_resources_studentId_createdAt_idx" ON "student_resources"("studentId", "createdAt");
CREATE INDEX "student_resources_subjectId_idx" ON "student_resources"("subjectId");
CREATE INDEX "student_syllabus_items_studentId_subjectId_displayOrder_idx" ON "student_syllabus_items"("studentId", "subjectId", "displayOrder");
CREATE INDEX "student_doubts_studentId_state_updatedAt_idx" ON "student_doubts"("studentId", "state", "updatedAt");
CREATE INDEX "student_doubts_subjectId_idx" ON "student_doubts"("subjectId");

-- AddForeignKey
ALTER TABLE "student_tasks" ADD CONSTRAINT "student_tasks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_exams" ADD CONSTRAINT "student_exams_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_resources" ADD CONSTRAINT "student_resources_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_resources" ADD CONSTRAINT "student_resources_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_syllabus_items" ADD CONSTRAINT "student_syllabus_items_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_syllabus_items" ADD CONSTRAINT "student_syllabus_items_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_doubts" ADD CONSTRAINT "student_doubts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_doubts" ADD CONSTRAINT "student_doubts_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "student_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description") VALUES
  ('student_academics:read', 'View the authenticated student academic records'),
  ('student_academics:create', 'Create a doubt in the authenticated student academic records')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('STUDENT', 'student_academics:read'),
  ('STUDENT', 'student_academics:create')
ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
