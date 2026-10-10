INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_messages:read', 'Read the authenticated Teacher canonical conversation inbox')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_messages:read')
ON CONFLICT DO NOTHING;
