import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password.service.js';

const prisma = new PrismaClient();
const studentId = '10000000-0000-4000-8000-000000000001';

function atToday(hour: number, minute = 0): Date {
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return value;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed data must not run in production.');
  }

  const passwordHash = await hashPassword('DemoStudent!2026');
  await prisma.user.upsert({
    where: { id: studentId },
    update: {
      loginIdentifier: 'student-demo',
      normalizedLoginIdentifier: 'student-demo',
      displayName: 'Aarav Sharma',
      accountState: 'ACTIVE',
      passwordCredential: { upsert: { create: { passwordHash }, update: { passwordHash } } },
    },
    create: {
      id: studentId,
      loginIdentifier: 'student-demo',
      normalizedLoginIdentifier: 'student-demo',
      displayName: 'Aarav Sharma',
      accountState: 'ACTIVE',
      passwordCredential: { create: { passwordHash } },
    },
  });
  await prisma.studentProfile.upsert({
    where: { userId: studentId },
    create: {
      userId: studentId,
      bio: 'I enjoy learning through science, sport, and creative projects.',
      interests: ['Robotics', 'Football', 'Space science'],
    },
    update: {},
  });

  const roleAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: studentId, roleCode: 'STUDENT', revokedAt: null },
    select: { id: true },
  });
  if (!roleAssignment) {
    await prisma.userRoleAssignment.create({
      data: { userId: studentId, roleCode: 'STUDENT', scopeType: 'PLATFORM' },
    });
  }

  if ((await prisma.studentSubject.count({ where: { studentId } })) === 0) {
    await prisma.$transaction([
      prisma.studentSubject.createMany({
        data: [
          {
            studentId,
            name: 'Mathematics',
            progress: 82,
            nextClassAt: atToday(10),
            displayOrder: 1,
          },
          { studentId, name: 'Physics', progress: 76, nextClassAt: atToday(8), displayOrder: 2 },
          { studentId, name: 'Chemistry', progress: 70, nextClassAt: atToday(9), displayOrder: 3 },
          {
            studentId,
            name: 'Computer Science',
            progress: 85,
            nextClassAt: atToday(14),
            displayOrder: 4,
          },
        ],
      }),
      prisma.studentScheduleItem.createMany({
        data: [
          {
            studentId,
            title: 'Physics',
            detail: 'Room A-201 · Dr. Mehta',
            startsAt: atToday(8),
            endsAt: atToday(9),
            color: 'blue',
          },
          {
            studentId,
            title: 'Chemistry',
            detail: 'Room B-104 · Prof. Singh',
            startsAt: atToday(9),
            endsAt: atToday(10),
            color: 'orange',
          },
          {
            studentId,
            title: 'Mathematics',
            detail: 'Room A-301 · Dr. Kumar',
            startsAt: atToday(10),
            endsAt: atToday(11),
            color: 'purple',
          },
          {
            studentId,
            title: 'Lunch Break',
            detail: null,
            startsAt: atToday(13),
            endsAt: atToday(14),
            color: 'green',
          },
          {
            studentId,
            title: 'Computer Science',
            detail: 'Room C-202 · Prof. Iyer',
            startsAt: atToday(14),
            endsAt: atToday(15),
            color: 'cyan',
          },
        ],
      }),
      prisma.studentTask.createMany({
        data: [
          {
            studentId,
            title: 'Complete physics assignment',
            dueAt: atToday(23, 59),
            priority: 'HIGH',
          },
          {
            studentId,
            title: 'Review calculus notes',
            dueAt: new Date(atToday(9).getTime() + 24 * 60 * 60 * 1000),
            priority: 'MEDIUM',
          },
          {
            studentId,
            title: 'Submit activity certificate',
            dueAt: new Date(atToday(9).getTime() + 2 * 24 * 60 * 60 * 1000),
            priority: 'MEDIUM',
          },
          {
            studentId,
            title: 'Read chapter 4: Materials Science',
            dueAt: new Date(atToday(9).getTime() + 3 * 24 * 60 * 60 * 1000),
            priority: 'LOW',
          },
        ],
      }),
      prisma.studentExam.create({
        data: {
          studentId,
          title: 'Mathematics',
          startsAt: new Date(atToday(10).getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      prisma.studentActivity.createMany({
        data: [
          {
            studentId,
            title: 'Basketball',
            detail: 'Team Practice · Tue, 4:00 PM',
            occursAt: new Date(atToday(16).getTime() + 24 * 60 * 60 * 1000),
          },
          {
            studentId,
            title: 'Coding Club',
            detail: 'Next Session · Thu, 5:00 PM',
            occursAt: new Date(atToday(17).getTime() + 3 * 24 * 60 * 60 * 1000),
          },
          { studentId, title: 'Debate Club', detail: 'Competition · This month', occursAt: null },
        ],
      }),
      prisma.studentAnnouncement.createMany({
        data: [
          { studentId, title: 'Mid-semester exam schedule released' },
          { studentId, title: 'Cultural fest registrations open' },
          { studentId, title: 'New coding workshop' },
        ],
      }),
    ]);
  }

  if ((await prisma.opportunity.count()) === 0) {
    await prisma.opportunity.createMany({
      data: [
        {
          title: 'Robotics Innovation Challenge 2026',
          detail: 'Build and present an original robotics project.',
          description:
            'A national competition for school students to design, build, and present innovative robotics solutions.',
          category: 'Competition',
          source: 'Indian Robotics Association',
          location: 'New Delhi',
          deadline: new Date(atToday(9).getTime() + 18 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
        {
          title: 'IISER Summer Research Program',
          detail: 'Research experience for high school students.',
          description: 'Hands-on research and mentoring in science and mathematics.',
          category: 'Research',
          source: 'IISER',
          location: 'Multiple locations',
          deadline: new Date(atToday(9).getTime() + 30 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
        {
          title: 'ISRO Young Scientist Program',
          detail: 'Learn space science through hands-on projects.',
          description: 'A space science program with projects and mentoring.',
          category: 'Program',
          source: 'ISRO',
          location: 'Bangalore',
          deadline: new Date(atToday(9).getTime() + 42 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
        {
          title: 'Google Code-in 2026',
          detail: 'Contribute to open source projects.',
          description: 'A coding opportunity with mentorship.',
          category: 'Competition',
          source: 'Google',
          location: 'Online',
          deadline: new Date(atToday(9).getTime() + 50 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
        {
          title: 'Inter-School Football Tournament',
          detail: 'Compete with top schools in your city.',
          description: 'A school sports competition for student teams.',
          category: 'Competition',
          source: 'Delhi Public School',
          location: 'New Delhi',
          deadline: new Date(atToday(9).getTime() + 8 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
        {
          title: 'Young Artists National Contest',
          detail: 'Showcase your creativity at the national level.',
          description: 'An arts competition for young creators.',
          category: 'Competition',
          source: 'National Art Foundation',
          location: 'Online',
          deadline: new Date(atToday(9).getTime() + 25 * 24 * 60 * 60 * 1000),
          isOpen: true,
          verifiedAt: new Date(),
        },
      ],
    });
  }
  const opportunities = await prisma.opportunity.findMany({ orderBy: { deadline: 'asc' } });
  for (const opportunity of opportunities.slice(0, 3)) {
    await prisma.savedOpportunity.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } },
      create: { studentId, opportunityId: opportunity.id },
      update: {},
    });
  }
  for (const [index, opportunity] of opportunities.slice(0, 2).entries()) {
    await prisma.opportunityApplication.upsert({
      where: { studentId_opportunityId: { studentId, opportunityId: opportunity.id } },
      create: {
        studentId,
        opportunityId: opportunity.id,
        state: index === 0 ? 'SUBMITTED' : 'DRAFT',
        submittedAt: index === 0 ? new Date() : null,
      },
      update: {},
    });
  }
  const submittedApplication = await prisma.opportunityApplication.findFirst({
    where: { studentId, state: 'SUBMITTED' },
    orderBy: { submittedAt: 'asc' },
    select: { id: true },
  });
  if (submittedApplication) {
    await prisma.parentApprovalRequest.upsert({
      where: { opportunityApplicationId: submittedApplication.id },
      create: {
        id: '60000000-0000-4000-8000-000000000001',
        childId: studentId,
        type: 'OPPORTUNITY_APPLICATION',
        opportunityApplicationId: submittedApplication.id,
      },
      update: {},
    });
  }

  const subjectNames = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'English',
    'Biology',
    'Computer Science',
  ];
  const existingSubjects = await prisma.studentSubject.findMany({
    where: { studentId, name: { in: subjectNames } },
    select: { id: true, name: true },
  });
  const knownSubjectNames = new Set(existingSubjects.map((subject) => subject.name));
  const missingSubjects = [
    { name: 'English', progress: 85, displayOrder: 5 },
    { name: 'Biology', progress: 80, displayOrder: 6 },
  ].filter((subject) => !knownSubjectNames.has(subject.name));
  if (missingSubjects.length) {
    await prisma.studentSubject.createMany({
      data: missingSubjects.map((subject) => ({ studentId, ...subject })),
    });
  }

  if ((await prisma.studentNote.count({ where: { studentId } })) === 0) {
    const subjects = await prisma.studentSubject.findMany({
      where: { studentId },
      select: { id: true, name: true },
    });
    const ids = Object.fromEntries(subjects.map((subject) => [subject.name, subject.id]));
    await prisma.$transaction([
      prisma.studentNote.createMany({
        data: [
          {
            studentId,
            subjectId: ids.Mathematics,
            title: 'Calculus — Limits and Continuity',
            content:
              'Definition of limit\n\nA function is continuous when the limit and function value agree. Practice one-sided limits and graphical interpretation.',
          },
          {
            studentId,
            subjectId: ids.Physics,
            title: 'Thermodynamics Notes',
            content: 'Key laws, heat transfer, and numerical examples from today’s class.',
          },
          {
            studentId,
            subjectId: ids.Chemistry,
            title: 'Chemical Bonding',
            content: 'Ionic and covalent bonding, valence electrons, and examples.',
          },
        ],
      }),
      prisma.studentSyllabusItem.createMany({
        data: [
          {
            studentId,
            subjectId: ids.Mathematics!,
            title: 'Real Numbers',
            progress: 100,
            displayOrder: 1,
          },
          {
            studentId,
            subjectId: ids.Mathematics!,
            title: 'Algebra',
            progress: 100,
            displayOrder: 2,
          },
          {
            studentId,
            subjectId: ids.Mathematics!,
            title: 'Coordinate Geometry',
            progress: 65,
            displayOrder: 3,
          },
          {
            studentId,
            subjectId: ids.Physics!,
            title: 'Laws of Motion',
            progress: 75,
            displayOrder: 1,
          },
          {
            studentId,
            subjectId: ids.Chemistry!,
            title: 'Atomic Structure',
            progress: 45,
            displayOrder: 1,
          },
          {
            studentId,
            subjectId: ids.English!,
            title: 'Writing Skills',
            progress: 70,
            displayOrder: 1,
          },
        ],
      }),
      prisma.studentResource.createMany({
        data: [
          {
            studentId,
            subjectId: ids.Mathematics,
            title: 'Class 10 Mathematics Syllabus',
            resourceType: 'PDF',
            description: 'Unit-wise topics and learning goals',
            url: 'https://example.com/mathematics-syllabus',
          },
          {
            studentId,
            subjectId: ids.Mathematics,
            title: 'Limits and Continuity Lecture',
            resourceType: 'Video',
            description: 'Recorded class by Ms. Sharma',
            url: 'https://example.com/limits-lecture',
          },
          {
            studentId,
            subjectId: ids.Physics,
            title: 'Laws of Motion Practice Questions',
            resourceType: 'PDF',
            description: 'Chapter-wise practice questions',
            url: 'https://example.com/physics-practice',
          },
          {
            studentId,
            subjectId: ids.Chemistry,
            title: 'Chemistry Practicals Manual',
            resourceType: 'Document',
            description: 'Lab instructions and reference notes',
            url: 'https://example.com/chemistry-manual',
          },
        ],
      }),
      prisma.studentDoubt.create({
        data: {
          studentId,
          subjectId: ids.Mathematics,
          question: 'How do I differentiate this function?',
        },
      }),
    ]);
  }

  if ((await prisma.studentActivityProgressEntry.count({ where: { studentId } })) === 0) {
    const activities = await prisma.studentActivity.findMany({
      where: { studentId },
      select: { id: true, title: true },
    });
    const activityIds = Object.fromEntries(
      activities.map((activity) => [activity.title, activity.id]),
    );
    const footballId = activityIds.Basketball ?? activities[0]?.id;
    if (footballId) {
      await prisma.studentActivity.update({
        where: { id: footballId },
        data: {
          title: 'Football',
          category: 'Sports',
          organization: 'School Football Team',
          startedAt: new Date('2025-08-15'),
          description:
            'I play football as part of the school team. I enjoy training, participating in matches, and improving my skills.',
        },
      });
      await prisma.$transaction([
        prisma.studentActivityProgressEntry.createMany({
          data: [
            {
              studentId,
              activityId: footballId,
              title: 'Training session completed',
              detail: 'Attended practice at the school ground.',
              occurredAt: new Date('2026-09-26'),
            },
            {
              studentId,
              activityId: footballId,
              title: 'Won inter-house football championship',
              detail: 'Achievement · Inter-house competition',
              occurredAt: new Date('2026-09-20'),
            },
            {
              studentId,
              activityId: footballId,
              title: 'Participated in team practice',
              detail: 'Participation · 2 hours',
              occurredAt: new Date('2026-09-18'),
            },
          ],
        }),
        prisma.studentActivityMilestone.createMany({
          data: [
            {
              studentId,
              activityId: footballId,
              title: 'Join school team',
              progress: 100,
              completedAt: new Date('2025-08-20'),
            },
            {
              studentId,
              activityId: footballId,
              title: 'Complete 10 training sessions',
              progress: 100,
              completedAt: new Date('2026-09-05'),
            },
            {
              studentId,
              activityId: footballId,
              title: 'Participate in inter-school match',
              progress: 100,
              completedAt: new Date('2026-09-18'),
            },
            {
              studentId,
              activityId: footballId,
              title: 'Achieve 5 goals this season',
              progress: 40,
            },
          ],
        }),
        prisma.studentActivityCertificate.createMany({
          data: [
            {
              studentId,
              activityId: footballId,
              title: 'Inter-House Football Championship',
              issuer: 'School',
              issuedAt: new Date('2026-08-15'),
              state: 'VERIFIED',
            },
            {
              studentId,
              activityId: footballId,
              title: 'District Football Tournament',
              issuer: 'District Sports Organization',
              issuedAt: new Date('2026-07-10'),
              state: 'VERIFIED',
            },
            {
              studentId,
              activityId: footballId,
              title: 'Summer Football Training Camp',
              issuer: 'ABC Sports Academy',
              issuedAt: new Date('2026-06-01'),
              state: 'PENDING',
            },
          ],
        }),
      ]);
    }
  }

  const aiConversation = await prisma.aiConversation.findFirst({
    where: { studentId, feature: 'chat' },
    select: { id: true },
  });
  if (!aiConversation) {
    await prisma.aiConversation.create({
      data: {
        studentId,
        feature: 'chat',
        title: 'How should I revise physics this week?',
        messages: {
          create: [
            {
              studentId,
              role: 'student',
              content: 'How should I revise physics this week?',
            },
            {
              studentId,
              role: 'assistant',
              content:
                'Start with one chapter at a time, practise a few questions, and keep a short list of topics to revisit. This is guidance only; no records were changed.',
            },
          ],
        },
      },
    });
  }

  const peerId = '10000000-0000-4000-8000-000000000002';
  const parentId = '10000000-0000-4000-8000-000000000003';
  const parentHash = await hashPassword('DemoParent!2026');
  await prisma.user.upsert({
    where: { id: parentId },
    update: {
      loginIdentifier: 'parent-demo',
      normalizedLoginIdentifier: 'parent-demo',
      displayName: 'Anita Sharma',
      accountState: 'ACTIVE',
      passwordCredential: {
        upsert: { create: { passwordHash: parentHash }, update: { passwordHash: parentHash } },
      },
    },
    create: {
      id: parentId,
      loginIdentifier: 'parent-demo',
      normalizedLoginIdentifier: 'parent-demo',
      displayName: 'Anita Sharma',
      accountState: 'ACTIVE',
      passwordCredential: { create: { passwordHash: parentHash } },
    },
  });
  await prisma.userRoleAssignment.upsert({
    where: { id: '10000000-0000-4000-8000-000000000013' },
    update: {},
    create: {
      id: '10000000-0000-4000-8000-000000000013',
      userId: parentId,
      roleCode: 'PARENT',
      scopeType: 'PLATFORM',
    },
  });
  await prisma.parentStudentRelationship.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: { verifiedAt: new Date(), revokedAt: null },
    create: { parentId, studentId, verifiedAt: new Date() },
  });
  const secondChildId = '10000000-0000-4000-8000-000000000004';
  await prisma.user.upsert({
    where: { id: secondChildId },
    update: {
      loginIdentifier: 'child-demo',
      normalizedLoginIdentifier: 'child-demo',
      displayName: 'Mira Sharma',
      accountState: 'ACTIVE',
    },
    create: {
      id: secondChildId,
      loginIdentifier: 'child-demo',
      normalizedLoginIdentifier: 'child-demo',
      displayName: 'Mira Sharma',
      accountState: 'ACTIVE',
    },
  });
  await prisma.parentStudentRelationship.upsert({
    where: { parentId_studentId: { parentId, studentId: secondChildId } },
    update: { verifiedAt: new Date(), revokedAt: null },
    create: { parentId, studentId: secondChildId, verifiedAt: new Date() },
  });
  await prisma.document.upsert({
    where: { id: '60000000-0000-4000-8000-000000000001' },
    update: {
      childId: studentId,
      uploaderId: parentId,
      purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT',
      displayName: 'Parent-provided consent form record',
      fileName: 'consent-form.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 184320,
      storageKey: null,
    },
    create: {
      id: '60000000-0000-4000-8000-000000000001',
      childId: studentId,
      uploaderId: parentId,
      purpose: 'PARENT_PROVIDED_SUPPORTING_DOCUMENT',
      displayName: 'Parent-provided consent form record',
      fileName: 'consent-form.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 184320,
      storageKey: null,
      createdAt: new Date('2026-09-29T10:00:00Z'),
    },
  });
  const schoolId = '20000000-0000-4000-8000-000000000001';
  const classId = '20000000-0000-4000-8000-000000000002';
  await prisma.school.upsert({
    where: { id: schoolId },
    update: { name: 'Helixed Demo School', verifiedAt: new Date('2026-01-01') },
    create: {
      id: schoolId,
      name: 'Helixed Demo School',
      verifiedAt: new Date('2026-01-01'),
    },
  });
  await prisma.schoolClass.upsert({
    where: { id: classId },
    update: { name: 'Class 12' },
    create: { id: classId, schoolId, name: 'Class 12' },
  });
  await prisma.classStudentMembership.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '20000000-0000-4000-8000-000000000003',
      classId,
      studentId,
      activeFrom: new Date('2026-01-01'),
    },
  });
  const teacherId = '10000000-0000-4000-8000-000000000005';
  const teacherHash = await hashPassword('DemoTeacher!2026');
  await prisma.user.upsert({
    where: { id: teacherId },
    update: {
      loginIdentifier: 'teacher-demo',
      normalizedLoginIdentifier: 'teacher-demo',
      displayName: 'Neha Kapoor',
      accountState: 'ACTIVE',
      passwordCredential: {
        upsert: { create: { passwordHash: teacherHash }, update: { passwordHash: teacherHash } },
      },
    },
    create: {
      id: teacherId,
      loginIdentifier: 'teacher-demo',
      normalizedLoginIdentifier: 'teacher-demo',
      displayName: 'Neha Kapoor',
      accountState: 'ACTIVE',
      passwordCredential: { create: { passwordHash: teacherHash } },
    },
  });
  await prisma.schoolMembership.upsert({
    where: { schoolId_userId: { schoolId, userId: teacherId } },
    update: { verifiedAt: new Date('2026-01-01'), revokedAt: null, expiresAt: null },
    create: { schoolId, userId: teacherId, verifiedAt: new Date('2026-01-01') },
  });
  await prisma.userRoleAssignment.upsert({
    where: { id: '10000000-0000-4000-8000-000000000014' },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '10000000-0000-4000-8000-000000000014',
      userId: teacherId,
      roleCode: 'TEACHER',
      scopeType: 'SCHOOL',
      schoolId,
    },
  });
  await prisma.teacherClassAssignment.upsert({
    where: { teacherId_classId: { teacherId, classId } },
    update: { revokedAt: null, expiresAt: null },
    create: { teacherId, classId },
  });
  const academyId = '80000000-0000-4000-8000-000000000001';
  const academyAdminId = '10000000-0000-4000-8000-000000000006';
  const academyBatchId = '80000000-0000-4000-8000-000000000002';
  const academyAdminHash = await hashPassword('DemoAcademy!2026');
  await prisma.user.upsert({
    where: { id: academyAdminId },
    update: {
      loginIdentifier: 'academy-demo',
      normalizedLoginIdentifier: 'academy-demo',
      displayName: 'Maya Rao',
      accountState: 'ACTIVE',
      passwordCredential: {
        upsert: {
          create: { passwordHash: academyAdminHash },
          update: { passwordHash: academyAdminHash },
        },
      },
    },
    create: {
      id: academyAdminId,
      loginIdentifier: 'academy-demo',
      normalizedLoginIdentifier: 'academy-demo',
      displayName: 'Maya Rao',
      accountState: 'ACTIVE',
      passwordCredential: { create: { passwordHash: academyAdminHash } },
    },
  });
  await prisma.academy.upsert({
    where: { id: academyId },
    update: { name: 'Helixed Skills Academy', verifiedAt: new Date('2026-01-01') },
    create: {
      id: academyId,
      name: 'Helixed Skills Academy',
      verifiedAt: new Date('2026-01-01'),
    },
  });
  await prisma.academyMembership.upsert({
    where: { academyId_userId: { academyId, userId: academyAdminId } },
    update: { verifiedAt: new Date('2026-01-01'), revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000003',
      academyId,
      userId: academyAdminId,
      verifiedAt: new Date('2026-01-01'),
    },
  });
  await prisma.userRoleAssignment.upsert({
    where: { id: '80000000-0000-4000-8000-000000000004' },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000004',
      userId: academyAdminId,
      roleCode: 'ACADEMY_ADMIN',
      scopeType: 'ACADEMY',
      academyId,
    },
  });
  const academyEnrollment = await prisma.academyStudentEnrollment.upsert({
    where: { academyId_studentId: { academyId, studentId } },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000005',
      academyId,
      studentId,
    },
  });
  await prisma.academyBatch.upsert({
    where: { id: academyBatchId },
    update: { name: 'Robotics Foundations' },
    create: { id: academyBatchId, academyId, name: 'Robotics Foundations' },
  });
  await prisma.batchStudentMembership.upsert({
    where: {
      batchId_enrollmentId: { batchId: academyBatchId, enrollmentId: academyEnrollment.id },
    },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000006',
      batchId: academyBatchId,
      enrollmentId: academyEnrollment.id,
    },
  });
  await prisma.academyMembership.upsert({
    where: { academyId_userId: { academyId, userId: teacherId } },
    update: { verifiedAt: new Date('2026-01-01'), revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000007',
      academyId,
      userId: teacherId,
      verifiedAt: new Date('2026-01-01'),
    },
  });
  await prisma.userRoleAssignment.upsert({
    where: { id: '80000000-0000-4000-8000-000000000009' },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000009',
      userId: teacherId,
      roleCode: 'ACADEMY_COACH',
      scopeType: 'ACADEMY',
      academyId,
    },
  });
  await prisma.batchCoachAssignment.upsert({
    where: { batchId_coachId: { batchId: academyBatchId, coachId: teacherId } },
    update: { revokedAt: null, expiresAt: null },
    create: {
      id: '80000000-0000-4000-8000-000000000008',
      batchId: academyBatchId,
      coachId: teacherId,
    },
  });
  const unassignedClassId = '20000000-0000-4000-8000-000000000004';
  await prisma.schoolClass.upsert({
    where: { id: unassignedClassId },
    update: { name: 'Class 11' },
    create: { id: unassignedClassId, schoolId, name: 'Class 11' },
  });
  const dueSoon = atToday(17);
  dueSoon.setDate(dueSoon.getDate() + 3);
  const dueLater = atToday(17);
  dueLater.setDate(dueLater.getDate() + 10);
  for (const assignment of [
    {
      id: '70000000-0000-4000-8000-000000000001',
      classId,
      title: 'Linear Equations Worksheet',
      subjectName: 'Mathematics',
      dueAt: dueSoon,
      status: 'OPEN' as const,
    },
    {
      id: '70000000-0000-4000-8000-000000000002',
      classId,
      title: 'Energy Project Brief',
      subjectName: 'Physics',
      dueAt: dueLater,
      status: 'DRAFT' as const,
    },
    {
      id: '70000000-0000-4000-8000-000000000003',
      classId: unassignedClassId,
      title: 'Unassigned Class Essay',
      subjectName: 'English',
      dueAt: dueSoon,
      status: 'OPEN' as const,
    },
  ])
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      update: assignment,
      create: { ...assignment, createdById: teacherId },
    });
  const assessments = [
    {
      id: '71000000-0000-4000-8000-000000000001',
      classId,
      title: 'Unit Test 1',
      subjectName: 'Mathematics',
      maximumMarks: 100,
      assessedAt: new Date('2026-09-05T08:00:00Z'),
    },
    {
      id: '71000000-0000-4000-8000-000000000002',
      classId,
      title: 'Physics Chapter Check',
      subjectName: 'Physics',
      maximumMarks: 50,
      assessedAt: new Date('2026-10-08T08:00:00Z'),
    },
    {
      id: '71000000-0000-4000-8000-000000000003',
      classId: unassignedClassId,
      title: 'Unassigned Class Test',
      subjectName: 'English',
      maximumMarks: 40,
      assessedAt: new Date('2026-09-12T08:00:00Z'),
    },
  ];
  for (const assessment of assessments)
    await prisma.assessment.upsert({
      where: { id: assessment.id },
      update: assessment,
      create: { ...assessment, createdById: teacherId },
    });
  const recordedAssessmentId = '71000000-0000-4000-8000-000000000001';
  const currentSeedMark = await prisma.mark.findFirst({
    where: { assessmentId: recordedAssessmentId, studentId, supersededAt: null },
    select: { id: true },
  });
  if (!currentSeedMark)
    await prisma.mark.create({
      data: {
        id: '72000000-0000-4000-8000-000000000001',
        assessmentId: recordedAssessmentId,
        studentId,
        recordedById: teacherId,
        value: 84,
        recordedAt: new Date('2026-09-06T08:00:00Z'),
      },
    });
  const parentTeacherConversationId = '50000000-0000-4000-8000-000000000001';
  await prisma.communityConversation.upsert({
    where: { id: parentTeacherConversationId },
    update: {},
    create: { id: parentTeacherConversationId, kind: 'DIRECT' },
  });
  for (const userId of [parentId, teacherId])
    await prisma.communityConversationMember.upsert({
      where: {
        conversationId_userId: { conversationId: parentTeacherConversationId, userId },
      },
      update: {},
      create: { conversationId: parentTeacherConversationId, userId },
    });
  await prisma.communityMessage.upsert({
    where: { id: '50000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '50000000-0000-4000-8000-000000000002',
      conversationId: parentTeacherConversationId,
      senderId: teacherId,
      body: 'Hello Anita, Aarav participated thoughtfully in class today.',
      createdAt: new Date('2026-09-30T09:30:00Z'),
    },
  });
  await prisma.communityMessage.upsert({
    where: { id: '50000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: '50000000-0000-4000-8000-000000000003',
      conversationId: parentTeacherConversationId,
      senderId: parentId,
      body: 'Thank you for the update, Neha.',
      createdAt: new Date('2026-09-30T09:35:00Z'),
    },
  });
  const attendanceSessions = [
    ['30000000-0000-4000-8000-000000000001', 'Mathematics', '2026-09-01T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000002', 'Physics', '2026-09-02T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000003', 'Chemistry', '2026-09-03T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000004', 'English', '2026-09-04T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000005', 'Mathematics', '2026-09-05T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000006', 'Physics', '2026-09-06T08:00:00Z'],
    ['30000000-0000-4000-8000-000000000007', 'Computer Science', '2026-09-07T08:00:00Z'],
  ] as const;
  for (const [id, subjectName, startsAt] of attendanceSessions) {
    const start = new Date(startsAt);
    await prisma.attendanceSession.upsert({
      where: { id },
      update: { subjectName, state: 'COMPLETED' },
      create: {
        id,
        schoolClassId: classId,
        subjectName,
        startsAt: start,
        endsAt: new Date(start.getTime() + 45 * 60 * 1000),
        state: 'COMPLETED',
      },
    });
  }
  const attendanceRecords = [
    ['40000000-0000-4000-8000-000000000001', attendanceSessions[0][0], 'PRESENT'],
    ['40000000-0000-4000-8000-000000000002', attendanceSessions[1][0], 'PRESENT'],
    ['40000000-0000-4000-8000-000000000003', attendanceSessions[2][0], 'PRESENT'],
    ['40000000-0000-4000-8000-000000000004', attendanceSessions[3][0], 'ABSENT'],
    ['40000000-0000-4000-8000-000000000005', attendanceSessions[4][0], 'LATE'],
    ['40000000-0000-4000-8000-000000000006', attendanceSessions[5][0], 'PARTIAL'],
  ] as const;
  for (const [id, sessionId, state] of attendanceRecords) {
    await prisma.attendanceRecord.upsert({
      where: { id },
      update: {},
      create: { id, sessionId, studentId, state },
    });
  }
  await prisma.user.upsert({
    where: { id: peerId },
    update: {
      loginIdentifier: 'priya-demo',
      normalizedLoginIdentifier: 'priya-demo',
      displayName: 'Priya Sharma',
      accountState: 'ACTIVE',
    },
    create: {
      id: peerId,
      loginIdentifier: 'priya-demo',
      normalizedLoginIdentifier: 'priya-demo',
      displayName: 'Priya Sharma',
      accountState: 'ACTIVE',
    },
  });
  const robotics = await prisma.communityGroup.upsert({
    where: { slug: 'robotics-club' },
    update: {},
    create: {
      slug: 'robotics-club',
      name: 'Robotics Club',
      description: 'Share ideas, ask questions, and collaborate on robotics projects.',
    },
  });
  const science = await prisma.communityGroup.upsert({
    where: { slug: 'science-project-team' },
    update: {},
    create: {
      slug: 'science-project-team',
      name: 'Science Project Team',
      description: 'A private project workspace for participating students.',
      visibility: 'MEMBERS_ONLY',
    },
  });
  for (const group of [robotics, science]) {
    await prisma.communityGroupMembership.upsert({
      where: { groupId_userId: { groupId: group.id, userId: studentId } },
      create: { groupId: group.id, userId: studentId },
      update: {},
    });
    await prisma.communityGroupMembership.upsert({
      where: { groupId_userId: { groupId: group.id, userId: peerId } },
      create: { groupId: group.id, userId: peerId },
      update: {},
    });
    const conversation = await prisma.communityConversation.upsert({
      where: { groupId: group.id },
      create: { kind: 'GROUP', groupId: group.id },
      update: {},
    });
    for (const userId of [studentId, peerId])
      await prisma.communityConversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {},
      });
    if ((await prisma.communityMessage.count({ where: { conversationId: conversation.id } })) === 0)
      await prisma.communityMessage.createMany({
        data: [
          { conversationId: conversation.id, senderId: peerId, body: `Welcome to ${group.name}!` },
          {
            conversationId: conversation.id,
            senderId: studentId,
            body: 'Glad to be here. I will share my project update soon.',
          },
        ],
      });
  }
  let direct = await prisma.communityConversation.findFirst({
    where: { kind: 'DIRECT', members: { every: { userId: { in: [studentId, peerId] } } } },
  });
  if (!direct)
    direct = await prisma.communityConversation.create({
      data: { kind: 'DIRECT', members: { create: [{ userId: studentId }, { userId: peerId }] } },
    });
  if ((await prisma.communityMessage.count({ where: { conversationId: direct.id } })) === 0)
    await prisma.communityMessage.createMany({
      data: [
        {
          conversationId: direct.id,
          senderId: peerId,
          body: 'Can you send the updated diagram for the physics project?',
        },
        {
          conversationId: direct.id,
          senderId: studentId,
          body: 'Sure, I will share it in a few minutes.',
        },
      ],
    });
}

main().finally(() => prisma.$disconnect());
