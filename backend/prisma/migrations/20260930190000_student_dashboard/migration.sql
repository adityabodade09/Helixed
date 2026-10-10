-- CreateEnum
CREATE TYPE "DashboardTaskPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "student_subjects" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "progress" INTEGER NOT NULL,
    "nextClassAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "student_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_tasks" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "priority" "DashboardTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_schedule_items" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "detail" VARCHAR(240),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "color" VARCHAR(20) NOT NULL,

    CONSTRAINT "student_schedule_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_exams" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_activities" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "detail" VARCHAR(240),
    "occursAt" TIMESTAMP(3),

    CONSTRAINT "student_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_announcements" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_opportunities" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "detail" VARCHAR(240),
    "deadline" TIMESTAMP(3),

    CONSTRAINT "student_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_subjects_studentId_displayOrder_idx" ON "student_subjects"("studentId", "displayOrder");

-- CreateIndex
CREATE INDEX "student_tasks_studentId_completedAt_dueAt_idx" ON "student_tasks"("studentId", "completedAt", "dueAt");

-- CreateIndex
CREATE INDEX "student_schedule_items_studentId_startsAt_idx" ON "student_schedule_items"("studentId", "startsAt");

-- CreateIndex
CREATE INDEX "student_exams_studentId_startsAt_idx" ON "student_exams"("studentId", "startsAt");

-- CreateIndex
CREATE INDEX "student_activities_studentId_occursAt_idx" ON "student_activities"("studentId", "occursAt");

-- CreateIndex
CREATE INDEX "student_announcements_studentId_createdAt_idx" ON "student_announcements"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "student_opportunities_studentId_deadline_idx" ON "student_opportunities"("studentId", "deadline");

-- AddForeignKey
ALTER TABLE "student_subjects" ADD CONSTRAINT "student_subjects_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_tasks" ADD CONSTRAINT "student_tasks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_schedule_items" ADD CONSTRAINT "student_schedule_items_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_exams" ADD CONSTRAINT "student_exams_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_announcements" ADD CONSTRAINT "student_announcements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_opportunities" ADD CONSTRAINT "student_opportunities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description")
VALUES ('student_dashboard:read', 'View the authenticated student dashboard')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('STUDENT', 'student_dashboard:read')
ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
