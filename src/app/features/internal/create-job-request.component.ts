import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LookupOption, Priority } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import {
  DEFAULT_SKILL_GROUP_LABEL,
  SkillGroupTab,
  buildSkillGroupTabs as buildSharedSkillGroupTabs,
  selectedSkillOptionsFor,
  skillsForGroup as sharedSkillsForGroup,
  visibleSkillGroupSubtitle as sharedVisibleSkillGroupSubtitle,
  visibleSkillGroupTitle as sharedVisibleSkillGroupTitle,
  visibleSkillsForPicker,
} from '../../shared/skill-groups';

interface FormProgressStep {
  label: string;
  helper: string;
  state: 'complete' | 'active' | 'pending';
}

@Component({
  selector: 'app-create-job-request',
  imports: [ReactiveFormsModule],
  template: `
    <main class="page ops-page job-request-create-page">
      <header class="ops-page-header job-request-create-header">
        <div>
          <p class="eyebrow">Presales intake</p>
          <h1>Create Job Request</h1>
          <p>Capture a resource requirement, select the right capability signals, then draft or write the description.</p>
        </div>
      </header>

      <form class="form-layout ops-form-layout job-request-layout" [formGroup]="form" (ngSubmit)="submit()">
        <div class="job-request-main-stack">
          <article class="ops-panel job-request-section">
            <div class="section-heading">
              <span class="section-icon material-symbols-outlined" aria-hidden="true">badge</span>
              <div>
                <h2>Basic Details</h2>
                <p>Who needs the resource and where should the request route?</p>
              </div>
            </div>

            <div class="field-grid two">
              <label>
                <span>Title</span>
                <input formControlName="title" placeholder="Senior React Developer" />
              </label>
              <label>
                <span>Client</span>
                <input formControlName="client" placeholder="Client or project name" />
              </label>
            </div>

            <div class="field-grid two">
              <label>
                <span>Department</span>
                <select formControlName="departmentId">
                  <option value="">Select department</option>
                  @for (department of intakeOptions()?.departments ?? []; track department.departmentId) {
                    <option [value]="department.departmentId">{{ department.name }}</option>
                  }
                </select>
              </label>
              <label>
                <span>Location</span>
                <select formControlName="locationId">
                  <option value="">Select location</option>
                  @for (location of intakeOptions()?.locations ?? []; track location.id) {
                    <option [value]="location.id">{{ location.name }}</option>
                  }
                </select>
              </label>
            </div>
          </article>

          <article class="ops-panel job-request-section skills-section">
            <div class="section-heading">
              <span class="section-icon material-symbols-outlined" aria-hidden="true">psychology</span>
              <div>
                <h2>Skills & Experience</h2>
                <p>Pick skills by role family. Search covers the full tenant skill catalog.</p>
              </div>
            </div>

            <div class="skill-toolbar">
              <label class="skill-search">
                <span>Search skills</span>
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                  type="search"
                  [value]="skillSearch()"
                  (input)="setSkillSearch($event)"
                  placeholder="Search Java, React, Figma, Terraform..."
                />
              </label>
              <div class="selected-skill-summary">
                <strong>{{ selectedSkillCount() }}</strong>
                <span>selected</span>
              </div>
            </div>

            @if (skillGroupTabs().length > 0) {
              <div class="skill-group-tabs" role="tablist" aria-label="Skill groups">
                @for (group of skillGroupTabs(); track group.label) {
                  <button
                    type="button"
                    class="skill-group-tab"
                    [class.active]="activeSkillGroup() === group.label && !skillSearch().trim()"
                    (click)="selectSkillGroup(group.label)"
                  >
                    <span>{{ group.label }}</span>
                    <small>{{ group.count }}</small>
                  </button>
                }
              </div>
            }

            @if (selectedSkillOptions().length > 0) {
              <div class="selected-skill-strip" aria-label="Selected skills">
                @for (skill of selectedSkillOptions(); track skill.id) {
                  <button class="selected-skill-chip" type="button" (click)="removeSkill(skill.id)">
                    {{ skill.name }}
                    <span class="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                }
                <button class="clear-skills-button" type="button" (click)="clearSkills()">Clear all</button>
              </div>
            }

            <div class="skill-picker-panel">
              <div class="skill-picker-heading">
                <div>
                  <h3>{{ visibleSkillGroupTitle() }}</h3>
                  <p>{{ visibleSkillGroupSubtitle() }}</p>
                </div>
              </div>

              @if (visibleSkills().length > 0) {
                <div class="skill-picker-grid">
                  @for (skill of visibleSkills(); track skill.id) {
                    <label class="skill-option-card" [class.selected]="isSkillSelected(skill.id)">
                      <input
                        type="checkbox"
                        [checked]="isSkillSelected(skill.id)"
                        (change)="toggleSkill(skill.id, $event)"
                      />
                      <span>{{ skill.name }}</span>
                      @if (skill.description) {
                        <small>{{ skill.description }}</small>
                      }
                    </label>
                  }
                </div>
              } @else {
                <p class="empty-inline-state">No skills matched this group or search.</p>
              }
            </div>

            <div class="field-grid three compact-fields">
              <label>
                <span>Minimum experience</span>
                <input type="number" min="0" step="0.5" formControlName="experienceMinYears" placeholder="5" />
              </label>
              <label>
                <span>Maximum experience</span>
                <input type="number" min="0" step="0.5" formControlName="experienceMaxYears" placeholder="8" />
              </label>
              <label>
                <span>Required positions</span>
                <input type="number" min="1" formControlName="requiredPositions" />
              </label>
            </div>
          </article>

          <article class="ops-panel job-request-section">
            <div class="section-heading">
              <span class="section-icon material-symbols-outlined" aria-hidden="true">flag</span>
              <div>
                <h2>Priority & Hiring Manager</h2>
                <p>Set urgency and assign the business owner for recruiter and offer-stage context.</p>
              </div>
            </div>

            <div class="field-grid two">
              <label>
                <span>Priority</span>
                <div class="priority-segmented" role="radiogroup" aria-label="Priority">
                  @for (priority of priorityOptions; track priority) {
                    <button
                      type="button"
                      [class.active]="form.controls.priority.value === priority"
                      (click)="setPriority(priority)"
                    >
                      {{ priority }}
                    </button>
                  }
                </div>
              </label>
              <label>
                <span>Hiring Manager</span>
                <select formControlName="hiringManagerId">
                  <option value="">Select hiring manager</option>
                  @for (manager of intakeOptions()?.hiringManagers ?? []; track manager.id) {
                    <option [value]="manager.id">{{ manager.name }}</option>
                  }
                </select>
              </label>
            </div>
          </article>

          <article class="ops-panel job-request-section">
            <div class="section-heading">
              <span class="section-icon material-symbols-outlined" aria-hidden="true">edit_note</span>
              <div>
                <h2>Job Description</h2>
                <p>Write your own description or draft one from the structured fields above.</p>
              </div>
            </div>

            <label class="job-description-draft-field">
              <span class="description-label-row">
                <span>Description</span>
                <button
                  class="btn secondary compact ai-draft-button"
                  type="button"
                  [disabled]="!canDraftWithAi() || draftingDescription()"
                  (click)="requestDescriptionDraft()"
                >
                  @if (draftingDescription()) {
                    Generating...
                  } @else {
                    ✨ Draft with AI
                  }
                </button>
              </span>
              <textarea formControlName="description" rows="7" placeholder="Summarize the role, work, collaboration expectations, and must-have skills."></textarea>
            </label>

            @if (confirmReplaceDescription()) {
              <div class="ai-draft-inline-choice" role="status">
                <p>Description already has text. Replace it with a new AI draft?</p>
                <div>
                  <button class="btn secondary compact" type="button" (click)="cancelDescriptionDraft()">Cancel</button>
                  <button class="btn primary compact" type="button" (click)="generateDescriptionDraft()">Replace current text</button>
                </div>
              </div>
            }
            @if (descriptionDraftStatus() === 'generated') {
              <p class="field-status success">AI draft inserted. Review and edit it before submitting.</p>
            }
            @if (descriptionDraftError()) {
              <p class="field-status error">{{ descriptionDraftError() }}</p>
            }
          </article>
        </div>

        <aside class="ops-side-rail job-request-side-rail">
          <article class="ops-panel form-progress-card">
            <h2>Form Progress</h2>
            <p class="form-progress-completion">Completion: {{ formProgressPercent() }}%</p>
            <div class="form-progress-meter" aria-hidden="true">
              <span [style.width.%]="formProgressPercent()"></span>
            </div>
            <ol class="form-progress-list">
              @for (step of formProgressSteps(); track step.label) {
                <li [class.complete]="step.state === 'complete'" [class.active]="step.state === 'active'">
                  <i class="material-symbols-outlined" aria-hidden="true">
                    {{ step.state === 'complete' ? 'check_circle' : step.state === 'active' ? 'radio_button_checked' : 'radio_button_unchecked' }}
                  </i>
                  <span>
                    <strong>{{ step.label }}</strong>
                  </span>
                </li>
              }
            </ol>
            <div class="form-progress-help">
              <strong>Need help?</strong>
              <p>Read our recruitment guide for creating effective job requests.</p>
              <a class="btn secondary compact" routerLink="/app/job-requests">Documentation</a>
            </div>
          </article>

          <article class="ops-panel routing-card">
            <h2>Routing Preview</h2>
            @if (selectedDepartment(); as department) {
              <div class="route-preview ops-route-preview">
                <span><i>1</i> {{ currentUserLabel() }} creates request</span>
                <span><i>2</i> {{ department.name }} routes to {{ department.routingPreview.targetName }}</span>
                <span><i>3</i> Request enters PMO Review</span>
                <span><i>4</i> PMO checks internal bench first</span>
              </div>
              @if (department.routingPreview.usesTenantAdminFallback) {
                <p class="muted warning-copy">
                  No active PMO recipient is configured for this department. The request will fall back to Tenant Admins.
                </p>
              } @else {
                <p class="muted">
                  The selected department controls which PMO user or group receives this request.
                </p>
              }
            } @else {
              <p class="muted">Select a department to see who receives the PMO Review work item.</p>
            }
          </article>

          <article class="ops-panel submit-card">
            <button class="btn primary full" type="submit" [disabled]="form.invalid || selectedSkillIds().length === 0 || saving()">
              Submit to PMO
            </button>
            <p>Submits the request to PMO Review and stores the final description for matching agents.</p>
          </article>
        </aside>
      </form>
    </main>
  `,
})
export class CreateJobRequestComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly store = inject(TalentPilotStoreService);

  readonly saving = signal(false);
  readonly draftingDescription = signal(false);
  readonly confirmReplaceDescription = signal(false);
  readonly descriptionDraftStatus = signal<'idle' | 'generating' | 'generated' | 'failed'>('idle');
  readonly descriptionDraftError = signal<string | null>(null);
  readonly selectedSkillIds = signal<string[]>([]);
  readonly skillSearch = signal('');
  readonly activeSkillGroup = signal(DEFAULT_SKILL_GROUP_LABEL);
  readonly intakeOptions = this.store.intakeOptions;
  readonly priorityOptions: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

  readonly form = this.fb.group({
    title: ['', Validators.required],
    client: ['', Validators.required],
    description: ['', Validators.required],
    departmentId: ['', Validators.required],
    locationId: ['', Validators.required],
    experienceMinYears: [''],
    experienceMaxYears: [''],
    requiredPositions: [1, [Validators.required, Validators.min(1)]],
    priority: ['Medium' as Priority, Validators.required],
    hiringManagerId: ['', Validators.required],
  });

  private readonly selectedDepartmentId = toSignal(this.form.controls.departmentId.valueChanges, {
    initialValue: this.form.controls.departmentId.value,
  });
  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly selectedDepartment = computed(() => {
    const departmentId = this.selectedDepartmentId();
    return this.intakeOptions()?.departments.find((department) => department.departmentId === departmentId) ?? null;
  });

  readonly selectedSkillCount = computed(() => this.selectedSkillIds().length);

  readonly selectedSkillOptions = computed(() => {
    return selectedSkillOptionsFor(this.skillOptions(), this.selectedSkillIds());
  });

  readonly skillGroupTabs = computed<SkillGroupTab[]>(() =>
    buildSharedSkillGroupTabs(this.skillOptions()),
  );

  readonly visibleSkills = computed(() => {
    return visibleSkillsForPicker(this.skillOptions(), this.skillSearch(), this.activeSkillGroup());
  });

  readonly visibleSkillGroupTitle = computed(() =>
    sharedVisibleSkillGroupTitle(this.skillSearch(), this.activeSkillGroup()),
  );

  readonly visibleSkillGroupSubtitle = computed(() => {
    return sharedVisibleSkillGroupSubtitle(this.skillSearch(), this.visibleSkills().length);
  });

  readonly canDraftWithAi = computed(() => {
    const value = this.formValue();
    return Boolean(
      value.title?.trim() &&
        value.departmentId &&
        value.locationId &&
        value.hiringManagerId &&
        this.selectedSkillIds().length > 0,
    );
  });

  readonly formProgressSteps = computed<FormProgressStep[]>(() => {
    const value = this.formValue();
    const steps = [
      {
        label: 'Basic Details',
        helper: 'Title, client, department, and location',
        complete: Boolean(value.title?.trim() && value.client?.trim() && value.departmentId && value.locationId),
      },
      {
        label: 'Skills & Experience',
        helper: 'At least one configured skill',
        complete: this.selectedSkillIds().length > 0,
      },
      {
        label: 'Positions & Priority',
        helper: 'Open positions and request urgency',
        complete: Boolean(Number(value.requiredPositions) > 0 && value.priority),
      },
      {
        label: 'Hiring Manager & Routing',
        helper: 'Business owner and PMO route',
        complete: Boolean(value.hiringManagerId && this.selectedDepartment()),
      },
      {
        label: 'Job Description',
        helper: 'Written or AI-drafted text',
        complete: Boolean(value.description?.trim()),
      },
    ];
    const firstIncomplete = steps.findIndex((step) => !step.complete);

    return steps.map((step, index) => ({
      label: step.label,
      helper: step.helper,
      state: step.complete ? 'complete' : index === firstIncomplete ? 'active' : 'pending',
    }));
  });

  readonly formProgressPercent = computed(() => {
    const steps = this.formProgressSteps();
    if (steps.length === 0) {
      return 0;
    }

    const completeCount = steps.filter((step) => step.state === 'complete').length;
    return Math.round((completeCount / steps.length) * 100);
  });

  private readonly defaultIntakeValuesEffect = effect(() => {
    const options = this.intakeOptions();
    if (!options) {
      return;
    }

    if (!this.form.controls.departmentId.value && options.departments[0]) {
      this.form.controls.departmentId.setValue(options.departments[0].departmentId);
    }

    if (!this.form.controls.locationId.value && options.locations[0]) {
      this.form.controls.locationId.setValue(options.locations[0].id);
    }

    if (!this.form.controls.hiringManagerId.value && options.hiringManagers[0]) {
      this.form.controls.hiringManagerId.setValue(options.hiringManagers[0].id);
    }
  });

  constructor() {
    void this.store.loadIntakeOptions();
  }

  isSkillSelected(skillId: string): boolean {
    return this.selectedSkillIds().includes(skillId);
  }

  toggleSkill(skillId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedSkillIds.update((skillIds) => {
      if (checked) {
        return skillIds.includes(skillId) ? skillIds : [...skillIds, skillId];
      }

      return skillIds.filter((selectedId) => selectedId !== skillId);
    });
    this.resetDraftMessages();
  }

  removeSkill(skillId: string): void {
    this.selectedSkillIds.update((skillIds) => skillIds.filter((selectedId) => selectedId !== skillId));
    this.resetDraftMessages();
  }

  clearSkills(): void {
    this.selectedSkillIds.set([]);
    this.resetDraftMessages();
  }

  setSkillSearch(event: Event): void {
    this.skillSearch.set((event.target as HTMLInputElement).value);
  }

  selectSkillGroup(groupLabel: string): void {
    this.activeSkillGroup.set(groupLabel);
    this.skillSearch.set('');
  }

  setPriority(priority: Priority): void {
    this.form.controls.priority.setValue(priority);
    this.form.controls.priority.markAsDirty();
  }

  currentUserLabel(): string {
    return this.auth.hasAnyRole(['PMO']) ? 'PMO' : 'Presales';
  }

  requestDescriptionDraft(): void {
    if (!this.canDraftWithAi() || this.draftingDescription()) {
      return;
    }

    if (this.form.controls.description.value.trim()) {
      this.confirmReplaceDescription.set(true);
      this.descriptionDraftError.set(null);
      return;
    }

    void this.generateDescriptionDraft();
  }

  cancelDescriptionDraft(): void {
    this.confirmReplaceDescription.set(false);
  }

  async generateDescriptionDraft(): Promise<void> {
    if (!this.canDraftWithAi() || this.draftingDescription()) {
      return;
    }

    const value = this.form.getRawValue();
    this.confirmReplaceDescription.set(false);
    this.draftingDescription.set(true);
    this.descriptionDraftStatus.set('generating');
    this.descriptionDraftError.set(null);

    try {
      const draft = await this.store.draftJobDescription({
        title: value.title,
        client: value.client,
        departmentId: value.departmentId,
        locationId: value.locationId,
        skillIds: this.selectedSkillIds(),
        experienceMinYears: this.toOptionalNumber(value.experienceMinYears),
        experienceMaxYears: this.toOptionalNumber(value.experienceMaxYears),
        requiredPositions: value.requiredPositions,
        priority: value.priority,
        hiringManagerId: value.hiringManagerId,
      });

      this.form.controls.description.setValue(draft.description);
      this.form.controls.description.markAsDirty();
      this.descriptionDraftStatus.set('generated');
    } catch (error) {
      this.descriptionDraftStatus.set('failed');
      this.descriptionDraftError.set(this.toErrorMessage(error));
    } finally {
      this.draftingDescription.set(false);
    }
  }

  async submit(): Promise<void> {
    const user = this.auth.currentUser();
    if (this.form.invalid || this.selectedSkillIds().length === 0 || !user || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);

    try {
      const jobRequest = await this.store.createJobRequest({
        title: value.title,
        client: value.client,
        description: value.description,
        departmentId: value.departmentId,
        locationId: value.locationId,
        skillIds: this.selectedSkillIds(),
        experienceMinYears: this.toOptionalNumber(value.experienceMinYears),
        experienceMaxYears: this.toOptionalNumber(value.experienceMaxYears),
        requiredPositions: value.requiredPositions,
        priority: value.priority,
        hiringManagerId: value.hiringManagerId,
      });

      void this.router.navigate(['/app/job-requests', jobRequest.id]);
    } finally {
      this.saving.set(false);
    }
  }

  private skillOptions(): LookupOption[] {
    return this.intakeOptions()?.skills ?? [];
  }

  private skillsForGroup(groupLabel: string): LookupOption[] {
    return sharedSkillsForGroup(this.skillOptions(), groupLabel);
  }

  private toOptionalNumber(value: string | number | null): number | null {
    if (value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resetDraftMessages(): void {
    this.confirmReplaceDescription.set(false);
    if (this.descriptionDraftStatus() !== 'generating') {
      this.descriptionDraftStatus.set('idle');
      this.descriptionDraftError.set(null);
    }
  }

  private toErrorMessage(error: unknown): string {
    const httpError = error as { error?: { message?: string }; message?: string };
    return httpError.error?.message ?? httpError.message ?? 'The Job Description Drafting Agent is unavailable.';
  }
}
