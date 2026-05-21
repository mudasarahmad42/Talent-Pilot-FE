import { Component, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Priority } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-create-job-request',
  imports: [ReactiveFormsModule],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Presales intake</p>
          <h1>Create Job Request</h1>
          <p>Capture a resource requirement and route it to PMO Group for bench review.</p>
        </div>
      </header>

      <form class="form-layout ops-form-layout" [formGroup]="form" (ngSubmit)="submit()">
        <section class="ops-panel form-panel">
          <div class="panel-header">
            <h2>Request Details</h2>
            <span class="status-badge info">Routes to PMO</span>
          </div>
          <div class="field-grid two">
            <label>
              <span>Title</span>
              <input formControlName="title" placeholder="Senior Angular Engineer" />
            </label>
            <label>
              <span>Client</span>
              <input formControlName="client" placeholder="Client or project name" />
            </label>
          </div>

          <label>
            <span>Description</span>
            <textarea formControlName="description" rows="5" placeholder="Summarize the role, work, and must-have skills."></textarea>
          </label>

          <div class="field-grid three">
            <label>
              <span>Department</span>
              <input formControlName="department" placeholder="Department from backend lookup" />
            </label>
            <label>
              <span>Experience</span>
              <input formControlName="experience" placeholder="5-7 years" />
            </label>
            <label>
              <span>Location</span>
              <input formControlName="location" placeholder="Lahore / Remote" />
            </label>
          </div>

          <label>
            <span>Skills</span>
            <input formControlName="skills" placeholder="Angular, TypeScript, REST APIs" />
            <small>Comma-separated skills stored with the job request.</small>
          </label>

          <div class="field-grid three">
            <label>
              <span>Required positions</span>
              <input type="number" min="1" formControlName="requiredPositions" />
            </label>
            <label>
              <span>Priority</span>
              <select formControlName="priority">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </label>
            <label>
              <span>Hiring Manager</span>
              <select formControlName="hiringManagerId">
                @for (manager of hiringManagers(); track manager.userId) {
                  <option [value]="manager.userId">{{ manager.displayName }}</option>
                }
              </select>
            </label>
          </div>
        </section>

        <aside class="ops-side-rail">
          <article class="ops-panel">
          <h2>Routing Preview</h2>
          <div class="route-preview ops-route-preview">
            <span><i>1</i> Presales creates request</span>
            <span><i>2</i> PMO Group receives work item</span>
            <span><i>3</i> PMO claims ownership</span>
            <span><i>4</i> Bench Matching Agent is next</span>
          </div>
          <p class="muted">
            This MVP does not start finance, budget, or approval workflows. PMO checks
            benched employees before recruitment.
          </p>
          <button class="btn primary full" type="submit" [disabled]="form.invalid || saving()">Submit to PMO</button>
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

  readonly hiringManagers = computed(() =>
    this.store.people().filter((user) => user.roleCodes.includes('HiringManager')),
  );

  readonly form = this.fb.group({
    title: ['', Validators.required],
    client: ['', Validators.required],
    description: ['', Validators.required],
    department: ['', Validators.required],
    skills: ['', Validators.required],
    experience: ['', Validators.required],
    location: ['', Validators.required],
    requiredPositions: [1, [Validators.required, Validators.min(1)]],
    priority: ['Medium' as Priority, Validators.required],
    hiringManagerId: ['', Validators.required],
  });

  private readonly defaultHiringManagerEffect = effect(() => {
    const selectedValue = this.form.controls.hiringManagerId.value;
    const firstManager = this.hiringManagers()[0];
    if (!selectedValue && firstManager) {
      this.form.controls.hiringManagerId.setValue(firstManager.userId, { emitEvent: false });
    }
  });

  async submit(): Promise<void> {
    const user = this.auth.currentUser();
    if (this.form.invalid || !user || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);

    try {
      const jobRequest = await this.store.createJobRequest(
        {
          title: value.title,
          client: value.client,
          description: value.description,
          department: value.department,
          skills: value.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter((skill) => skill.length > 0),
          experience: value.experience,
          location: value.location,
          requiredPositions: value.requiredPositions,
          priority: value.priority,
          hiringManagerId: value.hiringManagerId,
        },
      );

      void this.router.navigate(['/app/job-requests', jobRequest.id]);
    } finally {
      this.saving.set(false);
    }
  }
}
