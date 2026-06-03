import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser, InterviewTask, TalentPilotRole } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { CandidateOperationsDataService } from './candidate-operations-data.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent interviewer dashboard', () => {
  const currentUser = signal<CurrentUser>(buildUser(['Interviewer']));
  const auth = {
    currentUser: currentUser.asReadonly(),
    isAdmin: vi.fn(() => currentUser().roles.includes('TenantAdmin')),
    hasAnyRole: vi.fn((roles: TalentPilotRole[]) => roles.some((role) => currentUser().roles.includes(role))),
  };
  const store = {
    unreadCountForUser: vi.fn(() => 0),
    myWork: vi.fn(() => []),
    pmoQueue: vi.fn(() => []),
    activity: vi.fn(() => []),
    openJobRequests: vi.fn(() => []),
    jobRequests: vi.fn(() => []),
    assignments: vi.fn(() => []),
    people: vi.fn(() => []),
    loadTenantAdminDashboard: vi.fn().mockResolvedValue(null),
    loadPmoDashboard: vi.fn().mockResolvedValue(null),
    loadHiringManagerDashboard: vi.fn().mockResolvedValue(null),
    loadMyInterviewTasks: vi.fn(),
  };
  const candidateOperations = {
    load: vi.fn().mockResolvedValue(null),
  };

  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T10:00:00Z'));
    currentUser.set(buildUser(['Interviewer']));
    Object.values(store).forEach((method) => method.mockClear());
    Object.values(candidateOperations).forEach((method) => method.mockClear());
    auth.isAdmin.mockClear();
    auth.hasAnyRole.mockClear();
    store.loadTenantAdminDashboard.mockResolvedValue(null);
    store.loadPmoDashboard.mockResolvedValue(null);
    store.loadHiringManagerDashboard.mockResolvedValue(buildHiringManagerDashboard());
    store.loadMyInterviewTasks.mockResolvedValue({ items: buildInterviewTasks() });
    candidateOperations.load.mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: TalentPilotStoreService, useValue: store },
        { provide: CandidateOperationsDataService, useValue: candidateOperations },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the My Interviews dashboard for interviewer users', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = pageText();
    expect(store.loadMyInterviewTasks).toHaveBeenCalled();
    expect(text).toContain('My interviews');
    expect(text).toContain('your interview schedule and feedback queue');
    expect(text).toContain("Today's interviews");
    expect(text).toContain('Upcoming interviews');
    expect(text).toContain('Pending feedback');
    expect(text).toContain('Recently submitted feedback');
    expect(text).toContain('Amara Haq');
    expect(text).toContain('Alex Morgan');
    expect(text).not.toContain('recruitment ecosystem health');
  });

  it('derives today, upcoming, pending, overdue, and completed counts from interview tasks', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.interviewer-kpi-grid .ops-stat-card'),
    ).map((element) => ({
      label: normalizeText(element.querySelector('span:not(.material-symbols-outlined)')?.textContent),
      value: normalizeText(element.querySelector('strong')?.textContent),
      detail: normalizeText(element.querySelector('small')?.textContent),
    }));

    expect(cards[0]).toEqual({ label: 'Today', value: '2', detail: 'Scheduled interviews' });
    expect(cards[1]).toEqual({ label: 'Upcoming', value: '2', detail: 'Future interviews' });
    expect(cards[2]).toEqual({ label: 'Pending feedback', value: '3', detail: 'Needs your input' });
    expect(cards[3]).toEqual({ label: 'Overdue', value: '1', detail: 'Past scheduled time' });
    expect(cards[4]).toEqual({ label: 'Submitted', value: '1', detail: 'Feedback completed' });
    expect(pageText()).toContain('4.3/5');
  });

  it('links interviewer feedback actions to the exact interview task', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const addFeedbackLink = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a.btn.primary.compact'),
    ).find((link) => normalizeText(link.textContent) === 'Add feedback');

    expect(addFeedbackLink?.getAttribute('href')).toContain('/app/interview-feedback');
    expect(addFeedbackLink?.getAttribute('href')).toContain('interviewId=interview-overdue');
  });

  it('shows an empty state when no interview tasks are assigned', async () => {
    store.loadMyInterviewTasks.mockResolvedValue({ items: [] });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = pageText();
    expect(text).toContain('No interview tasks assigned');
    expect(text).toContain('Open feedback workbench');
  });

  it('keeps admin, PMO, and recruiter dashboard branches routed correctly', () => {
    currentUser.set(buildUser(['TenantAdmin']));
    fixture.detectChanges();
    expect(pageText()).toContain('Tenant Admin Dashboard');
    expect(pageText()).not.toContain('My interviews');
    fixture.destroy();

    currentUser.set(buildUser(['PMO']));
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(pageText()).toContain('PMO Review Dashboard');
    expect(pageText()).not.toContain('My interviews');
    fixture.destroy();

    currentUser.set(buildUser(['Recruiter']));
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(pageText()).toContain('Sourcing Overview');
    expect((fixture.nativeElement as HTMLElement).querySelector('.recruiter-overview-tabs')).toBeNull();
    expect(pageText()).not.toContain('My interviews');
  });

  it('shows the Hiring Manager dashboard for hiring manager users', async () => {
    currentUser.set(buildUser(['HiringManager']));
    fixture = TestBed.createComponent(DashboardComponent);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = pageText();
    expect(store.loadHiringManagerDashboard).toHaveBeenCalled();
    expect(text).toContain('Your final review queue, offer follow-ups, and hiring outcomes');
    expect(text).toContain('Pending reviews');
    expect(text).toContain('Priority decision queue');
    expect(text).toContain('Amara Haq');
    expect(text).toContain('Open review');
    expect(text).toContain('Hiring Manager Decision Brief');
    expect(text).not.toContain('Open next review');
    expect(text).not.toContain('View all reviews');
    expect(text).not.toContain('Offer outcome');
    expect(text).not.toContain('Schedule Interview');
    expect(text).not.toContain('recruitment ecosystem health');
  });

  it('shows claimed recruiter ownership and keeps requisition actions in a row menu', async () => {
    currentUser.set(buildUser(['Recruiter']));
    candidateOperations.load.mockResolvedValue(buildRecruiterDataset());

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const firstRow = (fixture.nativeElement as HTMLElement).querySelector('.open-requisition-table tbody tr');
    const ownerCell = firstRow?.querySelector('td:nth-child(4)');
    const actionCell = firstRow?.querySelector('td:nth-child(5)');

    const ownerText = normalizeText(ownerCell?.textContent);
    expect(ownerText).toContain('Claimed by Sara Malik');
    expect(ownerText).toContain('2026');
    expect(ownerText).not.toContain('Edit');
    expect(actionCell?.querySelector('.recruiter-row-menu')).not.toBeNull();
    expect(normalizeText(actionCell?.textContent)).toContain('Open workspace');
  });

  function pageText(): string {
    return normalizeText(fixture.nativeElement.textContent);
  }
});

function buildUser(roles: TalentPilotRole[]): CurrentUser {
  return {
    id: 'user-1',
    name: 'Bilal Hassan',
    email: 'bilal@example.com',
    roles,
    groups: [],
  };
}

function buildInterviewTasks(): InterviewTask[] {
  return [
    buildTask({
      interviewId: 'interview-overdue',
      candidateName: 'Amara Haq',
      startsAt: '2026-06-03T08:00:00Z',
      status: 'Scheduled',
      locationText: 'Office room 4',
    }),
    buildTask({
      interviewId: 'interview-today',
      candidateName: 'Alex Morgan',
      startsAt: '2026-06-03T11:00:00Z',
      status: 'Scheduled',
      meetingLink: 'https://meet.example.com/interview-today',
    }),
    buildTask({
      interviewId: 'interview-upcoming',
      candidateName: 'Sara Malik',
      startsAt: '2026-06-04T09:00:00Z',
      status: 'Scheduled',
    }),
    buildTask({
      interviewId: 'interview-completed',
      candidateName: 'Naveed Khan',
      startsAt: '2026-06-01T09:00:00Z',
      status: 'Completed',
      recommendation: 'Proceed',
      technicalScore: 4,
      communicationScore: 5,
      cultureScore: 4,
      submittedAt: '2026-06-02T12:00:00Z',
    }),
  ];
}

function buildTask(overrides: Partial<InterviewTask>): InterviewTask {
  return {
    interviewId: 'interview-1',
    jobApplicationId: 'application-1',
    jobPostInterviewRoundId: 'round-1',
    jobRequestId: 'request-1',
    jobPostId: 'post-1',
    requestCode: 'TP-REQ-001',
    jobTitle: 'Senior React Developer',
    client: 'Client ABC',
    candidateName: 'Candidate',
    candidateEmail: 'candidate@example.com',
    roundName: 'Technical Interview',
    interviewerName: 'Bilal Hassan',
    interviewerUserId: 'user-1',
    interviewerAccountStatus: 'Active',
    interviewerIsDeleted: false,
    scheduledByName: 'Sara Recruiter',
    startsAt: '2026-06-03T11:00:00Z',
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

function buildRecruiterDataset() {
  return {
    jobPosts: [],
    queueItems: [
      {
        jobRequest: {
          id: 'request-1',
          code: 'TP-DEMO-101',
          title: 'Senior Java Backend Engineer',
          client: 'AZAQ Saudia Arabia',
          department: 'Engineering',
          location: 'Lahore',
          stage: 'Recruiter Sourcing',
          createdAt: '2026-05-12T10:00:00Z',
        },
        assignment: {
          id: 'assignment-1',
          entityId: 'request-1',
          assignedAt: '2026-05-12T10:00:00Z',
          assignedToUserId: 'recruiter-1',
          claimedByUserId: 'recruiter-1',
          status: 'Claimed',
        },
        jobPostStatus: 'Published',
        recruiterOwnerName: 'Sara Malik',
        jobPostUpdatedAt: '2026-06-02T18:50:00Z',
      },
    ],
    sourcing: [],
    applications: [],
    candidates: [],
    interviews: [],
  };
}

function buildHiringManagerDashboard() {
  return {
    generatedAtUtc: '2026-06-03T10:00:00Z',
    summary: {
      pendingReviews: 1,
      offerFollowUps: 1,
      onHold: 0,
      completedOutcomes: 0,
      oldestWaitingDays: 3,
    },
    priorityReviews: [
      {
        jobApplicationId: 'application-1',
        jobRequestId: 'request-1',
        jobPostId: 'post-1',
        requestCode: 'TP-REQ-019',
        jobTitle: 'Senior React Developer',
        client: 'Client ABC',
        department: 'Engineering',
        candidateName: 'Amara Haq',
        candidateEmail: 'amara@example.com',
        status: 'HiringManagerReview',
        hiringManagerName: 'Fatima Noor',
        updatedAt: '2026-06-02T10:00:00Z',
        daysWaiting: 3,
        completedInterviews: 3,
        averageScore: 4.2,
        positiveRecommendations: 3,
        offerLetterStatus: 'Draft',
        latestMeetingAt: null,
      },
    ],
    offerPipeline: [
      { status: 'Offer draft', count: 1 },
      { status: 'Meeting scheduled', count: 0 },
      { status: 'Offered', count: 0 },
      { status: 'On hold', count: 0 },
      { status: 'Joined', count: 0 },
      { status: 'Rejected', count: 0 },
    ],
    agingBuckets: [
      { label: '0-1 days', count: 0 },
      { label: '2-3 days', count: 1 },
      { label: '4-7 days', count: 0 },
      { label: '8+ days', count: 0 },
    ],
    outcomeSplit: [
      { status: 'Offered', count: 0 },
      { status: 'Rejected', count: 0 },
      { status: 'On hold', count: 0 },
      { status: 'Joined', count: 0 },
    ],
    recentActivity: [
      {
        id: 'activity-1',
        jobApplicationId: 'application-1',
        jobRequestId: 'request-1',
        requestCode: 'TP-REQ-019',
        candidateName: 'Amara Haq',
        actorName: 'Sara Malik',
        title: 'job_application.forwarded_to_hiring_manager',
        detail: 'Amara Haq forwarded to Hiring Manager Review.',
        createdAt: '2026-06-02T10:00:00Z',
      },
    ],
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
