INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_messages:create', 'Send a canonical message in an authorized existing Teacher conversation')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_messages:create')
ON CONFLICT DO NOTHING;
