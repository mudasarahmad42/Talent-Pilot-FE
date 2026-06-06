import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { TalentPilotStoreService } from './talent-pilot-store.service';
import { ApiService } from './services/api.service';

describe('TalentPilotStoreService source-of-truth API wiring', () => {
  const userSignal = signal(null);
  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };

  const snapshot = {
    people: [],
    jobRequests: [],
    assignments: [],
    notifications: [],
  };
  const jobRequest = {
    id: 'jr-1',
    code: 'TP-REQ-001',
    title: 'Senior React Developer',
    stage: 'PMO Review',
  };
  const assignment = {
    id: 'assignment-1',
    entityId: 'jr-1',
    stage: 'PMO Review',
    status: 'Pending',
  };
  const pmoReview = {
    jobRequest,
    assignment,
    eligibleEmployees: [],
    benchMatches: [],
    presalesUsers: [],
  };

  beforeEach(() => {
    userSignal.set(null);
    api = {
      get: vi.fn((path: string) => {
        const responses = new Map<string, unknown>([
          ['talent-pilot/snapshot', snapshot],
          ['talent-pilot/job-requests/jr-1/activity', []],
          ['talent-pilot/job-requests/intake-options', { departments: [], locations: [], skills: [], hiringManagers: [] }],
          ['talent-pilot/pmo/dashboard?fromUtc=2026-05-01T00%3A00%3A00.000Z&toUtc=2026-05-31T23%3A59%3A59.999Z&departmentId=dept-1', { summary: { unclaimedReviews: 1 }, workQueue: [] }],
          ['talent-pilot/job-requests/jr-1/pmo-review', pmoReview],
          ['talent-pilot/recruitment/queue', { items: [] }],
          ['talent-pilot/job-requests/jr-1/recruiter-sourcing', { jobRequest, assignment }],
          ['talent-pilot/job-posts', { posts: [] }],
          ['talent-pilot/portal/job-posts', { jobs: [] }],
          ['talent-pilot/portal/job-posts?tenantSlug=tkxel', { items: [] }],
          ['portal/context?tenantSlug=tkxel&jobPostId=post-1', { slug: 'tkxel', careerDisplayName: 'TKXEL Careers' }],
          ['talent-pilot/portal/job-posts/post-1', { jobPost: { id: 'post-1' } }],
          ['talent-pilot/portal/invitations/invite-1?token=tracked-token', { candidateInvitationId: 'invite-1' }],
          ['talent-pilot/portal/my-applications', { applications: [] }],
          ['talent-pilot/portal/profile', { displayName: 'Sara Malik', email: 'sara@example.com', skills: [], skillOptions: [] }],
          ['talent-pilot/interviews/my-tasks', { tasks: [] }],
          ['talent-pilot/hiring-manager/reviews', { reviews: [] }],
          ['talent-pilot/job-applications/app-1/hiring-review', { application: { id: 'app-1' } }],
          ['talent-pilot/recruitment/applications/app-1/history', { application: { id: 'app-1' } }],
          ['talent-pilot/recruitment/candidates/candidate-1/profile', { candidate: { id: 'candidate-1' } }],
        ]);
        return of(responses.get(path));
      }),
      post: vi.fn((path: string) => {
        const responses = new Map<string, unknown>([
          ['talent-pilot/job-requests', { jobRequest, assignment }],
          ['talent-pilot/job-requests/description-draft', { description: 'AI drafted description.' }],
          ['talent-pilot/workflow-assignments/assignment-1/claim', undefined],
          ['talent-pilot/job-requests/jr-1/bench-matches/rank', { benchMatches: [], webResearchStatus: 'Succeeded' }],
          ['talent-pilot/job-requests/jr-1/employee-referrals', undefined],
          ['talent-pilot/job-requests/jr-1/forward-to-recruiters', undefined],
          ['talent-pilot/job-requests/jr-1/talent-rediscovery/rank', { matches: [], generatedAtUtc: '2026-05-31T00:00:00Z' }],
          ['talent-pilot/job-requests/jr-1/candidate-invitations', { invitedCount: 1 }],
          ['talent-pilot/portal/job-posts/post-1/applications', { applicationId: 'app-1' }],
          ['talent-pilot/portal/profile/documents', { document: { candidateProfileDocumentId: 'profile-doc-1' } }],
          ['talent-pilot/job-requests/jr-1/job-posts', { id: 'post-1', jobRequestId: 'jr-1' }],
          ['talent-pilot/job-posts/post-1/publish', { id: 'post-1', jobRequestId: 'jr-1', status: 'Published' }],
          ['talent-pilot/job-posts/post-1/manual-candidates', { applicationId: 'app-1' }],
          ['talent-pilot/candidates/cv-parse', { candidate: { firstName: 'Ayesha' } }],
          ['talent-pilot/job-applications/app-1/screening-decision', { id: 'app-1' }],
          ['talent-pilot/job-applications/app-1/interviews', { interviewId: 'interview-1' }],
          ['talent-pilot/interviews/interview-1/feedback', { interviewId: 'interview-1' }],
          ['talent-pilot/job-applications/app-1/forward-to-hiring-manager', { jobRequestId: 'jr-1' }],
          ['talent-pilot/job-applications/app-1/offer-letter', { id: 'offer-1' }],
          ['talent-pilot/offer-letters/offer-1/presentation-meeting', { id: 'meeting-1' }],
          ['talent-pilot/job-applications/app-1/hiring-outcome', { jobRequestId: 'jr-1' }],
          ['talent-pilot/job-requests/jr-1/close', undefined],
        ]);
        return of(responses.get(path));
      }),
      put: vi.fn((path: string) => {
        const responses = new Map<string, unknown>([
          ['talent-pilot/job-posts/post-1', { id: 'post-1', jobRequestId: 'jr-1' }],
          ['talent-pilot/portal/profile', { displayName: 'Sara Malik', email: 'sara@example.com', skills: [], skillOptions: [] }],
          ['talent-pilot/offer-letters/offer-1', { id: 'offer-1' }],
        ]);
        return of(responses.get(path));
      }),
      patch: vi.fn().mockReturnValue(of(undefined)),
      download: vi.fn().mockReturnValue(of({ body: new Blob(['docx']), headers: { get: () => null } })),
    };

    TestBed.configureTestingModule({
      providers: [
        TalentPilotStoreService,
        { provide: ApiService, useValue: api },
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal.asReadonly(),
          },
        },
      ],
    });
  });

  it('creates Presales/PMO job requests through the intake endpoint and refreshes activity', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.createJobRequest({
      title: 'Senior React Developer',
      client: 'Relia',
      description: 'React developer needed.',
      departmentId: 'dept-1',
      locationId: 'loc-1',
      skillIds: ['skill-react'],
      experienceMinYears: 5,
      experienceMaxYears: 8,
      requiredPositions: 1,
      priority: 'High',
      hiringManagerId: 'hm-1',
    });

    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests', expect.objectContaining({ title: 'Senior React Developer' }));
    expect(api.get).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/activity');
  });

  it('uses dedicated AI endpoints for job description, bench matching, and talent rediscovery', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.draftJobDescription({ title: 'Senior React Developer' } as never);
    await store.loadPmoReview('jr-1');
    await store.rankBenchMatches('jr-1');
    await store.rankTalentRediscovery('jr-1');

    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/description-draft', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/bench-matches/rank', {});
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/talent-rediscovery/rank', {});
  });

  it('loads the PMO dashboard through the dedicated PMO analytics endpoint', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.loadPmoDashboard({
      fromUtc: '2026-05-01T00:00:00.000Z',
      toUtc: '2026-05-31T23:59:59.999Z',
      departmentId: 'dept-1',
    });

    expect(api.get).toHaveBeenCalledWith(
      'talent-pilot/pmo/dashboard?fromUtc=2026-05-01T00%3A00%3A00.000Z&toUtc=2026-05-31T23%3A59%3A59.999Z&departmentId=dept-1',
    );
  });

  it('wires PMO recommendation and recruiter handoff actions to backend workflow endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.createEmployeeReferrals('jr-1', {
      employeeIds: ['emp-1'],
      presalesUserId: 'presales-1',
      recommendationSummary: 'Strong internal option.',
    });
    await store.forwardToRecruiters('jr-1');

    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/employee-referrals', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/forward-to-recruiters', {});
  });

  it('wires recruiter publishing, manual candidate, portal apply, and interview scheduling endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.loadRecruitmentQueue();
    await store.loadRecruiterSourcing('jr-1');
    await store.createJobPost('jr-1', { title: 'Senior React Developer' } as never);
    await store.updateJobPost('post-1', { title: 'Senior React Developer' } as never);
    await store.publishJobPost('post-1');
    await store.addManualCandidateToJobPost('post-1', { email: 'candidate@example.com' } as never);
    await store.rankApplicantRankings('post-1');
    await store.loadPortalInvitation('invite-1', 'tracked-token');
    await store.applyToPortalJobPost('post-1', { coverLetter: 'Interested.' } as never);
    await store.scheduleCandidateInterview('app-1', { jobPostInterviewRoundId: 'round-1' } as never);

    expect(api.get).toHaveBeenCalledWith('talent-pilot/recruitment/queue');
    expect(api.get).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/recruiter-sourcing');
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-requests/jr-1/job-posts', expect.any(Object));
    expect(api.put).toHaveBeenCalledWith('talent-pilot/job-posts/post-1', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-posts/post-1/publish', {});
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-posts/post-1/manual-candidates', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-posts/post-1/applicant-rankings/rank', {});
    expect(api.get).toHaveBeenCalledWith('talent-pilot/portal/invitations/invite-1?token=tracked-token');
    expect(api.post).toHaveBeenCalledWith('talent-pilot/portal/job-posts/post-1/applications', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-applications/app-1/interviews', expect.any(Object));
  });

  it('wires candidate portal profile GET and PUT endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.loadPortalCandidateProfile();
    await store.updatePortalCandidateProfile({
      displayName: 'Sara Malik',
      phone: '+92 300 555 0198',
      skills: [{ skillId: 'react', skillLevel: 'Advanced', isPrimary: true }],
    });

    expect(api.get).toHaveBeenCalledWith('talent-pilot/portal/profile');
    expect(api.put).toHaveBeenCalledWith('talent-pilot/portal/profile', expect.objectContaining({ displayName: 'Sara Malik' }));
  });

  it('wires candidate profile document upload and download endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);
    const file = new File(['docx'], 'sara-resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await store.uploadPortalCandidateProfileDocument(file);
    await store.downloadPortalCandidateProfileDocument('profile-doc-1');

    expect(api.post).toHaveBeenCalledWith('talent-pilot/portal/profile/documents', expect.any(FormData));
    expect(api.download).toHaveBeenCalledWith('talent-pilot/portal/profile/documents/profile-doc-1/download');
  });

  it('wires tenant-scoped portal context and public job listing endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.loadPortalJobPosts('tkxel');
    await store.loadPublicPortalContext({ tenantSlug: 'tkxel', jobPostId: 'post-1' });

    expect(api.get).toHaveBeenCalledWith('talent-pilot/portal/job-posts?tenantSlug=tkxel');
    expect(api.get).toHaveBeenCalledWith('portal/context?tenantSlug=tkxel&jobPostId=post-1');
  });

  it('wires interviewer feedback and hiring manager offer outcome endpoints', async () => {
    const store = TestBed.inject(TalentPilotStoreService);

    await store.loadMyInterviewTasks();
    await store.submitInterviewFeedback('interview-1', { recommendation: 'Proceed' } as never);
    await store.forwardToHiringManager('app-1');
    await store.loadHiringManagerReviews();
    await store.loadHiringReview('app-1');
    await store.generateOfferLetter('app-1', { compensation: 'Market aligned' } as never);
    await store.updateOfferLetter('offer-1', { body: 'Updated offer.' } as never);
    await store.scheduleOfferPresentationMeeting('offer-1', { physicalLocation: 'Office' } as never);
    await store.recordHiringOutcome('app-1', { outcome: 'Joined' } as never);

    expect(api.get).toHaveBeenCalledWith('talent-pilot/interviews/my-tasks');
    expect(api.post).toHaveBeenCalledWith('talent-pilot/interviews/interview-1/feedback', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-applications/app-1/forward-to-hiring-manager', {});
    expect(api.get).toHaveBeenCalledWith('talent-pilot/hiring-manager/reviews');
    expect(api.get).toHaveBeenCalledWith('talent-pilot/job-applications/app-1/hiring-review');
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-applications/app-1/offer-letter', expect.any(Object));
    expect(api.put).toHaveBeenCalledWith('talent-pilot/offer-letters/offer-1', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/offer-letters/offer-1/presentation-meeting', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('talent-pilot/job-applications/app-1/hiring-outcome', expect.any(Object));
  });
});
