CREATE TABLE "assessments" (
  "id" UUID NOT NULL,
  "classId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "subjectName" VARCHAR(120) NOT NULL,
  "maximumMarks" INTEGER NOT NULL,
  "assessedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessments_maximumMarks_check" CHECK ("maximumMarks" > 0),
  CONSTRAINT "assessments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "school_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "marks" (
  "id" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "recordedById" UUID NOT NULL,
  "value" INTEGER NOT NULL,
  "previousMarkId" UUID,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "marks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marks_value_check" CHECK ("value" >= 0),
  CONSTRAINT "marks_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "marks_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "marks_previousMarkId_fkey" FOREIGN KEY ("previousMarkId") REFERENCES "marks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "assessments_classId_assessedAt_idx" ON "assessments"("classId", "assessedAt");
CREATE INDEX "assessments_createdById_idx" ON "assessments"("createdById");
CREATE INDEX "marks_assessmentId_studentId_supersededAt_idx" ON "marks"("assessmentId", "studentId", "supersededAt");
CREATE UNIQUE INDEX "marks_one_current_per_student_assessment" ON "marks"("assessmentId", "studentId") WHERE "supersededAt" IS NULL;
CREATE INDEX "marks_studentId_recordedAt_idx" ON "marks"("studentId", "recordedAt");
CREATE INDEX "marks_recordedById_recordedAt_idx" ON "marks"("recordedById", "recordedAt");

INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_marks:read', 'Read assessments and marks for actively assigned classes'),
  ('teacher_marks:update', 'Record marks for students in actively assigned classes')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_marks:read'),
  ('TEACHER', 'teacher_marks:update')
ON CONFLICT DO NOTHING;
