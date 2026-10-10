INSERT INTO "permissions" ("key", "description") VALUES
  ('teacher_class_summary:read', 'Read derived summaries for actively assigned classes')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('TEACHER', 'teacher_class_summary:read')
ON CONFLICT DO NOTHING;
