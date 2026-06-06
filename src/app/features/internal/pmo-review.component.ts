import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatJobDescription } from '../../core/job-description-formatting';
import { BenchEmployee, BenchMatch, EmployeeProjectEvidence, PmoReview } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RagAssistantPanelComponent } from '../../shared/rag-assistant-panel.component';

@Component({
  selector: 'app-pmo-review',
  imports: [FormsModule, RouterLink, RagAssistantPanelComponent],
  template: `
    <main class="page ops-page">
      @if (review(); as review) {
        <header class="ops-page-header">
          <div>
            <p class="eyebrow">PMO Review</p>
            <h1>{{ review.jobRequest.title }}</h1>
            <p>{{ review.jobRequest.code }} - {{ review.jobRequest.client }} - {{ review.jobRequest.department }}</p>
          </div>
          <div class="ops-header-actions">
            <span [class]="assignmentStatusBadgeClass(review)" aria-label="PMO review assignment status">
              Assignment: {{ assignmentStatusLabel(review) }}
            </span>
          </div>
        </header>

        <nav class="pmo-review-tabs" aria-label="PMO review sections">
          <button
            type="button"
            [class.active]="activeTab() === 'overview'"
            [attr.aria-selected]="activeTab() === 'overview'"
            (click)="setActiveTab('overview')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
            Request Review
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'bench'"
            [attr.aria-selected]="activeTab() === 'bench'"
            (click)="setActiveTab('bench')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">psychology</span>
            Bench Matching
            <strong>{{ displayedEmployees().length }}</strong>
          </button>
        </nav>

        <section class="ops-workspace-grid pmo-review-grid">
          <div class="ops-main-stack">
            @if (activeTab() === 'overview') {
              <article class="ops-panel">
                <div class="panel-header">
                  <div>
                    <h2>Request Summary</h2>
                    <p class="muted">Manual PMO review comes before recruiter sourcing.</p>
                  </div>
                  @if (review.assignment?.status === 'Pending' && review.assignment; as assignment) {
                    <button type="button" class="btn primary compact" [disabled]="busy()" (click)="claim(assignment.id)">
                      Claim ownership
                    </button>
                  }
                </div>
                <div class="job-description-body">{{ formattedDescription(review.jobRequest.description) }}</div>
                @if (review.jobRequest.clientContext) {
                  <div class="client-context-summary">
                    <span>Client context</span>
                    <p>{{ review.jobRequest.clientContext }}</p>
                  </div>
                }
                <div class="info-grid">
                  <div><span>Positions</span><strong>{{ review.jobRequest.fulfilledPositions }} / {{ review.jobRequest.requiredPositions }}</strong></div>
                  <div><span>Experience</span><strong>{{ review.jobRequest.experience }}</strong></div>
                  <div><span>Location</span><strong>{{ review.jobRequest.location }}</strong></div>
                  <div><span>Recruiter handoff</span><strong>{{ review.recruiterHandoffTargetName || 'Recruiting group' }}</strong></div>
                </div>
                <div class="skill-row">
                  @for (skill of review.jobRequest.skills; track skill) {
                    <span>{{ skill }}</span>
                  }
                </div>
              </article>

              <article class="ops-panel pmo-next-step-panel">
                <div class="panel-header">
                  <div>
                    <h2>PMO Next Step</h2>
                    <p class="muted">Claim the request, review internal bench options, then recommend internally or forward to recruiters.</p>
                  </div>
                </div>
                <div class="info-grid">
                  <div><span>Eligible employees</span><strong>{{ review.eligibleEmployees.length }}</strong></div>
                  <div><span>AI rankings</span><strong>{{ review.benchMatches.length ? 'Available' : 'Not run' }}</strong></div>
                  <div><span>Selected employees</span><strong>{{ selectedEmployeeIds().length }}</strong></div>
                  <div><span>Presales recipient</span><strong>{{ selectedPresalesName(review) }}</strong></div>
                </div>
              </article>

              @if (statusMessage()) {
                <article class="scope-soft-note success-note">
                  <strong>Updated</strong>
                  <p>{{ statusMessage() }}</p>
                </article>
              }
              @if (errorMessage()) {
                <article class="scope-soft-note error-note">
                  <strong>Could not update</strong>
                  <p>{{ errorMessage() }}</p>
                </article>
              }
            }

            @if (activeTab() === 'bench') {
              <article class="ops-panel bench-panel">
              <div class="panel-header bench-header">
                <div>
                  <h2>Bench Matching</h2>
                  <p class="muted">
                    Rank active internal employees with skill coverage, vector similarity, experience, availability,
                    project evidence, and recent public context only when the request needs it. PMO still decides who to recommend.
                  </p>
                </div>
                <div class="bench-actions">
                  <span class="status-badge">{{ displayedEmployees().length }} eligible</span>
                  @if (review.assignment?.status === 'Pending' && review.assignment; as assignment) {
                    <button type="button" class="btn primary compact" [disabled]="busy()" (click)="claim(assignment.id)">
                      Claim ownership
                    </button>
                  }
                  <button
                    type="button"
                    class="btn secondary compact"
                    [disabled]="busy() || ranking() || !canRank(review)"
                    (click)="rankWithAi()"
                  >
                    @if (ranking()) {
                      Ranking...
                    } @else {
                      &#10024; Rank with AI
                    }
                  </button>
                </div>
              </div>

              @if (!canRank(review)) {
                <p class="field-status info">Claim this PMO Review assignment before running AI ranking.</p>
              }
              @if (lastRankedAt()) {
                <p class="field-status success">
                  Last ranked {{ formatDateTime(lastRankedAt()) }}. Web research: {{ latestWebStatus() }}.
                </p>
              }
              @if (rankingError()) {
                <p class="field-status error">{{ rankingError() }}</p>
              }

              <div class="ops-toolbar compact-toolbar">
                <label class="ops-search">
                  <span class="material-symbols-outlined" aria-hidden="true">search</span>
                  <input
                    [ngModel]="searchText()"
                    (ngModelChange)="searchText.set($event)"
                    placeholder="Search name, skill, project, department"
                  />
                </label>
                <select
                  class="ops-filter-button"
                  [ngModel]="departmentFilter()"
                  (ngModelChange)="departmentFilter.set($event)"
                >
                  <option value="">Department: All</option>
                  @for (department of departments(); track department) {
                    <option [value]="department">{{ department }}</option>
                  }
                </select>
                <select
                  class="ops-filter-button"
                  [ngModel]="matchFilter()"
                  (ngModelChange)="matchFilter.set($event)"
                >
                  <option value="">Skill fit: All</option>
                  <option value="matched">Has matched skill</option>
                  <option value="gap">Has missing skill</option>
                </select>
              </div>

              @if (displayedEmployees().length > 0) {
                <div class="bench-table" role="table" aria-label="Benched employee recommendations">
                  <div class="bench-table-header" role="row">
                    <span>Select</span>
                    <span>Rank / Fit</span>
                    <span>Employee</span>
                    <span>Role / Department</span>
                    <span>Experience</span>
                    <span>Availability</span>
                    <span>Skill Match</span>
                    <span>Project Evidence</span>
                    <span>AI Rationale</span>
                  </div>

                  @for (employee of displayedEmployees(); track employee.employeeId) {
                    <article class="bench-table-row" [class.selected]="isSelected(employee.employeeId)" role="row">
                      <label class="select-cell" aria-label="Select employee">
                        <input
                          type="checkbox"
                          [checked]="isSelected(employee.employeeId)"
                          (change)="toggleEmployee(employee.employeeId)"
                        />
                      </label>

                      <div class="rank-cell" data-label="Rank / Fit">
                        @if (matchFor(employee.employeeId); as match) {
                          <strong>#{{ match.rank }}</strong>
                          <span class="fit-score" [class.high]="match.score >= 80" [class.medium]="match.score >= 60 && match.score < 80">
                            {{ formatScore(match.score) }}
                          </span>
                          <small>{{ match.confidence }} confidence</small>
                        } @else {
                          <strong>-</strong>
                          <small>Not ranked</small>
                        }
                      </div>

                      <div class="employee-cell" data-label="Employee">
                        <strong>{{ employee.displayName }}</strong>
                        <small>{{ employee.email }}</small>
                      </div>

                      <div data-label="Role / Department">
                        <strong>{{ employee.designation || 'Not recorded' }}</strong>
                        <small>{{ employee.department }} - {{ employee.location }}</small>
                      </div>

                      <div data-label="Experience">
                        <strong>{{ formatExperience(employee.experienceYears) }}</strong>
                        <small>Joined {{ formatDate(employee.joiningDate) }}</small>
                      </div>

                      <div data-label="Availability">
                        <strong>{{ employee.availabilityStatus }}</strong>
                        <small>{{ employee.benchStatus }}</small>
                      </div>

                      <div class="skill-fit-cell" data-label="Skill Match">
                        <div>
                          <span>Matched</span>
                          @if (employee.matchedSkills.length > 0) {
                            @for (skill of employee.matchedSkills; track skill) {
                              <em>{{ skill }}</em>
                            }
                          } @else {
                            <small>None</small>
                          }
                        </div>
                        <div>
                          <span>Gaps</span>
                          @if (employee.missingSkills.length > 0) {
                            @for (skill of employee.missingSkills; track skill) {
                              <em class="muted-chip">{{ skill }}</em>
                            }
                          } @else {
                            <small>No requested skill gaps</small>
                          }
                        </div>
                      </div>

                      <div class="project-cell" data-label="Project Evidence">
                        @if (projectEvidenceFor(employee).length > 0) {
                          @for (project of projectEvidenceFor(employee).slice(0, 2); track project.projectName + project.clientName) {
                            <span>{{ project.projectName }}</span>
                            <small>{{ project.clientName || 'No client' }} - {{ project.status }}</small>
                          }
                        } @else {
                          <span>No project evidence</span>
                        }
                      </div>

                      <div class="rationale-cell" data-label="AI Rationale">
                        @if (matchFor(employee.employeeId); as match) {
                          <p [title]="rationaleFor(employee, match)">{{ rationalePreviewFor(employee, match) }}</p>
                          <button type="button" class="link-button" (click)="toggleRationale(employee.employeeId)">
                            {{ isRationaleExpanded(employee.employeeId) ? 'Hide details' : 'View details' }}
                          </button>
                        } @else {
                          <p>Run AI ranking to see a detailed fit explanation.</p>
                        }
                      </div>
                    </article>

                    @if (isRationaleExpanded(employee.employeeId) && matchFor(employee.employeeId); as match) {
                      <article class="rationale-details">
                        <div>
                          <h3>Why this employee fits</h3>
                          <p>{{ rationaleFor(employee, match) }}</p>
                        </div>
                        <div>
                          <h3>Strengths</h3>
                          <ul>
                            @for (strength of match.strengths; track strength) {
                              <li>{{ strength }}</li>
                            }
                          </ul>
                        </div>
                        <div>
                          <h3>Gaps and caveats</h3>
                          <ul>
                            @for (gap of match.gaps; track gap) {
                              <li>{{ gap }}</li>
                            }
                          </ul>
                        </div>
                        <div>
                          <h3>Public context</h3>
                          <p class="muted">Status: {{ displayWebResearchStatus(match.webResearchStatus) }}</p>
                          @if (webContextSummary(match); as summary) {
                            <p>{{ summary }}</p>
                          } @else {
                            <p class="muted">No public web context was used for this ranking run.</p>
                          }
                        </div>
                      </article>
                    }
                  }
                </div>
              } @else {
                <div class="empty-state">No currently benched employees match these filters.</div>
              }
              </article>

              <section class="bench-bottom-actions" aria-label="Bench matching actions">
                <article class="ops-panel">
                  <h2>Recommend Internally</h2>
                  <p class="muted">Selected employees go to Presales for accept/reject review.</p>
                  <label class="stitch-field">
                    <span>Presales recipient</span>
                    <select [ngModel]="presalesUserId()" (ngModelChange)="presalesUserId.set($event)">
                      @for (user of review.presalesUsers; track user.id) {
                        <option [value]="user.id">{{ user.name }}</option>
                      }
                    </select>
                  </label>
                  <label class="stitch-field">
                    <span>PMO note</span>
                    <textarea
                      [ngModel]="recommendationSummary()"
                      (ngModelChange)="recommendationSummary.set($event)"
                      rows="4"
                      placeholder="Why these employee(s) should be reviewed first."
                    ></textarea>
                  </label>
                  <button
                    type="button"
                    class="btn primary full"
                    [disabled]="busy() || !canRecommend(review)"
                    (click)="recommend()"
                  >
                    Recommend to Presales
                  </button>
                  <p class="muted">{{ selectedEmployeeIds().length }} employee(s) selected.</p>
                </article>

                <article class="ops-panel">
                  <h2>Recruiter Handoff</h2>
                  <p class="muted">Use this when no internal employee should be recommended for the request.</p>
                  <button type="button" class="btn secondary full" [disabled]="busy()" (click)="forwardToRecruiters()">
                    Forward to Recruiters
                  </button>
                </article>
              </section>

              @if (statusMessage()) {
                <article class="scope-soft-note success-note">
                  <strong>Updated</strong>
                  <p>{{ statusMessage() }}</p>
                </article>
              }
              @if (errorMessage()) {
                <article class="scope-soft-note error-note">
                  <strong>Could not update</strong>
                  <p>{{ errorMessage() }}</p>
                </article>
              }
            }

            @if (activeTab() === 'overview' && review.referrals.length > 0) {
              <article class="ops-panel">
                <div class="panel-header">
                  <h2>Recommendation History</h2>
                </div>
                <div class="table-wrap">
                  <table class="ops-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Presales</th>
                        <th>Status</th>
                        <th>Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (referral of review.referrals; track referral.referralId) {
                        <tr>
                          <td>
                            <strong>{{ referral.employeeName }}</strong>
                            <small>{{ referral.designation || referral.department }}</small>
                          </td>
                          <td>{{ referral.presalesName || 'Not assigned' }}</td>
                          <td><span class="status-badge">{{ referral.status }}</span></td>
                          <td>{{ referral.clientFeedback || referral.recommendationSummary || 'No notes' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </article>
            }
          </div>

          <app-rag-assistant-panel
            class="pmo-assistant-rail"
            title="Request Copilot"
            subtitle="Evidence from request, bench matches, referrals, and workflow context."
            placeholder="Ask about bench fit, request status, or next step..."
            contextType="PmoRequest"
            [contextEntityId]="jobRequestId"
            [suggestedQuestions]="pmoAssistantQuestions"
          />

        </section>
      } @else {
        <section class="ops-panel">
          @if (loadError()) {
            <h1>{{ pmoUnavailableTitle() }}</h1>
            <p class="muted">{{ pmoUnavailableMessage() }}</p>
            <div class="unavailable-actions">
              <button type="button" class="btn secondary compact" [disabled]="busy()" (click)="load()">Try again</button>
              @if (!currentUserCanViewPmo()) {
                <a
                  class="btn primary compact"
                  routerLink="/auth/login"
                  [queryParams]="{ returnUrl: '/app/pmo/review/' + jobRequestId }"
                >
                  Switch account
                </a>
              }
            </div>
          } @else {
            <h1>Loading PMO review</h1>
            <p class="muted">Fetching request, assignment, and eligible employee data.</p>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      .pmo-review-tabs {
        border-bottom: 1px solid #dbe3ef;
        display: flex;
        gap: 18px;
        margin: 0 0 18px;
      }

      .pmo-review-tabs button {
        align-items: center;
        background: transparent;
        border: 0;
        border-bottom: 3px solid transparent;
        color: #475569;
        cursor: pointer;
        display: inline-flex;
        font-weight: 800;
        gap: 8px;
        padding: 0 2px 10px;
      }

      .pmo-review-tabs button.active {
        border-bottom-color: #0b66c3;
        color: #0b66c3;
      }

      .pmo-review-grid {
        align-items: start;
        grid-template-columns: minmax(0, 1fr) 330px;
      }

      .pmo-review-grid .ops-main-stack,
      .pmo-review-grid .ops-panel,
      .pmo-assistant-rail {
        min-width: 0;
      }

      .unavailable-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }

      @media (max-width: 980px) {
        .ops-page-header {
          align-items: start;
          gap: 10px;
          justify-items: start;
        }

        .ops-header-actions {
          justify-content: flex-start;
          justify-self: start;
          width: 100%;
        }

        .pmo-review-grid {
          grid-template-columns: 1fr;
        }
      }

      .bench-bottom-actions {
        align-items: start;
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
      }

      .bench-header {
        align-items: flex-start;
      }

      .bench-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      .compact-toolbar {
        grid-template-columns: minmax(260px, 1fr) auto auto;
      }

      .bench-table {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: block;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .bench-table-header,
      .bench-table-row {
        display: grid;
        grid-template-columns: 54px 92px minmax(150px, 1.1fr) minmax(150px, 1fr) 110px 120px minmax(180px, 1.2fr) minmax(150px, 1fr) minmax(220px, 1.35fr);
        min-width: 1120px;
      }

      .bench-table-header {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        color: #475569;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .bench-table-header span,
      .bench-table-row > div,
      .bench-table-row > label {
        border-right: 1px solid #e2e8f0;
        min-width: 0;
        padding: 12px;
      }

      .bench-table-header span:last-child,
      .bench-table-row > div:last-child {
        border-right: 0;
      }

      .bench-table-row {
        border-bottom: 1px solid #e2e8f0;
      }

      .bench-table-row:last-child {
        border-bottom: 0;
      }

      .bench-table-row.selected {
        background: #f4f9ff;
      }

      .select-cell {
        align-items: center;
        display: flex;
        justify-content: center;
      }

      .rank-cell,
      .employee-cell,
      .bench-table-row > div {
        align-content: start;
        display: grid;
        gap: 4px;
      }

      .bench-table-row strong {
        color: #0f172a;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .bench-table-row small {
        color: #64748b;
        display: block;
        font-size: 12px;
        line-height: 1.35;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .employee-cell small {
        word-break: break-word;
      }

      .fit-score {
        background: #eef2ff;
        border-radius: 999px;
        color: #3730a3;
        font-size: 12px;
        font-weight: 800;
        align-self: start;
        justify-self: start;
        padding: 3px 8px;
      }

      .fit-score.medium {
        background: #fff7ed;
        color: #9a3412;
      }

      .fit-score.high {
        background: #dcfce7;
        color: #166534;
      }

      .skill-fit-cell {
        align-content: start;
        display: grid;
        gap: 7px;
      }

      .skill-fit-cell div {
        align-items: baseline;
        display: flex;
        flex-wrap: wrap;
        gap: 5px 6px;
      }

      .skill-fit-cell span {
        color: #64748b;
        flex: 0 0 52px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      .skill-fit-cell em {
        background: #e8f4ff;
        border-radius: 6px;
        color: #0b66c3;
        font-size: 12px;
        font-style: normal;
        font-weight: 700;
        line-height: 1.2;
        padding: 3px 7px;
      }

      .skill-fit-cell .muted-chip {
        background: #f3f4f6;
        color: #64748b;
      }

      .project-cell span {
        font-weight: 700;
      }

      .rationale-cell p {
        color: #475569;
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
      }

      .link-button {
        background: transparent;
        border: 0;
        color: #0b66c3;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        justify-self: start;
        padding: 0;
      }

      .rationale-details {
        background: #fbfdff;
        border-bottom: 1px solid #e2e8f0;
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        padding: 16px;
      }

      .rationale-details h3 {
        font-size: 13px;
        margin: 0 0 8px;
      }

      .rationale-details p,
      .rationale-details ul {
        color: #475569;
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
        padding-left: 16px;
      }

      .rationale-details p {
        padding-left: 0;
      }

      .rationale-details li {
        margin-bottom: 6px;
      }

      .success-note {
        border-color: #bbf7d0;
        color: #166534;
      }

      .error-note {
        border-color: #fecaca;
        color: #991b1b;
      }

      .field-status.info {
        color: #475569;
      }

      .client-context-summary {
        background: #f8fbff;
        border: 1px solid #d9e8f7;
        border-radius: 8px;
        display: grid;
        gap: 6px;
        margin-top: 16px;
        padding: 12px 14px;
      }

      .client-context-summary span {
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .client-context-summary p {
        color: #334155;
        line-height: 1.5;
        margin: 0;
        white-space: pre-line;
      }

      .job-description-body {
        color: #0f172a;
        line-height: 1.65;
        margin: 0;
        white-space: pre-line;
      }

      @media (max-width: 860px) {
        .bench-table-header {
          display: none;
        }

        .bench-table-row {
          display: grid;
          grid-template-columns: 44px 1fr;
        }

        .bench-table-row > div,
        .bench-table-row > label {
          border-right: 0;
          border-top: 1px solid #e2e8f0;
        }

        .bench-table-row > label {
          border-top: 0;
          grid-row: span 8;
        }

        .bench-table-row > div::before {
          color: #64748b;
          content: attr(data-label);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .bench-table-row .skill-fit-cell {
          gap: 8px;
        }

        .rationale-details {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 760px) {
        .compact-toolbar {
          grid-template-columns: 1fr;
        }

        .bench-bottom-actions {
          grid-template-columns: 1fr;
        }

        .bench-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class PmoReviewComponent {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly jobRequestId = this.route.snapshot.paramMap.get('jobRequestId') ?? '';
  readonly pmoAssistantQuestions = [
    'Which bench employee is closest?',
    'Why was this forwarded?',
    'What skills are missing?',
    'Summarize for Presales',
  ];

  readonly searchText = signal('');
  readonly departmentFilter = signal('');
  readonly matchFilter = signal('');
  readonly selectedEmployeeIds = signal<string[]>([]);
  readonly presalesUserId = signal('');
  readonly recommendationSummary = signal('');
  readonly busy = signal(false);
  readonly ranking = signal(false);
  readonly rankingError = signal('');
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly loadError = signal('');
  readonly expandedEmployeeIds = signal<string[]>([]);
  readonly activeTab = signal<'overview' | 'bench'>('overview');
  readonly currentUserCanViewPmo = computed(() => {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('PMO') || roles.includes('TenantAdmin');
  });
  readonly pmoUnavailableTitle = computed(() =>
    this.currentUserCanViewPmo() ? 'PMO Review unavailable' : 'PMO Review not visible for this role',
  );
  readonly pmoUnavailableMessage = computed(() => {
    if (this.currentUserCanViewPmo()) {
      return this.loadError();
    }

    const user = this.auth.currentUser();
    const signedInAs = user?.displayName || user?.name || user?.email || 'the current user';
    return `You are signed in as ${signedInAs}. Switch to a PMO or Tenant Admin demo account to open this PMO review.`;
  });

  readonly review = computed(() => this.store.getPmoReviewByRequestId(this.jobRequestId));
  readonly departments = computed(() => {
    const departments = new Set(this.review()?.eligibleEmployees.map((employee) => employee.department) ?? []);
    return [...departments].sort((first, second) => first.localeCompare(second));
  });
  readonly benchMatchesByEmployee = computed(() => {
    const map = new Map<string, BenchMatch>();
    for (const match of this.review()?.benchMatches ?? []) {
      map.set(match.employeeId, match);
    }

    return map;
  });
  readonly lastRankedAt = computed(() => {
    const matches = this.review()?.benchMatches ?? [];
    if (matches.length === 0) {
      return '';
    }

    return matches
      .map((match) => match.generatedAt)
      .sort((first, second) => second.localeCompare(first))[0];
  });
  readonly latestWebStatus = computed(() => this.displayWebResearchStatus(this.review()?.benchMatches[0]?.webResearchStatus ?? 'Not run'));
  readonly filteredEmployees = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const department = this.departmentFilter();
    const match = this.matchFilter();

    return (this.review()?.eligibleEmployees ?? []).filter((employee) => {
      if (department && employee.department !== department) {
        return false;
      }

      if (match === 'matched' && employee.matchedSkills.length === 0) {
        return false;
      }

      if (match === 'gap' && employee.missingSkills.length === 0) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        employee.displayName,
        employee.email,
        employee.designation ?? '',
        employee.department,
        employee.location,
        employee.availabilityStatus,
        employee.benchStatus,
        ...employee.skills,
        ...employee.matchedSkills,
        ...employee.missingSkills,
        ...employee.projectEvidence.flatMap((project) => [project.projectName, project.clientName ?? '', project.status]),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });
  readonly displayedEmployees = computed(() => {
    const matches = this.benchMatchesByEmployee();
    const employees = [...this.filteredEmployees()];
    if (matches.size === 0) {
      return employees;
    }

    return employees.sort((first, second) => {
      const firstMatch = matches.get(first.employeeId);
      const secondMatch = matches.get(second.employeeId);
      const firstRank = firstMatch?.rank ?? Number.MAX_SAFE_INTEGER;
      const secondRank = secondMatch?.rank ?? Number.MAX_SAFE_INTEGER;
      if (firstRank !== secondRank) {
        return firstRank - secondRank;
      }

      return first.displayName.localeCompare(second.displayName);
    });
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    if (!this.jobRequestId) {
      return;
    }

    this.busy.set(true);
    this.loadError.set('');
    try {
      const review = await this.store.loadPmoReview(this.jobRequestId);
      if (!this.presalesUserId()) {
        this.presalesUserId.set(review.defaultPresalesUserId ?? review.presalesUsers[0]?.id ?? '');
      }
    } catch {
      this.loadError.set('The PMO Review work item could not be loaded. Check that the API is running and this request is visible to your role, then try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async claim(assignmentId: string): Promise<void> {
    this.busy.set(true);
    this.clearMessages();
    try {
      await this.store.claimAssignment(assignmentId);
      await this.load();
      this.statusMessage.set('PMO Review is now assigned to you.');
    } catch {
      this.errorMessage.set('The assignment could not be claimed.');
    } finally {
      this.busy.set(false);
    }
  }

  async rankWithAi(): Promise<void> {
    if (!this.review() || !this.canRank()) {
      return;
    }

    this.ranking.set(true);
    this.rankingError.set('');
    this.clearMessages();
    try {
      const result = await this.store.rankBenchMatches(this.jobRequestId);
      this.statusMessage.set(`Bench Matching ranked ${result.benchMatches.length} employee(s). Web research: ${this.displayWebResearchStatus(result.webResearchStatus)}.`);
    } catch {
      this.rankingError.set('The Bench Matching Agent could not rank employees. Manual review remains available.');
    } finally {
      this.ranking.set(false);
    }
  }

  toggleEmployee(employeeId: string): void {
    this.selectedEmployeeIds.update((ids) =>
      ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId],
    );
  }

  isSelected(employeeId: string): boolean {
    return this.selectedEmployeeIds().includes(employeeId);
  }

  toggleRationale(employeeId: string): void {
    this.expandedEmployeeIds.update((ids) =>
      ids.includes(employeeId) ? ids.filter((id) => id !== employeeId) : [...ids, employeeId],
    );
  }

  isRationaleExpanded(employeeId: string): boolean {
    return this.expandedEmployeeIds().includes(employeeId);
  }

  matchFor(employeeId: string): BenchMatch | undefined {
    return this.benchMatchesByEmployee().get(employeeId);
  }

  projectEvidenceFor(employee: BenchEmployee): EmployeeProjectEvidence[] {
    return this.matchFor(employee.employeeId)?.projectEvidence ?? employee.projectEvidence;
  }

  setActiveTab(tab: 'overview' | 'bench'): void {
    this.activeTab.set(tab);
  }

  canRank(review = this.review()): boolean {
    const user = this.auth.currentUser();
    if (!review || !user) {
      return false;
    }

    if (user.roles.includes('TenantAdmin')) {
      return true;
    }

    const assignment = review.assignment;
    if (!assignment || assignment.status === 'Completed') {
      return false;
    }

    if (assignment.claimedByUserId === user.id) {
      return true;
    }

    return !assignment.assignedToGroupId && assignment.assignedToUserId === user.id;
  }

  canRecommend(review = this.review()): boolean {
    return !!review && this.selectedEmployeeIds().length > 0 && !!this.presalesUserId();
  }

  async recommend(): Promise<void> {
    if (!this.canRecommend()) {
      return;
    }

    this.busy.set(true);
    this.clearMessages();
    try {
      await this.store.createEmployeeReferrals(this.jobRequestId, {
        employeeIds: this.selectedEmployeeIds(),
        presalesUserId: this.presalesUserId(),
        recommendationSummary: this.recommendationSummary().trim() || null,
      });
      this.selectedEmployeeIds.set([]);
      this.recommendationSummary.set('');
      this.statusMessage.set('The recommendation was sent to Presales.');
    } catch {
      this.errorMessage.set('The recommendation could not be sent. Claim the PMO Review item first if it is group-assigned.');
    } finally {
      this.busy.set(false);
    }
  }

  async forwardToRecruiters(): Promise<void> {
    this.busy.set(true);
    this.clearMessages();
    try {
      await this.store.forwardToRecruiters(this.jobRequestId);
      this.statusMessage.set('The request was forwarded to recruiters.');
      void this.router.navigate(['/app/job-requests', this.jobRequestId]);
    } catch {
      this.errorMessage.set('The request could not be forwarded. Claim the PMO Review item first if it is group-assigned.');
    } finally {
      this.busy.set(false);
    }
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value.toFixed(1)} years`;
  }

  formatDate(value?: string | null): string {
    return value ? new Date(value).toLocaleDateString() : 'Not recorded';
  }

  formatDateTime(value?: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
  }

  formatScore(value?: number | null): string {
    return value === null || value === undefined ? '-' : `${Math.round(value)}%`;
  }

  displayWebResearchStatus(status: string): string {
    switch (status) {
      case 'Skipped:LiveContextNotRequired':
        return 'Skipped; no recent/live public context needed.';
      case 'Unavailable:TavilyMissingApiKey':
        return 'Missing Tavily API key.';
      case 'Unavailable:TavilyPermissionDenied':
        return 'Tavily search permission denied.';
      case 'Unavailable:TavilyApiUnauthorized':
        return 'Tavily API key was rejected.';
      case 'Unavailable:TavilyInvalidRequest':
        return 'Tavily search request is invalid.';
      case 'Unavailable:TavilyAccountLimit':
        return 'Tavily account limit reached.';
      case 'TavilyProviderQuotaExceeded':
        return 'Tavily provider quota reached.';
      case 'Partial:TavilyProviderQuotaExceeded':
        return 'Partial results; Tavily provider quota reached.';
      case 'Unavailable:CustomSearchJsonApiDisabled':
        return 'Google Custom Search JSON API is not enabled for this API key.';
      case 'Unavailable:MissingApiKey':
        return 'Missing web search API key.';
      case 'Unavailable:MissingSearchEngineId':
        return 'Missing Google Search Engine ID.';
      case 'Unavailable:GooglePermissionDenied':
        return 'Google Search permission denied.';
      case 'Unavailable:GoogleApiUnauthorized':
        return 'Google Search API key was rejected.';
      case 'Unavailable:GoogleInvalidRequest':
        return 'Google Search request is invalid.';
      case 'GoogleProviderQuotaExceeded':
      case 'QuotaExceeded':
        return 'Daily web search limit reached.';
      case 'Partial:GoogleProviderQuotaExceeded':
      case 'Partial:QuotaExceeded':
        return 'Partial results; daily web search limit reached.';
      default:
        return status;
    }
  }

  webContextSummary(match: BenchMatch): string {
    if (match.webSummary?.trim()) {
      return match.webSummary.trim();
    }

    if (match.webResearchStatus === 'Skipped:LiveContextNotRequired') {
      return 'Web search was skipped because this request did not ask for recent or live public context. Ranking used tenant data only.';
    }

    const snippets = match.webSources
      .map((source) => source.snippet?.trim())
      .filter((snippet): snippet is string => !!snippet)
      .slice(0, 3);

    if (snippets.length === 0) {
      return '';
    }

    return `Public web context summary: ${snippets.join(' ')}`;
  }

  rationaleFor(employee: BenchEmployee, match: BenchMatch): string {
    const sanitized = this.removeInvalidExperienceShortfall(employee, match.explanation);
    const preface = this.skillMismatchPreface(employee);
    if (!preface || sanitized.toLowerCase().startsWith(preface.toLowerCase())) {
      return sanitized || match.explanation;
    }

    return [preface, sanitized].filter(Boolean).join(' ');
  }

  rationalePreviewFor(employee: BenchEmployee, match: BenchMatch): string {
    return this.truncateText(this.rationaleFor(employee, match), 50);
  }

  formattedDescription(description: string): string {
    return formatJobDescription(description);
  }

  private truncateText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    const hardLimit = Math.max(0, maxLength - 3);
    const clipped = normalized.slice(0, hardLimit).trimEnd();
    const lastSpace = clipped.lastIndexOf(' ');
    const preview = lastSpace >= 40 ? clipped.slice(0, lastSpace) : clipped;
    return `${preview}...`;
  }

  private skillMismatchPreface(employee: BenchEmployee): string {
    if (employee.missingSkills.length === 0) {
      return '';
    }

    const primaryFocus = this.primaryProfileFocus(employee);
    const requiredSkills = this.rationaleRequiredSkills(employee);
    if (!primaryFocus || requiredSkills.some((skill) => this.isSameSkill(skill, primaryFocus))) {
      return '';
    }

    const matchedSkills = employee.matchedSkills.length > 0
      ? this.joinReadableList(employee.matchedSkills)
      : 'no direct requested skills';
    const missingSkills = this.joinReadableList(this.prioritizeTitleSkills(employee.missingSkills));
    const rolePhrase = employee.designation ? ` (${employee.designation})` : '';
    const experiencePhrase = employee.experienceYears === null || employee.experienceYears === undefined
      ? ''
      : ` and ${this.formatExperience(employee.experienceYears)} overall`;

    return `${employee.displayName}'s profile is primarily ${primaryFocus}${rolePhrase}; while they have backend/project experience${experiencePhrase}, this request is centered on ${this.joinReadableList(requiredSkills)}, and current tenant evidence only supports ${matchedSkills}. They are not preferred until missing ${missingSkills} evidence is validated.`;
  }

  private removeInvalidExperienceShortfall(employee: BenchEmployee, explanation: string): string {
    const trimmed = explanation.trim();
    const minimumYears = this.minimumExperienceYears();
    if (
      employee.experienceYears === null ||
      employee.experienceYears === undefined ||
      minimumYears === null ||
      employee.experienceYears < minimumYears
    ) {
      return trimmed;
    }

    if (!/(less than|below|under|short of)/i.test(trimmed)) {
      return this.replaceInvalidLimitedExperienceWording(trimmed);
    }

    const decimalPlaceholder = '__decimal__';
    const protectedText = trimmed.replace(/(\d)\.(\d)/g, `$1${decimalPlaceholder}$2`);
    const sentences = protectedText.match(/[^.!?]+[.!?]*/g) ?? [protectedText];
    const filtered = sentences
      .map((sentence) => sentence.replaceAll(decimalPlaceholder, '.').trim())
      .filter((sentence) => !/(less than|below|under|short of)/i.test(sentence) || !/(experience|years?|required|requirement)/i.test(sentence))
      .map((sentence) => this.replaceInvalidLimitedExperienceWording(sentence));

    return filtered.join(' ').trim();
  }

  private replaceInvalidLimitedExperienceWording(value: string): string {
    return value
      .replace(/\blimited experience and skill gaps\b/gi, 'limited required-skill evidence and skill gaps')
      .replace(/\blimited experience\b/gi, 'limited required-skill evidence');
  }

  private minimumExperienceYears(): number | null {
    const experience = this.review()?.jobRequest.experience ?? '';
    const match = experience.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  }

  private rationaleRequiredSkills(employee: BenchEmployee): string[] {
    const requestSkills = this.review()?.jobRequest.skills ?? [];
    const skills = requestSkills.length > 0
      ? requestSkills
      : [...employee.matchedSkills, ...employee.missingSkills];

    return this.prioritizeTitleSkills(skills);
  }

  private prioritizeTitleSkills(skills: string[]): string[] {
    const title = this.review()?.jobRequest.title ?? '';
    return [...new Set(skills)]
      .sort((first, second) => Number(this.containsSkillToken(title, second)) - Number(this.containsSkillToken(title, first)));
  }

  private primaryProfileFocus(employee: BenchEmployee): string {
    const knownFocusAreas = ['Java', '.NET', 'Python', 'React', 'Angular', 'Node.js', 'PHP', 'Ruby', 'Go', 'DevOps', 'QA', 'Data'];
    const designationFocus = knownFocusAreas.find((focus) => this.containsSkillToken(employee.designation ?? '', focus));
    if (designationFocus) {
      return designationFocus;
    }

    return knownFocusAreas.find((focus) => employee.skills.some((skill) => this.isSameSkill(skill, focus))) ?? '';
  }

  private joinReadableList(values: string[]): string {
    const cleaned = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
    if (cleaned.length === 0) {
      return 'the requested skills';
    }

    if (cleaned.length === 1) {
      return cleaned[0];
    }

    if (cleaned.length === 2) {
      return `${cleaned[0]} and ${cleaned[1]}`;
    }

    return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
  }

  private isSameSkill(value: string, skill: string): boolean {
    return this.containsSkillToken(value, skill);
  }

  private containsSkillToken(value: string, skill: string): boolean {
    const normalizedValue = this.normalizeSkillToken(value);
    const normalizedSkill = this.normalizeSkillToken(skill);
    return normalizedValue === normalizedSkill ||
      normalizedValue.startsWith(`${normalizedSkill} `) ||
      normalizedValue.endsWith(` ${normalizedSkill}`) ||
      normalizedValue.includes(` ${normalizedSkill} `);
  }

  private normalizeSkillToken(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  selectedPresalesName(review: PmoReview): string {
    const selectedId = this.presalesUserId() || review.defaultPresalesUserId;
    return review.presalesUsers.find((user) => user.id === selectedId)?.name ?? 'Not selected';
  }

  assignmentStatusLabel(review: PmoReview): string {
    return review.assignment?.status ?? review.jobRequest.stage;
  }

  assignmentStatusBadgeClass(review: PmoReview): string {
    const normalizedStatus = this.assignmentStatusLabel(review).toLowerCase().replace(/\s+/g, '');
    const classByStatus = new Map([
      ['pending', 'status-badge--hold'],
      ['claimed', 'status-badge--claimed'],
      ['completed', 'status-badge--success'],
      ['pmoreview', 'status-badge--review'],
    ]);

    return `status-badge ${classByStatus.get(normalizedStatus) ?? 'status-badge--neutral'}`;
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
    this.rankingError.set('');
  }
}
