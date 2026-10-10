# HELIXED MASTER SPECIFICATION

**Product:** HELIXED  
**Tagline:** *Unfold the Unknown*  
**Status:** Master Product Specification / Single Source of Truth

This document defines the product behavior, information architecture, roles, permissions, canonical concepts, AI boundaries, privacy rules, safety rules, route responsibilities, and cross-feature consistency requirements that all Helixed implementations must follow.

## 1. Product Definition

Helixed is a student-development ecosystem connecting Students, Parents/Guardians, Schools, Teachers, Academies, Coaches, Opportunities, Helix AI, and Platform Administrators. The primary experience is centered on school-age students, approximately ages 5–18.

Helixed is not merely a school ERP, LMS, messaging application, AI chatbot, portfolio website, or opportunity board. It combines academic organization, extracurricular development, communication, evidence/portfolio management, opportunity discovery, and permission-aware AI assistance.

## 2. Core Product Invariants

- AI may assist, explain, recommend, summarize, draft, organize, and propose, but it does not acquire authority.
- Effective access follows: `Identity → Role → Organization Membership → Relationship → Resource Scope → Action Permission → Policy → Authorization Decision`.
- Official attendance ≠ AI attendance summary.
- Official mark ≠ AI academic interpretation.
- Assignment ≠ AI assignment draft.
- Calendar event ≠ AI schedule recommendation.
- Certificate ≠ AI certificate analysis.
- Opportunity application ≠ AI recommendation.
- Use least privilege, minimum necessary information, purpose-specific access, relationship-based access, explicit sharing, and auditable exceptional access.
- Do not create overall student scores, intelligence/potential/future-success scores, disciplinary-risk scores, popularity scores, parent-quality scores, teacher-effectiveness rankings, school rankings, or academy rankings.
- Sensitive AI insight should prefer `Observed → Evidence → Possible Interpretation → Suggested Next Step`.

## 3. Brand and Experience

Brand: **HELIXED**  
Tagline: **Unfold the Unknown**

Palette:
- Deep Navy `#10245C`
- Electric Blue `#135EC7`
- Cyan `#1DBFD1`
- Mint `#9BEA73`
- Orange `#FF6B08`
- Gold `#FFC82E`

The interface should feel modern, calm, trustworthy, intelligent, student-friendly without being childish, professional for institutions, spacious, accessible, and consistent. Avoid excessive visual noise, manipulative gamification, and social-media popularity mechanics.

All authenticated experiences require role-appropriate navigation, notifications, contextual search, account/profile access, help/support, organization context where relevant, responsive behavior, accessibility, and clear loading/empty/error/offline/restricted/partial states.


---

## 4. Roles and Identity

Core roles:
- Student
- Parent / Guardian
- Teacher
- School Administrator
- Academy Owner
- Academy Administrator
- Academy Coach
- Platform Administrator
- Security Administrator
- Safety Administrator
- Moderation Administrator
- AI Administrator
- Support Administrator
- Analytics Administrator

`ADMIN` never means unrestricted access to everything.

Registration/account model:
- Student: school-issued account.
- Parent: child-relationship verification plus phone/email verification as configured.
- Teacher: school invitation plus official identity/email verification as configured.
- Academy: organization verification.

Identity, relationship, verification, authorization, and account status are separate concepts.

## 5. Student Permissions

Students may view their academic information and authorized timetable; manage permitted personal tasks; add activities; upload certificates and creative work; join authorized communities; message authorized teachers/coaches; view teacher comments and AI recommendations; apply to opportunities where permitted; and share selected profile information through controlled external sharing.

Students cannot directly rewrite official school timetable, marks, attendance, teacher assignment, or class assignment. Teacher-created tasks cannot be deleted by students. Student-created tasks may be edited/deleted according to policy.

## 6. Parent Permissions

Parents may access authorized child marks, attendance, tasks, calendar, activities, teacher comments, opportunities, and parent-visible AI recommendations. They may contact authorized teachers/coaches, upload permitted documents, complete permitted profile information, and approve activities/opportunities where required.

Parents may not automatically access the child's private AI conversations, personal journal, protected student-to-student private messages, or unrelated children. A guardian relationship is not ownership of the child's entire digital life.

## 7. Teacher Permissions

Teachers access only assigned/authorized students and classes. They may create class summaries, assignments/homework, attendance, marks, development observations, opportunity recommendations, authorized student/parent messages, documents, and permitted activity information.

Teachers do not receive unrestricted global student search, private student AI conversations, private journals, or unrelated private messages.

## 8. Academy Permissions

Academies may create batches, manage academy-scoped students/coaches, add coach notes, issue/upload authorized certificates, communicate with authorized students/parents, view explicitly permitted academic information, and recommend opportunities.

Academies do not become another authority for official school attendance, marks, or timetable unless a future explicit integration grants a narrowly defined workflow.


---

## 9. Student Route Map

Main:
- `/student`

Academics:
- `/student/academics`
- `/student/academics/schedule`
- `/student/academics/tasks`
- `/student/academics/tasks/:id`
- `/student/academics/class-summary`
- `/student/academics/notes`
- `/student/academics/exams`
- `/student/academics/syllabus`
- `/student/academics/resources`
- `/student/academics/doubts`

Activities:
- `/student/activities`
- `/student/activities/add`
- `/student/activities/:id`
- `/student/activities/:id/progress`
- `/student/activities/certificates`

Calendar:
- `/student/calendar`
- `/student/calendar/day`
- `/student/calendar/week`
- `/student/calendar/month`
- `/student/calendar/event/:id`

Community:
- `/student/community`
- `/student/community/inbox`
- `/student/community/sent`
- `/student/community/groups`
- `/student/community/groups/:id`
- `/student/community/direct`
- `/student/community/direct/:id`

Other:
- `/student/announcements`

Growth:
- `/student/growth`
- `/student/growth/overview`
- `/student/growth/academics`
- `/student/growth/activities`
- `/student/growth/patterns`
- `/student/growth/achievements`

Opportunities:
- `/student/opportunities`
- `/student/opportunities/:id`
- `/student/opportunities/applied`
- `/student/opportunities/saved`
- `/student/opportunities/recommended`

Helix AI:
- `/student/ai`
- `/student/ai/doubt`
- `/student/ai/study-plan`
- `/student/ai/revision`
- `/student/ai/daily-plan`
- `/student/ai/workload`
- `/student/ai/opportunities`
- `/student/ai/career`
- `/student/ai/documents`
- `/student/ai/certificates`
- `/student/ai/achievements`
- `/student/ai/insights`

Focus/Profile/Documents/Settings:
- `/student/focus`
- `/student/profile`
- `/student/profile/academic`
- `/student/profile/activities`
- `/student/profile/achievements`
- `/student/profile/certificates`
- `/student/profile/creative-work`
- `/student/profile/share`
- `/student/documents`
- `/student/settings`


---

## 10. Student Core Features

### Dashboard
Action-oriented overview of today's schedule, upcoming tasks/deadlines/exams, activities, announcements, opportunities, achievements, AI suggestions, and quick actions. Quick Add: Add Task, permitted Add Class/external class, Add Event. AI suggestions remain proposals until confirmed.

### Tasks
Support `created_at`, `started_at`, `completed_at`, `estimated_duration`, `actual_duration`, priority, subject, task type, creator/source, and status. AI-assisted priority is allowed but should not silently alter official deadlines.

### Calendar and Timetable
Calendar may include school classes, exams, homework deadlines, activities, academy sessions, meetings, opportunities, personal events, study sessions, and reminders. Students may create personal events, study sessions, external classes, appointments, and reminders.

Official school timetable and personal calendar are distinct. Students may suggest/report corrections and add personal blocks, but cannot directly change official class/teacher/timetable.

### Academics
May include subjects, chapters, syllabus, marks, exams, assignments, homework, attendance, teacher feedback, notes, resources, learning outcomes, evidence-backed strengths/weaknesses, and AI doubt solving. Missing data is not negative performance.

### Attendance
Canonical concepts: AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest, AttendanceAudit. `Missing ≠ Absent`; `Absent ≠ Zero`. Historical corrections preserve history. AI may summarize but cannot determine/change official attendance.

### Assignments
Keep Assignment, Task, Submission, Assessment, Mark, and Feedback distinct. Lifecycle may include Draft, Scheduled, Published, Open, Closed, Archived, Cancelled. Publishing is explicit. AI may draft but not silently publish.

### Marks
Keep Assessment, Mark, Feedback distinct. States may include Pending, Entered, Absent, Exempt, Finalized, Published, Corrected. Missing ≠ zero. Corrections preserve history. AI cannot assign final marks or publish results.

### Activities
Categories: Sports, Music, Dance, Coding, Robotics, Art, Debate, Public Speaking, Volunteering, Entrepreneurship, Other. Support participation, evidence, milestones, authorized coach/teacher updates, progress, certificates, achievements.

### Growth
Dimensions: Academic Development, Consistency, Time Management, Learning Progress, Physical Activity, Creative Development, Communication, Collaboration, Leadership, Participation, Self-directed Learning. Present evidence/patterns/milestones rather than rankings or one universal score.

### Focus
Simple Pomodoro-style study support with distraction-reducing mode, optional task association, focus/break duration, and completion. Avoid manipulative streak pressure.


---

## 11. Opportunities

Sources may include platform admins, schools, academies, external APIs, and AI-assisted web discovery where configured.

Keep separate:
- Eligibility
- Relevance / Match
- Readiness
- Application Status

A matching percentage is a relevance score, not acceptance/success probability. Matching may consider age eligibility, interests, activities, location, deadline, and academic requirements.

Students may discover, save, review, apply where authorized, and track applications. Guardian approval may be required according to policy. AI cannot auto-apply or fabricate eligibility/achievements.

Track source, deadline, verification/retrieval date, status, and staleness where relevant.

## 12. Community and Messaging

Community is a safe communication environment, not an open social network.

Support inbox, sent, direct/group conversations, approved communities, attachments, shared files, read state, mute, conversation search, report, block, leave group, and safety concern reporting.

Do not implement follower counts, popularity rankings, public popularity feeds, or unrestricted student discovery.

Student-to-student private messaging may be allowed through authorized relationships such as same school, class, approved group, activity, academy, or explicitly approved connection where policy permits.

Message authorization:
`Sender → Recipient → Relationship → Policy → Block State → Safety Restrictions → Permission → Send`.

AI may draft/rewrite/summarize but never silently send. Private AI conversations are separate from Community messages.

## 13. Student Profile and Documents

Student profile is a development portfolio, not social media. Sections: overview, academic, activities, achievements, certificates, creative work, external sharing. No likes/followers/public ranking.

External sharing uses non-guessable links/tokens, expiration, revocation, field selection, and preview. Exclude private AI, journals, protected messages, sensitive documents, internal notes, and safety/moderation data.

Documents may include PDFs, images, certificates, report cards, timetables, assignments, creative work, identity documents, medical/sensitive information where permitted, and other approved documents. Support upload, organization, search, preview, versioning, relationships, controlled sharing, archive/delete according to policy, and authorized AI analysis.

AI document analysis ≠ authenticity verification. Documents/extracted content are untrusted AI input.


---

## 14. Parent Route Map and Experience

Routes:
- `/parent`
- `/parent/children`
- `/parent/children/:id`
- `/parent/children/:id/academics`
- `/parent/children/:id/attendance`
- `/parent/children/:id/tasks`
- `/parent/children/:id/activities`
- `/parent/children/:id/calendar`
- `/parent/children/:id/teachers`
- `/parent/messages`
- `/parent/approvals`
- `/parent/insights`
- `/parent/documents`
- `/parent/opportunities`
- `/parent/settings`

The parent experience supports rather than surveils.

For multiple children, maintain strict child context and never merge/compare siblings.

Parent AI insights must be evidence-based. Do not generate intelligence, personality, parenting, future-success judgments, child rankings, or sibling comparisons. Private student AI is not an input merely because the requester is the parent.

Parent settings may manage own account, guardian verification, child relationships, notifications, communication, AI preferences, privacy, security, documents/data, organization relationships, accessibility, language, support, and account actions. Child visibility policy is not a parent-owned unrestricted toggle.


---

## 15. Teacher Route Map and Experience

Routes:
- `/teacher`
- `/teacher/classes`
- `/teacher/classes/:id`
- `/teacher/students`
- `/teacher/students/:id`
- `/teacher/attendance`
- `/teacher/assignments`
- `/teacher/assignments/create`
- `/teacher/marks`
- `/teacher/class-summary`
- `/teacher/development`
- `/teacher/opportunities`
- `/teacher/messages`
- `/teacher/messages/:id`
- `/teacher/documents`
- `/teacher/settings`

Dashboard may summarize assigned classes, upcoming classes, assignment/attendance/assessment work, messages, deadlines, authorized support signals, opportunities, and recent changes. Do not rank students/teachers.

Class summary may include period, snapshot, recent learning, attendance, assignments, assessments, development, upcoming work, teacher summary, AI assistance, and recent changes. No class-health/intelligence/teacher-effectiveness scores.

Development observations distinguish observed fact, interpretation, student-reported information, evidence, support/action, and AI suggestion. Do not infer intelligence, personality diagnosis, mental-health diagnosis, future success, or inherent potential. Visibility is explicit and history/versioning used where appropriate.

Teacher settings categories: Account, Professional Profile, School Memberships, Teaching Preferences, Notifications, Communication, Helix AI, Privacy, Security, Documents & Data, Accessibility, Language & Region, Help & Support, About Helixed, Account Actions.

Organization-managed fields are distinguished from teacher-controlled fields. School-controlled assignment/class/subject information uses correction/change requests. Teacher AI may use assigned classes/students and authorized records but excludes private student AI, journals, unrelated student messages, and unrelated school data.


---

## 16. Academy Route Map and Experience

Routes:
- `/academy`
- `/academy/students`
- `/academy/students/:id`
- `/academy/batches`
- `/academy/batches/:id`
- `/academy/coaches`
- `/academy/students/:id/notes`
- `/academy/certificates`
- `/academy/certificates/:id`
- `/academy/messages`
- `/academy/messages/:id`
- `/academy/opportunities`
- `/academy/documents`
- `/academy/settings`

Academy dashboard is an organization operations workspace: programs, batches, authorized students, coaches, sessions, notes, certificate workflows, messages, opportunities, and changes. No academy/student/coach rankings.

Academy students are academy-scoped; no global student directory. Enrollment preserves status/program/batch/coach relationships/history. AI cannot silently enroll/remove students or change batches.

Concept: `Program → Program Version → Batch → Student Memberships → Coach Assignments`.

Coach notes are evidence-based, visibility-controlled, and avoid intelligence/personality/mental-health/future-success inference.

Certificates distinguish certificate, evidence, verification, issuance, and revocation. Public verification exposes minimum necessary fields. AI cannot fabricate, issue, verify, or revoke certificates.

Academy settings categories: Academy Profile, Verification, Administrators, Roles & Permissions, Programs, Batches, Coaches & Staff, Notifications, Communication, Helix AI, Privacy, Documents & Data, Integrations, Security, Accessibility, Language & Region, Help & Support, Account & Organization.


---

## 17. Admin Route Map and Governance

Routes:
- `/admin`
- `/admin/users`
- `/admin/students`
- `/admin/parents`
- `/admin/teachers`
- `/admin/schools`
- `/admin/academies`
- `/admin/verifications`
- `/admin/opportunities`
- `/admin/reports`
- `/admin/moderation`
- `/admin/blocked-users`
- `/admin/safety-incidents`
- `/admin/message-review`
- `/admin/ai`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/settings`

Administration is governance/operations, not unrestricted surveillance.

Identity/account administration is distinct from domain administration. Authorized admins may manage account state, roles, memberships, verification state, restrictions, and support workflows. Private data remains excluded unless a specific authorized workflow requires it.

Verification is claim-specific and preserves claim, evidence, policy/version, reviewer, decision, and history. AI may assist but not make final verification decisions. No universal trust score.

Moderation is case-driven:
`Report → Evidence → Policy → Review → Finding → Action → Appeal`.
Report ≠ finding.

Restrictions may be scoped to messaging, community, AI, organization, or account. Do not use one ambiguous `blocked=true`.

Safety is distinct from ordinary moderation:
`Incident → Evidence → Triage → Assignment → Protective/Safety Action → Follow-up → Resolution`.
No opaque student risk scores. Sensitive access is purpose-specific, case-specific, minimum-necessary, permission-controlled, and audited.

Admin message review is case-driven, never an unrestricted inbox:
`Report/Safety Case → Authorized Reviewer → Minimum Necessary Context → Review → Finding/Escalation → Audit`.

Analytics uses approved/derived data and should retain definition, population, period, source, freshness, and limitations where relevant. No student/teacher/school/academy rankings or opaque risk scores.


---

## 18. Admin Settings

Categories:
1. Platform
2. Administrators
3. Roles & Permissions
4. Authentication & Security
5. Organizations
6. Notifications
7. Communication
8. Helix AI
9. Moderation
10. Safety
11. Opportunities
12. Documents & Data
13. Privacy & Retention
14. Integrations
15. Analytics
16. Accessibility
17. Language & Region
18. Audit & Governance
19. Account

Admin settings are configuration, not a private-data browser, arbitrary SQL console, secret viewer, or permission bypass.

High-impact changes may require impact preview, reason, reauthentication, MFA, approval, audit, and version history as configured.

Possible configuration lifecycle:
`Draft → Review → Approval Required → Approved → Scheduled → Active`.

Rollback is a new auditable action; it does not erase history.

## 19. School Domain

Schools are first-class organizations. School foundations must support organization profile, verification, administrators, teachers/staff, students, classes, subjects, timetable, assignments, attendance, assessments/marks, announcements, documents, communication, policies/settings, integrations, and audit.

School authority does not automatically include private student AI, journals, or protected private messages.

School and academy are distinct organization types. School commonly controls official academic records; academy commonly controls extracurricular/coaching/program relationships. Shared infrastructure may be reused without erasing authority boundaries.


---

## 20. Helix AI Product Model

Capabilities may include:
- Daily planning
- Study planning
- Revision plans
- Academic analysis
- Weak-topic identification
- Activity balancing
- Opportunity recommendations
- Career exploration
- Time management
- Habit analysis
- Learning recommendations
- Concept explanation
- Note summarization
- Quiz generation
- Flashcard generation
- Document analysis
- Certificate analysis
- Achievement analysis
- Parent insights
- Teacher insights
- Academy insights
- Student chatbot

AI remains inside normal identity, relationship, permission, policy, privacy, and consent boundaries.

### Action levels

**Level 1 — Informational:** explain, summarize, answer doubts, generate quizzes/flashcards.

**Level 2 — Recommendation:** study/revision/daily plans, workload suggestions, opportunity suggestions, proposed calendar blocks.

**Level 3 — State-changing:** create task/event, send message, submit application, publish assignment, etc.

Level 3 flow:
`AI proposes → Backend validates → User sees exact action → User confirms → Authorization revalidated → Canonical service executes → Result recorded`.

AI must not silently change marks/attendance/official timetable, contact people, send messages, apply to opportunities, issue/revoke certificates, suspend accounts, change permissions, enroll/remove students, or make final disciplinary/safety decisions.

Revision/study planning may consider exam dates, syllabus, available time, previous performance, and existing commitments where authorized. It may produce study timetables and daily tasks, but calendar modification requires approval.


---

## 21. AI Context, Privacy, and Safety

AI context flow:
`Feature Request → Authenticated User → Role/Relationship → Feature Policy → Consent Requirement → Authorization → Allowed Context Sources → Minimum Necessary Fields → Sanitized Context → Model`.

Never serialize entire database objects when only limited fields are needed.

Ordinary access:
- Parent ✕ child's private AI conversation
- Teacher ✕ student's private AI conversation
- Academy ✕ student's private AI conversation
- Ordinary admin ✕ arbitrary private AI conversation

Exceptional access, if implemented, requires authorized purpose + specific case + additional permission + minimum necessary scope + audit.

Treat uploaded documents, messages, opportunity descriptions, webpages, submissions, certificates, report descriptions, historical AI messages, and external API content as untrusted. They cannot override system policy or grant permission. The model is never the authorization layer.

AI output ≠ official record:
- AI feedback ≠ official teacher feedback
- AI attendance summary ≠ attendance
- AI certificate analysis ≠ verification
- AI recommendation ≠ application
- AI assignment draft ≠ published assignment
- AI career exploration ≠ prediction

Prohibited AI inferences: intelligence, inherent potential, personality diagnosis, mental-health diagnosis, future success, teacher effectiveness ranking, parent quality, school quality ranking, disciplinary risk score, acceptance probability.


---

## 22. Shared AI Governance Routes

Routes:
- `/ai/consent`
- `/ai/privacy`
- `/ai/history`
- `/ai/data-controls`
- `/ai/report`

### Consent
Answers: **What AI processing can I choose or approve?**

Consent is purpose-specific, understandable, appropriately revocable, versioned, and distinct from authorization. It does not grant access to everything.

Potential categories: AI assistance, personalization, context/data use, document analysis, recommendations, action permissions, communication assistance, external-provider processing where applicable, AI history, optional improvement/research where supported.

Do not reduce consent to `ai_enabled=true`. Guardian authorization for minors does not automatically expose private student AI.

### Privacy
Answers: **How does Helix AI handle my information?**

Explain data categories, purpose, source, exclusions, context selection, processing, storage, retention, external providers when actually configured, access boundaries, role differences, controls, and reporting.

Turning off AI ≠ deleting historical AI data. Deleting AI data ≠ deleting canonical records.

### History
May include conversations, sessions, interactions, requests/responses, saved outputs, recommendations/evidence, action proposals/confirmations/executions, and reports. Never expose hidden chain-of-thought.

### Data Controls
May support eligible history deletion, saved-output management, personalization/context-source controls, export/deletion/correction requests, and request status.

Critical: `Delete AI history ≠ Delete canonical record`.

### Reporting
Categories may include Incorrect Information, Misleading Information, Unsafe Guidance, Inappropriate Content, Privacy, Unexpected Data Use, Bias/Unfairness, Recommendation Problem, AI Action Problem, Suspicious AI Behavior, Other.

Flow: `Report → Evidence → Review → Finding → Action`. Capture minimum necessary evidence; do not automatically attach all AI history, unrelated documents/messages/journal/other students.


---

## 23. Role-Specific AI

### Student AI
Navigation: Chat, Doubt, Study Plan, Revision, Daily Plan, Workload, Opportunities, Career, Documents, Certificates, Achievements, Insights.

Doubt solver explains concepts and may use selected authorized academic context. No academic-record mutation.

Study/revision/daily plans use authorized subjects, syllabus, exams, deadlines, available time, existing calendar, and previous performance as appropriate. Proposed tasks/events require confirmation.

Workload describes observable facts such as deadlines, estimated study time, conflicts, and dense days. It does not diagnose stress/burnout/mental state.

Career AI explores interests, paths, skills, projects, subjects, and educational routes; it does not claim destiny, guaranteed salary/success, or inherent suitability.

Opportunity AI may discover/summarize/compare/suggest preparation/draft reviewed application material but cannot fabricate or auto-apply.

Document/certificate AI may extract/summarize/suggest metadata but `Extraction ≠ Interpretation ≠ Verification`.

Achievement AI may organize evidence and draft descriptions but cannot fabricate achievements.

### Parent AI
May explain parent-visible information and suggest supportive next steps. It cannot expose private student AI/journal/messages, diagnose the child, rank siblings, or infer intelligence/potential.

### Teacher AI
May assist assignment/feedback/class-summary/lesson/opportunity/message drafting and authorized development summaries. It cannot expand teacher access or silently change official records.

### Academy AI
May assist operational/batch/development summaries, note/certificate-description drafting, opportunity discovery, document analysis, communication, program planning, and reporting. It cannot access unrelated school/private data or silently execute organization actions.

### Admin AI
May assist configuration explanation, authorized analytics, scoped moderation/safety workflows, and AI governance/evaluation. It cannot grant permissions or silently suspend/block/verify/change permissions/security policy/final safety or moderation findings.


---

## 24. Shared/Public Routes

Shared application routes, as applicable:
- `/notifications`
- `/search`
- `/files`
- `/help`
- `/support`
- `/terms`
- `/privacy`
- `/safety`
- `/accessibility`

Public routes:
- `/`
- `/product`
- `/students`
- `/parents`
- `/schools`
- `/academies`
- `/ai`
- `/safety`
- `/about`
- `/contact`

Public pages must not invent customer counts, partners, certifications, awards, security certifications, outcomes, or testimonials.

Authentication surfaces may include `/login`, role-specific login, invitation acceptance, verification, password reset, MFA, and session/security management. Exact decomposition may change without changing product policy.

## 25. Notifications, Search, and Communication Types

Notification categories may include tasks, calendar, academics, assignments, opportunities, activities, messages, approvals, security, safety, AI, and system. Mandatory security/safety notifications may override ordinary preference suppression according to policy.

Search is permission-aware: `Resolve authorization scope → establish searchable dataset → query → return permitted results`. Never search globally then merely hide unauthorized results.

Notification ≠ Message. Announcement ≠ private conversation. Replies/comments must be explicitly designed rather than assumed.


---

## 26. Canonical Domain Model

Implementation must preserve semantic concepts equivalent to:

**Identity:** User, UserProfile, AccountState, Session, Role, Permission.

**Organizations:** School, SchoolMembership, Academy, AcademyMembership.

**People:** StudentProfile, ParentProfile, TeacherProfile, CoachProfile.

**Relationships:** ParentStudentRelationship, TeacherClassAssignment, AcademyStudentEnrollment, BatchStudentMembership, BatchCoachAssignment.

**Academics:** Class, Subject, Chapter, Syllabus, Timetable, TimetableEntry, Assignment, Submission, Assessment, Mark, Feedback, AttendanceSession, AttendanceRecord, AttendanceCorrectionRequest.

**Planning:** Task, Calendar, CalendarEvent.

**Development:** Activity, ActivityParticipation, ActivityProgress, DevelopmentObservation, Achievement, CreativeWork.

**Opportunities:** Opportunity, OpportunityEligibility, OpportunityRecommendation, SavedOpportunity, OpportunityApplication.

**Communication:** Community, CommunityMembership, Conversation, ConversationMember, Message, MessageAttachment, Announcement.

**Evidence:** Document, DocumentVersion, DocumentRelationship, Certificate.

**Platform:** Notification, NotificationPreference, VerificationRequest, ModerationCase, SafetyIncident, Restriction, AuditEvent.

**AI:** AIConversation, AISession, AIInteraction, AIRequest, AIResponse, AIContextReference, AIOutput, AISavedOutput, AIRecommendation, AIRecommendationEvidence, AIActionProposal, AIActionConfirmation, AIActionExecution, AIConsent, AIConsentPolicy, AIPrivacyPolicy, AIDataRequest, AIReport.

Names may vary in code; semantic distinctions must remain.


---

## 27. Canonical Ownership and State Semantics

Do not duplicate canonical state for UI convenience. Attendance owns official attendance; assessment/marks owns official marks; calendar owns canonical events; assignments own assignments; opportunities own application state; certificates own issued-certificate state; messaging owns conversations/messages. Dashboards, summaries, growth, analytics, and AI views derive from canonical data.

Same entity across pages must retain identity. An assignment on dashboard/detail is one assignment; saved/recommended opportunity is one opportunity plus relationship state; inbox/detail uses one conversation; a confirmed AI-created task becomes an ordinary canonical task.

Keep distinctions:
- Verification status ≠ Account status
- Eligibility ≠ Recommendation
- Recommendation ≠ Application
- Application ≠ Acceptance
- AI proposal ≠ Execution
- Report ≠ Finding
- Restriction ≠ Account deletion
- Missing mark ≠ Zero
- Missing attendance ≠ Absent
- Document analysis ≠ Verification
- Achievement ≠ Certificate
- Activity ≠ Opportunity

An achievement may be supported by a certificate. An opportunity that becomes participation creates its own activity/enrollment relationship rather than mutating the opportunity.


---

## 28. Authorization, Multi-Tenancy, and Settings

Every resource-ID route validates server-side access. Knowing an ID never grants access.

Concept:
`Authenticate → Resolve role/membership → Resolve relationship → Authorize resource/action → Return minimum permitted fields`.

Helixed supports multiple schools/academies and multi-membership users. Organization context is not trusted solely from client input:
`User → Verified Membership → Selected Organization Context → Resource Scope → Permission`.

Role switching changes effective navigation and authorization; privileges from unrelated roles are not automatically merged.

Memberships should preserve organization, role, status, dates where relevant, verification, scoped permissions, and history. Removing membership revokes access without deleting unrelated canonical records.

Policy precedence:
`Platform Policy → Organization Policy → Role/Relationship Policy → User Preference`.
Lower-level preferences cannot bypass higher-level safety/security/privacy constraints.

Settings are not alternate canonical databases. Institution-controlled data uses purpose-built domain workflows or correction requests.


---

## 29. Corrections, Verification, and Sharing

When institutional data is incorrect but the viewer lacks edit authority, use correction workflows: timetable, attendance, membership, teacher assignment, verified profile data, etc. A correction request ≠ corrected record.

Generic verification:
`Claim → Evidence → Pending Review → Reviewer → Decision → Verified/Rejected/More Information Required → Audit`.

AI may assist extraction/review preparation but cannot confer official verification.

Student profile sharing requires explicit field selection, non-guessable token, expiration, revocation, preview, and appropriate access logging. Never share private AI, journals, private messages, sensitive docs, internal notes, or safety/moderation data by default.

A resource being searchable does not mean it is publicly discoverable.

Public certificate verification, if implemented, exposes only minimum necessary verification fields.


---

## 30. Audit, Provenance, Retention, and Security

Audit sensitive events including authentication/security events, role/permission/membership changes, attendance/mark changes, certificate issue/revocation, verification decisions, moderation actions, safety access, AI consent/data operations/actions, and admin settings changes. Store minimum necessary metadata, not entire private content.

Derived information should preserve provenance where meaningful: author/source, date, period, opportunity source, AI context references/policy/model metadata as appropriate, certificate issuer/evidence, analytics definition/source/period.

Retention is category-specific. Do not invent durations. Distinguish active, archived, deletion-eligible, audit-required, and policy/legal exception data. Feature disablement ≠ deletion.

File requirements: permitted type/size, MIME validation, safe generated names, private storage by default, authorized access, temporary/signed access where appropriate, malware-scanning integration, and access audit where appropriate. Never trust original filenames as storage paths.

Security requirements include authentication, server-side authorization, IDOR/BOLA prevention, tenant isolation, session security, password hashing, MFA where appropriate, CSRF appropriate to auth design, XSS/SQL-injection prevention, validation/output encoding, rate limiting, upload security, audit logs, secure headers, controlled CORS, secrets management, encryption expectations, backups, retention/deletion, consent, AI safety/prompt injection, monitoring, dependency scanning, and security testing.

Do not claim unsupported security/compliance guarantees.


---

## 31. UX State and Accessibility Requirements

Every data-driven route defines:
- initial/incremental loading
- true-empty state
- no-search-results state
- permission-restricted state
- unavailable state
- stale/partial state where relevant
- recoverable/unrecoverable error
- offline state where applicable

Distinguish local draft from successfully saved canonical state. Never show unsynchronized attendance/marks/messages/actions as committed.

Sensitive concurrent edits must not silently overwrite newer records. Use conflict/review behavior for marks, attendance, certificates, consent, settings, and admin configuration.

Desktop/tablet/mobile are first-class. Mobile is not merely a shrunk desktop. Preserve primary actions/context and avoid unusable tables.

Accessibility: keyboard navigation, visible focus, semantic labels, screen-reader-friendly controls, sufficient contrast, non-color-only status, accessible forms/errors, reduced-motion consideration, readable typography, and touch-friendly targets.

Permission-denied UX should avoid revealing sensitive resource existence and offer safe next steps when appropriate.

Empty states distinguish no data, no permission, no results, not-yet-received data, unavailable data, and filtered results.


---

## 32. Product Language and Minor-Safe Design

Use factual, evidence-specific language rather than labels such as bad/weak/risky/high-potential/low-potential student or ineffective teacher.

Prefer:
- "3 assignments are overdue."
- "Attendance data is missing for two sessions."
- "Recent assessment results were lower in algebra."
- "The student participated in four robotics sessions this month."

AI should communicate uncertainty: "Based on the records available...", "One possible explanation...", "You may want to...", "This recommendation uses...". Avoid deterministic personal judgments.

Because Helixed serves minors:
- avoid manipulative engagement
- avoid public popularity systems
- minimize unnecessary exposure
- keep sensitive data private
- make reporting accessible
- use age-appropriate explanations
- distinguish guardian authorization from guardian access
- keep private student spaces private by default
- maintain safeguarding escalation pathways

No dark patterns: no preselected optional consent, hidden decline, dominant accept-all, guilt language, misleading urgency, bundled unrelated consent, difficult withdrawal, or deceptive privacy controls.


---

## 33. AI Recommendation and Action UX

Important AI recommendations should show what was observed, supporting evidence, interpretation uncertainty, and suggested action.

Example:
```text
Recommendation:
Review algebra before Thursday.

Evidence:
- Algebra exam is Thursday.
- Two related tasks remain incomplete.
- Recent algebra assessment result is available.

Suggested action:
Create a 45-minute revision block.

[Review & Add]
```

For state-changing AI actions, confirmation shows exact action, target, important values, consequences where relevant, Cancel, and a specific Confirm action.

AI action traceability may follow:
`AI interaction → recommendation → action proposal → confirmation → canonical resource`.

Deleting eligible AI history does not silently delete the canonical resource. Deleting a canonical resource does not necessarily erase required audit/history records.

AI search cannot bypass ordinary search permission. AI analytics cannot invent deterministic metric values. AI official-record changes must pass through the same authorized domain services as ordinary UI actions.


---

## 34. High-Impact and Destructive Actions

High-impact actions may include publishing marks, correcting attendance, changing permissions, suspending accounts, issuing/revoking certificates, safety interventions, moderation enforcement, security-policy changes, and organization ownership transfer.

Use appropriate combinations of explicit confirmation, reauthentication, MFA, reason, impact preview, approval, audit, and concurrency protection according to risk/policy.

For delete/revoke/remove/close:
- explain scope
- distinguish archive vs delete
- distinguish relationship removal vs record deletion
- identify downstream consequences
- require confirmation
- preserve audit where required

Blocking/restriction does not erase evidence needed by authorized safety workflows.


---

## 35. Data Control and Product Integrity

Helixed operates its platform data systems, but user-facing copy must not oversimplify legal ownership of every data category. Distinguish platform-controlled configuration, institution-provided official records, user-provided content, derived information, AI-generated content, and shared/public content.

Do not say "Helixed owns all your data" as general privacy language.

AI provider disclosures must reflect actual deployed configuration. Do not hardcode unsupported claims about provider, processing location, training use, or retention.

Prototype/demo data may be fictional but must be clearly demo data. Never imply real partner schools, user counts, government relationships, certifications, opportunity partnerships, or AI performance metrics unless supplied and verified.

Product analytics may track operational events (page view, task completion, opportunity save/application, AI invocation/accept/reject, AI action confirmation, report submission, document upload, message send, correction request) without logging sensitive content when identifiers suffice.


---

## 36. Implementation Source-of-Truth Rules

This document defines product behavior.

If code and this specification conflict:
1. identify the conflict,
2. determine whether the product decision changed,
3. update this specification deliberately,
4. update implementation.

Detailed route UI specs may define layout/interactions but may not silently override permissions, privacy, canonical ownership, AI boundaries, safety, relationships, or state semantics.

Backend must enforce permissions independently of frontend visibility. Frontend hiding is not security.

Frontend must reflect actual permissions, use canonical APIs, preserve role context, distinguish AI proposals from completed actions, represent loading/error/empty/offline states, and avoid fabricated production data.

The AI layer is never an alternate route around canonical APIs. State-changing AI operations use the same authorized domain services as ordinary actions.

For unspecified minor details, choose the simplest/safest behavior consistent with this document. For choices materially affecting privacy, safety, permissions, official records, AI authority, minors, sharing, or destructive actions, record an explicit product decision rather than silently inventing policy.


---

## 37. Implementation Readiness Checklist

Before generating production frontend/backend, confirm:

- [ ] Student routes and permissions
- [ ] Parent child-relationship boundaries
- [ ] Teacher assignment boundaries
- [ ] Academy organization boundaries
- [ ] School authority boundaries
- [ ] Scoped administrator roles
- [ ] Canonical academic records
- [ ] Task/calendar distinctions
- [ ] Assignment/submission/assessment distinctions
- [ ] Missing attendance ≠ absent
- [ ] Missing marks ≠ zero
- [ ] Activity/achievement evidence
- [ ] Opportunity eligibility/match/readiness/application distinctions
- [ ] Relationship-based safe messaging
- [ ] Controlled student profile sharing
- [ ] Secure document model
- [ ] Notifications ≠ messages
- [ ] Growth without universal scoring
- [ ] AI action levels
- [ ] Confirmation before AI state changes
- [ ] Private AI boundaries
- [ ] AI consent
- [ ] AI privacy
- [ ] AI history
- [ ] AI data controls
- [ ] AI reporting
- [ ] Prompt-injection boundary
- [ ] No hidden chain-of-thought exposure
- [ ] Moderation report ≠ finding
- [ ] Separate safety workflows
- [ ] Scoped restrictions
- [ ] Verification workflows
- [ ] Permission-aware search
- [ ] Organization isolation
- [ ] Auditability
- [ ] Accessibility/responsiveness
- [ ] Loading/empty/error/offline states
- [ ] No fabricated product claims
- [ ] No ranking/surveillance mechanics
- [ ] No AI authority bypass

## 38. Final Product Invariant

> **Identity determines who the user is. Relationships, permissions, and policies determine what the user can access. Canonical domain services determine what can change. AI can assist within those boundaries but cannot create its own authority.**

> **Helixed should help students develop across academics, activities, opportunities, habits, creativity, communication, and personal growth without reducing them to a score or turning the people around them into unrestricted observers of their private digital life.**

---

## 39. Locked Technical Architecture

The following technical architecture is locked for the Helixed MVP and applies to all implementation unless an explicit product decision approves a change.

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack Query

### Backend

- Node.js
- Express
- TypeScript
- REST API
- Zod for request validation

### Database

- PostgreSQL
- Prisma ORM

### Authentication and Authorization

- Secure password hashing
- Access-token plus refresh/session architecture
- Role-based authorization combined with relationship- and resource-scoped authorization
- Backend authorization is authoritative
- Frontend route protection must never be treated as a security boundary

### Files

- S3-compatible object storage abstraction
- Local development may use a development storage implementation where appropriate

### Testing

- Vitest
- React Testing Library
- Supertest
- Playwright for critical end-to-end flows

### Development Tooling

- npm
- ESLint
- Prettier

### Application Architecture

- Modular monolith
- One role-aware frontend
- One domain-oriented backend
- Shared canonical database
- No microservices for the MVP

---

## 40. Master Specification Status

`HELIXED_MASTER_SPEC.md` is the Helixed product source of truth for implementation.

Detailed UI mockups, route-specific specifications, backend architecture, APIs, database schemas, and tests derive from this file rather than independently inventing product behavior.

When a new product decision is made, update this specification first or in the same change as implementation.

**End of HELIXED MASTER SPECIFICATION**
