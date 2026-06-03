import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CandidateOperationsDataService,
  CandidateOperationsDataset,
  CandidateOperationsInterview,
} from './candidate-operations-data.service';

@Component({
  selector: 'app-interview-scheduling',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page interview-scheduling-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Interview operations</p>
          <h1>Interview Scheduling</h1>
          <p>Monitor scheduled candidate interviews and open the recruiter workspace when the next round needs action.</p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/candidate-pipeline">Candidate Pipeline</a>
          <a class="btn secondary compact" routerLink="/app/interview-feedback">Interview Feedback</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading interview schedule...</section>
      } @else if (error()) {
        <section class="ops-panel empty-state">
          <strong>Interview schedule could not be loaded.</strong>
          <p>{{ error() }}</p>
        </section>
      } @else {
        <section class="ops-stats-grid">
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">event</span>
            <div>
              <span>Scheduled</span>
              <strong>{{ interviews().length }}</strong>
              <small>Total interview records</small>
            </div>
          </article>
          <article class="ops-stat-card success">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">task_alt</span>
            <div>
              <span>Completed</span>
              <strong>{{ countByStatus('Completed') }}</strong>
              <small>Feedback submitted</small>
            </div>
          </article>
          <article class="ops-stat-card warning">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">schedule</span>
            <div>
              <span>Upcoming</span>
              <strong>{{ upcomingCount() }}</strong>
              <small>Future scheduled rounds</small>
            </div>
          </article>
          <article class="ops-stat-card danger">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">pending_actions</span>
            <div>
              <span>Needs feedback</span>
              <strong>{{ pendingFeedbackCount() }}</strong>
              <small>Past scheduled, not completed</small>
            </div>
          </article>
        </section>

        <section class="ops-panel scheduling-panel">
          <div class="ops-toolbar candidates-toolbar">
            <label class="ops-search">
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
              <input name="scheduleSearch" type="search" [(ngModel)]="searchText" placeholder="Search candidate, job, interviewer, round" />
            </label>
            <select class="ops-filter-button select-filter" name="statusFilter" [(ngModel)]="statusFilter">
              <option value="">All statuses</option>
              @for (status of statusOptions(); track status) {
                <option [ngValue]="status">{{ status }}</option>
              }
            </select>
            <select class="ops-filter-button select-filter" name="roundFilter" [(ngModel)]="roundFilter">
              <option value="">All rounds</option>
              @for (round of roundOptions(); track round) {
                <option [ngValue]="round">{{ round }}</option>
              }
            </select>
            <button class="btn secondary compact" type="button" (click)="clearFilters()">Reset</button>
          </div>

          @if (filteredInterviews().length === 0) {
            <div class="empty-state">
              <strong>No interview records match the current filters.</strong>
              <p>Recruiters schedule interviews from the sourcing workspace after candidates apply or are manually added.</p>
            </div>
          } @else {
            <div class="candidate-ops-table scheduling-table" role="table" aria-label="Interview schedule">
              <div class="candidate-ops-row table-head" role="row">
                <span role="columnheader">Candidate</span>
                <span role="columnheader">Job / Round</span>
                <span role="columnheader">Interviewer</span>
                <span role="columnheader">Scheduled</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Actions</span>
              </div>
              @for (item of filteredInterviews(); track item.interview.interviewId) {
                <article class="candidate-ops-row" role="row">
                  <div role="cell" class="candidate-identity-cell">
                    <span class="avatar">{{ initials(item.application.candidateName) }}</span>
                    <span>
                      <strong>{{ item.application.candidateName }}</strong>
                      <small>{{ item.application.candidateEmail }}</small>
                      <small>{{ item.application.applicationStatus }}</small>
                    </span>
                  </div>
                  <div role="cell">
                    <strong>{{ item.jobPost?.title || item.sourcing.jobRequest.title }}</strong>
                    <small>{{ item.sourcing.jobRequest.code }} - {{ item.sourcing.jobRequest.client }}</small>
                    <small>{{ item.interview.roundName }}</small>
                  </div>
                  <div role="cell">
                    <strong>{{ item.interview.interviewerName }}</strong>
                    <small>{{ item.interview.durationMinutes }} minutes</small>
                  </div>
                  <div role="cell">
                    <strong>{{ item.interview.startsAt | date: 'medium' }}</strong>
                    @if (item.interview.meetingLink) {
                      <a [href]="item.interview.meetingLink" target="_blank" rel="noreferrer">Meeting link</a>
                    }
                    @if (item.interview.locationText) {
                      <small>{{ item.interview.locationText }}</small>
                    }
                  </div>
                  <div role="cell" class="scheduling-status-cell">
                    <span class="status-badge" [class.completed]="item.interview.status === 'Completed'">{{ item.interview.status }}</span>
                    @if (item.interview.recommendation) {
                      <small>Recommendation: {{ item.interview.recommendation }}</small>
                    }
                  </div>
                  <div role="cell" class="schedule-action-cell">
                    <details class="row-action-menu schedule-action-menu">
                      <summary class="icon-button" aria-label="Open interview actions">
                        <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                      </summary>
                      <div class="row-action-menu-panel" role="menu">
                        <a role="menuitem" [routerLink]="['/app/recruitment/sourcing', item.sourcing.jobRequest.id]">
                          <span class="material-symbols-outlined" aria-hidden="true">work</span>
                          Open sourcing
                        </a>
                        <a
                          role="menuitem"
                          [routerLink]="['/app/recruitment/applications', item.application.jobApplicationId, 'history']"
                          [queryParams]="{ returnUrl: '/app/interview-scheduling' }"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
                          View application
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
export class InterviewSchedulingComponent implements OnInit {
  private readonly dataService = inject(CandidateOperationsDataService);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly dataset = signal<CandidateOperationsDataset | null>(null);

  searchText = '';
  statusFilter = '';
  roundFilter = '';

  readonly interviews = computed(() => this.dataset()?.interviews ?? []);
  readonly filteredInterviews = computed(() => this.applyFilters(this.interviews()));

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.dataset.set(await this.dataService.load());
    } catch {
      this.error.set('The interview schedule could not be assembled from current application data.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = '';
    this.roundFilter = '';
  }

  countByStatus(status: string): number {
    return this.interviews().filter((item) => item.interview.status === status).length;
  }

  upcomingCount(): number {
    const now = Date.now();
    return this.interviews().filter((item) => new Date(item.interview.startsAt).getTime() >= now && item.interview.status !== 'Completed').length;
  }

  pendingFeedbackCount(): number {
    const now = Date.now();
    return this.interviews().filter((item) => new Date(item.interview.startsAt).getTime() < now && item.interview.status !== 'Completed').length;
  }

  statusOptions(): string[] {
    return Array.from(new Set(this.interviews().map((item) => item.interview.status))).filter(Boolean).sort();
  }

  roundOptions(): string[] {
    return Array.from(new Set(this.interviews().map((item) => item.interview.roundName))).filter(Boolean).sort();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private applyFilters(interviews: CandidateOperationsInterview[]): CandidateOperationsInterview[] {
    const search = this.searchText.trim().toLowerCase();
    return interviews
      .filter((item) => !this.statusFilter || item.interview.status === this.statusFilter)
      .filter((item) => !this.roundFilter || item.interview.roundName === this.roundFilter)
      .filter((item) => {
        if (!search) {
          return true;
        }

        const values = [
          item.application.candidateName,
          item.application.candidateEmail,
          item.interview.interviewerName,
          item.interview.roundName,
          item.interview.status,
          item.jobPost?.title,
          item.sourcing.jobRequest.title,
          item.sourcing.jobRequest.code,
          item.sourcing.jobRequest.client,
        ];
        return values
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .some((value) => value.toLowerCase().includes(search));
      })
      .sort((left, right) => new Date(left.interview.startsAt).getTime() - new Date(right.interview.startsAt).getTime());
  }
}
