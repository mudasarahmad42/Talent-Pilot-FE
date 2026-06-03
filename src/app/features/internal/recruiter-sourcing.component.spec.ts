import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApplicantRankingMatch, InterviewerOption, JobPostInterviewRound, ParseCandidateCvResult, RecruiterSourcing } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RecruiterSourcingComponent } from './recruiter-sourcing.component';

describe('RecruiterSourcingComponent skill picker behavior', () => {
  const currentUser = signal({ id: 'recruiter-1', roles: ['Recruiter'] });
  const store = {
    loadRecruiterSourcing: vi.fn(),
    scheduleCandidateInterview: vi.fn(),
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
    store.loadRecruiterSourcing.mockReset();
    store.scheduleCandidateInterview.mockReset();
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

  function buildSourcing(jobPostStatus: 'Draft' | 'Published'): RecruiterSourcing {
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
        publishStatus: 'Published',
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
        publishedAt: null,
        closedAt: null,
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
