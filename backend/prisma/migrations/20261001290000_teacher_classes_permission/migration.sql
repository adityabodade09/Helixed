INSERT INTO "permissions" ("key", "description")
VALUES ('teacher_classes:read', 'List classes assigned to the authenticated Teacher')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('TEACHER', 'teacher_classes:read')
ON CONFLICT DO NOTHING;
