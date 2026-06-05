import { formatDate } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HiringManagerReviewListItem, InterviewTask, WorkflowAssignment } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

interface MyWorkRow {
  id: string;
  typeLabel: string;
  typeIcon: string;
  title: string;
  subtitle: string;
  context: string;
  contextDetail: string;
  status: string;
  statusClass: string;
  ownerLabel: string;
  ownerDetail: string;
  actionLabel: string;
  route: string[];
  queryParams?: Record<string, string>;
  sourceRequestId?: string;
  priority: number;
  sortAt: string;
  searchText: string;
}

@Component({
  selector: 'app-my-work',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Assigned work</p>
          <h1>My Work</h1>
          <p>Requests, hiring reviews, claimed work, and interview feedback tasks assigned to you.</p>
        </div>
      </header>

      <section class="ops-panel">
        <div class="ops-toolbar my-work-toolbar">
          <label class="ops-search">
            <span class="material-symbols-outlined" aria-hidden="true">search</span>
            <input placeholder="Search assigned work" [value]="searchTerm()" (input)="updateSearch($event)" />
          </label>
          <div class="my-work-counts" aria-label="Assigned work counts">
            <span class="ops-filter-button">Requests: {{ requestWorkRows().length }}</span>
            <span class="ops-filter-button">Reviews: {{ hiringReviewWorkRows().length }}</span>
            <span class="ops-filter-button">Interviews: {{ interviewWorkRows().length }}</span>
          </div>
        </div>

        @if (hiringReviewError()) {
          <p class="field-status error">{{ hiringReviewError() }}</p>
        }
        @if (interviewTaskError()) {
          <p class="field-status error">{{ interviewTaskError() }}</p>
        }

        @if (workItems().length > 0) {
          <div class="table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Work Item</th>
                  <th>Context</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of workItems(); track item.id) {
                  <tr>
                    <td>
                      <span class="status-badge my-work-type">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ item.typeIcon }}</span>
                        {{ item.typeLabel }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ item.title }}</strong>
                      <small>{{ item.subtitle }}</small>
                    </td>
                    <td>
                      {{ item.context }}
                      <small>{{ item.contextDetail }}</small>
                    </td>
                    <td>
                      <span class="status-badge" [class.warning]="item.statusClass === 'warning'" [class.danger]="item.statusClass === 'danger'">
                        {{ item.status }}
                      </span>
                    </td>
                    <td>
                      {{ item.ownerLabel }}
                      <small>{{ item.ownerDetail }}</small>
                    </td>
                    <td><a [routerLink]="item.route" [queryParams]="item.queryParams">{{ item.actionLabel }}</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty-state">{{ emptyStateText() }}</div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .my-work-type {
        align-items: center;
        gap: 4px;
      }

      .my-work-type .material-symbols-outlined {
        font-size: 16px;
      }

      .my-work-toolbar {
        align-items: center;
      }

      .my-work-counts {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 8px;
      }

      .my-work-counts .ops-filter-button {
        align-items: center;
        display: inline-flex;
        justify-content: center;
        line-height: 1;
        white-space: nowrap;
      }

      .status-badge.warning {
        background: #fef3c7;
        border-color: #fde68a;
        color: #92400e;
      }

      .status-badge.danger {
        background: #fee2e2;
        border-color: #fecaca;
        color: #b91c1c;
      }

      @media (max-width: 760px) {
        .my-work-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .my-work-counts {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class MyWorkComponent implements OnInit {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);

  readonly searchTerm = signal('');
  readonly hiringReviews = signal<HiringManagerReviewListItem[]>([]);
  readonly hiringReviewError = signal('');
  readonly interviewTasks = signal<InterviewTask[]>([]);
  readonly interviewTaskError = signal('');
  readonly hiringReviewRequestIds = computed(
    () => new Set(this.hiringReviewWorkRows().map((item) => item.sourceRequestId).filter(Boolean)),
  );

  readonly requestWorkRows = computed<MyWorkRow[]>(() =>
    this.store.myWork()
      .filter((item) => item.assignment.stage !== 'Hiring Manager Review' || !this.hiringReviewRequestIds().has(item.jobRequest.id))
      .map((item) => ({
        id: `request-${item.assignment.id}`,
        typeLabel: 'Request',
        typeIcon: 'assignment',
        title: item.jobRequest.code,
        subtitle: item.jobRequest.title,
        context: item.jobRequest.client,
        contextDetail: item.jobRequest.department,
        status: item.jobRequest.stage,
        statusClass: 'default',
        ownerLabel: this.ownerName(item.assignment),
        ownerDetail: `Assigned ${this.formatDate(item.assignment.assignedAt)}`,
        actionLabel: 'Open',
        route: ['/app/job-requests', item.jobRequest.id],
        priority: 2,
        sortAt: item.assignment.assignedAt,
        searchText: [
          item.jobRequest.code,
          item.jobRequest.title,
          item.jobRequest.client,
          item.jobRequest.department,
          item.jobRequest.stage,
          this.ownerName(item.assignment),
        ].join(' '),
      })),
  );

  readonly hiringReviewWorkRows = computed<MyWorkRow[]>(() =>
    this.hiringReviews()
      .filter((review) => this.isActiveHiringReview(review))
      .map((review) => ({
        id: `hiring-review-${review.jobApplicationId}`,
        typeLabel: 'Hiring Review',
        typeIcon: 'approval_delegation',
        title: review.requestCode,
        subtitle: `${review.candidateName} - ${review.jobTitle}`,
        context: review.client,
        contextDetail: review.department,
        status: this.formatHiringReviewStatus(review.status),
        statusClass: 'warning',
        ownerLabel: review.hiringManagerName,
        ownerDetail: `Updated ${this.formatDate(review.updatedAt)}`,
        actionLabel: 'Open review',
        route: ['/app/hiring-manager/reviews', review.jobApplicationId],
        priority: 0,
        sortAt: review.updatedAt,
        sourceRequestId: review.jobRequestId,
        searchText: [
          review.requestCode,
          review.candidateName,
          review.jobTitle,
          review.client,
          review.department,
          review.status,
          review.hiringManagerName,
        ].join(' '),
      })),
  );

  readonly interviewWorkRows = computed<MyWorkRow[]>(() =>
    this.interviewTasks()
      .filter((task) => this.normalizeStatus(task.status) !== 'completed')
      .map((task) => {
        const overdue = this.isOverdue(task);
        return {
          id: `interview-${task.interviewId}`,
          typeLabel: 'Interview',
          typeIcon: 'rate_review',
          title: task.requestCode,
          subtitle: `${task.candidateName} - ${task.roundName}`,
          context: task.client,
          contextDetail: task.jobTitle,
          status: overdue ? 'Overdue' : task.status,
          statusClass: overdue ? 'danger' : 'warning',
          ownerLabel: task.interviewerName,
          ownerDetail: `Scheduled ${this.formatDate(task.startsAt)}`,
          actionLabel: 'Open feedback',
          route: ['/app/interview-feedback'],
          queryParams: { interviewId: task.interviewId },
          priority: overdue ? 0 : 1,
          sortAt: task.startsAt,
          searchText: [
            task.requestCode,
            task.candidateName,
            task.roundName,
            task.client,
            task.jobTitle,
            task.interviewerName,
            task.status,
          ].join(' '),
        };
      }),
  );

  readonly workItems = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    return [...this.hiringReviewWorkRows(), ...this.interviewWorkRows(), ...this.requestWorkRows()]
      .filter((item) => !search || item.searchText.toLowerCase().includes(search))
      .sort((left, right) => {
        const priorityDelta = left.priority - right.priority;
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return new Date(left.sortAt).getTime() - new Date(right.sortAt).getTime();
      });
  });

  ngOnInit(): void {
    void this.loadHiringReviews();
    void this.loadInterviewTasks();
  }

  async loadHiringReviews(): Promise<void> {
    this.hiringReviewError.set('');
    if (!this.auth.hasAnyRole(['HiringManager', 'TenantAdmin'])) {
      this.hiringReviews.set([]);
      return;
    }

    try {
      const result = await this.store.loadHiringManagerReviews();
      this.hiringReviews.set(result.items ?? []);
    } catch {
      this.hiringReviews.set([]);
      this.hiringReviewError.set('Hiring review work could not be loaded.');
    }
  }

  async loadInterviewTasks(): Promise<void> {
    this.interviewTaskError.set('');
    try {
      const result = await this.store.loadMyInterviewTasks();
      this.interviewTasks.set(result.items ?? []);
    } catch {
      this.interviewTasks.set([]);
      this.interviewTaskError.set('Interview work could not be loaded.');
    }
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  emptyStateText(): string {
    return this.searchTerm().trim() ? 'No assigned work matches your search.' : 'No assigned work.';
  }

  ownerName(assignment: WorkflowAssignment): string {
    return this.store.getUserName(assignment.claimedByUserId ?? assignment.assignedToUserId);
  }

  private isOverdue(task: InterviewTask): boolean {
    return this.normalizeStatus(task.status) !== 'completed' && new Date(task.startsAt).getTime() < Date.now();
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').trim().toLowerCase();
  }

  private isActiveHiringReview(review: HiringManagerReviewListItem): boolean {
    return ['hiringmanagerreview', 'offered', 'hired', 'onhold'].includes(this.normalizeStatus(review.status).replaceAll(' ', ''));
  }

  private formatHiringReviewStatus(status: string): string {
    return status
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bHm\b/g, 'HM');
  }

  private formatDate(value: string): string {
    return formatDate(value, 'medium', 'en-US');
  }
}
