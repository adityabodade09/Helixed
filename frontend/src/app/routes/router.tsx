import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../../features/auth/LoginPage';
import { ProtectedRoute } from '../../features/auth/ProtectedRoute';
import { StudentDashboardPage } from '../../features/student-dashboard/StudentDashboardPage';
import {
  StudentAcademicsPage,
  StudentTaskDetailPage,
} from '../../features/student-academics/StudentAcademicsPage';
import {
  AddStudentActivityPage,
  StudentActivityCertificatesPage,
  StudentActivityDetailPage,
  StudentActivitiesPage,
} from '../../features/student-activities/StudentActivitiesPage';
import {
  StudentCalendarEventPage,
  StudentCalendarPage,
} from '../../features/student-calendar/StudentCalendarPage';
import {
  StudentCommunityDirectPage,
  StudentCommunityGroupPage,
  StudentCommunityPage,
} from '../../features/student-community/StudentCommunityPage';
import { StudentGrowthPage } from '../../features/student-growth/StudentGrowthPage';
import {
  StudentOpportunitiesPage,
  StudentOpportunityDetailPage,
} from '../../features/student-opportunities/StudentOpportunitiesPage';
import { StudentAiPage } from '../../features/student-ai/StudentAiPage';
import { StudentProfilePage } from '../../features/student-profile/StudentProfilePage';
import { StudentSettingsPage } from '../../features/student-settings/StudentSettingsPage';
import { ParentDashboardPage } from '../../features/parent-dashboard/ParentDashboardPage';
import {
  ParentAcademicsPage,
  ParentChildAcademicsPage,
} from '../../features/parent-academics/ParentAcademicsPage';
import {
  ParentActivitiesPage,
  ParentChildActivitiesPage,
  ParentActivityDetailPage,
} from '../../features/parent-activities/ParentActivitiesPage';
import {
  ParentCalendarEventPage,
  ParentChildCalendarPage,
  ParentCalendarPage,
} from '../../features/parent-calendar/ParentCalendarPage';
import { ParentGrowthPage } from '../../features/parent-growth/ParentGrowthPage';
import {
  ParentChildDetailPage,
  ParentChildrenPage,
} from '../../features/parent-children/ParentChildrenPage';
import { ParentAttendancePage } from '../../features/parent-attendance/ParentAttendancePage';
import { ParentTasksPage } from '../../features/parent-tasks/ParentTasksPage';
import { ParentTeachersPage } from '../../features/parent-teachers/ParentTeachersPage';
import { ParentMessagesPage } from '../../features/parent-messages/ParentMessagesPage';
import { ParentApprovalsPage } from '../../features/parent-approvals/ParentApprovalsPage';
import { ParentInsightsPage } from '../../features/parent-insights/ParentInsightsPage';
import { ParentDocumentsPage } from '../../features/parent-documents/ParentDocumentsPage';
import { ParentOpportunitiesPage } from '../../features/parent-opportunities/ParentOpportunitiesPage';
import { ParentSettingsPage } from '../../features/parent-settings/ParentSettingsPage';
import { TeacherDashboardPage } from '../../features/teacher-dashboard/TeacherDashboardPage';
import {
  TeacherClassDetailPage,
  TeacherClassesPage,
} from '../../features/teacher-classes/TeacherClassesPage';
import {
  TeacherStudentDetailPage,
  TeacherStudentsPage,
} from '../../features/teacher-students/TeacherStudentsPage';
import { TeacherAttendancePage } from '../../features/teacher-attendance/TeacherAttendancePage';
import { TeacherAssignmentsPage } from '../../features/teacher-assignments/TeacherAssignmentsPage';
import { CreateTeacherAssignmentPage } from '../../features/teacher-assignments/CreateTeacherAssignmentPage';
import { TeacherMarksPage } from '../../features/teacher-marks/TeacherMarksPage';
import { TeacherClassSummaryPage } from '../../features/teacher-class-summary/TeacherClassSummaryPage';
import { TeacherDevelopmentPage } from '../../features/teacher-development/TeacherDevelopmentPage';
import { TeacherOpportunitiesPage } from '../../features/teacher-opportunities/TeacherOpportunitiesPage';
import {
  TeacherMessageDetailPage,
  TeacherMessagesPage,
} from '../../features/teacher-messages/TeacherMessagesPage';
import { TeacherSettingsPage } from '../../features/teacher-settings/TeacherSettingsPage';
import { AcademyDashboardPage } from '../../features/academy-dashboard/AcademyDashboardPage';
import {
  AcademyStudentDetailPage,
  AcademyStudentsPage,
} from '../../features/academy-students/AcademyStudentsPage';
import {
  AcademyBatchDetailPage,
  AcademyBatchesPage,
} from '../../features/academy-batches/AcademyBatchesPage';
import { AcademyCoachesPage } from '../../features/academy-coaches/AcademyCoachesPage';
import { AcademySettingsPage } from '../../features/academy-settings/AcademySettingsPage';
import { AppLayout } from '../../shared/layouts/AppLayout';
import { NotFoundPage } from '../../shared/pages/NotFoundPage';
import { RouteErrorBoundary } from '../../shared/pages/RouteErrorBoundary';

export const router = createBrowserRouter([
  { path: 'login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: 'student', element: <StudentDashboardPage /> },
      { path: 'student/academics', element: <StudentAcademicsPage /> },
      { path: 'student/academics/schedule', element: <StudentAcademicsPage page="schedule" /> },
      { path: 'student/academics/tasks', element: <StudentAcademicsPage page="tasks" /> },
      { path: 'student/academics/tasks/:id', element: <StudentTaskDetailPage /> },
      {
        path: 'student/academics/class-summary',
        element: <StudentAcademicsPage page="class-summary" />,
      },
      { path: 'student/academics/notes', element: <StudentAcademicsPage page="notes" /> },
      { path: 'student/academics/exams', element: <StudentAcademicsPage page="exams" /> },
      { path: 'student/academics/syllabus', element: <StudentAcademicsPage page="syllabus" /> },
      { path: 'student/academics/resources', element: <StudentAcademicsPage page="resources" /> },
      { path: 'student/academics/doubts', element: <StudentAcademicsPage page="doubts" /> },
      { path: 'student/activities', element: <StudentActivitiesPage /> },
      { path: 'student/activities/add', element: <AddStudentActivityPage /> },
      { path: 'student/activities/certificates', element: <StudentActivityCertificatesPage /> },
      { path: 'student/activities/:id', element: <StudentActivityDetailPage /> },
      { path: 'student/activities/:id/progress', element: <StudentActivityDetailPage progress /> },
      { path: 'student/calendar', element: <StudentCalendarPage /> },
      { path: 'student/calendar/day', element: <StudentCalendarPage view="day" /> },
      { path: 'student/calendar/week', element: <StudentCalendarPage view="week" /> },
      { path: 'student/calendar/month', element: <StudentCalendarPage view="month" /> },
      { path: 'student/calendar/event/:id', element: <StudentCalendarEventPage /> },
      { path: 'student/community', element: <StudentCommunityPage /> },
      { path: 'student/community/inbox', element: <StudentCommunityPage /> },
      { path: 'student/community/sent', element: <StudentCommunityPage page="sent" /> },
      { path: 'student/community/groups', element: <StudentCommunityPage page="groups" /> },
      { path: 'student/community/groups/:id', element: <StudentCommunityGroupPage /> },
      { path: 'student/community/direct', element: <StudentCommunityPage page="direct" /> },
      { path: 'student/community/direct/:id', element: <StudentCommunityDirectPage /> },
      { path: 'student/growth', element: <StudentGrowthPage /> },
      { path: 'student/growth/overview', element: <StudentGrowthPage /> },
      { path: 'student/growth/academics', element: <StudentGrowthPage page="academics" /> },
      { path: 'student/growth/activities', element: <StudentGrowthPage page="activities" /> },
      { path: 'student/growth/patterns', element: <StudentGrowthPage page="patterns" /> },
      { path: 'student/growth/achievements', element: <StudentGrowthPage page="achievements" /> },
      { path: 'student/opportunities', element: <StudentOpportunitiesPage /> },
      {
        path: 'student/opportunities/recommended',
        element: <StudentOpportunitiesPage page="recommended" />,
      },
      { path: 'student/opportunities/saved', element: <StudentOpportunitiesPage page="saved" /> },
      {
        path: 'student/opportunities/applied',
        element: <StudentOpportunitiesPage page="applied" />,
      },
      { path: 'student/opportunities/:id', element: <StudentOpportunityDetailPage /> },
      { path: 'student/ai', element: <StudentAiPage /> },
      { path: 'student/profile', element: <StudentProfilePage /> },
      { path: 'student/settings', element: <StudentSettingsPage /> },
      { path: 'parent', element: <ParentDashboardPage /> },
      { path: 'parent/children', element: <ParentChildrenPage /> },
      { path: 'parent/children/:id', element: <ParentChildDetailPage /> },
      { path: 'parent/children/:id/academics', element: <ParentChildAcademicsPage /> },
      { path: 'parent/children/:id/attendance', element: <ParentAttendancePage /> },
      { path: 'parent/children/:id/tasks', element: <ParentTasksPage /> },
      { path: 'parent/children/:id/activities', element: <ParentChildActivitiesPage /> },
      { path: 'parent/children/:id/calendar', element: <ParentChildCalendarPage /> },
      { path: 'parent/children/:id/teachers', element: <ParentTeachersPage /> },
      { path: 'parent/messages', element: <ParentMessagesPage /> },
      { path: 'parent/approvals', element: <ParentApprovalsPage /> },
      { path: 'parent/insights', element: <ParentInsightsPage /> },
      { path: 'parent/documents', element: <ParentDocumentsPage /> },
      { path: 'parent/opportunities', element: <ParentOpportunitiesPage /> },
      { path: 'parent/settings', element: <ParentSettingsPage /> },
      { path: 'teacher', element: <TeacherDashboardPage /> },
      { path: 'teacher/classes', element: <TeacherClassesPage /> },
      { path: 'teacher/classes/:id', element: <TeacherClassDetailPage /> },
      { path: 'teacher/students', element: <TeacherStudentsPage /> },
      { path: 'teacher/students/:id', element: <TeacherStudentDetailPage /> },
      { path: 'teacher/attendance', element: <TeacherAttendancePage /> },
      { path: 'teacher/assignments', element: <TeacherAssignmentsPage /> },
      { path: 'teacher/assignments/create', element: <CreateTeacherAssignmentPage /> },
      { path: 'teacher/marks', element: <TeacherMarksPage /> },
      { path: 'teacher/class-summary', element: <TeacherClassSummaryPage /> },
      { path: 'teacher/development', element: <TeacherDevelopmentPage /> },
      { path: 'teacher/opportunities', element: <TeacherOpportunitiesPage /> },
      { path: 'teacher/messages', element: <TeacherMessagesPage /> },
      { path: 'teacher/messages/:id', element: <TeacherMessageDetailPage /> },
      { path: 'teacher/settings', element: <TeacherSettingsPage /> },
      { path: 'academy', element: <AcademyDashboardPage /> },
      { path: 'academy/students', element: <AcademyStudentsPage /> },
      { path: 'academy/students/:id', element: <AcademyStudentDetailPage /> },
      { path: 'academy/batches', element: <AcademyBatchesPage /> },
      { path: 'academy/batches/:id', element: <AcademyBatchDetailPage /> },
      { path: 'academy/coaches', element: <AcademyCoachesPage /> },
      { path: 'academy/settings', element: <AcademySettingsPage /> },
      { path: 'parent/academics', element: <ParentAcademicsPage /> },
      { path: 'parent/activities', element: <ParentActivitiesPage /> },
      { path: 'parent/activities/:id', element: <ParentActivityDetailPage /> },
      { path: 'parent/calendar', element: <ParentCalendarPage /> },
      { path: 'parent/calendar/day', element: <ParentCalendarPage view="day" /> },
      { path: 'parent/calendar/week', element: <ParentCalendarPage view="week" /> },
      { path: 'parent/calendar/month', element: <ParentCalendarPage view="month" /> },
      { path: 'parent/calendar/event/:id', element: <ParentCalendarEventPage /> },
      { path: 'parent/growth', element: <ParentGrowthPage /> },
      { path: 'parent/growth/overview', element: <ParentGrowthPage /> },
      { path: 'parent/growth/academics', element: <ParentGrowthPage page="academics" /> },
      { path: 'parent/growth/activities', element: <ParentGrowthPage page="activities" /> },
      { path: 'parent/growth/patterns', element: <ParentGrowthPage page="patterns" /> },
      { path: 'parent/growth/achievements', element: <ParentGrowthPage page="achievements" /> },
      ...['academic', 'activities', 'achievements', 'certificates', 'creative-work', 'share'].map(
        (page) => ({
          path: `student/profile/${page}`,
          element: <StudentProfilePage page={page} />,
        }),
      ),
      ...[
        'doubt',
        'study-plan',
        'revision',
        'daily-plan',
        'workload',
        'opportunities',
        'career',
        'documents',
        'certificates',
        'achievements',
        'insights',
      ].map((feature) => ({
        path: `student/ai/${feature}`,
        element: <StudentAiPage feature={feature} />,
      })),
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
]);
