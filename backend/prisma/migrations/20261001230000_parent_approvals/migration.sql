CREATE TYPE "ParentApprovalType" AS ENUM ('OPPORTUNITY_APPLICATION');
CREATE TYPE "ParentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE "parent_approval_requests" (
  "id" UUID NOT NULL,
  "childId" UUID NOT NULL,
  "type" "ParentApprovalType" NOT NULL,
  "opportunityApplicationId" UUID NOT NULL,
  "status" "ParentApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "parent_approval_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parent_approval_resolution_consistency" CHECK (
    ("status" = 'PENDING' AND "resolvedAt" IS NULL AND "resolvedById" IS NULL)
    OR ("status" IN ('APPROVED', 'DECLINED') AND "resolvedAt" IS NOT NULL AND "resolvedById" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "parent_approval_requests_opportunityApplicationId_key"
  ON "parent_approval_requests"("opportunityApplicationId");
CREATE UNIQUE INDEX "parent_approval_requests_opportunityApplicationId_childId_key"
  ON "parent_approval_requests"("opportunityApplicationId", "childId");
CREATE UNIQUE INDEX "opportunity_applications_id_studentId_key"
  ON "opportunity_applications"("id", "studentId");
CREATE INDEX "parent_approval_requests_childId_status_requestedAt_idx"
  ON "parent_approval_requests"("childId", "status", "requestedAt");

ALTER TABLE "parent_approval_requests"
  ADD CONSTRAINT "parent_approval_requests_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parent_approval_requests"
  ADD CONSTRAINT "parent_approval_requests_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_approval_requests"
  ADD CONSTRAINT "parent_approval_requests_opportunityApplicationId_fkey"
  FOREIGN KEY ("opportunityApplicationId", "childId") REFERENCES "opportunity_applications"("id", "studentId") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "description")
VALUES
  ('parent_approvals:read', 'Read approval requests for verified children'),
  ('parent_approvals:update', 'Decide pending approval requests for verified children')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleCode", "permissionKey")
VALUES
  ('PARENT', 'parent_approvals:read'),
  ('PARENT', 'parent_approvals:update')
ON CONFLICT DO NOTHING;
