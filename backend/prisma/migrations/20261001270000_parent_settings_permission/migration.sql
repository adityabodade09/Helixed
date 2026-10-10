INSERT INTO "permissions" ("key", "description")
VALUES ('parent_settings:read', 'View the authenticated Parent account and active sessions')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('PARENT', 'parent_settings:read')
ON CONFLICT DO NOTHING;
