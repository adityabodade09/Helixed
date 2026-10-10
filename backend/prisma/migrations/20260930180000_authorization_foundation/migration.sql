-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'SCHOOL_ADMIN', 'ACADEMY_OWNER', 'ACADEMY_ADMIN', 'ACADEMY_COACH', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SAFETY_ADMIN', 'MODERATION_ADMIN', 'AI_ADMIN', 'SUPPORT_ADMIN', 'ANALYTICS_ADMIN');

-- CreateEnum
CREATE TYPE "AuthorizationScope" AS ENUM ('PLATFORM', 'SCHOOL', 'ACADEMY');

-- CreateTable
CREATE TABLE "roles" (
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleCode" "RoleCode" NOT NULL,
    "permissionKey" VARCHAR(160) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleCode","permissionKey")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleCode" "RoleCode" NOT NULL,
    "scopeType" "AuthorizationScope" NOT NULL,
    "schoolId" UUID,
    "academyId" UUID,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_role_assignments_scope_check" CHECK (
        ("scopeType" = 'PLATFORM' AND "schoolId" IS NULL AND "academyId" IS NULL) OR
        ("scopeType" = 'SCHOOL' AND "schoolId" IS NOT NULL AND "academyId" IS NULL) OR
        ("scopeType" = 'ACADEMY' AND "schoolId" IS NULL AND "academyId" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_memberships" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_memberships" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "academy_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_relationships" (
    "id" UUID NOT NULL,
    "parentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_student_relationships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "parent_student_relationships_distinct_users_check" CHECK ("parentId" <> "studentId")
);

-- CreateTable
CREATE TABLE "school_classes" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_class_assignments" (
    "id" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "teacher_class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_student_memberships" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "class_student_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_student_enrollments" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "academy_student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_batches" (
    "id" UUID NOT NULL,
    "academyId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_student_memberships" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "batch_student_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_coach_assignments" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "batch_coach_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_revokedAt_expiresAt_idx" ON "user_role_assignments"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "user_role_assignments_schoolId_idx" ON "user_role_assignments"("schoolId");

-- CreateIndex
CREATE INDEX "user_role_assignments_academyId_idx" ON "user_role_assignments"("academyId");

-- CreateIndex
CREATE INDEX "school_memberships_userId_revokedAt_expiresAt_idx" ON "school_memberships"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_schoolId_userId_key" ON "school_memberships"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "academy_memberships_userId_revokedAt_expiresAt_idx" ON "academy_memberships"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "academy_memberships_academyId_userId_key" ON "academy_memberships"("academyId", "userId");

-- CreateIndex
CREATE INDEX "parent_student_relationships_studentId_revokedAt_idx" ON "parent_student_relationships"("studentId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_relationships_parentId_studentId_key" ON "parent_student_relationships"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "school_classes_schoolId_idx" ON "school_classes"("schoolId");

-- CreateIndex
CREATE INDEX "teacher_class_assignments_classId_revokedAt_expiresAt_idx" ON "teacher_class_assignments"("classId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_class_assignments_teacherId_classId_key" ON "teacher_class_assignments"("teacherId", "classId");

-- CreateIndex
CREATE INDEX "class_student_memberships_studentId_revokedAt_expiresAt_idx" ON "class_student_memberships"("studentId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "class_student_memberships_classId_studentId_key" ON "class_student_memberships"("classId", "studentId");

-- CreateIndex
CREATE INDEX "academy_student_enrollments_studentId_revokedAt_expiresAt_idx" ON "academy_student_enrollments"("studentId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "academy_student_enrollments_academyId_studentId_key" ON "academy_student_enrollments"("academyId", "studentId");

-- CreateIndex
CREATE INDEX "academy_batches_academyId_idx" ON "academy_batches"("academyId");

-- CreateIndex
CREATE INDEX "batch_student_memberships_enrollmentId_revokedAt_expiresAt_idx" ON "batch_student_memberships"("enrollmentId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "batch_student_memberships_batchId_enrollmentId_key" ON "batch_student_memberships"("batchId", "enrollmentId");

-- CreateIndex
CREATE INDEX "batch_coach_assignments_coachId_revokedAt_expiresAt_idx" ON "batch_coach_assignments"("coachId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "batch_coach_assignments_batchId_coachId_key" ON "batch_coach_assignments"("batchId", "coachId");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "roles"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_memberships" ADD CONSTRAINT "academy_memberships_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_memberships" ADD CONSTRAINT "academy_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_relationships" ADD CONSTRAINT "parent_student_relationships_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_relationships" ADD CONSTRAINT "parent_student_relationships_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_student_memberships" ADD CONSTRAINT "class_student_memberships_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_student_memberships" ADD CONSTRAINT "class_student_memberships_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_student_enrollments" ADD CONSTRAINT "academy_student_enrollments_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_student_enrollments" ADD CONSTRAINT "academy_student_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_batches" ADD CONSTRAINT "academy_batches_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_student_memberships" ADD CONSTRAINT "batch_student_memberships_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "academy_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_student_memberships" ADD CONSTRAINT "batch_student_memberships_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "academy_student_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_coach_assignments" ADD CONSTRAINT "batch_coach_assignments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "academy_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_coach_assignments" ADD CONSTRAINT "batch_coach_assignments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the closed canonical role set. Permissions remain explicit and default-deny.
INSERT INTO "roles" ("code", "name") VALUES
('STUDENT', 'Student'),
('PARENT', 'Parent / Guardian'),
('TEACHER', 'Teacher'),
('SCHOOL_ADMIN', 'School Administrator'),
('ACADEMY_OWNER', 'Academy Owner'),
('ACADEMY_ADMIN', 'Academy Administrator'),
('ACADEMY_COACH', 'Academy Coach'),
('PLATFORM_ADMIN', 'Platform Administrator'),
('SECURITY_ADMIN', 'Security Administrator'),
('SAFETY_ADMIN', 'Safety Administrator'),
('MODERATION_ADMIN', 'Moderation Administrator'),
('AI_ADMIN', 'AI Administrator'),
('SUPPORT_ADMIN', 'Support Administrator'),
('ANALYTICS_ADMIN', 'Analytics Administrator');
