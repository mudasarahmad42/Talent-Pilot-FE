import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmployeeReferralDecisionItem } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { formatActivityTitle } from '../../core/activity-formatting';
import { formatJobDescription } from '../../core/job-description-formatting';

@Component({
  selector: 'app-job-request-detail',
  imports: [FormsModule, RouterLink],
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
            <a class="btn secondary compact" routerLink="/app/job-requests">{{ backLinkLabel() }}</a>
            <span class="status-badge">{{ request.stage }}</span>
            @if (canUsePmoActions()) {
              <a class="btn secondary compact" routerLink="/app/pmo/queue">PMO Queue</a>
            }
          </div>
        </header>

        <section class="ops-workspace-grid">
          <div class="ops-main-stack">
            <article class="ops-panel">
              <div class="panel-header">
                <h2>Request Summary</h2>
                <span class="status-badge">{{ request.stage }}</span>
              </div>
              <div class="job-description-body">{{ formattedDescription(request.description) }}</div>
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

            @if (pendingReferralReview().length > 0) {
              <article class="ops-panel">
                <div class="panel-header">
                  <div>
                    <h2>Internal Employee Recommendations</h2>
                    <p class="muted">PMO recommended these employees before recruiter sourcing starts.</p>
                  </div>
                  <span class="status-badge">Presales Review</span>
                </div>
                <div class="recommendation-list">
                  @for (referral of pendingReferralReview(); track referral.referralId) {
                    <article class="recommendation-row">
                      <div>
                        <strong>{{ referral.employeeName }}</strong>
                        <small>{{ referral.employeeEmail }} - {{ referral.designation || referral.department }}</small>
                        @if (referral.recommendationSummary) {
                          <p>{{ referral.recommendationSummary }}</p>
                        }
                      </div>
                      <div class="decision-controls">
                        <button
                          type="button"
                          class="btn compact"
                          [class.primary]="decisionFor(referral.referralId) === 'Accept'"
                          (click)="setDecision(referral.referralId, 'Accept')"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          class="btn compact"
                          [class.secondary]="decisionFor(referral.referralId) !== 'Reject'"
                          [class.primary]="decisionFor(referral.referralId) === 'Reject'"
                          (click)="setDecision(referral.referralId, 'Reject')"
                        >
                          Reject
                        </button>
                      </div>
                      @if (decisionFor(referral.referralId) === 'Reject') {
                        <label class="stitch-field">
                          <span>Rejection reason</span>
                          <textarea
                            rows="3"
                            [ngModel]="feedbackFor(referral.referralId)"
                            (ngModelChange)="setFeedback(referral.referralId, $event)"
                            placeholder="Tell PMO why this employee should not be used for this request."
                          ></textarea>
                        </label>
                      }
                    </article>
                  }
                </div>
                <div class="panel-actions">
                  <button
                    type="button"
                    class="btn primary"
                    [disabled]="reviewBusy() || !canSubmitReferralDecisions()"
                    (click)="submitReferralDecisions()"
                  >
                    Submit recommendation review
                  </button>
                  @if (reviewError()) {
                    <p class="field-status error">{{ reviewError() }}</p>
                  }
                </div>
              </article>
            }

            <article class="ops-panel">
              <div class="panel-header">
                <h2>Activity</h2>
              </div>
              <div class="timeline">
                @for (event of activity(); track event.id) {
                  <div class="timeline-item">
                    <strong>{{ activityTitle(event.title) }}</strong>
                    <p>{{ event.detail }}</p>
                    <small>{{ event.actorName || 'System' }}</small>
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
              @if (canUsePmoActions()) {
                <a class="btn primary full" [routerLink]="['/app/pmo/review', request.id]">Open PMO Review</a>
                <p class="muted">Recommend benched employees manually, or forward this request to recruiters.</p>
              } @else if (pendingReferralReview().length > 0) {
                <p class="muted">Review the internal employee recommendation from PMO.</p>
              } @else {
                <p class="muted">PMO owns the internal employee review step after intake routing.</p>
              }
            </article>
          </aside>
        </section>
      } @else {
        <section class="ops-panel">
          <h1>Request not found</h1>
          <a routerLink="/app/job-requests">{{ backLinkLabel() }}</a>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .recommendation-list {
        display: grid;
        gap: 12px;
      }

      .recommendation-row {
        border: 1px solid #d9e2ef;
        border-radius: 8px;
        display: grid;
        gap: 12px;
        padding: 14px;
      }

      .recommendation-row small {
        color: #64748b;
        display: block;
        margin-top: 2px;
      }

      .decision-controls {
        display: flex;
        gap: 8px;
      }

      .panel-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
      }

      .job-description-body {
        color: #0f172a;
        line-height: 1.65;
        margin: 0;
        white-space: pre-line;
      }
    `,
  ],
})
export class JobRequestDetailComponent {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly decisions = signal<Record<string, { decision?: 'Accept' | 'Reject'; feedback: string }>>({});
  readonly reviewBusy = signal(false);
  readonly reviewError = signal('');
  readonly jobRequest = computed(() => this.store.getJobRequestById(this.id));
  readonly activity = computed(() => this.store.activityForEntity(this.id));
  readonly pmoReview = computed(() => this.store.getPmoReviewByRequestId(this.id));
  readonly pendingReferralReview = computed(() => {
    const currentUserId = this.auth.currentUser()?.id;
    const isAdmin = this.auth.isAdmin();
    return (this.pmoReview()?.referrals ?? []).filter(
      (referral) =>
        referral.status === 'Referred' &&
        (isAdmin || !referral.presalesUserId || referral.presalesUserId === currentUserId),
    );
  });

  constructor() {
    if (this.id) {
      void this.store.loadActivityForEntity(this.id);
      void this.store.loadPmoReview(this.id);
    }
  }

  canUsePmoActions(): boolean {
    return this.auth.hasAnyRole(['PMO', 'TenantAdmin']);
  }

  backLinkLabel(): string {
    return this.auth.hasAnyRole(['Presales']) && !this.auth.isAdmin()
      ? 'Back to My Job Requests'
      : 'Back to Job Requests';
  }

  activityTitle(title: string): string {
    return formatActivityTitle(title);
  }

  formattedDescription(description: string): string {
    return formatJobDescription(description);
  }

  setDecision(referralId: string, decision: 'Accept' | 'Reject'): void {
    this.decisions.update((items) => ({
      ...items,
      [referralId]: {
        decision,
        feedback: items[referralId]?.feedback ?? '',
      },
    }));
    this.reviewError.set('');
  }

  decisionFor(referralId: string): 'Accept' | 'Reject' | undefined {
    return this.decisions()[referralId]?.decision;
  }

  feedbackFor(referralId: string): string {
    return this.decisions()[referralId]?.feedback ?? '';
  }

  setFeedback(referralId: string, feedback: string): void {
    this.decisions.update((items) => ({
      ...items,
      [referralId]: {
        decision: items[referralId]?.decision ?? 'Reject',
        feedback,
      },
    }));
    this.reviewError.set('');
  }

  canSubmitReferralDecisions(): boolean {
    const referrals = this.pendingReferralReview();
    if (referrals.length === 0) {
      return false;
    }

    return referrals.every((referral) => {
      const decision = this.decisions()[referral.referralId];
      if (!decision?.decision) {
        return false;
      }

      return decision.decision === 'Accept' || decision.feedback.trim().length > 0;
    });
  }

  async submitReferralDecisions(): Promise<void> {
    if (!this.canSubmitReferralDecisions()) {
      this.reviewError.set('Accept each recommendation or provide a rejection reason.');
      return;
    }

    const decisions: EmployeeReferralDecisionItem[] = this.pendingReferralReview().map((referral) => ({
      referralId: referral.referralId,
      decision: this.decisions()[referral.referralId]?.decision ?? 'Reject',
      feedback: this.decisions()[referral.referralId]?.feedback?.trim() || null,
    }));

    this.reviewBusy.set(true);
    this.reviewError.set('');
    try {
      await this.store.decideEmployeeReferrals(this.id, { decisions });
      this.decisions.set({});
    } catch {
      this.reviewError.set('The recommendation review could not be submitted.');
    } finally {
      this.reviewBusy.set(false);
    }
  }
}
