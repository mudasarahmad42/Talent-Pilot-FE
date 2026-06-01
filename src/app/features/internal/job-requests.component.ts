import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-job-requests',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">{{ pageTitle() }}</p>
          <h1>{{ isPresalesOnly() ? 'My Job Requests' : 'Resource demand' }}</h1>
          <p>{{ pageDescription() }}</p>
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
            <span>{{ isPresalesOnly() ? 'My requests' : 'Total requests' }}</span>
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
        <div class="table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Request</th>
                <th>Client</th>
                <th>Priority</th>
                <th>Stage</th>
                <th>Fulfillment</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              @for (request of store.jobRequests(); track request.id) {
                <tr>
                  <td><strong>{{ request.code }}</strong></td>
                  <td>
                    <a [routerLink]="['/app/job-requests', request.id]">
                      <strong>{{ request.title }}</strong>
                    </a>
                    <small>{{ request.department }}</small>
                  </td>
                  <td>{{ request.client }}</td>
                  <td><span class="status-badge priority">{{ request.priority }}</span></td>
                  <td><span class="status-badge">{{ request.stage }}</span></td>
                  <td>{{ request.fulfilledPositions }} / {{ request.requiredPositions }}</td>
                  <td>{{ request.ownerId ? store.getUserName(request.ownerId) : request.ownerGroupId }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
})
export class JobRequestsComponent {
  private readonly auth = inject(AuthService);

  constructor(readonly store: TalentPilotStoreService) {}

  completedRequests(): number {
    return this.store.jobRequests().filter((request) => request.stage === 'Closed').length;
  }

  pageTitle(): string {
    return this.isPresalesOnly() ? 'My Job Requests' : 'Job Requests';
  }

  pageDescription(): string {
    return this.isPresalesOnly()
      ? 'Track the Job Requests you created and their PMO/recruitment progress.'
      : 'Manage and monitor all recruitment requisitions across the organization.';
  }

  isPresalesOnly(): boolean {
    return this.auth.hasAnyRole(['Presales']) && !this.auth.isAdmin();
  }
}
