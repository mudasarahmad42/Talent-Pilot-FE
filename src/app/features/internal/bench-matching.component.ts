import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { JobRequest, OperationsBenchMatch } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-bench-matching',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">PMO Bench Matching</p>
          <h1>Find internal resources first</h1>
          <p>Review available bench employees before recruitment starts.</p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/pmo/queue">
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            PMO Queue
          </a>
          @if (jobRequest(); as request) {
            <button
              type="button"
              class="btn secondary compact"
              [disabled]="forwarding()"
              (click)="forwardToRecruiter(request.id)"
            >
              <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
              {{ forwarding() ? 'Forwarding...' : 'No match, send to HR' }}
            </button>
          }
        </div>
      </header>

      @if (error(); as message) {
        <section class="queue-info-banner warning">
          <span class="material-symbols-outlined" aria-hidden="true">warning</span>
          <p>{{ message }}</p>
        </section>
      }

      @if (loading()) {
        <section class="ops-panel">
          <div class="empty-state">Loading bench matches from backend...</div>
        </section>
      } @else if (jobRequest(); as request) {
        <section class="ops-workspace-grid bench-layout">
          <div class="ops-main-stack">
            <section class="ops-panel request-summary-card">
              <div>
                <p class="eyebrow">{{ request.code }}</p>
                <h2>{{ request.title }}</h2>
                <p>{{ request.description }}</p>
              </div>
              <div class="request-facts">
                <span><strong>{{ request.client }}</strong> Client</span>
                <span><strong>{{ request.requiredPositions }}</strong> Required</span>
                <span><strong>{{ request.fulfilledPositions }}</strong> Fulfilled</span>
                <span><strong>{{ request.priority }}</strong> Priority</span>
              </div>
              <div class="skill-tags large">
                @for (skill of request.skills; track skill) {
                  <span>{{ skill }}</span>
                }
              </div>
            </section>

            <section class="ops-panel">
              <div class="section-heading-row">
                <div>
                  <p class="eyebrow">Bench Matching Agent</p>
                  <h2>Recommended employees</h2>
                </div>
                <span class="status-badge">{{ selectedEmployeeIds().length }} selected</span>
              </div>

              @if (matches().length > 0) {
                <div class="bench-match-grid">
                  @for (match of matches(); track match.employeeId) {
                    <article class="bench-card" [class.selected]="isSelected(match.employeeId)">
                      <header>
                        <label class="bench-select">
                          <input
                            type="checkbox"
                            [checked]="isSelected(match.employeeId)"
                            (change)="toggleSelection(match.employeeId)"
                          />
                          <span>{{ match.matchScore }}%</span>
                        </label>
                        <div>
                          <h3>{{ match.displayName }}</h3>
                          <p>{{ match.designation || 'Internal employee' }}</p>
                        </div>
                      </header>

                      <dl>
                        <div>
                          <dt>Code</dt>
                          <dd>{{ match.employeeCode }}</dd>
                        </div>
                        <div>
                          <dt>Department</dt>
                          <dd>{{ match.department }}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{{ match.location }}</dd>
                        </div>
                        <div>
                          <dt>Allocation</dt>
                          <dd>{{ match.currentAllocationPercent }}%</dd>
                        </div>
                      </dl>

                      <div class="skill-tags">
                        @for (skill of match.skills.slice(0, 6); track skill) {
                          <span>{{ skill }}</span>
                        }
                      </div>

                      <p class="match-explanation">{{ match.matchExplanation }}</p>
                      <footer>
                        <span class="status-badge success">{{ match.availabilityStatus }}</span>
                        <span class="status-badge">{{ match.benchStatus }}</span>
                      </footer>
                    </article>
                  }
                </div>
              } @else {
                <div class="empty-state">No active bench employees matched this request.</div>
              }
            </section>
          </div>

          <aside class="ops-side-rail">
            <article class="ops-panel referral-panel">
              <h2>Refer to Presales</h2>
              <p class="muted">
                Selected employees are sent back to the request owner for client pitch review. This does not create candidate records.
              </p>
              <label>
                Referral note
                <textarea
                  rows="5"
                  [value]="referralNote()"
                  (input)="referralNote.set($any($event.target).value)"
                  placeholder="Add context for Presales..."
                ></textarea>
              </label>
              <button
                type="button"
                class="btn primary full"
                [disabled]="selectedEmployeeIds().length === 0 || submitting()"
                (click)="submitReferral(request.id)"
              >
                {{ submitting() ? 'Sending referral...' : 'Refer selected employees' }}
              </button>
            </article>

            <article class="scope-soft-note">
              <strong>MVP rule</strong>
              <p>PMO refers bench employees as-is. Internal interviews for employees are outside the MVP.</p>
            </article>

            @if (createdReferralCount() > 0) {
              <article class="ops-panel success-panel">
                <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
                <strong>{{ createdReferralCount() }} referral records created</strong>
                <p>Presales has been notified through the backend notification flow.</p>
              </article>
            }
          </aside>
        </section>
      } @else {
        <section class="ops-panel">
          <div class="empty-state">Job request was not found.</div>
        </section>
      }
    </main>
  `,
  styles: [
    `
      :host .bench-layout {
        grid-template-columns: minmax(0, 1fr) 320px;
      }

      :host .request-summary-card {
        display: grid;
        gap: 18px;
      }

      :host .request-summary-card h2 {
        font-size: 24px;
        margin: 0 0 8px;
      }

      :host .request-summary-card p {
        color: var(--muted);
        line-height: 21px;
        margin: 0;
      }

      :host .request-facts {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      :host .request-facts span {
        background: #f7f9fb;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        padding: 12px;
        text-transform: uppercase;
      }

      :host .request-facts strong {
        color: var(--ink);
        display: block;
        font-size: 16px;
        margin-bottom: 5px;
        text-transform: none;
      }

      :host .section-heading-row {
        align-items: center;
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      :host .section-heading-row h2 {
        margin: 0;
      }

      :host .bench-match-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      :host .bench-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        padding: 16px;
      }

      :host .bench-card.selected {
        border-color: var(--primary);
        box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
      }

      :host .bench-card header {
        align-items: center;
        display: grid;
        gap: 12px;
        grid-template-columns: auto minmax(0, 1fr);
      }

      :host .bench-card h3 {
        font-size: 17px;
        margin: 0;
      }

      :host .bench-card header p {
        color: var(--muted);
        margin: 4px 0 0;
      }

      :host .bench-select {
        align-items: center;
        background: #eaf2ff;
        border-radius: 8px;
        color: var(--primary);
        display: grid;
        font-weight: 900;
        gap: 7px;
        justify-items: center;
        padding: 9px;
      }

      :host .bench-select input {
        height: 18px;
        width: 18px;
      }

      :host .bench-card dl {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0;
      }

      :host .bench-card dt {
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }

      :host .bench-card dd {
        font-weight: 800;
        margin: 3px 0 0;
      }

      :host .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      :host .skill-tags span {
        background: #eef3f7;
        border-radius: 4px;
        color: #344054;
        font-size: 10px;
        font-weight: 800;
        padding: 5px 7px;
        text-transform: uppercase;
      }

      :host .skill-tags.large span {
        background: #e6f0ff;
        color: var(--primary);
      }

      :host .match-explanation {
        color: #414752;
        font-size: 13px;
        line-height: 20px;
        margin: 0;
      }

      :host .bench-card footer {
        display: flex;
        gap: 8px;
      }

      :host .referral-panel {
        display: grid;
        gap: 14px;
      }

      :host .referral-panel h2 {
        margin: 0;
      }

      :host .referral-panel label {
        color: #344054;
        display: grid;
        font-size: 12px;
        font-weight: 800;
        gap: 8px;
      }

      :host .referral-panel textarea {
        border: 1px solid var(--border);
        border-radius: 8px;
        font: inherit;
        min-height: 118px;
        padding: 12px;
        resize: vertical;
      }

      :host .success-panel {
        align-items: start;
        display: grid;
        gap: 8px;
      }

      :host .success-panel .material-symbols-outlined {
        color: #057a55;
      }

      :host .queue-info-banner.warning {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #9a3412;
        margin-bottom: 16px;
      }

      @media (max-width: 1180px) {
        :host .bench-layout,
        :host .request-facts,
        :host .bench-match-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class BenchMatchingComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly notifications = inject(NotificationService);
  readonly store = inject(TalentPilotStoreService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly forwarding = signal(false);
  readonly error = signal<string | null>(null);
  readonly jobRequest = signal<JobRequest | undefined>(undefined);
  readonly matches = signal<OperationsBenchMatch[]>([]);
  readonly selectedEmployeeIds = signal<string[]>([]);
  readonly referralNote = signal('');
  readonly createdReferralCount = signal(0);

  readonly selectedMatches = computed(() => {
    const selected = new Set(this.selectedEmployeeIds());
    return this.matches().filter((match) => selected.has(match.employeeId));
  });

  constructor() {
    void this.load();
  }

  isSelected(employeeId: string): boolean {
    return this.selectedEmployeeIds().includes(employeeId);
  }

  toggleSelection(employeeId: string): void {
    this.selectedEmployeeIds.update((items) =>
      items.includes(employeeId)
        ? items.filter((item) => item !== employeeId)
        : [...items, employeeId],
    );
  }

  async submitReferral(jobRequestId: string): Promise<void> {
    if (this.selectedEmployeeIds().length === 0 || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      const result = await this.store.createInternalResourceReferral(jobRequestId, {
        employeeIds: this.selectedEmployeeIds(),
        note: this.referralNote().trim() || undefined,
      });

      this.createdReferralCount.set(result.referrals.length);
      this.selectedEmployeeIds.set([]);
      this.referralNote.set('');
      this.notifications.success('Internal resource referral sent to Presales.');
    } catch {
      this.error.set('Referral could not be sent. Make sure the request is claimed by PMO and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async forwardToRecruiter(jobRequestId: string): Promise<void> {
    if (this.forwarding()) {
      return;
    }

    this.forwarding.set(true);
    this.error.set(null);

    try {
      await this.store.forwardToRecruiter(jobRequestId);
      this.notifications.info('Request forwarded to Recruitment.');
    } catch {
      this.error.set('Request could not be forwarded to Recruitment.');
    } finally {
      this.forwarding.set(false);
    }
  }

  private async load(): Promise<void> {
    const jobRequestId = this.route.snapshot.paramMap.get('jobRequestId');
    if (!jobRequestId) {
      this.error.set('Job request id is missing.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const [request, matches] = await Promise.all([
        this.store.loadJobRequest(jobRequestId),
        this.store.loadBenchMatches(jobRequestId),
      ]);

      this.jobRequest.set(request);
      this.matches.set(matches);
    } catch {
      this.error.set('Bench matches could not be loaded from the backend.');
    } finally {
      this.loading.set(false);
    }
  }
}
