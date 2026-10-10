INSERT INTO "permissions" ("key", "description") VALUES ('parent_academics:read', 'Read authorized child academic summary') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_academics:read') ON CONFLICT DO NOTHING;
