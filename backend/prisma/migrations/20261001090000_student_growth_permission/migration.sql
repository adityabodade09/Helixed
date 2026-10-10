INSERT INTO "permissions" ("key", "description") VALUES
  ('student_growth:read', 'View the authenticated student growth evidence')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('STUDENT', 'student_growth:read')
ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
