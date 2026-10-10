import { Router } from 'express';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { AccountSettingsService } from '../modules/account-settings/account-settings.service.js';
import { healthRouter } from '../modules/health/health.routes.js';
import { createStudentDashboardRouter } from '../modules/student-dashboard/student-dashboard.routes.js';
import type { StudentDashboardService } from '../modules/student-dashboard/student-dashboard.service.js';
import { createStudentAcademicsRouter } from '../modules/student-academics/student-academics.routes.js';
import type { StudentAcademicsService } from '../modules/student-academics/student-academics.service.js';
import { createStudentActivitiesRouter } from '../modules/student-activities/student-activities.routes.js';
import type { StudentActivitiesService } from '../modules/student-activities/student-activities.service.js';
import { createStudentCalendarRouter } from '../modules/student-calendar/student-calendar.routes.js';
import type { StudentCalendarService } from '../modules/student-calendar/student-calendar.service.js';
import { createStudentCommunityRouter } from '../modules/student-community/student-community.routes.js';
import type { StudentCommunityService } from '../modules/student-community/student-community.service.js';
import { createStudentGrowthRouter } from '../modules/student-growth/student-growth.routes.js';
import type { StudentGrowthService } from '../modules/student-growth/student-growth.service.js';
import { createStudentOpportunitiesRouter } from '../modules/student-opportunities/student-opportunities.routes.js';
import type { StudentOpportunitiesService } from '../modules/student-opportunities/student-opportunities.service.js';
import { createStudentAiRouter } from '../modules/student-ai/student-ai.routes.js';
import type { StudentAiService } from '../modules/student-ai/student-ai.service.js';
import { createStudentProfileRouter } from '../modules/student-profile/student-profile.routes.js';
import type { StudentProfileService } from '../modules/student-profile/student-profile.service.js';
import { createStudentSettingsRouter } from '../modules/student-settings/student-settings.routes.js';
import { createParentDashboardRouter } from '../modules/parent-dashboard/parent-dashboard.routes.js';
import { createParentAcademicsRouter } from '../modules/parent-academics/parent-academics.routes.js';
import { createParentActivitiesRouter } from '../modules/parent-activities/parent-activities.routes.js';
import { createParentCalendarRouter } from '../modules/parent-calendar/parent-calendar.routes.js';
import { createParentGrowthRouter } from '../modules/parent-growth/parent-growth.routes.js';
import { createParentChildrenRouter } from '../modules/parent-children/parent-children.routes.js';
import { createParentAttendanceRouter } from '../modules/parent-attendance/parent-attendance.routes.js';
import { createParentTasksRouter } from '../modules/parent-tasks/parent-tasks.routes.js';
import { createParentTeachersRouter } from '../modules/parent-teachers/parent-teachers.routes.js';
import { createParentMessagesRouter } from '../modules/parent-messages/parent-messages.routes.js';
import type { ParentMessagesService } from '../modules/parent-messages/parent-messages.service.js';
import { createParentApprovalsRouter } from '../modules/parent-approvals/parent-approvals.routes.js';
import type { ParentApprovalsService } from '../modules/parent-approvals/parent-approvals.service.js';
import { createParentInsightsRouter } from '../modules/parent-insights/parent-insights.routes.js';
import type { ParentInsightsService } from '../modules/parent-insights/parent-insights.service.js';
import { createParentDocumentsRouter } from '../modules/parent-documents/parent-documents.routes.js';
import type { ParentDocumentsService } from '../modules/parent-documents/parent-documents.service.js';
import { createParentOpportunitiesRouter } from '../modules/parent-opportunities/parent-opportunities.routes.js';
import type { ParentOpportunitiesService } from '../modules/parent-opportunities/parent-opportunities.service.js';
import { createParentSettingsRouter } from '../modules/parent-settings/parent-settings.routes.js';
import type { ParentSettingsService } from '../modules/parent-settings/parent-settings.service.js';
import { createTeacherDashboardRouter } from '../modules/teacher-dashboard/teacher-dashboard.routes.js';
import type { TeacherDashboardService } from '../modules/teacher-dashboard/teacher-dashboard.service.js';
import { createTeacherClassesRouter } from '../modules/teacher-classes/teacher-classes.routes.js';
import type { TeacherClassesService } from '../modules/teacher-classes/teacher-classes.service.js';
import { createTeacherStudentsRouter } from '../modules/teacher-students/teacher-students.routes.js';
import type { TeacherStudentsService } from '../modules/teacher-students/teacher-students.service.js';
import { createTeacherAttendanceRouter } from '../modules/teacher-attendance/teacher-attendance.routes.js';
import type { TeacherAttendanceService } from '../modules/teacher-attendance/teacher-attendance.service.js';
import { createTeacherAssignmentsRouter } from '../modules/teacher-assignments/teacher-assignments.routes.js';
import type { TeacherAssignmentsService } from '../modules/teacher-assignments/teacher-assignments.service.js';
import { createTeacherMarksRouter } from '../modules/teacher-marks/teacher-marks.routes.js';
import type { TeacherMarksService } from '../modules/teacher-marks/teacher-marks.service.js';
import { createTeacherClassSummaryRouter } from '../modules/teacher-class-summary/teacher-class-summary.routes.js';
import type { TeacherClassSummaryService } from '../modules/teacher-class-summary/teacher-class-summary.service.js';
import { createTeacherDevelopmentRouter } from '../modules/teacher-development/teacher-development.routes.js';
import type { TeacherDevelopmentService } from '../modules/teacher-development/teacher-development.service.js';
import { createTeacherOpportunitiesRouter } from '../modules/teacher-opportunities/teacher-opportunities.routes.js';
import type { TeacherOpportunitiesService } from '../modules/teacher-opportunities/teacher-opportunities.service.js';
import { createTeacherMessagesRouter } from '../modules/teacher-messages/teacher-messages.routes.js';
import type { TeacherMessagesService } from '../modules/teacher-messages/teacher-messages.service.js';
import { createTeacherSettingsRouter } from '../modules/teacher-settings/teacher-settings.routes.js';
import type { TeacherSettingsService } from '../modules/teacher-settings/teacher-settings.service.js';
import { createAcademyDashboardRouter } from '../modules/academy-dashboard/academy-dashboard.routes.js';
import type { AcademyDashboardService } from '../modules/academy-dashboard/academy-dashboard.service.js';
import { createAcademyStudentsRouter } from '../modules/academy-students/academy-students.routes.js';
import type { AcademyStudentsService } from '../modules/academy-students/academy-students.service.js';
import { createAcademyBatchesRouter } from '../modules/academy-batches/academy-batches.routes.js';
import type { AcademyBatchesService } from '../modules/academy-batches/academy-batches.service.js';
import { createAcademyCoachesRouter } from '../modules/academy-coaches/academy-coaches.routes.js';
import type { AcademyCoachesService } from '../modules/academy-coaches/academy-coaches.service.js';
import { createAcademySettingsRouter } from '../modules/academy-settings/academy-settings.routes.js';
import type { AcademySettingsService } from '../modules/academy-settings/academy-settings.service.js';

export function createApiRouter(
  authService: AuthService,
  accountSettingsService: AccountSettingsService,
  studentDashboardService: StudentDashboardService,
  studentAcademicsService: StudentAcademicsService,
  studentActivitiesService: StudentActivitiesService,
  studentCalendarService: StudentCalendarService,
  studentCommunityService: StudentCommunityService,
  studentGrowthService: StudentGrowthService,
  studentOpportunitiesService: StudentOpportunitiesService,
  studentAiService: StudentAiService,
  studentProfileService: StudentProfileService,
  parentMessagesService: ParentMessagesService,
  parentApprovalsService: ParentApprovalsService,
  parentInsightsService: ParentInsightsService,
  parentDocumentsService: ParentDocumentsService,
  parentOpportunitiesService: ParentOpportunitiesService,
  parentSettingsService: ParentSettingsService,
  teacherDashboardService: TeacherDashboardService,
  teacherClassesService: TeacherClassesService,
  teacherStudentsService: TeacherStudentsService,
  teacherAttendanceService: TeacherAttendanceService,
  teacherAssignmentsService: TeacherAssignmentsService,
  teacherMarksService: TeacherMarksService,
  teacherClassSummaryService: TeacherClassSummaryService,
  teacherDevelopmentService: TeacherDevelopmentService,
  teacherOpportunitiesService: TeacherOpportunitiesService,
  teacherMessagesService: TeacherMessagesService,
  teacherSettingsService: TeacherSettingsService,
  academyDashboardService: AcademyDashboardService,
  academyStudentsService: AcademyStudentsService,
  academyBatchesService: AcademyBatchesService,
  academyCoachesService: AcademyCoachesService,
  academySettingsService: AcademySettingsService,
) {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', createAuthRouter(authService));
  apiRouter.use(
    '/student/dashboard',
    createStudentDashboardRouter(authService, studentDashboardService),
  );
  apiRouter.use('/student/growth', createStudentGrowthRouter(authService, studentGrowthService));
  apiRouter.use(
    '/student/opportunities',
    createStudentOpportunitiesRouter(authService, studentOpportunitiesService),
  );
  apiRouter.use('/student/ai', createStudentAiRouter(authService, studentAiService));
  apiRouter.use('/student/profile', createStudentProfileRouter(authService, studentProfileService));
  apiRouter.use(
    '/student/settings',
    createStudentSettingsRouter(authService, accountSettingsService),
  );
  apiRouter.use('/parent/academics', createParentAcademicsRouter(authService));
  apiRouter.use('/parent/activities', createParentActivitiesRouter(authService));
  apiRouter.use('/parent/calendar', createParentCalendarRouter(authService));
  apiRouter.use('/parent/growth', createParentGrowthRouter(authService));
  apiRouter.use('/parent/children', createParentAcademicsRouter(authService, true));
  apiRouter.use('/parent/children', createParentAttendanceRouter(authService));
  apiRouter.use('/parent/children', createParentTasksRouter(authService));
  apiRouter.use('/parent/children', createParentActivitiesRouter(authService, true));
  apiRouter.use('/parent/children', createParentCalendarRouter(authService, true));
  apiRouter.use('/parent/children', createParentTeachersRouter(authService));
  apiRouter.use('/parent/children', createParentChildrenRouter(authService));
  apiRouter.use('/parent/messages', createParentMessagesRouter(authService, parentMessagesService));
  apiRouter.use(
    '/parent/approvals',
    createParentApprovalsRouter(authService, parentApprovalsService),
  );
  apiRouter.use('/parent/insights', createParentInsightsRouter(authService, parentInsightsService));
  apiRouter.use(
    '/parent/documents',
    createParentDocumentsRouter(authService, parentDocumentsService),
  );
  apiRouter.use(
    '/parent/opportunities',
    createParentOpportunitiesRouter(authService, parentOpportunitiesService),
  );
  apiRouter.use('/parent/settings', createParentSettingsRouter(authService, parentSettingsService));
  apiRouter.use('/teacher/classes', createTeacherClassesRouter(authService, teacherClassesService));
  apiRouter.use(
    '/teacher/students',
    createTeacherStudentsRouter(authService, teacherStudentsService),
  );
  apiRouter.use(
    '/teacher/attendance',
    createTeacherAttendanceRouter(authService, teacherAttendanceService),
  );
  apiRouter.use(
    '/teacher/assignments',
    createTeacherAssignmentsRouter(authService, teacherAssignmentsService),
  );
  apiRouter.use('/teacher/marks', createTeacherMarksRouter(authService, teacherMarksService));
  apiRouter.use(
    '/teacher/class-summary',
    createTeacherClassSummaryRouter(authService, teacherClassSummaryService),
  );
  apiRouter.use(
    '/teacher/development',
    createTeacherDevelopmentRouter(authService, teacherDevelopmentService),
  );
  apiRouter.use(
    '/teacher/opportunities',
    createTeacherOpportunitiesRouter(authService, teacherOpportunitiesService),
  );
  apiRouter.use(
    '/teacher/messages',
    createTeacherMessagesRouter(authService, teacherMessagesService),
  );
  apiRouter.use(
    '/teacher/settings',
    createTeacherSettingsRouter(authService, teacherSettingsService),
  );
  apiRouter.use('/teacher', createTeacherDashboardRouter(authService, teacherDashboardService));
  apiRouter.use(
    '/academy/students',
    createAcademyStudentsRouter(authService, academyStudentsService),
  );
  apiRouter.use('/academy/batches', createAcademyBatchesRouter(authService, academyBatchesService));
  apiRouter.use('/academy/coaches', createAcademyCoachesRouter(authService, academyCoachesService));
  apiRouter.use(
    '/academy/settings',
    createAcademySettingsRouter(authService, academySettingsService),
  );
  apiRouter.use('/academy', createAcademyDashboardRouter(authService, academyDashboardService));
  apiRouter.use('/parent', createParentDashboardRouter(authService));
  apiRouter.use(
    '/student/community',
    createStudentCommunityRouter(authService, studentCommunityService),
  );
  apiRouter.use(
    '/student/academics',
    createStudentAcademicsRouter(authService, studentAcademicsService),
  );
  apiRouter.use(
    '/student/activities',
    createStudentActivitiesRouter(authService, studentActivitiesService),
  );
  apiRouter.use(
    '/student/calendar',
    createStudentCalendarRouter(authService, studentCalendarService),
  );

  return apiRouter;
}
