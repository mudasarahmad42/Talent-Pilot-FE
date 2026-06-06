import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { CreateJobRequestComponent } from './create-job-request.component';

describe('CreateJobRequestComponent', () => {
  const intakeOptions = signal({
    departments: [
      {
        departmentId: 'dept-engineering',
        name: 'Engineering',
        routingPreview: {
          targetType: 'Group',
          targetId: 'group-pmo-engineering',
          targetName: 'PMO - Engineering',
          usesTenantAdminFallback: false,
        },
      },
    ],
    locations: [{ id: 'loc-lahore', name: 'Lahore' }],
    skills: [
      { id: 'skill-react', name: 'React', description: 'Frontend' },
      { id: 'skill-azure', name: 'Azure', description: 'Cloud' },
    ],
    hiringManagers: [{ id: 'hm-1', name: 'Fatima Noor', email: 'ai-hiring.manager@8pkk57.onmicrosoft.com' }],
  });
  const store = {
    intakeOptions: intakeOptions.asReadonly(),
    loadIntakeOptions: vi.fn().mockResolvedValue(intakeOptions()),
    draftJobDescription: vi.fn().mockResolvedValue({ description: 'AI drafted React role description.' }),
    createJobRequest: vi.fn().mockResolvedValue({ id: 'jr-1' }),
  };
  const auth = {
    currentUser: signal({ id: 'presales-1', roles: ['Presales'] }).asReadonly(),
    hasAnyRole: vi.fn((roles: string[]) => roles.includes('Presales')),
  };

  let fixture: ComponentFixture<CreateJobRequestComponent>;
  let component: CreateJobRequestComponent;

  beforeEach(async () => {
    store.loadIntakeOptions.mockClear();
    store.draftJobDescription.mockClear();
    store.createJobRequest.mockClear();

    await TestBed.configureTestingModule({
      imports: [CreateJobRequestComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: TalentPilotStoreService, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateJobRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads configured intake options and previews PMO routing', () => {
    fixture.detectChanges();

    expect(store.loadIntakeOptions).toHaveBeenCalled();
    expect(component.selectedDepartment()?.routingPreview.targetName).toBe('PMO - Engineering');
    expect(fixture.nativeElement.textContent).toContain('Engineering routes to PMO - Engineering');
  });

  it('keeps Draft with AI disabled until required structured inputs and one skill are selected', () => {
    component.form.patchValue({
      title: 'Senior React Developer',
      client: 'Relia',
      departmentId: 'dept-engineering',
      locationId: 'loc-lahore',
      hiringManagerId: 'hm-1',
    });

    expect(component.canDraftWithAi()).toBe(false);

    component.toggleSkill('skill-react', { target: { checked: true } } as unknown as Event);

    expect(component.canDraftWithAi()).toBe(true);
  });

  it('explains client context for AI agents', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Client context');
    expect(text).toContain('AI agents use this as tenant-provided context');
    expect(text).toContain('similar industry/project evidence');
  });

  it('calls the Job Description Drafting Agent and inserts editable text', async () => {
    component.form.patchValue({
      title: 'Senior React Developer',
      client: 'Relia',
      clientContext: 'Fintech customer portal for similar industry matching.',
      departmentId: 'dept-engineering',
      locationId: 'loc-lahore',
      hiringManagerId: 'hm-1',
      priority: 'High',
    });
    component.toggleSkill('skill-react', { target: { checked: true } } as unknown as Event);

    await component.generateDescriptionDraft();

    expect(store.draftJobDescription).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior React Developer',
        clientContext: 'Fintech customer portal for similar industry matching.',
        departmentId: 'dept-engineering',
        skillIds: ['skill-react'],
      }),
    );
    expect(component.form.controls.description.value).toBe('AI drafted React role description.');
    expect(component.descriptionDraftStatus()).toBe('generated');
  });

  it('submits ID-based job request payload and navigates to detail', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.form.patchValue({
      title: 'Senior React Developer',
      client: 'Relia',
      clientContext: 'Fintech customer portal for similar industry matching.',
      description: 'Final edited description.',
      departmentId: 'dept-engineering',
      locationId: 'loc-lahore',
      hiringManagerId: 'hm-1',
      experienceMinYears: '5',
      experienceMaxYears: '8',
      requiredPositions: 1,
      priority: 'High',
    });
    component.toggleSkill('skill-react', { target: { checked: true } } as unknown as Event);

    await component.submit();

    expect(store.createJobRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 'dept-engineering',
        clientContext: 'Fintech customer portal for similar industry matching.',
        locationId: 'loc-lahore',
        skillIds: ['skill-react'],
        hiringManagerId: 'hm-1',
      }),
    );
    expect(navigate).toHaveBeenCalledWith(['/app/job-requests', 'jr-1']);
  });
});
