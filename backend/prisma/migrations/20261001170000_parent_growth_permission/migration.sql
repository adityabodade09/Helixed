INSERT INTO "permissions" ("key", "description") VALUES ('parent_growth:read', 'Read authorized child growth evidence') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_growth:read') ON CONFLICT DO NOTHING;
