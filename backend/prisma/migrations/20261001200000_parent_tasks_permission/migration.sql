INSERT INTO "permissions" ("key", "description") VALUES ('parent_tasks:read', 'Read authorized child tasks') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_tasks:read') ON CONFLICT DO NOTHING;
