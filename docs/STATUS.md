# Helixed Implementation Status

## Implemented

- Student Dashboard at `/student`, backed by authenticated PostgreSQL data and the existing student-scoped authorization policy
- Student Dashboard API: `GET /api/v1/student/dashboard`, with no client-supplied student identifier
- Development-only idempotent dashboard seed: `npm run db:seed --workspace backend` (`student-demo`). The runner compiles the seed with TypeScript and executes the emitted JavaScript, avoiding `tsx`'s Windows temporary-directory initialization path.
- Complete Student Academics module under `/student/academics`, including schedule, tasks, task detail, class summary, notes, exams, syllabus, resources, and doubts
- Student Academics REST API under `GET/POST /api/v1/student/academics/...`, derived solely from the authenticated student context
- Development-only idempotent Academics demo data for subjects, notes, syllabus items, learning resources, and student doubts
- Complete Student Activities module at `/student/activities`, including add activity, detail, progress, and certificates
- Student Activities REST API under `GET/POST /api/v1/student/activities/...`, scoped to the authenticated student
- Complete Student Calendar module at `/student/calendar`, with day, week, month, and event-detail routes
- Complete Student Community, Growth, Opportunities, AI, Profile, and Settings modules
- Parent Dashboard, Academics, Activities, Calendar, Growth, Children, child-context views, Messages, Approvals, Insights, Documents, Opportunities, and Settings
- Teacher Dashboard at `/teacher`, derived from the authenticated Teacher's verified school and active class assignments
- Teacher Classes at `/teacher/classes`, canonical Teacher Class Detail at `/teacher/classes/:id`, Teacher Students at `/teacher/students`, canonical Teacher Student Detail at `/teacher/students/:id`, official Teacher Attendance at `/teacher/attendance`, canonical Teacher Assignments at `/teacher/assignments`, Teacher Create Assignment at `/teacher/assignments/create`, Teacher Marks at `/teacher/marks`, derived Teacher Class Summary at `/teacher/class-summary`, factual Teacher Development at `/teacher/development`, canonical Teacher Opportunity discovery at `/teacher/opportunities`, Teacher Messages inbox at `/teacher/messages`, authorized Teacher Message Detail at `/teacher/messages/:id`, and owner-only Teacher Settings at `/teacher/settings`
- Academy Dashboard at `/academy`, Academy Students at `/academy/students`, canonical Academy Student Detail at `/academy/students/:id`, Academy Batches at `/academy/batches`, canonical Academy Batch Detail at `/academy/batches/:id`, Academy Coaches at `/academy/coaches`, and owner-only Academy Settings at `/academy/settings`, all derived from the authenticated Academy Owner/Administrator's exact verified Academy scope

## Academy Students and Student Detail Architecture

- Canonical route `/academy/students` follows `design/ChatGPT Image Sep 30, 2026, 02_07_55 PM.png`. Supported UI facts are the canonical Student display name, enrollment date, active Academy batch memberships, name search, and deterministic alphabetical ordering. Unsupported grade, program, per-Student coach, Parent contact, pending/inactive tabs, recent activity, certificates, add/import, School academics, and profiling elements are omitted.
- `GET /api/v1/academy/students?search=&batchId=` derives the authenticated Academy Owner/Administrator's exact verified Academy scope, requires `academy_students:read`, and reads only active `AcademyStudentEnrollment` records for that Academy. A `batchId` is independently checked against the same Academy; foreign Academy filters deny without revealing their contents. No client-supplied Academy selector is accepted.
- The minimized DTO preserves canonical Student IDs and contains only display name, enrollment date, and active `BatchStudentMembership`/`AcademyBatch` names and IDs. Duplicate Student rows are avoided; missing batch membership is shown as no batch assigned. The roster does not expose School marks, attendance, classes, assignments, private Profile, AI, messages, notes/doubts, Parent data, applications, credentials, sessions, tokens, roles, permissions, or authorization internals.
- Canonical detail route `/academy/students/:id` follows `design/ChatGPT Image Sep 30, 2026, 02_08_02 PM.png`. `GET /api/v1/academy/students/:studentId` strictly validates the canonical Student UUID, reuses `academy_students:read`, and requires an active enrollment for that Student in the exact authenticated Academy before returning the same minimal identity, enrollment date, and current Academy batch context as the roster.
- The module reuses canonical `User`, `AcademyStudentEnrollment`, `AcademyBatch`, and `BatchStudentMembership` records. It adds no Academy Student copy, profile, persisted roster/detail snapshot, permission, or mutation endpoint. The detail query constrains enrollment and batch memberships by Academy at the database boundary, so a multi-Academy Student reveals only the current Academy context.
- Academy Coach, Teacher, School Admin, inactive/revoked membership, missing permission, forged Academy ownership, and cross-Academy requests default to denial. Alphabetical order is factual ordering only; there are no scores, rankings, profiles, predictions, recommendations, or AI/LLM calls.
- Forward-only migration `20261003210000_academy_students_permission` adds only `academy_students:read`, granted to Academy Owner and Academy Administrator. The database is current at 41 migrations. No new domain tables or seed fixtures were required; `academy-demo` and the existing canonical enrollment/batch fixture are reused, and two sequential seed runs remain idempotent.
- Validation: 151 frontend tests across 44 files and 209 backend tests across 40 files pass. TypeScript, ESLint, Prisma validation/Client generation 6.19.3, migration status, two idempotent seed runs, frontend/backend production builds, and Prettier pass. Authenticated smoke confirms canonical list-to-detail identity, exact-Academy enrollment and batch context, malformed-ID rejection, unenrolled/Teacher denial, absent mutation routes, and cross-/multi-Academy isolation; the temporary isolation Academy was removed afterward. Playwright Chromium passes 1/1 with the documented supervised-preview workaround. The known frontend chunk warning is approximately 598 kB and non-blocking.

## Academy Batches Architecture

- Canonical route `/academy/batches` follows `design/ChatGPT Image Sep 30, 2026, 02_08_15 PM.png`. The UI audit found support for canonical batch identity/name, total batch count, distinct active enrolled-Student count, distinct active assigned-Coach count, per-batch factual Student/Coach counts, and batch-name search. Unsupported program, capacity, schedule, next-session, status/lifecycle tabs, needs-attention signals, performance analytics, and create/import/manage actions are omitted.
- Read-only `GET /api/v1/academy/batches?search=` strictly validates its query and returns a purpose-specific projection. It derives the active Academy Owner/Administrator assignment from the authenticated identity, requires verified active `AcademyMembership` plus `academy_batches:read`, and scopes the canonical query to that exact Academy. No client-supplied Academy selector is accepted; Academy Coach, Teacher, School Admin, missing-permission, inactive/revoked-membership, and mismatched-scope requests default to non-revealing denial.
- The module reuses the Academy Dashboard repository's canonical `Academy`, `AcademyBatch`, `AcademyStudentEnrollment`, `BatchStudentMembership`, `BatchCoachAssignment`, and active Academy coach-membership semantics. Student and Coach IDs are used only server-side for distinct counts and are never returned. Search is a deterministic batch-name filter applied only after the exact authorized Academy population is resolved; ordering remains canonical name/ID order.
- `AcademyBatch` has no lifecycle, program, capacity, schedule, or session relationship, so the API/UI does not infer active/inactive/completed/upcoming status or fabricate utilization and session facts. The DTO exposes only Academy ID/name, factual totals, and batch ID/name with Student/Coach counts. It includes no School marks/attendance/assignments/assessments, private Student/Parent/Coach data, messages, credentials/tokens/sessions, authorization internals, scores, rankings, predictions, profiling, recommendations, or AI output.
- The route remains list/read-only: there is no batch detail, create/edit/delete/archive, Student assignment, Coach assignment, import, or bulk-action endpoint or control. AcademyShell enables Batches while Dashboard and Students continue to work; `/academy/batches/:id` remains unimplemented. Loading, populated, empty, no-results, restricted, and network-error states are covered.
- Forward-only permission migration `20261003220000_academy_batches_permission` adds only `academy_batches:read`, granted to Academy Owner and Academy Administrator. No domain schema or seed fixture changed; the database is current at 42 migrations, and two sequential development seed runs remain idempotent.
- Validation: 155 frontend tests across 45 files and 215 backend tests across 41 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two idempotent seed runs, frontend/backend production builds, and Prettier pass. Authenticated smoke confirms the seeded Robotics Foundations batch, 1 distinct active Student and 1 distinct active Coach, authorized name search, Teacher and revoked-membership denial, strict forged/status-filter rejection, absent mutation routes, and complete cross-Academy batch/count isolation; the temporary isolation Academy was removed afterward. Playwright Chromium passes 1/1 with the documented supervised-preview workaround. The known frontend chunk warning is approximately 601 kB and non-blocking.

## Academy Batch Detail Architecture

- Canonical route `/academy/batches/:id` follows the supported subset of `design/ChatGPT Image Sep 30, 2026, 02_08_20 PM.png`. The UI/domain audit supports only canonical batch identity, factual Student and Coach member sets, and counts derived from those same sets. Unsupported program, level, capacity, lifecycle, schedule, location, sessions, description, recent activity, grades, schools, Parent contacts, notes, certificates, opportunities, messages, settings, and management actions are omitted.
- Read-only `GET /api/v1/academy/batches/:batchId` strictly validates the UUID, reuses `academy_batches:read`, and requires the active Academy Owner/Administrator assignment, verified active `AcademyMembership`, exact Academy resource scope, and an `AcademyBatch` belonging to that Academy. Authorization independently checks the requested batch context before the repository performs its combined batch-ID plus Academy-ID lookup; malformed IDs return validation errors while foreign and nonexistent valid IDs use the same non-revealing denial.
- The projection reuses canonical `Academy`, `AcademyBatch`, `AcademyStudentEnrollment`, `BatchStudentMembership`, `BatchCoachAssignment`, and `User` identity. Students require both an active batch membership and active enrollment in the exact Academy. Coaches require an active batch assignment and current Academy membership. IDs are deduplicated, names are deterministically ordered, and summary counts are computed from the exact returned member arrays so detail and list semantics remain consistent.
- The minimized DTO exposes only Academy ID/name, batch ID/name, Student/Coach counts, and canonical member ID/display name. It excludes School academics, Student/Coach private profile or contact data, Parent/family data, messages, notes, certificates, activities, applications, credentials, sessions/tokens, authorization internals, lifecycle, schedules, analytics, rankings, predictions, recommendations, profiling, and AI output. No LLM/provider is invoked.
- The route is strictly read-only: POST/PATCH/PUT/DELETE detail routes and batch, enrollment, Student, Coach, schedule, attendance, messaging, certificate, or assignment mutations are absent. The Batches list now links by canonical batch ID, AcademyShell keeps Batches active on list/detail routes, and detail supports back navigation plus loading, populated, sparse member, restricted/non-revealing, and network-error states.
- No schema, migration, permission, or seed fixture changed; `academy_batches:read` and the existing `academy-demo`, Robotics Foundations, Aarav enrollment, and Neha Coach assignment are reused. The database remains current at 42 migrations, and two sequential development seed runs remain idempotent.
- Validation: 159 frontend tests across 46 files and 218 backend tests across 41 files pass. TypeScript and ESLint pass for both workspaces; Prisma validation and Client generation 6.19.3, migration status, two idempotent seed runs, frontend/backend production builds, and Prettier pass. Authenticated smoke confirms canonical Robotics Foundations detail, 1 Student/1 Coach count consistency, malformed-ID rejection, non-revealing foreign/nonexistent denial, Teacher and revoked-membership denial, absent mutation routes, minimized DTO privacy, and cross-Academy member isolation; the temporary Academy was removed afterward. The first parallel backend run hit the established unrelated five-second execution-contention pattern, while the unchanged suite passed completely with one worker. Playwright Chromium passes 1/1 against the explicitly supervised current preview. The known frontend chunk warning is approximately 604 kB and non-blocking.

## Academy Coaches Architecture

- Canonical route `/academy/coaches` follows the supported subset of `design/ChatGPT Image Sep 30, 2026, 02_08_25 PM.png`. The UI/domain audit supports canonical Coach display name, Academy membership date, exact-Academy batch names/count, distinct Coach total, deterministic name ordering, and display-name search. Unsupported role labels, programs, Student load, lifecycle/status tabs, invitations, contact data, ratings, workload, alerts, analytics, management actions, and Coach Detail are omitted.
- Read-only `GET /api/v1/academy/coaches?search=` strictly validates its query. It derives the exact Academy from the authenticated active Academy Owner/Administrator assignment, requires verified active `AcademyMembership` and `academy_coaches:read`, and accepts no client-selected Academy ownership. Academy Coach, Teacher, School Admin, missing-permission, revoked-membership, forged-scope, and privilege-merging attempts default to denial.
- A current canonical Coach is a `User` with both a verified active membership in the exact Academy and an active Academy-scoped `ACADEMY_COACH` role assignment. `BatchCoachAssignment` alone does not establish Coach status. Batch context is optional and comes only from active assignments to that Academy's canonical `AcademyBatch` records, so a valid zero-batch Coach remains visible without an invented persisted status.
- The minimized DTO exposes only Academy ID/name, distinct factual Coach count, canonical Coach ID/display name, Academy membership date, and canonical local batch ID/name/count. Coaches and repeated assignments are deduplicated and ordered deterministically. Multi-Academy memberships and assignments are constrained to the authenticated Academy and cannot be inferred from another Academy's response.
- The module reuses canonical `Academy`, `User`, `AcademyMembership`, `UserRoleAssignment`, `AcademyBatch`, and `BatchCoachAssignment`. It adds no Coach profile, roster snapshot, lifecycle, analytics, ranking, prediction, recommendation, or AI/LLM path. It exposes no login/contact/security data, School relationships, Students, Parents, credentials, sessions/tokens, private profile, messages, or authorization internals.
- The milestone is strictly list/read-only: Coach Detail, invite/create/edit/delete/suspend, batch assignment/removal, bulk actions, messaging, and notes endpoints and controls are absent. AcademyShell enables Coaches while Dashboard, Students, and Batches remain available; loading, populated, zero-batch, empty, no-results, restricted, and network-error states are covered.
- Forward-only migration `20261003230000_academy_coaches_permission` adds only `academy_coaches:read` for Academy Owner and Academy Administrator. No domain schema changed. The seed adds only Neha Kapoor's missing canonical Academy-scoped `ACADEMY_COACH` role assignment to the existing verified membership and Robotics Foundations assignment; two sequential runs remain idempotent. The database is current at 43 migrations.
- Validation: 163 frontend tests across 47 files and 224 backend tests across 42 files pass with one worker, avoiding the established Windows execution contention. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, two idempotent seed runs, frontend/backend production builds, and Prettier pass. Authenticated smoke confirms `academy-demo` roster/search, canonical Neha identity, zero-leak exact-Academy scope, multi-batch deduplication, foreign-Coach/batch exclusion, Teacher/Coach-role denial, revoked-membership denial, independent permission denial, strict unsupported-filter rejection, absent detail/mutation routes, and minimized privacy boundaries; all temporary fixtures were removed and authorization state restored. Playwright Chromium passes 1/1 with the documented supervised-preview workaround. The known frontend chunk warning is approximately 607 kB and non-blocking.

## Academy Settings Architecture

- Canonical route `/academy/settings` has no dedicated Academy mockup, so it follows the established Student/Parent/Teacher account-settings pattern inside `AcademyShell`. The UI/domain audit supports only the authenticated User's account identity and state, the selected exact Academy's canonical name, sanitized active account sessions, and canonical logout-all. Organization editing, branding, contacts, notifications, preferences, billing, integrations, password/email/MFA/recovery, deletion, ownership transfer, and membership/Coach/Student management are omitted.
- Read-only `GET /api/v1/academy/settings` strictly rejects query parameters. It derives the active Academy Owner/Administrator assignment from the authenticated identity, requires verified active `AcademyMembership` and `academy_settings:read`, authorizes the exact Academy resource, and then queries only the authenticated User's account. Academy Coach, Teacher, Parent, Student, missing-permission, revoked-membership, forged-selector, and privilege-merging attempts default to denial.
- The module is a thin role-aware adapter over canonical `AccountSettingsService`, `User`, `AccountState`, `Session`, `Academy`, `AcademyMembership`, and `UserRoleAssignment`. Its minimized DTO contains Academy ID/name; own User ID, login identifier, display name, and account state; and active unrevoked sessions with ID, creation/last-seen/expiry timestamps, plus a server-derived current-session marker. Sessions remain account-owned, not Academy-owned.
- Security actions reuse canonical `POST /api/v1/auth/logout-all`; no Academy-specific logout endpoint or duplicate authentication/session state exists. Logout-all revokes the authenticated User's sessions under existing `AuthService` semantics, clears frontend authentication state, and does not affect another User. Password hashes, credential internals, refresh-token hashes/values, access tokens, secrets, other Users, other Academy memberships, role assignments, permission lists, Students, Parents, School data, messages, and AI data are excluded.
- Multi-role and multi-Academy context remains isolated by the single active Academy role assignment selected by the established Academy scope repository. The response returns only that Academy and never enumerates the User's other memberships. There are no Academy profile, account, session, preference, billing, organization, or membership mutations and no security/risk scores, profiling, recommendations, or AI/LLM calls.
- Forward-only migration `20261003240000_academy_settings_permission` adds only `academy_settings:read` for Academy Owner and Academy Administrator. No domain schema or seed fixture changed. Two sequential development seed runs remain idempotent, and the database is current at 44 migrations.
- Validation: 167 frontend tests across 48 files and 229 backend tests across 43 files pass with one worker. TypeScript, ESLint, focused Settings tests, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, two idempotent seed runs, frontend/backend production builds, and Prettier pass. Authenticated smoke confirms the exact seeded Academy, own-account identity, exactly one current-session marker, strict selector rejection, Teacher/revoked-membership/missing-permission denial, multi-Academy response isolation, sanitized DTO keys, and canonical logout-all leaving an independently authenticated Student valid; temporary isolation and authorization changes were removed or restored. Playwright Chromium passes 1/1 using the documented supervised-preview workaround. The known frontend chunk warning is approximately 610 kB and non-blocking.

- npm workspace foundation with separate React/Vite and Express applications
- Canonical authentication persistence, access tokens, rotating refresh sessions, login, logout, logout-all, and current-user APIs
- Canonical authorization persistence for roles, permissions, scoped role assignments, organization memberships, and required relationship records
- Central default-deny backend authorization service and resource-route middleware foundation
- Student self-scope, verified parent-child scope, assigned teacher class/student scope, verified school scope, verified academy scope, and assigned academy coach batch/student scope
- Explicit, separately scoped platform, security, safety, moderation, AI, support, and analytics administrator roles
- Frontend role-assignment and permission utilities for UX rendering only
- Existing environment validation, logging, centralized errors, health endpoint, and testing foundations

Remaining product work includes the unimplemented Student, Parent, Teacher, Academy, and Admin modules outside the routes recorded here, plus controlled onboarding and authorization-management workflows. Implemented modules are not covered by this limitation.

## Authentication Architecture

- Access tokens are short-lived signed JWTs held only in frontend memory.
- Refresh tokens are opaque random values delivered in secure cookie configuration and persisted only as SHA-256 digests.
- Refresh tokens rotate atomically; detected reuse revokes the session.
- Every authenticated backend request validates both the access token and its active database session/account state.
- Authentication principals contain identity and session only. Roles and permissions are resolved independently by authorization.

## Student AI Architecture

- The complete Student AI route set is available: `/student/ai`, `/doubt`, `/study-plan`, `/revision`, `/daily-plan`, `/workload`, `/opportunities`, `/career`, `/documents`, `/certificates`, `/achievements`, and `/insights`.
- APIs are scoped under `/api/v1/student/ai`: `GET /conversations`, `GET /conversations/:id`, and Zod-validated `POST` prompt routes for each supported AI context. Prompts are limited to 2,000 characters.
- `AiProvider` is a server-only interface. The active `DevelopmentAiProvider` is explicitly non-production and produces guidance-only responses; it has no database, tool, action, or provider-secret access.
- `AiConversation` and `AiMessage` persist only the authenticated student’s private history. Every lookup constrains both conversation ID and authenticated student ID; private history is not granted to any other role.
- The service supplies the development provider only the authenticated student’s first six subject names. It does not serialize profile, grades, messages, or other broad canonical data, and never makes changes to academic, activity, opportunity, Community, or authorization records.
- Student AI requires explicit `student_ai:read` / `student_ai:create` permission and the existing selected Student assignment. Missing context or ownership evidence defaults to deny.
- No mandatory AI consent record is fabricated because the specification defines consent governance but does not configure a required Student AI purpose/consent workflow. A production external provider must be activated only with an approved purpose-specific consent policy.
- Development seed data adds one clearly synthetic, private demo chat for `student-demo`.

## Student Profile Architecture

- Routes: `/student/profile`, `/academic`, `/activities`, `/achievements`, `/certificates`, `/creative-work`, and `/share`.
- `GET` and allowlisted `PATCH /api/v1/student/profile` use only the authenticated Student principal. Profile-owned editable data is limited to a short bio and interests; display name, account state, roles, memberships, certificates, and activity records are read-only canonical data.
- `StudentProfile` stores only private student-entered profile presentation data. Activities and certificates are aggregated from their existing canonical tables; no academic, opportunity, Community, or AI data is copied into Profile.
- `student_profile:read` and `student_profile:update` are explicit Student permissions. No other role receives access through this module.
- Migration `20261001120000_student_profile` is applied. Development seed provides fictional bio and interests for `student-demo`.

## Student Settings Architecture

- The approved Student Settings route `/student/settings` is implemented with a private account and security overview.
- `GET /api/v1/student/settings` lists only active sessions belonging to the authenticated user and identifies the current session without exposing refresh tokens, password hashes, secrets, or fabricated device/location data.
- `POST /api/v1/student/settings/logout-all` reuses the canonical authentication/session revocation service to revoke all sessions for the authenticated user.
- The UI reuses `StudentShell`, auth state, query infrastructure, and existing session security behavior. No competing password, token, or identity mechanism was added.
- No database migration was required. Settings reads canonical `User`, `Session`, and `RefreshToken` infrastructure.
- Settings ownership is backend-authoritative and derived from the authenticated principal. Cross-user session access and client-supplied ownership are not supported.
- Frontend tests: 17 passed. Backend tests: 42 passed.
- Complete Settings milestone validation: TypeScript passed; ESLint passed; Prisma validation passed; Prisma Client generation passed; migration status passed with 11 migrations current; development seed passed; frontend and backend production builds passed; Prettier passed; Playwright smoke test passed.

## Parent Dashboard Architecture

- The Parent Dashboard route `/parent` is implemented. `GET /api/v1/parent` discovers only the authenticated parent's verified, non-revoked child relationships; optional `childId` selection is UUID-validated and authorized server-side.
- The response is a minimized projection of canonical subject progress, incomplete tasks, upcoming schedule entries, and activities. It excludes private AI, Community, profile, account/security, session, credential, and application data.
- The Parent role requires explicit `parent_dashboard:read` permission and a verified relationship for the selected child. The policy defaults to deny for unrelated, unverified, revoked, malformed, or forged child selections.
- Migration `20261001130000_parent_dashboard_permission` adds only the explicit permission grant. The development seed adds fictional `parent-demo` with a verified relationship to `student-demo`.
- Focused Parent Dashboard coverage adds unauthenticated denial, malformed/forged child-boundary checks, private-response shape assertions, linked-child rendering, and child-selector behavior. Complete suites now contain 19 frontend tests and 45 backend tests. The existing Playwright authentication smoke test passes.

## Parent Academics Architecture

- Route implemented: `/parent/academics`; API: `GET /api/v1/parent/academics?childId=`.
- The module is a read-only, purpose-specific projection of canonical Student Academics data: subjects/progress, tasks, exams, and schedule. It does not create Parent copies or expose notes, doubts, AI, Community, Profile, account, or opportunity-application data.
- The authenticated parent’s active role, explicit `parent_academics:read` permission, and verified non-revoked parent-student relationship are checked server-side for every selected child. Child IDs are UUID-validated and cannot bypass relationship scope.
- Migration `20261001140000_parent_academics_permission` adds only the explicit permission. Existing demo relationship and academic seed data are reused.
- Existing complete validation remains green: frontend tests 19 passed, backend tests 45 passed, TypeScript, ESLint, Prisma validation/generation, migration status, seed, builds, Prettier, and Playwright passed.

## Parent Activities Architecture

- Routes implemented: `/parent/activities` and read-only activity detail at `/parent/activities/:id`. The selector-based Parent flow preserves strict child context while matching the approved Parent Activities overview.
- `GET /api/v1/parent/activities?childId=` and `GET /api/v1/parent/activities/:activityId?childId=` return purpose-specific Parent projections of canonical `StudentActivity`, `StudentActivityProgressEntry`, `StudentActivityMilestone`, and `StudentActivityCertificate` records. No Parent activity, progress, milestone, or certificate tables were created.
- Every request authenticates the caller, discovers verified non-revoked child relationships, checks the active `PARENT` assignment and explicit `parent_activities:read` permission through `AuthorizationService`, then constrains activity lookup to the selected authorized child. Missing, malformed, forged, unrelated, unverified, or revoked child context defaults to deny.
- Parent responses intentionally omit student activity descriptions and all unrelated private domains, including AI history, Community conversations/messages, profile information, account/security data, sessions, credentials, refresh tokens, private academic notes/doubts, and opportunity application details. The module is read-only; it does not let a parent modify activities, progress, milestones, or certificates.
- Migration `20261001150000_parent_activities_permission` adds only the explicit Parent permission grant. Existing `parent-demo` → `student-demo` relationship and activity seed data are reused; no seed data or schema changes were required.
- Approved reference used: `design/ChatGPT Image Sep 30, 2026, 02_06_45 PM.png` — Parent child Activities overview, cards, activity list, certificates, and support guidance.
- Validation: 22 frontend tests and 48 backend tests pass; TypeScript, ESLint, Prisma validation/generation, migration deploy/status (14 migrations current), development seed, frontend/backend builds, Prettier, and Playwright smoke test all pass. The existing test harness cannot safely exercise authenticated Prisma-backed parent relationship cases because its database credentials are unavailable; production authorization is unchanged and direct unauthenticated boundary plus frontend coverage is retained.

## Parent Calendar Architecture

- Routes implemented: `/parent/calendar`, `/parent/calendar/day`, `/parent/calendar/week`, `/parent/calendar/month`, and `/parent/calendar/event/:id`.
- `GET /api/v1/parent/calendar?from=&to=&childId=` aggregates only Parent-visible canonical `StudentScheduleItem`, task deadline, `StudentExam`, and dated `StudentActivity` records. `GET /api/v1/parent/calendar/event/:id?childId=` resolves the same stable namespaced canonical event IDs for a scoped detail view.
- The Parent role requires `parent_calendar:read`, an active Parent assignment, and a verified non-revoked relationship for every selected child and event lookup. Date ranges are Zod-validated and limited to 370 days; malformed IDs/ranges and foreign child/event requests fail without revealing another child's data.
- Responses exclude task descriptions, notes, doubts, AI, Community, Profile, Settings, sessions, credentials, refresh tokens, and opportunity application data. The module is read-only; no Parent calendar-event storage, mutations, or duplicated seed data were added.
- Permission-only migration `20261001160000_parent_calendar_permission` is applied. Existing `parent-demo`, `student-demo`, verified relationship, schedule, task, exam, and dated activity data are reused.
- Approved reference used: `design/ChatGPT Image Sep 30, 2026, 02_06_47 PM.png` — Parent child-context calendar, child selector, calendar grid, event presentation, and supporting upcoming-items layout.
- Validation: 25 frontend tests and 51 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status (15 migrations current), development seed, frontend/backend builds, Prettier, and Playwright smoke test all pass.

## Parent Growth Architecture

- Routes implemented: `/parent/growth`, `/parent/growth/overview`, `/parent/growth/academics`, `/parent/growth/activities`, `/parent/growth/patterns`, and `/parent/growth/achievements`.
- `GET /api/v1/parent/growth/...` produces a read-only, purpose-specific evidence view from canonical subject progress, task completion, activities, milestones, and certificates. It does not persist Growth values, create scores/rankings/predictions, or duplicate Student Growth state.
- The Parent role requires `parent_growth:read`, an active Parent assignment, and a verified non-revoked relationship for the selected child. The child selector is UUID-validated and every request resolves ownership server-side through `AuthorizationService` before aggregation.
- Parent Growth intentionally excludes Community memberships/content, private AI insights/history, notes/doubts, Profile data, Settings/security/session/credential data, opportunity application details, and all internal/system-only scoring. Unlike Student Growth, it does not expose Community-derived dimensions.
- Permission-only migration `20261001170000_parent_growth_permission` is applied. Existing `parent-demo`, `student-demo`, verified relationship, academic, activity, milestone, and certificate seed data are reused; no schema or seed data was added.
- Approved reference used: `design/ChatGPT Image Sep 30, 2026, 02_07_10 PM.png` — Parent evidence-led Insights overview, child selector, progress cards, academic/activity indicators, and supportive presentation.
- Validation: 28 frontend tests and 54 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status (16 migrations current), development seed, frontend/backend builds, Prettier, and Playwright smoke test all pass.

## Parent Children Architecture

- Routes: `/parent/children` and `/parent/children/:id`.
- `GET /api/v1/parent/children` derives the list solely from the authenticated Parent's verified, non-revoked `ParentStudentRelationship` records. `GET /api/v1/parent/children/:childId` independently validates the UUID and relationship before returning a minimal child overview.
- The detail response contains only the permitted child identity plus counts of open tasks, active activities, upcoming exams, and upcoming schedule items. It does not serialize `User`, `StudentProfile`, academic notes/doubts, AI history, Community content, private profile information, settings, sessions, credentials, refresh tokens, or opportunity applications.
- The Parent role requires the explicit `parent_children:read` permission and a current `PARENT` role assignment. Unrelated, unverified, revoked, malformed, forged, missing-permission, or non-Parent requests default to a non-revealing denial. Siblings remain separate resource contexts; the module neither compares nor aggregates them.
- Permission-only migration `20261001180000_parent_children_permission` is applied. The idempotent development seed adds only a second fictional linked child, `Mira Sharma`, to demonstrate multiple-child selection without duplicating academic or activity records.
- Approved references used: `design/ChatGPT Image Sep 30, 2026, 02_06_29 PM.png` (Children list) and `design/ChatGPT Image Sep 30, 2026, 02_06_32 PM.png` (single child overview).
- Validation: 31 frontend tests and 57 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status (17 migrations current), development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Academics Architecture

- Canonical route: `/parent/children/:id/academics`, backed by `GET /api/v1/parent/children/:childId/academics`.
- The endpoint reuses the existing Parent Academics read path and `parent_academics:read` authorization decision. It independently validates the route child ID, active Parent role, and verified non-revoked `ParentStudentRelationship` before reading canonical subjects, tasks, exams, and schedule items.
- The canonical response is a child-specific Parent DTO and intentionally omits the legacy selector's `children` list, private notes/doubts, AI, Community, Profile, Settings, sessions, credentials, tokens, applications, and sibling records. `/parent/academics` remains available for backward compatibility.
- The route-derived child context is shown in the reused Parent Academics UI. The child overview Academics action preserves its exact child ID. `student-demo` renders existing academic data; `Mira Sharma` correctly renders a true empty state without fallback data.
- No schema, permission, migration, or seed change was required; the database remains at 17 migrations. Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_35 PM.png`.
- Validation: 33 frontend tests and 60 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Attendance Architecture

- Canonical route: `/parent/children/:id/attendance`, backed by read-only `GET /api/v1/parent/children/:childId/attendance`. The child overview Attendance action preserves the selected child ID.
- Canonical `AttendanceSession` and `AttendanceRecord` models distinguish scheduled class sessions from explicit official student states (`PRESENT`, `ABSENT`, `LATE`, `PARTIAL`). A completed session without a current record remains missing; it is never inferred to be absent. Records retain `recordedAt` and `supersededAt`, allowing later correction workflows to preserve history without destructive overwrites.
- Summary and subject percentages are derived at request time as `PRESENT / known official records`. Missing records are reported separately and excluded from the denominator; an all-missing dataset returns no percentage rather than zero.
- The endpoint requires an active Parent assignment, explicit `parent_attendance:read`, and a verified non-revoked relationship to the route child. It returns only the child identity, factual summaries, subject breakdown, and session dates/states.
- Migration `20261001190000_parent_attendance` creates the canonical tables/enums, current-record integrity index, and Parent permission. The database is current at 18 migrations.
- The idempotent development seed adds one fictional verified school/class membership, seven completed sessions for `student-demo`, six explicit records, and one deliberately missing record. Mira remains without attendance/class records and receives a true empty response.
- Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_38 PM.png` — Parent child-context Attendance summary, subject breakdown, and factual history presentation.
- Validation: 35 frontend tests and 65 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Tasks Architecture

- Canonical route: `/parent/children/:id/tasks`, backed by read-only `GET /api/v1/parent/children/:childId/tasks`. The child overview Tasks action preserves the selected child ID.
- The endpoint returns a minimized Parent projection of canonical `StudentTask` records only: title, related subject name when available, deadline, priority, completion timestamp, and a derived factual state. `COMPLETED` takes precedence; an incomplete task with a passed deadline is `OVERDUE`; an incomplete future deadline is `UPCOMING`; and a task without a deadline is `OPEN`.
- The Parent role requires an active Parent assignment, explicit `parent_tasks:read`, and a verified non-revoked relationship to the route child. Every task query constrains `studentId` to that independently authorized child; unrelated, malformed, forged, inactive, or missing-permission contexts deny without exposing sibling data.
- The module is read-only. It adds no Parent task table, mutation, copied task status, or assignment/submission/assessment/mark/feedback model. The existing canonical `StudentTask` model remains compatible with the current schoolwork representation; those distinct future concepts have not been conflated here.
- Parent DTOs intentionally exclude task descriptions, notes, doubts, AI, Community, private Profile data, Settings/security data, sessions, credentials/tokens, opportunity applications, internal authorization records, and any sibling records. `student-demo` shows existing tasks; Mira remains a true empty task context.
- Permission-only migration `20261001200000_parent_tasks_permission` is applied. No task schema or seed change was required; the database is current at 19 migrations.
- Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_42 PM.png` — Parent child-context Tasks overview, task summaries, filters, and task list.
- Validation: 38 frontend tests and 68 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Activities Architecture

- Canonical route: `/parent/children/:id/activities`, backed by read-only `GET /api/v1/parent/children/:childId/activities`. The child overview Activities action preserves the selected child ID.
- The canonical endpoint reuses the existing Parent Activities authorization, canonical `StudentActivity` query, Parent-visible activity projection, and certificate projection. It deliberately omits the legacy selector response's `children` list while retaining `child`, `activities`, and `certificates`.
- The existing `/parent/activities` selector route and `/parent/activities/:id` detail route remain functional and use the same read/projection implementation. No child-scoped detail route was added because it is not in the approved route map.
- The endpoint requires an active Parent assignment, explicit `parent_activities:read`, and a verified non-revoked relationship to the route child. All activity and certificate queries constrain `studentId` to the independently authorized child; malformed, forged, unrelated, inactive, or missing-permission contexts deny without revealing sibling data.
- Parent Activities remains read-only. It creates no Parent activity/progress/milestone/certificate table and offers no activity, progress, milestone, certificate, or evidence mutation. Parent DTOs continue to exclude AI, Community, notes/doubts, private Profile information, Settings/security data, sessions, credentials/tokens, applications, internal authorization data, and other children.
- `student-demo` uses existing seeded activities and certificates; Mira remains a true empty activity context. No schema, migration, permission, or seed change was needed; the database remains current at 19 migrations.
- Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_45 PM.png` — Parent child-context Activities overview, summaries, cards, certificates, and supportive presentation.
- Validation: 42 frontend tests and 68 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Calendar Architecture

- Canonical route: `/parent/children/:id/calendar`, backed by read-only `GET /api/v1/parent/children/:childId/calendar?from=&to=`. The child overview Calendar action preserves the selected child ID; day, week, and month controls remain inside this one canonical route.
- The endpoint reuses the existing Parent Calendar authorization and aggregation path. It returns stable namespaced source IDs for canonical `StudentScheduleItem`, `StudentTask` deadline, `StudentExam`, and dated `StudentActivity` records; no calendar event is copied or persisted for a Parent view.
- The canonical response omits the legacy selector's `children` list and adds the derived `hasCalendarData` flag. This distinguishes a child with no dated canonical calendar sources from a child whose existing sources have no permitted event in the selected date range.
- `/parent/calendar`, its day/week/month routes, and legacy event detail remain functional. No new canonical child day/week/month/event-detail URLs were introduced.
- The endpoint requires an active Parent assignment, explicit `parent_calendar:read`, and a verified non-revoked relationship to the route child. Date ranges remain Zod-validated and bounded; all source queries filter by the independently authorized child ID before aggregation.
- Parent Calendar remains read-only and excludes unconfirmed AI proposals, AI history, Community content, notes/doubts, private Profile data, Settings/security data, sessions, credentials/tokens, applications, internal authorization data, and sibling records. `student-demo` retains its existing source events; Mira remains a true empty calendar context.
- No schema, migration, permission, or seed change was required; the database remains current at 19 migrations. Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_47 PM.png`.
- Validation: 47 frontend tests and 68 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Child Teachers Architecture

- Canonical route: `/parent/children/:id/teachers`, backed by read-only `GET /api/v1/parent/children/:childId/teachers`. The child overview Teachers action preserves the selected child ID.
- Teacher visibility is derived rather than directory-based: an independently authorized child must have an active class membership, and each returned teacher must have an active `TeacherClassAssignment` for that exact class, a verified active school membership, and an active school-scoped `TEACHER` role assignment. School membership alone never grants directory visibility.
- The endpoint requires an active Parent assignment, explicit `parent_teachers:read`, and a verified non-revoked relationship to the route child. The Parent-specific DTO contains only teacher ID, display name, and the child-relevant class/school context; it excludes login identifiers, contact details, roles, permissions, unrelated classes/memberships, credentials, sessions, tokens, and internal authorization data.
- Parent Teachers is read-only and intentionally has no teacher profile, global search, rating, ranking, contact, or messaging capability. The reference's broader communication affordances remain out of scope until an authorized messaging module exists.
- Permission-only migration `20261001210000_parent_teachers_permission` is applied. No new relationship/domain model was needed; the database is current at 20 migrations.
- The idempotent development seed adds fictional `teacher-demo` / Neha Kapoor with a verified school membership, active school-scoped Teacher role, and assignment to `student-demo`'s existing class. Mira has no matching class membership, so her Teachers context remains truly empty and cannot inherit the sibling's teacher.
- Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_06_49 PM.png` — Parent child-context Teachers list. Unsupported messaging, contact, profile, and rating elements were deliberately excluded.
- Validation: 51 frontend tests and 71 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend builds, Prettier, and Playwright smoke test pass.

## Parent Messages Architecture

- Canonical route: `/parent/messages`. The single-route inbox selects and displays conversation detail without inventing a second Parent detail URL. It provides loading, empty, selected-conversation, no-message, sending, send-failure, and restricted states without a global user or teacher search.
- APIs: `GET /api/v1/parent/messages`, `GET /api/v1/parent/messages/:conversationId`, and strict Zod-validated `POST /api/v1/parent/messages/:conversationId/messages`. Message bodies are trimmed and limited to 1–2,000 characters; unsupported fields such as a client-supplied sender ID are rejected.
- Parent Messages reuses canonical `CommunityConversation`, `CommunityConversationMember`, and `CommunityMessage` identity. No Parent-, TeacherParent-, or duplicate messaging tables were introduced. The existing Student Community APIs continue to use the same canonical records but retain their separate Student authorization policy.
- The Parent teacher-context resolver is shared with Parent Child Teachers. It derives counterparties through a verified non-revoked `ParentStudentRelationship`, the child's active class membership, an active `TeacherClassAssignment`, the teacher's active verified school membership, and active school-scoped Teacher role. Same-school membership alone is insufficient.
- Read and create are separately authorized through `parent_messages:read` and `parent_messages:create`. Conversation membership alone is insufficient: every list, detail, and send operation filters or revalidates the current Parent→child→class→teacher relationship. The sender always comes from the authenticated principal.
- Parent Messages exposes only direct conversations owned by the Parent and currently authorized teacher counterparties. Its DTO contains teacher identity, permitted child/class/school relationship context, message body/timestamps, and sanitized sender identity. It excludes credentials, sessions/tokens, role/permission assignments, unrelated memberships/classes/children, private Student AI, academic notes/doubts, safety/moderation internals, and every Student private Community conversation.
- The same teacher is represented by one conversation even if future canonical context connects that teacher to multiple verified children; each child context remains explicit and siblings are never merged or compared. In current demo data, Neha Kapoor is authorized only through `student-demo` / Aarav Sharma; Mira does not authorize or appear in that conversation.
- Runtime conversation creation and arbitrary recipient discovery are intentionally absent because no dedicated Parent Messages reference defines that workflow. Viewing Messages never creates a conversation. The seed uses a deterministic canonical conversation ID and upserts its participants/messages, so repeated seeding does not duplicate the Parent↔teacher-demo conversation.
- The current schema has no canonical block, messaging-restriction, or safety-restriction records. This milestone adds no fake enforcement or moderation subsystem; access remains restricted to the active relationship and explicit permissions. A future scoped restriction milestone must add those checks before expanding messaging policies or counterparties.
- Permission-only migration `20261001220000_parent_messages_permissions` is applied; the database is current at 21 migrations. The idempotent development seed adds one clearly fictional Parent↔teacher-demo direct conversation and does not add Parent access to Student conversations.
- No dedicated Parent Messages mockup exists in the supplied Parent reference sequence. The implementation combines the approved Parent shell language from `design/ChatGPT Image Sep 30, 2026, 02_06_27 PM.png` with the established inbox/conversation hierarchy from `02_01_53 PM.png`, `02_01_57 PM.png`, and `02_02_04 PM.png` without importing Student navigation or privacy assumptions.
- Validation: 55 frontend tests and 77 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend production builds, Prettier, real seeded-data API smoke verification, and the Playwright authentication smoke test pass.

## Parent Approvals Architecture

- Canonical route `/parent/approvals` and APIs `GET /api/v1/parent/approvals` and `POST /api/v1/parent/approvals/:approvalId/decision` are implemented. The decision body is strict and accepts only `APPROVED` or `DECLINED`; child, target, status, and resolver identity cannot be supplied by the client.
- `ParentApprovalRequest` is the single auditable approval entity. It stores explicit `PENDING`, `APPROVED`, or `DECLINED` state, child identity, canonical target identity, request/resolution timestamps, and the authenticated resolver. A database check keeps pending and resolved metadata consistent, and a composite foreign key guarantees that the referenced opportunity application belongs to the same child.
- The only supported target type is `OPPORTUNITY_APPLICATION`. It references an existing submitted `OpportunityApplication`; approvals do not duplicate opportunities, expose the private application note, mutate application status, or authorize arbitrary records. Decisions require the application to remain submitted and its canonical opportunity to remain open and within deadline.
- The Parent role requires separate `parent_approvals:read` and `parent_approvals:update` permissions. Listing derives children through verified, non-revoked `ParentStudentRelationship` records. Deciding independently re-authorizes the approval's child through `AuthorizationService`; knowing an approval ID does not grant access.
- Decisions use a conditional `PENDING` update inside a transaction. Only the first valid decision succeeds; repeated or racing attempts receive a conflict and cannot overwrite the historical result. Invalid or stale targets also fail with a conflict.
- The Parent DTO includes only approval identity, explicit child context, safe opportunity title/detail/category/deadline, status, and timestamps. It excludes application notes, AI, Community data, private Profile and Settings data, sessions/tokens/credentials, internal authorization records, and unrelated children. Siblings are never merged or compared.
- Migration `20261001230000_parent_approvals` adds the approval enums/table, ownership and state-integrity constraints, and explicit permissions. The database is current at 22 migrations. The idempotent development seed adds one pending fictional request for `student-demo` and creates none for Mira.
- Approved reference used: `design/ChatGPT Image Sep 30, 2026, 02_06_54 PM.png` — Parent approvals heading, status tabs, summary cards, explicit child context, and Approve/Decline actions. Unsupported decorative approval types in the reference were not fabricated.
- Validation: 60 frontend tests and 85 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend production builds, Prettier, seeded-data API smoke verification, and Playwright all pass.

## Parent Insights Architecture

- Canonical route `/parent/insights` and `GET /api/v1/parent/insights?childId=` are implemented. The endpoint returns one selected child's purpose-specific evidence projection and independently authorizes every child selection.
- Insights use a deterministic six-week evidence window and seven-day upcoming window. Inputs are limited to Parent-visible canonical `StudentSubject`, `StudentTask`, official attendance session/record, `StudentActivity`/milestone/certificate, `StudentExam`, and `StudentScheduleItem` data.
- Attendance reuses the canonical known-record denominator: missing records remain missing and never become absent or reduce the present rate. Task completion-by-deadline includes only completed tasks with a recorded deadline. Empty evidence produces an explicit insufficient-data response rather than a negative conclusion.
- The service emits concise factual observations and their supporting counts. It does not produce subject-score trends because the current schema has no historical subject-progress or mark snapshots from which to derive a defensible comparison.
- No AI provider is used. The repository does not query `AiConversation`, `AiMessage`, Community, notes, doubts, Profile, Settings, sessions, credentials, opportunity application notes, or internal authorization records. No insight text, score, risk label, prediction, or sibling comparison is persisted.
- Access requires an active Parent role assignment, explicit `parent_insights:read`, and a verified non-revoked `ParentStudentRelationship` for the selected child. Switching children performs a new server-scoped evidence query; Aarav and Mira are never aggregated. Seeded Mira remains a true sparse-data case.
- Permission-only migration `20261001240000_parent_insights_permission` is applied. No domain table or seed change was required; the database is current at 23 migrations.
- Approved reference used: `design/ChatGPT Image Sep 30, 2026, 02_07_10 PM.png` — Parent Insights hierarchy, child selector, domain cards, evidence list, attendance/tasks/activities, and upcoming workload. Speculative AI prose, subjective labels, and unsupported trend charts from the reference were intentionally replaced with grounded facts.
- Validation: 65 frontend tests and 91 backend tests pass. TypeScript, ESLint, Prisma validation/generation, migration deploy/status, development seed, frontend/backend production builds, Prettier, seeded-data API smoke for both Aarav and Mira, and Playwright all pass.

## Parent Documents Architecture

- Canonical route `/parent/documents` and `GET /api/v1/parent/documents?childId=` are implemented as a narrow, child-scoped Parent document workspace. There is no dedicated Parent Documents mockup in the supplied references, so the page reuses the approved Parent shell language, child selector, cards, spacing, and empty/restricted states from the Parent reference set.
- Canonical `Document` metadata records retain explicit child, uploader, purpose, safe display/file names, declared MIME type and size, optional private storage key, and creation timestamp. The sole current allowlisted purpose is `PARENT_PROVIDED_SUPPORTING_DOCUMENT`; certificates, Student resources, private uploads, and opportunity documents are not copied into this table or exposed automatically.
- The repository has no S3-compatible or secure local binary-storage adapter yet. Accordingly, Parent Documents is read-only and metadata-only: no upload, preview, download, create, delete, arbitrary path, base64 body, source-tree file, public URL, or fake cloud operation exists. API DTOs expose only `binaryAvailable`, never `storageKey` or an internal path, and the UI states this boundary explicitly.
- Access requires an active Parent role assignment, explicit `parent_documents:read`, and a verified non-revoked `ParentStudentRelationship` for the selected child. Child IDs are strict UUIDs, unsupported query fields are rejected, every selection is independently authorized, and missing role/permission/relationship context defaults to a non-revealing denial.
- Parent DTOs include only Parent-provided supporting-document metadata for the authorized child. They exclude Student AI files/history, Community attachments/messages, notes/doubts, Settings/security data, sessions/tokens/credentials, private opportunity application material, unrelated certificates/resources, internal authorization records, school-private files, and sibling records.
- Migration `20261001250000_parent_documents` creates the canonical enum/table, indexes and foreign keys, and grants only `parent_documents:read` to the Parent role. It applied without reset or destructive data changes; the database is current at 24 migrations.
- The idempotent development seed adds one fictional metadata-only consent-form record for `student-demo`, uploaded by `parent-demo`, with no storage key. Mira remains empty to exercise strict sibling isolation. Seeded API smoke confirms Aarav has one permitted record, Mira has zero, and binary storage is unavailable.
- Validation: 70 frontend tests across 25 files and 98 backend tests across 25 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration status, development seed, frontend/backend production builds, Prettier, seeded-data API smoke, and Playwright Chromium smoke (1 test) all pass.

## Parent Opportunities Architecture

- Canonical route `/parent/opportunities` and read-only `GET /api/v1/parent/opportunities?childId=&search=&category=&availability=` are implemented. Query input is strict Zod-validated; supported availability values are `OPEN` and `CLOSED`.
- The module reuses the canonical shared `Opportunity` catalog. It adds no Parent opportunity, recommendation, saved-opportunity, or application table and exposes no Parent mutation endpoint.
- Discovery supports deterministic server-side text search, exact category filtering, and canonical open/closed availability derived from `isOpen` and the deadline. Results are not scored or ranked. Because no approved Parent-visible personalization evidence exists, the response explicitly identifies discovery as general rather than fabricating child relevance or an eligibility verdict.
- Application visibility is minimized to an `approvalPending` signal when a pending canonical Parent approval exists for the selected child's application. Parents are directed to `/parent/approvals`; application IDs, notes, answers, essays, attachments, review data, and Student `SavedOpportunity` state are not returned or mutated.
- Access requires an active Parent role assignment, explicit `parent_opportunities:read`, and a verified non-revoked `ParentStudentRelationship` for the independently selected child. Malformed, forged, unrelated, unverified, revoked, or unauthorized child contexts default to a non-revealing denial.
- Child switching performs a fresh authorized server query. Seeded smoke verification confirms Aarav and Mira receive the same three canonical catalog records, while only Aarav has one approval-pending signal; no sibling data is merged or compared.
- No seed or domain-schema change was required. Permission-only migration `20261001260000_parent_opportunities_permission` grants `parent_opportunities:read` to the Parent role; the database is current at 25 migrations.
- There is no dedicated Parent Opportunities mockup in the supplied references. The UI combines the approved Parent shell and child-selector language from `design/ChatGPT Image Sep 30, 2026, 02_06_27 PM.png` with the established opportunity discovery/detail hierarchy from `design/ChatGPT Image Sep 30, 2026, 02_02_56 PM.png` and `02_02_58 PM.png`.
- Validation: 75 frontend tests across 26 files and 105 backend tests across 26 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, development seed, frontend/backend production builds, Prettier, seeded-data API smoke for Aarav and Mira, and Playwright Chromium smoke (1 test) all pass.

## Parent Settings Architecture

- Canonical route `/parent/settings` and `GET /api/v1/parent/settings` are implemented as the authenticated Parent's own account/security surface. The route accepts no user, parent, child, or session-owner identifier and rejects unsupported query fields.
- A shared `AccountSettingsService` now supplies the safe canonical `User` and active `Session` projection for Student and Parent Settings. Parent Settings adds an active Parent assignment and explicit `parent_settings:read` authorization gate without forking authentication or session logic.
- The Parent DTO contains only account ID, login identifier, display name, account state, and active session metadata (`id`, creation, last-seen and expiry timestamps, plus a server-derived current-session flag). It never selects or returns password hashes, refresh-token records/hashes, raw tokens, JWTs, secrets, roles, permissions, or another account's data.
- Logout-all continues through canonical `POST /api/v1/auth/logout-all` and `AuthService.logoutAll`. Identity is derived from the authenticated principal; no client-supplied owner ID is accepted. The existing frontend auth provider clears in-memory authentication state after the operation, and canonical database revocation covers only that Parent's sessions and refresh tokens.
- Child relationships do not participate in Parent account ownership. Aarav, Mira, teacher-demo, other Parents, child credentials/sessions/preferences, Student AI/Community privacy controls, and child account administration remain outside this API and UI.
- No Parent preference, credential, session, refresh-token, or security table was created. Permission-only migration `20261001270000_parent_settings_permission` grants `parent_settings:read` to the Parent role; the database is current at 26 migrations. No seed change was required.
- No dedicated Parent Settings mockup exists in the supplied Parent reference sequence. The page uses the approved Parent visual language and a small reusable `ParentShell`, while reusing the established Student Settings account/session hierarchy. Unsupported password, email, MFA, recovery, deletion, notification, AI-consent, and preference controls are explicitly unavailable rather than presented as fake toggles.
- Seeded compiled-API smoke confirms the Parent receives only `parent-demo` account/session data, exactly one current session is identified, no sensitive fields leak, Parent logout-all revokes the Parent token, and the independently authenticated Student session remains valid.
- Validation: 79 frontend tests across 27 files and 110 backend tests across 27 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, development seed, frontend/backend production builds, Prettier, seeded-data API smoke, and Playwright Chromium smoke (1 test) all pass.

## Teacher Dashboard Architecture

- Canonical route `/teacher` and read-only `GET /api/v1/teacher` are implemented. The API accepts no `teacherId` or other client-supplied ownership context and returns a purpose-specific Teacher Dashboard DTO rather than raw Prisma records.
- Scope is derived server-side from the authenticated principal's active school-scoped `TEACHER` role assignment, verified active `SchoolMembership`, explicit `teacher_dashboard:read` permission, and active `TeacherClassAssignment` records within that same school. School membership alone never creates school-wide class or student visibility.
- The dashboard reuses canonical `SchoolClass`, `ClassStudentMembership`, `StudentTask`, `AttendanceSession`, and `AttendanceRecord` data. It derives assigned-class and unique-student counts, incomplete canonical Student task counts, scheduled/completed attendance sessions, and session subjects without persisting dashboard metrics or creating Teacher copies.
- Attendance keeps missing records separate from explicit absence. The pending-attendance count includes only completed sessions with missing official records; no missing record is converted to absent, and the dashboard provides no attendance mutation.
- Existing academic schema does not yet include distinct canonical Assignment, Submission, Assessment, Mark, or Feedback models. The dashboard therefore labels existing `StudentTask` records as tasks and does not fabricate assignment-review or marking metrics.
- The Teacher DTO exposes only Teacher identity, school, assigned-class summaries, aggregate authorized-student counts, task counts, and official session summaries. It returns no Student names or IDs, AI history, Community messages, private notes/doubts, profile/settings/security data, credentials/tokens, opportunity applications, Parent/family data, or Teacher effectiveness/ranking information.
- A dedicated `TeacherShell` follows the approved Teacher navigation and dashboard hierarchy. Dashboard, Classes, and Students are active destinations; future Teacher modules are visibly unavailable rather than linked to unimplemented routes or other role experiences. Approved reference: `design/ChatGPT Image Sep 30, 2026, 02_07_12 PM.png`.
- Permission-only migration `20261001280000_teacher_dashboard_permission` grants `teacher_dashboard:read` to the Teacher role; no domain table was added. The database is current at 27 migrations.
- The idempotent development seed reuses `teacher-demo` / Neha Kapoor, the existing verified school membership, class assignment, class membership, Student tasks, and attendance records. It adds only the missing Argon2id demo credential needed for an authenticated Teacher seeded-data smoke; it does not duplicate academic, attendance, Student, or Parent records.
- Validation: 83 frontend tests across 28 files and 115 backend tests across 28 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, development seed, frontend/backend production builds, Prettier, seeded compiled-API smoke, and Playwright Chromium smoke (1 test) all pass.

## Teacher Classes Architecture

- Canonical route `/teacher/classes` and read-only `GET /api/v1/teacher/classes?search=` are implemented. Search is strict Zod-validated, bounded to an assigned-class/official-subject text match, and cannot supply Teacher, school, or class ownership context.
- Canonical route `/teacher/classes/:id` and read-only `GET /api/v1/teacher/classes/:classId` reuse the same Teacher Classes service and canonical class projection. The class ID is a resource identifier only: the backend independently requires the active Teacher role, `teacher_classes:read`, verified active school membership, and an active `TeacherClassAssignment` for that exact Teacher/class pair. Malformed, unassigned, inactive, and unrelated class requests fail without a school-wide fallback.
- The list reuses the Teacher Dashboard's canonical assignment-scope repository: active school-scoped Teacher role assignment, verified active `SchoolMembership`, explicit `teacher_classes:read` permission, and active `TeacherClassAssignment` records. It queries no school-wide fallback class list.
- The minimized DTO preserves canonical `SchoolClass` identity and exposes only class name, official session-derived subjects, active `ClassStudentMembership` count, incomplete canonical `StudentTask` count, next scheduled official session, and the count of completed sessions missing one or more official attendance records.
- The detail DTO adds the canonical school context and recent official session summaries with known, missing, and explicitly absent attendance counts. It does not return a Student roster, Student identifiers, private Student domains, Parent/family data, authorization internals, or mutation controls.
- Attendance treats missing records as unknown rather than absent; tasks remain tasks rather than being relabeled as assignments. The schema has no supported Teacher assignment/assessment/mark model yet, so those fields and controls are not fabricated.
- Class cards now preserve the canonical `SchoolClass` ID when navigating to `/teacher/classes/:id`. Both list and detail remain read-only and expose no Student IDs/names, Student AI, Community/private notes, profiles, settings/security data, credentials/tokens, Parent data, other Teachers' information, permissions, or unassigned classes.
- `TeacherShell` highlights Classes on both the list and detail routes and the detail page provides canonical back navigation. Approved references: `design/ChatGPT Image Sep 30, 2026, 02_07_15 PM.png` and `design/ChatGPT Image Sep 30, 2026, 02_07_18 PM.png`.
- Permission-only migration `20261001290000_teacher_classes_permission` grants `teacher_classes:read` to the Teacher role. No class-domain table or seed data was added; the database is current at 28 migrations.
- Validation: 89 frontend tests across 29 files and 121 backend tests across 29 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 28 migrations current, idempotent development seed, frontend/backend production builds, Prettier, seeded compiled-API smoke (Teacher login, Dashboard, Classes, assigned Class Detail, and unassigned-class denial), and Playwright Chromium smoke (1 test) all pass.

## Teacher Students Architecture

- Canonical route `/teacher/students` and read-only `GET /api/v1/teacher/students?search=&classId=` are implemented. Both query parameters are strict Zod-validated; search runs only after the authenticated Teacher's authorized roster is resolved, and a supplied class ID must independently pass the exact active-assignment check.
- Canonical route `/teacher/students/:id` and read-only `GET /api/v1/teacher/students/:studentId` reuse the same Teacher Students service, repository, permission, and assignment policy. Student IDs are strict UUIDs and remain resource identifiers only; malformed, nonexistent, inactive-membership, inactive-assignment, unassigned, and unrelated-school contexts fail without revealing resource existence.
- The roster is derived server-side from the authenticated principal's active school-scoped `TEACHER` role, verified active `SchoolMembership`, explicit `teacher_students:read` permission, active `TeacherClassAssignment`, and active `ClassStudentMembership`. There is no school-wide fallback: inactive memberships, unassigned classes, unrelated schools, and Teachers without assignments yield no unauthorized Student visibility.
- The minimized list/detail DTOs preserve canonical Student identity and only mutually authorized class contexts. Detail adds official completed attendance sessions and a known/missing summary using the canonical attendance helper; missing records remain unknown and never become absent. Other Student classes are excluded.
- `StudentTask` currently has no canonical class relationship. Detail therefore returns an explicit unavailable task-attribution state and no task records rather than matching by subject-name text or leaking unrelated Student work.
- Both DTOs exclude login/contact data, private Profile, AI, Community, notes/doubts, settings/security, sessions, credentials/tokens, documents, opportunities/applications, Parent/family/sibling data, role/permission records, authorization internals, profiling, rankings, predictions, and unsupported grades/scores/development judgments.
- The UI follows `design/ChatGPT Image Sep 30, 2026, 02_07_20 PM.png` for the roster and `design/ChatGPT Image Sep 30, 2026, 02_07_23 PM.png` for detail. Roster rows now preserve canonical Student IDs when navigating to detail; TeacherShell keeps Students active, detail provides back navigation, and route changes clear prior Student data before a new request resolves.
- No roster, summary, or copied Student domain table was created. Permission-only migration `20261001300000_teacher_students_permission` grants `teacher_students:read` to the Teacher role; the database is current at 29 migrations. Existing teacher-demo, class assignment, and Aarav class membership seed data are reused without seed changes.
- Validation: 96 frontend tests across 31 files and 131 backend tests across 30 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration status, two consecutive idempotent development seed runs, frontend/backend production builds, Prettier, seeded compiled-API smoke (Teacher login, Dashboard, Classes, roster, authorized Student Detail with 6 known and 1 missing attendance record, and unrelated Student denial), and Playwright Chromium smoke (1 test) all pass.

## Teacher Attendance Architecture

- Canonical route `/teacher/attendance` implements the approved operational attendance workspace from `design/ChatGPT Image Sep 30, 2026, 02_07_27 PM.png`. `TeacherShell` enables and highlights Attendance, and the page provides assigned-session selection, the authorized active roster, explicit recorded and not-recorded states, and backend-confirmed save/reconciliation behavior.
- APIs are `GET /api/v1/teacher/attendance`, `GET /api/v1/teacher/attendance/:sessionId`, and `PATCH /api/v1/teacher/attendance/:sessionId`. Filters, route IDs, attendance states, expected-current-record IDs, request size, and duplicate Student entries are strictly Zod-validated.
- Every read/write derives Teacher identity from the authenticated principal and requires an active school-scoped Teacher role, verified active `SchoolMembership`, separate `teacher_attendance:read` or `teacher_attendance:update` permission, an active `TeacherClassAssignment` for the exact session class, and active Student class membership for every supplied record. Same-school but unassigned classes and unrelated sessions remain denied.
- The module reuses canonical `AttendanceSession`, `AttendanceRecord`, `SchoolClass`, `ClassStudentMembership`, and `TeacherClassAssignment`. Missing records are returned as `status: null` / NOT RECORDED and are never inferred as ABSENT; omitted Students are untouched.
- Official writes are allowed only for `COMPLETED` sessions. `SCHEDULED` and `CANCELLED` sessions remain read-only. Initial writes require `expectedRecordId: null`; revisions require the exact current record ID. Writes run in a serializable transaction, stale expectations return `ATTENDANCE_CONFLICT`, and there is no silent last-write-wins behavior.
- Canonical `AttendanceAudit` and `AttendanceAuditAction` provide minimum provenance. A revision supersedes the current `AttendanceRecord`, preserves it as history, creates exactly one new active version, and appends a `CORRECTED` audit linking the authenticated actor and previous/new records and states. Initial writes append `RECORDED`. No token, credential, or arbitrary request payload is stored.
- The minimized attendance DTO exposes only the assigned session/class context and the canonical Student ID/display name required for the authorized roster. It excludes AI, Community, private notes/doubts/Profile data, settings/security, sessions, credentials/tokens, opportunities/applications, documents, Parent/family data, and authorization internals.
- Forward-only migration `20261002100000_teacher_attendance` adds the two explicit permissions and canonical audit provenance without recreating or deleting existing attendance records. The database is current at 30 migrations. The seed adds no attendance fixture; its existing attendance upsert intentionally does not reactivate superseded records, and the seventh session remains deliberately not recorded to preserve the Missing ≠ Absent demonstration.
- Database-backed compiled API smoke confirms teacher-demo login, assigned-session reads, unassigned-session denial, NOT RECORDED handling, explicit first recording, omitted-Student safety, authenticated actor provenance, versioned correction, exactly one active record, preserved history, appended audits, and stale-write conflict without state/history loss. Temporary smoke fixtures are removed after validation.
- Validation: 101 frontend tests across 32 files and 140 backend tests across 31 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 30 migrations current, two consecutive idempotent development seed runs, frontend/backend production builds, Prettier, authenticated attendance read/mutation/history/conflict smoke, and Playwright Chromium smoke (1 test) all pass.

## Teacher Assignments Architecture

- Canonical route `/teacher/assignments` and read-only `GET /api/v1/teacher/assignments?classId=&status=&search=` are implemented from `design/ChatGPT Image Sep 30, 2026, 02_07_30 PM.png`. `TeacherShell` enables and highlights Assignments; the UI provides factual summaries, assigned-class/status filters, authorized search, populated, empty, no-results, loading, and restricted/error states.
- The canonical `Assignment` model has explicit class, creator, subject, due-date, description, lifecycle status, and timestamp fields. `AssignmentStatus` supports `DRAFT`, `SCHEDULED`, `PUBLISHED`, `OPEN`, `CLOSED`, `ARCHIVED`, and `CANCELLED`. No role-specific Assignment copy or persisted dashboard summary was added.
- `StudentTask` remains a distinct canonical concept and was not renamed, migrated, synchronized, or dual-written. Submission, Assessment, Mark, and Feedback domains remain unimplemented; the UI explicitly reports submission/grading metrics as unavailable instead of fabricating counts from StudentTask state.
- Every request derives Teacher identity from the authenticated principal and requires an active Teacher role, verified active `SchoolMembership`, `teacher_assignments:read`, and active `TeacherClassAssignment` scope. A supplied class filter is independently authorized for that exact class; same-school unassigned classes are denied, and search/status filtering occurs only within the already-authorized Assignment population.
- The minimized DTO contains only safe Teacher/school context, assigned-class filters, factual assignment summaries, and assignment identity/title/class/subject/due-date/status/timestamps. It contains no Student identities, submissions, marks, private Student or Parent data, credentials/tokens, or authorization internals.
- The list remains read-only for edit, delete, publish, grading, submission, and StudentTask-generation operations. The approved Create Assignment action now navigates to the separate `/teacher/assignments/create` route; no Assignment Detail or other mutation route was added.
- Forward-only migration `20261002110000_teacher_assignments` adds the canonical Assignment table, lifecycle enum, explicit permission, and Teacher grant without modifying StudentTask or existing records. The database is current at 31 migrations.
- The idempotent seed adds two fictional canonical assignments in Neha Kapoor's assigned class and one fixture in a same-school unassigned class. It adds no Submission, Assessment, Mark, Feedback, or StudentTask synchronization data.
- Validation: 105 frontend tests across 33 files and 146 backend tests across 32 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 31 migrations current, two consecutive idempotent development seed runs, frontend/backend production builds, Prettier, compiled authenticated API smoke (Teacher login, authorized list, assigned-class filter, unassigned-class denial, and privacy shape), and Playwright Chromium smoke (1 test) all pass.

## Teacher Create Assignment Architecture

- Canonical route `/teacher/assignments/create` reuses the Assignment list module and the approved Assignments reference `design/ChatGPT Image Sep 30, 2026, 02_07_30 PM.png`; no separate create-specific domain was introduced. TeacherShell highlights Assignments on both list and create routes.
- `POST /api/v1/teacher/assignments` validates a strict payload containing only `classId`, trimmed title, optional description, subject name, optional ISO timestamp, and initial `DRAFT` or `PUBLISHED` status. Creator identity and school/class ownership are derived server-side.
- Creation requires an active Teacher role, verified active school membership, `teacher_assignments:create`, and an active `TeacherClassAssignment` for the exact target class. Subject names are matched against official attendance-session subject context for that class; unassigned classes and invented subjects are denied.
- The canonical Assignment is created atomically with authenticated creator provenance and is immediately returned by the existing authorized list API. No title uniqueness rule, StudentTask fan-out, Submission, Assessment, Mark, Feedback, grading, or hidden synchronization was added.
- The frontend form exposes only authorized class/official subject options, supports draft/publish-now choice, validation, duplicate-submit protection, backend-confirmed success navigation, list invalidation, and rejected/network/empty/restricted states. It never shows fake submission or grading controls.
- Forward-only migration `20261002120000_teacher_assignment_create_permission` adds only `teacher_assignments:create` and its Teacher grant. No Assignment schema change was required; the database is current at 32 migrations.
- Seed data was unchanged; both consecutive idempotent seeds passed.
- Validation: 109 frontend tests across 34 files and 149 backend tests across 32 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 32 migrations current, two sequential idempotent seed runs, frontend/backend production builds, Prettier, authenticated compiled creation/list/isolation smoke, adjacent-domain StudentTask no-write verification, and Playwright Chromium smoke (1 test) all pass. Earlier suite timeouts disappeared when suites ran sequentially and were execution contention, not product regressions.

## Teacher Marks Architecture

- Canonical route `/teacher/marks` follows `design/ChatGPT Image Sep 30, 2026, 02_07_34 PM.png` with assigned assessment cards, factual entry progress, exact-class filtering/search, an authorized roster, and backend-confirmed mark entry. Unsupported assessment creation, review/publishing, reports, rankings, and decorative aggregate panels from the reference were omitted rather than fabricated.
- Minimal shared `Assessment` and versioned `Mark` models were introduced because no canonical assessment/mark domain existed. Assessments carry explicit class, creator, title, subject, maximum-mark, and assessment-date context. A Mark belongs to one Assessment and Student, records authenticated Teacher provenance, and links revisions while retaining superseded versions. `Assignment` and `StudentTask` remain separate and unchanged; no Submission, Feedback, report-card, GPA, or ranking domain was added.
- APIs are `GET /api/v1/teacher/marks`, `GET /api/v1/teacher/marks/:assessmentId`, and `PATCH /api/v1/teacher/marks/:assessmentId`. Listing/search occurs only inside active Teacher assignments; detail and writes re-authorize the exact assessment class and active Student membership. Separate `teacher_marks:read` and `teacher_marks:update` permissions are required.
- Missing marks are returned as `null` / `NOT RECORDED`, never zero. Explicit numeric zero remains a valid recorded mark. Only submitted Students are affected, and integer values outside `0..maximumMarks` are rejected without clamping or inference.
- Mark correction uses a serializable transaction and expected-current-Mark ID. The previous active version is superseded, a new current version is linked to it, and a partial unique database index guarantees one current Mark per Assessment/Student. Stale clients receive a conflict and cannot silently overwrite authoritative state.
- DTOs expose only the assessment/class context and canonical Student ID/display name needed for the authorized marks roster. They exclude Student AI, Community, notes/doubts, private Profile, settings/security, credentials/tokens, documents, opportunities/applications, Parent/family data, unrelated classes/marks, authorization internals, rankings, profiling, and predictions.
- Forward-only migration `20261002130000_teacher_marks` creates the canonical tables, integrity indexes/constraints, and explicit permissions without modifying prior migrations or existing academic records. The database is current at 33 migrations. The idempotent seed adds two assessments in Neha Kapoor's assigned class, one same-school unassigned-class isolation fixture, one explicit Mark, and one deliberately NOT RECORDED assessment; it adds no submissions, assignments, StudentTasks, feedback, or rankings.
- Validation: 114 frontend tests across 35 files and 158 backend tests across 33 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 33 migrations current, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated compiled Marks read/write/history/conflict/isolation smoke, adjacent-domain no-write verification, and Playwright Chromium smoke (1 test) all pass. Temporary smoke Mark versions were removed afterward to restore the NOT RECORDED fixture.

## Teacher Class Summary Architecture

- Canonical route `/teacher/class-summary` follows `design/ChatGPT Image Sep 30, 2026, 02_07_36 PM.png`. The approved reference was audited element by element: active Student count, official attendance facts, canonical Assignment totals/list, normalized current-Mark evidence, recent Assessments, and the next official session are supported or safely derived. Unsupported submission counts, discussion activity, key insights, summary notes, suggested-focus judgments, learning-environment claims, overdue-Student claims, rankings, and profiling were omitted rather than fabricated.
- `GET /api/v1/teacher/class-summary?classId=<uuid>` is a single purpose-specific derived read endpoint. It validates the exact class ID and requires the authenticated active Teacher role, verified active school membership, explicit `teacher_class_summary:read`, and active `TeacherClassAssignment` for that class. Same-school unassigned and unrelated classes receive the same non-revealing denial; no school-wide fallback exists.
- The read model reuses canonical `SchoolClass`, active `ClassStudentMembership`, current `AttendanceRecord`, completed `AttendanceSession`, `Assignment`, `Assessment`, current `Mark`, and scheduled session data. No ClassSummary, StudentSummary, cached metric, persisted percentage, ranking, or duplicated academic table was added, and viewing the page performs no canonical writes.
- Attendance aggregates use only completed sessions and current explicit records. NOT RECORDED remains a separate missing count, is excluded from the known-record denominator, and is never inferred as ABSENT. Superseded attendance versions are excluded by the repository projection.
- Assignment totals use only canonical Assignment lifecycle state; `StudentTask` is never counted or relabelled, and completion/submission metrics remain unavailable because no Submission domain exists. Assessment averages use only current explicit Marks, preserve recorded zero, exclude missing Marks, exclude superseded versions, and normalize each value by its Assessment maximum before cross-assessment aggregation.
- The minimized DTO contains Teacher/school/class context, counts and factual aggregate evidence only. It exposes no Student roster identities, AI, Community, notes/doubts, Profile, settings/security, credentials/tokens, documents, opportunities/applications, Parent/family data, permissions, rankings, profiling, or predictions.
- TeacherShell enables and highlights Class Summary. The frontend obtains selector options only from the existing assigned-classes endpoint, performs a fresh exact-class query on selection, and supports loading, populated, sparse/unavailable, no-assigned-class, authorization, and network-error states without doing business calculations in React.
- Forward-only migration `20261002140000_teacher_class_summary_permission` adds only `teacher_class_summary:read` and its Teacher grant. No domain schema or seed data changed; the database is current at 34 migrations, and two sequential seed runs remain idempotent.
- Validation: 118 frontend tests across 36 files and 165 backend tests across 34 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, all 34 migrations current, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated assigned/unassigned Class Summary smoke, missing-attendance/missing-Mark smoke, superseded-Mark exclusion smoke, and Playwright Chromium smoke (1 test) all pass.

## Teacher Development Architecture

- Canonical route `/teacher/development` uses the approved reference `design/ChatGPT Image Sep 30, 2026, 02_07_38 PM.png` as a safety-audited basis. The reference's development scores, profiling labels, observations, recommendations, follow-ups, opportunity suggestions, participation claims, and editable narrative were unsupported by the current canonical model/policy and are deliberately omitted.
- `GET /api/v1/teacher/development?classId=&studentId=` is one purpose-specific, read-only endpoint. It requires an active Teacher role, verified active `SchoolMembership`, explicit `teacher_development:read`, and an active `TeacherClassAssignment`; supplied class and Student filters are independently authorized and no school-wide fallback exists.
- The response is derived at request time from active class memberships, completed `AttendanceSession`/current `AttendanceRecord`, canonical `Assessment`/current `Mark`, and canonical class `Assignment` facts. It returns factual dated evidence, normalized current recorded marks, explicit attendance states, missing counts, and class-context assignment items. `StudentTask` is never treated as an Assignment, and no Submission/completion claims are generated.
- Missing evidence remains explicit: missing Marks are `NOT RECORDED`/null and excluded from averages, explicit zero remains factual, missing Attendance is `NOT RECORDED` and never ABSENT, and sparse periods return unavailable/empty factual states. Superseded Mark and Attendance versions are excluded.
- Student Activity/Achievement evidence is withheld because the audited canonical activity records lack an explicit Teacher-sharing policy. The module does not query Student AI, Community, private notes/doubts, Profile, Parent/family, documents, opportunities, sessions, credentials, or authorization internals. It performs no AI/LLM calls and persists no development scores, trends, rankings, predictions, or profiling.
- TeacherShell enables Development and the page provides only authorized class/Student selectors, factual evidence cards, explicit unavailable states, loading, empty, restricted, and error handling. No mutations or development-observation workflow were added.
- Permission-only migration `20261002150000_teacher_development_permission` is applied; no domain table or seed fixture was added. The database is current at 35 migrations. Two consecutive development seed runs passed and remain idempotent.
- Validation: 123 frontend tests across 37 files and 172 backend tests across 35 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated Development scope/semantic/privacy smoke, and Playwright Chromium smoke (1 test) all pass. The frontend emits the existing non-blocking large-chunk warning; the supervised Windows preview workaround was used for Playwright.

## Teacher Opportunities Architecture

- Canonical route `/teacher/opportunities` follows the discovery hierarchy of `design/ChatGPT Image Sep 30, 2026, 02_07_43 PM.png`. The approved reference was audited against the existing domain: canonical cards, provider/location/deadline facts, text search, category, and open/closed availability are supported. Match percentages, recommended Students, Student counts, saves, applications, quick recommendations, AI exploration, and Student-specific eligibility claims are unsupported/private and deliberately omitted.
- Read-only `GET /api/v1/teacher/opportunities?search=&category=&availability=` strictly validates its query and returns a minimized projection of the existing shared `Opportunity` catalog. Availability is derived from canonical `isOpen` and deadline state; search covers canonical title, detail, description, and source fields, while category is exact-match when catalog records provide one.
- Access requires the authenticated active Teacher role, verified active `SchoolMembership`, and explicit `teacher_opportunities:read`. The current canonical catalog is generally discoverable rather than class-owned, so no class or Student context is accepted or invented; school membership establishes Teacher eligibility but does not scope or duplicate Opportunity records.
- The DTO contains only Teacher/school context, neutral general-discovery explanation, category options, and canonical Opportunity ID/title/detail/description/category/provider/location/deadline/availability. It never selects or returns `SavedOpportunity`, `OpportunityApplication`, Parent approval, Student identity/Profile/documents/history, AI recommendations, fit/match scores, rankings, or predicted acceptance.
- TeacherShell enables and highlights Opportunities. The frontend provides factual cards, in-page details, search/category/availability filters, loading, empty/no-results, restricted, and network-error states. It has no apply, save, recommend, create, edit, delete, Student-selection, or AI affordance and makes no eligibility verdict beyond showing published criteria.
- Permission-only migration `20261002160000_teacher_opportunities_permission` adds `teacher_opportunities:read` and its Teacher grant. No Opportunity schema, role-specific table, or seed data changed; the existing canonical fixtures are reused. The database is current at 36 migrations, and two sequential seed runs remain idempotent.
- Validation: 127 frontend tests across 38 files and 178 backend tests across 36 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated catalog/visibility/privacy/no-recommendation smoke, and Playwright Chromium smoke (1 test) all pass. One initial frontend run encountered the established unrelated 5-second execution-contention timeouts; the unchanged suite passed completely when rerun alone.

## Teacher Messages Architecture

- Canonical route `/teacher/messages` follows the inbox/list portion of `design/ChatGPT Image Sep 30, 2026, 02_07_45 PM.png`. The reference's participant/context, latest-message preview/time, authorized search, and deterministic activity ordering are supported. Thread content and compose/send are implemented in the separate `/teacher/messages/:id` milestone; unread badges, files/tasks/context panels, and read-state mutations remain unsupported.
- Read-only `GET /api/v1/teacher/messages?search=` strictly validates its query and returns a minimized projection of canonical `CommunityConversation`, `CommunityConversationMember`, and `CommunityMessage` data. No Teacher-specific conversation, message, inbox, or preview table was added.
- Access requires the authenticated active Teacher role, verified active `SchoolMembership`, and explicit `teacher_messages:read`. The repository first requires canonical conversation membership, then revalidates direct Parent/Student counterparties through the Teacher's active exact-class assignment, active Student class membership, and current verified Parent relationship. Groups require both canonical conversation membership and group membership. There is no school-wide fallback.
- The existing deterministic Parent↔Teacher conversation appears once with its canonical ID and latest canonical message. Student-to-Student conversations, same-school non-member conversations, unrelated-school data, inactive counterparties, invalid relationship contexts, and non-member groups remain excluded. Search runs server-side only after this authorized population is established.
- The DTO contains only Teacher/school context plus conversation ID/kind/title, minimum participant display role, factual relationship/class context, latest canonical message preview, and latest activity timestamp. It exposes no raw User/Message models, credentials, contacts, sessions/tokens, Student AI/Profile/private notes, Parent private records, documents, opportunity applications, or authorization internals. Detail DTOs similarly expose only minimized participant and canonical message fields.
- Canonical messaging has no read-state field, so unread counts/badges are omitted rather than inferred. The inbox and detail routes perform no AI/LLM summarization, sentiment/urgency/risk classification, conversation creation/deletion/archive, block, or mark-read mutation. Detail sending is limited to an existing authorized conversation and never discovers recipients or creates memberships.
- Permission-only migration `20261002170000_teacher_messages_permission` adds `teacher_messages:read` and its Teacher grant. No messaging schema or seed data changed; the existing deterministic fixture is reused. The database is current at 37 migrations, and two sequential seed runs remain idempotent.
- Validation: 131 frontend tests across 39 files and 184 backend tests across 37 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated canonical inbox/membership/search/privacy/no-mutation smoke, and Playwright Chromium smoke (1 test) all pass. Four unrelated backend tests initially reached their existing five-second limit under Vitest file parallelism; the complete unchanged suite passed with one worker. Prisma generation required stopping only a stale Helixed backend listener holding the Windows query-engine DLL, and Playwright used the documented explicitly supervised preview build.

## Teacher Message Detail Architecture

- Canonical route `/teacher/messages/:id` follows the thread portion of `design/ChatGPT Image Sep 30, 2026, 02_07_48 PM.png`. The supported detail UI contains conversation identity/context, minimum participant identity, ordered text history, timestamps, own-vs-other sender presentation, back navigation, and a text composer for an existing authorized conversation. Unsupported attachment/file, task/context-panel, read-receipt, presence, typing, global compose, and AI features are omitted.
- `GET /api/v1/teacher/messages/:conversationId` reuses the canonical Teacher inbox authorization projection on every request, then returns a purpose-specific thread DTO with only minimized participant/message fields. `POST /api/v1/teacher/messages/:conversationId/messages` independently requires `teacher_messages:create`, revalidates the same conversation membership and current relationship/context policy, and persists one canonical `CommunityMessage` with sender identity derived from the authenticated Teacher.
- Parent↔Teacher visibility uses canonical membership plus the current verified ParentStudentRelationship and the Teacher's active assigned-class context. Teacher↔Student and group visibility remains membership/policy scoped; no conversation is manufactured from class membership and no same-school/non-member or Student-private conversation is exposed.
- The frontend preserves canonical conversation IDs from the inbox, keeps Messages active in TeacherShell, renders loading/empty/restricted/error states, prevents duplicate submits with a synchronous in-flight guard, clears the composer only after backend confirmation, and refetches authoritative thread/list state after send. Failed sends preserve the draft and do not claim success.
- No messaging schema change was required. Forward-only migration `20261002180000_teacher_message_create_permission` adds only `teacher_messages:create`; the existing `20261002170000_teacher_messages_permission` provides read access. The database is current at 38 migrations, and the existing deterministic seed conversation/messages remain idempotent with no new fixture.
- Validation: 136 frontend tests across 40 files and 189 backend tests across 37 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two sequential idempotent seed runs, frontend/backend production builds, Prettier, authenticated ordered thread read/send smoke, relationship-revocation and non-member isolation, sender-spoof/strict-validation checks, canonical-message cleanup verification, privacy/no-AI/no-unsupported-feature review, and Playwright Chromium smoke (1 test) all pass. The first managed Windows Playwright attempt hung in preview supervision; the unchanged suite passed 1/1 with the documented explicitly supervised preview workaround.

## Teacher Settings Architecture

- Canonical route `/teacher/settings` and `GET /api/v1/teacher/settings` are implemented as the authenticated Teacher's own account/security surface. No dedicated Teacher Settings mockup exists in the supplied Teacher sequence, so the frontend combines the approved Teacher shell from `design/ChatGPT Image Sep 30, 2026, 02_07_12 PM.png` with the established canonical Parent account/session settings structure.
- Access requires the authenticated active school-scoped Teacher role, verified active `SchoolMembership`, and explicit `teacher_settings:read`. Identity comes only from the authenticated principal; strict query validation rejects client-supplied `userId`, `teacherId`, or other ownership selectors.
- The role-specific service is only an authorization adapter. It delegates account/session projection to the shared `AccountSettingsService` and canonical `User`/`Session` data. The minimized DTO contains account ID, login identifier, display name, account state, and active session metadata (`id`, creation/last-seen/expiry timestamps, and current-session flag). It contains no credentials, password data, refresh/access tokens or hashes, permission/role internals, memberships, or another user's sessions.
- Logout-all continues to use only canonical `POST /api/v1/auth/logout-all` and `AuthService.logoutAll`; there is no Teacher-specific logout or revocation mechanism. The frontend waits for backend confirmation, prevents duplicate submission, and relies on the shared auth context to clear local identity and protected data.
- Unsupported password/email changes, MFA, recovery, account deletion, display-name editing, preferences, notifications, theme persistence, and Student/Parent account administration are deliberately omitted. No Teacher settings/account/session table, AI call, or domain seed fixture was added.
- Forward-only migration `20261002190000_teacher_settings_permission` adds only `teacher_settings:read` and its Teacher grant. The database is current at 39 migrations, and two sequential seed runs remain idempotent.
- Validation: 140 frontend tests across 41 files and 194 backend tests across 38 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deploy/status, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated own-account/session/privacy/cross-user/logout-all smoke, and Playwright Chromium smoke (1 test) all pass. Prisma generation required stopping a stale Helixed API process that held the generated Windows query-engine DLL; Playwright passed against the documented explicitly supervised current preview after a stale preview was removed. No production security behavior or test assertion was weakened.

## Academy Dashboard Architecture

- Canonical route `/academy` follows the Academy Dashboard reference `design/ChatGPT Image Sep 30, 2026, 02_07_52 PM.png`. The UI audit found canonical support for Academy identity, active enrollment count, batch count, distinct active assigned-coach count, and factual per-batch Student/coach counts. The reference's certificates, messages, opportunities, activity feed, events, pending actions, development highlights, trends, and score-like analytics lack Academy-owned canonical support and are deliberately omitted.
- `GET /api/v1/academy` accepts no Academy selector. It derives one active Academy Owner or Academy Administrator role assignment from the authenticated identity, requires a verified active `AcademyMembership` and explicit `academy_dashboard:read`, checks the exact verified Academy resource, and returns a purpose-specific DTO. Academy Coach, Teacher, School Admin, inactive membership, missing permission, and mismatched Academy scope default to a non-revealing denial; permissions and memberships from separate roles are never merged.
- The dashboard is a request-time read projection over canonical `Academy`, `AcademyMembership`, `AcademyStudentEnrollment`, `AcademyBatch`, `BatchStudentMembership`, and `BatchCoachAssignment` data. Enrollment counts are deduplicated by canonical Student identity; coach counts are deduplicated across active batch assignments and require an active Academy membership. `AcademyBatch` has no current lifecycle field, so the dashboard reports the factual batch total rather than inventing an active/ongoing status.
- The minimized DTO exposes only Academy ID/name, three factual counts, and batch ID/name with aggregate Student/coach counts. It exposes no Student or Coach identities, School marks/attendance, Student AI/messages/profile, Parent data, opportunity applications, credentials/tokens/sessions, memberships, permissions, rankings, scores, predictions, profiling, or AI output. No LLM/provider is invoked and no dashboard/metrics table is persisted.
- The Academy shell enables Dashboard only. Future Students, Batches, Coaches, Certificates, Messages, Opportunities, Documents, and Settings entries are visibly unavailable and no destination module was implemented. Loading, populated, factual zero/empty, restricted, and network-error states are covered without placeholder business data.
- Forward-only migration `20261003200000_academy_dashboard_permission` adds only `academy_dashboard:read`, granted to Academy Owner and Academy Administrator. The database is current at 40 migrations; no Academy domain schema changed.
- The idempotent development seed adds the fictional `academy-demo` / Maya Rao Academy Administrator, one verified Academy, one active Aarav enrollment, one Robotics Foundations batch, one active batch membership, and one active Neha coach assignment. It reuses canonical users and relationships, adds no copied Student records, and passes two consecutive seed runs.
- Validation: 144 frontend tests across 42 files and 199 backend tests across 39 files pass. TypeScript, ESLint, Prisma validation, Prisma Client generation 6.19.3, migration deployment/status, two idempotent seed runs, frontend/backend production builds, Prettier, authenticated exact-Academy dashboard/count smoke, Teacher-role denial, forged Academy-selector rejection, minimized DTO privacy/no-AI checks, and Playwright Chromium smoke (1 test) all pass. The first managed Playwright process remained alive after its passing assertion; the unchanged suite passed 1/1 with the documented explicitly supervised preview workaround. The existing non-blocking frontend chunk warning is now approximately 593 kB.

## Known Local Tooling Limitation

- On this Windows/Node 24 Codex host, `tsx watch` can fail before application code with `uv_os_get_passwd ENOMEM`; the development seed avoids the same external `tsx` temporary-directory path by compiling then executing JavaScript. Production builds, compiled-server startup, and all validation commands remain unaffected. The sandboxed Vite development server also cannot traverse dependency directories, although the production Vite build and Playwright preview server pass. No production code workaround was added for either host/tooling limitation.

Approved AI references used:

- `design/ChatGPT Image Sep 30, 2026, 02_03_20 PM.png` through `02_04_07 PM.png` — Student AI assistant and the twelve contextual guidance views.

## Authorization Architecture

Authorization follows the master-specification chain:

`Identity → Selected role assignment → Verified membership/relationship → Canonical resource scope → Explicit action permission → Policy → Decision`

- Callers ask `AuthorizationService.can(principal, { action, resource, context })`.
- `context.roleAssignmentId` is mandatory. Missing or inactive context denies access.
- A permission key is derived as `<resource-type>:<action>` and must be explicitly attached to the selected role.
- One role assignment must satisfy the entire decision. Permissions and scope from unrelated roles are not merged.
- School and academy organization IDs are loaded from the role assignment and checked against canonical membership/resource records rather than trusted client claims.
- Parent access requires a verified, non-revoked relationship to the requested student.
- Teacher access to a class or student requires active school membership plus an active class assignment; student access also requires active membership in that assigned class.
- Academy coach access requires active academy membership plus an active batch assignment; student access requires an active enrollment and batch membership.
- School and academy administrators require both an explicit permission and matching verified organization scope.
- Platform-family administrators receive no universal bypass. Their current generic policy applies only to explicit permissions on platform resources.
- Unsupported resource types, missing facts, expired/revoked records, and ambiguous context default to deny.
- No implicit policy grants access to private AI conversations, journals, messages, or sensitive data.
- Route middleware converts unauthenticated decisions to `401` and denied authorization decisions to a non-revealing `403`.

The frontend helpers can hide or show UX using one selected assignment, but they never grant backend access.

## Database Changes

Applied migrations:

- `20260930170000_authentication_foundation`
- `20260930180000_authorization_foundation`
- `20260930190000_student_dashboard`
- `20260930200000_student_academics`
- `20260930210000_student_activities`
- `20260930220000_student_calendar`
- `20261001110000_student_ai`

Authorization entities:

- `roles`, seeded with all 14 canonical Helixed roles
- `permissions`
- `role_permissions`
- `user_role_assignments`, with platform/school/academy scope and a database scope-consistency constraint
- `schools`, `school_memberships`, `school_classes`
- `academies`, `academy_memberships`, `academy_batches`
- `parent_student_relationships`
- `teacher_class_assignments`, `class_student_memberships`
- `academy_student_enrollments`
- `batch_student_memberships`, `batch_coach_assignments`

Memberships and assignments include active, expiry, verification, and revocation data where applicable. Product permissions are seeded only for implemented Student Dashboard, Student Academics, Student Activities, and Student Calendar actions; every other product action remains default-deny.

## Student Calendar Architecture

- Routes: `/student/calendar`, `/student/calendar/day`, `/student/calendar/week`, `/student/calendar/month`, and `/student/calendar/event/:id`.
- Calendar is an authorized, read-only projection of canonical `StudentScheduleItem`, `StudentTask` deadlines, `StudentExam`, and dated `StudentActivity` data; it does not add a second calendar-event table or duplicate seed data.
- `GET /api/v1/student/calendar?from=&to=` validates bounded ISO date ranges and aggregates the authenticated student's records. `GET /api/v1/student/calendar/event/:id` resolves a namespaced canonical event identifier and confirms the event belongs to the authenticated student.
- The Student role has an explicit `student_calendar:read` permission. Missing context, cross-student event IDs, and invalid date ranges deny or fail safely.
- Calendar UI reuses `StudentShell` and `DashboardCard`, with responsive day/week/month grids, event links, view switching, loading, error, and empty states.

## Student Community Architecture

- The complete specified route set is implemented: `/student/community`, `/student/community/inbox`, `/student/community/sent`, `/student/community/groups`, `/student/community/groups/:id`, `/student/community/direct`, and `/student/community/direct/:id`.
- Canonical Community data is limited to `CommunityGroup`, `CommunityGroupMembership`, `CommunityConversation`, `CommunityConversationMember`, and `CommunityMessage`. There is no duplicate user or student identity model.
- Community privacy is backend-authoritative: group content requires membership; direct conversations and messages require conversation membership; only `STUDENT_DISCOVERABLE` groups can be joined. Membership-only groups are neither discoverable to unrelated students nor readable through manipulated IDs.
- The authenticated principal is the only identity source. The API exposes `GET /inbox`, `/sent`, `/groups`, `/groups/:id`, `/direct`, `/direct/:id`, plus Zod-validated `POST /groups/:id/join` and `/conversations/:id/messages` under `/api/v1/student/community`.
- `student_community:read` and `student_community:create` are explicit Student permissions. The authorization policy allows only the authenticated student's Community resource; all missing context and foreign resource requests deny by default.
- The UI reuses `StudentShell` and `DashboardCard`, with the approved inbox/direct-message layout, group cards, message composer, responsive grids, and loading, error, empty, and protected-route states.

Approved Community references used:

- `design/ChatGPT Image Sep 30, 2026, 02_01_53 PM.png`, `02_01_57 PM.png`, and `02_02_04 PM.png` — Inbox and conversation layouts
- `design/ChatGPT Image Sep 30, 2026, 02_02_20 PM.png` — Sent messages
- `design/ChatGPT Image Sep 30, 2026, 02_02_23 PM.png` and `02_02_27 PM.png` — Groups and group conversation
- `design/ChatGPT Image Sep 30, 2026, 02_02_29 PM.png` and `02_02_32 PM.png` — Direct conversations and detail

## Student Growth Architecture

- The complete specified route set is implemented: `/student/growth`, `/student/growth/overview`, `/student/growth/academics`, `/student/growth/activities`, `/student/growth/patterns`, and `/student/growth/achievements`.
- Growth is a private, read-only evidence layer. It aggregates the authenticated student's canonical subject progress, task completion, activities, milestones, certificates, and their own Community membership count. It does not create a universal score, rankings, or duplicate academic/activity data.
- `GET /api/v1/student/growth` and its five named view endpoints return a scoped aggregation. The Student role requires the explicit `student_growth:read` permission and the existing authorization policy permits only the authenticated student's Growth resource.
- No Growth-owned data model, application schema migration, or seed data was required. The permission-only migration `20261001090000_student_growth_permission` adds the explicit authorization grant without altering tables.
- The frontend reuses `StudentShell`, `DashboardCard`, auth state, query states, established spacing, cards, progress bars, and navigation. It provides responsive overview, academics, activities, patterns, and achievements screens with loading, error, empty, and protected states.

Approved Growth references used:

- `design/ChatGPT Image Sep 30, 2026, 02_02_39 PM.png` and `02_02_42 PM.png` — overview
- `design/ChatGPT Image Sep 30, 2026, 02_02_44 PM.png` — academics
- `design/ChatGPT Image Sep 30, 2026, 02_02_47 PM.png` — activities
- `design/ChatGPT Image Sep 30, 2026, 02_02_50 PM.png` — patterns
- `design/ChatGPT Image Sep 30, 2026, 02_02_54 PM.png` — achievements

## Student Opportunities Architecture

- Routes: `/student/opportunities`, `/:id`, `/applied`, `/saved`, and `/recommended`.
- The dashboard and module now share canonical `Opportunity` records. The former per-student dashboard placeholder table was safely converted to the shared `opportunities` catalog.
- Student-specific state lives in `SavedOpportunity` and `OpportunityApplication`; a student can only see or mutate their own saved/application state.
- APIs under `/api/v1/student/opportunities` provide discovery/search, details, saved/applied/recommended lists, save/unsave, and application creation. Applications reject invalid IDs, closed/deadline-expired opportunities, and duplicates; students cannot set authoritative outcome states.
- The Student role uses explicit `student_opportunities:read` and `student_opportunities:create` permissions. Identity comes exclusively from the authenticated principal.
- Seed data includes a shared catalog plus demo saved and application records. The migration `20261001100000_student_opportunities` applied without reset; it converts the existing dashboard opportunity storage and adds the student-specific relation tables.

Approved Opportunities references used:

- `design/ChatGPT Image Sep 30, 2026, 02_02_56 PM.png` — discovery
- `design/ChatGPT Image Sep 30, 2026, 02_02_58 PM.png` — detail
- `design/ChatGPT Image Sep 30, 2026, 02_03_07 PM.png` — applied
- `design/ChatGPT Image Sep 30, 2026, 02_03_14 PM.png` — saved
- `design/ChatGPT Image Sep 30, 2026, 02_03_17 PM.png` — recommended

## Student Activities Architecture

- The module implements the complete specified route set: `/student/activities`, `/student/activities/add`, `/student/activities/:id`, `/student/activities/:id/progress`, and `/student/activities/certificates`.
- All APIs derive identity from the authenticated principal and require explicit `student_activities:read` or `student_activities:create` authorization. Resource lookups filter on both the activity ID and authenticated student ID.
- `StudentActivity` remains the canonical dashboard/activity entity and now carries activity profile fields. Related canonical data is stored in `StudentActivityProgressEntry`, `StudentActivityMilestone`, and `StudentActivityCertificate`.
- The sole mutation is the permitted student activity creation flow, validated with Zod. It does not infer or implement teacher, academy, certificate-verification, evidence-upload, or opportunity workflows.
- The frontend reuses `StudentShell`, `DashboardCard`, common loading/error states, and established typography. It implements activity overview, creation form and preview, detail, progress, and certificates views.

Approved Activity references used:

- `design/ChatGPT Image Sep 30, 2026, 02_01_01 PM.png` — overview
- `design/ChatGPT Image Sep 30, 2026, 02_01_04 PM.png` — add activity
- `design/ChatGPT Image Sep 30, 2026, 02_01_07 PM.png` — activity detail
- `design/ChatGPT Image Sep 30, 2026, 02_01_11 PM.png` — progress
- `design/ChatGPT Image Sep 30, 2026, 02_01_33 PM.png` — certificates

## Student Academics Architecture

- The Student Academics API derives the student identifier from the verified access-token session, never from a URL, query parameter, or request body.
- Each Academics request resolves an active Student role assignment and asks the central `AuthorizationService` for an explicit `student_academics:read` or `student_academics:create` decision. The Student policy permits only the principal’s own academic resource.
- Detail queries include the authenticated `studentId` in their database predicate, so changing a task ID cannot reveal another student’s task. Submitted doubt `subjectId` values are also verified as owned by that student.
- Canonical dashboard entities were extended rather than duplicated: tasks and exams can relate to `StudentSubject`; new canonical models are `StudentNote`, `StudentResource`, `StudentSyllabusItem`, and `StudentDoubt`.
- The module exposes `GET /api/v1/student/academics`, `/schedule`, `/tasks`, `/tasks/:taskId`, `/class-summary`, `/notes`, `/exams`, `/syllabus`, `/resources`, and `/doubts`; `POST /doubts` is the only student mutation in this milestone and is Zod-validated.
- The frontend reuses the extracted `StudentShell` and `DashboardCard` from the Student Dashboard. Academics pages retain the approved hero, tab navigation, card/list/table hierarchy, responsive grids, loading, error, empty, and protected-route states.

Approved references used for this module:

- `design/ChatGPT Image Sep 30, 2026, 02_00_25 PM.png` — Academics overview
- `design/ChatGPT Image Sep 30, 2026, 02_00_28 PM.png` — Schedule
- `design/ChatGPT Image Sep 30, 2026, 02_00_32 PM.png` and `02_00_35 PM.png` — Tasks and task detail
- `design/ChatGPT Image Sep 30, 2026, 02_00_38 PM.png` — Class summary
- `design/ChatGPT Image Sep 30, 2026, 02_00_40 PM.png` — Notes
- `design/ChatGPT Image Sep 30, 2026, 02_00_45 PM.png` — Exams
- `design/ChatGPT Image Sep 30, 2026, 02_00_49 PM.png` — Syllabus
- `design/ChatGPT Image Sep 30, 2026, 02_00_53 PM.png` — Resources
- `design/ChatGPT Image Sep 30, 2026, 02_00_57 PM.png` — Doubts

## Authentication Endpoints

All endpoints are under `/api/v1/auth`.

- `POST /login`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `GET /me`

There is no public registration endpoint and no authorization-management endpoint. Future resource routes will call the authorization service internally rather than exposing authorization as a client-controlled security decision.

## Running the Project

1. Configure `backend/.env` from its example without committing secrets.
2. Optionally configure `frontend/.env` from its example.
3. Start PostgreSQL.
4. From `backend/`, run `npx prisma migrate deploy` for a deployment or the approved development migration workflow.
5. Run `npm run prisma:generate --workspace backend`.
6. Run `npm run dev`.

Useful checks:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run format:check`
- `npm run prisma:validate --workspace backend`

## Tests and Checks Performed

- TypeScript for both workspaces — passed
- ESLint for both workspaces — passed with no warnings
- Frontend Vitest/React Testing Library — passed, 163 tests across 47 files
- Backend Vitest/Supertest — passed, 224 tests across 42 files
- Prisma schema validation — passed
- Prisma Client generation — passed with Prisma Client 6.19.3
- Parent Documents migration deployment — passed without reset or destructive data changes
- Parent Opportunities permission migration deployment — passed without reset or destructive data changes
- Parent Settings permission migration deployment — passed without reset or destructive data changes
- Teacher Dashboard permission migration deployment — passed without reset or destructive data changes
- Teacher Classes permission migration deployment — passed without reset or destructive data changes
- Teacher Students permission migration deployment — passed without reset or destructive data changes
- Teacher Attendance migration deployment — passed without reset or destructive data changes
- Teacher Assignments canonical-domain and permission migration deployment — passed without reset or destructive data changes
- Teacher Assignment create-permission migration deployment — passed without reset or destructive data changes
- Teacher Marks canonical-domain and permission migration deployment — passed without reset or destructive data changes
- Teacher Class Summary permission migration deployment — passed without reset or destructive data changes
- Teacher Development permission migration deployment — passed without reset or destructive data changes
- Teacher Opportunities permission migration deployment — passed without reset or destructive data changes
- Teacher Messages permission migration deployment — passed without reset or destructive data changes
- Teacher Message create-permission migration deployment — passed without reset or destructive data changes
- Teacher Settings permission migration deployment — passed without reset or destructive data changes
- Academy Students permission migration deployment — passed without reset or destructive data changes
- Academy Batches permission migration deployment — passed without reset or destructive data changes
- Academy Coaches permission migration deployment — passed without reset or destructive data changes
- Prisma migration status — database schema is up to date with 43 migrations
- Development seed — passed twice and remained idempotent; the intentionally missing attendance record and NOT RECORDED assessment remained missing
- Authenticated Teacher Attendance compiled-API smoke — passed for read scope, unassigned denial, missing-state semantics, official initial recording, versioned revision, audit provenance, omitted-Student safety, and stale-write conflict
- Authenticated Teacher Assignments compiled-API smoke — passed for Teacher login, authorized Assignment listing, assigned-class filtering, same-school unassigned-class denial, fixture isolation, and minimized DTO privacy
- Authenticated Teacher Create Assignment smoke — passed for Teacher login, assigned-class creation, generated canonical ID, creator/class provenance, official subject validation, list visibility, unassigned-class denial, invalid-subject denial, and unchanged StudentTask count; the temporary smoke fixture was removed afterward
- Authenticated Teacher Marks smoke — passed for Teacher login, authorized list/detail, same-school unassigned-assessment denial, NOT RECORDED handling, explicit zero semantics, initial recording, authenticated recorder provenance, version-linked correction, exactly one current version, stale-write conflict, and unchanged Assignment/StudentTask counts; temporary smoke Mark versions were removed afterward
- Authenticated Teacher Class Summary smoke — passed for Teacher login, exact assigned-class derivation, same-school unassigned-class denial, 6 known and 1 missing attendance record, 1 recorded and 1 missing Mark, normalized current-Mark average, and exclusion of a temporary superseded zero-Mark fixture; the temporary fixture was removed afterward
- Authenticated Teacher Messages inbox smoke — passed for Teacher login, canonical Parent↔Teacher conversation identity/latest-message projection, exact current relationship context, authorized-only search, Student-private/non-member exclusion, minimized DTO privacy, and absent unsupported mutation endpoints
- Authenticated Teacher Message Detail smoke — passed for canonical ordered thread read, current relationship revocation denial, non-member denial, strict sender-spoof rejection, authenticated Teacher provenance, exactly one temporary canonical message write, authoritative reread, and cleanup restoring the seeded conversation
- Authenticated Teacher Settings smoke — passed for Teacher login, owner-only account projection, one current session, sanitized active-session DTO, Parent cross-role denial, secret/private-data exclusion, canonical logout-all revocation of every Teacher session, and preservation of the Parent session; temporary smoke sessions were revoked afterward
- Authenticated Academy Students smoke — passed for Academy login, exact enrollment-scoped Aarav roster, canonical enrollment date and batch context, name search, authorized batch filtering, Teacher denial, absent POST mutation, foreign-Academy batch denial, forged Academy selector rejection, and foreign Student search isolation; the temporary isolation Academy was deleted afterward
- Authenticated Academy Student Detail smoke — passed for canonical list/detail Student identity, exact Academy enrollment date and active batch context, malformed-ID rejection, unenrolled Student and Teacher denial, absent detail mutations, and minimal DTO privacy. A temporary second Academy enrolled both Aarav and Mira: Aarav's original detail excluded the foreign batch and foreign-only Mira remained denied; the temporary Academy was deleted afterward.
- Authenticated Academy Batches smoke — passed for Academy login, canonical Robotics Foundations identity, distinct active Student/Coach counts, name search, Teacher and revoked-membership denial, forged Academy/status-filter rejection, absent POST mutation, and foreign Academy batch/count isolation; the temporary isolation Academy was deleted afterward.
- Authenticated Academy Batch Detail smoke — passed for Academy login, canonical Robotics Foundations identity, ordered minimized Aarav/Neha member identity, exact 1 Student/1 Coach count consistency with the list, malformed-ID rejection, non-revealing foreign/nonexistent denial, Teacher and revoked-membership denial, absent POST/PATCH/PUT/DELETE routes, and cross-Academy member/count isolation; the temporary isolation Academy was deleted afterward.
- Authenticated Academy Coaches smoke — passed for Academy login, canonical Neha Coach identity, Robotics Foundations context, display-name search/no-results, distinct multi-batch projection, foreign-Academy Coach/batch exclusion, Teacher/Coach-role denial, revoked-membership denial, independent permission denial, strict forged/status-filter rejection, absent Coach Detail/mutation routes, and minimized privacy boundaries; temporary records were deleted and membership/permission state was restored afterward.
- Frontend production build — passed
- Backend production build — passed
- Prettier check — passed
- Playwright Chromium smoke test — passed, 1 test. It verifies that `/student` remains protected by redirecting an unauthenticated visitor to the sign-in form, using an isolated preview port.

The authorization matrix covers unauthenticated denial, missing permissions, explicit permission success, student ID manipulation, linked and unrelated parent access, unassigned teacher access, school and academy tenant boundaries, non-universal administrators, explicit scoped administrative permission, and missing-context default denial. Student Academics coverage adds unauthenticated denial, ignored forged student query identifiers, cross-student task-ID denial, malformed task/doubt validation, valid student-owned doubt creation, and major frontend overview/detail/error rendering. Student Activities coverage adds unauthenticated denial, forged student query immunity, cross-student activity-ID denial, create-payload validation, permitted student activity creation, and overview/error rendering. Student Community coverage adds unauthenticated denial, authenticated group access, foreign group/conversation ID denial, malformed message rejection, and an authorized member-only message mutation. Student Growth coverage adds unauthenticated denial, authenticated private aggregation access, ignored forged student query identifiers, and canonical evidence rendering.

## Known Limitations and Warnings

- Student Growth was compared structurally against its approved references. An authenticated interactive browser comparison requires a local demo-account login and was not performed in this milestone.

- Roles and relationship tables have no management APIs yet. Controlled onboarding and administration must create these records in later milestones.
- Permissions are not seeded until their owning product actions are implemented and approved.
- The current resource-policy set intentionally supports only the authorization resources required by this milestone. New product resources must add an explicit policy; otherwise they remain denied.
- Membership and assignment changes are timestamped but do not yet emit the required authorization audit events.
- Verification records currently retain `verifiedAt` state only; evidence, reviewer, decision history, and policy-version workflows belong to onboarding/verification milestones.
- No policy has been added for exceptional private-data access. Private AI, journals, messages, safety, and moderation data remain outside this generic authorization path.
- Authentication rate limiting remains process-local and requires a shared store before horizontal scaling.
- npm still reports the previously reviewed five development-tooling vulnerabilities: two moderate findings in Vitest tooling and three high findings in Prisma CLI/config tooling. No forced or breaking upgrade was applied.
- ESLint 9.39.5 remains marked unsupported by its publisher and requires a coordinated lint-plugin upgrade.
- Playwright may emit harmless `NO_COLOR`/`FORCE_COLOR` warnings in this command environment.
- On this Windows host, Playwright's CI-supervised preview process can remain alive after the smoke assertion passes. The same unchanged smoke test passes and exits cleanly against an explicitly supervised local preview; no production or test assertion was weakened.
- The Windows Node 24.21.0 runtime's `node:os.userInfo()` currently fails with `uv_os_get_passwd ENOMEM`. `tsx` invokes that API before loading the seed, so the development-only seed runner now compiles with `tsc` and runs with Node instead. The seed logic, database constraints, existing data, and production behavior are unchanged.
- Student AI uses a deterministic, guidance-only development provider. A production provider, purpose-specific consent policy, safety review, and provider-side retention/data-processing agreement remain required before production activation.

## Next Recommended Milestone

Await explicit approval for the next Academy module or controlled identity-provisioning milestone. Academy Coach Detail, Notes, Certificates, Messages, Settings, Admin, Coach mutations, batch mutations and Student/Coach assignment mutations, Assignment Detail/mutations beyond create, Submissions, Documents, and other messaging extensions remain outside the completed route set.
