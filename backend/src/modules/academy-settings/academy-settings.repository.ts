export interface AcademySettingsRepository {
  findAcademy(academyId: string): Promise<{ id: string; name: string } | null>;
}
