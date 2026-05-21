import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const INTERNAL_SCREEN_TITLES: Record<string, string> = {
  'bench-matching': 'Bench Matching',
  'internal-resource-referral': 'Internal Resource Referral',
  'presales-resource-review': 'Presales Resource Review',
  'recruitment-queue': 'Recruitment Queue',
  'job-publishing': 'Job Publishing',
  candidates: 'Candidates',
  'manual-candidate-add': 'Manual Candidate Add',
  'prospect-invite': 'Prospect Invite',
  'candidate-profile-details': 'Candidate Profile Details',
  'candidate-pipeline': 'Candidate Pipeline',
  'interview-scheduling': 'Interview Scheduling',
  'interview-feedback': 'Interview Feedback',
  'hiring-manager-review': 'Hiring Manager Review',
  'offer-onboarding': 'Offer and Onboarding',
  reports: 'Reports',
};

@Component({
  selector: 'app-internal-screen',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Talent Pilot App</p>
          <h1>{{ screenTitle() }}</h1>
          <p>This screen is reserved for backend-backed operational data.</p>
        </div>
        <div class="ops-header-actions">
          <span class="status-badge info">Live data required</span>
          <a class="btn primary compact" routerLink="/app/job-requests">
            <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
            Job Requests
          </a>
        </div>
      </header>

      <section class="ops-panel empty-live-data-panel">
        <span class="material-symbols-outlined" aria-hidden="true">database</span>
        <div>
          <h2>No local screen data is rendered here.</h2>
          <p>
            The UI will show this workflow after the backend exposes a typed endpoint for
            {{ screenTitle() }}. Until then, use the backend-backed dashboard, job requests,
            PMO queue, and notifications screens.
          </p>
        </div>
      </section>
    </main>
  `,
})
export class InternalScreenComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly routeScreenId = toSignal(this.route.data.pipe(map((data) => data['screenId'] as string | null)), {
    initialValue: null,
  });

  readonly screenTitle = computed(() => {
    const screenId = this.routeScreenId();
    return screenId ? (INTERNAL_SCREEN_TITLES[screenId] ?? 'Talent Pilot Workflow') : 'Talent Pilot Workflow';
  });
}
