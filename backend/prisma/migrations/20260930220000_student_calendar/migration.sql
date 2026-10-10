INSERT INTO "permissions" ("key", "description") VALUES ('student_calendar:read', 'View the authenticated student calendar') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('STUDENT', 'student_calendar:read') ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
