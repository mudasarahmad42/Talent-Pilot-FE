import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-job-requests',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Job Requests</p>
          <h1>Resource demand</h1>
          <p>Manage and monitor all recruitment requisitions across the organization.</p>
        </div>
        <a class="btn primary compact" routerLink="/app/job-requests/new">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
          New Job Request
        </a>
      </header>

      <section class="ops-stats-grid">
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">assignment</span>
          <div>
            <span>Total requests</span>
            <strong>{{ store.jobRequests().length }}</strong>
            <small>Loaded from backend</small>
          </div>
        </article>
        <article class="ops-stat-card warning">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">pending_actions</span>
          <div>
            <span>Pending PMO</span>
            <strong>{{ store.pmoQueue().length }}</strong>
            <small>Needs owner</small>
          </div>
        </article>
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">person_search</span>
          <div>
            <span>Active hiring</span>
            <strong>{{ store.openJobRequests().length }}</strong>
            <small>Open stages</small>
          </div>
        </article>
        <article class="ops-stat-card success">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">check_circle</span>
          <div>
            <span>Completed</span>
            <strong>{{ completedRequests() }}</strong>
            <small>Closed requests</small>
          </div>
        </article>
      </section>

      <section class="ops-panel">
        @if (store.error(); as error) {
          <div class="empty-state">{{ error }}</div>
        }
        <div class="ops-toolbar">
          <label class="ops-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input placeholder="Search request codes or titles" />
          </label>
          <button type="button" class="ops-filter-button">Status: All</button>
          <button type="button" class="ops-filter-button">Department: All</button>
          <button type="button" class="ops-filter-button">Priority: All</button>
          <button type="button" class="ops-icon-button" aria-label="Filter">
            <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
          </button>
        </div>
        @if (store.loading()) {
          <div class="empty-state">Loading job requests from backend...</div>
        } @else if (store.jobRequests().length > 0) {
          <div class="table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Request</th>
                <th>Client</th>
                <th>Department</th>
                <th>Positions</th>
                <th>Priority</th>
                <th>Stage</th>
                <th>Owner</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (request of store.jobRequests(); track request.id) {
                <tr>
                  <td><strong class="request-code">{{ request.code }}</strong></td>
                  <td>
                    <a [routerLink]="['/app/job-requests', request.id]">
                      <strong>{{ request.title }}</strong>
                    </a>
                    <small>{{ request.location }} &middot; {{ request.experience }}</small>
                  </td>
                  <td>{{ request.client }}</td>
                  <td>{{ request.department }}</td>
                  <td>
                    <div class="position-progress">
                      <span><i [style.width.%]="fulfillmentPercent(request.fulfilledPositions, request.requiredPositions)"></i></span>
                      <strong>{{ request.fulfilledPositions }} / {{ request.requiredPositions }}</strong>
                    </div>
                  </td>
                  <td><span class="status-badge priority">{{ request.priority }}</span></td>
                  <td>
                    <span class="stage-cell">
                      <i></i>
                      {{ request.stage }}
                    </span>
                  </td>
                  <td>
                    <span class="owner-cell">
                      <i>{{ ownerInitials(request.ownerId ? store.getUserName(request.ownerId) : request.ownerGroupId) }}</i>
                      {{ request.ownerId ? store.getUserName(request.ownerId) : request.ownerGroupId }}
                    </span>
                  </td>
                  <td class="row-actions">
                    <a [routerLink]="['/app/job-requests', request.id]" aria-label="Open request">
                      <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </a>
                    <a [routerLink]="['/app/job-requests', request.id]" aria-label="More actions">
                      <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          </div>
        } @else {
          <div class="empty-state">No job requests were returned by backend.</div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      :host .ops-panel {
        border-radius: 8px;
        padding: 0;
      }

      :host .ops-toolbar {
        border-bottom: 1px solid var(--border);
        margin: 0;
        padding: 16px;
      }

      :host .table-wrap {
        overflow-x: auto;
      }

      :host .ops-table th {
        background: #f1f4f6;
        padding: 13px 16px;
      }

      :host .ops-table td {
        padding: 16px;
        vertical-align: middle;
      }

      :host .request-code {
        color: var(--primary);
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 13px;
      }

      :host .position-progress {
        align-items: center;
        display: flex;
        gap: 10px;
        min-width: 116px;
      }

      :host .position-progress span {
        background: #e0e3e5;
        border-radius: 999px;
        display: block;
        height: 6px;
        overflow: hidden;
        width: 70px;
      }

      :host .position-progress i {
        background: var(--primary);
        display: block;
        height: 100%;
      }

      :host .position-progress strong {
        font-size: 12px;
        white-space: nowrap;
      }

      :host .stage-cell,
      :host .owner-cell {
        align-items: center;
        display: inline-flex;
        gap: 8px;
        white-space: nowrap;
      }

      :host .stage-cell i {
        background: var(--primary);
        border-radius: 50%;
        height: 8px;
        width: 8px;
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
        height: 24px;
        justify-content: center;
        width: 24px;
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
    `,
  ],
})
export class JobRequestsComponent {
  constructor(readonly store: TalentPilotStoreService) {}

  completedRequests(): number {
    return this.store.jobRequests().filter((request) => request.stage === 'Closed').length;
  }

  fulfillmentPercent(fulfilledPositions: number, requiredPositions: number): number {
    if (requiredPositions <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((fulfilledPositions / requiredPositions) * 100));
  }

  ownerInitials(owner?: string): string {
    if (!owner) {
      return '--';
    }

    return owner
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
