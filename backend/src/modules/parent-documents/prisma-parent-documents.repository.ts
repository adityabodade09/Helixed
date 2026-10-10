import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ParentDocumentsRepository } from './parent-documents.repository.js';

export class PrismaParentDocumentsRepository implements ParentDocumentsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findParentRoleAssignmentId(userId: string, now: Date) {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'PARENT',
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }

  async children(parentId: string) {
    const relationships = await this.db.parentStudentRelationship.findMany({
      where: { parentId, verifiedAt: { not: null }, revokedAt: null },
      select: { student: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return relationships.map(({ student }) => student);
  }

  async documents(childId: string) {
    const child = await this.db.user.findUnique({
      where: { id: childId },
      select: {
        id: true,
        displayName: true,
        documentsAsChild: {
          where: { purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT' },
          select: {
            id: true,
            purpose: true,
            displayName: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            storageKey: true,
            createdAt: true,
            uploader: { select: { displayName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!child) return null;
    return child.documentsAsChild.map((document) => ({
      id: document.id,
      child: { id: child.id, displayName: child.displayName ?? 'Student' },
      uploader: { displayName: document.uploader.displayName ?? 'Parent' },
      purpose: document.purpose,
      displayName: document.displayName,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      createdAt: document.createdAt.toISOString(),
      binaryAvailable: document.storageKey !== null,
    }));
  }
}
