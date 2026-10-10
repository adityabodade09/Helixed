INSERT INTO "permissions" ("key", "description")
VALUES ('academy_settings:read', 'View the authenticated Academy account context and active sessions')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('ACADEMY_OWNER', 'academy_settings:read'),
  ('ACADEMY_ADMIN', 'academy_settings:read')
ON CONFLICT DO NOTHING;
