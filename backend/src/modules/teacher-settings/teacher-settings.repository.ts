export interface TeacherSettingsRepository {
  findTeacherRoleAssignmentId(userId: string, now: Date): Promise<string | null>;
}
