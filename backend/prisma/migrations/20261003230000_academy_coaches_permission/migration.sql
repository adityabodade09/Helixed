INSERT INTO "permissions" ("key", "description")
VALUES ('academy_coaches:read', 'View canonical Coaches for an authorized Academy')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('ACADEMY_OWNER', 'academy_coaches:read'),
  ('ACADEMY_ADMIN', 'academy_coaches:read')
ON CONFLICT DO NOTHING;
