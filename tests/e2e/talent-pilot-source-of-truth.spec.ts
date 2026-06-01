import { expect, Page, Route, test } from '@playwright/test';

const allPermissions = [
  'access.admin.manage',
  'job.requests.view',
  'job.requests.create',
  'workflow.assignments.claim',
  'bench.matches.view',
  'candidates.manage',
  'interviews.manage',
  'hiring.decisions.manage',
];

const users = {
  presales: user('presales-1', 'Ahmed Raza', 'ai-presales@8pkk57.onmicrosoft.com', 'Presales'),
  pmo: user('pmo-1', 'Ali Khan', 'ai-pmo@8pkk57.onmicrosoft.com', 'PMO'),
  recruiter: user('recruiter-1', 'Sara Malik', 'ai-recruiter@8pkk57.onmicrosoft.com', 'Recruiter'),
  candidate: user('candidate-1', 'Ayesha Khan', 'ai-candidate@8pkk57.onmicrosoft.com', 'Candidate'),
  interviewer: user('interviewer-1', 'Bilal Hussain', 'ai-interviewer@8pkk57.onmicrosoft.com', 'Interviewer'),
  hiringManager: user('hm-1', 'Fatima Noor', 'ai-hiring.manager@8pkk57.onmicrosoft.com', 'HiringManager'),
};

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('Presales can create a job request with AI description support and PMO routing preview', async ({ page }) => {
  await loginAs(page, users.presales.email);
  await page.goto('/app/job-requests/new');

  await page.getByLabel('Title').fill('Senior React Developer');
  await page.getByLabel('Client').fill('Relia');
  await page.locator('label.checkbox-card', { hasText: 'React' }).locator('input').check();

  await expect(page.getByText('Engineering routes to PMO - Engineering')).toBeVisible();
  await page.locator('button.ai-draft-button').click();
  await expect(page.locator('textarea[formControlName="description"]')).toHaveValue(/Build and maintain React applications/);

  await page.getByRole('button', { name: 'Submit to PMO' }).click();

  await expect(page).toHaveURL(/\/app\/job-requests\/jr-1/);
});

test('PMO can rank bench employees with AI, then manually recommend or forward to recruiters', async ({ page }) => {
  await loginAs(page, users.pmo.email);
  await page.goto('/app/pmo/review/jr-1');

  await page.getByRole('button', { name: /^Bench Matching/ }).click();
  await page.getByRole('button', { name: /Rank with AI/ }).click();

  await expect(page.getByText('Bench Matching ranked 1 employee')).toBeVisible();
  await expect(page.getByText('Hamza Ali')).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Recommend to Presales' }).click();
  await expect(page.getByText('recommendation was sent to Presales')).toBeVisible();

  await page.getByRole('button', { name: 'Forward to Recruiters' }).click();
  await expect(page).toHaveURL(/\/app\/job-requests\/jr-1/);
});

test('Recruiter, candidate, interviewer, and hiring manager screens expose the full external hiring flow', async ({ page }) => {
  await loginAs(page, users.recruiter.email);
  await page.goto('/app/recruitment/sourcing/jr-1');
  await expect(page.getByRole('button', { name: /Talent Rediscovery/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Job Post/ })).toBeVisible();

  await page.goto('/app/recruitment/talent-rediscovery?jobRequestId=jr-1');
  await page.getByRole('button', { name: /Run Rediscovery AI/ }).click();
  await expect(page.getByRole('heading', { name: 'Nida Farooq' })).toBeVisible();

  await page.goto('/candidate/jobs');
  await expect(page.getByText('Senior React Developer')).toBeVisible();

  await loginAs(page, users.candidate.email);
  await page.goto('/candidate/apply/post-1');
  await page.getByRole('button', { name: /Submit application/i }).click();
  await expect(page.getByText('Application submitted', { exact: true })).toBeVisible();

  await loginAs(page, users.interviewer.email);
  await page.goto('/app/interview-feedback');
  await expect(page.getByRole('heading', { name: 'Interview Feedback' })).toBeVisible();

  await loginAs(page, users.hiringManager.email);
  await page.goto('/app/hiring-manager/reviews/app-1');
  await expect(page.getByRole('heading', { name: /Hiring Manager/i })).toBeVisible();
});

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function mockApi(page: Page): Promise<void> {
  await page.route('**/hubs/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\//, '');
    const method = request.method();

    if (path === 'auth/login-options') {
      return json(route, Object.values(users).map(toLoginOption));
    }

    if (path === 'auth/login' && method === 'POST') {
      const body = request.postDataJSON() as { email: string };
      const currentUser = Object.values(users).find((item) => item.email === body.email) ?? users.presales;
      return json(route, {
        accessToken: `access-${currentUser.userId}`,
        refreshToken: `refresh-${currentUser.userId}`,
        expiresAtUtc: '2030-01-01T00:00:00Z',
        user: currentUser,
      });
    }

    if (path === 'talent-pilot/snapshot') {
      return json(route, snapshot());
    }

    if (path === 'talent-pilot/job-requests/intake-options') {
      return json(route, intakeOptions());
    }

    if (path === 'talent-pilot/job-requests' && method === 'POST') {
      return json(route, { jobRequest: jobRequest(), assignment: pmoAssignment() });
    }

    if (path === 'talent-pilot/job-requests/description-draft' && method === 'POST') {
      return json(route, {
        description: 'Build and maintain React applications for Relia using Azure-backed product workflows.',
        agentRunId: 'agent-run-1',
        model: 'llama3.2',
        generatedAtUtc: '2026-05-31T00:00:00Z',
      });
    }

    if (path === 'talent-pilot/job-requests/jr-1/pmo-review') {
      return json(route, pmoReview());
    }

    if (path === 'talent-pilot/job-requests/jr-1/bench-matches/rank' && method === 'POST') {
      return json(route, {
        benchMatches: [
          {
            employeeId: 'emp-1',
            rank: 1,
            fitScore: 92,
            confidence: 'High',
            generatedAt: '2026-05-31T00:00:00Z',
            webResearchStatus: 'Skipped:LiveContextNotRequired',
            strengths: ['React, Azure, Lahore fit.'],
            gaps: [],
            caveats: ['PMO validates availability.'],
            projectEvidence: [],
            webSources: [],
          },
        ],
        webResearchStatus: 'Skipped:LiveContextNotRequired',
      });
    }

    if (path === 'talent-pilot/job-requests/jr-1/employee-referrals' && method === 'POST') {
      return json(route, {});
    }

    if (path === 'talent-pilot/job-requests/jr-1/forward-to-recruiters' && method === 'POST') {
      return json(route, {});
    }

    if (path === 'talent-pilot/job-requests/jr-1/recruiter-sourcing') {
      return json(route, recruiterSourcing());
    }

    if (path === 'talent-pilot/recruitment/queue') {
      return json(route, {
        items: [
          {
            jobRequest: jobRequest(),
            assignment: recruiterAssignment(),
            jobPostId: 'post-1',
            jobPostStatus: 'Published',
            recruiterOwnerName: 'Sara Malik',
            jobPostUpdatedAt: '2026-05-31T00:00:00Z',
          },
        ],
      });
    }

    if (path === 'talent-pilot/job-requests/jr-1/talent-rediscovery/rank' && method === 'POST') {
      return json(route, {
        talentRediscoveryMatches: rediscoveryMatches(),
        agentRunId: 'agent-run-rediscovery-1',
        model: 'llama3.2',
        generatedAtUtc: '2026-05-31T00:00:00Z',
      });
    }

    if (path === 'talent-pilot/portal/job-posts') {
      return json(route, { items: [portalJobPost()] });
    }

    if (path === 'talent-pilot/portal/job-posts/post-1') {
      return json(route, portalJobPost());
    }

    if (path === 'talent-pilot/portal/job-posts/post-1/applications' && method === 'POST') {
      return json(route, {
        jobApplicationId: 'app-1',
        jobPostId: 'post-1',
        jobRequestId: 'jr-1',
        status: 'Applied',
        alreadyApplied: false,
      });
    }

    if (path === 'talent-pilot/interviews/my-tasks') {
      return json(route, { tasks: [] });
    }

    if (path === 'talent-pilot/job-applications/app-1/hiring-review') {
      return json(route, { application: { id: 'app-1', currentStatus: 'HiringManagerReview' } });
    }

    if (path.endsWith('/activity')) {
      return json(route, []);
    }

    return json(route, {});
  });
}

function user(userId: string, displayName: string, email: string, role: string) {
  return {
    userId,
    tenantId: 'tenant-1',
    tenantDisplayName: 'Recruitment Ops',
    displayName,
    email,
    roleDisplayName: role,
    roles: [{ roleId: `role-${role}`, code: role, displayName: role, priority: 10 }],
    permissions: allPermissions,
    groups: [],
    routes: ['/app', '/app/dashboard', '/app/job-requests', '/app/pmo', '/app/recruitment', '/app/interview-feedback', '/app/hiring-manager'],
  };
}

function toLoginOption(currentUser: ReturnType<typeof user>) {
  return {
    userId: currentUser.userId,
    displayName: currentUser.displayName,
    email: currentUser.email,
    roleDisplayName: currentUser.roleDisplayName,
    roles: currentUser.roles,
    groups: currentUser.groups,
  };
}

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function snapshot() {
  return {
    people: [],
    jobRequests: [jobRequest()],
    assignments: [pmoAssignment()],
    notifications: [
      {
        id: 'notification-1',
        recipientUserId: 'pmo-1',
        title: 'New PMO Review',
        message: 'Senior React Developer is waiting for PMO review.',
        category: 'JobRequest',
        severity: 'Info',
        entityType: 'JobRequest',
        entityId: 'jr-1',
        createdAt: '2026-05-31T00:00:00Z',
      },
    ],
  };
}

function intakeOptions() {
  return {
    departments: [
      {
        departmentId: 'dept-engineering',
        name: 'Engineering',
        routingPreview: {
          targetType: 'Group',
          targetId: 'group-pmo-engineering',
          targetName: 'PMO - Engineering',
          usesTenantAdminFallback: false,
        },
      },
    ],
    locations: [{ id: 'loc-lahore', name: 'Lahore' }],
    skills: [{ id: 'skill-react', name: 'React', description: 'Frontend' }],
    hiringManagers: [{ id: 'hm-1', name: 'Fatima Noor' }],
  };
}

function jobRequest() {
  return {
    id: 'jr-1',
    code: 'TP-REQ-001',
    title: 'Senior React Developer',
    client: 'Relia',
    department: 'Engineering',
    location: 'Lahore',
    stage: 'PMO Review',
    status: 'Open',
    priority: 'High',
    description: 'React developer request.',
    skills: ['React', 'Azure'],
    experience: '5-8 years',
    requiredPositions: 1,
    fulfilledPositions: 0,
    owner: 'PMO - Engineering',
  };
}

function pmoAssignment() {
  return {
    id: 'assignment-1',
    entityId: 'jr-1',
    stage: 'PMO Review',
    status: 'Claimed',
    claimedByUserId: 'pmo-1',
    assignedToGroupId: 'group-pmo-engineering',
  };
}

function recruiterAssignment() {
  return {
    id: 'assignment-2',
    entityId: 'jr-1',
    stage: 'Recruiter Sourcing',
    status: 'Claimed',
    claimedByUserId: 'recruiter-1',
  };
}

function pmoReview() {
  return {
    jobRequest: jobRequest(),
    assignment: pmoAssignment(),
    existingReferrals: [],
    defaultPresalesUserId: 'presales-1',
    presalesUsers: [{ id: 'presales-1', name: 'Ahmed Raza' }],
    recruiterHandoffTargetName: 'Recruiting',
    benchMatches: [],
    eligibleEmployees: [
      {
        employeeId: 'emp-1',
        displayName: 'Hamza Ali',
        email: 'hamza@example.com',
        designation: 'Senior React Engineer',
        department: 'Engineering',
        location: 'Lahore',
        experienceYears: 6,
        availabilityStatus: 'Available',
        benchStatus: 'Benched',
        joiningDate: '2022-01-01T00:00:00Z',
        skills: ['React', 'Azure'],
        matchedSkills: ['React', 'Azure'],
        missingSkills: [],
        projectEvidence: [],
      },
    ],
  };
}

function recruiterSourcing() {
  return {
    jobRequest: jobRequest(),
    assignment: recruiterAssignment(),
    jobPost: portalJobPost(),
    applications: [],
    candidateSearchItems: [
      {
        candidateId: 'candidate-2',
        displayName: 'Nida Farooq',
        email: 'nida@example.com',
        status: 'Active',
        currentDesignation: 'Senior React Developer',
        currentCompany: 'Product Studio',
        experienceYears: 6.5,
        noticePeriodDays: 15,
        skills: ['React', 'Azure'],
        matchedSkills: ['React', 'Azure'],
        missingSkills: [],
        applicationCount: 1,
        passedInterviews: 2,
        failedInterviews: 1,
        totalInterviews: 3,
        latestApplication: candidateApplicationEvidence(),
      },
    ],
    talentRediscoveryMatches: rediscoveryMatches(),
    interviewTemplates: [],
    hodInterviewers: [],
    skills: [
      { id: 'skill-react', name: 'React' },
      { id: 'skill-azure', name: 'Azure' },
    ],
  };
}

function rediscoveryMatches() {
  return [
    {
      candidateId: 'candidate-2',
      candidateName: 'Nida Farooq',
      candidateEmail: 'nida@example.com',
      rank: 1,
      score: 85,
      confidence: 'High',
      explanation: 'Strong React history and passed previous interviews.',
      strengths: ['Matches React and Azure.', '2 of 3 previous interviews passed.'],
      gaps: [],
      applicationEvidence: [candidateApplicationEvidence()],
      interviewEvidence: [],
      agentRunId: 'agent-run-rediscovery-1',
      generatedAt: '2026-05-31T00:00:00Z',
    },
  ];
}

function candidateApplicationEvidence() {
  return {
    jobApplicationId: 'hist-app-1',
    jobRequestId: 'hist-jr-1',
    requestCode: 'TP-HIST-001',
    jobTitle: 'React Portal Engineer',
    jobPostId: 'hist-post-1',
    jobPostTitle: 'React Portal Engineer',
    jobPostStatus: 'Closed',
    displayJobTitle: 'React Portal Engineer',
    client: 'Relia',
    department: 'Engineering',
    location: 'Lahore',
    status: 'OnHold',
    sourceLabel: 'Job Portal',
    appliedAt: '2026-01-01T00:00:00Z',
    finalDecisionAt: '2026-01-20T00:00:00Z',
    finalDecisionReason: 'Kept warm after positive interviews.',
    interviewsPassed: 2,
    interviewsTotal: 3,
    interviewPassSummary: '2/3 passed',
  };
}

function portalJobPost() {
  return {
    jobPostId: 'post-1',
    jobRequestId: 'jr-1',
    requestCode: 'TP-REQ-001',
    title: 'Senior React Developer',
    description: 'Build React applications.',
    client: 'Relia',
    department: 'Engineering',
    location: 'Lahore',
    experienceMinYears: 5,
    experienceMaxYears: 8,
    requiredPositions: 1,
    skills: [
      { skillId: 'skill-react', name: 'React' },
      { skillId: 'skill-azure', name: 'Azure' },
    ],
    status: 'Published',
    companyName: 'TKXEL Careers',
    publishedAt: '2026-05-31T00:00:00Z',
  };
}
