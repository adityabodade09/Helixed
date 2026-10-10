INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_assignments:create', 'Create assignments for actively assigned classes')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_assignments:create')
ON CONFLICT DO NOTHING;
