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
          <h1>Bench review work</h1>
          <p>Claim ownership before running bench matching or forwarding to recruitment.</p>
        </div>
      </header>

      <section class="ops-workspace-grid">
        <div class="ops-main-stack">
          <section class="ops-panel">
            <div class="ops-toolbar">
              <label class="ops-search">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input placeholder="Search PMO queue" />
              </label>
              <button type="button" class="ops-filter-button">Assigned: All</button>
              <button type="button" class="ops-filter-button">Priority: All</button>
            </div>
        @if (store.pmoQueue().length > 0) {
          <div class="table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
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
                      <a [routerLink]="['/app/job-requests', item.jobRequest.id]">
                        <strong>{{ item.jobRequest.code }}</strong>
                      </a>
                      <small>{{ item.jobRequest.title }}</small>
                    </td>
                    <td>{{ item.jobRequest.client }}</td>
                    <td><span class="status-badge priority">{{ item.jobRequest.priority }}</span></td>
                    <td>{{ item.assignment.claimedByUserId ? store.getUserName(item.assignment.claimedByUserId) : 'PMO Group' }}</td>
                    <td><span class="status-badge">{{ item.assignment.status }}</span></td>
                    <td>
                      @if (!item.assignment.claimedByUserId) {
                        <button type="button" class="btn compact primary" (click)="claim(item.assignment.id)">
                          Claim ownership
                        </button>
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
    </main>
  `,
})
export class PmoQueueComponent {
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
}
