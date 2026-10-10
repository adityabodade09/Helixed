CREATE TABLE "student_profiles" (
  "user_id" UUID NOT NULL,
  "bio" VARCHAR(1000),
  "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "avatar_url" VARCHAR(2000),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "permissions" ("key", "description") VALUES
  ('student_profile:read', 'Read own student profile'),
  ('student_profile:update', 'Update own editable student profile')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('STUDENT', 'student_profile:read'),
  ('STUDENT', 'student_profile:update')
ON CONFLICT DO NOTHING;
