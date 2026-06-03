import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import {
  CurrentUser,
  PortalCandidateProfile,
  PortalJobPostDetail,
  PortalJobPostListItem,
  PortalMyApplicationItem,
} from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { CandidatePageComponent } from './candidate-page.component';

describe('CandidatePageComponent', () => {
  const userSignal = signal<CurrentUser | null>(null);
  let routeParamMap$: BehaviorSubject<ParamMap>;
  let routeQueryParamMap$: BehaviorSubject<ParamMap>;
  let routeData$: BehaviorSubject<Record<string, unknown>>;
  let store: {
    loadPortalJobPosts: ReturnType<typeof vi.fn>;
    loadPortalCandidateProfile: ReturnType<typeof vi.fn>;
    updatePortalCandidateProfile: ReturnType<typeof vi.fn>;
    loadPortalMyApplications: ReturnType<typeof vi.fn>;
    loadPortalJobPost: ReturnType<typeof vi.fn>;
    loadPortalInvitation: ReturnType<typeof vi.fn>;
    applyToPortalJobPost: ReturnType<typeof vi.fn>;
    uploadPortalApplicationDocument: ReturnType<typeof vi.fn>;
  };

  const jobs: PortalJobPostListItem[] = [
    {
      jobPostId: 'post-1',
      jobRequestId: 'jr-1',
      requestCode: 'TP-REQ-001',
      title: 'Senior React Developer',
      companyName: 'TKXEL Careers',
      client: 'Client ABC',
      department: 'Engineering',
      location: 'Lahore',
      experienceMinYears: 5,
      experienceMaxYears: 8,
      requiredPositions: 1,
      status: 'Published',
      publishedAt: '2026-06-01T00:00:00Z',
      skills: [{ skillId: 'react', name: 'React', category: 'Frontend' }],
    },
    {
      jobPostId: 'post-2',
      jobRequestId: 'jr-2',
      requestCode: 'TP-REQ-002',
      title: 'Finance Analyst',
      companyName: 'TKXEL Careers',
      client: 'Internal',
      department: 'Finance',
      location: 'Remote',
      experienceMinYears: 1,
      experienceMaxYears: 2,
      requiredPositions: 1,
      status: 'Published',
      publishedAt: '2026-06-01T00:00:00Z',
      skills: [{ skillId: 'excel', name: 'Excel', category: 'Finance' }],
    },
  ];
  const jobDetail: PortalJobPostDetail = {
    ...jobs[0],
    description: 'Role Summary Build customer-facing React applications. Responsibilities - Deliver features. Required Skills - React.',
  };
  const appliedReactApplication: PortalMyApplicationItem = {
    jobApplicationId: 'app-1',
    jobPostId: 'post-1',
    jobRequestId: 'jr-1',
    requestCode: 'TP-REQ-001',
    jobTitle: 'Senior React Developer',
    companyName: 'TKXEL Careers',
    client: 'Client ABC',
    department: 'Engineering',
    location: 'Lahore',
    status: 'Screening',
    sourceLabel: 'Portal',
    appliedAt: '2026-06-01T00:00:00Z',
    finalDecisionAt: null,
    finalDecisionReason: null,
    interviewsPassed: 0,
    interviewsTotal: 1,
    interviewPassSummary: '0/1 passed',
    documents: [],
    timeline: [],
  };
  const candidateUser: CurrentUser = {
    id: 'candidate-user',
    name: 'Sara Malik',
    email: 'sara@example.com',
    roles: ['Candidate'],
    groups: [],
  };
  const recruiterUser: CurrentUser = {
    id: 'recruiter-user',
    name: 'Sara Malik',
    email: 'sara.recruiter@example.com',
    roleDisplayName: 'Recruiter / HR',
    roles: ['Recruiter'],
    groups: [],
  };

  const profile: PortalCandidateProfile = {
    candidateId: 'candidate-1',
    displayName: 'Sara Malik',
    email: 'sara@example.com',
    phone: '',
    linkedInUrl: '',
    currentDesignation: 'React Developer',
    currentCompany: 'TKXEL',
    experienceYears: 5,
    expectedSalaryAmount: null,
    expectedSalaryCurrency: 'PKR',
    noticePeriodDays: 30,
    primaryEducation: { universityName: 'FAST', degreeName: 'BSCS', graduationYear: 2019 },
    currentWorkHistory: { companyName: 'TKXEL', title: 'React Developer' },
    skills: [{ skillId: 'react', skillName: 'React', skillLevel: 'Advanced', yearsExperience: 5, isPrimary: true }],
    skillOptions: [
      { skillId: 'react', skillName: 'React', category: 'Frontend' },
      { skillId: 'dotnet', skillName: '.NET', category: 'Backend' },
    ],
  };

  beforeEach(async () => {
    userSignal.set(null);
    routeParamMap$ = new BehaviorSubject(convertToParamMap({}));
    routeQueryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    routeData$ = new BehaviorSubject<Record<string, unknown>>({ pageId: 'jobs' });
    store = {
      loadPortalJobPosts: vi.fn().mockResolvedValue({ items: jobs }),
      loadPortalCandidateProfile: vi.fn().mockResolvedValue(profile),
      updatePortalCandidateProfile: vi.fn().mockResolvedValue(profile),
      loadPortalMyApplications: vi.fn().mockResolvedValue({ items: [] }),
      loadPortalJobPost: vi.fn().mockResolvedValue(jobDetail),
      loadPortalInvitation: vi.fn().mockResolvedValue({
        candidateInvitationId: '11111111-2222-3333-4444-555555555555',
        jobPostId: 'post-1',
        jobTitle: 'Senior React Developer',
        companyName: 'TKXEL Careers',
        status: 'Sent',
        expiresAtUtc: '2026-06-09T00:00:00Z',
        usedAtUtc: null,
        isExpired: false,
        isRevoked: false,
      }),
      applyToPortalJobPost: vi.fn(),
      uploadPortalApplicationDocument: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CandidatePageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParamMap$.asObservable(),
            queryParamMap: routeQueryParamMap$.asObservable(),
            data: routeData$.asObservable(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal.asReadonly(),
          },
        },
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();
  });

  async function flushCandidatePageLoad(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  }

  it('filters jobs by keyword, department, location, and experience', () => {
    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.jobPosts.set(jobs);

    component.jobFilters.search = 'react';
    component.jobFilters.department = 'Engineering';
    component.jobFilters.location = 'Lahore';
    component.jobFilters.experience = '5-plus';

    expect(component.visibleJobPosts().map((job) => job.jobPostId)).toEqual(['post-1']);
  });

  it('greys out already-applied jobs and removes the reapply action', async () => {
    userSignal.set(candidateUser);
    store.loadPortalMyApplications.mockResolvedValue({ items: [appliedReactApplication] });
    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await flushCandidatePageLoad();
    component.loading.set(false);
    component.jobPosts.set(jobs);
    component.myApplications.set([appliedReactApplication]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.portal-job-card-v2');
    const firstCard = cards[0] as HTMLElement;

    expect(firstCard.classList.contains('applied')).toBe(true);
    expect(firstCard.getAttribute('aria-disabled')).toBe('true');
    expect(firstCard.textContent).toContain('Applied');
    expect(firstCard.textContent).toContain('View Status');
    expect(firstCard.textContent).not.toContain('Apply Now');
  });

  it('blocks direct reapply submissions for an existing job application', async () => {
    routeData$.next({ pageId: 'apply' });
    routeParamMap$.next(convertToParamMap({ jobId: 'post-1' }));
    userSignal.set(candidateUser);
    store.loadPortalMyApplications.mockResolvedValue({ items: [appliedReactApplication] });

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await flushCandidatePageLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Already applied');
    expect(fixture.nativeElement.textContent).not.toContain('Submit Application');

    component.applicationConsentAccepted = true;
    await component.submitApplication();

    expect(store.applyToPortalJobPost).not.toHaveBeenCalled();
    expect(component.applicationResult()).toEqual(
      expect.objectContaining({
        jobApplicationId: 'app-1',
        jobPostId: 'post-1',
        alreadyApplied: true,
      }),
    );
    expect(component.success()).toContain('already applied');
  });

  it('collects interview availability as a submitted date range', async () => {
    routeData$.next({ pageId: 'apply' });
    routeParamMap$.next(convertToParamMap({ jobId: 'post-1' }));
    userSignal.set(candidateUser);
    store.applyToPortalJobPost.mockResolvedValue({
      jobApplicationId: 'new-app',
      jobPostId: 'post-1',
      jobRequestId: 'jr-1',
      status: 'Applied',
      alreadyApplied: false,
    });

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await flushCandidatePageLoad();
    fixture.detectChanges();

    const availabilityDateInputs = fixture.nativeElement.querySelectorAll(
      '.portal-date-range-control input[type="date"]',
    );
    expect(availabilityDateInputs).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('input[name="interviewAvailability"]')).toBeNull();

    component.applyForm.interviewAvailabilityStartDate = '2026-06-10';
    component.applyForm.interviewAvailabilityEndDate = '2026-06-14';
    component.applicationConsentAccepted = true;

    await component.submitApplication();

    expect(store.applyToPortalJobPost).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        interviewAvailabilityStartDate: '2026-06-10',
        interviewAvailabilityEndDate: '2026-06-14',
      }),
    );
  });

  it('submits tracked invite credentials with the application', async () => {
    routeData$.next({ pageId: 'apply' });
    routeParamMap$.next(convertToParamMap({ jobId: 'post-1' }));
    routeQueryParamMap$.next(
      convertToParamMap({
        source: 'invite',
        inviteId: '11111111-2222-3333-4444-555555555555',
        token: 'tracked-token',
      }),
    );
    userSignal.set(candidateUser);
    store.applyToPortalJobPost.mockResolvedValue({
      jobApplicationId: 'new-app',
      jobPostId: 'post-1',
      jobRequestId: 'jr-1',
      status: 'Applied',
      alreadyApplied: false,
    });

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await flushCandidatePageLoad();
    fixture.detectChanges();

    component.applicationConsentAccepted = true;
    await component.submitApplication();

    expect(store.loadPortalInvitation).toHaveBeenCalledWith(
      '11111111-2222-3333-4444-555555555555',
      'tracked-token',
    );
    expect(store.applyToPortalJobPost).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        candidateInvitationId: '11111111-2222-3333-4444-555555555555',
        invitationToken: 'tracked-token',
      }),
    );
  });

  it('marks application section cards complete when their related fields are filled', async () => {
    routeData$.next({ pageId: 'apply' });
    routeParamMap$.next(convertToParamMap({ jobId: 'post-1' }));
    userSignal.set(candidateUser);
    store.loadPortalCandidateProfile.mockResolvedValue({
      ...profile,
      phone: '+92 300 555 0198',
      currentDesignation: 'React Developer',
      currentCompany: 'TKXEL',
      experienceYears: 5,
      primaryEducation: { universityName: 'FAST', degreeName: 'BSCS', graduationYear: 2019 },
    });

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await flushCandidatePageLoad();
    fixture.detectChanges();

    let sectionCards = fixture.nativeElement.querySelectorAll('.portal-application-sections button');
    expect(sectionCards).toHaveLength(3);
    expect(Array.from(sectionCards).map((card) => (card as HTMLElement).classList.contains('complete'))).toEqual([
      true,
      false,
      false,
    ]);
    expect(fixture.nativeElement.textContent).toContain('check_circle');

    component.selectedDocumentFile.set(
      new File(['resume'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    component.applicationConsentAccepted = true;
    expect(component.applicationCvSectionComplete()).toBe(true);
    expect(component.applicationReviewSectionComplete()).toBe(true);
  });

  it('loads profile shell, submits profile updates, and tracks completeness', async () => {
    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.populateProfileForm(profile);
    component.profileForm.phone = '+92 300 555 0198';
    component.selectedProfileSkillIds.set(new Set(['react', 'dotnet']));

    await component.savePortalProfile();

    expect(store.updatePortalCandidateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Sara Malik',
        phone: '+92 300 555 0198',
        skills: expect.arrayContaining([expect.objectContaining({ skillId: 'react' })]),
      }),
    );
    expect(component.profileCompletionPercent()).toBeGreaterThan(70);
  });

  it('does not render account settings on the candidate profile page', async () => {
    routeData$.next({ pageId: 'profile' });
    userSignal.set(candidateUser);

    const fixture = TestBed.createComponent(CandidatePageComponent);

    fixture.detectChanges();
    await flushCandidatePageLoad();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Resume / CV');
    expect(text).not.toContain('Account Settings');
    expect(text).not.toContain('Managed by Talent Pilot login');
  });

  it('shows email verification only when the profile has verification evidence', async () => {
    routeData$.next({ pageId: 'profile' });
    userSignal.set(candidateUser);

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    component.loading.set(false);
    component.populateProfileForm(profile);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Email verified');

    component.populateProfileForm({
      ...profile,
      isEmailVerified: false,
      emailVerifiedAtUtc: '2026-06-01T10:00:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Email verified');

    component.populateProfileForm({
      ...profile,
      emailVerifiedAtUtc: '2026-06-01T10:00:00Z',
    });
    fixture.detectChanges();

    const verifiedChip = fixture.nativeElement.querySelector('.profile-verified-chip') as HTMLElement;
    expect(verifiedChip?.textContent).toContain('Email verified');
    expect(verifiedChip?.getAttribute('title')).toContain('Verified on');
  });

  it('keeps candidate-only stats gated by Candidate role', () => {
    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;

    expect(component.isCandidateUser()).toBe(false);

    userSignal.set({
      id: 'candidate-user',
      name: 'Sara Malik',
      email: 'sara@example.com',
      roles: ['Candidate'],
      groups: [],
    });

    const application: PortalMyApplicationItem = {
      jobApplicationId: 'app-1',
      jobPostId: 'post-1',
      jobRequestId: 'jr-1',
      requestCode: 'TP-REQ-001',
      jobTitle: 'Senior React Developer',
      companyName: 'TKXEL Careers',
      client: 'Client ABC',
      department: 'Engineering',
      location: 'Lahore',
      status: 'Interviewing',
      sourceLabel: 'Portal',
      appliedAt: '2026-06-01T00:00:00Z',
      finalDecisionAt: null,
      finalDecisionReason: null,
      interviewsPassed: 0,
      interviewsTotal: 1,
      interviewPassSummary: '0/1 passed',
      documents: [],
      timeline: [
        {
          kind: 'Interview',
          title: 'Technical Interview',
          description: 'Scheduled by recruiter.',
          occurredAt: '2099-01-01T10:00:00Z',
          status: 'Scheduled',
        },
      ],
    };
    component.myApplications.set([application]);

    expect(component.isCandidateUser()).toBe(true);
    expect(component.upcomingInterviewCount()).toBe(1);
    expect(component.candidateNextStep()).toContain('Technical Interview');
  });

  it('renders my applications as tracker cards with filters and next-step actions', () => {
    routeData$.next({ pageId: 'my-applications' });
    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.loading.set(false);
    component.myApplicationFilters.dateRange = 'all';
    component.myApplications.set([
      {
        jobApplicationId: 'app-1',
        jobPostId: 'post-1',
        jobRequestId: 'jr-1',
        requestCode: 'TP-REQ-001',
        jobTitle: 'Senior React Developer',
        companyName: 'TKXEL Careers',
        client: 'Client ABC',
        department: 'Engineering',
        location: 'Lahore',
        status: 'Interviewing',
        sourceLabel: 'Portal',
        appliedAt: '2026-06-01T00:00:00Z',
        finalDecisionAt: null,
        finalDecisionReason: null,
        interviewsPassed: 0,
        interviewsTotal: 1,
        interviewPassSummary: '0/1 passed',
        documents: [],
        timeline: [
          {
            kind: 'Interview',
            title: 'Technical Interview',
            description: 'Scheduled by recruiter.',
            occurredAt: '2099-01-01T10:00:00Z',
            status: 'Scheduled',
          },
        ],
      },
    ]);

    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelectorAll('.application-tracker-card')).toHaveLength(1);
    expect(text).toContain('My Applications');
    expect(text).toContain('Senior React Developer');
    expect(text).toContain('Prepare Now');
    expect(text).toContain('Career Guide: Nailing the Technical Interview');
  });

  it('hides the invited callout on regular job detail visits', () => {
    routeData$.next({ pageId: 'job-detail' });
    routeParamMap$.next(convertToParamMap({ id: 'post-1' }));
    routeQueryParamMap$.next(convertToParamMap({}));

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.jobPost.set(jobDetail);
    component.loading.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain("You've been invited to apply");
    expect(fixture.nativeElement.textContent).toContain('Job Summary');
  });

  it('shows the invited callout when the job detail URL is marked as an invite link', () => {
    routeData$.next({ pageId: 'job-detail' });
    routeParamMap$.next(convertToParamMap({ id: 'post-1' }));
    routeQueryParamMap$.next(convertToParamMap({ source: 'invite' }));
    userSignal.set(candidateUser);

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.jobPost.set(jobDetail);
    component.loading.set(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("You've been invited to apply");
    expect(fixture.nativeElement.textContent).toContain('Start Application');
  });

  it('hides tracked invite identity and carries it into the application route', () => {
    routeData$.next({ pageId: 'job-detail' });
    routeParamMap$.next(convertToParamMap({ id: 'post-1' }));
    routeQueryParamMap$.next(
      convertToParamMap({
        source: 'invite',
        inviteId: '11111111-2222-3333-4444-555555555555',
        token: 'tracked-token',
      }),
    );
    userSignal.set(candidateUser);

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.jobPost.set(jobDetail);
    component.portalInvitation.set({
      candidateInvitationId: '11111111-2222-3333-4444-555555555555',
      jobPostId: 'post-1',
      jobTitle: 'Senior React Developer',
      companyName: 'TKXEL Careers',
      status: 'Sent',
      expiresAtUtc: '2026-06-09T00:00:00Z',
      usedAtUtc: null,
      isExpired: false,
      isRevoked: false,
    });
    component.loading.set(false);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.job-detail-invite-card a') as HTMLAnchorElement;
    expect(fixture.nativeElement.textContent).not.toContain('Invitation ID');
    expect(link.getAttribute('href')).toContain('inviteId=11111111-2222-3333-4444-555555555555');
    expect(link.getAttribute('href')).toContain('token=tracked-token');
  });

  it('sends internal users to candidate sign-in with the apply return URL', () => {
    routeData$.next({ pageId: 'job-detail' });
    routeParamMap$.next(convertToParamMap({ id: 'post-1' }));
    routeQueryParamMap$.next(convertToParamMap({ source: 'invite' }));
    userSignal.set(recruiterUser);

    const fixture = TestBed.createComponent(CandidatePageComponent);
    const component = fixture.componentInstance;
    component.jobPost.set(jobDetail);
    component.loading.set(false);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.job-detail-invite-card a') as HTMLAnchorElement;
    const href = link.getAttribute('href') ?? '';
    expect(fixture.nativeElement.textContent).toContain('Switch account to apply');
    expect(href).toContain('/auth/login');
    expect(decodeURIComponent(href)).toContain('returnUrl=/candidate/apply/post-1?source=invite');
    expect(href).toContain('switchAccount=candidate');
  });
});
