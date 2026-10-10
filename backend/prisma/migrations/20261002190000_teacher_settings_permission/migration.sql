INSERT INTO "permissions" ("key", "description")
VALUES ('teacher_settings:read', 'View the authenticated Teacher account and active sessions')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('TEACHER', 'teacher_settings:read')
ON CONFLICT DO NOTHING;
