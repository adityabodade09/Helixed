import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ParentOpportunitiesRepository } from './parent-opportunities.repository.js';
import type { ParentOpportunityFilters } from './parent-opportunities.types.js';

export class ParentOpportunitiesService {
  constructor(
    private readonly repository: ParentOpportunitiesRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(
    principal: AuthenticatedPrincipal,
    requestedChildId: string | undefined,
    filters: ParentOpportunityFilters,
  ) {
    const now = new Date();
    const [roleAssignmentId, children] = await Promise.all([
      this.repository.findParentRoleAssignmentId(principal.userId, now),
      this.repository.children(principal.userId),
    ]);
    const childId = requestedChildId ?? children[0]?.id;
    if (!roleAssignmentId || !childId)
      throw new AppError(403, 'FORBIDDEN', 'Opportunities are unavailable for this account.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_opportunities', id: childId },
      context: { roleAssignmentId },
    });
    const child = children.find((item) => item.id === childId);
    if (!decision.allowed || !child)
      throw new AppError(403, 'FORBIDDEN', 'Opportunities are unavailable for this account.');

    const [opportunities, categories] = await Promise.all([
      this.repository.list(childId, filters, now),
      this.repository.categories(),
    ]);
    return {
      children,
      child: { id: child.id, displayName: child.displayName ?? 'Student' },
      discovery: {
        mode: 'GENERAL' as const,
        explanation:
          'General available opportunities are shown because no approved child-relevance evidence is configured.',
      },
      filters: { categories },
      opportunities,
    };
  }
}
