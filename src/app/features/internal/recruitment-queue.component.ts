import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RecruitmentQueueItem } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-recruitment-queue',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Recruitment Queue</p>
          <h1>Recruiter sourcing work</h1>
          <p>Claim PMO-forwarded Job Requests and prepare the Talent Pilot job post for publishing.</p>
        </div>
        <a class="btn secondary compact" routerLink="/app/job-publishing">Job Publishing</a>
      </header>

      <section class="ops-panel">
        <div class="ops-toolbar">
          <label class="ops-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input placeholder="Search recruiter queue" />
          </label>
          <button type="button" class="ops-filter-button">Stage: Recruiter Sourcing</button>
        </div>

        @if (loading()) {
          <div class="empty-state">Loading recruiter queue...</div>
        } @else if (items().length > 0) {
          <div class="table-wrap">
            <table class="ops-table recruiter-queue-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Priority</th>
                  <th>Assignment</th>
                  <th>Job Post</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.assignment.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/app/recruitment/sourcing', item.jobRequest.id]">
                        <strong>{{ item.jobRequest.code }}</strong>
                      </a>
                      <small>{{ item.jobRequest.title }}</small>
                    </td>
                    <td>{{ item.jobRequest.client }}</td>
                    <td><span class="status-badge priority">{{ item.jobRequest.priority }}</span></td>
                    <td>
                      <span class="status-badge">{{ item.assignment.status }}</span>
                      <small>{{ item.assignment.claimedByUserId ? store.getUserName(item.assignment.claimedByUserId) : item.jobRequest.ownerGroupId }}</small>
                    </td>
                    <td>
                      <span class="status-badge info">{{ postStatusLabel(item.jobPostStatus) }}</span>
                      @if (item.recruiterOwnerName) {
                        <small>{{ item.recruiterOwnerName }}</small>
                      }
                    </td>
                    <td>
                      @if (!item.assignment.claimedByUserId) {
                        <button type="button" class="btn compact primary" (click)="claim(item)">Claim</button>
                      } @else {
                        <a class="btn compact secondary" [routerLink]="['/app/recruitment/sourcing', item.jobRequest.id]">Open</a>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">
            <strong>No active recruiter sourcing work</strong>
            <p>PMO-forwarded requests will appear here while they are pending for your recruiting group or claimed by you.</p>
          </div>
        }
      </section>
    </main>
  `,
})
export class RecruitmentQueueComponent implements OnInit {
  readonly store = inject(TalentPilotStoreService);
  private readonly router = inject(Router);
  readonly items = signal<RecruitmentQueueItem[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const queue = await this.store.loadRecruitmentQueue();
      this.items.set(queue.items);
    } finally {
      this.loading.set(false);
    }
  }

  async claim(item: RecruitmentQueueItem): Promise<void> {
    await this.store.claimAssignment(item.assignment.id);
    await this.router.navigate(['/app/recruitment/sourcing', item.jobRequest.id]);
  }

  postStatusLabel(status: string): string {
    return status === 'NotStarted' ? 'Not started' : status;
  }
}
