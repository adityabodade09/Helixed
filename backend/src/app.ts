import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/not-found.middleware.js';
import { requestId } from './middleware/request-id.middleware.js';
import { PrismaAuthRepository } from './modules/auth/prisma-auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AccountSettingsService } from './modules/account-settings/account-settings.service.js';
import { PrismaAccountSettingsRepository } from './modules/account-settings/prisma-account-settings.repository.js';
import { PrismaAuthorizationRepository } from './modules/authorization/prisma-authorization.repository.js';
import { AuthorizationService } from './modules/authorization/authorization.service.js';
import { PrismaStudentDashboardRepository } from './modules/student-dashboard/prisma-student-dashboard.repository.js';
import { StudentDashboardService } from './modules/student-dashboard/student-dashboard.service.js';
import { PrismaStudentAcademicsRepository } from './modules/student-academics/prisma-student-academics.repository.js';
import { StudentAcademicsService } from './modules/student-academics/student-academics.service.js';
import { PrismaStudentActivitiesRepository } from './modules/student-activities/prisma-student-activities.repository.js';
import { StudentActivitiesService } from './modules/student-activities/student-activities.service.js';
import { PrismaStudentCalendarRepository } from './modules/student-calendar/prisma-student-calendar.repository.js';
import { StudentCalendarService } from './modules/student-calendar/student-calendar.service.js';
import { PrismaStudentCommunityRepository } from './modules/student-community/prisma-student-community.repository.js';
import { StudentCommunityService } from './modules/student-community/student-community.service.js';
import { PrismaStudentGrowthRepository } from './modules/student-growth/prisma-student-growth.repository.js';
import { StudentGrowthService } from './modules/student-growth/student-growth.service.js';
import { PrismaStudentOpportunitiesRepository } from './modules/student-opportunities/prisma-student-opportunities.repository.js';
import { StudentOpportunitiesService } from './modules/student-opportunities/student-opportunities.service.js';
import { DevelopmentAiProvider, requireDevelopmentAi } from './modules/student-ai/ai-provider.js';
import { StudentAiService } from './modules/student-ai/student-ai.service.js';
import { StudentProfileService } from './modules/student-profile/student-profile.service.js';
import { ParentMessagesService } from './modules/parent-messages/parent-messages.service.js';
import { PrismaParentMessagesRepository } from './modules/parent-messages/prisma-parent-messages.repository.js';
import { ParentApprovalsService } from './modules/parent-approvals/parent-approvals.service.js';
import { PrismaParentApprovalsRepository } from './modules/parent-approvals/prisma-parent-approvals.repository.js';
import { ParentInsightsService } from './modules/parent-insights/parent-insights.service.js';
import { PrismaParentInsightsRepository } from './modules/parent-insights/prisma-parent-insights.repository.js';
import { ParentDocumentsService } from './modules/parent-documents/parent-documents.service.js';
import { PrismaParentDocumentsRepository } from './modules/parent-documents/prisma-parent-documents.repository.js';
import { ParentOpportunitiesService } from './modules/parent-opportunities/parent-opportunities.service.js';
import { PrismaParentOpportunitiesRepository } from './modules/parent-opportunities/prisma-parent-opportunities.repository.js';
import { ParentSettingsService } from './modules/parent-settings/parent-settings.service.js';
import { PrismaParentSettingsRepository } from './modules/parent-settings/prisma-parent-settings.repository.js';
import { TeacherDashboardService } from './modules/teacher-dashboard/teacher-dashboard.service.js';
import { PrismaTeacherDashboardRepository } from './modules/teacher-dashboard/prisma-teacher-dashboard.repository.js';
import { TeacherClassesService } from './modules/teacher-classes/teacher-classes.service.js';
import { TeacherStudentsService } from './modules/teacher-students/teacher-students.service.js';
import { PrismaTeacherStudentsRepository } from './modules/teacher-students/prisma-teacher-students.repository.js';
import { TeacherAttendanceService } from './modules/teacher-attendance/teacher-attendance.service.js';
import { PrismaTeacherAttendanceRepository } from './modules/teacher-attendance/prisma-teacher-attendance.repository.js';
import { TeacherAssignmentsService } from './modules/teacher-assignments/teacher-assignments.service.js';
import { PrismaTeacherAssignmentsRepository } from './modules/teacher-assignments/prisma-teacher-assignments.repository.js';
import { TeacherMarksService } from './modules/teacher-marks/teacher-marks.service.js';
import { PrismaTeacherMarksRepository } from './modules/teacher-marks/prisma-teacher-marks.repository.js';
import { TeacherClassSummaryService } from './modules/teacher-class-summary/teacher-class-summary.service.js';
import { PrismaTeacherClassSummaryRepository } from './modules/teacher-class-summary/prisma-teacher-class-summary.repository.js';
import { TeacherDevelopmentService } from './modules/teacher-development/teacher-development.service.js';
import { PrismaTeacherDevelopmentRepository } from './modules/teacher-development/prisma-teacher-development.repository.js';
import { TeacherOpportunitiesService } from './modules/teacher-opportunities/teacher-opportunities.service.js';
import { PrismaTeacherOpportunitiesRepository } from './modules/teacher-opportunities/prisma-teacher-opportunities.repository.js';
import { TeacherMessagesService } from './modules/teacher-messages/teacher-messages.service.js';
import { PrismaTeacherMessagesRepository } from './modules/teacher-messages/prisma-teacher-messages.repository.js';
import { TeacherSettingsService } from './modules/teacher-settings/teacher-settings.service.js';
import { PrismaTeacherSettingsRepository } from './modules/teacher-settings/prisma-teacher-settings.repository.js';
import { AcademyDashboardService } from './modules/academy-dashboard/academy-dashboard.service.js';
import { PrismaAcademyDashboardRepository } from './modules/academy-dashboard/prisma-academy-dashboard.repository.js';
import { AcademyStudentsService } from './modules/academy-students/academy-students.service.js';
import { PrismaAcademyStudentsRepository } from './modules/academy-students/prisma-academy-students.repository.js';
import { AcademyBatchesService } from './modules/academy-batches/academy-batches.service.js';
import { AcademyCoachesService } from './modules/academy-coaches/academy-coaches.service.js';
import { PrismaAcademyCoachesRepository } from './modules/academy-coaches/prisma-academy-coaches.repository.js';
import { AcademySettingsService } from './modules/academy-settings/academy-settings.service.js';
import { PrismaAcademySettingsRepository } from './modules/academy-settings/prisma-academy-settings.repository.js';
import { createApiRouter } from './routes/api.router.js';

interface AppDependencies {
  authService?: AuthService;
  studentDashboardService?: StudentDashboardService;
  studentAcademicsService?: StudentAcademicsService;
  studentActivitiesService?: StudentActivitiesService;
  studentCalendarService?: StudentCalendarService;
  studentCommunityService?: StudentCommunityService;
  studentGrowthService?: StudentGrowthService;
  studentOpportunitiesService?: StudentOpportunitiesService;
  studentAiService?: StudentAiService;
  studentProfileService?: StudentProfileService;
  parentMessagesService?: ParentMessagesService;
  parentApprovalsService?: ParentApprovalsService;
  parentInsightsService?: ParentInsightsService;
  parentDocumentsService?: ParentDocumentsService;
  parentOpportunitiesService?: ParentOpportunitiesService;
  parentSettingsService?: ParentSettingsService;
  teacherDashboardService?: TeacherDashboardService;
  teacherClassesService?: TeacherClassesService;
  teacherStudentsService?: TeacherStudentsService;
  teacherAttendanceService?: TeacherAttendanceService;
  teacherAssignmentsService?: TeacherAssignmentsService;
  teacherMarksService?: TeacherMarksService;
  teacherClassSummaryService?: TeacherClassSummaryService;
  teacherDevelopmentService?: TeacherDevelopmentService;
  teacherOpportunitiesService?: TeacherOpportunitiesService;
  teacherMessagesService?: TeacherMessagesService;
  teacherSettingsService?: TeacherSettingsService;
  academyDashboardService?: AcademyDashboardService;
  academyStudentsService?: AcademyStudentsService;
  academyBatchesService?: AcademyBatchesService;
  academyCoachesService?: AcademyCoachesService;
  academySettingsService?: AcademySettingsService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const authService = dependencies.authService ?? new AuthService(new PrismaAuthRepository());
  const accountSettingsService = new AccountSettingsService(new PrismaAccountSettingsRepository());
  const studentDashboardService =
    dependencies.studentDashboardService ??
    new StudentDashboardService(
      new PrismaStudentDashboardRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentAcademicsService =
    dependencies.studentAcademicsService ??
    new StudentAcademicsService(
      new PrismaStudentAcademicsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentActivitiesService =
    dependencies.studentActivitiesService ??
    new StudentActivitiesService(
      new PrismaStudentActivitiesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentCalendarService =
    dependencies.studentCalendarService ??
    new StudentCalendarService(
      new PrismaStudentCalendarRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentCommunityService =
    dependencies.studentCommunityService ??
    new StudentCommunityService(
      new PrismaStudentCommunityRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentGrowthService =
    dependencies.studentGrowthService ??
    new StudentGrowthService(
      new PrismaStudentGrowthRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentOpportunitiesService =
    dependencies.studentOpportunitiesService ??
    new StudentOpportunitiesService(
      new PrismaStudentOpportunitiesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const studentAiService =
    dependencies.studentAiService ??
    new StudentAiService(
      new AuthorizationService(new PrismaAuthorizationRepository()),
      new DevelopmentAiProvider(),
    );
  const studentProfileService =
    dependencies.studentProfileService ??
    new StudentProfileService(new AuthorizationService(new PrismaAuthorizationRepository()));
  const parentMessagesService =
    dependencies.parentMessagesService ??
    new ParentMessagesService(
      new PrismaParentMessagesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const parentApprovalsService =
    dependencies.parentApprovalsService ??
    new ParentApprovalsService(
      new PrismaParentApprovalsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const parentInsightsService =
    dependencies.parentInsightsService ??
    new ParentInsightsService(
      new PrismaParentInsightsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const parentDocumentsService =
    dependencies.parentDocumentsService ??
    new ParentDocumentsService(
      new PrismaParentDocumentsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const parentOpportunitiesService =
    dependencies.parentOpportunitiesService ??
    new ParentOpportunitiesService(
      new PrismaParentOpportunitiesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const parentSettingsService =
    dependencies.parentSettingsService ??
    new ParentSettingsService(
      new PrismaParentSettingsRepository(),
      accountSettingsService,
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherDashboardService =
    dependencies.teacherDashboardService ??
    new TeacherDashboardService(
      new PrismaTeacherDashboardRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherClassesService =
    dependencies.teacherClassesService ??
    new TeacherClassesService(
      new PrismaTeacherDashboardRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherStudentsService =
    dependencies.teacherStudentsService ??
    new TeacherStudentsService(
      new PrismaTeacherStudentsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherAttendanceService =
    dependencies.teacherAttendanceService ??
    new TeacherAttendanceService(
      new PrismaTeacherAttendanceRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherAssignmentsService =
    dependencies.teacherAssignmentsService ??
    new TeacherAssignmentsService(
      new PrismaTeacherAssignmentsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherMarksService =
    dependencies.teacherMarksService ??
    new TeacherMarksService(
      new PrismaTeacherMarksRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherClassSummaryService =
    dependencies.teacherClassSummaryService ??
    new TeacherClassSummaryService(
      new PrismaTeacherClassSummaryRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherDevelopmentService =
    dependencies.teacherDevelopmentService ??
    new TeacherDevelopmentService(
      new PrismaTeacherDevelopmentRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherOpportunitiesService =
    dependencies.teacherOpportunitiesService ??
    new TeacherOpportunitiesService(
      new PrismaTeacherOpportunitiesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherMessagesService =
    dependencies.teacherMessagesService ??
    new TeacherMessagesService(
      new PrismaTeacherMessagesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const teacherSettingsService =
    dependencies.teacherSettingsService ??
    new TeacherSettingsService(
      new PrismaTeacherSettingsRepository(),
      accountSettingsService,
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const academyDashboardService =
    dependencies.academyDashboardService ??
    new AcademyDashboardService(
      new PrismaAcademyDashboardRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const academyStudentsService =
    dependencies.academyStudentsService ??
    new AcademyStudentsService(
      new PrismaAcademyDashboardRepository(),
      new PrismaAcademyStudentsRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const academyBatchesService =
    dependencies.academyBatchesService ??
    new AcademyBatchesService(
      new PrismaAcademyDashboardRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const academyCoachesService =
    dependencies.academyCoachesService ??
    new AcademyCoachesService(
      new PrismaAcademyDashboardRepository(),
      new PrismaAcademyCoachesRepository(),
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );
  const academySettingsService =
    dependencies.academySettingsService ??
    new AcademySettingsService(
      new PrismaAcademyDashboardRepository(),
      new PrismaAcademySettingsRepository(),
      accountSettingsService,
      new AuthorizationService(new PrismaAuthorizationRepository()),
    );

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestId);
  app.use(pinoHttp({ logger, customProps: (request) => ({ requestId: request.id }) }));
  app.use(helmet());
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  // Gate generation before the service can create a conversation or write messages.
  app.use('/api/v1/student/ai', (request, _response, next) => {
    if (request.method === 'POST') requireDevelopmentAi();
    next();
  });

  app.use(
    '/api/v1',
    createApiRouter(
      authService,
      accountSettingsService,
      studentDashboardService,
      studentAcademicsService,
      studentActivitiesService,
      studentCalendarService,
      studentCommunityService,
      studentGrowthService,
      studentOpportunitiesService,
      studentAiService,
      studentProfileService,
      parentMessagesService,
      parentApprovalsService,
      parentInsightsService,
      parentDocumentsService,
      parentOpportunitiesService,
      parentSettingsService,
      teacherDashboardService,
      teacherClassesService,
      teacherStudentsService,
      teacherAttendanceService,
      teacherAssignmentsService,
      teacherMarksService,
      teacherClassSummaryService,
      teacherDevelopmentService,
      teacherOpportunitiesService,
      teacherMessagesService,
      teacherSettingsService,
      academyDashboardService,
      academyStudentsService,
      academyBatchesService,
      academyCoachesService,
      academySettingsService,
    ),
  );
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
