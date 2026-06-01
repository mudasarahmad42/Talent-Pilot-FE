import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { JobPostListItem, JobPostStatus } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

type JobPostFilter = 'All' | JobPostStatus;

@Component({
  selector: 'app-job-publishing',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Job Publishing</p>
          <h1>Recruiter job posts</h1>
          <p>Track draft, published, and closed Talent Pilot job posts linked to Job Requests.</p>
        </div>
        <a class="btn secondary compact" routerLink="/app/recruitment/queue">Recruitment Queue</a>
      </header>

      <section class="ops-stats-grid">
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">edit_note</span>
          <div>
            <span>Draft</span>
            <strong>{{ countByStatus('Draft') }}</strong>
            <small>Being prepared</small>
          </div>
        </article>
        <article class="ops-stat-card success">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">campaign</span>
          <div>
            <span>Published</span>
            <strong>{{ countByStatus('Published') }}</strong>
            <small>Ready for portal</small>
          </div>
        </article>
        <article class="ops-stat-card">
          <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">lock</span>
          <div>
            <span>Closed</span>
            <strong>{{ countByStatus('Closed') }}</strong>
            <small>No longer hiring</small>
          </div>
        </article>
      </section>

      <section class="ops-panel">
        <div class="ops-toolbar">
          <label class="ops-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input placeholder="Search job posts" />
          </label>
          <button type="button" class="ops-filter-button" [class.active]="filter() === 'All'" (click)="filter.set('All')">All</button>
          <button type="button" class="ops-filter-button" [class.active]="filter() === 'Draft'" (click)="filter.set('Draft')">Draft</button>
          <button type="button" class="ops-filter-button" [class.active]="filter() === 'Published'" (click)="filter.set('Published')">Published</button>
          <button type="button" class="ops-filter-button" [class.active]="filter() === 'Closed'" (click)="filter.set('Closed')">Closed</button>
        </div>

        @if (loading()) {
          <div class="empty-state">Loading job posts...</div>
        } @else if (visibleItems().length > 0) {
          <div class="table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Job Post</th>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                @for (item of visibleItems(); track item.jobPostId) {
                  <tr>
                    <td>
                      <a [routerLink]="['/app/recruitment/sourcing', item.jobRequestId]">
                        <strong>{{ item.title }}</strong>
                      </a>
                      <small>{{ item.location }}</small>
                    </td>
                    <td>{{ item.requestCode }}</td>
                    <td>{{ item.client }}</td>
                    <td>{{ item.department }}</td>
                    <td><span class="status-badge info">{{ item.status }}</span></td>
                    <td>{{ item.recruiterOwnerName }}</td>
                    <td>{{ item.updatedAt | date: 'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">No job posts match this filter.</div>
        }
      </section>
    </main>
  `,
})
export class JobPublishingComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  readonly items = signal<JobPostListItem[]>([]);
  readonly loading = signal(false);
  readonly filter = signal<JobPostFilter>('All');
  readonly visibleItems = computed(() => {
    const filter = this.filter();
    return filter === 'All' ? this.items() : this.items().filter((item) => item.status === filter);
  });

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.store.loadJobPublishing();
      this.items.set(result.items);
    } finally {
      this.loading.set(false);
    }
  }

  countByStatus(status: JobPostStatus): number {
    return this.items().filter((item) => item.status === status).length;
  }
}
