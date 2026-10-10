import { AppError } from '../../shared/errors/AppError.js';
import type { AcademyDashboardRepository } from '../academy-dashboard/academy-dashboard.repository.js';
import type { AccountSettingsService } from '../account-settings/account-settings.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { AcademySettingsRepository } from './academy-settings.repository.js';

export class AcademySettingsService {
  constructor(
    private readonly scope: AcademyDashboardRepository,
    private readonly repository: AcademySettingsRepository,
    private readonly accountSettings: AccountSettingsService,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal) {
    const assignment = await this.scope.findRoleAssignment(principal.userId, new Date());
    if (!assignment) throw this.unavailable();

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'academy_settings', id: assignment.academyId },
      context: { roleAssignmentId: assignment.id },
    });
    if (!decision.allowed) throw this.unavailable();

    const academy = await this.repository.findAcademy(assignment.academyId);
    if (!academy) throw this.unavailable();

    return { academy, ...(await this.accountSettings.get(principal)) };
  }

  private unavailable() {
    return new AppError(403, 'FORBIDDEN', 'Academy settings are unavailable.');
  }
}
