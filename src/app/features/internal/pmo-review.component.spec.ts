import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { PmoReviewComponent } from './pmo-review.component';

describe('PmoReviewComponent', () => {
  const currentUser = signal<{
    id: string;
    roles: string[];
    displayName?: string;
    name?: string;
    email?: string;
  }>({ id: 'pmo-1', roles: ['PMO'] });
  const review = {
    jobRequest: {
      id: 'jr-1',
      code: 'TP-REQ-001',
      title: 'Senior React Developer',
      client: 'Relia',
      department: 'Engineering',
      description: 'React role for portal work.',
      fulfilledPositions: 0,
      requiredPositions: 1,
      experience: '5-8 years',
      location: 'Lahore',
      skills: ['React', 'Azure'],
      stage: 'PMO Review',
    },
    assignment: {
      id: 'assignment-1',
      status: 'Claimed',
      claimedByUserId: 'pmo-1',
      assignedToUserId: null,
      assignedToGroupId: 'group-pmo-engineering',
    },
    recruiterHandoffTargetName: 'Recruiting',
    defaultPresalesUserId: 'presales-1',
    presalesUsers: [{ id: 'presales-1', name: 'Ahmed Raza' }],
    existingReferrals: [],
    referrals: [],
    eligibleEmployees: [
      {
        employeeId: 'employee-1',
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
    benchMatches: [],
  };
  const store = {
    getPmoReviewByRequestId: vi.fn(() => review),
    loadPmoReview: vi.fn().mockResolvedValue(review),
    claimAssignment: vi.fn().mockResolvedValue(undefined),
    rankBenchMatches: vi.fn().mockResolvedValue({
      benchMatches: [
        {
          employeeId: 'employee-1',
          rank: 1,
          fitScore: 92,
          confidence: 'High',
          generatedAt: '2026-05-31T00:00:00Z',
          webResearchStatus: 'Skipped:LiveContextNotRequired',
          strengths: ['Matches React and Azure.'],
          gaps: [],
          caveats: [],
          projectEvidence: [],
          webSources: [],
        },
      ],
      webResearchStatus: 'Skipped:LiveContextNotRequired',
    }),
    createEmployeeReferrals: vi.fn().mockResolvedValue(undefined),
    forwardToRecruiters: vi.fn().mockResolvedValue(undefined),
  };

  let fixture: ComponentFixture<PmoReviewComponent>;
  let component: PmoReviewComponent;

  beforeEach(async () => {
    Object.values(store).forEach((method) => method.mockClear());
    store.getPmoReviewByRequestId.mockReturnValue(review);
    store.loadPmoReview.mockResolvedValue(review);
    currentUser.set({ id: 'pmo-1', roles: ['PMO'] });

    await TestBed.configureTestingModule({
      imports: [PmoReviewComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: currentUser.asReadonly() } },
        { provide: TalentPilotStoreService, useValue: store },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ jobRequestId: 'jr-1' }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PmoReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads PMO Review work and allows AI ranking only after claim or direct assignment', () => {
    expect(store.loadPmoReview).toHaveBeenCalledWith('jr-1');
    expect(component.canRank()).toBe(true);

    currentUser.set({ id: 'other-pmo', roles: ['PMO'] });

    expect(component.canRank()).toBe(false);
  });

  it('shows assignment status in the header without duplicating PMO Queue navigation', () => {
    const text = fixture.nativeElement.textContent;
    const statusBadge = fixture.nativeElement.querySelector('[aria-label="PMO review assignment status"]') as HTMLElement;

    expect(text).not.toContain('PMO Queue');
    expect(text).toContain('Assignment: Claimed');
    expect(statusBadge.className).toContain('status-badge--claimed');
  });

  it('explains PMO review visibility when the current role cannot open the page', () => {
    currentUser.set({ id: 'interviewer-1', roles: ['Interviewer'], displayName: 'Bilal Hussain' });
    component.loadError.set('Generic unavailable message.');

    expect(component.pmoUnavailableTitle()).toBe('PMO Review not visible for this role');
    expect(component.pmoUnavailableMessage()).toContain('Bilal Hussain');
    expect(component.pmoUnavailableMessage()).toContain('Switch to a PMO or Tenant Admin demo account');
  });

  it('runs Bench Matching AI without making PMO recommendation decisions automatically', async () => {
    await component.rankWithAi();

    expect(store.rankBenchMatches).toHaveBeenCalledWith('jr-1');
    expect(store.createEmployeeReferrals).not.toHaveBeenCalled();
    expect(component.statusMessage()).toContain('Bench Matching ranked 1 employee');
  });

  it('puts skill mismatch first and removes invalid experience shortfall from bench rationale', async () => {
    const javaEmployee = {
      employeeId: 'employee-java',
      displayName: 'Zain Javaid',
      email: 'zain@example.com',
      designation: 'Senior Java Engineer',
      department: 'Engineering',
      location: 'Lahore',
      experienceYears: 6.8,
      availabilityStatus: 'Available',
      benchStatus: 'Benched',
      isCurrentlyBenched: true,
      joiningDate: '2021-02-15T00:00:00Z',
      skills: ['Java', 'Spring Boot', 'SQL'],
      matchedSkills: ['SQL'],
      missingSkills: ['AWS', 'Design Patterns', 'Python'],
      projectEvidence: [],
    };
    const pythonReview = {
      ...review,
      jobRequest: {
        ...review.jobRequest,
        title: 'Senior Python Developer',
        experience: '3+ years',
        skills: ['Design Patterns', 'AWS', 'SQL', 'Python'],
      },
      eligibleEmployees: [javaEmployee],
      benchMatches: [
        {
          employeeId: 'employee-java',
          rank: 1,
          score: 42,
          confidence: 'Low',
          explanation:
            'Zain Javaid has 6.8 years of experience as a Senior Java Engineer, which is less than the required 3+ years. He has SQL evidence but lacks AWS, Design Patterns, and Python. The ranking is based on limited experience and skill gaps.',
          strengths: ['Matches SQL.'],
          gaps: ['Missing Python.'],
          projectEvidence: [],
          webResearchStatus: 'Skipped:LiveContextNotRequired',
          webSummary: '',
          webSources: [],
          generatedAt: '2026-06-04T00:00:00Z',
        },
      ],
    };
    store.getPmoReviewByRequestId.mockReturnValue(pythonReview as unknown as typeof review);
    store.loadPmoReview.mockResolvedValue(pythonReview as unknown as typeof review);
    fixture.destroy();
    fixture = TestBed.createComponent(PmoReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const rationale = component.rationaleFor(javaEmployee, pythonReview.benchMatches[0] as never);

    expect(rationale).toContain("Zain Javaid's profile is primarily Java");
    expect(rationale).toContain('this request is centered on Python, Design Patterns, AWS, and SQL');
    expect(rationale).toContain('current tenant evidence only supports SQL');
    expect(rationale).toContain('not preferred until missing Python, AWS, and Design Patterns evidence is validated');
    expect(rationale).toContain('limited required-skill evidence and skill gaps');
    expect(rationale).not.toMatch(/less than/i);
    expect(rationale).not.toMatch(/limited experience/i);
  });

  it('sends selected employee recommendations to Presales only after manual PMO selection', async () => {
    component.toggleEmployee('employee-1');
    component.presalesUserId.set('presales-1');
    component.recommendationSummary.set('Recommend Hamza first.');

    await component.recommend();

    expect(store.createEmployeeReferrals).toHaveBeenCalledWith('jr-1', {
      employeeIds: ['employee-1'],
      presalesUserId: 'presales-1',
      recommendationSummary: 'Recommend Hamza first.',
    });
    expect(component.selectedEmployeeIds()).toEqual([]);
  });

  it('can forward the request to recruiters when PMO does not recommend internally', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.forwardToRecruiters();

    expect(store.forwardToRecruiters).toHaveBeenCalledWith('jr-1');
    expect(navigate).toHaveBeenCalledWith(['/app/job-requests', 'jr-1']);
  });
});
