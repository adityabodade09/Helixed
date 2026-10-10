INSERT INTO "permissions" ("key", "description")
VALUES ('academy_dashboard:read', 'View the dashboard for an authorized Academy')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('ACADEMY_OWNER', 'academy_dashboard:read'),
  ('ACADEMY_ADMIN', 'academy_dashboard:read')
ON CONFLICT DO NOTHING;
