import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecruitmentQueueItem } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-recruitment-queue',
  imports: [RouterLink],
  template: `
    <main class="page ops-page recruitment-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Recruitment Queue</p>
          <h1>Recruiter sourcing queue</h1>
          <p>Manage job requests forwarded by PMO after internal bench matching is not enough.</p>
        </div>
        <div class="ops-header-actions">
          <button type="button" class="btn secondary compact">
            <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
            Filters
          </button>
          <a class="btn primary compact" routerLink="/app/candidates/new">
            <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
            Add Candidate
          </a>
        </div>
      </header>

      <section class="ops-stats-grid">
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">work_outline</span>
          <div>
            <span>Open positions</span>
            <strong>{{ openPositions() }}</strong>
            <small>Remaining recruiter demand</small>
          </div>
        </article>
        <article class="ops-stat-card warning">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">assignment_turned_in</span>
          <div>
            <span>Queue items</span>
            <strong>{{ store.recruitmentQueue().length }}</strong>
            <small>Forwarded by PMO</small>
          </div>
        </article>
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">groups</span>
          <div>
            <span>Candidate links</span>
            <strong>{{ totalCandidates() }}</strong>
            <small>Applications attached</small>
          </div>
        </article>
        <article class="ops-stat-card success">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">public</span>
          <div>
            <span>Published jobs</span>
            <strong>{{ publishedCount() }}</strong>
            <small>Visible on portal</small>
          </div>
        </article>
      </section>

      <nav class="queue-tabs" aria-label="Recruitment queue filters">
        <button type="button" class="active">New to Recruitment ({{ newToRecruitmentCount() }})</button>
        <button type="button">Claimed by Me ({{ claimedCount() }})</button>
        <button type="button">Published Jobs ({{ publishedCount() }})</button>
        <button type="button">Needs Candidates ({{ needsCandidatesCount() }})</button>
        <button type="button">In Interviews (0)</button>
      </nav>

      <section class="ops-workspace-grid">
        <div class="ops-main-stack">
          <section class="ops-panel recruitment-table-panel">
            @if (store.error(); as error) {
              <div class="empty-state">{{ error }}</div>
            }
            <div class="ops-toolbar">
              <label class="ops-search">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input placeholder="Search requests, clients, skills" />
              </label>
              <button type="button" class="ops-filter-button">Department: All</button>
              <button type="button" class="ops-filter-button">Priority: All</button>
              <button type="button" class="ops-filter-button">Published: All</button>
            </div>

            @if (store.loading()) {
              <div class="empty-state">Loading recruitment queue from backend...</div>
            } @else if (store.recruitmentQueue().length > 0) {
              <div class="table-wrap">
                <table class="ops-table recruitment-table">
                  <thead>
                    <tr>
                      <th>Request Code</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Positions</th>
                      <th>Published</th>
                      <th>Candidates</th>
                      <th>Priority</th>
                      <th>Owner</th>
                      <th class="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of store.recruitmentQueue(); track item.assignment.id) {
                      <tr>
                        <td>
                          <a class="request-code" [routerLink]="['/app/job-requests', item.jobRequest.id]">
                            {{ item.jobRequest.code }}
                          </a>
                        </td>
                        <td>
                          <div class="title-stack">
                            <strong>{{ item.jobRequest.title }}</strong>
                            <small>{{ item.jobRequest.client }} &middot; {{ item.jobRequest.location }}</small>
                            <div class="skill-tags">
                              @for (skill of item.jobRequest.skills.slice(0, 3); track skill) {
                                <span>{{ skill }}</span>
                              }
                            </div>
                          </div>
                        </td>
                        <td>{{ item.jobRequest.department }}</td>
                        <td>
                          <div class="position-progress">
                            <span><i [style.width.%]="fulfillmentPercent(item)"></i></span>
                            <strong>{{ item.jobRequest.fulfilledPositions }} / {{ item.jobRequest.requiredPositions }}</strong>
                          </div>
                        </td>
                        <td>
                          <span class="status-badge" [class.success]="item.jobRequest.publishStatus === 'Published'">
                            {{ item.jobRequest.publishStatus }}
                          </span>
                        </td>
                        <td>
                          <strong>{{ item.candidateCount }}</strong>
                          <small class="cell-note">{{ item.candidateCount === 0 ? 'needs sourcing' : 'linked' }}</small>
                        </td>
                        <td><span class="status-badge priority">{{ item.jobRequest.priority }}</span></td>
                        <td>
                          <span class="owner-cell">
                            <i>{{ ownerInitials(item) }}</i>
                            {{ ownerLabel(item) }}
                          </span>
                        </td>
                        <td class="row-actions">
                          <a [routerLink]="['/app/job-requests', item.jobRequest.id]" aria-label="Open request">
                            <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                          </a>
                          <a routerLink="/app/job-publishing" aria-label="Publish job">
                            <span class="material-symbols-outlined" aria-hidden="true">public</span>
                          </a>
                          <a routerLink="/app/candidate-pipeline" aria-label="Open candidate pipeline">
                            <span class="material-symbols-outlined" aria-hidden="true">view_kanban</span>
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state">
                No job requests have been forwarded to recruitment yet.
              </div>
            }
          </section>
        </div>

        <aside class="ops-side-rail">
          <article class="ops-panel">
            <h2>Recruiter next step</h2>
            <p class="muted">Claim or open a request, confirm publish readiness, then publish it to the candidate portal.</p>
            <a class="btn primary full" routerLink="/app/job-publishing">Open Job Publishing</a>
          </article>
          <article class="scope-soft-note">
            <strong>MVP boundary</strong>
            <p>Recruiters manually publish jobs. LinkedIn publishing remains mocked for the hackathon demo.</p>
          </article>
        </aside>
      </section>
    </main>
  `,
  styles: [
    `
      :host .queue-tabs {
        border-bottom: 1px solid var(--border);
        display: flex;
        gap: 18px;
        margin: 8px 0 16px;
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

      :host .recruitment-table-panel {
        border-radius: 8px;
        min-width: 0;
        overflow: hidden;
        padding: 0;
      }

      :host .ops-toolbar {
        border-bottom: 1px solid var(--border);
        margin: 0;
        padding: 16px;
      }

      :host .table-wrap {
        max-width: 100%;
        overflow-x: auto;
      }

      :host .recruitment-table {
        min-width: 1120px;
      }

      :host .ops-table th {
        background: #f1f4f6;
        padding: 13px 18px;
        white-space: nowrap;
      }

      :host .ops-table td {
        padding: 18px;
        vertical-align: middle;
      }

      :host .request-code {
        color: var(--primary);
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
      }

      :host .title-stack {
        min-width: 260px;
      }

      :host .title-stack strong,
      :host .title-stack small {
        display: block;
      }

      :host .title-stack small,
      :host .cell-note {
        color: var(--muted);
        font-size: 11px;
        margin-top: 4px;
      }

      :host .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 8px;
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

      :host .position-progress {
        align-items: center;
        display: flex;
        gap: 10px;
        min-width: 122px;
      }

      :host .position-progress span {
        background: #e0e3e5;
        border-radius: 999px;
        display: block;
        height: 6px;
        overflow: hidden;
        width: 72px;
      }

      :host .position-progress i {
        background: var(--primary);
        display: block;
        height: 100%;
      }

      :host .position-progress strong,
      :host .owner-cell {
        white-space: nowrap;
      }

      :host .status-badge.success {
        background: var(--green-bg);
        color: var(--green);
      }

      :host .owner-cell {
        align-items: center;
        display: inline-flex;
        gap: 8px;
      }

      :host .owner-cell i {
        align-items: center;
        background: #dbe3f2;
        border-radius: 50%;
        color: var(--primary);
        display: inline-flex;
        font-size: 10px;
        font-style: normal;
        font-weight: 800;
        height: 26px;
        justify-content: center;
        width: 26px;
      }

      :host .actions-col {
        text-align: right;
      }

      :host .row-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      :host .row-actions a {
        color: #727783;
        display: inline-flex;
      }

      :host .row-actions a:hover {
        color: var(--primary);
      }

      @media (max-width: 1180px) {
        :host .ops-workspace-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RecruitmentQueueComponent {
  constructor(readonly store: TalentPilotStoreService) {}

  openPositions(): number {
    return this.store
      .recruitmentQueue()
      .reduce((total, item) => total + Math.max(0, item.jobRequest.requiredPositions - item.jobRequest.fulfilledPositions), 0);
  }

  totalCandidates(): number {
    return this.store.recruitmentQueue().reduce((total, item) => total + item.candidateCount, 0);
  }

  publishedCount(): number {
    return this.store.recruitmentQueue().filter((item) => item.jobRequest.publishStatus === 'Published').length;
  }

  newToRecruitmentCount(): number {
    return this.store.recruitmentQueue().filter((item) => item.assignment.status === 'Pending').length;
  }

  claimedCount(): number {
    return this.store.recruitmentQueue().filter((item) => item.assignment.status === 'Claimed').length;
  }

  needsCandidatesCount(): number {
    return this.store.recruitmentQueue().filter((item) => item.candidateCount === 0).length;
  }

  fulfillmentPercent(item: RecruitmentQueueItem): number {
    if (item.jobRequest.requiredPositions <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((item.jobRequest.fulfilledPositions / item.jobRequest.requiredPositions) * 100));
  }

  ownerLabel(item: RecruitmentQueueItem): string {
    if (item.assignment.claimedByUserId) {
      return this.store.getUserName(item.assignment.claimedByUserId);
    }

    return item.assignment.assignedToGroupName ?? item.jobRequest.ownerGroupId ?? 'Recruitment Team';
  }

  ownerInitials(item: RecruitmentQueueItem): string {
    return this.ownerLabel(item)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
