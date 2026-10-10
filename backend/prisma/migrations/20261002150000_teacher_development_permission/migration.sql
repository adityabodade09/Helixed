INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_development:read', 'Read factual development evidence for actively assigned students')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_development:read')
ON CONFLICT DO NOTHING;
