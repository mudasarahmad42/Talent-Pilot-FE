import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CandidateOperationsApplication,
  CandidateOperationsDataService,
  CandidateOperationsDataset,
} from './candidate-operations-data.service';

const TERMINAL_STATUSES = new Set(['Rejected', 'Withdrawn', 'Joined', 'Hired', 'OfferDeclined']);

@Component({
  selector: 'app-candidate-pipeline',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page candidate-pipeline-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Candidate operations</p>
          <h1>Candidate Pipeline</h1>
          <p>
            Track applications by current hiring stage across published job posts and recruiter
            sourcing work.
          </p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/candidates">Candidates</a>
          <a class="btn secondary compact" routerLink="/app/interview-scheduling"
            >Interview Scheduling</a
          >
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading candidate pipeline...</section>
      } @else if (error()) {
        <section class="ops-panel empty-state">
          <strong>Candidate pipeline could not be loaded.</strong>
          <p>{{ error() }}</p>
        </section>
      } @else {
        <section class="pipeline-stage-grid" aria-label="Candidate pipeline stages">
          @for (stage of stageCards(); track stage.key) {
            <button
              type="button"
              class="pipeline-stage-card"
              [class.active]="stageFilter === stage.key"
              (click)="stageFilter = stage.key"
            >
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }}</strong>
              <small>{{ stage.description }}</small>
            </button>
          }
        </section>

        <section class="ops-panel pipeline-list-panel">
          <div class="ops-toolbar candidates-toolbar">
            <label class="ops-search">
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
              <input
                name="pipelineSearch"
                type="search"
                [(ngModel)]="searchText"
                placeholder="Search candidate, job, client, source"
              />
            </label>
            <select
              class="ops-filter-button select-filter"
              name="stageFilter"
              [(ngModel)]="stageFilter"
            >
              <option value="">All stages</option>
              @for (stage of stageOptions(); track stage) {
                <option [ngValue]="stage">{{ stage }}</option>
              }
            </select>
            <select
              class="ops-filter-button select-filter"
              name="sourceFilter"
              [(ngModel)]="sourceFilter"
            >
              <option value="">All sources</option>
              @for (source of sourceOptions(); track source) {
                <option [ngValue]="source">{{ source }}</option>
              }
            </select>
            <button class="btn secondary compact" type="button" (click)="clearFilters()">
              Reset
            </button>
          </div>

          @if (filteredApplications().length === 0) {
            <div class="empty-state">
              <strong>No applications match the current filters.</strong>
              <p>
                Applications enter the pipeline through candidate portal apply or recruiter manual
                sourcing.
              </p>
            </div>
          } @else {
            <div
              class="candidate-ops-table pipeline-table"
              role="table"
              aria-label="Candidate pipeline"
            >
              <div class="candidate-ops-row table-head" role="row">
                <span role="columnheader">Candidate</span>
                <span role="columnheader">Job</span>
                <span role="columnheader">Current Stage</span>
                <span role="columnheader">Interview Progress</span>
                <span role="columnheader">Source</span>
                <span role="columnheader">Actions</span>
              </div>
              @for (item of filteredApplications(); track item.application.jobApplicationId) {
                <article class="candidate-ops-row" role="row">
                  <div role="cell" class="candidate-identity-cell">
                    <span class="avatar">{{ initials(item.application.candidateName) }}</span>
                    <span>
                      <strong>{{ item.application.candidateName }}</strong>
                      <small>{{ item.application.candidateEmail }}</small>
                      <small>{{
                        item.application.currentDesignation || 'Role not recorded'
                      }}</small>
                    </span>
                  </div>
                  <div role="cell">
                    <strong>{{ item.jobPost?.title || item.sourcing.jobRequest.title }}</strong>
                    <small
                      >{{ item.sourcing.jobRequest.code }} -
                      {{ item.sourcing.jobRequest.client }}</small
                    >
                    <small>{{ item.sourcing.jobRequest.department }}</small>
                  </div>
                  <div role="cell" class="pipeline-stage-cell">
                    <span class="pipeline-stage-chip">{{
                      displayStatus(item.application.applicationStatus)
                    }}</span>
                    <span class="pipeline-stage-meta">
                      Applied {{ item.application.appliedAt | date: 'mediumDate' }}
                    </span>
                  </div>
                  <div role="cell">
                    <strong>{{
                      item.application.interviewPassSummary || passSummary(item)
                    }}</strong>
                    @if (item.application.interviews.length === 0) {
                      <small>No interviews scheduled yet</small>
                    } @else {
                      <small
                        >{{ completedInterviewCount(item) }} completed /
                        {{ item.application.interviews.length }} scheduled</small
                      >
                    }
                  </div>
                  <div role="cell">
                    <strong>{{ item.application.sourceLabel }}</strong>
                    @if (item.application.sourceDetail) {
                      <small>{{ item.application.sourceDetail }}</small>
                    }
                  </div>
                  <div role="cell" class="pipeline-action-cell">
                    <details class="row-action-menu pipeline-action-menu">
                      <summary class="icon-button" aria-label="Open candidate pipeline actions">
                        <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                      </summary>
                      <div class="row-action-menu-panel" role="menu">
                        <a
                          role="menuitem"
                          [routerLink]="[
                            '/app/recruitment/applications',
                            item.application.jobApplicationId,
                            'history',
                          ]"
                          [queryParams]="{ returnUrl: currentUrl() }"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">history</span>
                          View history
                        </a>
                        <a
                          role="menuitem"
                          [routerLink]="['/app/recruitment/sourcing', item.sourcing.jobRequest.id]"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">work</span>
                          Open sourcing
                        </a>
                      </div>
                    </details>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      }
    </main>
  `,
})
export class CandidatePipelineComponent implements OnInit {
  private readonly dataService = inject(CandidateOperationsDataService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly dataset = signal<CandidateOperationsDataset | null>(null);

  searchText = '';
  stageFilter = '';
  sourceFilter = '';

  readonly applications = computed(() => this.dataset()?.applications ?? []);
  readonly filteredApplications = computed(() => this.applyFilters(this.applications()));

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.dataset.set(await this.dataService.load());
    } catch {
      this.error.set('The pipeline could not be assembled from current application data.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.stageFilter = '';
    this.sourceFilter = '';
  }

  stageCards(): { key: string; label: string; count: number; description: string }[] {
    const applications = this.applications();
    return [
      {
        key: 'Applied',
        label: 'Applied',
        count: this.countByStatus(['Applied']),
        description: 'Portal applications',
      },
      {
        key: 'Invited',
        label: 'Invited',
        count: this.countByStatus(['Invited']),
        description: 'Manual sourcing leads',
      },
      {
        key: 'Interviewing',
        label: 'Interviewing',
        count: applications.filter(
          (item) =>
            item.application.interviews.length > 0 &&
            !TERMINAL_STATUSES.has(item.application.applicationStatus),
        ).length,
        description: 'Scheduled or in progress',
      },
      {
        key: 'HiringManagerReview',
        label: 'HM Review',
        count: this.countByStatus(['HiringManagerReview', 'Hiring Manager Review']),
        description: 'Final review pending',
      },
      {
        key: 'Offered',
        label: 'Offered',
        count: this.countByStatus(['Offered']),
        description: 'Offer in progress',
      },
      {
        key: 'Joined',
        label: 'Joined',
        count: this.countByStatus(['Joined', 'Hired']),
        description: 'Fulfilled candidates',
      },
    ];
  }

  stageOptions(): string[] {
    return Array.from(
      new Set(this.applications().map((item) => item.application.applicationStatus)),
    )
      .filter(Boolean)
      .sort();
  }

  sourceOptions(): string[] {
    return Array.from(new Set(this.applications().map((item) => item.application.sourceLabel)))
      .filter(Boolean)
      .sort();
  }

  displayStatus(status: string): string {
    return status.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  passSummary(item: CandidateOperationsApplication): string {
    return `${item.application.interviewsPassed}/${item.application.interviewsTotal} passed`;
  }

  completedInterviewCount(item: CandidateOperationsApplication): number {
    return item.application.interviews.filter((interview) => interview.status === 'Completed')
      .length;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  currentUrl(): string {
    return this.router.url;
  }

  private countByStatus(statuses: string[]): number {
    return this.applications().filter((item) =>
      statuses.includes(item.application.applicationStatus),
    ).length;
  }

  private applyFilters(
    applications: CandidateOperationsApplication[],
  ): CandidateOperationsApplication[] {
    const search = this.searchText.trim().toLowerCase();
    return applications
      .filter(
        (item) => !this.stageFilter || item.application.applicationStatus === this.stageFilter,
      )
      .filter((item) => !this.sourceFilter || item.application.sourceLabel === this.sourceFilter)
      .filter((item) => {
        if (!search) {
          return true;
        }

        const values = [
          item.application.candidateName,
          item.application.candidateEmail,
          item.application.currentDesignation,
          item.application.sourceLabel,
          item.application.sourceDetail,
          item.jobPost?.title,
          item.sourcing.jobRequest.title,
          item.sourcing.jobRequest.code,
          item.sourcing.jobRequest.client,
          item.sourcing.jobRequest.department,
        ];
        return values
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .some((value) => value.toLowerCase().includes(search));
      })
      .sort(
        (left, right) =>
          new Date(right.application.appliedAt).getTime() -
          new Date(left.application.appliedAt).getTime(),
      );
  }
}
