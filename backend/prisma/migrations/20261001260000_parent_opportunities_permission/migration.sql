INSERT INTO "permissions" ("key", "description")
VALUES ('parent_opportunities:read', 'Read Parent-visible opportunities for verified children')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('PARENT', 'parent_opportunities:read')
ON CONFLICT DO NOTHING;
