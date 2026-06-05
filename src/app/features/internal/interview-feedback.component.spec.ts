import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CurrentUser, InterviewTask, TalentPilotRole } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { InterviewFeedbackComponent } from './interview-feedback.component';

describe('InterviewFeedbackComponent access policy', () => {
  const currentUser = signal<CurrentUser>(buildUser(['Interviewer']));
  const auth = {
    currentUser: currentUser.asReadonly(),
    isAdmin: vi.fn(() => currentUser().roles.includes('TenantAdmin')),
  };
  const store = {
    loadMyInterviewTasks: vi.fn(),
    loadInterviewQuestionRecommendations: vi.fn(),
    generateInterviewQuestionRecommendations: vi.fn(),
    downloadInterviewQuestionRecommendationsDocx: vi.fn(),
    submitInterviewFeedback: vi.fn(),
  };
  const route = {
    snapshot: {
      queryParamMap: convertToParamMap({ interviewId: 'interview-1' }),
    },
  };

  let fixture: ComponentFixture<InterviewFeedbackComponent>;
  let component: InterviewFeedbackComponent;

  beforeEach(async () => {
    currentUser.set(buildUser(['Interviewer']));
    route.snapshot.queryParamMap = convertToParamMap({ interviewId: 'interview-1' });
    auth.isAdmin.mockImplementation(() => currentUser().roles.includes('TenantAdmin'));
    store.loadMyInterviewTasks.mockReset();
    store.loadInterviewQuestionRecommendations.mockReset();
    store.generateInterviewQuestionRecommendations.mockReset();
    store.downloadInterviewQuestionRecommendationsDocx.mockReset();
    store.submitInterviewFeedback.mockReset();
    store.loadMyInterviewTasks.mockResolvedValue({ items: [buildTask()] });
    store.loadInterviewQuestionRecommendations.mockResolvedValue(null);
    store.generateInterviewQuestionRecommendations.mockResolvedValue(buildQuestionSet());

    await TestBed.configureTestingModule({
      imports: [InterviewFeedbackComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: auth },
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InterviewFeedbackComponent);
    component = fixture.componentInstance;
  });

  it('opens the requested assigned interview and shows normal feedback action', async () => {
    await renderLoaded();

    expect(component.feedbackTask()?.interviewId).toBe('interview-1');
    expect(pageText()).toContain('Add feedback');
    expect(pageText()).not.toContain('Admin override feedback');
  });

  it('keeps tenant admin read-only while assigned interviewer is active', async () => {
    currentUser.set(buildUser(['TenantAdmin'], 'admin-1'));
    store.loadMyInterviewTasks.mockResolvedValue({ items: [buildTask()] });

    await renderLoaded();

    expect(component.feedbackTask()).toBeNull();
    expect(pageText()).toContain('Feedback is assigned to Bilal Hassan.');
    expect(pageText()).not.toContain('Admin override feedback');
  });

  it('allows tenant admin override when assigned interviewer is inactive', async () => {
    currentUser.set(buildUser(['TenantAdmin'], 'admin-1'));
    store.loadMyInterviewTasks.mockResolvedValue({
      items: [buildTask({ interviewerAccountStatus: 'Disabled' })],
    });

    await renderLoaded();

    expect(component.feedbackTask()?.interviewId).toBe('interview-1');
    expect(pageText()).toContain('Admin override feedback');
    expect(pageText()).toContain(
      'This feedback will be recorded as an admin override because the assigned interviewer is inactive.',
    );
  });

  it('renders saved AI questions and keeps feedback form independent', async () => {
    store.loadInterviewQuestionRecommendations.mockResolvedValue(buildQuestionSet());

    await renderLoaded();

    expect(pageText()).toContain('AI interview questions');
    expect(pageText()).toContain('Probe React delivery depth for this technical round.');
    expect(pageText()).toContain('10 recommended questions');
    expect(pageText()).toContain('Open questions');
    expect(pageText()).not.toContain('Download DOCX');
    expect(pageText()).not.toContain('Regenerate');
    expect(pageText()).toContain('How did you keep the React UI maintainable?');
    expect(pageText()).toContain('Human interviewer owns the final assessment.');
    expect(component.feedbackForm.feedbackText).toBe('');

    component.openQuestionModal(component.tasks()[0]);
    fixture.detectChanges();

    expect(pageText()).toContain('Download DOCX');
    expect(pageText()).toContain('Regenerate');
    expect(pageText()).toContain('Expected signal');
  });

  it('separates active interviews from past interviews', async () => {
    route.snapshot.queryParamMap = convertToParamMap({});
    store.loadMyInterviewTasks.mockResolvedValue({
      items: [
        buildTask(),
        buildTask({
          interviewId: 'interview-2',
          candidateName: 'Mariam Siddiqui',
          status: 'Completed',
          recommendation: 'Proceed',
          technicalScore: 5,
          communicationScore: 4,
          cultureScore: 4,
          feedbackText: 'Strong interview evidence.',
          submittedAt: '2026-06-04T12:00:00Z',
        }),
      ],
    });

    await renderLoaded();

    expect(pageText()).toContain('Active interviews 1');
    expect(pageText()).toContain('Past interviews 1');
    expect(pageText()).toContain('Amara Haq');
    expect(pageText()).not.toContain('Mariam Siddiqui');

    component.setFeedbackTab('past');
    fixture.detectChanges();

    expect(pageText()).toContain('Mariam Siddiqui');
    expect(pageText()).toContain('Strong interview evidence.');
    expect(pageText()).not.toContain('Add feedback');
  });

  function pageText(): string {
    return normalizeText(fixture.nativeElement.textContent);
  }

  async function renderLoaded(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
    fixture.detectChanges();
  }
});

function buildUser(roles: TalentPilotRole[], id = 'user-1'): CurrentUser {
  return {
    id,
    name: 'Bilal Hassan',
    email: 'bilal@example.com',
    roles,
    groups: [],
  };
}

function buildTask(overrides: Partial<InterviewTask> = {}): InterviewTask {
  return {
    interviewId: 'interview-1',
    jobApplicationId: 'application-1',
    jobPostInterviewRoundId: 'round-1',
    jobRequestId: 'request-1',
    jobPostId: 'post-1',
    requestCode: 'TP-REQ-001',
    jobTitle: 'Senior React Developer',
    client: 'Client ABC',
    candidateName: 'Amara Haq',
    candidateEmail: 'amara@example.com',
    roundName: 'Technical Interview',
    interviewerName: 'Bilal Hassan',
    interviewerUserId: 'user-1',
    interviewerAccountStatus: 'Active',
    interviewerIsDeleted: false,
    scheduledByName: 'Sara Recruiter',
    startsAt: '2026-06-04T11:00:00Z',
    durationMinutes: 45,
    meetingLink: null,
    locationText: null,
    status: 'Scheduled',
    recommendation: null,
    technicalScore: null,
    communicationScore: null,
    cultureScore: null,
    feedbackText: null,
    submittedAt: null,
    ...overrides,
  };
}

function buildQuestionSet() {
  return {
    recommendationSetId: 'set-1',
    interviewId: 'interview-1',
    jobApplicationId: 'application-1',
    jobPostInterviewRoundId: 'round-1',
    agentRunId: 'run-1',
    model: 'llama3.2',
    promptVersion: 'interview-question-recommender-v1',
    versionNumber: 1,
    summary: 'Probe React delivery depth for this technical round.',
    rationale: 'The role needs practical frontend evidence.',
    regenerateReason: null,
    coverage: {
      roundType: 'Technical',
      targetQuestionCount: 10,
      bankItemsUsed: 3,
      semanticSimilarityStatus: 'Available',
      skillsCovered: ['React'],
      candidateEvidenceUsed: ['Job post'],
    },
    status: 'Active',
    generatedAtUtc: '2026-06-04T11:20:00Z',
    questions: Array.from({ length: 10 }, (_, index) => ({
      questionRecommendationId: `question-${index + 1}`,
      sortOrder: index + 1,
      questionText: index === 0
        ? 'How did you keep the React UI maintainable?'
        : `What React delivery signal would you probe next ${index + 1}?`,
      questionType: 'Technical',
      roundType: 'Technical',
      skillName: 'React',
      difficulty: 'Intermediate',
      rationale: 'Validates maintainability judgment.',
      expectedSignal: 'Names component boundaries and testing strategy.',
      followUps: ['What trade-off did you make?'],
      evaluationRubric: ['Specific project evidence', 'Clear trade-off'],
      sourceBankItemId: null,
    })),
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
