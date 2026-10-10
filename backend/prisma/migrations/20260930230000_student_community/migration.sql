CREATE TYPE "CommunityGroupVisibility" AS ENUM ('STUDENT_DISCOVERABLE', 'MEMBERS_ONLY');
CREATE TYPE "CommunityConversationKind" AS ENUM ('GROUP', 'DIRECT');

CREATE TABLE "community_groups" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "visibility" "CommunityGroupVisibility" NOT NULL DEFAULT 'STUDENT_DISCOVERABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_groups_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_group_memberships" (
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_group_memberships_pkey" PRIMARY KEY ("groupId","userId")
);
CREATE TABLE "community_conversations" (
    "id" UUID NOT NULL,
    "kind" "CommunityConversationKind" NOT NULL,
    "groupId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "community_conversations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "community_conversation_members" (
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_conversation_members_pkey" PRIMARY KEY ("conversationId","userId")
);
CREATE TABLE "community_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "community_groups_slug_key" ON "community_groups"("slug");
CREATE INDEX "community_group_memberships_userId_joinedAt_idx" ON "community_group_memberships"("userId", "joinedAt");
CREATE UNIQUE INDEX "community_conversations_groupId_key" ON "community_conversations"("groupId");
CREATE INDEX "community_conversations_kind_updatedAt_idx" ON "community_conversations"("kind", "updatedAt");
CREATE INDEX "community_conversation_members_userId_joinedAt_idx" ON "community_conversation_members"("userId", "joinedAt");
CREATE INDEX "community_messages_conversationId_createdAt_idx" ON "community_messages"("conversationId", "createdAt");
CREATE INDEX "community_messages_senderId_createdAt_idx" ON "community_messages"("senderId", "createdAt");
ALTER TABLE "community_group_memberships" ADD CONSTRAINT "community_group_memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_group_memberships" ADD CONSTRAINT "community_group_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_conversations" ADD CONSTRAINT "community_conversations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_conversation_members" ADD CONSTRAINT "community_conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "community_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_conversation_members" ADD CONSTRAINT "community_conversation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "community_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "permissions" ("key", "description") VALUES
  ('student_community:read', 'View the authenticated student community'),
  ('student_community:create', 'Join authorized communities and send messages')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "role_permissions" ("roleCode", "permissionKey") VALUES
  ('STUDENT', 'student_community:read'), ('STUDENT', 'student_community:create')
ON CONFLICT ("roleCode", "permissionKey") DO NOTHING;
