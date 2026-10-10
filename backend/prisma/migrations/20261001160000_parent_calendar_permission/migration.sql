INSERT INTO "permissions" ("key", "description") VALUES ('parent_calendar:read', 'Read authorized child calendar') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_calendar:read') ON CONFLICT DO NOTHING;
