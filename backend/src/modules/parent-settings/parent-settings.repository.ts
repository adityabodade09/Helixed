export interface ParentSettingsRepository {
  findParentRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
}
