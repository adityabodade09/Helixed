INSERT INTO "permissions" ("key", "description")
VALUES ('academy_students:read', 'View the active Student roster for an authorized Academy')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('ACADEMY_OWNER', 'academy_students:read'),
  ('ACADEMY_ADMIN', 'academy_students:read')
ON CONFLICT DO NOTHING;
