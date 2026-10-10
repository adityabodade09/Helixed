import { summarizeAttendance } from '../parent-attendance/attendance-summary.js';
import { summarizeParentTasks } from '../parent-tasks/task-summary.js';
import type { ParentInsightEvidence, ParentInsightFact } from './parent-insights.types.js';

export function deriveParentInsights(
  evidence: ParentInsightEvidence,
  periodStart: Date,
  now: Date,
  upcomingEnd: Date,
) {
  const attendance = summarizeAttendance(evidence.attendance);
  const tasks = summarizeParentTasks(evidence.tasks, now);
  const completedWithDeadline = evidence.tasks.filter((task) => task.completedAt && task.dueAt);
  const completedOnTime = completedWithDeadline.filter(
    (task) => task.completedAt! <= task.dueAt!,
  ).length;
  const dueThisWeek = evidence.upcoming.tasks.length;
  const activeActivities = evidence.activities.filter((activity) => activity.active).length;
  const milestones = evidence.activities.reduce((sum, activity) => sum + activity.milestones, 0);
  const completedMilestones = evidence.activities.reduce(
    (sum, activity) => sum + activity.completedMilestones,
    0,
  );
  const facts: ParentInsightFact[] = [];

  if (!attendance.scheduledSessions) {
    facts.push({
      id: 'attendance-insufficient',
      category: 'ATTENDANCE',
      statement: 'Not enough recorded attendance data for this period.',
      evidence: 'No completed attendance sessions are available.',
    });
  } else if (!attendance.knownSessions) {
    facts.push({
      id: 'attendance-unknown',
      category: 'ATTENDANCE',
      statement: 'Attendance records are unavailable for the completed sessions in this period.',
      evidence: `${attendance.missingSessions} completed session${attendance.missingSessions === 1 ? ' has' : 's have'} no official record.`,
    });
  } else {
    facts.push({
      id: 'attendance-known',
      category: 'ATTENDANCE',
      statement: `${attendance.present} of ${attendance.knownSessions} known attendance records are present.`,
      evidence: `${attendance.missingSessions} completed sessions have no official record.`,
    });
  }

  if (completedWithDeadline.length) {
    facts.push({
      id: 'tasks-on-time',
      category: 'TASKS',
      statement: `${completedOnTime} of ${completedWithDeadline.length} completed dated tasks were finished by their deadlines.`,
      evidence: 'Only completed tasks with recorded deadlines are included.',
    });
  }
  if (dueThisWeek) {
    facts.push({
      id: 'upcoming-workload',
      category: 'UPCOMING',
      statement: `${dueThisWeek} task${dueThisWeek === 1 ? ' is' : 's are'} due in the next 7 days.`,
      evidence: `${evidence.upcoming.exams.length} exams and ${evidence.upcoming.schedule.length} scheduled items are also recorded.`,
    });
  }
  if (milestones) {
    facts.push({
      id: 'activity-milestones',
      category: 'ACTIVITIES',
      statement: `${completedMilestones} of ${milestones} recorded activity milestones are complete.`,
      evidence: `${activeActivities} active activit${activeActivities === 1 ? 'y is' : 'ies are'} recorded.`,
    });
  }

  return {
    child: evidence.child,
    period: {
      label: 'Last 6 weeks',
      startsAt: periodStart.toISOString(),
      endsAt: now.toISOString(),
      upcomingEndsAt: upcomingEnd.toISOString(),
    },
    subjects: evidence.subjects,
    attendance,
    tasks: {
      ...tasks,
      completedWithDeadline: completedWithDeadline.length,
      completedOnTime,
      dueThisWeek,
    },
    activities: {
      active: activeActivities,
      milestones,
      completedMilestones,
      certificates: evidence.certificates,
      items: evidence.activities,
    },
    upcoming: evidence.upcoming,
    facts,
    hasEvidence: Boolean(
      evidence.subjects.length ||
      evidence.tasks.length ||
      evidence.attendance.length ||
      evidence.activities.length ||
      evidence.upcoming.exams.length ||
      evidence.upcoming.schedule.length,
    ),
  };
}
