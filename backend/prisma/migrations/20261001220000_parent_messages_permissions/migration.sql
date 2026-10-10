INSERT INTO "permissions" ("key", "description")
VALUES
  ('parent_messages:read', 'Read the authenticated parent''s authorized conversations'),
  ('parent_messages:create', 'Send messages in the authenticated parent''s authorized conversations')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES
  ('PARENT', 'parent_messages:read'),
  ('PARENT', 'parent_messages:create')
ON CONFLICT DO NOTHING;
