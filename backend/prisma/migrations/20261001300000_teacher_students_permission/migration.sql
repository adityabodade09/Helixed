INSERT INTO "permissions" ("key", "description")
VALUES ('teacher_students:read', 'List students in the authenticated Teacher teaching scope')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('TEACHER', 'teacher_students:read')
ON CONFLICT DO NOTHING;
