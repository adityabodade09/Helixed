import { summarizeAttendance } from '../src/modules/parent-attendance/attendance-summary.js';

describe('attendance summary semantics', () => {
  it('excludes missing records from the known-session denominator', () => {
    expect(summarizeAttendance(['PRESENT', 'PRESENT', 'ABSENT', 'LATE', null])).toEqual({
      scheduledSessions: 5,
      knownSessions: 4,
      missingSessions: 1,
      present: 2,
      absent: 1,
      late: 1,
      partial: 0,
      presentRate: 50,
    });
  });

  it('returns no percentage when every official record is missing', () => {
    expect(summarizeAttendance([null, null]).presentRate).toBeNull();
  });
});
