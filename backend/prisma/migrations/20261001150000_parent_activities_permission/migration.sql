INSERT INTO "permissions" ("key", "description") VALUES ('parent_activities:read', 'Read authorized child activity summary') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_activities:read') ON CONFLICT DO NOTHING;
