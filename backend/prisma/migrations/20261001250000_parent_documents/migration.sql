CREATE TYPE "DocumentPurpose" AS ENUM ('PARENT_PROVIDED_SUPPORTING_DOCUMENT');

CREATE TABLE "documents" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "uploaderId" UUID NOT NULL,
  "purpose" "DocumentPurpose" NOT NULL,
  "displayName" VARCHAR(240) NOT NULL,
  "fileName" VARCHAR(240) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_childId_createdAt_idx" ON "documents"("childId", "createdAt");
CREATE INDEX "documents_uploaderId_idx" ON "documents"("uploaderId");

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description")
VALUES ('parent_documents:read', 'Read permitted document metadata for verified children')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES ('PARENT', 'parent_documents:read')
ON CONFLICT DO NOTHING;
