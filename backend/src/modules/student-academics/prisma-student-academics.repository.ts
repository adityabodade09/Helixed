import type { PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import type { StudentAcademicsRepository } from './student-academics.repository.js';
import type {
  AcademicDoubt,
  AcademicExam,
  AcademicNote,
  AcademicResource,
  AcademicScheduleItem,
  AcademicSubject,
  AcademicSyllabusItem,
  AcademicTask,
  AcademicsOverview,
} from './student-academics.types.js';

const subjectSelect = { id: true, name: true } as const;
const taskInclude = { subject: { select: subjectSelect } } as const;
const examInclude = { subject: { select: subjectSelect } } as const;
const noteInclude = { subject: { select: subjectSelect } } as const;
const resourceInclude = { subject: { select: subjectSelect } } as const;
const syllabusInclude = { subject: { select: subjectSelect } } as const;
const doubtInclude = { subject: { select: subjectSelect } } as const;

function subject(item: { id: string; name: string } | null) {
  return item ? { id: item.id, name: item.name } : null;
}

function mapSubject(item: {
  id: string;
  name: string;
  progress: number;
  nextClassAt: Date | null;
}): AcademicSubject {
  return { ...item, nextClassAt: item.nextClassAt?.toISOString() ?? null };
}

function mapSchedule(item: {
  id: string;
  title: string;
  detail: string | null;
  startsAt: Date;
  endsAt: Date;
  color: string;
}): AcademicScheduleItem {
  return { ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() };
}

function mapTask(item: {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completedAt: Date | null;
  subject: { id: string; name: string } | null;
}): AcademicTask {
  return {
    ...item,
    dueAt: item.dueAt?.toISOString() ?? null,
    completedAt: item.completedAt?.toISOString() ?? null,
    priority: item.priority.toLowerCase() as AcademicTask['priority'],
    subject: subject(item.subject),
  };
}

function mapExam(item: {
  id: string;
  title: string;
  detail: string | null;
  startsAt: Date;
  subject: { id: string; name: string } | null;
}): AcademicExam {
  return { ...item, startsAt: item.startsAt.toISOString(), subject: subject(item.subject) };
}

export class PrismaStudentAcademicsRepository implements StudentAcademicsRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async findStudentRoleAssignmentId(userId: string, now: Date): Promise<string | null> {
    const assignment = await this.db.userRoleAssignment.findFirst({
      where: {
        userId,
        roleCode: 'STUDENT',
        revokedAt: null,
        activeFrom: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    return assignment?.id ?? null;
  }

  async getOverview(userId: string, now: Date): Promise<AcademicsOverview | null> {
    const dayEnd = new Date(now);
    dayEnd.setHours(24, 0, 0, 0);
    const [student, subjects, schedule, tasks, exams] = await Promise.all([
      this.db.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      this.db.studentSubject.findMany({
        where: { studentId: userId },
        orderBy: { displayOrder: 'asc' },
      }),
      this.db.studentScheduleItem.findMany({
        where: { studentId: userId, startsAt: { gte: now, lt: dayEnd } },
        orderBy: { startsAt: 'asc' },
      }),
      this.db.studentTask.findMany({
        where: { studentId: userId },
        include: taskInclude,
        orderBy: { dueAt: 'asc' },
        take: 6,
      }),
      this.db.studentExam.findMany({
        where: { studentId: userId, startsAt: { gte: now } },
        include: examInclude,
        orderBy: { startsAt: 'asc' },
        take: 4,
      }),
    ]);
    if (!student) return null;
    return {
      student: { displayName: student.displayName ?? 'Student' },
      subjects: subjects.map(mapSubject),
      schedule: schedule.map(mapSchedule),
      tasks: tasks.map(mapTask),
      exams: exams.map(mapExam),
    };
  }

  async getSchedule(userId: string) {
    const items = await this.db.studentScheduleItem.findMany({
      where: { studentId: userId },
      orderBy: { startsAt: 'asc' },
    });
    return items.map(mapSchedule);
  }

  async getTasks(userId: string) {
    const tasks = await this.db.studentTask.findMany({
      where: { studentId: userId },
      include: taskInclude,
      orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }],
    });
    return tasks.map(mapTask);
  }

  async getTask(userId: string, taskId: string) {
    const task = await this.db.studentTask.findFirst({
      where: { id: taskId, studentId: userId },
      include: taskInclude,
    });
    return task ? mapTask(task) : null;
  }

  async getClassSummary(userId: string) {
    const [subjects, schedule, tasks] = await Promise.all([
      this.db.studentSubject.findMany({
        where: { studentId: userId },
        orderBy: { displayOrder: 'asc' },
      }),
      this.db.studentScheduleItem.findMany({
        where: { studentId: userId },
        orderBy: { startsAt: 'desc' },
        take: 5,
      }),
      this.db.studentTask.findMany({
        where: { studentId: userId, completedAt: null },
        include: taskInclude,
        orderBy: { dueAt: 'asc' },
        take: 6,
      }),
    ]);
    return {
      subjects: subjects.map(mapSubject),
      schedule: schedule.map(mapSchedule),
      tasks: tasks.map(mapTask),
    };
  }

  async getNotes(userId: string) {
    const notes = await this.db.studentNote.findMany({
      where: { studentId: userId },
      include: noteInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return notes.map((item): AcademicNote => ({
      id: item.id,
      title: item.title,
      content: item.content,
      updatedAt: item.updatedAt.toISOString(),
      subject: subject(item.subject),
    }));
  }

  async getExams(userId: string) {
    const exams = await this.db.studentExam.findMany({
      where: { studentId: userId },
      include: examInclude,
      orderBy: { startsAt: 'asc' },
    });
    return exams.map(mapExam);
  }

  async getSyllabus(userId: string) {
    const [subjects, items] = await Promise.all([
      this.db.studentSubject.findMany({
        where: { studentId: userId },
        orderBy: { displayOrder: 'asc' },
      }),
      this.db.studentSyllabusItem.findMany({
        where: { studentId: userId },
        include: syllabusInclude,
        orderBy: [{ subject: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
      }),
    ]);
    return {
      subjects: subjects.map(mapSubject),
      items: items.map((item): AcademicSyllabusItem => ({
        id: item.id,
        title: item.title,
        progress: item.progress,
        displayOrder: item.displayOrder,
        subject: { id: item.subject.id, name: item.subject.name },
      })),
    };
  }

  async getResources(userId: string) {
    const resources = await this.db.studentResource.findMany({
      where: { studentId: userId },
      include: resourceInclude,
      orderBy: { createdAt: 'desc' },
    });
    return resources.map((item): AcademicResource => ({
      id: item.id,
      title: item.title,
      resourceType: item.resourceType,
      description: item.description,
      url: item.url,
      createdAt: item.createdAt.toISOString(),
      subject: subject(item.subject),
    }));
  }

  async getDoubts(userId: string) {
    const doubts = await this.db.studentDoubt.findMany({
      where: { studentId: userId },
      include: doubtInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return doubts.map((item): AcademicDoubt => ({
      id: item.id,
      question: item.question,
      state: item.state.toLowerCase() as AcademicDoubt['state'],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      subject: subject(item.subject),
    }));
  }

  async ownsSubject(userId: string, subjectId: string) {
    return !!(await this.db.studentSubject.findFirst({
      where: { id: subjectId, studentId: userId },
      select: { id: true },
    }));
  }

  async createDoubt(userId: string, input: { question: string; subjectId?: string }) {
    const item = await this.db.studentDoubt.create({
      data: { studentId: userId, question: input.question, subjectId: input.subjectId },
      include: doubtInclude,
    });
    return {
      id: item.id,
      question: item.question,
      state: item.state.toLowerCase() as AcademicDoubt['state'],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      subject: subject(item.subject),
    };
  }
}
