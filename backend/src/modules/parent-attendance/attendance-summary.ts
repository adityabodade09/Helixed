export type AttendanceValue = 'PRESENT' | 'ABSENT' | 'LATE' | 'PARTIAL' | null;

export function summarizeAttendance(states: AttendanceValue[]) {
  const known = states.filter((state): state is Exclude<AttendanceValue, null> => state !== null);
  const count = (state: Exclude<AttendanceValue, null>) =>
    known.filter((value) => value === state).length;
  const present = count('PRESENT');
  return {
    scheduledSessions: states.length,
    knownSessions: known.length,
    missingSessions: states.length - known.length,
    present,
    absent: count('ABSENT'),
    late: count('LATE'),
    partial: count('PARTIAL'),
    presentRate: known.length ? Math.round((present / known.length) * 100) : null,
  };
}
