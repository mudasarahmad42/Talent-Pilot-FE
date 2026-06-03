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
    auth.isAdmin.mockImplementation(() => currentUser().roles.includes('TenantAdmin'));
    store.loadMyInterviewTasks.mockReset();
    store.submitInterviewFeedback.mockReset();
    store.loadMyInterviewTasks.mockResolvedValue({ items: [buildTask()] });

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
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.feedbackTask()?.interviewId).toBe('interview-1');
    expect(pageText()).toContain('Add feedback');
    expect(pageText()).not.toContain('Admin override feedback');
  });

  it('keeps tenant admin read-only while assigned interviewer is active', async () => {
    currentUser.set(buildUser(['TenantAdmin'], 'admin-1'));
    store.loadMyInterviewTasks.mockResolvedValue({ items: [buildTask()] });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.feedbackTask()).toBeNull();
    expect(pageText()).toContain('Feedback is assigned to Bilal Hassan.');
    expect(pageText()).not.toContain('Admin override feedback');
  });

  it('allows tenant admin override when assigned interviewer is inactive', async () => {
    currentUser.set(buildUser(['TenantAdmin'], 'admin-1'));
    store.loadMyInterviewTasks.mockResolvedValue({
      items: [buildTask({ interviewerAccountStatus: 'Disabled' })],
    });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.feedbackTask()?.interviewId).toBe('interview-1');
    expect(pageText()).toContain('Admin override feedback');
    expect(pageText()).toContain(
      'This feedback will be recorded as an admin override because the assigned interviewer is inactive.',
    );
  });

  function pageText(): string {
    return normalizeText(fixture.nativeElement.textContent);
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

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
