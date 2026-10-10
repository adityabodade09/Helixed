INSERT INTO "permissions" ("key", "description")
VALUES ('academy_batches:read', 'View canonical batches for an authorized Academy')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('ACADEMY_OWNER', 'academy_batches:read'),
  ('ACADEMY_ADMIN', 'academy_batches:read')
ON CONFLICT DO NOTHING;
