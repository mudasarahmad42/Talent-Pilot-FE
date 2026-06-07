import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApplicantRankingMatch, InterviewerOption, JobPostInterviewRound, OnlineCandidateLead, ParseCandidateCvResult, RecruiterSourcing } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RecruiterSourcingComponent } from './recruiter-sourcing.component';

describe('RecruiterSourcingComponent skill picker behavior', () => {
  const currentUser = signal({ id: 'recruiter-1', roles: ['Recruiter'] });
  const recruiterSourcingRefresh = signal<{ jobRequestId: string; reason: string; at: string } | null>(null);
  const store = {
    loadRecruiterSourcing: vi.fn(),
    scheduleCandidateInterview: vi.fn(),
    searchOnlineCandidates: vi.fn(),
    updateOnlineCandidateLeadStatus: vi.fn(),
    recruiterSourcingRefresh: recruiterSourcingRefresh.asReadonly(),
  };
  const auth = {
    currentUser: currentUser.asReadonly(),
    isAdmin: vi.fn(() => false),
  };
  const route = {
    snapshot: {
      paramMap: convertToParamMap({ jobRequestId: 'jr-1' }),
      queryParamMap: convertToParamMap({}),
    },
  };

  let fixture: ComponentFixture<RecruiterSourcingComponent>;
  let component: RecruiterSourcingComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterSourcingComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: auth },
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterSourcingComponent);
    component = fixture.componentInstance;
    currentUser.set({ id: 'recruiter-1', roles: ['Recruiter'] });
    recruiterSourcingRefresh.set(null);
    store.loadRecruiterSourcing.mockReset();
    store.scheduleCandidateInterview.mockReset();
    store.searchOnlineCandidates.mockReset();
    store.updateOnlineCandidateLeadStatus.mockReset();
    auth.isAdmin.mockReturnValue(false);
  });

  it('hydrates existing job post skill IDs and exposes grouped tabs', () => {
    const sourcing = buildSourcing('Draft');
    component.sourcing.set(sourcing);
    component['hydrateForm'](sourcing);

    expect(component.form.skillIds).toEqual(['skill-react']);
    expect(component.postSkillGroupTabs(sourcing.skills)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Frontend Engineer', count: 1 }),
        expect.objectContaining({ label: 'DevOps Engineer', count: 1 }),
      ]),
    );
  });

  it('searches skills across all groups', () => {
    const sourcing = buildSourcing('Draft');
    component.sourcing.set(sourcing);

    component.setPostSkillSearch({ target: { value: 'terraform' } } as unknown as Event);

    expect(component.postVisibleSkills(sourcing.skills).map((skill) => skill.id)).toEqual(['skill-terraform']);
  });

  it('preserves selected skills while changing groups', () => {
    const sourcing = buildSourcing('Draft');
    component.sourcing.set(sourcing);
    component['hydrateForm'](sourcing);

    component.toggleSkill('skill-terraform', true);
    component.selectPostSkillGroup('DevOps Engineer');

    expect(component.form.skillIds).toEqual(['skill-react', 'skill-terraform']);
    expect(component.postSelectedSkillOptions(sourcing.skills).map((skill) => skill.id)).toEqual([
      'skill-react',
      'skill-terraform',
    ]);
  });

  it('prevents skill changes when the job post cannot be edited', () => {
    const sourcing = buildSourcing('Published');
    component.sourcing.set(sourcing);
    component['hydrateForm'](sourcing);

    component.toggleSkill('skill-terraform', true);

    expect(component.form.skillIds).toEqual(['skill-react']);
  });

  it('uses the grouped picker for manual candidate skills and locks existing candidate skills', () => {
    const sourcing = buildSourcing('Draft');
    component.manualCandidateForm.skillIds = ['skill-react'];

    component.setManualSkillSearch({ target: { value: 'terraform' } } as unknown as Event);
    expect(component.manualVisibleSkills(sourcing.skills).map((skill) => skill.id)).toEqual(['skill-terraform']);

    component.manualCandidateForm.existingCandidateId = 'candidate-1';
    component.toggleManualSkill('skill-terraform', true);

    expect(component.manualCandidateForm.skillIds).toEqual(['skill-react']);
  });

  it('stores parsed CV evidence for manual candidate save without adding parser text to recruiter notes', () => {
    const sourcing = buildSourcing('Draft');
    component.sourcing.set(sourcing);

    component['applyParsedCv'](buildParsedCvResult());
    const input = component['buildManualCandidateInput']();

    expect(component.manualCandidateForm.displayName).toBe('Alex Morgan');
    expect(component.manualCandidateForm.skillIds).toEqual(['skill-react']);
    expect(component.manualCandidateForm.recruiterNotes).toBe('');
    expect(input.parsedCvEvidence).toEqual(expect.objectContaining({
      fileName: 'alex-morgan.docx',
      contentHashSha256: 'a'.repeat(64),
      summary: 'Senior React developer with architecture experience.',
      extractedText: expect.stringContaining('React and TypeScript'),
    }));
  });

  it('uses the candidate portal job link in the manual sourcing invitation message', () => {
    const sourcing = buildSourcing('Published');
    component.sourcing.set(sourcing);

    component.openManualCandidateModal();

    expect(component.manualCandidateForm.invitationMessage).toContain(
      `If you are interested, please apply on our job portal: ${window.location.origin}/candidate/jobs/post-1?source=invite`,
    );
    expect(component.manualCandidateForm.invitationMessage).not.toContain('<JOB-LINK>');
  });

  it('runs AI Headhunting as lead-only search and prefills manual conversion from a lead', async () => {
    const sourcing = buildSourcing('Published');
    const lead = buildOnlineLead();
    store.loadRecruiterSourcing.mockResolvedValue(sourcing);
    store.searchOnlineCandidates.mockResolvedValue({
      requestId: 'request-1',
      jobRequestId: 'jr-1',
      requestedByUserId: 'recruiter-1',
      status: 'Queued',
      message: 'AI Headhunting is running in the background.',
      requestedLimit: 20,
      dailyLeadLimit: 100,
      dailyLeadCountBeforeRun: 0,
      sourceCodes: ['LinkedIn', 'GitHub', 'Portfolio', 'PublicSearch'],
      queuedAtUtc: '2026-06-04T00:00:00Z',
    });
    component.sourcing.set(sourcing);
    component.setTab('headhunting');
    fixture.detectChanges();

    await component.runOnlineHeadhunting();

    expect(store.searchOnlineCandidates).toHaveBeenCalledWith('jr-1', {
      limit: 20,
      sourceCodes: ['LinkedIn', 'GitHub', 'Portfolio', 'PublicSearch'],
      searchMoreFromRunId: null,
    });
    expect(component.onlineHeadhuntingQueued()).toBe(true);
    expect(component.message()).toContain('background');

    component.sourcing.set({
      ...sourcing,
      onlineHeadhunting: {
        run: buildOnlineRun(),
        leads: [lead],
      },
    });
    component.selectedOnlineLeadId.set(lead.onlineCandidateLeadId);
    expect(component.sourcing()?.onlineHeadhunting?.leads).toHaveLength(1);
    expect(component.selectedOnlineLead()?.onlineCandidateLeadId).toBe('lead-1');

    component.openManualCandidateModalFromLead(lead);

    expect(component.manualCandidateModalOpen()).toBe(true);
    expect(component.manualCandidateForm.onlineLeadId).toBe('lead-1');
    expect(component.manualCandidateForm.email).toBe('');
    expect(component.manualCandidateError()).toContain('Enter a verified email');
    expect(component.manualCandidateForm.sourceUrl).toBe('https://github.com/hamza');
  });

  it('uses compact source labels in the online lead table', () => {
    expect(component.onlineLeadSourceChipLabel(buildOnlineLead({
      sourceCode: 'LinkedIn',
      sourceDisplayName: 'LinkedIn Search Result',
    }))).toBe('LinkedIn');
    expect(component.onlineLeadSourceChipLabel(buildOnlineLead({
      sourceCode: 'PublicSearch',
      sourceDisplayName: 'Public Search',
    }))).toBe('Web');
  });

  it('explains online lead actions through button tooltips', () => {
    const lead = buildOnlineLead();

    expect(component.onlineLeadActionTooltip('addToPipeline', lead)).toContain('pipeline');
    expect(component.onlineLeadActionTooltip('viewSource', lead)).toContain('public source URL');
    expect(component.onlineLeadActionTooltip('saveProspect', lead)).toContain('later review');
    expect(component.onlineLeadActionTooltip('rejectLead', lead)).toContain('filtered out');
  });

  it('orders online leads by known location and contact evidence before match rank', () => {
    const sourcing = buildSourcing('Published');
    sourcing.onlineHeadhunting = {
      run: buildOnlineRun(),
      leads: [
        buildOnlineLead({
          onlineCandidateLeadId: 'unknown-email',
          rank: 1,
          displayName: 'Unknown Email',
          locationText: null,
          email: 'unknown@example.com',
          phone: null,
          matchScore: 99,
        }),
        buildOnlineLead({
          onlineCandidateLeadId: 'known-no-contact',
          rank: 2,
          displayName: 'Known No Contact',
          locationText: 'Lahore',
          email: null,
          phone: null,
          matchScore: 97,
        }),
        buildOnlineLead({
          onlineCandidateLeadId: 'known-phone',
          rank: 3,
          displayName: 'Known Phone',
          locationText: 'Lahore',
          email: null,
          phone: '+92 300 555 0100',
          matchScore: 82,
        }),
        buildOnlineLead({
          onlineCandidateLeadId: 'known-email',
          rank: 4,
          displayName: 'Known Email',
          locationText: 'Lahore',
          email: 'known@example.com',
          phone: null,
          matchScore: 80,
        }),
      ],
    };
    component.sourcing.set(sourcing);

    expect(component.filteredOnlineLeads().map((lead) => lead.onlineCandidateLeadId)).toEqual([
      'known-email',
      'known-phone',
      'known-no-contact',
    ]);
    expect(component.onlineLeadContactLabel(sourcing.onlineHeadhunting.leads[2])).toBe('+92 300 555 0100');
  });

  it('hides job posting pages from online headhunting leads', () => {
    const sourcing = buildSourcing('Published');
    sourcing.onlineHeadhunting = {
      run: buildOnlineRun(),
      leads: [
        buildOnlineLead({
          onlineCandidateLeadId: 'expertini-job',
          displayName: 'Java Microservices Engineer Spring Boot Kafka Lahore Abacus Jobs in Pakistan',
          currentTitle: 'Job posting',
          sourceCode: 'PublicSearch',
          sourceDisplayName: 'Public Search',
          sourceUrl: 'https://pk.expertini.com/jobs/in/java-microservices-engineer-spring-boot-kafka-lahore-abacus/',
          evidenceSnippet: 'Apply now. Job description, salary, and posted on details are available.',
          matchScore: 99,
        }),
        buildOnlineLead({
          onlineCandidateLeadId: 'romania-profile',
          displayName: 'Sebastian Stincescu',
          locationText: 'Romania',
          sourceCode: 'LinkedIn',
          sourceDisplayName: 'LinkedIn Search Result',
          sourceUrl: 'https://www.linkedin.com/in/sebastian-stincescu/',
          evidenceSnippet: 'Romania Senior Java Software Engineer Microservices Kafka',
          matchScore: 94,
        }),
        buildOnlineLead({
          onlineCandidateLeadId: 'candidate-profile',
          displayName: 'Hamza Ali',
          sourceUrl: 'https://github.com/hamza',
          profileUrl: 'https://github.com/hamza',
          matchScore: 94,
        }),
      ],
    };
    component.sourcing.set(sourcing);

    expect(component.filteredOnlineLeads().map((lead) => lead.onlineCandidateLeadId)).toEqual(['candidate-profile']);
  });

  it('removes the external sourcing note and shows job analytics as its own tab', async () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [buildApplication()];
    await renderPostRounds(sourcing, []);

    component.setTab('applications');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('External sourcing invitations');
    expect(addSourcedCandidateButtons()).toHaveLength(1);

    component.setTab('analytics');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Job Analytics');
    expect(fixture.nativeElement.textContent).toContain('Daily applications');
    expect(fixture.nativeElement.textContent).toContain('1 applicant(s)');
    expect(fixture.nativeElement.textContent).not.toContain('External sourcing invitations');
    expect(addSourcedCandidateButtons()).toHaveLength(0);

    component.setTab('post');
    fixture.detectChanges();
    expect(addSourcedCandidateButtons()).toHaveLength(0);
    expect(addCandidateButtons()).toHaveLength(0);
  });

  it('groups application analytics by applied day and reports trend direction', () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [
      { ...buildApplication(), jobApplicationId: 'application-1', appliedAt: '2026-06-01T12:00:00Z' },
      { ...buildApplication(), jobApplicationId: 'application-2', appliedAt: '2026-06-02T12:00:00Z' },
      { ...buildApplication(), jobApplicationId: 'application-3', appliedAt: '2026-06-02T13:00:00Z' },
    ];
    component.sourcing.set(sourcing);

    const analytics = component.applicationAnalytics();

    expect(analytics.totalApplications).toBe(3);
    expect(analytics.latestDayCount).toBe(2);
    expect(analytics.previousDayCount).toBe(1);
    expect(analytics.trendDirection).toBe('increasing');
    expect(analytics.trendLabel).toBe('Increasing');
    expect(analytics.points.filter((point) => point.count > 0).map((point) => point.count)).toEqual([1, 2]);
    expect(analytics.axisLabels.map((label) => label.label)).toEqual(['Jun 1', 'Jun 2']);
  });

  it('adds a zero-count baseline for single-day application analytics', () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [
      { ...buildApplication(), jobApplicationId: 'application-1', appliedAt: '2026-06-02T12:00:00Z' },
      { ...buildApplication(), jobApplicationId: 'application-2', appliedAt: '2026-06-02T13:00:00Z' },
    ];
    component.sourcing.set(sourcing);

    const analytics = component.applicationAnalytics();

    expect(analytics.points.map((point) => point.count)).toEqual([0, 2]);
    expect(analytics.previousDayCount).toBe(0);
    expect(analytics.latestDayCount).toBe(2);
    expect(analytics.trendDirection).toBe('increasing');
  });

  it('normalizes raw semantic similarity connection errors for display', () => {
    const sourcing = buildSourcing('Published');
    sourcing.applicantRankings = [
      buildApplicantRanking({
        semanticSimilarityStatus: 'Unavailable: No connection could be made because the target machine actively refused it. (localhost:11434).',
      }),
    ];
    component.sourcing.set(sourcing);

    const status = component.latestApplicantSemanticStatus();

    expect(status).toContain('embedding service is not reachable');
    expect(status).not.toContain('actively refused');
  });

  it('orders applications by applicant ranking relevance when rankings exist', async () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [
      buildApplication({
        jobApplicationId: 'application-low',
        candidateId: 'candidate-low',
        candidateName: 'Lower Ranked Candidate',
        appliedAt: '2026-06-03T10:00:00Z',
      }),
      buildApplication({
        jobApplicationId: 'application-high',
        candidateId: 'candidate-high',
        candidateName: 'Higher Ranked Candidate',
        appliedAt: '2026-06-01T10:00:00Z',
      }),
    ];
    sourcing.applicantRankings = [
      buildApplicantRanking({ jobApplicationId: 'application-low', candidateId: 'candidate-low', rank: 2, score: 72 }),
      buildApplicantRanking({ jobApplicationId: 'application-high', candidateId: 'candidate-high', rank: 1, score: 91 }),
    ];

    expect(component.rankedApplications(sourcing).map((application) => application.jobApplicationId)).toEqual([
      'application-high',
      'application-low',
    ]);

    await renderPostRounds(sourcing, []);
    component.setTab('applications');
    fixture.detectChanges();

    const candidates = Array.from(
      fixture.nativeElement.querySelectorAll('.manual-candidate-row [data-label="Candidate"] strong') as NodeListOf<HTMLElement>,
    ).map((node) => node.textContent?.trim());

    expect(candidates).toEqual(['Higher Ranked Candidate', 'Lower Ranked Candidate']);
  });

  it('extracts applicant ranking score breakdown percentages from rationale text', () => {
    const breakdown = component.applicantRankingScoreBreakdown(buildApplicantRanking({
      explanation: 'Amara Haq is ranked for this current application because their profile has a skill coverage score of 0%, vector similarity score of 0%, experience/location/notice fit score of 83%, historical signal score of 81%, evidence completeness score of 100%, and application recency score of 100%.',
    }));

    expect(breakdown.map((metric) => [metric.label, metric.value])).toEqual([
      ['Skill coverage', 0],
      ['Vector similarity', 0],
      ['Experience and notice fit', 83],
      ['Historical signal', 81],
      ['Evidence completeness', 100],
      ['Application recency', 100],
    ]);
    expect(breakdown.every((metric) => metric.description.length > 20)).toBe(true);
  });

  it('keeps application row actions inside the overflow menu', async () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [buildApplication()];
    sourcing.jobPost!.interviewRounds = [buildInterviewRound()];
    await renderPostRounds(sourcing, []);

    component.setTab('applications');
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.manual-candidate-row') as HTMLElement;
    expect(row.textContent).not.toContain('Shortlist');
    expect(row.textContent).not.toContain('Schedule');
    expect(row.textContent).not.toContain('View profile');

    const trigger = row.querySelector('.application-action-menu .action-menu-trigger') as HTMLButtonElement;
    expect(trigger).toBeTruthy();
    trigger.click();
    fixture.detectChanges();

    const menu = row.querySelector('.action-dropdown') as HTMLElement;
    expect(menu.textContent).toContain('Shortlist');
    expect(menu.textContent).toContain('Schedule HR Screening');
    expect(menu.textContent).toContain('Hold');
    expect(menu.textContent).toContain('Reject');
    expect(menu.textContent).toContain('View profile');
  });

  it('renders applied and screening application statuses with distinct badge classes', async () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [
      buildApplication({ jobApplicationId: 'application-applied', applicationStatus: 'Applied' }),
      buildApplication({ jobApplicationId: 'application-screening', applicationStatus: 'Screening' }),
    ];
    await renderPostRounds(sourcing, []);

    component.setTab('applications');
    fixture.detectChanges();

    const badges = Array.from(
      fixture.nativeElement.querySelectorAll('.manual-candidate-row [data-label="Status / AI Match"] .status-badge') as NodeListOf<HTMLElement>,
    );
    const applied = badges.find((badge) => badge.textContent?.trim() === 'Applied');
    const screening = badges.find((badge) => badge.textContent?.trim() === 'Screening');

    expect(applied?.classList.contains('status-badge--applied')).toBe(true);
    expect(screening?.classList.contains('status-badge--screening')).toBe(true);
    expect(applied?.className).not.toBe(screening?.className);
  });

  it('hides shortlist when the candidate is already in screening', async () => {
    const sourcing = buildSourcing('Published');
    sourcing.applications = [buildApplication({ applicationStatus: 'Screening' })];
    sourcing.jobPost!.interviewRounds = [buildInterviewRound()];
    await renderPostRounds(sourcing, []);

    component.setTab('applications');
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.manual-candidate-row') as HTMLElement;
    const trigger = row.querySelector('.application-action-menu .action-menu-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const menu = row.querySelector('.action-dropdown') as HTMLElement;
    expect(menu.textContent).not.toContain('Shortlist');
    expect(menu.textContent).toContain('Schedule HR Screening');
    expect(menu.textContent).toContain('Hold');
    expect(menu.textContent).toContain('Reject');
    expect(menu.textContent).toContain('View profile');
  });

  it('only allows the next unresolved interview round to be scheduled', () => {
    const sourcing = buildSourcing('Published');
    sourcing.jobPost!.interviewRounds = [
      buildInterviewRound({ jobPostInterviewRoundId: 'round-1', roundOrder: 1, name: 'HR Screening' }),
      buildInterviewRound({ jobPostInterviewRoundId: 'round-2', roundOrder: 2, name: 'Technical Interview' }),
      buildInterviewRound({ jobPostInterviewRoundId: 'round-3', roundOrder: 3, name: 'Final Interview' }),
    ];
    component.sourcing.set(sourcing);

    const noInterviews = component.scheduleEligibility(buildApplication());
    expect(noInterviews.status).toBe('eligible');
    expect(noInterviews.round?.jobPostInterviewRoundId).toBe('round-1');

    const priorCompleted = component.scheduleEligibility(buildApplication({
      interviews: [buildApplicationInterview({ jobPostInterviewRoundId: 'round-1', status: 'Completed' })],
    }));
    expect(priorCompleted.status).toBe('eligible');
    expect(priorCompleted.round?.jobPostInterviewRoundId).toBe('round-2');

    const pendingPrior = component.scheduleEligibility(buildApplication({
      interviews: [
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-1', status: 'Completed' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-2', roundName: 'Technical Interview', status: 'Scheduled' }),
      ],
    }));
    expect(pendingPrior.status).toBe('blocked');
    expect(pendingPrior.actionLabel).toBe('Complete Technical Interview first');

    const allResolved = component.scheduleEligibility(buildApplication({
      interviews: [
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-1', status: 'Completed' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-2', status: 'Skipped' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-3', status: 'Completed' }),
      ],
    }));
    expect(allResolved.status).toBe('complete');

    const allScheduled = component.scheduleEligibility(buildApplication({
      interviews: [
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-1', status: 'Scheduled' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-2', status: 'Scheduled' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-3', status: 'Scheduled' }),
      ],
    }));
    expect(allScheduled.status).toBe('complete');
    expect(allScheduled.actionLabel).toBe('All rounds scheduled');
  });

  it('shows configured interview rounds that have not been scheduled yet', () => {
    const sourcing = buildSourcing('Published');
    sourcing.jobPost!.interviewRounds = [
      buildInterviewRound({ jobPostInterviewRoundId: 'round-1', roundOrder: 1, name: 'HR Screening' }),
      buildInterviewRound({ jobPostInterviewRoundId: 'round-2', roundOrder: 2, name: 'Technical Interview' }),
      buildInterviewRound({ jobPostInterviewRoundId: 'round-3', roundOrder: 3, name: 'Final Interview' }),
    ];
    component.sourcing.set(sourcing);

    const application = buildApplication({
      interviews: [
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-1', roundName: 'HR Screening', status: 'Completed' }),
        buildApplicationInterview({ jobPostInterviewRoundId: 'round-2', roundName: 'Technical Interview', status: 'Completed' }),
      ],
    });

    const entries = component.interviewTimelineEntries(application);

    expect(entries.map((entry) => entry.roundName)).toEqual([
      'HR Screening',
      'Technical Interview',
      'Final Interview',
    ]);
    expect(entries[2]).toMatchObject({
      status: 'Not scheduled',
      isUnscheduled: true,
    });
    expect(component.interviewTimelineSummary(application)).toBe('2 rounds, 1 not scheduled');
    expect(component.interviewTimelineItemClass(entries[2])).toContain('unscheduled');
  });

  it('opens completed interview feedback details from the application timeline', async () => {
    const sourcing = buildSourcing('Published');
    const application = buildApplication({
      candidateName: 'Amara Haq',
      interviews: [
        buildApplicationInterview({
          interviewId: 'interview-hr',
          jobPostInterviewRoundId: 'round-1',
          roundName: 'HR Screening',
          status: 'Completed',
          recommendation: 'Proceed',
          technicalScore: 4,
          communicationScore: 5,
          cultureScore: 4,
          feedbackText: 'HR screen confirmed communication clarity and availability.',
          submittedAt: '2026-06-09T13:00:00.000Z',
        }),
        buildApplicationInterview({
          interviewId: 'interview-technical',
          jobPostInterviewRoundId: 'round-2',
          roundName: 'Technical Interview',
          interviewerName: 'Bilal Hussain',
          interviewerUserId: 'interviewer-2',
          status: 'Completed',
          startsAt: '2026-06-10T12:00:00.000Z',
          recommendation: 'Proceed',
          technicalScore: 5,
          communicationScore: 4,
          cultureScore: 4,
          feedbackText: 'Strong Java, Spring Boot, API design, and production debugging evidence.',
          submittedAt: '2026-06-10T13:10:00.000Z',
        }),
      ],
    });
    sourcing.applications = [application];
    sourcing.jobPost!.interviewRounds = [
      buildInterviewRound({ jobPostInterviewRoundId: 'round-1', roundOrder: 1, name: 'HR Screening' }),
      buildInterviewRound({ jobPostInterviewRoundId: 'round-2', roundOrder: 2, name: 'Technical Interview' }),
    ];
    await renderPostRounds(sourcing, sourcing.jobPost!.interviewRounds);

    component.setTab('applications');
    fixture.detectChanges();

    const timelineButtons = Array.from(
      fixture.nativeElement.querySelectorAll('.interview-timeline-detail-trigger') as NodeListOf<HTMLButtonElement>,
    );
    const technicalButton = timelineButtons.find((button) => button.textContent?.includes('Technical Interview'));
    expect(technicalButton).toBeTruthy();

    technicalButton!.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.interview-feedback-modal') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Technical Interview');
    expect(modal.textContent).toContain('Amara Haq');
    expect(modal.textContent).toContain('Bilal Hussain');
    expect(modal.textContent).toContain('5/5');
    expect(modal.textContent).toContain('4/5');
    expect(modal.textContent).toContain('4.3/5');
    expect(modal.textContent).toContain('Proceed');
    expect(modal.textContent).toContain('Strong Java, Spring Boot, API design, and production debugging evidence.');
  });

  it('shows feedback action only to the assigned interviewer for that scheduled round', () => {
    currentUser.set({ id: 'interviewer-1', roles: ['Interviewer'] });

    expect(component.interviewFeedbackActionLabel(buildApplicationInterview())).toBe('Add feedback');
    expect(component.interviewFeedbackActionLabel(buildApplicationInterview({
      interviewId: 'interview-2',
      interviewerUserId: 'interviewer-2',
    }))).toBeNull();
    expect(component.interviewFeedbackActionLabel(buildApplicationInterview({
      status: 'Completed',
    }))).toBeNull();
  });

  it('shows admin override feedback only when the assigned interviewer is inactive', () => {
    currentUser.set({ id: 'admin-1', roles: ['TenantAdmin'] });
    auth.isAdmin.mockReturnValue(true);

    expect(component.interviewFeedbackActionLabel(buildApplicationInterview({
      interviewerAccountStatus: 'Active',
      interviewerIsDeleted: false,
    }))).toBeNull();
    expect(component.interviewFeedbackActionLabel(buildApplicationInterview({
      interviewerAccountStatus: 'Disabled',
      interviewerIsDeleted: false,
    }))).toBe('Admin override feedback');
    expect(component.interviewFeedbackActionLabel(buildApplicationInterview({
      interviewerAccountStatus: 'Active',
      interviewerIsDeleted: true,
    }))).toBe('Admin override feedback');
  });

  it('schedules interviews through Google Calendar without accepting a pasted meeting link', async () => {
    const sourcing = buildSourcing('Published');
    const application = buildApplication();
    sourcing.applications = [application];
    sourcing.jobPost!.interviewRounds = [
      {
        jobPostInterviewRoundId: 'round-1',
        interviewTemplateRoundId: null,
        roundOrder: 1,
        name: 'HR Screening',
        ownerUserId: 'interviewer-1',
        ownerUserName: 'Sara Malik',
        durationMinutes: 30,
        status: 'Active',
      },
    ];
    store.loadRecruiterSourcing.mockResolvedValue(sourcing);
    store.scheduleCandidateInterview.mockResolvedValue({
      interviewId: 'interview-1',
      jobApplicationId: application.jobApplicationId,
      jobPostInterviewRoundId: 'round-1',
      interviewerUserId: 'interviewer-1',
      interviewerName: 'Sara Malik',
      roundName: 'HR Screening',
      startsAtUtc: '2026-06-04T18:00:00.000Z',
      durationMinutes: 30,
      status: 'Scheduled',
    });
    component.sourcing.set(sourcing);
    component.openScheduleModal(application);
    component.scheduleForm.startsAtLocal = '2026-06-04T23:00';

    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.compact-modal') as HTMLElement;
    expect(modal.textContent).toContain('Creates a Google Calendar event');
    expect(modal.textContent).not.toContain('Meeting link');
    expect(modal.querySelector('input[name="scheduleMeeting"]')).toBeNull();

    await component.submitScheduleInterview();

    expect(store.scheduleCandidateInterview).toHaveBeenCalledWith(application.jobApplicationId, expect.objectContaining({
      jobPostInterviewRoundId: 'round-1',
      interviewerUserId: 'interviewer-1',
      meetingLink: null,
    }));
  });

  it('points users to the integrations page when Google Calendar is not connected', () => {
    const sourcing = buildSourcing('Published');
    const application = buildApplication();
    sourcing.applications = [application];
    sourcing.jobPost!.interviewRounds = [
      {
        jobPostInterviewRoundId: 'round-1',
        interviewTemplateRoundId: null,
        roundOrder: 1,
        name: 'HR Screening',
        ownerUserId: 'interviewer-1',
        ownerUserName: 'Sara Malik',
        durationMinutes: 30,
        status: 'Active',
      },
    ];
    store.loadRecruiterSourcing.mockResolvedValue(sourcing);
    component.sourcing.set(sourcing);
    component.openScheduleModal(application);
    component.scheduleError.set('Google Calendar is not connected. Please connect an organizer account first.');

    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.field-status.error') as HTMLElement;
    const link = error.querySelector('a') as HTMLAnchorElement;
    expect(error.textContent).toContain('Admin Center > Integrations > Google Calendar');
    expect(error.textContent).toContain('Tenant admin access is required.');
    expect(link.getAttribute('href')).toBe('/admin-center/integrations');
  });

  it('hides the claimed assignment summary but keeps claim action for unclaimed work', async () => {
    const claimed = buildSourcing('Published');
    await renderPostRounds(claimed, []);
    component.setTab('review');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Sourcing Assignment');
    expect(fixture.nativeElement.textContent).not.toContain('Claim Sourcing Work');

    const unclaimed = buildSourcing('Published');
    const assignment = unclaimed.assignment!;
    unclaimed.assignment = {
      ...assignment,
      claimedByUserId: undefined,
      status: 'Pending',
    };
    await renderPostRounds(unclaimed, []);
    component.setTab('review');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Claim sourcing work');
    expect(fixture.nativeElement.textContent).toContain('Claim Sourcing Work');
    expect(fixture.nativeElement.textContent).not.toContain('Sourcing Assignment');
  });

  it('allows recruiters to close a published post without reopening content editing', async () => {
    const sourcing = buildSourcing('Published');

    await renderPostRounds(sourcing, []);

    const closeButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button): button is HTMLButtonElement =>
        button instanceof HTMLButtonElement && button.textContent?.includes('Close Post') === true,
    );

    expect(component.canEditContent()).toBe(false);
    expect(component.canCloseJobPost()).toBe(true);
    expect(closeButton?.disabled).toBe(false);
  });

  it('archives closed job posts and disables new intake actions', async () => {
    const sourcing = buildSourcing('Closed');
    const application = buildApplication();
    sourcing.applications = [application];
    sourcing.jobPost!.interviewRounds = [buildInterviewRound()];

    await renderPostRounds(sourcing, sourcing.jobPost!.interviewRounds);

    expect(component.isCurrentJobPostClosed()).toBe(true);
    expect(component.canAddManualCandidate()).toBe(false);
    expect(component.canManageApplications()).toBe(false);
    expect(component.canRunRediscovery()).toBe(false);
    expect(component.canRunOnlineHeadhunting()).toBe(false);
    expect(component.canRankApplicants()).toBe(false);
    expect(component.canCloseJobPost()).toBe(false);
    expect(component.scheduleEligibility(application)).toEqual(expect.objectContaining({
      actionLabel: 'Post closed',
      status: 'blocked',
    }));

    component.setTab('applications');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('closed and archived');
    expect(addSourcedCandidateButtons()[0].disabled).toBe(true);

    component.openManualCandidateModal();

    expect(component.manualCandidateModalOpen()).toBe(false);
    expect(component.error()).toContain('closed and archived');
  });

  it('formats request summary descriptions into readable sections', () => {
    const description =
      'Senior Java Developer Job Description Role Summary: Build scalable services. Responsibilities: * Design APIs * Review code Required Skills: Java SQL';

    expect(component.formattedDescription(description)).toBe(
      [
        'Senior Java Developer Job Description',
        '',
        'Role Summary',
        'Build scalable services.',
        '',
        'Responsibilities',
        '- Design APIs',
        '- Review code',
        '',
        'Required Skills',
        'Java SQL',
      ].join('\n'),
    );
  });

  it('defaults interviewer filters to the job department', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    const round = component.form.interviewRounds[0];
    expect(component.roundDepartmentFilter(round, 0)).toBe('Engineering');
    expect(component.interviewerGroupsForRound(round, 0).map((group) => group.departmentName)).toEqual(['Engineering']);
  });

  it('clears and changes interviewer department filters per round', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    const round = component.form.interviewRounds[0];
    component.setRoundDepartmentFilter(round, 0, '');
    expect(component.interviewerGroupsForRound(round, 0).map((group) => group.departmentName)).toEqual([
      'Engineering',
      'QA',
      'Recruitment',
    ]);

    component.setRoundDepartmentFilter(round, 0, 'QA');
    expect(component.interviewerGroupsForRound(round, 0).map((group) => group.departmentName)).toEqual(['QA']);
  });

  it('selects any active employee as the round interviewer', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    component.selectRoundInterviewer(0, 'qa-1');

    expect(component.form.interviewRounds[0].ownerUserId).toBe('qa-1');
    expect(component.form.interviewRounds[0].ownerUserName).toBe('Bilal Hussain');
  });

  it('keeps the selected interviewer visible outside the active filter', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      {
        roundOrder: 1,
        name: 'Technical Interview',
        durationMinutes: 60,
        status: 'Active',
        ownerUserId: 'qa-1',
        ownerUserName: 'Bilal Hussain',
      },
    ]);

    const round = component.form.interviewRounds[0];
    expect(component.roundDepartmentFilter(round, 0)).toBe('Engineering');
    expect(component.interviewerGroupsForRound(round, 0).map((group) => group.departmentName)).toEqual([
      'Engineering',
      'QA',
    ]);
    expect(component.roundInterviewerHelper(round, 0)).toContain('Selected interviewer is shown');
  });

  it('shows a compact HOD recommendation card for final rounds with a matching HOD', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
      { roundOrder: 2, name: 'Department Head Interview', durationMinutes: 45, status: 'Active' },
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Recommended HOD');
    expect(text).toContain('Zara Siddiqui');
    expect(text).toContain('Engineering HOD matched to this job post department');
    expect(text).toContain('Use recommendation');
  });

  it('applies the HOD recommendation from the recommendation action', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Department Head Interview', durationMinutes: 45, status: 'Active' },
    ]);

    const useRecommendation = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button): button is HTMLButtonElement =>
      button instanceof HTMLButtonElement && button.textContent?.includes('Use recommendation') === true,
    );

    expect(useRecommendation).toBeTruthy();
    useRecommendation?.click();
    fixture.detectChanges();

    expect(component.form.interviewRounds[0].ownerUserId).toBe('eng-hod');
    expect(component.form.interviewRounds[0].ownerUserName).toBe('Zara Siddiqui');
  });

  it('shows Applied when the recommended HOD is already selected', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      {
        roundOrder: 1,
        name: 'Final Interview',
        durationMinutes: 45,
        status: 'Active',
        ownerUserId: 'eng-hod',
        ownerUserName: 'Zara Siddiqui',
      },
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Applied');
    expect(text).not.toContain('Use recommendation');
  });

  it('shows a soft warning chip when no department HOD is configured', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.hodInterviewers = [];

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Department Head Interview', durationMinutes: 45, status: 'Active' },
    ]);

    expect(fixture.nativeElement.textContent).toContain('No department HOD configured');
  });

  it('does not show HOD recommendations for non-final rounds', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.interviewers = buildInterviewers();

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'HR Screening', durationMinutes: 30, status: 'Active' },
      { roundOrder: 2, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    const firstRow = fixture.nativeElement.querySelector('.round-editor-row') as HTMLElement;
    expect(firstRow.textContent).not.toContain('Recommended HOD');
    expect(firstRow.textContent).not.toContain('No department HOD configured');
  });

  it('renders interview rounds as an ordered timeline', async () => {
    const sourcing = buildSourcing('Draft');

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'HR Screening', durationMinutes: 30, status: 'Active' },
      { roundOrder: 2, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.round-editor-row')) as HTMLElement[];

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector('.round-timeline-marker')?.textContent?.trim()).toBe('1');
    expect(rows[0].querySelector('.round-sequence-label')?.textContent).toContain('First interview');
    expect(rows[1].querySelector('.round-timeline-marker')?.textContent?.trim()).toBe('2');
    expect(rows[1].querySelector('.round-sequence-label')?.textContent).toContain('After step 1');
  });

  async function renderPostRounds(
    sourcing: RecruiterSourcing,
    rounds: JobPostInterviewRound[],
  ): Promise<void> {
    store.loadRecruiterSourcing.mockResolvedValue(sourcing);
    fixture.detectChanges();
    await fixture.whenStable();

    component.sourcing.set(sourcing);
    component.form = {
      title: sourcing.jobPost?.title ?? sourcing.jobRequest.title,
      description: sourcing.jobPost?.description ?? sourcing.jobRequest.description,
      skillIds: sourcing.jobPost?.skills.map((skill) => skill.skillId) ?? [],
      experienceMinYears: sourcing.jobPost?.experienceMinYears ?? null,
      experienceMaxYears: sourcing.jobPost?.experienceMaxYears ?? null,
      requiredPositions: sourcing.jobPost?.requiredPositions ?? 1,
      interviewRounds: rounds,
    };
    component.setTab('post');
    fixture.detectChanges();
  }

  function buildSourcing(jobPostStatus: 'Draft' | 'Published' | 'Closed'): RecruiterSourcing {
    return {
      jobRequest: {
        id: 'jr-1',
        code: 'TP-REQ-001',
        title: 'Senior React Developer',
        client: 'Relia',
        description: 'React job.',
        department: 'Engineering',
        skills: ['React'],
        experience: '5-8 years',
        location: 'Lahore',
        requiredPositions: 1,
        fulfilledPositions: 0,
        priority: 'Medium',
        hiringManagerId: 'hm-1',
        createdById: 'presales-1',
        stage: 'Recruiter Sourcing',
        publishStatus: jobPostStatus === 'Closed' ? 'Closed' : 'Published',
        createdAt: '2026-06-01T00:00:00Z',
      },
      assignment: {
        id: 'assignment-1',
        entityType: 'JobRequest',
        entityId: 'jr-1',
        stage: 'Recruiter Sourcing',
        status: 'Claimed',
        assignedToUserId: 'recruiter-1',
        claimedByUserId: 'recruiter-1',
        assignedAt: '2026-06-01T00:00:00Z',
      },
      jobPost: {
        jobPostId: 'post-1',
        jobRequestId: 'jr-1',
        title: 'Senior React Developer',
        description: 'React job post.',
        department: 'Engineering',
        location: 'Lahore',
        experienceMinYears: 5,
        experienceMaxYears: 8,
        requiredPositions: 1,
        status: jobPostStatus,
        recruiterOwnerUserId: 'recruiter-1',
        recruiterOwnerName: 'Sara Malik',
        publishedAt: jobPostStatus === 'Draft' ? null : '2026-06-01T00:00:00Z',
        closedAt: jobPostStatus === 'Closed' ? '2026-06-05T00:00:00Z' : null,
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
        skills: [{ skillId: 'skill-react', name: 'React' }],
        interviewRounds: [],
      },
      interviewTemplates: [],
      interviewers: [],
      skills: [
        { id: 'skill-react', name: 'React', description: 'Frontend Engineer' },
        { id: 'skill-terraform', name: 'Terraform', description: 'DevOps Engineer' },
      ],
      hodInterviewers: [],
      applications: [],
      talentRediscoveryMatches: [],
      applicantRankings: [],
      candidateSearchItems: [],
    };
  }

  function buildOnlineRun() {
    return {
      onlineCandidateSourcingRunId: 'run-1',
      jobRequestId: 'jr-1',
      jobPostId: 'post-1',
      aiAgentRunId: 'agent-run-1',
      searchMoreFromRunId: null,
      requestedLimit: 20,
      dailyLeadLimit: 100,
      dailyLeadCountBeforeRun: 0,
      leadsReturned: 1,
      searchStatus: 'Succeeded',
      model: 'gpt-4o-recruiter',
      sourceCodes: ['GitHub'],
      queries: ['React TypeScript location:Lahore'],
      createdAtUtc: '2026-06-01T00:00:00Z',
    };
  }

  function buildOnlineLead(overrides: Partial<OnlineCandidateLead> = {}): OnlineCandidateLead {
    return {
      onlineCandidateLeadId: 'lead-1',
      onlineCandidateSourcingRunId: 'run-1',
      jobRequestId: 'jr-1',
      rank: 1,
      sourceCode: 'GitHub',
      sourceDisplayName: 'GitHub',
      sourceUrl: 'https://github.com/hamza',
      displayName: 'Hamza Ali',
      currentTitle: 'Lead Frontend Engineer',
      currentCompany: 'TechFlow',
      locationText: 'Lahore',
      email: null,
      phone: null,
      profileUrl: 'https://github.com/hamza',
      evidenceSnippet: 'Maintains public React and TypeScript repositories.',
      matchScore: 94,
      confidence: 'High',
      fitSummary: 'Strong React and TypeScript public evidence.',
      strengths: ['React', 'TypeScript'],
      matchedSkills: ['React'],
      gaps: ['Email unavailable'],
      missingData: ['Email'],
      duplicateStatus: 'NoMatch',
      duplicateCandidateId: null,
      duplicateCandidateName: null,
      duplicateExplanation: 'No internal candidate match found.',
      outreachDraft: 'Hi Hamza, we are hiring for Senior React Developer.',
      status: 'New',
      createdAtUtc: '2026-06-01T00:00:00Z',
      ...overrides,
    };
  }

  function buildInterviewers(): InterviewerOption[] {
    return [
      {
        userId: 'eng-hod',
        displayName: 'Zara Siddiqui',
        email: 'zara@example.com',
        departmentId: 'dept-eng',
        departmentName: 'Engineering',
        designation: 'Head of Engineering',
        roleNames: ['HOD', 'Interviewer'],
        completedInterviewCount: 12,
        isJobDepartmentMatch: true,
        isDepartmentHod: true,
      },
      {
        userId: 'eng-1',
        displayName: 'Ayesha Khan',
        email: 'ayesha@example.com',
        departmentId: 'dept-eng',
        departmentName: 'Engineering',
        designation: 'Principal Engineer',
        roleNames: ['Interviewer'],
        completedInterviewCount: 8,
        isJobDepartmentMatch: true,
        isDepartmentHod: false,
      },
      {
        userId: 'qa-1',
        displayName: 'Bilal Hussain',
        email: 'bilal@example.com',
        departmentId: 'dept-qa',
        departmentName: 'QA',
        designation: 'QA Lead',
        roleNames: ['Interviewer'],
        completedInterviewCount: 5,
        isJobDepartmentMatch: false,
        isDepartmentHod: false,
      },
      {
        userId: 'recruiter-2',
        displayName: 'Sara Malik',
        email: 'sara@example.com',
        departmentId: 'dept-recruitment',
        departmentName: 'Recruitment',
        designation: 'Recruiter',
        roleNames: ['Recruiter'],
        completedInterviewCount: 3,
        isJobDepartmentMatch: false,
        isDepartmentHod: false,
      },
    ];
  }

  function addSourcedCandidateButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).filter(
      (button): button is HTMLButtonElement =>
        button instanceof HTMLButtonElement && button.textContent?.includes('Add sourced candidate') === true,
    );
  }

  function addCandidateButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).filter(
      (button): button is HTMLButtonElement =>
        button instanceof HTMLButtonElement && button.textContent?.trim() === 'Add candidate',
    );
  }

  function buildApplication(overrides: Partial<RecruiterSourcing['applications'][number]> = {}) {
    return {
      jobApplicationId: 'application-1',
      candidateId: 'candidate-1',
      candidateName: 'Alex Morgan',
      candidateEmail: 'alex@example.com',
      candidateStatus: 'Active',
      currentDesignation: 'Senior React Developer',
      currentCompany: 'Product Studio',
      experienceYears: 8,
      noticePeriodDays: null,
      applicationStatus: 'Invited',
      sourceLabel: 'LinkedIn',
      sourceDetail: 'Invited',
      sourceUrl: null,
      coverLetterText: null,
      isInvited: true,
      appliedAt: '2026-06-02T10:00:00Z',
      interviewsPassed: 0,
      interviewsTotal: 0,
      interviewPassSummary: '0/0 passed',
      documents: [],
      interviews: [],
      ...overrides,
    };
  }

  function buildInterviewRound(overrides: Partial<JobPostInterviewRound> = {}): JobPostInterviewRound {
    return {
      jobPostInterviewRoundId: 'round-1',
      interviewTemplateRoundId: null,
      roundOrder: 1,
      name: 'HR Screening',
      ownerUserId: 'interviewer-1',
      ownerUserName: 'Sara Malik',
      durationMinutes: 30,
      status: 'Active',
      ...overrides,
    };
  }

  function buildApplicationInterview(overrides: Partial<RecruiterSourcing['applications'][number]['interviews'][number]> = {}) {
    return {
      interviewId: 'interview-1',
      jobPostInterviewRoundId: 'round-1',
      roundName: 'HR Screening',
      interviewerName: 'Sara Malik',
      interviewerUserId: 'interviewer-1',
      interviewerAccountStatus: 'Active',
      interviewerIsDeleted: false,
      status: 'Scheduled',
      startsAt: '2026-06-04T18:00:00.000Z',
      durationMinutes: 30,
      meetingLink: null,
      locationText: null,
      recommendation: null,
      technicalScore: null,
      communicationScore: null,
      cultureScore: null,
      feedbackText: null,
      submittedAt: null,
      ...overrides,
    };
  }

  function buildApplicantRanking(overrides: Partial<ApplicantRankingMatch> = {}): ApplicantRankingMatch {
    return {
      jobApplicationId: 'application-1',
      candidateId: 'candidate-1',
      candidateName: 'Alex Morgan',
      candidateEmail: 'alex@example.com',
      currentDesignation: 'Senior React Developer',
      experienceYears: 8,
      noticePeriodDays: null,
      rank: 1,
      score: 72,
      confidence: 'Medium',
      explanation: 'Manual review remains required.',
      strengths: [],
      gaps: [],
      matchedSkills: ['React'],
      missingSkills: [],
      documentEvidence: [],
      historicalOutcomeEvidence: [],
      semanticSimilarityStatus: 'Available',
      agentRunId: 'agent-run-1',
      generatedAt: '2026-06-02T10:00:00Z',
      ...overrides,
    };
  }

  function buildParsedCvResult(): ParseCandidateCvResult {
    return {
      fileName: 'alex-morgan.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 2048,
      contentHashSha256: 'a'.repeat(64),
      agentRunId: 'run-1',
      model: 'llama3.2',
      generatedAtUtc: '2026-06-02T10:00:00Z',
      extractedText: 'Alex Morgan\nSenior React Developer\nReact and TypeScript',
      displayName: 'Alex Morgan',
      email: 'alex@example.com',
      phone: '+92 300 555 0198',
      currentDesignation: 'Senior React Developer',
      currentCompany: 'Product Studio',
      experienceYears: 8,
      skills: ['React'],
      universityName: 'University of Lahore',
      degreeName: 'BS Computer Science',
      graduationYear: 2018,
      summary: 'Senior React developer with architecture experience.',
    };
  }
});
