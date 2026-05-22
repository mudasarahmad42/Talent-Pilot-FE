import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-pmo-queue',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">PMO Queue</p>
          <h1>PMO Queue</h1>
          <p>Manage and process incoming job requests for bench check and fulfillment.</p>
        </div>
        <div class="ops-header-actions">
          <button type="button" class="btn secondary compact">
            <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
            Filter
          </button>
          <button type="button" class="btn secondary compact">
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
            Export
          </button>
        </div>
      </header>

      <section class="queue-info-banner">
        <span class="material-symbols-outlined" aria-hidden="true">info</span>
        <p>Only one PMO user can claim and own a specific job request at a time to prevent duplicate processing.</p>
      </section>

      <nav class="queue-tabs" aria-label="PMO queue filters">
        <button type="button" class="active">New Requests ({{ store.pmoQueue().length }})</button>
        <button type="button">Claimed by Me ({{ claimedByMeCount() }})</button>
        <button type="button">In Progress ({{ claimedCount() }})</button>
        <button type="button">High Priority ({{ highPriorityCount() }})</button>
      </nav>

      <section class="ops-workspace-grid">
        <div class="ops-main-stack">
          <section class="ops-panel">
            @if (store.error(); as error) {
              <div class="empty-state">{{ error }}</div>
            }
            <div class="ops-toolbar">
              <label class="ops-search">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input placeholder="Search PMO queue" />
              </label>
              <button type="button" class="ops-filter-button">Assigned: All</button>
              <button type="button" class="ops-filter-button">Priority: All</button>
            </div>
        @if (store.loading()) {
          <div class="empty-state">Loading PMO queue from backend...</div>
        } @else if (store.pmoQueue().length > 0) {
          <div class="table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Pos.</th>
                  <th>Required Skills</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of store.pmoQueue(); track item.assignment.id) {
                  <tr>
                    <td>
                      <div class="request-stack">
                        <a [routerLink]="['/app/job-requests', item.jobRequest.id]">
                          <strong>{{ item.jobRequest.code }}</strong>
                        </a>
                        <small>{{ item.jobRequest.title }}</small>
                      </div>
                    </td>
                    <td>{{ item.jobRequest.client }}</td>
                    <td><strong>{{ item.jobRequest.requiredPositions }}</strong></td>
                    <td>
                      <div class="skill-tags">
                        @for (skill of item.jobRequest.skills.slice(0, 3); track skill) {
                          <span>{{ skill }}</span>
                        }
                      </div>
                    </td>
                    <td><span class="status-badge priority">{{ item.jobRequest.priority }}</span></td>
                    <td>{{ item.assignment.claimedByUserId ? store.getUserName(item.assignment.claimedByUserId) : (item.assignment.assignedToGroupName ?? 'PMO queue') }}</td>
                    <td>
                      <span class="queue-status">
                        <i></i>
                        {{ item.assignment.claimedByUserId ? item.assignment.status : 'Unclaimed' }}
                      </span>
                    </td>
                    <td>
                      @if (!item.assignment.claimedByUserId) {
                        <button type="button" class="btn compact primary" (click)="claim(item.assignment.id)">
                          Claim ownership
                        </button>
                      } @else if (canForward(item.assignment.claimedByUserId)) {
                        <a class="btn compact primary" [routerLink]="['/app/bench-matching', item.jobRequest.id]">
                          Bench matching
                        </a>
                      } @else {
                        <a [routerLink]="['/app/job-requests', item.jobRequest.id]">Open</a>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">No requests waiting for PMO review.</div>
        }
          </section>
        </div>

        <aside class="ops-side-rail">
          <article class="ops-panel">
            <h2>PMO rule</h2>
            <p class="muted">The recommendation agent checks current employees who are not working on any project before recruitment starts.</p>
            @if (store.pmoQueue()[0]; as nextItem) {
              <a class="btn primary full" [routerLink]="['/app/bench-matching', nextItem.jobRequest.id]">Open Bench Matching</a>
            } @else {
              <button class="btn primary full" type="button" disabled>No PMO request selected</button>
            }
          </article>
          <article class="scope-soft-note">
            <strong>MVP boundary</strong>
            <p>PMO suggests benched employees without automating internal employee interviews.</p>
          </article>
        </aside>
      </section>

      <section class="queue-summary-grid">
        <article>
          <span>Queue Health</span>
          <strong>{{ store.pmoQueue().length > 0 ? 'Active' : 'Clear' }}</strong>
          <div><i [style.width.%]="queueHealthPercent()"></i></div>
        </article>
        <article>
          <span>Claimed Items</span>
          <strong>{{ claimedCount() }}</strong>
          <small>Currently owned PMO work</small>
        </article>
        <article>
          <span>Unresolved High Priority</span>
          <strong>{{ highPriorityCount() }}</strong>
          <small>Requires immediate allocation</small>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      :host .queue-info-banner {
        align-items: flex-start;
        background: rgba(214, 227, 255, 0.45);
        border: 1px solid #d6e3ff;
        border-radius: 8px;
        color: #00468a;
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        padding: 13px 16px;
      }

      :host .queue-info-banner p {
        font-size: 13px;
        line-height: 20px;
        margin: 0;
      }

      :host .queue-tabs {
        border-bottom: 1px solid var(--border);
        display: flex;
        gap: 18px;
        margin-bottom: 16px;
        overflow-x: auto;
      }

      :host .queue-tabs button {
        background: transparent;
        border: 0;
        border-bottom: 2px solid transparent;
        color: #575f6c;
        font-size: 12px;
        font-weight: 800;
        min-height: 42px;
        padding: 0 2px;
        white-space: nowrap;
      }

      :host .queue-tabs button.active {
        border-bottom-color: var(--primary);
        color: var(--primary);
      }

      :host .ops-workspace-grid {
        grid-template-columns: minmax(0, 1fr) 280px;
      }

      :host .ops-main-stack {
        min-width: 0;
      }

      :host .ops-panel {
        border-radius: 8px;
      }

      :host .ops-main-stack > .ops-panel {
        min-width: 0;
        overflow: hidden;
        padding: 0;
      }

      :host .ops-toolbar {
        border-bottom: 1px solid var(--border);
        margin: 0;
        padding: 16px;
      }

      :host .ops-table th {
        background: #f1f4f6;
        padding: 13px 16px;
      }

      :host .ops-table td {
        padding: 16px;
        vertical-align: middle;
      }

      :host .request-stack strong {
        color: var(--primary);
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 13px;
      }

      :host .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        min-width: 150px;
      }

      :host .skill-tags span {
        background: #e5e9eb;
        border-radius: 4px;
        color: #414752;
        font-size: 10px;
        font-weight: 800;
        padding: 4px 7px;
        text-transform: uppercase;
      }

      :host .queue-status {
        align-items: center;
        color: #414752;
        display: inline-flex;
        font-size: 11px;
        font-weight: 800;
        gap: 7px;
        text-transform: uppercase;
        white-space: nowrap;
      }

      :host .queue-status i {
        background: #727783;
        border-radius: 50%;
        height: 8px;
        width: 8px;
      }

      :host .queue-summary-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 16px;
      }

      :host .queue-summary-grid article {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 16px;
      }

      :host .queue-summary-grid span {
        color: #575f6c;
        display: block;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      :host .queue-summary-grid strong {
        display: block;
        font-size: 20px;
        margin-top: 7px;
      }

      :host .queue-summary-grid small {
        color: var(--muted);
        display: block;
        font-size: 11px;
        margin-top: 7px;
      }

      :host .queue-summary-grid div {
        background: #e5e9eb;
        border-radius: 999px;
        height: 6px;
        margin-top: 12px;
        overflow: hidden;
      }

      :host .queue-summary-grid i {
        background: #057a55;
        display: block;
        height: 100%;
      }

      @media (max-width: 1180px) {
        :host .ops-workspace-grid,
        :host .queue-summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PmoQueueComponent {
  forwardingRequestId: string | null = null;

  constructor(
    readonly store: TalentPilotStoreService,
    private readonly auth: AuthService,
  ) {}

  async claim(assignmentId: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }

    await this.store.claimAssignment(assignmentId);
  }

  async forwardToRecruiter(jobRequestId: string): Promise<void> {
    this.forwardingRequestId = jobRequestId;
    try {
      await this.store.forwardToRecruiter(jobRequestId);
    } finally {
      this.forwardingRequestId = null;
    }
  }

  canForward(claimedByUserId?: string): boolean {
    const user = this.auth.currentUser();
    return Boolean(user && claimedByUserId === user.id);
  }

  claimedCount(): number {
    return this.store.pmoQueue().filter((item) => Boolean(item.assignment.claimedByUserId)).length;
  }

  claimedByMeCount(): number {
    const user = this.auth.currentUser();
    return user
      ? this.store.pmoQueue().filter((item) => item.assignment.claimedByUserId === user.id).length
      : 0;
  }

  highPriorityCount(): number {
    return this.store
      .pmoQueue()
      .filter((item) => item.jobRequest.priority === 'High' || item.jobRequest.priority === 'Critical').length;
  }

  queueHealthPercent(): number {
    const total = this.store.pmoQueue().length;
    if (total === 0) {
      return 100;
    }

    return Math.max(12, Math.round((this.claimedCount() / total) * 100));
  }
}
