import { AppError } from '../../shared/errors/AppError.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import { deriveParentInsights } from './insights-summary.js';
import type { ParentInsightsRepository } from './parent-insights.repository.js';

const DAY = 24 * 60 * 60 * 1000;

export class ParentInsightsService {
  constructor(
    private readonly repository: ParentInsightsRepository,
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
      throw new AppError(403, 'FORBIDDEN', 'Insights are unavailable for this account.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_insights', id: childId },
      context: { roleAssignmentId },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Insights are unavailable for this account.');

    const periodStart = new Date(now.getTime() - 42 * DAY);
    const upcomingEnd = new Date(now.getTime() + 7 * DAY);
    const evidence = await this.repository.evidence(childId, periodStart, now, upcomingEnd);
    if (!evidence)
      throw new AppError(403, 'FORBIDDEN', 'Insights are unavailable for this account.');
    return { children, ...deriveParentInsights(evidence, periodStart, now, upcomingEnd) };
  }
}
