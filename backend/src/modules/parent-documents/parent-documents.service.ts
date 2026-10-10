import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ParentDocumentsRepository } from './parent-documents.repository.js';

export class ParentDocumentsService {
  constructor(
    private readonly repository: ParentDocumentsRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal, requestedChildId?: string) {
    const now = new Date();
    const [roleAssignmentId, children] = await Promise.all([
      this.repository.findParentRoleAssignmentId(principal.userId, now),
      this.repository.children(principal.userId),
    ]);
    const childId = requestedChildId ?? children[0]?.id;
    if (!roleAssignmentId || !childId)
      throw new AppError(403, 'FORBIDDEN', 'Documents are unavailable for this account.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_documents', id: childId },
      context: { roleAssignmentId },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Documents are unavailable for this account.');

    const documents = await this.repository.documents(childId);
    const child = children.find((item) => item.id === childId);
    if (!documents || !child)
      throw new AppError(403, 'FORBIDDEN', 'Documents are unavailable for this account.');

    return {
      children,
      child: { id: child.id, displayName: child.displayName ?? 'Student' },
      documents,
      binaryStorageAvailable: false,
    };
  }
}
