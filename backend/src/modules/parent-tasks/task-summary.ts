export type ParentTaskState = 'COMPLETED' | 'OVERDUE' | 'UPCOMING' | 'OPEN';

export type ParentTaskInput = { dueAt: Date | null; completedAt: Date | null };

export function parentTaskState(task: ParentTaskInput, now: Date): ParentTaskState {
  if (task.completedAt) return 'COMPLETED';
  if (task.dueAt && task.dueAt < now) return 'OVERDUE';
  return task.dueAt ? 'UPCOMING' : 'OPEN';
}

export function summarizeParentTasks(tasks: ParentTaskInput[], now: Date) {
  const states = tasks.map((task) => parentTaskState(task, now));
  return {
    total: tasks.length,
    completed: states.filter((state) => state === 'COMPLETED').length,
    overdue: states.filter((state) => state === 'OVERDUE').length,
    upcoming: states.filter((state) => state === 'UPCOMING').length,
    open: states.filter((state) => state === 'OPEN').length,
  };
}
