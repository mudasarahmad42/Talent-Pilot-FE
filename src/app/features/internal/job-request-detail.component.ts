import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-job-request-detail',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      @if (jobRequest(); as request) {
        <header class="ops-page-header">
          <div>
            <p class="eyebrow">{{ request.code }}</p>
            <h1>{{ request.title }}</h1>
            <p>{{ request.client }} - {{ request.department }} - {{ request.location }}</p>
          </div>
          <div class="ops-header-actions">
            <span class="status-badge">{{ request.stage }}</span>
            <a class="btn secondary compact" routerLink="/app/pmo/queue">PMO Queue</a>
          </div>
        </header>

        <section class="ops-workspace-grid">
          <div class="ops-main-stack">
            <article class="ops-panel">
              <div class="panel-header">
                <h2>Request Summary</h2>
                <span class="status-badge">{{ request.stage }}</span>
              </div>
              <p>{{ request.description }}</p>
              <div class="info-grid">
                <div><span>Priority</span><strong>{{ request.priority }}</strong></div>
                <div><span>Experience</span><strong>{{ request.experience }}</strong></div>
                <div><span>Hiring Manager</span><strong>{{ store.getUserName(request.hiringManagerId) }}</strong></div>
                <div><span>Owner</span><strong>{{ request.ownerId ? store.getUserName(request.ownerId) : request.ownerGroupId }}</strong></div>
              </div>
              <div class="skill-row">
                @for (skill of request.skills; track skill) {
                  <span>{{ skill }}</span>
                }
              </div>
            </article>

            <article class="ops-panel">
              <div class="panel-header">
                <h2>Activity</h2>
              </div>
              <div class="timeline">
                @for (event of activity(); track event.id) {
                  <div class="timeline-item">
                    <strong>{{ event.title }}</strong>
                    <p>{{ event.detail }}</p>
                    <small>{{ event.actorName }}</small>
                  </div>
                }
              </div>
            </article>
          </div>

          <aside class="ops-side-rail">
            <article class="ops-panel">
              <h2>Fulfillment</h2>
              <div class="progress-line">
                <span [style.width.%]="(request.fulfilledPositions / request.requiredPositions) * 100"></span>
              </div>
              <p>
                <strong>{{ request.fulfilledPositions }}</strong> of
                <strong>{{ request.requiredPositions }}</strong> positions fulfilled.
              </p>
              <a class="btn primary full" [routerLink]="['/app/bench-matching', request.id]">Start Bench Matching</a>
              <p class="muted">Current employees who are benched are first priority.</p>
            </article>

            <article class="scope-soft-note">
              <div class="panel-header">
                <h2>AI Recommendation Context</h2>
                <span class="status-badge info">Advisory</span>
              </div>
              <p>
                Next step is PMO bench matching. If no suitable employee is available,
                PMO can forward the request to Recruiter/HR for warm candidate rediscovery.
              </p>
            </article>
          </aside>
        </section>
      } @else {
        <section class="ops-panel">
          <h1>Request not found</h1>
          <a routerLink="/app/job-requests">Back to Job Requests</a>
        </section>
      }
    </main>
  `,
})
export class JobRequestDetailComponent {
  readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly jobRequest = computed(() => this.store.getJobRequestById(this.id));
  readonly activity = computed(() => this.store.activityForEntity(this.id));

  constructor() {
    if (this.id) {
      void this.store.loadJobRequest(this.id);
    }
  }
}
