import { expect, Page, Route, test } from '@playwright/test';

const ids = {
  jobRequestId: 'jr-angular-1',
  jobPostId: 'post-angular-1',
  jobApplicationId: 'app-angular-1',
  candidateId: 'candidate-angular-1',
  interviewId: 'interview-angular-hr-1',
  jobPostInterviewRoundId: 'round-angular-hr-1',
  offerLetterId: 'offer-angular-1',
};

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
  presales: user('presales-angular-1', 'Ahmed Raza', 'angular-presales@8pkk57.onmicrosoft.com', 'Presales'),
  pmo: user('pmo-angular-1', 'Ali Khan', 'angular-pmo@8pkk57.onmicrosoft.com', 'PMO'),
  recruiter: user('recruiter-angular-1', 'Sara Malik', 'angular-recruiter@8pkk57.onmicrosoft.com', 'Recruiter'),
  candidate: user('candidate-user-angular-1', 'Ayesha Khan', 'angular-candidate@8pkk57.onmicrosoft.com', 'Candidate'),
  interviewer: user('interviewer-angular-1', 'Bilal Hussain', 'angular-interviewer@8pkk57.onmicrosoft.com', 'Interviewer'),
  hiringManager: user('hm-angular-1', 'Fatima Noor', 'angular-hiring.manager@8pkk57.onmicrosoft.com', 'HiringManager'),
};

test.describe('Senior Angular Developer hiring workflow', () => {
  test.setTimeout(120_000);

  test('runs resource request, AI/RAG review, posting, application, interview, offer, and closure', async ({ page }) => {
    const state = createWorkflowState();
    await mockWorkflowApi(page, state);

    await test.step('Presales creates a Senior Angular Developer request with AI description drafting', async () => {
      await loginAs(page, users.presales.email);
      await page.goto('/app/job-requests/new');

      await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Senior Angular Developer');
      await page.getByRole('textbox', { name: 'Client', exact: true }).fill('Northstar Digital');
      await page.getByRole('checkbox', { name: /Angular/ }).check();

      await expect(page.getByText('Engineering routes to PMO - Engineering')).toBeVisible();
      await page.locator('button.ai-draft-button').click();
      await expect(page.locator('textarea[formControlName="description"]')).toHaveValue(/Angular applications/);

      await page.getByRole('button', { name: 'Submit to PMO' }).click();
      await expect(page).toHaveURL(new RegExp(`/app/job-requests/${ids.jobRequestId}`));
      expect(state.calls.descriptionDraft?.title).toBe('Senior Angular Developer');
      expect(state.calls.createJobRequest?.skillIds).toContain('skill-angular');
    });

    await test.step('PMO ranks internal bench with AI, asks the RAG assistant, and forwards to recruiters', async () => {
      await loginAs(page, users.pmo.email);
      await page.goto(`/app/pmo/review/${ids.jobRequestId}`);

      await page.getByRole('button', { name: /^Bench Matching/ }).click();
      await page.getByRole('button', { name: /Rank with AI/ }).click();

      await expect(page.getByText('Zain Angularwala')).toBeVisible();
      await expect(page.getByText(/94%/)).toBeVisible();
      await expect(page.getByText(/Last ranked .*Web research: Skipped/)).toBeVisible();

      await askAssistant(
        page,
        'Ask about bench fit, request status, or next step...',
        'Which bench employee is closest?',
        /Zain Angularwala is the closest Angular bench fit/,
      );
      expect(state.calls.ragMessages.at(-1)).toMatchObject({
        contextType: 'PmoRequest',
        contextEntityId: ids.jobRequestId,
      });

      await page.getByRole('button', { name: 'Forward to Recruiters' }).click();
      await expect(page).toHaveURL(new RegExp(`/app/job-requests/${ids.jobRequestId}`));
      expect(state.forwardedToRecruiters).toBe(true);
    });

    await test.step('Recruiter creates and publishes the job post', async () => {
      await loginAs(page, users.recruiter.email);
      await page.goto(`/app/recruitment/sourcing/${ids.jobRequestId}#job-post`);

      await expect(page.getByRole('heading', { name: 'Create Draft Job Post' })).toBeVisible();
      await expect(page.locator('input[name="title"]')).toHaveValue('Senior Angular Developer');
      await page.getByRole('button', { name: 'Create Draft' }).click();
      await expect(page.getByText('Draft job post created.')).toBeVisible();

      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Job post published for the Talent Pilot portal.')).toBeVisible();
      expect(state.jobPostPublished).toBe(true);
      expect(state.calls.createJobPost?.interviewTemplateId).toBe('template-angular');
    });

    await test.step('Candidate applies through the tenant portal using profile CV fallback', async () => {
      await page.goto('/candidate/tkxel/jobs');
      await expect(page.getByRole('heading', { name: 'Senior Angular Developer' })).toBeVisible();

      await loginAs(page, users.candidate.email);
      await page.goto(`/candidate/tkxel/apply/${ids.jobPostId}`);
      await expect(page.getByText('Profile CV fallback')).toBeVisible();

      await page.getByRole('textbox', { name: 'Cover Letter' }).fill(
        'I have led Angular teams and can deliver the Northstar dashboard workflow.',
      );
      await page.getByRole('checkbox', { name: /I agree to the profile policy/ }).check();
      await page.getByRole('button', { name: /Submit application/i }).click();

      await expect(page.locator('p.field-status.success').filter({ hasText: 'Application submitted.' })).toBeVisible();
      expect(state.candidateApplied).toBe(true);
      expect(state.calls.portalApplication?.coverLetter).toContain('Angular teams');
    });

    await test.step('Recruiter ranks applicants, uses the applications copilot, shortlists, and schedules HR screening', async () => {
      await loginAs(page, users.recruiter.email);
      await page.goto(`/app/recruitment/sourcing/${ids.jobRequestId}#applications`);

      await expect(page.getByRole('heading', { name: /Applications/ })).toBeVisible();
      await page.getByRole('button', { name: /Rank Applicants/ }).click();
      await expect(page.getByText('AI match', { exact: true })).toBeVisible();
      await expect(page.getByText('91%')).toBeVisible();
      await expect(page.getByText('Ranked #1 of 1')).toBeVisible();

      await page.getByRole('button', { name: 'Open applications copilot' }).click();
      await askAssistant(
        page,
        'Ask about applicants, fit, gaps, or rankings...',
        'Which applicant is strongest?',
        /Ayesha Khan is the strongest applicant for the Angular role/,
      );
      expect(state.calls.ragMessages.at(-1)).toMatchObject({
        contextType: 'RecruiterCandidateFit',
        contextEntityId: ids.jobRequestId,
      });

      await openApplicationActions(page);
      await page.getByRole('menuitem', { name: /Shortlist/ }).click();
      await expect(page.getByText('Ayesha Khan moved to Screening.')).toBeVisible();

      await openApplicationActions(page);
      await page.getByRole('menuitem', { name: /Schedule HR Screening/ }).click();
      await expect(page.getByRole('heading', { name: 'Schedule Ayesha Khan' })).toBeVisible();
      await page.locator('input[name="scheduleStartsAt"]').fill('2026-06-09T10:00');
      await page.locator('input[name="scheduleLocation"]').fill('Google Meet - Angular screening');
      await page.getByRole('button', { name: 'Schedule interview' }).click();
      await expect(page.getByText('HR Screening scheduled for Ayesha Khan.')).toBeVisible();
      expect(state.interviewScheduled).toBe(true);
    });

    await test.step('Interviewer generates AI questions and submits feedback', async () => {
      await loginAs(page, users.interviewer.email);
      await page.goto('/app/interview-feedback');

      await expect(page.getByRole('heading', { name: 'Interview Feedback' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Ayesha Khan', level: 3 })).toBeVisible();
      await page.getByRole('button', { name: /Generate/ }).click();

      await expect(page.getByText('3 recommended questions')).toBeVisible();
      await expect(page.getByText(/Angular change detection/)).toBeVisible();
      expect(state.calls.questionGeneration?.regenerateReason).toBeNull();

      await page.getByRole('button', { name: /Add feedback/ }).click();
      await page.locator('input[name="technicalScore"]').fill('5');
      await page.locator('input[name="communicationScore"]').fill('4');
      await page.locator('input[name="cultureScore"]').fill('5');
      await page.locator('textarea[name="feedbackText"]').fill(
        'Strong Angular architecture depth, clear communication, and solid ownership examples.',
      );
      await page.getByRole('button', { name: 'Submit feedback' }).click();

      await expect(page.getByText('Feedback submitted for Ayesha Khan.')).toBeVisible();
      expect(state.feedbackSubmitted).toBe(true);
    });

    await test.step('Recruiter forwards the completed application to Hiring Manager Review', async () => {
      await loginAs(page, users.recruiter.email);
      await page.goto(`/app/recruitment/sourcing/${ids.jobRequestId}#applications`);

      await openApplicationActions(page);
      await page.getByRole('menuitem', { name: /Forward to Hiring Manager/ }).click();
      await expect(page.getByText('Ayesha Khan forwarded to Hiring Manager Review.')).toBeVisible();
      expect(state.forwardedToHiringManager).toBe(true);
    });

    await test.step('Hiring manager reviews evidence, uses RAG, generates offer, records joined outcome, and closes request', async () => {
      await loginAs(page, users.hiringManager.email);
      await page.goto(`/app/hiring-manager/reviews/${ids.jobApplicationId}`);

      await expect(page.getByRole('heading', { name: 'Ayesha Khan', level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Hiring Manager Decision Brief' })).toBeVisible();
      await page.getByRole('button', { name: 'Open decision assistant' }).click();
      await askAssistant(
        page,
        'Ask about candidate evidence or comparison...',
        'Is this candidate ready for offer?',
        /Ayesha is ready for offer based on Angular evidence/,
      );
      expect(state.calls.ragMessages.at(-1)).toMatchObject({
        contextType: 'HiringDecisionBrief',
        contextEntityId: ids.jobApplicationId,
        focusEntityId: ids.jobApplicationId,
      });

      await page.locator('input[name="compensationText"]').fill('PKR 520,000 per month');
      await page.locator('input[name="startDate"]').fill('2026-07-01');
      await page.locator('input[name="workLocation"]').fill('Tkxel Garden Town');
      await page.locator('textarea[name="additionalNotes"]').fill('Use the Angular hiring package and standard benefits.');
      await page.getByRole('button', { name: 'Generate offer letter' }).click();

      await expect(page.locator('textarea[name="offerBody"]')).toHaveValue(/Senior Angular Developer/);
      await page.locator('input[name="meetingAtLocal"]').fill('2026-06-10T11:00');
      await page.locator('input[name="meetingLocation"]').fill('Tkxel Garden Town - Board Room');
      await page.locator('textarea[name="meetingNotes"]').fill('Bring CNIC and academic documents.');
      await page.getByRole('button', { name: /Schedule meeting/ }).click();
      await expect(page.getByText('Offer presentation meeting scheduled and candidate email queued.')).toBeVisible();

      await page.locator('select[name="hiringOutcome"]').selectOption('Joined');
      await page.locator('input[name="hiringOutcomeJoiningDate"]').fill('2026-07-01');
      await page.locator('textarea[name="hiringOutcomeReason"]').fill('Accepted offer and joined the Angular team.');
      await page.getByRole('button', { name: /Record outcome/ }).click();
      await expect(page.getByText('Ayesha Khan marked Joined.')).toBeVisible();

      await page.locator('textarea[name="closeReason"]').fill('Senior Angular Developer position filled by Ayesha Khan.');
      await page.getByRole('button', { name: 'Close Job Request' }).click();
      await expect(page.getByText('Closed reason')).toBeVisible();
      await expect(page.getByText('Senior Angular Developer position filled by Ayesha Khan.')).toBeVisible();
      expect(state.requestClosed).toBe(true);
    });

    expect(state.calls.benchRanking).toBe(1);
    expect(state.calls.applicantRanking).toBe(1);
    expect(state.calls.questionGeneration).toBeTruthy();
    expect(state.calls.offerLetter?.compensationText).toBe('PKR 520,000 per month');
    expect(state.calls.hiringOutcome?.outcome).toBe('Joined');
    expect(state.calls.closeJobRequest?.reason).toContain('position filled');
  });
});

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/auth\/login$/);
}

async function askAssistant(
  page: Page,
  placeholder: string,
  question: string,
  expectedAnswer: RegExp,
): Promise<void> {
  await page.locator(`textarea[name="ragAssistantMessage"][placeholder="${placeholder}"]`).last().fill(question);
  await page.getByRole('button', { name: 'Send assistant question' }).last().click();
  await expect(page.getByText(expectedAnswer)).toBeVisible();
  await expect(page.getByText('References')).toBeVisible();
  const collapseButtons = page.getByRole('button', { name: 'Collapse assistant panel' });
  if (await collapseButtons.count()) {
    await collapseButtons.last().click();
  }
}

async function openApplicationActions(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open actions for Ayesha Khan' }).click();
}

async function mockWorkflowApi(page: Page, state: WorkflowState): Promise<void> {
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
      return json(route, snapshot(state));
    }

    if (path === 'talent-pilot/tenant-admin/dashboard') {
      return json(route, tenantAdminDashboard());
    }

    if (path === 'talent-pilot/pmo/dashboard') {
      return json(route, pmoDashboard());
    }

    if (path === 'talent-pilot/hiring-manager/dashboard') {
      return json(route, hiringManagerDashboard());
    }

    if (path === 'talent-pilot/job-requests/intake-options') {
      return json(route, intakeOptions());
    }

    if (path === 'talent-pilot/job-requests/description-draft' && method === 'POST') {
      state.calls.descriptionDraft = request.postDataJSON();
      return json(route, {
        description: 'Build enterprise Angular applications for Northstar Digital using RxJS, TypeScript, and reusable component architecture.',
        agentRunId: 'agent-description-angular-1',
        model: 'llama3.2',
        generatedAtUtc: '2026-06-06T06:00:00Z',
      });
    }

    if (path === 'talent-pilot/job-requests' && method === 'POST') {
      state.jobRequestCreated = true;
      state.calls.createJobRequest = request.postDataJSON();
      return json(route, { jobRequest: jobRequest(state), assignment: pmoAssignment() });
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/pmo-review`) {
      return json(route, pmoReview(state));
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/bench-matches/rank` && method === 'POST') {
      state.benchRanked = true;
      state.calls.benchRanking += 1;
      return json(route, {
        benchMatches: benchMatches(),
        agentRunId: 'agent-bench-angular-1',
        model: 'llama3.2',
        generatedAtUtc: '2026-06-06T06:05:00Z',
        webResearchStatus: 'Skipped:LiveContextNotRequired',
      });
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/forward-to-recruiters` && method === 'POST') {
      state.forwardedToRecruiters = true;
      return json(route, {});
    }

    if (path === 'talent-pilot/recruitment/queue') {
      return json(route, {
        items: [
          {
            jobRequest: jobRequest(state),
            assignment: recruiterAssignment(),
            jobPostId: state.jobPostCreated ? ids.jobPostId : null,
            jobPostStatus: state.jobPostPublished ? 'Published' : state.jobPostCreated ? 'Draft' : 'NotStarted',
            recruiterOwnerName: 'Sara Malik',
            jobPostUpdatedAt: '2026-06-06T06:20:00Z',
          },
        ],
      });
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/recruiter-sourcing`) {
      return json(route, recruiterSourcing(state));
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/job-posts` && method === 'POST') {
      state.jobPostCreated = true;
      state.calls.createJobPost = request.postDataJSON();
      return json(route, jobPost(state));
    }

    if (path === `talent-pilot/job-posts/${ids.jobPostId}/publish` && method === 'POST') {
      state.jobPostPublished = true;
      return json(route, jobPost(state));
    }

    if (path === 'portal/context') {
      return json(route, publicPortalContext());
    }

    if (path === 'talent-pilot/portal/job-posts') {
      return json(route, { items: state.jobPostPublished ? [portalJobPost()] : [] });
    }

    if (path === `talent-pilot/portal/job-posts/${ids.jobPostId}`) {
      return json(route, portalJobPost());
    }

    if (path === 'talent-pilot/portal/my-applications') {
      return json(route, { items: state.candidateApplied ? [portalMyApplication(state)] : [] });
    }

    if (path === 'talent-pilot/portal/profile') {
      return json(route, portalCandidateProfile());
    }

    if (path === `talent-pilot/portal/job-posts/${ids.jobPostId}/applications` && method === 'POST') {
      state.candidateApplied = true;
      state.applicationStatus = 'Applied';
      state.calls.portalApplication = request.postDataJSON();
      return json(route, {
        jobApplicationId: ids.jobApplicationId,
        jobPostId: ids.jobPostId,
        jobRequestId: ids.jobRequestId,
        status: 'Applied',
        alreadyApplied: false,
      });
    }

    if (path === `talent-pilot/job-posts/${ids.jobPostId}/applicant-rankings/rank` && method === 'POST') {
      state.applicantRanked = true;
      state.calls.applicantRanking += 1;
      return json(route, {
        applicantRankings: applicantRankings(),
        agentRunId: 'agent-applicant-angular-1',
        model: 'llama3.2',
        generatedAtUtc: '2026-06-06T06:30:00Z',
        semanticSimilarityStatus: 'Available',
      });
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/screening-decision` && method === 'POST') {
      const body = request.postDataJSON() as { decision: string };
      state.applicationStatus = body.decision === 'Shortlist' ? 'Screening' : body.decision;
      return json(route, recruiterApplication(state));
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/interviews` && method === 'POST') {
      state.interviewScheduled = true;
      state.calls.scheduleInterview = request.postDataJSON();
      return json(route, {
        interviewId: ids.interviewId,
        jobApplicationId: ids.jobApplicationId,
        jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
        interviewerUserId: users.interviewer.userId,
        interviewerName: users.interviewer.displayName,
        roundName: 'HR Screening',
        startsAtUtc: '2026-06-09T05:00:00Z',
        durationMinutes: 30,
        status: 'Scheduled',
      });
    }

    if (path === 'talent-pilot/interviews/my-tasks') {
      return json(route, { items: state.interviewScheduled ? [interviewTask(state)] : [] });
    }

    if (path === `talent-pilot/interviews/${ids.interviewId}/question-recommendations` && method === 'GET') {
      if (!state.questionsGenerated) {
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'No saved recommendations.' }),
        });
      }
      return json(route, interviewQuestionSet());
    }

    if (path === `talent-pilot/interviews/${ids.interviewId}/question-recommendations/generate` && method === 'POST') {
      state.questionsGenerated = true;
      state.calls.questionGeneration = request.postDataJSON();
      return json(route, interviewQuestionSet());
    }

    if (path === `talent-pilot/interviews/${ids.interviewId}/feedback` && method === 'POST') {
      state.feedbackSubmitted = true;
      state.calls.interviewFeedback = request.postDataJSON();
      return json(route, {
        interviewId: ids.interviewId,
        jobApplicationId: ids.jobApplicationId,
        status: 'Completed',
        recommendation: 'Proceed',
        submittedAt: '2026-06-09T07:00:00Z',
      });
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/forward-to-hiring-manager` && method === 'POST') {
      state.forwardedToHiringManager = true;
      state.applicationStatus = 'HiringManagerReview';
      return json(route, {
        jobApplicationId: ids.jobApplicationId,
        jobRequestId: ids.jobRequestId,
        hiringManagerUserId: users.hiringManager.userId,
        status: 'HiringManagerReview',
      });
    }

    if (path === 'talent-pilot/hiring-manager/reviews') {
      return json(route, { items: [hiringManagerReviewListItem(state)] });
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/hiring-review`) {
      return json(route, hiringReviewDetail(state));
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/offer-letter` && method === 'POST') {
      state.offerGenerated = true;
      state.calls.offerLetter = request.postDataJSON();
      return json(route, offerLetter());
    }

    if (path === `talent-pilot/offer-letters/${ids.offerLetterId}/presentation-meeting` && method === 'POST') {
      state.meetingScheduled = true;
      state.calls.presentationMeeting = request.postDataJSON();
      return json(route, presentationMeeting());
    }

    if (path === `talent-pilot/job-applications/${ids.jobApplicationId}/hiring-outcome` && method === 'POST') {
      const body = request.postDataJSON() as { outcome: string; reason?: string | null; joiningDate?: string | null };
      state.applicationStatus = body.outcome;
      state.finalOutcomeReason = body.reason ?? null;
      state.calls.hiringOutcome = body;
      return json(route, {
        jobApplicationId: ids.jobApplicationId,
        jobRequestId: ids.jobRequestId,
        applicationStatus: body.outcome,
        jobRequestStatus: 'Open',
        joiningDate: body.joiningDate,
        fulfilledPositions: 1,
        requiredPositions: 1,
      });
    }

    if (path === `talent-pilot/job-requests/${ids.jobRequestId}/close` && method === 'POST') {
      const body = request.postDataJSON() as { reason: string };
      state.requestClosed = true;
      state.closeReason = body.reason;
      state.calls.closeJobRequest = body;
      return json(route, {});
    }

    if (path === 'talent-pilot/ai-assistant/messages' && method === 'POST') {
      const body = request.postDataJSON() as RagRequest;
      state.calls.ragMessages.push(body);
      const conversation = appendAssistantConversation(state, body);
      const assistantMessage = conversation.messages.at(-1)!;
      return json(route, {
        conversationId: conversation.conversationId,
        userMessageId: conversation.messages[conversation.messages.length - 2].messageId,
        assistantMessageId: assistantMessage.messageId,
        answer: assistantMessage.content,
        citations: assistantMessage.citations,
        model: assistantMessage.model,
        agentRunId: assistantMessage.agentRunId,
        promptVersion: assistantMessage.promptVersion,
        generatedAtUtc: assistantMessage.createdAtUtc,
      });
    }

    if (path.startsWith('talent-pilot/ai-assistant/conversations/') && method === 'GET') {
      const conversationId = path.split('/').pop() ?? '';
      return json(route, state.ragConversations[conversationId] ?? null);
    }

    if (path === 'talent-pilot/ai-assistant/conversations' && method === 'GET') {
      const contextType = url.searchParams.get('contextType');
      const contextEntityId = url.searchParams.get('contextEntityId');
      const focusEntityId = url.searchParams.get('focusEntityId');
      return json(route, Object.values(state.ragConversations).filter((conversation) =>
        conversation.contextType === contextType &&
        conversation.contextEntityId === contextEntityId &&
        (conversation.focusEntityId ?? null) === (focusEntityId || null),
      ));
    }

    if (path.endsWith('/activity')) {
      return json(route, []);
    }

    return json(route, {});
  });
}

function createWorkflowState(): WorkflowState {
  return {
    jobRequestCreated: false,
    benchRanked: false,
    forwardedToRecruiters: false,
    jobPostCreated: false,
    jobPostPublished: false,
    candidateApplied: false,
    applicantRanked: false,
    interviewScheduled: false,
    questionsGenerated: false,
    feedbackSubmitted: false,
    forwardedToHiringManager: false,
    offerGenerated: false,
    meetingScheduled: false,
    requestClosed: false,
    applicationStatus: 'Draft',
    finalOutcomeReason: null,
    closeReason: null,
    ragCounter: 0,
    ragConversations: {},
    calls: {
      benchRanking: 0,
      applicantRanking: 0,
      ragMessages: [],
    },
  };
}

interface WorkflowState {
  jobRequestCreated: boolean;
  benchRanked: boolean;
  forwardedToRecruiters: boolean;
  jobPostCreated: boolean;
  jobPostPublished: boolean;
  candidateApplied: boolean;
  applicantRanked: boolean;
  interviewScheduled: boolean;
  questionsGenerated: boolean;
  feedbackSubmitted: boolean;
  forwardedToHiringManager: boolean;
  offerGenerated: boolean;
  meetingScheduled: boolean;
  requestClosed: boolean;
  applicationStatus: string;
  finalOutcomeReason: string | null;
  closeReason: string | null;
  ragCounter: number;
  ragConversations: Record<string, RagConversation>;
  calls: {
    descriptionDraft?: any;
    createJobRequest?: any;
    createJobPost?: any;
    portalApplication?: any;
    scheduleInterview?: any;
    questionGeneration?: any;
    interviewFeedback?: any;
    offerLetter?: any;
    presentationMeeting?: any;
    hiringOutcome?: any;
    closeJobRequest?: any;
    benchRanking: number;
    applicantRanking: number;
    ragMessages: RagRequest[];
  };
}

interface RagRequest {
  contextType: 'PmoRequest' | 'RecruiterCandidateFit' | 'HiringDecisionBrief';
  contextEntityId: string;
  focusEntityId?: string | null;
  conversationId?: string | null;
  message: string;
}

interface RagConversation {
  conversationId: string;
  contextType: RagRequest['contextType'];
  contextEntityId: string;
  focusEntityId?: string | null;
  title: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  messages: Array<{
    messageId: string;
    role: 'User' | 'Assistant';
    content: string;
    model?: string | null;
    agentRunId?: string | null;
    promptVersion?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAtUtc: string;
    citations: Array<{
      citationId: string;
      knowledgeChunkId: string;
      label: string;
      sourceTitle: string;
      sourceType: string;
      sourceEntityId: string;
      sourceRoute?: string | null;
      score: number;
      excerpt: string;
    }>;
  }>;
}

function user(userId: string, displayName: string, email: string, role: string) {
  return {
    id: userId,
    userId,
    tenantId: 'tenant-1',
    tenantDisplayName: 'TKXEL',
    displayName,
    name: displayName,
    email,
    roleDisplayName: role,
    roles: [{ roleId: `role-${role}`, code: role, displayName: role, priority: 10 }],
    permissions: allPermissions,
    groups: [],
    routes: [
      '/app',
      '/app/dashboard',
      '/app/job-requests',
      '/app/pmo',
      '/app/recruitment',
      '/app/interview-feedback',
      '/app/hiring-manager',
      '/candidate',
    ],
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

function snapshot(state: WorkflowState) {
  return {
    people: [],
    jobRequests: state.jobRequestCreated ? [jobRequest(state)] : [],
    assignments: state.jobRequestCreated
      ? [state.forwardedToRecruiters ? recruiterAssignment() : pmoAssignment()]
      : [],
    notifications: [],
  };
}

function intakeOptions() {
  return {
    departments: [
      {
        departmentId: 'dept-engineering',
        code: 'engineering',
        name: 'Engineering',
        routingPreview: {
          assignmentType: 'Group',
          targetGroupId: 'group-pmo-engineering',
          targetName: 'PMO - Engineering',
          usesTenantAdminFallback: false,
        },
      },
    ],
    locations: [{ id: 'loc-lahore', name: 'Lahore' }],
    skills: [
      { id: 'skill-angular', name: 'Angular', description: 'Frontend' },
      { id: 'skill-typescript', name: 'TypeScript', description: 'Frontend' },
      { id: 'skill-rxjs', name: 'RxJS', description: 'Frontend' },
    ],
    hiringManagers: [{ id: users.hiringManager.userId, name: users.hiringManager.displayName }],
  };
}

function jobRequest(state: WorkflowState) {
  return {
    id: ids.jobRequestId,
    code: 'TP-ANG-001',
    title: 'Senior Angular Developer',
    client: 'Northstar Digital',
    clientContext: 'B2B SaaS analytics product for logistics teams.',
    department: 'Engineering',
    location: 'Lahore',
    stage: state.requestClosed
      ? 'Closed'
      : state.forwardedToHiringManager
        ? 'Hiring Manager Review'
        : state.forwardedToRecruiters
          ? 'Recruiter Sourcing'
          : 'PMO Review',
    status: state.requestClosed ? 'Closed' : 'Open',
    priority: 'High',
    description: 'Build enterprise Angular applications for Northstar Digital using RxJS, TypeScript, and reusable component architecture.',
    skills: ['Angular', 'TypeScript', 'RxJS'],
    experience: '5-8 years',
    requiredPositions: 1,
    fulfilledPositions: state.applicationStatus === 'Joined' ? 1 : 0,
    hiringManagerId: users.hiringManager.userId,
    createdById: users.presales.userId,
    publishStatus: state.jobPostPublished ? 'Published' : state.jobPostCreated ? 'NotPublished' : 'NotPublished',
    owner: state.forwardedToRecruiters ? 'Sara Malik' : 'PMO - Engineering',
    ownerId: state.forwardedToRecruiters ? users.recruiter.userId : undefined,
    ownerGroupId: state.forwardedToRecruiters ? undefined : 'group-pmo-engineering',
    createdAt: '2026-06-06T06:00:00Z',
  };
}

function pmoAssignment() {
  return {
    id: 'assignment-angular-pmo',
    entityId: ids.jobRequestId,
    stage: 'PMO Review',
    status: 'Claimed',
    claimedByUserId: users.pmo.userId,
    assignedToGroupId: 'group-pmo-engineering',
  };
}

function recruiterAssignment() {
  return {
    id: 'assignment-angular-recruiter',
    entityId: ids.jobRequestId,
    stage: 'Recruiter Sourcing',
    status: 'Claimed',
    claimedByUserId: users.recruiter.userId,
    assignedToUserId: users.recruiter.userId,
  };
}

function pmoReview(state: WorkflowState) {
  return {
    jobRequest: jobRequest(state),
    assignment: pmoAssignment(),
    referrals: [],
    existingReferrals: [],
    defaultPresalesUserId: users.presales.userId,
    presalesUsers: [{ id: users.presales.userId, name: users.presales.displayName }],
    recruiterHandoffTargetName: 'Recruiting - Engineering',
    benchMatches: state.benchRanked ? benchMatches() : [],
    eligibleEmployees: [
      {
        employeeId: 'emp-angular-1',
        displayName: 'Zain Angularwala',
        email: 'zain.angularwala@example.com',
        designation: 'Senior Angular Engineer',
        department: 'Engineering',
        location: 'Lahore',
        experienceYears: 7,
        availabilityStatus: 'Available',
        benchStatus: 'Benched',
        isCurrentlyBenched: true,
        joiningDate: '2021-01-01T00:00:00Z',
        skills: ['Angular', 'TypeScript', 'RxJS'],
        matchedSkills: ['Angular', 'TypeScript', 'RxJS'],
        missingSkills: [],
        projectEvidence: [
          {
            projectName: 'Northstar Control Tower',
            clientName: 'Northstar Digital',
            status: 'Completed',
            allocationPercent: 100,
          },
        ],
      },
    ],
  };
}

function benchMatches() {
  return [
    {
      employeeId: 'emp-angular-1',
      rank: 1,
      score: 94,
      confidence: 'High',
      explanation: 'Zain has direct Angular, RxJS, and TypeScript delivery experience for analytics dashboards.',
      strengths: ['Angular and RxJS overlap is complete.', 'Recent logistics analytics project evidence is available.'],
      gaps: [],
      caveats: ['PMO validates availability before internal recommendation.'],
      projectEvidence: [
        {
          projectName: 'Northstar Control Tower',
          clientName: 'Northstar Digital',
          status: 'Completed',
          allocationPercent: 100,
        },
      ],
      webResearchStatus: 'Skipped:LiveContextNotRequired',
      webSummary: null,
      webSources: [],
      agentRunId: 'agent-bench-angular-1',
      generatedAt: '2026-06-06T06:05:00Z',
    },
  ];
}

function recruiterSourcing(state: WorkflowState) {
  return {
    jobRequest: jobRequest(state),
    assignment: recruiterAssignment(),
    jobPost: state.jobPostCreated ? jobPost(state) : null,
    applications: state.candidateApplied ? [recruiterApplication(state)] : [],
    applicantRankings: state.applicantRanked ? applicantRankings() : [],
    candidateSearchItems: [],
    talentRediscoveryMatches: [],
    onlineHeadhunting: null,
    configuredAiModel: 'llama3.2',
    interviewTemplates: [
      {
        interviewTemplateId: 'template-angular',
        name: 'Angular hiring plan',
        departmentName: 'Engineering',
        description: 'Single HR screening for this workflow test.',
        rounds: [
          {
            roundOrder: 1,
            name: 'HR Screening',
            ownerUserId: users.interviewer.userId,
            ownerUserName: users.interviewer.displayName,
            durationMinutes: 30,
            status: 'Active',
          },
        ],
      },
    ],
    interviewers: [
      {
        userId: users.interviewer.userId,
        displayName: users.interviewer.displayName,
        email: users.interviewer.email,
        departmentId: 'dept-engineering',
        departmentName: 'Engineering',
        designation: 'Engineering Lead',
        roleNames: ['Interviewer'],
        completedInterviewCount: 12,
        isJobDepartmentMatch: true,
        isDepartmentHod: false,
      },
    ],
    hodInterviewers: [],
    skills: [
      { id: 'skill-angular', name: 'Angular', description: 'Frontend' },
      { id: 'skill-typescript', name: 'TypeScript', description: 'Frontend' },
      { id: 'skill-rxjs', name: 'RxJS', description: 'Frontend' },
    ],
  };
}

function jobPost(state: WorkflowState) {
  return {
    jobPostId: ids.jobPostId,
    jobRequestId: ids.jobRequestId,
    title: 'Senior Angular Developer',
    description: 'Build enterprise Angular applications for Northstar Digital using RxJS, TypeScript, and reusable component architecture.',
    department: 'Engineering',
    location: 'Lahore',
    experienceMinYears: 5,
    experienceMaxYears: 8,
    requiredPositions: 1,
    status: state.jobPostPublished ? 'Published' : 'Draft',
    recruiterOwnerUserId: users.recruiter.userId,
    recruiterOwnerName: users.recruiter.displayName,
    publishedAt: state.jobPostPublished ? '2026-06-06T06:20:00Z' : null,
    closedAt: null,
    createdAt: '2026-06-06T06:15:00Z',
    updatedAt: '2026-06-06T06:20:00Z',
    skills: [
      { skillId: 'skill-angular', name: 'Angular', category: 'Frontend' },
      { skillId: 'skill-typescript', name: 'TypeScript', category: 'Frontend' },
      { skillId: 'skill-rxjs', name: 'RxJS', category: 'Frontend' },
    ],
    interviewRounds: [
      {
        jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
        roundOrder: 1,
        name: 'HR Screening',
        ownerUserId: users.interviewer.userId,
        ownerUserName: users.interviewer.displayName,
        durationMinutes: 30,
        status: 'Active',
      },
    ],
  };
}

function portalJobPost() {
  return {
    ...jobPost({ ...createWorkflowState(), jobPostPublished: true, jobPostCreated: true }),
    requestCode: 'TP-ANG-001',
    companyName: 'TKXEL Careers',
    client: 'Northstar Digital',
    status: 'Published',
    publishedAt: '2026-06-06T06:20:00Z',
  };
}

function publicPortalContext() {
  return {
    tenantId: 'tenant-1',
    slug: 'tkxel',
    displayName: 'TKXEL',
    careerDisplayName: 'TKXEL Careers',
    companyAddress: 'Tkxel Garden Town',
    companyCity: 'Lahore',
    companyCountry: 'Pakistan',
    officialEmail: 'careers@example.com',
    officialPhone: '+92 300 0000000',
    primaryColor: '#0f6fc9',
    candidateLoginRequired: true,
    candidateCvFormat: 'DOCX',
    publicJobsEnabled: true,
    inviteExpiryDays: 7,
    reapplyCooldownDays: 30,
    logoFileName: null,
    logoContentType: null,
    logoContentBase64: null,
  };
}

function portalCandidateProfile() {
  return {
    candidateId: ids.candidateId,
    displayName: users.candidate.displayName,
    email: users.candidate.email,
    emailVerifiedAt: null,
    emailVerifiedAtUtc: null,
    isEmailVerified: false,
    phone: '+92 300 0000000',
    linkedInUrl: 'https://linkedin.com/in/ayesha-khan',
    currentDesignation: 'Senior Angular Engineer',
    currentCompany: 'Product Studio',
    experienceYears: 6,
    expectedSalaryAmount: 480000,
    expectedSalaryCurrency: 'PKR',
    noticePeriodDays: 30,
    primaryEducation: {
      universityName: 'FAST-NUCES',
      degreeName: 'BSCS',
      graduationYear: 2019,
    },
    currentWorkHistory: {
      companyName: 'Product Studio',
      title: 'Senior Angular Engineer',
    },
    skills: [
      {
        skillId: 'skill-angular',
        skillName: 'Angular',
        skillLevel: 'Advanced',
        yearsExperience: 5,
        isPrimary: true,
      },
      {
        skillId: 'skill-rxjs',
        skillName: 'RxJS',
        skillLevel: 'Advanced',
        yearsExperience: 4,
        isPrimary: false,
      },
    ],
    skillOptions: [
      { skillId: 'skill-angular', skillName: 'Angular', category: 'Frontend' },
      { skillId: 'skill-typescript', skillName: 'TypeScript', category: 'Frontend' },
      { skillId: 'skill-rxjs', skillName: 'RxJS', category: 'Frontend' },
    ],
    resumeDocument: {
      candidateProfileDocumentId: 'profile-doc-angular-1',
      candidateId: ids.candidateId,
      documentType: 'Resume',
      fileName: 'Ayesha_Khan_Angular_CV.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 120000,
      storageProvider: 'Local',
      uploadedAt: '2026-06-06T06:25:00Z',
      extractionStatus: 'Completed',
      hasTextEvidence: true,
      parserVersion: 'test',
      extractedAt: '2026-06-06T06:25:00Z',
      extractionError: null,
    },
  };
}

function recruiterApplication(state: WorkflowState) {
  return {
    jobApplicationId: ids.jobApplicationId,
    candidateId: ids.candidateId,
    candidateName: users.candidate.displayName,
    candidateEmail: users.candidate.email,
    candidateStatus: 'Active',
    currentDesignation: 'Senior Angular Engineer',
    currentCompany: 'Product Studio',
    experienceYears: 6,
    noticePeriodDays: 30,
    applicationStatus: state.applicationStatus,
    sourceLabel: 'Job Portal',
    sourceDetail: 'Talent Pilot Portal',
    sourceUrl: null,
    coverLetterText: 'I have led Angular teams and can deliver the Northstar dashboard workflow.',
    isInvited: false,
    appliedAt: '2026-06-06T06:26:00Z',
    interviewsPassed: state.feedbackSubmitted ? 1 : 0,
    interviewsTotal: 1,
    interviewPassSummary: state.feedbackSubmitted ? '1/1 passed' : '0/1 passed',
    documents: [
      {
        applicationDocumentId: 'app-doc-angular-1',
        jobApplicationId: ids.jobApplicationId,
        documentType: 'Resume',
        displayName: 'Ayesha_Khan_Angular_CV.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 120000,
        uploadedAt: '2026-06-06T06:26:00Z',
        extractionStatus: 'Completed',
        hasTextEvidence: true,
      },
    ],
    interviews: state.interviewScheduled ? [recruiterInterview(state)] : [],
  };
}

function recruiterInterview(state: WorkflowState) {
  return {
    interviewId: ids.interviewId,
    jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
    roundName: 'HR Screening',
    interviewerName: users.interviewer.displayName,
    interviewerUserId: users.interviewer.userId,
    interviewerAccountStatus: 'Active',
    interviewerIsDeleted: false,
    status: state.feedbackSubmitted ? 'Completed' : 'Scheduled',
    startsAt: '2026-06-09T05:00:00Z',
    durationMinutes: 30,
    meetingLink: 'https://meet.google.com/angular-test',
    locationText: 'Google Meet - Angular screening',
    recommendation: state.feedbackSubmitted ? 'Proceed' : null,
  };
}

function applicantRankings() {
  return [
    {
      jobApplicationId: ids.jobApplicationId,
      candidateId: ids.candidateId,
      candidateName: users.candidate.displayName,
      candidateEmail: users.candidate.email,
      currentDesignation: 'Senior Angular Engineer',
      experienceYears: 6,
      noticePeriodDays: 30,
      rank: 1,
      score: 91,
      confidence: 'High',
      explanation: 'Ayesha has strong Angular, TypeScript, RxJS, and dashboard delivery evidence.',
      strengths: ['Angular architecture evidence is strong.', 'Profile CV has RxJS and TypeScript depth.'],
      gaps: ['No NgRx evidence in the CV.'],
      matchedSkills: ['Angular', 'TypeScript', 'RxJS'],
      missingSkills: ['NgRx'],
      documentEvidence: ['Profile CV fallback includes Angular 15-17 dashboard work.'],
      historicalOutcomeEvidence: ['No negative historical outcomes for similar frontend roles.'],
      semanticSimilarityStatus: 'Available',
      agentRunId: 'agent-applicant-angular-1',
      generatedAt: '2026-06-06T06:30:00Z',
    },
  ];
}

function interviewTask(state: WorkflowState) {
  return {
    interviewId: ids.interviewId,
    jobApplicationId: ids.jobApplicationId,
    jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
    jobRequestId: ids.jobRequestId,
    jobPostId: ids.jobPostId,
    requestCode: 'TP-ANG-001',
    jobTitle: 'Senior Angular Developer',
    client: 'Northstar Digital',
    candidateName: users.candidate.displayName,
    candidateEmail: users.candidate.email,
    roundName: 'HR Screening',
    interviewerName: users.interviewer.displayName,
    interviewerUserId: users.interviewer.userId,
    interviewerAccountStatus: 'Active',
    interviewerIsDeleted: false,
    scheduledByName: users.recruiter.displayName,
    startsAt: '2026-06-09T05:00:00Z',
    durationMinutes: 30,
    meetingLink: 'https://meet.google.com/angular-test',
    locationText: 'Google Meet - Angular screening',
    status: state.feedbackSubmitted ? 'Completed' : 'Scheduled',
    recommendation: state.feedbackSubmitted ? 'Proceed' : null,
    technicalScore: state.feedbackSubmitted ? 5 : null,
    communicationScore: state.feedbackSubmitted ? 4 : null,
    cultureScore: state.feedbackSubmitted ? 5 : null,
    feedbackText: state.feedbackSubmitted
      ? 'Strong Angular architecture depth, clear communication, and solid ownership examples.'
      : null,
    submittedAt: state.feedbackSubmitted ? '2026-06-09T07:00:00Z' : null,
  };
}

function interviewQuestionSet() {
  return {
    recommendationSetId: 'question-set-angular-1',
    interviewId: ids.interviewId,
    jobApplicationId: ids.jobApplicationId,
    jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
    agentRunId: 'agent-questions-angular-1',
    model: 'llama3.2',
    promptVersion: 'interview-questions-json-v2',
    versionNumber: 1,
    summary: 'This HR screening guide validates motivation, Angular ownership, communication, and availability.',
    rationale: 'Questions are grounded in profile CV, job post skills, and screening round scope.',
    regenerateReason: null,
    coverage: {
      roundType: 'HR Screening',
      targetQuestionCount: 3,
      bankItemsUsed: 2,
      semanticSimilarityStatus: 'Available',
      skillsCovered: ['Angular', 'RxJS', 'TypeScript'],
      candidateEvidenceUsed: ['Ayesha_Khan_Angular_CV.docx'],
    },
    status: 'Generated',
    generatedAtUtc: '2026-06-09T06:00:00Z',
    questions: [
      {
        questionRecommendationId: 'question-angular-1',
        sortOrder: 1,
        questionText: 'Tell me about a time you improved Angular change detection performance in a production dashboard.',
        questionType: 'Behavioral',
        roundType: 'HR Screening',
        skillName: 'Angular',
        difficulty: 'Intermediate',
        rationale: 'Validates real ownership and communication around technical tradeoffs.',
        expectedSignal: 'Candidate explains the performance issue, tradeoffs, and measurable result.',
        followUps: ['How did you explain the change to non-technical stakeholders?'],
        evaluationRubric: ['Concrete Angular example', 'Clear result', 'Collaborative communication'],
        sourceBankItemId: 'bank-angular-1',
      },
      {
        questionRecommendationId: 'question-angular-2',
        sortOrder: 2,
        questionText: 'How do you organize RxJS streams when multiple UI filters and API calls interact?',
        questionType: 'Technical',
        roundType: 'HR Screening',
        skillName: 'RxJS',
        difficulty: 'Intermediate',
        rationale: 'Checks practical frontend workflow maturity.',
        expectedSignal: 'Candidate describes cancellation, error handling, and maintainable observable composition.',
        followUps: ['What would you avoid in this design?'],
        evaluationRubric: ['RxJS fluency', 'Maintainability', 'Error handling'],
        sourceBankItemId: 'bank-rxjs-1',
      },
      {
        questionRecommendationId: 'question-angular-3',
        sortOrder: 3,
        questionText: 'What kind of Angular team environment helps you do your best work?',
        questionType: 'Motivational',
        roundType: 'HR Screening',
        skillName: 'Angular',
        difficulty: 'Basic',
        rationale: 'Assesses work style and team fit.',
        expectedSignal: 'Candidate gives clear collaboration preferences and role alignment.',
        followUps: [],
        evaluationRubric: ['Role fit', 'Communication', 'Availability alignment'],
        sourceBankItemId: 'bank-hr-1',
      },
    ],
  };
}

function hiringReviewDetail(state: WorkflowState) {
  return {
    candidate: {
      candidateId: ids.candidateId,
      displayName: users.candidate.displayName,
      email: users.candidate.email,
      status: 'Active',
      currentDesignation: 'Senior Angular Engineer',
      currentCompany: 'Product Studio',
      experienceYears: 6,
      expectedSalaryAmount: 480000,
      expectedSalaryCurrency: 'PKR',
      noticePeriodDays: 30,
    },
    job: {
      jobRequestId: ids.jobRequestId,
      jobPostId: ids.jobPostId,
      requestCode: 'TP-ANG-001',
      jobTitle: 'Senior Angular Developer',
      client: 'Northstar Digital',
      department: 'Engineering',
      location: 'Lahore',
      experienceMinYears: 5,
      experienceMaxYears: 8,
      requiredPositions: 1,
      fulfilledPositions: state.applicationStatus === 'Joined' ? 1 : 0,
      requestStatus: state.requestClosed ? 'Closed' : 'Open',
      requestClosedAt: state.requestClosed ? '2026-06-10T07:30:00Z' : null,
      requestCloseReason: state.closeReason,
      applicationStatus: state.applicationStatus,
      finalOutcomeRecordedAt: state.applicationStatus === 'Joined' ? '2026-06-10T07:15:00Z' : null,
      finalOutcomeReason: state.finalOutcomeReason,
      sourceLabel: 'Job Portal',
      sourceDetail: 'Talent Pilot Portal',
      recruiterNotes: 'Applicant ranked #1 and completed HR Screening with Proceed recommendation.',
      requestDescription: 'Build enterprise Angular applications for Northstar Digital.',
      jobPostDescription: 'Build enterprise Angular applications for Northstar Digital using RxJS and TypeScript.',
    },
    interviews: state.feedbackSubmitted
      ? [
          {
            interviewId: ids.interviewId,
            jobPostInterviewRoundId: ids.jobPostInterviewRoundId,
            roundName: 'HR Screening',
            status: 'Completed',
            interviewerName: users.interviewer.displayName,
            startsAt: '2026-06-09T05:00:00Z',
            durationMinutes: 30,
            recommendation: 'Proceed',
            technicalScore: 5,
            communicationScore: 4,
            cultureScore: 5,
            averageScore: 4.7,
            feedbackText: 'Strong Angular architecture depth, clear communication, and solid ownership examples.',
            submittedAt: '2026-06-09T07:00:00Z',
          },
        ]
      : [],
    decisionBrief: 'Ayesha Khan is a strong fit for the Senior Angular Developer role based on Angular, RxJS, and TypeScript evidence.',
    decisionBriefInsight: {
      agentKey: 'hiring-manager-decision-brief',
      agentName: 'Hiring Manager Decision Brief',
      summary: 'Strong positive signal from application, ranking, and interview feedback.',
      metrics: [
        { key: 'interviews', label: 'Interviews cleared', value: '1/1', score: 100, tone: 'success', icon: 'verified' },
        { key: 'avg-score', label: 'Average score', value: '4.7/5', score: 94, tone: 'success', icon: 'speed' },
      ],
      context: [
        { key: 'skills', label: 'Requirement fit', value: 'Angular, RxJS, TypeScript', icon: 'fact_check', tone: 'success' },
      ],
      signals: ['Proceed recommendation', 'Strong Angular evidence', 'Profile CV fallback available'],
    },
    offerLetter: state.offerGenerated ? offerLetter() : null,
    presentationMeetings: state.meetingScheduled ? [presentationMeeting()] : [],
  };
}

function offerLetter() {
  return {
    offerLetterId: ids.offerLetterId,
    jobApplicationId: ids.jobApplicationId,
    jobRequestId: ids.jobRequestId,
    jobPostId: ids.jobPostId,
    candidateId: ids.candidateId,
    generatedByUserId: users.hiringManager.userId,
    generatedByName: users.hiringManager.displayName,
    version: 1,
    status: 'Draft',
    compensationText: 'PKR 520,000 per month',
    startDate: '2026-07-01',
    reportingManager: null,
    workLocation: 'Tkxel Garden Town',
    body: 'Dear Ayesha Khan,\n\nWe are pleased to offer you the role of Senior Angular Developer at TKXEL for Northstar Digital.\n\nCompensation: PKR 520,000 per month.\nStart Date: July 1, 2026.\n\nRegards,\nTalent Pilot',
    createdAt: '2026-06-10T06:55:00Z',
    updatedAt: '2026-06-10T06:55:00Z',
  };
}

function presentationMeeting() {
  return {
    offerPresentationMeetingId: 'meeting-angular-1',
    offerLetterId: ids.offerLetterId,
    jobApplicationId: ids.jobApplicationId,
    meetingAt: '2026-06-10T06:00:00Z',
    locationText: 'Tkxel Garden Town - Board Room',
    notes: 'Bring CNIC and academic documents.',
    status: 'Scheduled',
    createdAt: '2026-06-10T06:58:00Z',
  };
}

function hiringManagerReviewListItem(state: WorkflowState) {
  return {
    jobApplicationId: ids.jobApplicationId,
    jobRequestId: ids.jobRequestId,
    jobPostId: ids.jobPostId,
    requestCode: 'TP-ANG-001',
    jobTitle: 'Senior Angular Developer',
    client: 'Northstar Digital',
    department: 'Engineering',
    candidateName: users.candidate.displayName,
    candidateEmail: users.candidate.email,
    status: state.applicationStatus,
    hiringManagerName: users.hiringManager.displayName,
    updatedAt: '2026-06-10T07:00:00Z',
    offerLetterStatus: state.offerGenerated ? 'Draft' : null,
    latestMeetingAt: state.meetingScheduled ? '2026-06-10T06:00:00Z' : null,
  };
}

function portalMyApplication(state: WorkflowState) {
  return {
    jobApplicationId: ids.jobApplicationId,
    jobPostId: ids.jobPostId,
    jobRequestId: ids.jobRequestId,
    requestCode: 'TP-ANG-001',
    jobTitle: 'Senior Angular Developer',
    companyName: 'TKXEL Careers',
    client: 'Northstar Digital',
    department: 'Engineering',
    location: 'Lahore',
    status: state.applicationStatus,
    appliedAt: '2026-06-06T06:26:00Z',
    lastUpdatedAt: '2026-06-06T06:26:00Z',
    sourceLabel: 'Job Portal',
    timeline: [],
  };
}

function appendAssistantConversation(state: WorkflowState, request: RagRequest): RagConversation {
  const conversationId = request.conversationId || `rag-angular-${++state.ragCounter}`;
  const now = '2026-06-10T07:00:00Z';
  const conversation = state.ragConversations[conversationId] ?? {
    conversationId,
    contextType: request.contextType,
    contextEntityId: request.contextEntityId,
    focusEntityId: request.focusEntityId ?? null,
    title: request.message,
    createdAtUtc: now,
    updatedAtUtc: now,
    messages: [],
  };
  const response = ragAnswer(request);
  conversation.messages.push({
    messageId: `${conversationId}-user-${conversation.messages.length + 1}`,
    role: 'User',
    content: request.message,
    createdAtUtc: now,
    citations: [],
  });
  conversation.messages.push({
    messageId: `${conversationId}-assistant-${conversation.messages.length + 1}`,
    role: 'Assistant',
    content: response.answer,
    model: 'llama3.2',
    agentRunId: response.agentRunId,
    promptVersion: 'rag-json-v2',
    createdAtUtc: now,
    citations: response.citations,
  });
  conversation.updatedAtUtc = now;
  state.ragConversations[conversationId] = conversation;
  return conversation;
}

function ragAnswer(request: RagRequest) {
  if (request.contextType === 'PmoRequest') {
    return {
      answer: 'Zain Angularwala is the closest Angular bench fit because he covers Angular, TypeScript, and RxJS with logistics dashboard evidence [C1].',
      agentRunId: 'rag-pmo-angular-1',
      citations: [citation('C1', 'PMO bench ranking', 'BenchMatch', ids.jobRequestId)],
    };
  }

  if (request.contextType === 'RecruiterCandidateFit') {
    return {
      answer: 'Ayesha Khan is the strongest applicant for the Angular role because the ranking score is 91% and the profile CV supports Angular and RxJS [C1].',
      agentRunId: 'rag-recruiter-angular-1',
      citations: [citation('C1', 'Applicant Ranking - Ayesha Khan', 'ApplicantRanking', ids.jobApplicationId)],
    };
  }

  return {
    answer: 'Ayesha is ready for offer based on Angular evidence, a Proceed interview recommendation, and a 4.7/5 average score [C1].',
    agentRunId: 'rag-hm-angular-1',
    citations: [citation('C1', 'Hiring Manager Decision Brief - Ayesha Khan', 'HiringDecisionBrief', ids.jobApplicationId)],
  };
}

function citation(label: string, sourceTitle: string, sourceType: string, sourceEntityId: string) {
  return {
    citationId: `citation-${label}-${sourceEntityId}`,
    knowledgeChunkId: `chunk-${label}-${sourceEntityId}`,
    label,
    sourceTitle,
    sourceType,
    sourceEntityId,
    sourceRoute: null,
    score: 0.94,
    excerpt: `${sourceTitle} evidence for the Senior Angular Developer workflow.`,
  };
}

function tenantAdminDashboard() {
  return {
    generatedAtUtc: '2026-06-06T06:00:00Z',
    filters: { departments: [], sourceLabels: [], recruiters: [] },
    summary: {
      openJobRequests: 0,
      openPositions: 0,
      requiredPositions: 0,
      fulfilledPositions: 0,
      publishedJobPosts: 0,
      activeApplications: 0,
      interviewsThisWeek: 0,
      offers: 0,
      joinedCandidates: 0,
    },
    hiringFunnel: [],
    adminAttention: [],
    offerHealth: {
      offerLetters: 0,
      presentationMeetings: 0,
      offered: 0,
      onHold: 0,
      rejected: 0,
      joined: 0,
      openPositionsRemaining: 0,
    },
    candidatePipeline: [],
    operationalEfficiency: {
      averageTimeToFillDays: null,
      medianDaysOpen: null,
      oldestOpenRequestDays: 0,
      pmoQueueLoad: 0,
      recruiterSourcingLoad: 0,
      interviewerLoad: 0,
      hiringManagerPendingReviews: 0,
    },
    stageAging: [],
    departmentPerformance: [],
    skillsDemand: [],
    sourceQuality: [],
    interviewOperations: {
      scheduled: 0,
      completed: 0,
      skipped: 0,
      noShow: 0,
      pendingFeedback: 0,
      overdueFeedback: 0,
    },
    aiHealth: {
      runsToday: 0,
      failedRuns: 0,
      latestBenchMatchingAt: null,
      latestTalentRediscoveryAt: null,
      activeEmbeddings: 0,
      candidateEmbeddings: 0,
      jobRequestEmbeddings: 0,
      jobPostEmbeddings: 0,
      employeeEmbeddings: 0,
    },
  };
}

function pmoDashboard() {
  return {
    generatedAtUtc: '2026-06-06T06:00:00Z',
    fromUtc: '2026-06-01T00:00:00Z',
    toUtc: '2026-06-30T00:00:00Z',
    filters: { departments: [] },
    summary: {
      unclaimedReviews: 0,
      myClaimedReviews: 0,
      returnedFromPresales: 0,
      aiRankedRequests: 0,
      recommendedToPresales: 0,
      forwardedToRecruiters: 0,
    },
    workQueue: [],
    benchInsights: [],
    recommendationOutcomes: {
      pendingPresalesReview: 0,
      acceptedByPresales: 0,
      rejectedByPresales: 0,
      fulfilledInternally: 0,
      presalesResponseRate: 0,
    },
    agingBuckets: [],
    departmentLoad: [],
    decisionSplit: [],
    recommendationTrend: [],
    skillDemandVsBench: [],
    aiHealth: {
      runsInWindow: 0,
      failedRuns: 0,
      latestRunAt: null,
      rankedRequests: 0,
      employeeEmbeddings: 0,
    },
  };
}

function hiringManagerDashboard() {
  return {
    generatedAtUtc: '2026-06-06T06:00:00Z',
    summary: {
      pendingReviews: 0,
      offerFollowUps: 0,
      onHold: 0,
      completedOutcomes: 0,
      oldestWaitingDays: 0,
    },
    priorityReviews: [],
    offerPipeline: [],
    agingBuckets: [],
    outcomeSplit: [],
    recentActivity: [],
  };
}
