import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ParentApprovalsRepository } from './parent-approvals.repository.js';
import type { ParentApprovalDecision } from './parent-approvals.types.js';

export class ParentApprovalsService {
  constructor(
    private readonly repository: ParentApprovalsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  private async roleAssignment(principal: AuthenticatedPrincipal) {
    const id = await this.repository.findParentRoleAssignmentId(principal.userId, new Date());
    if (!id) throw new AppError(403, 'FORBIDDEN', 'Approvals are unavailable for this account.');
    return id;
  }

  private async authorize(
    principal: AuthenticatedPrincipal,
    roleAssignmentId: string,
    action: 'read' | 'update',
    resourceId: string,
  ) {
    const decision = await this.authorization.can(principal, {
      action,
      resource: { type: 'parent_approvals', id: resourceId },
      context: { roleAssignmentId },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Approvals are unavailable for this account.');
  }

  async list(principal: AuthenticatedPrincipal) {
    const roleAssignmentId = await this.roleAssignment(principal);
    await this.authorize(principal, roleAssignmentId, 'read', principal.userId);
    return this.repository.list(principal.userId, new Date());
  }

  async decide(
    principal: AuthenticatedPrincipal,
    approvalId: string,
    decision: ParentApprovalDecision,
  ) {
    const roleAssignmentId = await this.roleAssignment(principal);
    await this.authorize(principal, roleAssignmentId, 'update', principal.userId);
    const approval = await this.repository.find(approvalId);
    if (!approval) throw new AppError(404, 'APPROVAL_NOT_FOUND', 'Approval request was not found.');

    const childDecision = await this.authorization.can(principal, {
      action: 'update',
      resource: { type: 'parent_approvals', id: approval.child.id },
      context: { roleAssignmentId },
    });
    if (!childDecision.allowed)
      throw new AppError(404, 'APPROVAL_NOT_FOUND', 'Approval request was not found.');

    const result = await this.repository.resolveAtomic(
      approvalId,
      principal.userId,
      decision,
      new Date(),
    );
    if (result.kind === 'resolved') return result.approval;
    if (result.kind === 'already-resolved')
      throw new AppError(409, 'APPROVAL_ALREADY_RESOLVED', 'This request was already decided.');
    if (result.kind === 'invalid-target')
      throw new AppError(
        409,
        'APPROVAL_TARGET_UNAVAILABLE',
        'This request is no longer available.',
      );
    throw new AppError(404, 'APPROVAL_NOT_FOUND', 'Approval request was not found.');
  }
}
