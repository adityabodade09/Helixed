import { AppError } from '../../shared/errors/AppError.js';
import type { AccountSettingsService } from '../account-settings/account-settings.service.js';
import type { AuthenticatedPrincipal } from '../auth/auth.types.js';
import type { AuthorizationService } from '../authorization/authorization.service.js';
import type { ParentSettingsRepository } from './parent-settings.repository.js';

export class ParentSettingsService {
  constructor(
    private readonly repository: ParentSettingsRepository,
    private readonly accountSettings: AccountSettingsService,
    private readonly authorization: AuthorizationService,
  ) {}

  async get(principal: AuthenticatedPrincipal) {
    const roleAssignmentId = await this.repository.findParentRoleAssignmentId(
      principal.userId,
      new Date(),
    );
    if (!roleAssignmentId)
      throw new AppError(403, 'FORBIDDEN', 'Settings are unavailable for this account.');

    const decision = await this.authorization.can(principal, {
      action: 'read',
      resource: { type: 'parent_settings', id: principal.userId },
      context: { roleAssignmentId },
    });
    if (!decision.allowed)
      throw new AppError(403, 'FORBIDDEN', 'Settings are unavailable for this account.');

    return this.accountSettings.get(principal);
  }
}
