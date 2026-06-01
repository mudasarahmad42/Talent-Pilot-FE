import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ManualCandidateSearchItem } from '../../core/models';
import {
  CandidateOperationsApplication,
  CandidateOperationsDataService,
  CandidateOperationsDataset,
} from './candidate-operations-data.service';

@Component({
  selector: 'app-candidates',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page candidates-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Candidate operations</p>
          <h1>Candidates</h1>
          <p>Review the tenant candidate pool, latest applications, interview evidence, and source history.</p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/recruitment/talent-rediscovery">Candidate Rediscovery</a>
          <a class="btn secondary compact" routerLink="/app/candidate-pipeline">Pipeline</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading candidates...</section>
      } @else if (error()) {
        <section class="ops-panel empty-state">
          <strong>Candidates could not be loaded.</strong>
          <p>{{ error() }}</p>
        </section>
      } @else {
        <section class="ops-stats-grid">
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">groups</span>
            <div>
              <span>Candidate pool</span>
              <strong>{{ candidates().length }}</strong>
              <small>With application history</small>
            </div>
          </article>
          <article class="ops-stat-card success">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">assignment</span>
            <div>
              <span>Applications</span>
              <strong>{{ applications().length }}</strong>
              <small>Across active job posts</small>
            </div>
          </article>
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">how_to_reg</span>
            <div>
              <span>Interview evidence</span>
              <strong>{{ withInterviewEvidenceCount() }}</strong>
              <small>Previous passed interviews</small>
            </div>
          </article>
          <article class="ops-stat-card warning">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">campaign</span>
            <div>
              <span>Invited</span>
              <strong>{{ invitedApplicationsCount() }}</strong>
              <small>Manual sourcing leads</small>
            </div>
          </article>
        </section>

        <section class="ops-panel candidates-panel">
          <div class="ops-toolbar candidates-toolbar">
            <label class="ops-search">
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
              <input name="candidateSearch" type="search" [(ngModel)]="searchText" placeholder="Search name, email, role, skill, source" />
            </label>
            <select class="ops-filter-button select-filter" name="statusFilter" [(ngModel)]="statusFilter">
              <option value="">All statuses</option>
              @for (status of statusOptions(); track status) {
                <option [ngValue]="status">{{ status }}</option>
              }
            </select>
            <select class="ops-filter-button select-filter" name="sourceFilter" [(ngModel)]="sourceFilter">
              <option value="">All sources</option>
              @for (source of sourceOptions(); track source) {
                <option [ngValue]="source">{{ source }}</option>
              }
            </select>
            <select class="ops-filter-button select-filter" name="skillFilter" [(ngModel)]="skillFilter">
              <option value="">All skills</option>
              @for (skill of skillOptions(); track skill) {
                <option [ngValue]="skill">{{ skill }}</option>
              }
            </select>
            <button class="btn secondary compact" type="button" (click)="clearFilters()">Reset</button>
          </div>

          @if (filteredCandidates().length === 0) {
            <div class="empty-state">
              <strong>No candidates match the current filters.</strong>
              <p>Candidate records appear here after portal applications, manual sourcing, or historical seed data.</p>
            </div>
          } @else {
            <div class="candidate-ops-table" role="table" aria-label="Candidates">
              <div class="candidate-ops-row table-head" role="row">
                <span role="columnheader">Candidate</span>
                <span role="columnheader">Skills</span>
                <span role="columnheader">Interview History</span>
                <span role="columnheader">Latest Application</span>
                <span role="columnheader">Actions</span>
              </div>
              @for (candidate of filteredCandidates(); track candidate.candidateId) {
                <article class="candidate-ops-row" role="row">
                  <div role="cell" class="candidate-identity-cell">
                    <span class="avatar">{{ initials(candidate.displayName) }}</span>
                    <span>
                      <strong>{{ candidate.displayName }}</strong>
                      <small>{{ candidate.email }}</small>
                      <small>{{ candidate.currentDesignation || 'Role not recorded' }} - {{ formatExperience(candidate.experienceYears) }}</small>
                      <span class="status-badge subtle">{{ candidate.status }}</span>
                    </span>
                  </div>
                  <div role="cell" class="chip-list">
                    @for (skill of candidate.skills.slice(0, 5); track skill) {
                      <span class="skill-chip" [class.matched]="candidate.matchedSkills.includes(skill)">{{ skill }}</span>
                    }
                    @if (candidate.skills.length > 5) {
                      <span class="skill-chip muted-chip">+{{ candidate.skills.length - 5 }}</span>
                    }
                  </div>
                  <div role="cell">
                    <strong>{{ candidate.passedInterviews }} of {{ candidate.totalInterviews }} interviews passed</strong>
                    <small>{{ candidate.failedInterviews }} failed interview(s)</small>
                    <small>{{ candidate.applicationCount }} historical application(s)</small>
                  </div>
                  <div role="cell">
                    @if (candidate.latestApplication; as application) {
                      <strong>{{ application.displayJobTitle || application.jobPostTitle || application.jobTitle }}</strong>
                      <small>{{ application.requestCode }} - {{ application.status }}</small>
                      <small>{{ application.sourceLabel }} - {{ application.appliedAt | date: 'mediumDate' }}</small>
                    } @else {
                      <span class="muted">No application history</span>
                    }
                  </div>
                  <div role="cell" class="candidate-action-stack">
                    <a
                      class="table-link-button"
                      [routerLink]="['/app/recruitment/candidates', candidate.candidateId, 'profile']"
                      [queryParams]="{ returnUrl: currentUrl() }"
                    >
                      View profile
                    </a>
                    @if (candidate.latestApplication; as application) {
                      <a
                        class="table-link-button"
                        [routerLink]="['/app/recruitment/applications', application.jobApplicationId, 'history']"
                        [queryParams]="{ returnUrl: currentUrl() }"
                      >
                        View latest application
                      </a>
                    }
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
export class CandidatesComponent implements OnInit {
  private readonly dataService = inject(CandidateOperationsDataService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly dataset = signal<CandidateOperationsDataset | null>(null);

  searchText = '';
  statusFilter = '';
  sourceFilter = '';
  skillFilter = '';

  readonly candidates = computed(() => this.dataset()?.candidates ?? []);
  readonly applications = computed(() => this.dataset()?.applications ?? []);
  readonly filteredCandidates = computed(() => this.applyFilters(this.candidates()));

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.dataset.set(await this.dataService.load());
    } catch {
      this.error.set('The candidate pool could not be assembled from current job-post and sourcing data.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.statusFilter = '';
    this.sourceFilter = '';
    this.skillFilter = '';
  }

  statusOptions(): string[] {
    return Array.from(new Set(this.candidates().map((candidate) => candidate.status))).filter(Boolean).sort();
  }

  sourceOptions(): string[] {
    return Array.from(
      new Set(this.applications().map((item) => item.application.sourceLabel).filter(Boolean)),
    ).sort();
  }

  skillOptions(): string[] {
    return Array.from(new Set(this.candidates().flatMap((candidate) => candidate.skills))).sort();
  }

  withInterviewEvidenceCount(): number {
    return this.candidates().filter((candidate) => candidate.passedInterviews > 0).length;
  }

  invitedApplicationsCount(): number {
    return this.applications().filter((item) => item.application.isInvited).length;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'experience not recorded' : `${value.toFixed(1)} yrs`;
  }

  currentUrl(): string {
    return this.router.url;
  }

  private applyFilters(candidates: ManualCandidateSearchItem[]): ManualCandidateSearchItem[] {
    const search = this.searchText.trim().toLowerCase();
    const sourceCandidateIds = this.sourceFilter
      ? new Set(
          this.applications()
            .filter((item) => item.application.sourceLabel === this.sourceFilter)
            .map((item) => item.application.candidateId),
        )
      : null;

    return candidates
      .filter((candidate) => !this.statusFilter || candidate.status === this.statusFilter)
      .filter((candidate) => !this.skillFilter || candidate.skills.some((skill) => skill === this.skillFilter))
      .filter((candidate) => !sourceCandidateIds || sourceCandidateIds.has(candidate.candidateId))
      .filter((candidate) => {
        if (!search) {
          return true;
        }

        const values = [
          candidate.displayName,
          candidate.email,
          candidate.currentDesignation,
          candidate.currentCompany,
          candidate.status,
          candidate.latestApplication?.displayJobTitle,
          candidate.latestApplication?.requestCode,
          candidate.latestApplication?.sourceLabel,
          ...candidate.skills,
        ];
        return values
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .some((value) => value.toLowerCase().includes(search));
      });
  }
}
