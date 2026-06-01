import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ManualCandidateSearchItem,
  RecruitmentQueue,
  RecruiterSourcing,
  TalentRediscoveryMatch,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-candidate-rediscovery',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page rediscovery-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Recruiter Sourcing</p>
          <h1>Candidate Rediscovery</h1>
          <p>Search previous candidates first, then use AI to rank warm matches for a selected sourcing request.</p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/recruitment/queue">Recruitment Queue</a>
          <a class="btn secondary compact" routerLink="/app/job-publishing">Job Publishing</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading candidate rediscovery...</section>
      } @else if (!queue()?.items?.length) {
        <section class="ops-panel empty-state">
          <strong>No recruiter sourcing work is available.</strong>
          <p>Candidate Rediscovery starts from an active Recruiter Sourcing assignment.</p>
          <a class="btn secondary compact" routerLink="/app/recruitment/queue">Open Recruitment Queue</a>
        </section>
      } @else {
        <section class="rediscovery-layout">
          <aside class="ops-panel rediscovery-filters">
            <div>
              <p class="eyebrow">Advanced Filters</p>
              <button class="link-button" type="button" (click)="resetFilters()">Reset all</button>
            </div>

            <label class="stitch-field compact">
              <span>Sourcing request</span>
              <select name="selectedJobRequest" [(ngModel)]="selectedJobRequestId" (ngModelChange)="selectJobRequest($event)">
                @for (item of queue()?.items ?? []; track item.jobRequest.id) {
                  <option [ngValue]="item.jobRequest.id">{{ item.jobRequest.code }} - {{ item.jobRequest.title }}</option>
                }
              </select>
            </label>

            <div class="filter-row">
              <label class="stitch-field compact">
                <span>Min experience</span>
                <input name="minExperience" type="number" min="0" step="0.5" [(ngModel)]="minExperience" placeholder="Min" />
              </label>
              <label class="stitch-field compact">
                <span>Max experience</span>
                <input name="maxExperience" type="number" min="0" step="0.5" [(ngModel)]="maxExperience" placeholder="Max" />
              </label>
            </div>

            <label class="stitch-field compact">
              <span>Skill</span>
              <select name="skillFilter" [(ngModel)]="skillFilter">
                <option value="">All skills</option>
                @for (skill of skillOptions(); track skill) {
                  <option [ngValue]="skill">{{ skill }}</option>
                }
              </select>
            </label>

            <label class="stitch-field compact">
              <span>Status</span>
              <select name="statusFilter" [(ngModel)]="statusFilter">
                <option value="">All statuses</option>
                @for (status of statusOptions(); track status) {
                  <option [ngValue]="status">{{ status }}</option>
                }
              </select>
            </label>

            <div class="filter-row">
              <label class="stitch-field compact">
                <span>Min passed interviews</span>
                <input name="minPassedInterviews" type="number" min="0" step="1" [(ngModel)]="minPassedInterviews" placeholder="0" />
              </label>
              <label class="stitch-field compact">
                <span>Max failed interviews</span>
                <input name="maxFailedInterviews" type="number" min="0" step="1" [(ngModel)]="maxFailedInterviews" placeholder="Any" />
              </label>
            </div>
          </aside>

          <section class="rediscovery-main">
            <article class="rediscovery-hero">
              <div>
                <h2>{{ currentJobTitle() }}</h2>
                <p>{{ currentRequestSubtitle() }}</p>
              </div>
              <label class="search-box" aria-label="Search candidates">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                  name="candidateSearch"
                  type="search"
                  [(ngModel)]="searchText"
                  placeholder="Search candidates by name, email, role, company"
                />
              </label>
            </article>

            <section class="rediscovery-metrics" aria-label="Candidate rediscovery summary">
              <article>
                <span>Total matches</span>
                <strong>{{ candidateItems().length }}</strong>
              </article>
              <article>
                <span>High potential</span>
                <strong>{{ highPotentialCount() }}</strong>
              </article>
              <article>
                <span>Interview evidence</span>
                <strong>{{ withInterviewEvidenceCount() }}</strong>
              </article>
              <article>
                <span>AI matches</span>
                <strong>{{ sourcing()?.talentRediscoveryMatches?.length ?? 0 }}</strong>
              </article>
            </section>

            <article class="ops-panel candidate-results-panel">
              <div class="panel-header">
                <div>
                  <h2>Candidate Pool</h2>
                  <p class="muted">Manual search uses previous candidate applications and never shows employee bench data.</p>
                </div>
                <button type="button" class="btn primary ai-action" [disabled]="!canRunAi() || ranking()" (click)="openAiModal()">
                  &#10024; {{ ranking() ? 'Ranking...' : 'Run Rediscovery AI' }}
                </button>
              </div>

              @if (message()) {
                <p class="field-status success">{{ message() }}</p>
              }
              @if (error()) {
                <p class="field-status error">{{ error() }}</p>
              }

              @if (filteredCandidates().length === 0) {
                <div class="empty-inline">
                  <strong>No candidates match the current filters.</strong>
                  <p>Clear filters or select another sourcing request.</p>
                </div>
              } @else {
                <div class="candidate-table" role="table" aria-label="Candidate rediscovery results">
                  <div class="candidate-table-row table-head" role="row">
                    <span role="columnheader">Candidate</span>
                    <span role="columnheader">Match</span>
                    <span role="columnheader">Skills</span>
                    <span role="columnheader">Interview history</span>
                    <span role="columnheader">Latest application</span>
                    <span role="columnheader">Actions</span>
                  </div>
                  @for (candidate of filteredCandidates(); track candidate.candidateId) {
                    <div class="candidate-table-row" role="row">
                      <div role="cell" class="candidate-cell">
                        <span class="avatar">{{ initials(candidate.displayName) }}</span>
                        <span>
                          <strong>{{ candidate.displayName }}</strong>
                          <small>{{ candidate.email }}</small>
                          <small>{{ candidate.currentDesignation || 'Role not recorded' }} - {{ formatExperience(candidate.experienceYears) }}</small>
                        </span>
                      </div>
                      <div role="cell">
                        <strong>{{ displayMatchScore(candidate) }}%</strong>
                        <span class="score-bar"><span [style.width.%]="displayMatchScore(candidate)"></span></span>
                      </div>
                      <div role="cell" class="chip-list">
                        @for (skill of topSkills(candidate); track skill) {
                          <span class="skill-chip">{{ skill }}</span>
                        }
                        @if (candidate.skills.length > 3) {
                          <span class="skill-chip muted-chip">+{{ candidate.skills.length - 3 }}</span>
                        }
                      </div>
                      <div role="cell" class="interview-history-cell">
                        <strong>{{ formatCandidatePassSummary(candidate) }}</strong>
                        <small>{{ formatCandidateFailureSummary(candidate) }}</small>
                      </div>
                      <div role="cell">
                        @if (candidate.latestApplication; as application) {
                          <strong>{{ application.displayJobTitle || application.jobTitle }}</strong>
                          <small>{{ application.status }} - {{ application.requestCode }}</small>
                        } @else {
                          <span class="muted">No application history</span>
                        }
                      </div>
                      <div role="cell" class="table-actions">
                        <button
                          class="action-menu-trigger"
                          type="button"
                          [attr.aria-expanded]="openCandidateActionMenuId() === candidate.candidateId"
                          [attr.aria-label]="'Open actions for ' + candidate.displayName"
                          (click)="toggleCandidateActionMenu(candidate.candidateId)"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                        </button>
                        @if (openCandidateActionMenuId() === candidate.candidateId) {
                          <div class="action-dropdown" role="menu">
                            <a
                              role="menuitem"
                              [routerLink]="candidateProfileLink(candidate.candidateId)"
                              [queryParams]="{ returnUrl: currentUrl() }"
                              (click)="closeCandidateActionMenu()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">badge</span>
                              View profile
                            </a>
                            @if (candidate.latestApplication; as application) {
                              <a
                                role="menuitem"
                                [routerLink]="applicationHistoryLink(application.jobApplicationId)"
                                [queryParams]="{ returnUrl: currentUrl() }"
                                (click)="closeCandidateActionMenu()"
                              >
                                <span class="material-symbols-outlined" aria-hidden="true">history</span>
                                View history
                              </a>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </article>
          </section>
        </section>
      }

      @if (aiModalOpen()) {
        <div class="modal-backdrop" role="presentation" (click)="closeAiModal()">
          <section class="ai-modal" role="dialog" aria-modal="true" aria-labelledby="rediscovery-ai-title" (click)="$event.stopPropagation()">
            <header>
              <div>
                <p class="eyebrow">Talent Rediscovery Agent</p>
                <h2 id="rediscovery-ai-title">AI recommended candidates</h2>
                <p>Review ranked warm candidates, select who to invite, then queue invitation emails.</p>
              </div>
              <button type="button" class="icon-button" aria-label="Close" (click)="closeAiModal()">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>

            <div class="invitation-preview">
              <strong>Email preview</strong>
              <p>{{ companyName() }} is looking for {{ currentJobTitle() }}. Please apply at our job portal for this job post if you are interested.</p>
            </div>

            <label class="stitch-field compact">
              <span>Optional recruiter note</span>
              <textarea
                name="invitationMessage"
                rows="3"
                [(ngModel)]="invitationMessage"
                placeholder="Add any short context for candidates."
              ></textarea>
            </label>

            <div class="modal-actions">
              <button type="button" class="btn secondary" [disabled]="ranking()" (click)="runAiRediscovery()">
                &#10024; {{ ranking() ? 'Ranking...' : aiMatches().length ? 'Refresh AI ranking' : 'Run AI ranking' }}
              </button>
              <button type="button" class="btn primary" [disabled]="sendingInvites() || selectedAiCandidateIds().size === 0" (click)="sendInvitations()">
                {{ sendingInvites() ? 'Queueing...' : 'Send invitation email' }}
              </button>
            </div>

            @if (aiMatches().length === 0 && !ranking()) {
              <div class="empty-inline">
                <strong>No AI ranking has been loaded.</strong>
                <p>Run the agent to rank candidates for {{ currentJobTitle() }}.</p>
              </div>
            } @else {
              <div class="ai-match-list">
                @for (match of aiMatches(); track match.candidateId) {
                  <article class="ai-match-card">
                    <label class="match-select">
                      <input
                        type="checkbox"
                        [checked]="isAiCandidateSelected(match.candidateId)"
                        (change)="toggleAiCandidate(match.candidateId)"
                      />
                      <span>#{{ match.rank }}</span>
                    </label>
                    <div>
                      <h3>{{ match.candidateName }}</h3>
                      <p>{{ match.currentDesignation || 'Role not recorded' }} - {{ formatExperience(match.experienceYears) }}</p>
                      <p class="muted">{{ match.explanation }}</p>
                      <div class="chip-list">
                        @for (skill of match.strengths.slice(0, 3); track skill) {
                          <span class="skill-chip">{{ skill }}</span>
                        }
                      </div>
                    </div>
                    <div class="match-score">
                      <strong>{{ match.score }}%</strong>
                      <span>{{ match.confidence }}</span>
                      <a [routerLink]="candidateProfileLink(match.candidateId)" [queryParams]="{ returnUrl: currentUrl() }">View profile</a>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .rediscovery-layout {
        align-items: stretch;
        display: grid;
        gap: 20px;
        grid-template-columns: minmax(230px, 280px) minmax(0, 1fr);
      }

      .rediscovery-filters {
        align-self: start;
        display: grid;
        gap: 16px;
        min-width: 0;
        overflow: hidden;
        position: sticky;
        top: 88px;
      }

      .rediscovery-filters > div:first-child,
      .panel-header,
      .rediscovery-hero,
      .modal-actions {
        align-items: center;
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .rediscovery-filters > div:first-child {
        flex-wrap: wrap;
        gap: 8px 12px;
      }

      .rediscovery-filters .stitch-field {
        min-width: 0;
        width: 100%;
      }

      .rediscovery-filters input,
      .rediscovery-filters select {
        box-sizing: border-box;
        max-width: 100%;
        min-width: 0;
        width: 100%;
      }

      .filter-row {
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        min-width: 0;
      }

      .rediscovery-main {
        display: grid;
        gap: 18px;
        min-width: 0;
      }

      .rediscovery-main > * {
        max-width: 100%;
        min-width: 0;
        width: 100%;
      }

      .rediscovery-hero {
        background: #fff;
        border: 1px solid #dfe7f2;
        border-radius: 8px;
        padding: 20px;
      }

      .rediscovery-hero > div {
        min-width: 0;
      }

      .rediscovery-hero h2 {
        margin: 0 0 4px;
      }

      .search-box {
        align-items: center;
        border: 1px solid #cbd6e5;
        border-radius: 6px;
        display: flex;
        flex: 0 1 420px;
        gap: 8px;
        padding: 0 12px;
      }

      .search-box input {
        border: 0;
        flex: 1;
        min-height: 42px;
        outline: 0;
      }

      .rediscovery-metrics {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .rediscovery-metrics article {
        background: #fff;
        border: 1px solid #dfe7f2;
        border-radius: 8px;
        padding: 16px;
      }

      .rediscovery-metrics span,
      .candidate-table small,
      .match-score span {
        color: #637187;
      }

      .rediscovery-metrics strong {
        color: #005eb8;
        display: block;
        font-size: 24px;
        margin-top: 6px;
      }

      .candidate-table {
        border: 1px solid #dde6f1;
        border-radius: 8px;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: visible;
      }

      .candidate-table-row {
        align-items: stretch;
        display: grid;
        grid-template-columns: minmax(220px, 1.4fr) 110px minmax(170px, 1fr) minmax(145px, 0.8fr) minmax(190px, 1fr) 110px;
      }

      .candidate-table-row > * {
        border-bottom: 1px solid #e5edf6;
        padding: 14px;
      }

      .candidate-table-row.table-head {
        background: #f4f7fb;
        color: #35455c;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .candidate-cell {
        align-items: center;
        display: flex;
        gap: 12px;
      }

      .interview-history-cell {
        align-content: start;
        display: grid;
        gap: 4px;
      }

      .interview-history-cell strong,
      .interview-history-cell small {
        display: block;
        white-space: normal;
      }

      .avatar {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        font-weight: 800;
        height: 40px;
        justify-content: center;
        width: 40px;
      }

      .candidate-cell span:last-child,
      .match-score,
      .ai-match-card > div {
        display: grid;
        gap: 4px;
      }

      .table-actions {
        display: flex;
        justify-content: flex-end;
        overflow: visible;
        position: relative;
      }

      .chip-list {
        align-content: start;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .skill-chip {
        background: #eef4ff;
        border-radius: 5px;
        color: #075dad;
        font-size: 12px;
        font-weight: 700;
        padding: 4px 7px;
      }

      .muted-chip {
        color: #637187;
      }

      .score-bar {
        background: #dfe7f2;
        border-radius: 99px;
        display: block;
        height: 4px;
        margin-top: 6px;
        overflow: hidden;
        width: 70px;
      }

      .score-bar span {
        background: #00875a;
        display: block;
        height: 100%;
      }

      .link-button {
        background: none;
        border: 0;
        color: #005eb8;
        cursor: pointer;
        font-weight: 700;
        padding: 0;
        text-decoration: none;
      }

      .action-menu-trigger {
        align-items: center;
        background: #fff;
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        color: #005eb8;
        cursor: pointer;
        display: inline-flex;
        height: 34px;
        justify-content: center;
        padding: 0;
        width: 34px;
      }

      .action-menu-trigger:hover,
      .action-menu-trigger:focus-visible {
        background: #eef6ff;
        border-color: #9dc7f5;
        outline: none;
      }

      .action-dropdown {
        background: #fff;
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16);
        display: grid;
        min-width: 190px;
        padding: 6px;
        position: absolute;
        right: 12px;
        top: 42px;
        z-index: 20;
      }

      .action-dropdown a {
        align-items: center;
        border-radius: 6px;
        color: var(--text);
        display: flex;
        gap: 8px;
        padding: 9px 10px;
        text-decoration: none;
      }

      .action-dropdown a:hover,
      .action-dropdown a:focus-visible {
        background: #eef6ff;
        color: #005eb8;
        outline: none;
      }

      .action-dropdown .material-symbols-outlined {
        color: #005eb8;
        font-size: 18px;
      }

      .empty-inline {
        background: #f7f9fc;
        border: 1px dashed #cbd6e5;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }

      .ai-action {
        min-width: 180px;
      }

      .modal-backdrop {
        align-items: center;
        background: rgb(16 24 40 / 52%);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 24px;
        position: fixed;
        z-index: 50;
      }

      .ai-modal {
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 24px 60px rgb(15 23 42 / 30%);
        display: grid;
        gap: 16px;
        max-height: 88vh;
        max-width: 980px;
        overflow: auto;
        padding: 24px;
        width: min(980px, 100%);
      }

      .ai-modal header,
      .ai-match-card {
        align-items: start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .icon-button {
        align-items: center;
        background: transparent;
        border: 0;
        color: #4a5a70;
        cursor: pointer;
        display: inline-flex;
      }

      .invitation-preview {
        background: #f4f9ff;
        border: 1px solid #cfe1f5;
        border-radius: 8px;
        padding: 14px;
      }

      .ai-match-list {
        display: grid;
        gap: 12px;
      }

      .ai-match-card {
        border: 1px solid #dfe7f2;
        border-radius: 8px;
        padding: 14px;
      }

      .match-select {
        align-items: center;
        display: flex;
        gap: 8px;
        min-width: 74px;
      }

      .match-select input[type='checkbox'] {
        accent-color: #0067c5;
        flex: 0 0 auto;
        height: 16px;
        margin: 0;
        min-height: 0;
        padding: 0;
        width: 16px;
      }

      .match-score {
        min-width: 110px;
        text-align: right;
      }

      @media (max-width: 1280px) {
        .rediscovery-layout {
          grid-template-columns: 1fr;
        }

        .rediscovery-filters {
          position: static;
        }

        .rediscovery-filters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .rediscovery-filters > div:first-child {
          grid-column: 1 / -1;
        }

        .filter-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 980px) {
        .rediscovery-filters {
          grid-template-columns: 1fr;
        }

        .rediscovery-hero,
        .ai-match-card {
          grid-template-columns: 1fr;
        }

        .candidate-table-row {
          display: grid;
          min-width: 760px;
        }

        .candidate-table-row.table-head {
          display: none;
        }

        .rediscovery-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class CandidateRediscoveryComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly sourcingLoading = signal(false);
  readonly ranking = signal(false);
  readonly sendingInvites = signal(false);
  readonly aiModalOpen = signal(false);
  readonly queue = signal<RecruitmentQueue | null>(null);
  readonly sourcing = signal<RecruiterSourcing | null>(null);
  readonly aiMatches = signal<TalentRediscoveryMatch[]>([]);
  readonly selectedAiCandidateIds = signal<Set<string>>(new Set());
  readonly openCandidateActionMenuId = signal<string | null>(null);
  readonly message = signal('');
  readonly error = signal('');

  selectedJobRequestId = '';
  searchText = '';
  skillFilter = '';
  statusFilter = '';
  minExperience: number | null = null;
  maxExperience: number | null = null;
  minPassedInterviews: number | null = null;
  maxFailedInterviews: number | null = null;
  invitationMessage = '';

  readonly candidateItems = computed(() => this.sourcing()?.candidateSearchItems ?? []);
  readonly filteredCandidates = computed(() => this.applyFilters(this.candidateItems()));

  async ngOnInit(): Promise<void> {
    await this.loadQueue();
  }

  async loadQueue(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const queue = await this.store.loadRecruitmentQueue();
      this.queue.set(queue);
      const requestedId = this.route.snapshot.queryParamMap.get('jobRequestId');
      this.selectedJobRequestId =
        requestedId && queue.items.some((item) => item.jobRequest.id === requestedId)
          ? requestedId
          : queue.items[0]?.jobRequest.id ?? '';
      if (this.selectedJobRequestId) {
        await this.loadSourcing(this.selectedJobRequestId, false);
      }
    } catch {
      this.error.set('Candidate Rediscovery could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  async selectJobRequest(jobRequestId: string): Promise<void> {
    if (!jobRequestId) {
      return;
    }
    await this.loadSourcing(jobRequestId, true);
  }

  async openAiModal(): Promise<void> {
    this.aiModalOpen.set(true);
    this.message.set('');
    this.error.set('');
    const existingMatches = this.sourcing()?.talentRediscoveryMatches ?? [];
    this.aiMatches.set(existingMatches);
    this.selectedAiCandidateIds.set(new Set(existingMatches.slice(0, 3).map((match) => match.candidateId)));
    if (existingMatches.length === 0) {
      await this.runAiRediscovery();
    }
  }

  closeAiModal(): void {
    if (!this.ranking() && !this.sendingInvites()) {
      this.aiModalOpen.set(false);
    }
  }

  async runAiRediscovery(): Promise<void> {
    if (!this.selectedJobRequestId) {
      return;
    }
    this.ranking.set(true);
    this.error.set('');
    try {
      const result = await this.store.rankTalentRediscovery(this.selectedJobRequestId);
      this.aiMatches.set(result.talentRediscoveryMatches);
      this.selectedAiCandidateIds.set(new Set(result.talentRediscoveryMatches.slice(0, 3).map((match) => match.candidateId)));
      this.sourcing.update((current) =>
        current ? { ...current, talentRediscoveryMatches: result.talentRediscoveryMatches } : current,
      );
      this.message.set(`Talent Rediscovery found ${result.talentRediscoveryMatches.length} recommended candidate(s).`);
    } catch {
      this.error.set('Talent Rediscovery AI could not rank candidates. Manual search is still available.');
    } finally {
      this.ranking.set(false);
    }
  }

  async sendInvitations(): Promise<void> {
    const selectedIds = [...this.selectedAiCandidateIds()];
    if (!this.selectedJobRequestId || selectedIds.length === 0) {
      return;
    }
    this.sendingInvites.set(true);
    this.error.set('');
    try {
      const result = await this.store.sendCandidateInvitations(this.selectedJobRequestId, {
        candidateIds: selectedIds,
        jobPostId: this.sourcing()?.jobPost?.jobPostId ?? null,
        message: this.invitationMessage.trim() || null,
      });
      this.message.set(`${result.queuedCount} invitation email(s) queued for rediscovered candidates.`);
      this.selectedAiCandidateIds.set(new Set());
      this.aiModalOpen.set(false);
    } catch {
      this.error.set('Invitation emails could not be queued.');
    } finally {
      this.sendingInvites.set(false);
    }
  }

  resetFilters(): void {
    this.searchText = '';
    this.skillFilter = '';
    this.statusFilter = '';
    this.minExperience = null;
    this.maxExperience = null;
    this.minPassedInterviews = null;
    this.maxFailedInterviews = null;
    this.closeCandidateActionMenu();
  }

  toggleCandidateActionMenu(candidateId: string): void {
    this.openCandidateActionMenuId.set(this.openCandidateActionMenuId() === candidateId ? null : candidateId);
  }

  closeCandidateActionMenu(): void {
    this.openCandidateActionMenuId.set(null);
  }

  canRunAi(): boolean {
    return Boolean(this.sourcing()?.assignment) || this.auth.isAdmin();
  }

  isAiCandidateSelected(candidateId: string): boolean {
    return this.selectedAiCandidateIds().has(candidateId);
  }

  toggleAiCandidate(candidateId: string): void {
    const next = new Set(this.selectedAiCandidateIds());
    if (next.has(candidateId)) {
      next.delete(candidateId);
    } else {
      next.add(candidateId);
    }
    this.selectedAiCandidateIds.set(next);
  }

  currentJobTitle(): string {
    return this.sourcing()?.jobPost?.title || this.sourcing()?.jobRequest.title || 'selected role';
  }

  currentRequestSubtitle(): string {
    const request = this.sourcing()?.jobRequest;
    return request ? `${request.code} - ${request.client} - ${request.department}` : 'Select a sourcing request to view candidates.';
  }

  companyName(): string {
    return this.auth.currentUser()?.tenantDisplayName || 'Your company';
  }

  currentUrl(): string {
    return this.router.url;
  }

  candidateProfileLink(candidateId: string): string[] {
    return ['/app/recruitment/candidates', candidateId, 'profile'];
  }

  applicationHistoryLink(jobApplicationId: string): string[] {
    return ['/app/recruitment/applications', jobApplicationId, 'history'];
  }

  highPotentialCount(): number {
    return this.candidateItems().filter((candidate) => this.displayMatchScore(candidate) >= 70).length;
  }

  withInterviewEvidenceCount(): number {
    return this.candidateItems().filter((candidate) => candidate.totalInterviews > 0).length;
  }

  skillOptions(): string[] {
    return [...new Set(this.candidateItems().flatMap((candidate) => candidate.skills))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  statusOptions(): string[] {
    return [...new Set(this.candidateItems().map((candidate) => candidate.status))].sort((a, b) => a.localeCompare(b));
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
    return value === null || value === undefined ? 'Experience not recorded' : `${value} yrs`;
  }

  topSkills(candidate: ManualCandidateSearchItem): string[] {
    return candidate.skills.slice(0, 3);
  }

  formatCandidatePassSummary(candidate: ManualCandidateSearchItem): string {
    const total = candidate.totalInterviews;
    const noun = total === 1 ? 'interview' : 'interviews';
    return `${candidate.passedInterviews} of ${total} ${noun} passed`;
  }

  formatCandidateFailureSummary(candidate: ManualCandidateSearchItem): string {
    if (candidate.failedInterviews === 0) {
      return 'No failed interviews';
    }

    const noun = candidate.failedInterviews === 1 ? 'interview' : 'interviews';
    return `${candidate.failedInterviews} failed ${noun}`;
  }

  displayMatchScore(candidate: ManualCandidateSearchItem): number {
    const aiMatch = this.sourcing()?.talentRediscoveryMatches.find((match) => match.candidateId === candidate.candidateId);
    if (aiMatch) {
      return Math.round(aiMatch.score);
    }

    const skillRatio = candidate.skills.length === 0 ? 0 : candidate.matchedSkills.length / Math.max(candidate.skills.length, candidate.matchedSkills.length, 1);
    const interviewRatio = candidate.totalInterviews === 0 ? 0.25 : candidate.passedInterviews / candidate.totalInterviews;
    const experienceBoost = candidate.experienceYears ? Math.min(candidate.experienceYears / 8, 1) : 0.35;
    return Math.round(Math.min(100, skillRatio * 55 + interviewRatio * 30 + experienceBoost * 15));
  }

  private async loadSourcing(jobRequestId: string, updateUrl: boolean): Promise<void> {
    this.sourcingLoading.set(true);
    this.error.set('');
    try {
      const sourcing = await this.store.loadRecruiterSourcing(jobRequestId);
      this.sourcing.set(sourcing);
      this.aiMatches.set(sourcing.talentRediscoveryMatches);
      this.selectedAiCandidateIds.set(new Set());
      if (updateUrl) {
        await this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { jobRequestId },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    } catch {
      this.sourcing.set(null);
      this.error.set('The selected sourcing request could not be loaded.');
    } finally {
      this.sourcingLoading.set(false);
    }
  }

  private applyFilters(candidates: ManualCandidateSearchItem[]): ManualCandidateSearchItem[] {
    const search = this.searchText.trim().toLowerCase();
    return candidates
      .filter((candidate) => {
        if (search) {
          const haystack = [
            candidate.displayName,
            candidate.email,
            candidate.currentDesignation,
            candidate.currentCompany,
            candidate.status,
            candidate.latestApplication?.displayJobTitle,
            candidate.latestApplication?.requestCode,
            ...candidate.skills,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) {
            return false;
          }
        }

        if (this.skillFilter && !candidate.skills.some((skill) => skill.toLowerCase() === this.skillFilter.toLowerCase())) {
          return false;
        }

        if (this.statusFilter && candidate.status !== this.statusFilter) {
          return false;
        }

        if (this.minExperience !== null && this.minExperience !== undefined && (candidate.experienceYears ?? 0) < this.minExperience) {
          return false;
        }

        if (this.maxExperience !== null && this.maxExperience !== undefined && candidate.experienceYears !== null && candidate.experienceYears !== undefined && candidate.experienceYears > this.maxExperience) {
          return false;
        }

        if (this.minPassedInterviews !== null && this.minPassedInterviews !== undefined && candidate.passedInterviews < this.minPassedInterviews) {
          return false;
        }

        if (this.maxFailedInterviews !== null && this.maxFailedInterviews !== undefined && candidate.failedInterviews > this.maxFailedInterviews) {
          return false;
        }

        return true;
      })
      .sort((left, right) => this.displayMatchScore(right) - this.displayMatchScore(left));
  }
}
