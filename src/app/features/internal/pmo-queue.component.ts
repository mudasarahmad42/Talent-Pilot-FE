import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { priorityBadgeClass } from '../../core/priority-formatting';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-pmo-queue',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">PMO Queue</p>
          <h1>PMO review work</h1>
          <p>Claim group-routed Job Requests, recommend internal employees to Presales, or forward to recruiters.</p>
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
                        <a [routerLink]="['/app/pmo/review', item.jobRequest.id]">
                        <strong>{{ item.jobRequest.code }}</strong>
                      </a>
                      <small>{{ item.jobRequest.title }}</small>
                    </td>
                    <td>{{ item.jobRequest.client }}</td>
                    <td><span [class]="priorityBadgeClass(item.jobRequest.priority)">{{ item.jobRequest.priority }}</span></td>
                    <td>{{ item.assignment.claimedByUserId ? store.getUserName(item.assignment.claimedByUserId) : 'PMO Group' }}</td>
                    <td><span class="status-badge">{{ item.assignment.status }}</span></td>
                    <td>
                      @if (!item.assignment.claimedByUserId) {
                        <button type="button" class="btn compact primary" (click)="claim(item.assignment.id)">
                          Claim ownership
                        </button>
                      } @else {
                        <a [routerLink]="['/app/pmo/review', item.jobRequest.id]">Open review</a>
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
            <h2>PMO Review</h2>
            <p class="muted">Claiming only assigns ownership. The Job Request stays in PMO Review until you recommend employees or forward it to recruiters.</p>
            @if (store.pmoQueue()[0]; as nextItem) {
              <a class="btn primary full" [routerLink]="['/app/pmo/review', nextItem.jobRequest.id]">Open PMO Review</a>
            } @else {
              <button class="btn primary full" type="button" disabled>No PMO request selected</button>
            }
          </article>
          <article class="scope-soft-note">
            <strong>AI support</strong>
            <p>After claiming a request, PMO can rank benched employees with AI and still chooses who to recommend.</p>
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
    private readonly router: Router,
  ) {}

  priorityBadgeClass(priority: string): string {
    return priorityBadgeClass(priority);
  }

  async claim(assignmentId: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) {
      return;
    }

    await this.store.claimAssignment(assignmentId);
    const item = this.store.pmoQueue().find((entry) => entry.assignment.id === assignmentId);
    if (item) {
      await this.router.navigate(['/app/pmo/review', item.jobRequest.id]);
    }
  }
}
