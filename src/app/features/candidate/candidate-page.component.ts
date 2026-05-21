import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const CANDIDATE_PAGE_TITLES: Record<string, string> = {
  jobs: 'Job Listing',
  'job-detail': 'Job Detail',
  apply: 'Job Application Form',
  'invite-registration': 'Invite Registration',
  'confirm-application': 'Confirm Application',
  profile: 'Candidate Profile',
  'my-applications': 'My Applications',
  'application-status': 'Application Status',
  interviews: 'Interview Schedule',
  'reapply-blocked': 'Reapply Blocked State',
};

@Component({
  selector: 'app-candidate-page',
  imports: [RouterLink],
  template: `
    <main class="candidate-page stitch-candidate-page">
      <section class="candidate-hero-v2 compact">
        <div class="candidate-hero-copy">
          <span>Candidate Experience</span>
          <h1>{{ pageTitle() }}</h1>
          <p>This candidate screen will render only from candidate-facing backend APIs.</p>
        </div>
        <strong class="candidate-status-pill">Live data required</strong>
      </section>

      <section class="candidate-content-grid">
        <article class="candidate-panel candidate-backend-required">
          <span class="material-symbols-outlined" aria-hidden="true">database</span>
          <div>
            <h2>No local screen data is rendered here.</h2>
            <p>
              Candidate pages must use candidate-safe backend endpoints for published jobs,
              applications, profile, interviews, and reapply checks. This prevents internal
              workflow state from leaking into the candidate portal.
            </p>
          </div>
        </article>

        <aside class="candidate-status-rail">
          <article class="candidate-profile-cta">
            <strong>Backend contract required</strong>
            <p>The API contract is tracked in the frontend and backend knowledge-base folders.</p>
            <a routerLink="/app/dashboard">Back to app</a>
          </article>
        </aside>
      </section>

      <nav class="candidate-shortcuts" aria-label="Candidate shortcuts">
        <a routerLink="/candidate/jobs">Jobs</a>
        <a routerLink="/candidate/profile">Profile</a>
        <a routerLink="/candidate/my-applications">My Applications</a>
        <a routerLink="/candidate/interviews">Interviews</a>
      </nav>
    </main>
  `,
})
export class CandidatePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pageId = toSignal(this.route.data.pipe(map((data) => data['pageId'] as string | null)), {
    initialValue: 'jobs',
  });

  readonly pageTitle = computed(() => {
    const id = this.pageId();
    return id ? (CANDIDATE_PAGE_TITLES[id] ?? 'Candidate Experience') : 'Candidate Experience';
  });
}
