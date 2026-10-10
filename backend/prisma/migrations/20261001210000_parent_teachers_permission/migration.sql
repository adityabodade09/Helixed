INSERT INTO "permissions" ("key", "description") VALUES ('parent_teachers:read', 'Read teachers assigned to an authorized child') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES ('PARENT', 'parent_teachers:read') ON CONFLICT DO NOTHING;
