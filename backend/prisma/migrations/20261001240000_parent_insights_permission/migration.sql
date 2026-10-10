INSERT INTO "permissions" ("key", "description")
VALUES ('parent_insights:read', 'Read evidence-based insights for verified children')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('PARENT', 'parent_insights:read')
ON CONFLICT DO NOTHING;
