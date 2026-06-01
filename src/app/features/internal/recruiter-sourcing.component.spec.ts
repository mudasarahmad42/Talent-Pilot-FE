import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { JobPostInterviewRound, RecruiterSourcing } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RecruiterSourcingComponent } from './recruiter-sourcing.component';

describe('RecruiterSourcingComponent skill picker behavior', () => {
  const currentUser = signal({ id: 'recruiter-1', roles: ['Recruiter'] });
  const store = {
    loadRecruiterSourcing: vi.fn(),
  };
  const auth = {
    currentUser: currentUser.asReadonly(),
    isAdmin: vi.fn(() => false),
  };
  const route = {
    snapshot: {
      paramMap: convertToParamMap({ jobRequestId: 'jr-1' }),
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
    store.loadRecruiterSourcing.mockReset();
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

  it('shows a compact HOD recommendation card for final rounds with a matching HOD', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.hodInterviewers = [{ id: 'hod-1', name: 'Zara Siddiqui' }];

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
      { roundOrder: 2, name: 'Department Head Interview', durationMinutes: 45, status: 'Active' },
    ]);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Recommended Department HOD');
    expect(text).toContain('Zara Siddiqui');
    expect(text).toContain('Engineering HOD matched to this job post department');
    expect(text).toContain('Use recommendation');
  });

  it('applies the HOD recommendation from the recommendation action', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.hodInterviewers = [{ id: 'hod-1', name: 'Zara Siddiqui' }];

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

    expect(component.form.interviewRounds[0].ownerUserId).toBe('hod-1');
    expect(component.form.interviewRounds[0].ownerUserName).toBe('Zara Siddiqui');
  });

  it('shows Applied when the recommended HOD is already selected', async () => {
    const sourcing = buildSourcing('Draft');
    sourcing.hodInterviewers = [{ id: 'hod-1', name: 'Zara Siddiqui' }];

    await renderPostRounds(sourcing, [
      {
        roundOrder: 1,
        name: 'Final Interview',
        durationMinutes: 45,
        status: 'Active',
        ownerUserId: 'hod-1',
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
    sourcing.hodInterviewers = [{ id: 'hod-1', name: 'Zara Siddiqui' }];

    await renderPostRounds(sourcing, [
      { roundOrder: 1, name: 'HR Screening', durationMinutes: 30, status: 'Active' },
      { roundOrder: 2, name: 'Technical Interview', durationMinutes: 60, status: 'Active' },
    ]);

    const firstRow = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(firstRow.textContent).not.toContain('Recommended Department HOD');
    expect(firstRow.textContent).not.toContain('No department HOD configured');
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
});
