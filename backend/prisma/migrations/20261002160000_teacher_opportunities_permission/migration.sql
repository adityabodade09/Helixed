INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_opportunities:read', 'Read the canonical opportunity catalog as a verified Teacher')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_opportunities:read')
ON CONFLICT DO NOTHING;
