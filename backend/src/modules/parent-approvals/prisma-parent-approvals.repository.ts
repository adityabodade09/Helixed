import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { ParentApprovalsRepository } from './parent-approvals.repository.js';
import type { ParentApproval } from './parent-approvals.types.js';

const selection = {
  id: true,
  type: true,
  status: true,
  requestedAt: true,
  resolvedAt: true,
  child: { select: { id: true, displayName: true } },
  opportunityApplication: {
    select: {
      id: true,
      state: true,
      opportunity: {
        select: {
          id: true,
          title: true,
          detail: true,
          category: true,
          deadline: true,
          isOpen: true,
        },
      },
    },
  },
} as const;

type ApprovalRow = {
  id: string;
  type: 'OPPORTUNITY_APPLICATION';
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  requestedAt: Date;
  resolvedAt: Date | null;
  child: { id: string; displayName: string | null };
  opportunityApplication: {
    id: string;
    state: 'DRAFT' | 'SUBMITTED' | 'WITHDRAWN' | 'OUTCOME_RECEIVED';
    opportunity: {
      id: string;
      title: string;
      detail: string | null;
      category: string | null;
      deadline: Date | null;
      isOpen: boolean;
    };
  };
};

const isAvailable = (row: ApprovalRow, now: Date) =>
  row.opportunityApplication.state === 'SUBMITTED' &&
  row.opportunityApplication.opportunity.isOpen &&
  (!row.opportunityApplication.opportunity.deadline ||
    row.opportunityApplication.opportunity.deadline >= now);

const mapApproval = (row: ApprovalRow, now: Date): ParentApproval => ({
  id: row.id,
  child: { id: row.child.id, displayName: row.child.displayName ?? 'Student' },
  type: row.type,
  target: {
    id: row.opportunityApplication.id,
    opportunityId: row.opportunityApplication.opportunity.id,
    title: row.opportunityApplication.opportunity.title,
    detail: row.opportunityApplication.opportunity.detail,
    category: row.opportunityApplication.opportunity.category,
    deadline: row.opportunityApplication.opportunity.deadline?.toISOString() ?? null,
  },
  status: row.status,
  requestedAt: row.requestedAt.toISOString(),
  resolvedAt: row.resolvedAt?.toISOString() ?? null,
  targetAvailable: isAvailable(row, now),
});

export class PrismaParentApprovalsRepository implements ParentApprovalsRepository {
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

  async list(parentId: string, now: Date) {
    const rows = await this.db.parentApprovalRequest.findMany({
      where: {
        child: {
          studentGuardians: {
            some: { parentId, verifiedAt: { not: null }, revokedAt: null },
          },
        },
      },
      select: selection,
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map((row) => mapApproval(row, now));
  }

  async find(approvalId: string) {
    const row = await this.db.parentApprovalRequest.findUnique({
      where: { id: approvalId },
      select: selection,
    });
    return row ? mapApproval(row, new Date()) : null;
  }

  async resolveAtomic(
    approvalId: string,
    resolverId: string,
    decision: 'APPROVED' | 'DECLINED',
    now: Date,
  ) {
    return this.db.$transaction(async (transaction) => {
      const current = await transaction.parentApprovalRequest.findUnique({
        where: { id: approvalId },
        select: selection,
      });
      if (!current) return { kind: 'missing' } as const;
      if (current.status !== 'PENDING') return { kind: 'already-resolved' } as const;
      if (!isAvailable(current, now)) return { kind: 'invalid-target' } as const;

      const changed = await transaction.parentApprovalRequest.updateMany({
        where: { id: approvalId, status: 'PENDING' },
        data: { status: decision, resolvedAt: now, resolvedById: resolverId },
      });
      if (changed.count !== 1) return { kind: 'already-resolved' } as const;
      const resolved = await transaction.parentApprovalRequest.findUniqueOrThrow({
        where: { id: approvalId },
        select: selection,
      });
      return { kind: 'resolved', approval: mapApproval(resolved, now) } as const;
    });
  }
}
