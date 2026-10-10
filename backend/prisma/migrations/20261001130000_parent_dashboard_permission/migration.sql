INSERT INTO "permissions" ("key", "description") VALUES ('parent_dashboard:read', 'Read verified child dashboard') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_dashboard:read') ON CONFLICT DO NOTHING;
