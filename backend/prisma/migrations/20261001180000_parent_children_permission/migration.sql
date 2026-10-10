INSERT INTO "permissions" ("key", "description") VALUES ('parent_children:read', 'Read authorized linked children') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_children:read') ON CONFLICT DO NOTHING;
