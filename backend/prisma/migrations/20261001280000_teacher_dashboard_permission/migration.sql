INSERT INTO "permissions" ("key", "description")
VALUES ('teacher_dashboard:read', 'View the authenticated Teacher operational dashboard')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('TEACHER', 'teacher_dashboard:read')
ON CONFLICT DO NOTHING;
