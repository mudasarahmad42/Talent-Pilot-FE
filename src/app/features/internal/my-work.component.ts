import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-my-work',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Assigned request</p>
          <h1>My Work</h1>
          <p>Requests assigned directly to you or to one of your groups.</p>
        </div>
      </header>

      <section class="ops-panel">
        <div class="ops-toolbar">
          <label class="ops-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input placeholder="Search assigned requests" />
          </label>
          <button type="button" class="ops-filter-button">Stage: All</button>
          <button type="button" class="ops-filter-button">Owner: Me</button>
        </div>
        @if (workItems().length > 0) {
          <div class="table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of workItems(); track item.assignment.id) {
                  <tr>
                    <td>
                      <strong>{{ item.jobRequest.code }}</strong>
                      <small>{{ item.jobRequest.title }}</small>
                    </td>
                    <td>{{ item.jobRequest.client }}</td>
                    <td><span class="status-badge">{{ item.jobRequest.stage }}</span></td>
                    <td>{{ store.getUserName(item.assignment.claimedByUserId) }}</td>
                    <td><a [routerLink]="['/app/job-requests', item.jobRequest.id]">Open</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">No assigned requests.</div>
        }
      </section>
    </main>
  `,
})
export class MyWorkComponent {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);

  readonly workItems = computed(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }

    return this.store.pmoQueue().filter((item) => {
      const assignedToMyGroup = item.assignment.assignedToGroupId
        ? user.groups.includes(item.assignment.assignedToGroupId)
        : false;
      const assignedToMe = item.assignment.assignedToUserId === user.id;
      return assignedToMyGroup || assignedToMe;
    });
  });
}
