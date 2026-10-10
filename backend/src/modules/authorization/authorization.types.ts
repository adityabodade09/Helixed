export type Role =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'academy_owner'
  | 'academy_admin'
  | 'academy_coach'
  | 'platform_admin'
  | 'security_admin'
  | 'safety_admin'
  | 'moderation_admin'
  | 'ai_admin'
  | 'support_admin'
  | 'analytics_admin';

export type AuthorizationScope = 'platform' | 'school' | 'academy';
export type AuthorizationResourceType =
  | 'student'
  | 'class'
  | 'school'
  | 'academy'
  | 'academy_dashboard'
  | 'academy_students'
  | 'academy_batches'
  | 'academy_coaches'
  | 'academy_settings'
  | 'batch'
  | 'student_dashboard'
  | 'student_academics'
  | 'student_activities'
  | 'student_calendar'
  | 'student_community'
  | 'student_growth'
  | 'student_opportunities'
  | 'student_ai'
  | 'student_profile'
  | 'parent_dashboard'
  | 'parent_academics'
  | 'parent_activities'
  | 'parent_calendar'
  | 'parent_growth'
  | 'parent_children'
  | 'parent_attendance'
  | 'parent_tasks'
  | 'parent_teachers'
  | 'parent_messages'
  | 'parent_approvals'
  | 'parent_insights'
  | 'parent_documents'
  | 'parent_opportunities'
  | 'parent_settings'
  | 'teacher_dashboard'
  | 'teacher_classes'
  | 'teacher_students'
  | 'teacher_attendance'
  | 'teacher_assignments'
  | 'teacher_marks'
  | 'teacher_class_summary'
  | 'teacher_development'
  | 'teacher_opportunities'
  | 'teacher_messages'
  | 'teacher_settings'
  | 'platform';

export interface AuthorizationResource {
  type: AuthorizationResourceType;
  id: string;
}

export interface AuthorizationContext {
  roleAssignmentId: string;
  classId?: string;
  studentId?: string;
  sessionId?: string;
  assessmentId?: string;
  batchId?: string;
}

export interface AuthorizationRequest {
  action: string;
  resource: AuthorizationResource;
  context?: AuthorizationContext;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason:
    'allowed' | 'missing_context' | 'inactive_assignment' | 'missing_permission' | 'outside_scope';
}

export interface RoleAssignment {
  id: string;
  role: Role;
  scope: AuthorizationScope;
  schoolId: string | null;
  academyId: string | null;
  permissions: string[];
}
