import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AddManualCandidateInput,
  ApplicantRankingMatch,
  CandidateApplicationEvidence,
  CreateJobPostInput,
  InterviewTemplateOption,
  JobPost,
  JobPostInterviewRound,
  LookupOption,
  ManualCandidateSearchItem,
  ParseCandidateCvResult,
  RecruiterApplication,
  RecruiterSourcing,
  TalentRediscoveryMatch,
  UpdateJobPostInput,
  WorkflowAssignment,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import {
  DEFAULT_SKILL_GROUP_LABEL,
  SkillGroupTab,
  buildSkillGroupTabs,
  selectedSkillOptionsFor,
  toggleSkillId,
  visibleSkillGroupSubtitle,
  visibleSkillGroupTitle,
  visibleSkillsForPicker,
} from '../../shared/skill-groups';
import { formatJobDescription } from '../../core/job-description-formatting';

type ManualCandidateForm = {
  existingCandidateId: string;
  displayName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  currentDesignation: string;
  currentCompany: string;
  experienceYears: number | null;
  noticePeriodDays: number | null;
  skillIds: string[];
  sourceLabel: string;
  sourceDetail: string;
  sourceUrl: string;
  recruiterNotes: string;
  universityName: string;
  degreeName: string;
  graduationYear: number | null;
  invitationMessage: string;
};

type SourcingTab = 'review' | 'applications' | 'rediscovery' | 'post';

type ScheduleInterviewForm = {
  jobApplicationId: string;
  jobPostInterviewRoundId: string;
  startsAtLocal: string;
  meetingLink: string;
  locationText: string;
};

@Component({
  selector: 'app-recruiter-sourcing',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Recruiter Sourcing</p>
          <h1>{{ sourcing()?.jobRequest?.title ?? 'Recruiter workspace' }}</h1>
          @if (sourcing(); as data) {
            <p>{{ data.jobRequest.code }} - {{ data.jobRequest.client }} - {{ data.jobRequest.department }}</p>
          }
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading recruiter sourcing workspace...</section>
      } @else if (sourcing(); as data) {
        <nav class="ops-tabs sourcing-tabs" aria-label="Recruiter sourcing sections">
          <button
            type="button"
            [class.active]="activeTab() === 'review'"
            [attr.aria-selected]="activeTab() === 'review'"
            (click)="setTab('review')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
            Request Review
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'rediscovery'"
            [attr.aria-selected]="activeTab() === 'rediscovery'"
            (click)="setTab('rediscovery')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">person_search</span>
            Talent Rediscovery
            @if (data.talentRediscoveryMatches.length > 0) {
              <strong>{{ data.talentRediscoveryMatches.length }}</strong>
            }
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'applications'"
            [attr.aria-selected]="activeTab() === 'applications'"
            (click)="setTab('applications')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
            Applications
            @if (data.applications.length > 0) {
              <strong>{{ data.applications.length }}</strong>
            }
          </button>
          <button
            type="button"
            [class.active]="activeTab() === 'post'"
            [attr.aria-selected]="activeTab() === 'post'"
            (click)="setTab('post')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
            Job Post
          </button>
        </nav>

        <section class="recruiter-sourcing-layout">
          <div class="ops-main-stack">
            @if (activeTab() === 'review') {
              <article class="ops-panel request-summary-panel">
                <div class="panel-header">
                  <h2>Request Summary</h2>
                  <span class="status-badge">{{ data.jobRequest.stage }}</span>
                </div>
                <div class="job-description-body">{{ formattedDescription(data.jobRequest.description) }}</div>
                <dl class="sourcing-summary-grid">
                  <div>
                    <dt>Skills</dt>
                    <dd>{{ data.jobRequest.skills.join(', ') }}</dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd>{{ data.jobRequest.experience }}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{{ data.jobRequest.location }}</dd>
                  </div>
                  <div>
                    <dt>Positions</dt>
                    <dd>{{ data.jobRequest.requiredPositions }}</dd>
                  </div>
                </dl>
              </article>
            }

            @if (activeTab() === 'applications') {
              <article class="ops-panel applications-panel">
                <div class="panel-header">
                  <div>
                    <h2>Applications</h2>
                    <p class="muted">Review portal and manually sourced applications linked to this job post, then schedule candidate interview tasks.</p>
                  </div>
                  <div class="panel-actions">
                    <span class="status-badge info">{{ data.applications.length }} application(s)</span>
                    <button class="btn secondary ai-action" type="button" [disabled]="!canRankApplicants() || applicantRanking()" (click)="rankApplicants()">
                      &#10024; {{ applicantRanking() ? 'Ranking...' : 'Rank Applicants' }}
                    </button>
                  </div>
                </div>

                @if (message()) {
                  <p class="field-status success">{{ message() }}</p>
                }
                @if (error()) {
                  <p class="field-status error">{{ error() }}</p>
                }
                @if (latestApplicantRankingRun()) {
                  <p class="field-status success">
                    Last applicant ranking {{ latestApplicantRankingRun() }}.
                    Semantic similarity: {{ latestApplicantSemanticStatus() }}.
                    Recruiter decision remains manual.
                  </p>
                }

                @if (!data.jobPost) {
                  <div class="empty-state">
                    <strong>Create a job post first</strong>
                    <p>Applications are linked to a published job post. Create the draft, publish it, then candidates can apply or be manually invited.</p>
                  </div>
                } @else if (data.applications.length === 0) {
                  <div class="empty-state">
                    <strong>No applications yet</strong>
                    <p>Published portal applicants and manually sourced candidates will appear here.</p>
                  </div>
                } @else {
                  <div class="manual-candidate-list" role="table" aria-label="Recruiter candidate applications">
                    <div class="manual-candidate-header" role="row">
                      <span>Candidate</span>
                      <span>Source</span>
                      <span>Status / AI Fit</span>
                      <span>Interviews</span>
                      <span>Actions</span>
                    </div>
                    @for (application of data.applications; track application.jobApplicationId) {
                      <article class="manual-candidate-row" role="row">
                        <div data-label="Candidate">
                          <strong>{{ application.candidateName }}</strong>
                          <small>{{ application.candidateEmail }}</small>
                          <small>{{ application.currentDesignation || 'Designation not recorded' }}</small>
                          <small>{{ formatExperience(application.experienceYears) }} - Notice {{ formatNotice(application.noticePeriodDays) }}</small>
                        </div>
                        <div data-label="Source">
                          <strong>{{ application.sourceLabel }}</strong>
                          @if (application.sourceDetail) {
                            <small>{{ application.sourceDetail }}</small>
                          }
                          @if (application.isInvited) {
                            <span class="status-badge subtle">Invited</span>
                          }
                          <small>Applied {{ application.appliedAt | date: 'mediumDate' }}</small>
                        </div>
                        <div data-label="Status">
                          <span class="status-badge info">{{ application.applicationStatus }}</span>
                          @if (applicantRankingFor(application); as ranking) {
                            <strong>AI #{{ ranking.rank }} - {{ ranking.score | number: '1.0-0' }}%</strong>
                            <span class="fit-pill">{{ ranking.confidence }}</span>
                            <small>{{ summarizeApplicantGaps(ranking) || 'No major gaps flagged' }}</small>
                            <button class="table-link-button" type="button" (click)="toggleApplicantRankingDetails(application.jobApplicationId)">
                              {{ expandedApplicantRankingId() === application.jobApplicationId ? 'Hide rationale' : 'Show rationale' }}
                            </button>
                          } @else {
                            <small>No AI ranking yet</small>
                          }
                        </div>
                        <div data-label="Interviews">
                          <strong>{{ application.interviewPassSummary }}</strong>
                          @if (application.interviews.length === 0) {
                            <small>No scheduled interviews yet</small>
                          } @else {
                            @for (interview of application.interviews.slice(0, 3); track interview.interviewId) {
                              <small>{{ interview.roundName }} - {{ interview.status }} - {{ interview.startsAt | date: 'short' }}</small>
                            }
                          }
                        </div>
                        <div class="application-actions" data-label="Actions">
                          <button class="btn secondary compact" type="button" [disabled]="!canManageApplications() || saving()" (click)="updateApplicationStatus(application, 'Shortlist')">Shortlist</button>
                          <button class="btn secondary compact" type="button" [disabled]="!canManageApplications() || saving()" (click)="openScheduleModal(application)">Schedule</button>
                          @if (canForwardToHiringManager(application)) {
                            <button class="btn primary compact" type="button" [disabled]="!canManageApplications() || saving()" (click)="forwardToHiringManager(application)">Forward to Hiring Manager</button>
                          }
                          <button class="btn secondary compact" type="button" [disabled]="!canManageApplications() || saving()" (click)="updateApplicationStatus(application, 'Hold')">Hold</button>
                          <button class="btn secondary compact danger" type="button" [disabled]="!canManageApplications() || saving()" (click)="updateApplicationStatus(application, 'Reject')">Reject</button>
                          <a
                            class="table-link-button"
                            [routerLink]="candidateProfileLink(application.candidateId)"
                            [queryParams]="{ returnUrl: currentReturnUrl() }"
                          >
                            View profile
                          </a>
                        </div>
                        @if (expandedApplicantRankingId() === application.jobApplicationId && applicantRankingFor(application); as ranking) {
                          <section class="rationale-details-card applicant-ranking-details">
                            <div class="applicant-ranking-summary">
                              <h3>Applicant Ranking rationale</h3>
                              <p>{{ ranking.explanation }}</p>
                            </div>
                            <div>
                              <h4>Why this applicant fits</h4>
                              <ul>
                                @for (strength of ranking.strengths; track strength) {
                                  <li>{{ strength }}</li>
                                }
                              </ul>
                            </div>
                            <div>
                              <h4>Skills and gaps</h4>
                              <div class="tag-stack">
                                @for (skill of ranking.matchedSkills; track skill) {
                                  <span class="skill-chip matched">{{ skill }}</span>
                                }
                              </div>
                              @if (ranking.missingSkills.length > 0) {
                                <small>Gaps: {{ ranking.missingSkills.join(', ') }}</small>
                              }
                              @if (ranking.gaps.length > 0) {
                                <ul>
                                  @for (gap of ranking.gaps; track gap) {
                                    <li>{{ gap }}</li>
                                  }
                                </ul>
                              }
                            </div>
                            <div>
                              <h4>Application evidence</h4>
                              <ul>
                                @for (evidence of ranking.documentEvidence; track evidence) {
                                  <li>{{ evidence }}</li>
                                }
                              </ul>
                            </div>
                            <div>
                              <h4>Interview and history signal</h4>
                              <ul>
                                @for (evidence of ranking.historicalOutcomeEvidence; track evidence) {
                                  <li>{{ evidence }}</li>
                                }
                              </ul>
                              <small>Semantic similarity: {{ ranking.semanticSimilarityStatus }}</small>
                            </div>
                          </section>
                        }
                      </article>
                    }
                  </div>
                }
              </article>
            }

            @if (activeTab() === 'rediscovery') {
              <article class="ops-panel talent-rediscovery-panel">
                <div class="panel-header">
                  <div>
                    <div class="section-title-with-help">
                      <h2>Talent Rediscovery</h2>
                      <span class="agent-help">
                        <button
                          type="button"
                          class="agent-help-trigger"
                          aria-label="How Talent Rediscovery ranks candidates"
                          aria-describedby="talent-rediscovery-help"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">info</span>
                        </button>
                        <span id="talent-rediscovery-help" class="agent-help-popover" role="tooltip">
                          <strong>How this agent works</strong>
                          <span>Ranks previous candidates only. It never uses employee or bench data.</span>
                          <span>Priority 1: similar-role candidates who cleared all interviews and were kept on hold.</span>
                          <span>Priority 2: candidates who passed at least half of interviews for similar requirements.</span>
                          <span>Priority 3: late-stage candidates with positive feedback and non-fit closure reasons.</span>
                          <span>Priority 4: strong skill and semantic matches with limited interview evidence.</span>
                          <span>Excludes hired, inactive, current applicants, and hard-fit rejected candidates. Recruiters make the final decision.</span>
                        </span>
                      </span>
                    </div>
                    <p class="muted">Rank previous candidates before spending effort on new external sourcing.</p>
                  </div>
                  <button class="btn secondary ai-action" type="button" [disabled]="!canRunRediscovery() || rediscoveryRanking()" (click)="rankTalentRediscovery()">
                    &#10024; {{ rediscoveryRanking() ? 'Ranking...' : 'Rediscover' }}
                  </button>
                </div>

                @if (latestRediscoveryRun()) {
                  <p class="field-status success">Last ranked {{ latestRediscoveryRun() }}. Recruiter decision remains manual.</p>
                } @else {
                  <p class="muted">No rediscovery run has been saved for this request yet.</p>
                }

                @if (message()) {
                  <p class="field-status success">{{ message() }}</p>
                }
                @if (error()) {
                  <p class="field-status error">{{ error() }}</p>
                }

                <section class="manual-candidate-search">
                  <div class="panel-header compact">
                    <div>
                      <h3>Manual Candidate Search</h3>
                      <p class="muted">Search active tenant candidates with previous application history. This does not run AI or move candidates.</p>
                    </div>
                    <button class="btn secondary compact" type="button" (click)="clearManualFilters()">Clear Filters</button>
                  </div>

                  <div class="manual-candidate-filters">
                    <label class="stitch-field compact">
                      <span>Search</span>
                      <input
                        name="manualCandidateSearch"
                        type="search"
                        placeholder="Name, email, role, company"
                        [(ngModel)]="manualSearchText"
                      />
                    </label>
                    <label class="stitch-field compact">
                      <span>Skill</span>
                      <select name="manualSkillFilter" [(ngModel)]="manualSkillFilter">
                        <option value="">All skills</option>
                        @for (skill of manualSkillOptions(data); track skill) {
                          <option [ngValue]="skill">{{ skill }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Candidate status</span>
                      <select name="manualStatusFilter" [(ngModel)]="manualStatusFilter">
                        <option value="All">All statuses</option>
                        @for (status of manualCandidateStatusOptions(); track status) {
                          <option [ngValue]="status">{{ status }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Min passed interviews</span>
                      <input name="manualMinPassed" type="number" min="0" [(ngModel)]="manualMinPassedInterviews" />
                    </label>
                    <label class="stitch-field compact">
                      <span>Max failed interviews</span>
                      <input name="manualMaxFailed" type="number" min="0" [(ngModel)]="manualMaxFailedInterviews" />
                    </label>
                  </div>

                  @if (filteredManualCandidates().length === 0) {
                    <div class="empty-state compact">
                      <strong>No candidates match these filters</strong>
                      <p>Try a broader skill or interview-history filter.</p>
                    </div>
                  } @else {
                    <div class="manual-candidate-list" role="table" aria-label="Manual candidate search results">
                      <div class="manual-candidate-header" role="row">
                        <span>Candidate</span>
                        <span>Skills</span>
                        <span>Interview History</span>
                        <span>Latest Application</span>
                        <span>Actions</span>
                      </div>
                      @for (candidate of filteredManualCandidates(); track candidate.candidateId) {
                        <article class="manual-candidate-row" role="row">
                          <div data-label="Candidate">
                            <strong>{{ candidate.displayName }}</strong>
                            <small>{{ candidate.email }}</small>
                            <small>{{ candidate.currentDesignation || 'Designation not recorded' }}</small>
                            <small>{{ formatExperience(candidate.experienceYears) }} - Notice {{ formatNotice(candidate.noticePeriodDays) }}</small>
                            <span class="status-badge subtle">{{ candidate.status }}</span>
                          </div>
                          <div data-label="Skills">
                            <div class="tag-stack">
                              @for (skill of candidate.skills.slice(0, 6); track skill) {
                                <span class="skill-chip" [class.matched]="candidate.matchedSkills.includes(skill)">{{ skill }}</span>
                              }
                            </div>
                            @if (candidate.missingSkills.length > 0) {
                              <small>Gaps: {{ candidate.missingSkills.slice(0, 4).join(', ') }}</small>
                            }
                          </div>
                          <div data-label="Interview History">
                            <strong>{{ candidate.passedInterviews }}/{{ candidate.totalInterviews }} passed</strong>
                            <small>{{ candidate.failedInterviews }} failed interview(s)</small>
                            <small>{{ candidate.applicationCount }} historical application(s)</small>
                          </div>
                          <div data-label="Latest Application">
                            @if (candidate.latestApplication; as application) {
                              <strong>{{ displayApplicationTitle(application) }}</strong>
                              <small>{{ application.requestCode }} - {{ application.status }}</small>
                              <small>Interviews: {{ formatPassSummary(application) }}</small>
                            } @else {
                              <small>No application details available</small>
                            }
                          </div>
                          <div class="candidate-action-menu" data-label="Actions">
                            <button
                              class="icon-button action-menu-trigger"
                              type="button"
                              [attr.aria-expanded]="openManualCandidateMenuId() === candidate.candidateId"
                              [attr.aria-label]="'Open actions for ' + candidate.displayName"
                              (click)="toggleManualCandidateMenu(candidate.candidateId)"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                            </button>
                            @if (openManualCandidateMenuId() === candidate.candidateId) {
                              <div class="action-dropdown" role="menu">
                                <a
                                  role="menuitem"
                                  [routerLink]="candidateProfileLink(candidate.candidateId)"
                                  [queryParams]="{ returnUrl: currentReturnUrl() }"
                                  (click)="closeManualCandidateMenu()"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">badge</span>
                                  View profile
                                </a>
                                @if (candidate.latestApplication; as application) {
                                  <a
                                    role="menuitem"
                                    [routerLink]="applicationHistoryLink(application)"
                                    [queryParams]="{ returnUrl: currentReturnUrl() }"
                                    (click)="closeManualCandidateMenu()"
                                  >
                                    <span class="material-symbols-outlined" aria-hidden="true">history</span>
                                    Open latest application
                                  </a>
                                }
                              </div>
                            }
                          </div>
                        </article>
                      }
                    </div>
                  }
                </section>

                @if (data.talentRediscoveryMatches.length === 0) {
                  <div class="empty-state">
                    <strong>No ranked warm candidates yet</strong>
                    <p>Claim the sourcing work, then run the agent to rank previous applicants from tenant history.</p>
                  </div>
                } @else {
                  <div class="rediscovery-list" role="table" aria-label="Talent Rediscovery ranked candidates">
                    <div class="rediscovery-list-header" role="row">
                      <span>Rank / Fit</span>
                      <span>Candidate</span>
                      <span>History Signal</span>
                      <span>Skill Match</span>
                    </div>
                    @for (match of data.talentRediscoveryMatches; track match.candidateId) {
                      <article class="rediscovery-row" role="row">
                        <div class="rank-cell" data-label="Rank / Fit">
                          <strong>#{{ match.rank }}</strong>
                          <span class="fit-pill">{{ match.score | number: '1.0-0' }}%</span>
                          <small>{{ match.confidence }} confidence</small>
                        </div>
                        <div class="candidate-cell" data-label="Candidate">
                          <strong>{{ match.candidateName }}</strong>
                          <small>{{ match.candidateEmail }}</small>
                          <small>{{ match.currentDesignation || 'Designation not recorded' }}</small>
                          <small>{{ formatExperience(match.experienceYears) }} - Notice {{ formatNotice(match.noticePeriodDays) }}</small>
                          <a
                            class="table-link-button"
                            [routerLink]="candidateProfileLink(match.candidateId)"
                            [queryParams]="{ returnUrl: currentReturnUrl() }"
                          >
                            View profile
                          </a>
                        </div>
                        <div data-label="History Signal">
                          @if (match.applicationEvidence[0]; as application) {
                            <strong>{{ application.requestCode }}</strong>
                            <small>{{ displayApplicationTitle(application) }}</small>
                            <small>{{ application.status }} - {{ application.department }}</small>
                            <small>Interviews: {{ formatPassSummary(application) }}</small>
                          } @else {
                            <small>No application evidence</small>
                          }
                          @if (match.interviewEvidence[0]; as interview) {
                            <small>Interview: {{ interview.recommendation || interview.status }}</small>
                          }
                        </div>
                        <div data-label="Skill Match">
                          <div class="tag-stack">
                            @for (strength of visibleStrengthTags(match); track strength) {
                              <span class="skill-chip">{{ strength }}</span>
                            }
                          </div>
                          @if (match.gaps.length > 0) {
                            <small>Gaps: {{ summarizeGaps(match) }}</small>
                          }
                        </div>
                        <div class="rediscovery-rationale" data-label="AI Rationale">
                          <p>{{ match.explanation }}</p>
                          <button class="table-link-button" type="button" (click)="toggleDetails(match.candidateId)">
                            {{ expandedCandidateId() === match.candidateId ? 'Hide details' : 'Show details' }}
                          </button>
                        </div>
                      </article>
                      @if (expandedCandidateId() === match.candidateId) {
                        <article class="rationale-details-card">
                          <section>
                            <h3>Strengths</h3>
                            <ul>
                              @for (strength of match.strengths; track strength) {
                                <li>{{ strength }}</li>
                              }
                            </ul>
                          </section>
                          <section>
                            <h3>Gaps and Caveats</h3>
                            <ul>
                              @for (gap of match.gaps; track gap) {
                                <li>{{ gap }}</li>
                              }
                            </ul>
                          </section>
                          <section>
                            <h3>Application History</h3>
                            <div class="application-history-cards">
                              @for (application of match.applicationEvidence; track application.jobApplicationId) {
                                <article class="application-history-card">
                                  <strong>{{ displayApplicationTitle(application) }}</strong>
                                  <span>{{ application.requestCode }} - {{ application.status }}</span>
                                  <span>Interviews: {{ formatPassSummary(application) }}</span>
                                  @if (application.jobPostStatus) {
                                    <span>Post: {{ application.jobPostStatus }}</span>
                                  }
                                  <a
                                    class="table-link-button"
                                    [routerLink]="applicationHistoryLink(application)"
                                    [queryParams]="{ returnUrl: currentReturnUrl() }"
                                  >
                                    Open application
                                  </a>
                                </article>
                              }
                            </div>
                          </section>
                          <section>
                            <h3>Interview Evidence</h3>
                            <ul>
                              @for (interview of match.interviewEvidence; track interview.interviewId) {
                                <li>{{ interview.roundName }} - {{ interview.recommendation || interview.status }} - {{ interview.feedbackSummary || 'No written feedback' }}</li>
                              }
                            </ul>
                          </section>
                        </article>
                      }
                    }
                  </div>
                }
              </article>
            }

            @if (activeTab() === 'post') {
              <form class="ops-panel job-post-editor" (ngSubmit)="saveDraft()">
              <div class="panel-header">
                <div>
                  <h2>{{ data.jobPost ? 'Job Post Editor' : 'Create Draft Job Post' }}</h2>
                  <p class="muted">Published posts appear on the Talent Pilot portal. Recruiters can also add sourced candidates manually.</p>
                </div>
                <div class="post-header-actions">
                  @if (data.jobPost) {
                    <button
                      class="btn secondary compact"
                      type="button"
                      [disabled]="!canAddManualCandidate()"
                      (click)="openManualCandidateModal()"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
                      Add candidate
                    </button>
                    <span class="status-badge info">{{ data.jobPost.status }}</span>
                  }
                </div>
              </div>

              @if (!data.jobPost) {
                <label class="stitch-field">
                  <span>Interview Template</span>
                  <select name="template" [(ngModel)]="selectedTemplateId" (change)="applySelectedTemplate()">
                    @for (template of data.interviewTemplates; track template.interviewTemplateId) {
                      <option [ngValue]="template.interviewTemplateId">{{ template.name }} - {{ template.departmentName }}</option>
                    }
                  </select>
                </label>
              }

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Title</span>
                  <input name="title" [(ngModel)]="form.title" [disabled]="!canEditContent()" />
                </label>
                <label class="stitch-field">
                  <span>Required Positions</span>
                  <input name="requiredPositions" type="number" min="1" [(ngModel)]="form.requiredPositions" [disabled]="!canEditContent()" />
                </label>
                <label class="stitch-field">
                  <span>Minimum Experience</span>
                  <input name="minExperience" type="number" min="0" step="0.5" [(ngModel)]="form.experienceMinYears" [disabled]="!canEditContent()" />
                </label>
                <label class="stitch-field">
                  <span>Maximum Experience</span>
                  <input name="maxExperience" type="number" min="0" step="0.5" [(ngModel)]="form.experienceMaxYears" [disabled]="!canEditContent()" />
                </label>
              </div>

              <label class="stitch-field">
                <span>Description</span>
                <textarea name="description" rows="8" [(ngModel)]="form.description" [disabled]="!canEditContent()"></textarea>
              </label>

              <section class="post-editor-section">
                <div class="panel-header compact">
                  <div>
                    <h3>Skills</h3>
                    <p class="muted">Pick portal skills by role family. Search covers the full tenant catalog.</p>
                  </div>
                  <div class="selected-skill-summary">
                    <strong>{{ form.skillIds.length }}</strong>
                    <span>selected</span>
                  </div>
                </div>

                <div class="skill-toolbar">
                  <label class="skill-search">
                    <span>Search skills</span>
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input
                      name="postSkillSearch"
                      type="search"
                      [value]="postSkillSearch()"
                      [disabled]="!canEditContent()"
                      (input)="setPostSkillSearch($event)"
                      placeholder="Search Java, React, Figma, Terraform..."
                    />
                  </label>
                </div>

                @if (postSkillGroupTabs(data.skills).length > 0) {
                  <div class="skill-group-tabs" role="tablist" aria-label="Job post skill groups">
                    @for (group of postSkillGroupTabs(data.skills); track group.label) {
                      <button
                        type="button"
                        class="skill-group-tab"
                        [class.active]="postActiveSkillGroup() === group.label && !postSkillSearch().trim()"
                        [disabled]="!canEditContent()"
                        (click)="selectPostSkillGroup(group.label)"
                      >
                        <span>{{ group.label }}</span>
                        <small>{{ group.count }}</small>
                      </button>
                    }
                  </div>
                }

                @if (postSelectedSkillOptions(data.skills).length > 0) {
                  <div class="selected-skill-strip" aria-label="Selected job post skills">
                    @for (skill of postSelectedSkillOptions(data.skills); track skill.id) {
                      <button class="selected-skill-chip" type="button" [disabled]="!canEditContent()" (click)="toggleSkill(skill.id, false)">
                        {{ skill.name }}
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                      </button>
                    }
                  </div>
                }

                <div class="skill-picker-panel">
                  <div class="skill-picker-heading">
                    <div>
                      <h3>{{ postVisibleSkillGroupTitle() }}</h3>
                      <p>{{ postVisibleSkillGroupSubtitle(data.skills) }}</p>
                    </div>
                  </div>

                  @if (postVisibleSkills(data.skills).length > 0) {
                    <div class="skill-picker-grid">
                      @for (skill of postVisibleSkills(data.skills); track skill.id) {
                        <label class="skill-option-card" [class.selected]="skillSelected(skill.id)">
                          <input
                            type="checkbox"
                            [checked]="skillSelected(skill.id)"
                            [disabled]="!canEditContent()"
                            (change)="toggleSkill(skill.id, $any($event.target).checked)"
                          />
                          <span>{{ skill.name }}</span>
                          @if (skill.description) {
                            <small>{{ skill.description }}</small>
                          }
                        </label>
                      }
                    </div>
                  } @else {
                    <p class="empty-inline-state">No skills match this search.</p>
                  }
                </div>
              </section>

              <section class="post-editor-section">
                <div class="panel-header compact">
                  <div>
                    <h3>Interview Rounds</h3>
                    <p class="muted">Copied from the selected template and customizable per job post.</p>
                  </div>
                  <button type="button" class="btn secondary compact" [disabled]="!canEditContent()" (click)="addRound()">Add Round</button>
                </div>

                <div class="table-wrap">
                  <table class="ops-table sourcing-round-table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Default Interviewer</th>
                        <th>Minutes</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (round of form.interviewRounds; track round.roundOrder; let index = $index) {
                        <tr>
                          <td>
                            <input class="table-input" name="roundName{{ index }}" [(ngModel)]="round.name" [disabled]="!canEditContent()" />
                          </td>
                          <td>
                            <div class="round-interviewer-context">
                              <strong>{{ round.ownerUserName || 'Not assigned' }}</strong>
                              <small>Default interviewer for this round</small>
                            </div>
                            @if (recommendedHodForRound(round, index); as hod) {
                              <div class="hod-recommendation-card" [class.applied]="round.ownerUserId === hod.id">
                                <span class="material-symbols-outlined hod-recommendation-icon" aria-hidden="true">
                                  verified_user
                                </span>
                                <div class="hod-recommendation-copy">
                                  <span class="hod-recommendation-label">Recommended Department HOD</span>
                                  <strong>{{ hod.name }}</strong>
                                  <small>{{ hodRecommendationReason() }}</small>
                                </div>
                                @if (round.ownerUserId === hod.id) {
                                  <span class="status-badge success">Applied</span>
                                } @else {
                                  <button
                                    type="button"
                                    class="btn secondary compact"
                                    [disabled]="!canEditContent()"
                                    (click)="applyRecommendedHod(index, hod)"
                                  >
                                    Use recommendation
                                  </button>
                                }
                              </div>
                            } @else if (shouldSuggestHod(round, index)) {
                              <span class="hod-warning-chip">
                                <span class="material-symbols-outlined" aria-hidden="true">info</span>
                                No department HOD configured
                              </span>
                            }
                          </td>
                          <td>
                            <input class="table-input small" name="duration{{ index }}" type="number" min="15" max="240" [(ngModel)]="round.durationMinutes" [disabled]="!canEditContent()" />
                          </td>
                          <td>
                            <select name="status{{ index }}" [(ngModel)]="round.status" [disabled]="!canEditContent()">
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>
                          <td>
                            <button type="button" class="table-link-button" [disabled]="!canEditContent()" (click)="removeRound(index)">Remove</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>

              @if (message()) {
                <p class="field-status success">{{ message() }}</p>
              }
              @if (error()) {
                <p class="field-status error">{{ error() }}</p>
              }

              <div class="modal-actions">
                <button class="btn secondary" type="button" routerLink="/app/recruitment/queue">Back</button>
                <button class="btn primary" type="submit" [disabled]="!canEditContent() || saving()">
                  {{ data.jobPost ? 'Save Draft' : 'Create Draft' }}
                </button>
                @if (data.jobPost?.status === 'Draft') {
                  <button class="btn primary" type="button" [disabled]="!canEditContent() || saving()" (click)="publish()">Publish</button>
                }
                @if (data.jobPost && data.jobPost.status !== 'Closed') {
                  <button class="btn secondary" type="button" [disabled]="!canEditContent() || saving()" (click)="closePost()">Close Post</button>
                }
              </div>
              </form>
            }
          </div>

          <section class="sourcing-bottom-cards">
            <article class="ops-panel">
              <h2>Sourcing Assignment</h2>
              @if (data.assignment; as assignment) {
                <p class="muted">Recruiter group assignments must be claimed before job post actions.</p>
                <dl class="side-facts">
                  <div>
                    <dt>Status</dt>
                    <dd>{{ assignment.status }}</dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd>{{ assignmentOwnerName(assignment) }}</dd>
                  </div>
                </dl>
                @if (!assignment.claimedByUserId) {
                  <button type="button" class="btn primary full" (click)="claim(assignment.id)">Claim Sourcing Work</button>
                }
              } @else {
                <p class="muted">No active recruiter sourcing assignment is available.</p>
              }
            </article>
            <article class="scope-soft-note">
              <strong>LinkedIn</strong>
              <p>LinkedIn posting stays manual/source-tracked in MVP. This screen publishes only the Talent Pilot job post.</p>
            </article>
          </section>
        </section>
      } @else {
        <section class="ops-panel">Recruiter sourcing work was not found.</section>
      }

      @if (manualCandidateModalOpen()) {
        @if (sourcing(); as modalData) {
          @if (modalData.jobPost; as jobPost) {
            <div class="sourcing-modal-backdrop" role="presentation">
              <form class="sourcing-modal-panel" (ngSubmit)="submitManualCandidate(jobPost.jobPostId)">
              <header class="panel-header">
                <div>
                  <p class="eyebrow">Manual sourcing</p>
                  <h2>Add candidate to {{ jobPost.title }}</h2>
                  <p class="muted">Creates an invited application linked to this job post and queues a portal invitation email.</p>
                </div>
                <button class="icon-button" type="button" aria-label="Close" (click)="closeManualCandidateModal()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <section class="cv-parser-panel">
                <div>
                  <strong>CV Parser Agent</strong>
                  <p>Upload a DOCX resume to prefill this candidate form. Recruiters review and edit every extracted field before inviting.</p>
                </div>
                <label class="btn secondary compact cv-upload-button">
                  <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                  {{ cvParsing() ? 'Parsing...' : 'Parse DOCX CV' }}
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    [disabled]="cvParsing() || manualCandidateForm.existingCandidateId.length > 0"
                    (change)="parseManualCandidateCv($event)"
                  />
                </label>
              </section>
              @if (cvParseMessage()) {
                <p class="field-status success">{{ cvParseMessage() }}</p>
              }
              @if (cvParseError()) {
                <p class="field-status error">{{ cvParseError() }}</p>
              }

              <label class="stitch-field">
                <span>Use existing candidate</span>
                <select
                  name="existingCandidate"
                  [(ngModel)]="manualCandidateForm.existingCandidateId"
                  (change)="hydrateManualCandidateFromExisting()"
                >
                  <option value="">Create new lead</option>
                  @for (candidate of modalData.candidateSearchItems; track candidate.candidateId) {
                    <option [ngValue]="candidate.candidateId">{{ candidate.displayName }} - {{ candidate.email }}</option>
                  }
                </select>
              </label>

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Name</span>
                  <input name="manualDisplayName" [(ngModel)]="manualCandidateForm.displayName" [disabled]="manualCandidateForm.existingCandidateId.length > 0" />
                </label>
                <label class="stitch-field">
                  <span>Email</span>
                  <input name="manualEmail" type="email" required [(ngModel)]="manualCandidateForm.email" [disabled]="manualCandidateForm.existingCandidateId.length > 0" />
                </label>
                <label class="stitch-field">
                  <span>Phone</span>
                  <input name="manualPhone" [(ngModel)]="manualCandidateForm.phone" />
                </label>
                <label class="stitch-field">
                  <span>LinkedIn / profile URL</span>
                  <input name="manualLinkedIn" [(ngModel)]="manualCandidateForm.linkedInUrl" />
                </label>
                <label class="stitch-field">
                  <span>Current title</span>
                  <input name="manualDesignation" [(ngModel)]="manualCandidateForm.currentDesignation" />
                </label>
                <label class="stitch-field">
                  <span>Current company</span>
                  <input name="manualCompany" [(ngModel)]="manualCandidateForm.currentCompany" />
                </label>
                <label class="stitch-field">
                  <span>Total experience</span>
                  <input name="manualExperience" type="number" min="0" step="0.5" [(ngModel)]="manualCandidateForm.experienceYears" />
                </label>
                <label class="stitch-field">
                  <span>Notice period days</span>
                  <input name="manualNotice" type="number" min="0" [(ngModel)]="manualCandidateForm.noticePeriodDays" />
                </label>
                <label class="stitch-field">
                  <span>Source</span>
                  <select name="manualSource" [(ngModel)]="manualCandidateForm.sourceLabel">
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label class="stitch-field">
                  <span>Source detail</span>
                  <input name="manualSourceDetail" placeholder="Profile, search, referral name" [(ngModel)]="manualCandidateForm.sourceDetail" />
                </label>
                <label class="stitch-field">
                  <span>Source URL</span>
                  <input name="manualSourceUrl" [(ngModel)]="manualCandidateForm.sourceUrl" />
                </label>
                <label class="stitch-field">
                  <span>Primary university</span>
                  <input name="manualUniversity" [(ngModel)]="manualCandidateForm.universityName" />
                </label>
                <label class="stitch-field">
                  <span>Degree</span>
                  <input name="manualDegree" [(ngModel)]="manualCandidateForm.degreeName" />
                </label>
                <label class="stitch-field">
                  <span>Graduation year</span>
                  <input name="manualGraduation" type="number" min="1970" max="2100" [(ngModel)]="manualCandidateForm.graduationYear" />
                </label>
              </div>

              <section class="post-editor-section">
                <div class="panel-header compact">
                  <div>
                    <h3>Candidate skills</h3>
                    <p class="muted">Use the same role-family skill picker for manually sourced candidates.</p>
                  </div>
                  <div class="selected-skill-summary">
                    <strong>{{ manualCandidateForm.skillIds.length }}</strong>
                    <span>selected</span>
                  </div>
                </div>

                <div class="skill-toolbar">
                  <label class="skill-search">
                    <span>Search skills</span>
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input
                      name="manualSkillSearch"
                      type="search"
                      [value]="manualSkillSearch()"
                      [disabled]="manualCandidateForm.existingCandidateId.length > 0"
                      (input)="setManualSkillSearch($event)"
                      placeholder="Search Java, React, Figma, Terraform..."
                    />
                  </label>
                </div>

                @if (manualSkillGroupTabs(modalData.skills).length > 0) {
                  <div class="skill-group-tabs" role="tablist" aria-label="Manual candidate skill groups">
                    @for (group of manualSkillGroupTabs(modalData.skills); track group.label) {
                      <button
                        type="button"
                        class="skill-group-tab"
                        [class.active]="manualActiveSkillGroup() === group.label && !manualSkillSearch().trim()"
                        [disabled]="manualCandidateForm.existingCandidateId.length > 0"
                        (click)="selectManualSkillGroup(group.label)"
                      >
                        <span>{{ group.label }}</span>
                        <small>{{ group.count }}</small>
                      </button>
                    }
                  </div>
                }

                @if (manualSelectedSkillOptions(modalData.skills).length > 0) {
                  <div class="selected-skill-strip" aria-label="Selected candidate skills">
                    @for (skill of manualSelectedSkillOptions(modalData.skills); track skill.id) {
                      <button
                        class="selected-skill-chip"
                        type="button"
                        [disabled]="manualCandidateForm.existingCandidateId.length > 0"
                        (click)="toggleManualSkill(skill.id, false)"
                      >
                        {{ skill.name }}
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                      </button>
                    }
                  </div>
                }

                <div class="skill-picker-panel">
                  <div class="skill-picker-heading">
                    <div>
                      <h3>{{ manualVisibleSkillGroupTitle() }}</h3>
                      <p>{{ manualVisibleSkillGroupSubtitle(modalData.skills) }}</p>
                    </div>
                  </div>

                  @if (manualVisibleSkills(modalData.skills).length > 0) {
                    <div class="skill-picker-grid">
                      @for (skill of manualVisibleSkills(modalData.skills); track skill.id) {
                        <label
                          class="skill-option-card"
                          [class.selected]="manualSkillSelected(skill.id)"
                        >
                          <input
                            type="checkbox"
                            [checked]="manualSkillSelected(skill.id)"
                            [disabled]="manualCandidateForm.existingCandidateId.length > 0"
                            (change)="toggleManualSkill(skill.id, $any($event.target).checked)"
                          />
                          <span>{{ skill.name }}</span>
                          @if (skill.description) {
                            <small>{{ skill.description }}</small>
                          }
                        </label>
                      }
                    </div>
                  } @else {
                    <p class="empty-inline-state">No skills match this search.</p>
                  }
                </div>
              </section>

              <label class="stitch-field">
                <span>Recruiter notes</span>
                <textarea name="manualNotes" rows="3" [(ngModel)]="manualCandidateForm.recruiterNotes"></textarea>
              </label>

              <label class="stitch-field">
                <span>Invitation email message</span>
                <textarea name="manualInvitation" rows="3" [(ngModel)]="manualCandidateForm.invitationMessage"></textarea>
              </label>

              @if (manualCandidateError()) {
                <p class="field-status error">{{ manualCandidateError() }}</p>
              }

              <div class="modal-actions">
                <button class="btn secondary" type="button" (click)="closeManualCandidateModal()">Cancel</button>
                <button class="btn primary" type="submit" [disabled]="manualCandidateSaving()">
                  {{ manualCandidateSaving() ? 'Adding...' : 'Add and invite' }}
                </button>
              </div>
              </form>
            </div>
          }
        }
      }

      @if (scheduleModalOpen()) {
        @if (selectedApplication(); as application) {
          <div class="sourcing-modal-backdrop" role="presentation">
            <form class="sourcing-modal-panel compact-modal" (ngSubmit)="submitScheduleInterview()">
              <header class="panel-header">
                <div>
                  <p class="eyebrow">Interview scheduling</p>
                  <h2>Schedule {{ application.candidateName }}</h2>
                  <p class="muted">Creates an interview task for the selected round. Recruiters can later reschedule in the interview scheduling slice.</p>
                </div>
                <button class="icon-button" type="button" aria-label="Close" (click)="closeScheduleModal()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <label class="stitch-field">
                <span>Interview round</span>
                <select name="scheduleRound" required [(ngModel)]="scheduleForm.jobPostInterviewRoundId">
                  @for (round of activeInterviewRounds(); track round.jobPostInterviewRoundId ?? round.roundOrder) {
                    <option [ngValue]="round.jobPostInterviewRoundId">{{ round.roundOrder }}. {{ round.name }} - {{ round.ownerUserName || 'No default interviewer' }}</option>
                  }
                </select>
              </label>

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Date and time</span>
                  <input name="scheduleStartsAt" type="datetime-local" required [(ngModel)]="scheduleForm.startsAtLocal" />
                </label>
                <label class="stitch-field">
                  <span>Meeting link</span>
                  <input name="scheduleMeeting" placeholder="Google Meet / Zoom / Teams link" [(ngModel)]="scheduleForm.meetingLink" />
                </label>
                <label class="stitch-field full-span">
                  <span>Location / notes</span>
                  <input name="scheduleLocation" placeholder="Office room, remote note, or logistical detail" [(ngModel)]="scheduleForm.locationText" />
                </label>
              </div>

              @if (scheduleError()) {
                <p class="field-status error">{{ scheduleError() }}</p>
              }

              <div class="modal-actions">
                <button class="btn secondary" type="button" (click)="closeScheduleModal()">Cancel</button>
                <button class="btn primary" type="submit" [disabled]="scheduleSaving() || activeInterviewRounds().length === 0">
                  {{ scheduleSaving() ? 'Scheduling...' : 'Schedule interview' }}
                </button>
              </div>
            </form>
          </div>
        }
      }
    </main>
  `,
  styles: [
    `
      .recruiter-sourcing-layout {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr);
      }

      .sourcing-tabs {
        border-bottom: 1px solid #dbe3ef;
        display: flex;
        gap: 18px;
        margin: 0 0 18px;
      }

      .sourcing-tabs button {
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

      .sourcing-tabs button.active {
        border-bottom-color: #0b66c3;
        color: #0b66c3;
      }

      .sourcing-tabs strong {
        align-items: center;
        background: #e8f2ff;
        border-radius: 999px;
        color: #0b66c3;
        display: inline-flex;
        font-size: 12px;
        padding: 0 7px;
      }

      .panel-header {
        align-items: flex-start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 16px;
      }

      .panel-header.compact {
        margin-bottom: 10px;
      }

      .panel-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }

      .post-header-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-end;
      }

      .post-header-actions .btn {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .panel-header p {
        margin: 6px 0 0;
      }

      .sourcing-summary-grid,
      .side-facts {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 0;
      }

      .side-facts {
        grid-template-columns: 1fr;
        margin-bottom: 16px;
      }

      .sourcing-bottom-cards {
        align-items: stretch;
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
      }

      .sourcing-summary-grid dt,
      .side-facts dt {
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .sourcing-summary-grid dd,
      .side-facts dd {
        margin: 4px 0 0;
      }

      .post-editor-section {
        border-top: 1px solid var(--border-soft);
        margin-top: 18px;
        padding-top: 18px;
      }

      .post-editor-section h3 {
        margin: 0 0 10px;
      }

      .job-post-skill-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .job-post-skill-grid label {
        align-items: center;
        border: 1px solid var(--border);
        border-radius: 6px;
        display: grid;
        gap: 2px 8px;
        grid-template-columns: auto 1fr;
        padding: 10px;
      }

      .job-post-skill-grid small {
        color: var(--muted);
        grid-column: 2;
      }

      .table-input {
        border: 1px solid var(--border);
        border-radius: 4px;
        min-height: 36px;
        padding: 6px 8px;
        width: 100%;
      }

      .table-input.small {
        max-width: 96px;
      }

      .sourcing-round-table select {
        min-height: 36px;
      }

      .sourcing-modal-backdrop {
        align-items: flex-start;
        background: rgba(15, 23, 42, 0.48);
        bottom: 0;
        display: flex;
        justify-content: center;
        left: 0;
        overflow: auto;
        padding: 44px 18px;
        position: fixed;
        right: 0;
        top: 0;
        z-index: 100;
      }

      .sourcing-modal-panel {
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        display: grid;
        gap: 16px;
        max-width: 920px;
        padding: 24px;
        width: min(920px, 100%);
      }

      .cv-parser-panel {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        padding: 14px;
      }

      .cv-parser-panel p {
        color: var(--muted);
        margin: 4px 0 0;
      }

      .cv-upload-button {
        cursor: pointer;
        flex: 0 0 auto;
        gap: 6px;
      }

      .cv-upload-button input {
        height: 1px;
        opacity: 0;
        overflow: hidden;
        position: absolute;
        width: 1px;
      }

      .compact-modal {
        max-width: 720px;
        width: min(720px, 100%);
      }

      .full-span {
        grid-column: 1 / -1;
      }

      .ai-action {
        min-width: 190px;
      }

      .application-actions {
        align-items: start;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .application-actions .table-link-button {
        grid-column: 1 / -1;
        justify-self: start;
      }

      .btn.danger {
        border-color: #fecaca;
        color: #b91c1c;
      }

      .manual-candidate-search {
        border-top: 1px solid var(--border-soft);
        margin: 18px 0;
        padding-top: 18px;
      }

      .manual-candidate-search h3 {
        margin: 0;
      }

      .manual-candidate-filters {
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(220px, 1.4fr) repeat(4, minmax(140px, 1fr));
        margin-bottom: 14px;
      }

      .manual-candidate-list {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: visible;
      }

      .manual-candidate-header,
      .manual-candidate-row {
        display: grid;
        grid-template-columns: minmax(180px, 1.1fr) minmax(190px, 1fr) minmax(145px, 0.75fr) minmax(190px, 1fr) minmax(150px, 0.7fr);
      }

      .manual-candidate-header {
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .manual-candidate-header span,
      .manual-candidate-row > div {
        border-right: 1px solid #e2e8f0;
        min-width: 0;
        padding: 14px;
      }

      .manual-candidate-header span:last-child,
      .manual-candidate-row > div:last-child {
        border-right: 0;
      }

      .manual-candidate-row {
        border-top: 1px solid #e2e8f0;
      }

      .manual-candidate-row > div {
        align-content: start;
        display: grid;
        gap: 5px;
      }

      .manual-candidate-row small {
        color: var(--muted);
        display: block;
      }

      .candidate-action-menu {
        align-content: start;
        display: flex;
        justify-content: flex-end;
        overflow: visible;
        position: relative;
      }

      .action-menu-trigger {
        align-items: center;
        background: #fff;
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        color: var(--primary);
        cursor: pointer;
        display: inline-flex;
        height: 36px;
        justify-content: center;
        padding: 0;
        width: 36px;
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
        min-width: 210px;
        padding: 6px;
        position: absolute;
        right: 14px;
        top: 48px;
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
        color: var(--primary);
        outline: none;
      }

      .action-dropdown .material-symbols-outlined {
        color: var(--primary);
        font-size: 18px;
      }

      .skill-chip.matched {
        background: #e8f2ff;
        color: #0b66c3;
      }

      .rediscovery-list {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }

      .rediscovery-list-header,
      .rediscovery-row {
        display: grid;
        grid-template-columns: 96px minmax(180px, 1.1fr) minmax(180px, 1fr) minmax(180px, 1fr);
      }

      .rediscovery-list-header {
        background: #f8fafc;
        color: #475569;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .rediscovery-list-header span,
      .rediscovery-row > div {
        border-right: 1px solid #e2e8f0;
        min-width: 0;
        padding: 14px;
      }

      .rediscovery-list-header span:last-child,
      .rediscovery-row > div:last-child {
        border-right: 0;
      }

      .rediscovery-row {
        border-top: 1px solid #e2e8f0;
      }

      .rediscovery-row > div {
        align-content: start;
        display: grid;
        gap: 4px;
      }

      .rediscovery-row strong {
        color: #0f172a;
      }

      .rediscovery-row small {
        color: var(--muted);
        display: block;
        margin-top: 4px;
      }

      .rediscovery-rationale p {
        line-height: 1.45;
        margin: 0;
      }

      .rediscovery-rationale {
        background: #fbfdff;
        border-top: 1px solid #e2e8f0;
        grid-column: 1 / -1;
      }

      .fit-pill {
        background: var(--blue-soft);
        border-radius: 999px;
        color: var(--primary);
        display: inline-block;
        font-size: 12px;
        font-weight: 800;
        margin: 6px 0;
        padding: 3px 8px;
      }

      .applicant-ranking-details {
        grid-column: 1 / -1;
      }

      .tag-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .skill-chip {
        background: var(--surface-muted);
        border-radius: 999px;
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
        padding: 4px 8px;
      }

      .rationale-details-card {
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        padding: 16px;
      }

      .rationale-details-card h3 {
        font-size: 13px;
        margin: 0 0 8px;
      }

      .rationale-details-card ul {
        color: var(--muted);
        margin: 0;
        padding-left: 18px;
      }

      .empty-state {
        border: 1px dashed var(--border);
        border-radius: 8px;
        padding: 18px;
      }

      .empty-state p {
        color: var(--muted);
        margin: 6px 0 0;
      }

      .empty-state.compact {
        padding: 14px;
      }

      @media (max-width: 980px) {
        .sourcing-summary-grid,
        .sourcing-bottom-cards {
          grid-template-columns: 1fr;
        }

        .job-post-skill-grid {
          grid-template-columns: 1fr;
        }

        .cv-parser-panel {
          align-items: flex-start;
          flex-direction: column;
        }

        .post-header-actions {
          justify-content: flex-start;
        }

        .rationale-details-card {
          grid-template-columns: 1fr;
        }

        .manual-candidate-filters {
          grid-template-columns: 1fr;
        }

        .application-actions {
          grid-template-columns: 1fr;
        }

        .manual-candidate-list {
          border: 0;
          display: grid;
          gap: 12px;
          overflow: visible;
        }

        .manual-candidate-header {
          display: none;
        }

        .manual-candidate-row {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 1fr;
          overflow: visible;
        }

        .manual-candidate-row > div {
          border-right: 0;
          border-top: 1px solid #e2e8f0;
        }

        .manual-candidate-row > div:first-child {
          border-top: 0;
        }

        .candidate-action-menu {
          justify-content: flex-start;
        }

        .action-dropdown {
          left: 14px;
          right: auto;
        }

        .applicant-ranking-details {
          grid-template-columns: 1fr;
        }

        .rediscovery-list {
          border: 0;
          display: grid;
          gap: 12px;
          overflow: visible;
        }

        .rediscovery-list-header {
          display: none;
        }

        .rediscovery-row {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: grid;
          grid-template-columns: 1fr;
          overflow: hidden;
        }

        .rediscovery-row > div {
          border-right: 0;
          border-top: 1px solid #e2e8f0;
        }

        .rediscovery-row > div:first-child {
          border-top: 0;
        }
      }
    `,
  ],
})
export class RecruiterSourcingComponent implements OnInit {
  readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly sourcing = signal<RecruiterSourcing | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rediscoveryRanking = signal(false);
  readonly applicantRanking = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly activeTab = signal<SourcingTab>('review');
  readonly expandedCandidateId = signal<string | null>(null);
  readonly expandedApplicantRankingId = signal<string | null>(null);
  readonly openManualCandidateMenuId = signal<string | null>(null);
  readonly manualCandidateModalOpen = signal(false);
  readonly manualCandidateSaving = signal(false);
  readonly manualCandidateError = signal('');
  readonly cvParsing = signal(false);
  readonly cvParseMessage = signal('');
  readonly cvParseError = signal('');
  readonly selectedApplication = signal<RecruiterApplication | null>(null);
  readonly scheduleModalOpen = signal(false);
  readonly scheduleSaving = signal(false);
  readonly scheduleError = signal('');
  selectedTemplateId = '';
  manualSearchText = '';
  manualSkillFilter = '';
  manualStatusFilter = 'All';
  manualMinPassedInterviews: number | null = null;
  manualMaxFailedInterviews: number | null = null;
  readonly postSkillSearch = signal('');
  readonly postActiveSkillGroup = signal(DEFAULT_SKILL_GROUP_LABEL);
  readonly manualSkillSearch = signal('');
  readonly manualActiveSkillGroup = signal(DEFAULT_SKILL_GROUP_LABEL);
  manualCandidateForm = this.emptyManualCandidateForm();
  scheduleForm: ScheduleInterviewForm = this.emptyScheduleForm();
  form = this.emptyForm();

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const jobRequestId = this.route.snapshot.paramMap.get('jobRequestId');
    if (!jobRequestId) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      const sourcing = this.normalizeSourcing(await this.store.loadRecruiterSourcing(jobRequestId));
      this.sourcing.set(sourcing);
      this.hydrateForm(sourcing);
    } finally {
      this.loading.set(false);
    }
  }

  async claim(assignmentId: string): Promise<void> {
    await this.store.claimAssignment(assignmentId);
    await this.load();
  }

  async rankTalentRediscovery(): Promise<void> {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return;
    }

    this.rediscoveryRanking.set(true);
    this.clearStatus();
    try {
      const result = await this.store.rankTalentRediscovery(sourcing.jobRequest.id);
      this.sourcing.set({
        ...sourcing,
        talentRediscoveryMatches: result.talentRediscoveryMatches ?? [],
      });
      this.message.set(`Talent Rediscovery ranked ${result.talentRediscoveryMatches?.length ?? 0} warm candidate(s).`);
    } catch {
      this.error.set('Talent Rediscovery could not rank warm candidates. Manual sourcing was not changed.');
    } finally {
      this.rediscoveryRanking.set(false);
    }
  }

  async rankApplicants(): Promise<void> {
    const sourcing = this.sourcing();
    const jobPostId = sourcing?.jobPost?.jobPostId;
    if (!sourcing || !jobPostId) {
      return;
    }

    this.applicantRanking.set(true);
    this.clearStatus();
    try {
      const result = await this.store.rankApplicantRankings(jobPostId);
      this.sourcing.set({
        ...sourcing,
        applicantRankings: result.applicantRankings ?? [],
      });
      this.message.set(`Applicant Ranking ranked ${result.applicantRankings?.length ?? 0} current application(s).`);
    } catch {
      this.error.set('Applicant Ranking could not rank current applications. Manual application review was not changed.');
    } finally {
      this.applicantRanking.set(false);
    }
  }

  async saveDraft(): Promise<void> {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return;
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      const jobPost = sourcing.jobPost
        ? await this.store.updateJobPost(sourcing.jobPost.jobPostId, this.buildUpdateInput())
        : await this.store.createJobPost(sourcing.jobRequest.id, this.buildCreateInput());
      this.applyJobPost(jobPost);
      this.message.set(sourcing.jobPost ? 'Draft job post saved.' : 'Draft job post created.');
    } catch {
      this.error.set('Job post could not be saved. Confirm the sourcing work is claimed and required fields are complete.');
    } finally {
      this.saving.set(false);
    }
  }

  async publish(): Promise<void> {
    const jobPost = this.sourcing()?.jobPost;
    if (!jobPost) {
      return;
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      this.applyJobPost(await this.store.publishJobPost(jobPost.jobPostId));
      this.message.set('Job post published for the Talent Pilot portal.');
    } catch {
      this.error.set('Job post could not be published. It must be a draft with skills and at least one active interview round.');
    } finally {
      this.saving.set(false);
    }
  }

  async closePost(): Promise<void> {
    const jobPost = this.sourcing()?.jobPost;
    if (!jobPost) {
      return;
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      this.applyJobPost(await this.store.closeJobPost(jobPost.jobPostId));
      this.message.set('Job post closed.');
    } catch {
      this.error.set('Job post could not be closed.');
    } finally {
      this.saving.set(false);
    }
  }

  openManualCandidateModal(): void {
    const jobPost = this.sourcing()?.jobPost;
    this.manualCandidateForm = this.emptyManualCandidateForm();
    this.manualCandidateForm.invitationMessage = this.defaultInvitationMessage(jobPost?.title);
    this.manualCandidateError.set('');
    this.cvParseMessage.set('');
    this.cvParseError.set('');
    this.manualSkillSearch.set('');
    this.manualActiveSkillGroup.set(DEFAULT_SKILL_GROUP_LABEL);
    this.manualCandidateModalOpen.set(true);
  }

  closeManualCandidateModal(): void {
    if (this.manualCandidateSaving()) {
      return;
    }

    this.manualCandidateModalOpen.set(false);
    this.manualCandidateError.set('');
    this.cvParseMessage.set('');
    this.cvParseError.set('');
  }

  hydrateManualCandidateFromExisting(): void {
    const candidateId = this.manualCandidateForm.existingCandidateId;
    const candidate = this.sourcing()?.candidateSearchItems.find((item) => item.candidateId === candidateId);
    if (!candidate) {
      this.manualCandidateForm = {
        ...this.manualCandidateForm,
        displayName: '',
        email: '',
        currentDesignation: '',
        currentCompany: '',
        experienceYears: null,
        noticePeriodDays: null,
        skillIds: [],
      };
      return;
    }

    this.manualCandidateForm = {
      ...this.manualCandidateForm,
      displayName: candidate.displayName,
      email: candidate.email,
      currentDesignation: candidate.currentDesignation ?? '',
      currentCompany: candidate.currentCompany ?? '',
      experienceYears: candidate.experienceYears ?? null,
      noticePeriodDays: candidate.noticePeriodDays ?? null,
      skillIds: this.skillIdsForNames(candidate.skills),
    };
  }

  async parseManualCandidateCv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.cvParseMessage.set('');
    this.cvParseError.set('');

    if (!file) {
      return;
    }

    if (this.manualCandidateForm.existingCandidateId.length > 0) {
      this.cvParseError.set('Clear the existing candidate selection before parsing a new CV.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      this.cvParseError.set('Upload a DOCX resume for the CV Parser Agent.');
      return;
    }

    this.cvParsing.set(true);
    try {
      const parsed = await this.store.parseCandidateCv(file);
      this.applyParsedCv(parsed);
      this.cvParseMessage.set(`${parsed.summary} Review the extracted fields before inviting.`);
    } catch {
      this.cvParseError.set('CV Parser Agent could not parse this DOCX. Manual entry is still available.');
    } finally {
      this.cvParsing.set(false);
    }
  }

  async submitManualCandidate(jobPostId: string): Promise<void> {
    this.manualCandidateError.set('');
    if (!this.manualCandidateForm.email.trim()) {
      this.manualCandidateError.set('Email is required to create or invite a candidate.');
      return;
    }

    this.manualCandidateSaving.set(true);
    try {
      const result = await this.store.addManualCandidateToJobPost(jobPostId, this.buildManualCandidateInput());
      this.message.set(result.existingApplication
        ? 'This candidate already had an invited or active application for the job post.'
        : 'Candidate application created and invitation email queued.');
      this.manualCandidateModalOpen.set(false);
      await this.load();
      this.activeTab.set('post');
    } catch {
      this.manualCandidateError.set('Candidate could not be added. Confirm the job post is published and sourcing work is claimed.');
    } finally {
      this.manualCandidateSaving.set(false);
    }
  }

  async updateApplicationStatus(application: RecruiterApplication, decision: 'Shortlist' | 'Hold' | 'Reject'): Promise<void> {
    if (!this.canUseSourcingAssignment()) {
      this.error.set('Claim sourcing work before updating candidate applications.');
      return;
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      await this.store.updateCandidateApplicationStatus(application.jobApplicationId, {
        decision,
        notes: decision === 'Reject' ? 'Rejected during recruiter screening.' : null,
      });
      this.message.set(`${application.candidateName} moved to ${decision === 'Shortlist' ? 'Screening' : decision}.`);
      await this.load();
      this.activeTab.set('applications');
    } catch {
      this.error.set('Application status could not be updated. Confirm sourcing work is claimed.');
    } finally {
      this.saving.set(false);
    }
  }

  async forwardToHiringManager(application: RecruiterApplication): Promise<void> {
    if (!this.canUseSourcingAssignment()) {
      this.error.set('Claim sourcing work before forwarding candidates.');
      return;
    }

    if (!this.canForwardToHiringManager(application)) {
      this.error.set('Complete or skip every active interview round before forwarding to the Hiring Manager.');
      return;
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      await this.store.forwardToHiringManager(application.jobApplicationId);
      this.message.set(`${application.candidateName} forwarded to Hiring Manager Review.`);
      await this.load();
      this.activeTab.set('applications');
    } catch {
      this.error.set('Candidate could not be forwarded. Confirm all active rounds are completed or skipped.');
    } finally {
      this.saving.set(false);
    }
  }

  openScheduleModal(application: RecruiterApplication): void {
    this.clearStatus();
    const nextRound = this.nextSchedulableRound(application);
    this.selectedApplication.set(application);
    this.scheduleForm = {
      ...this.emptyScheduleForm(),
      jobApplicationId: application.jobApplicationId,
      jobPostInterviewRoundId: nextRound?.jobPostInterviewRoundId ?? '',
      startsAtLocal: this.defaultScheduleLocalDateTime(),
    };
    this.scheduleError.set('');
    this.scheduleModalOpen.set(true);
  }

  closeScheduleModal(): void {
    if (this.scheduleSaving()) {
      return;
    }

    this.scheduleModalOpen.set(false);
    this.selectedApplication.set(null);
    this.scheduleError.set('');
    this.scheduleForm = this.emptyScheduleForm();
  }

  async submitScheduleInterview(): Promise<void> {
    const application = this.selectedApplication();
    if (!application) {
      return;
    }

    const round = this.activeInterviewRounds()
      .find((item) => item.jobPostInterviewRoundId === this.scheduleForm.jobPostInterviewRoundId);
    if (!round?.jobPostInterviewRoundId) {
      this.scheduleError.set('Select an active interview round.');
      return;
    }

    if (!round.ownerUserId) {
      this.scheduleError.set('The selected round needs a default interviewer before it can be scheduled.');
      return;
    }

    const startsAt = new Date(this.scheduleForm.startsAtLocal);
    if (Number.isNaN(startsAt.getTime())) {
      this.scheduleError.set('Select a valid interview date and time.');
      return;
    }

    this.scheduleSaving.set(true);
    this.scheduleError.set('');
    try {
      await this.store.scheduleCandidateInterview(application.jobApplicationId, {
        jobPostInterviewRoundId: round.jobPostInterviewRoundId,
        interviewerUserId: round.ownerUserId,
        startsAtUtc: startsAt.toISOString(),
        meetingLink: this.blankToNull(this.scheduleForm.meetingLink),
        locationText: this.blankToNull(this.scheduleForm.locationText),
      });
      this.message.set(`${round.name} scheduled for ${application.candidateName}.`);
      this.scheduleSaving.set(false);
      this.closeScheduleModal();
      await this.load();
      this.activeTab.set('applications');
    } catch {
      this.scheduleError.set('Interview could not be scheduled. Confirm prior rounds are completed or skipped, and that this round has an active default interviewer.');
    } finally {
      this.scheduleSaving.set(false);
    }
  }

  applySelectedTemplate(): void {
    const template = this.selectedTemplate();
    if (!template || this.sourcing()?.jobPost) {
      return;
    }

    this.form.interviewRounds = template.rounds.map((round, index) => ({
      ...round,
      roundOrder: index + 1,
      status: round.status === 'Inactive' ? 'Inactive' : 'Active',
    }));
  }

  addRound(): void {
    this.form.interviewRounds = [
      ...this.form.interviewRounds,
      {
        roundOrder: this.form.interviewRounds.length + 1,
        name: 'Additional Interview',
        durationMinutes: 45,
        status: 'Active',
      },
    ];
  }

  removeRound(index: number): void {
    this.form.interviewRounds = this.form.interviewRounds
      .filter((_, currentIndex) => currentIndex !== index)
      .map((round, currentIndex) => ({ ...round, roundOrder: currentIndex + 1 }));
  }

  shouldSuggestHod(round: JobPostInterviewRound, index: number): boolean {
    const name = round.name.toLowerCase();
    return index === this.form.interviewRounds.length - 1 || name.includes('hod') || name.includes('department head') || name.includes('final');
  }

  recommendedHodForRound(round: JobPostInterviewRound, index: number): LookupOption | undefined {
    if (!this.shouldSuggestHod(round, index)) {
      return undefined;
    }

    return this.sourcing()?.hodInterviewers?.[0];
  }

  hodRecommendationReason(): string {
    const department = this.sourcing()?.jobPost?.department || this.sourcing()?.jobRequest.department || 'job post';
    return `${department} HOD matched to this job post department`;
  }

  formattedDescription(description: string): string {
    return formatJobDescription(description);
  }

  applyRecommendedHod(index: number, hod: LookupOption): void {
    this.form.interviewRounds = this.form.interviewRounds.map((round, roundIndex) =>
      roundIndex === index
        ? {
            ...round,
            ownerUserId: hod.id,
            ownerUserName: hod.name,
          }
        : round,
    );
  }

  skillSelected(skillId: string): boolean {
    return this.form.skillIds.includes(skillId);
  }

  toggleSkill(skillId: string, selected: boolean): void {
    if (!this.canEditContent()) {
      return;
    }

    this.form.skillIds = toggleSkillId(this.form.skillIds, skillId, selected);
  }

  postSkillGroupTabs(skills: readonly LookupOption[]): SkillGroupTab[] {
    return buildSkillGroupTabs(skills);
  }

  postSelectedSkillOptions(skills: readonly LookupOption[]): LookupOption[] {
    return selectedSkillOptionsFor(skills, this.form.skillIds);
  }

  postVisibleSkills(skills: readonly LookupOption[]): LookupOption[] {
    return visibleSkillsForPicker(skills, this.postSkillSearch(), this.postActiveSkillGroup());
  }

  postVisibleSkillGroupTitle(): string {
    return visibleSkillGroupTitle(this.postSkillSearch(), this.postActiveSkillGroup());
  }

  postVisibleSkillGroupSubtitle(skills: readonly LookupOption[]): string {
    return visibleSkillGroupSubtitle(this.postSkillSearch(), this.postVisibleSkills(skills).length);
  }

  setPostSkillSearch(event: Event): void {
    this.postSkillSearch.set((event.target as HTMLInputElement).value);
  }

  selectPostSkillGroup(groupLabel: string): void {
    this.postActiveSkillGroup.set(groupLabel);
    this.postSkillSearch.set('');
  }

  canEditContent(): boolean {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return false;
    }

    if (sourcing.jobPost?.status && sourcing.jobPost.status !== 'Draft') {
      return false;
    }

    return this.canUseSourcingAssignment();
  }

  canRunRediscovery(): boolean {
    return this.canUseSourcingAssignment();
  }

  canRankApplicants(): boolean {
    const sourcing = this.sourcing();
    return this.canUseSourcingAssignment() &&
      !!sourcing?.jobPost &&
      (sourcing.applications?.length ?? 0) > 0;
  }

  canAddManualCandidate(): boolean {
    const jobPost = this.sourcing()?.jobPost;
    return this.canUseSourcingAssignment() && jobPost?.status === 'Published';
  }

  canManageApplications(): boolean {
    return this.canUseSourcingAssignment();
  }

  canForwardToHiringManager(application: RecruiterApplication): boolean {
    if (
      !this.canUseSourcingAssignment() ||
      application.applicationStatus === 'HiringManagerReview' ||
      application.applicationStatus === 'Hiring Manager Review'
    ) {
      return false;
    }

    const rounds = this.activeInterviewRounds();
    if (rounds.length === 0) {
      return false;
    }

    const resolvedStatuses = new Set(['Completed', 'Skipped']);
    return rounds.every((round) => {
      const roundId = round.jobPostInterviewRoundId;
      if (!roundId) {
        return false;
      }

      return application.interviews.some(
        (interview) =>
          interview.jobPostInterviewRoundId === roundId &&
          resolvedStatuses.has(interview.status),
      );
    });
  }

  activeInterviewRounds(): JobPostInterviewRound[] {
    return (this.sourcing()?.jobPost?.interviewRounds ?? [])
      .filter((round) => round.status === 'Active' && !!round.jobPostInterviewRoundId)
      .sort((left, right) => left.roundOrder - right.roundOrder);
  }

  manualSkillSelected(skillId: string): boolean {
    return this.manualCandidateForm.skillIds.includes(skillId);
  }

  toggleManualSkill(skillId: string, selected: boolean): void {
    if (this.manualCandidateForm.existingCandidateId.length > 0) {
      return;
    }

    this.manualCandidateForm.skillIds = toggleSkillId(this.manualCandidateForm.skillIds, skillId, selected);
  }

  manualSkillGroupTabs(skills: readonly LookupOption[]): SkillGroupTab[] {
    return buildSkillGroupTabs(skills);
  }

  manualSelectedSkillOptions(skills: readonly LookupOption[]): LookupOption[] {
    return selectedSkillOptionsFor(skills, this.manualCandidateForm.skillIds);
  }

  manualVisibleSkills(skills: readonly LookupOption[]): LookupOption[] {
    return visibleSkillsForPicker(skills, this.manualSkillSearch(), this.manualActiveSkillGroup());
  }

  manualVisibleSkillGroupTitle(): string {
    return visibleSkillGroupTitle(this.manualSkillSearch(), this.manualActiveSkillGroup());
  }

  manualVisibleSkillGroupSubtitle(skills: readonly LookupOption[]): string {
    return visibleSkillGroupSubtitle(this.manualSkillSearch(), this.manualVisibleSkills(skills).length);
  }

  setManualSkillSearch(event: Event): void {
    this.manualSkillSearch.set((event.target as HTMLInputElement).value);
  }

  selectManualSkillGroup(groupLabel: string): void {
    this.manualActiveSkillGroup.set(groupLabel);
    this.manualSkillSearch.set('');
  }

  setTab(tab: SourcingTab): void {
    this.activeTab.set(tab);
    this.clearStatus();
  }

  toggleDetails(candidateId: string): void {
    this.expandedCandidateId.set(this.expandedCandidateId() === candidateId ? null : candidateId);
  }

  toggleApplicantRankingDetails(jobApplicationId: string): void {
    this.expandedApplicantRankingId.set(this.expandedApplicantRankingId() === jobApplicationId ? null : jobApplicationId);
  }

  toggleManualCandidateMenu(candidateId: string): void {
    this.openManualCandidateMenuId.set(this.openManualCandidateMenuId() === candidateId ? null : candidateId);
  }

  closeManualCandidateMenu(): void {
    this.openManualCandidateMenuId.set(null);
  }

  latestRediscoveryRun(): string {
    const generatedAt = this.sourcing()?.talentRediscoveryMatches[0]?.generatedAt;
    return generatedAt ? new Date(generatedAt).toLocaleString() : '';
  }

  latestApplicantRankingRun(): string {
    const generatedAt = this.sourcing()?.applicantRankings[0]?.generatedAt;
    return generatedAt ? new Date(generatedAt).toLocaleString() : '';
  }

  latestApplicantSemanticStatus(): string {
    return this.sourcing()?.applicantRankings[0]?.semanticSimilarityStatus || 'Not run';
  }

  applicantRankingFor(application: RecruiterApplication): ApplicantRankingMatch | undefined {
    return this.sourcing()?.applicantRankings
      .find((ranking) => ranking.jobApplicationId === application.jobApplicationId);
  }

  filteredManualCandidates(): ManualCandidateSearchItem[] {
    const candidates = this.sourcing()?.candidateSearchItems ?? [];
    const text = this.manualSearchText.trim().toLowerCase();
    const minPassed = this.manualMinPassedInterviews === null || this.manualMinPassedInterviews === undefined
      ? null
      : Number(this.manualMinPassedInterviews);
    const maxFailed = this.manualMaxFailedInterviews === null || this.manualMaxFailedInterviews === undefined
      ? null
      : Number(this.manualMaxFailedInterviews);

    return candidates
      .filter((candidate) => !text || this.matchesManualSearch(candidate, text))
      .filter((candidate) => this.manualSkillFilter === '' || this.hasCandidateSkill(candidate, this.manualSkillFilter))
      .filter((candidate) => this.manualStatusFilter === 'All' || candidate.status === this.manualStatusFilter)
      .filter((candidate) => minPassed === null || candidate.passedInterviews >= minPassed)
      .filter((candidate) => maxFailed === null || candidate.failedInterviews <= maxFailed)
      .sort((left, right) => {
        const passedDelta = right.passedInterviews - left.passedInterviews;
        if (passedDelta !== 0) {
          return passedDelta;
        }

        const failedDelta = left.failedInterviews - right.failedInterviews;
        if (failedDelta !== 0) {
          return failedDelta;
        }

        return left.displayName.localeCompare(right.displayName);
      });
  }

  manualCandidateStatusOptions(): string[] {
    return Array.from(new Set((this.sourcing()?.candidateSearchItems ?? []).map((candidate) => candidate.status)))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }

  manualSkillOptions(sourcing: RecruiterSourcing): string[] {
    const configuredSkills = sourcing.skills.map((skill) => skill.name);
    const candidateSkills = sourcing.candidateSearchItems.flatMap((candidate) => candidate.skills);
    return Array.from(new Set([...configuredSkills, ...candidateSkills]))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }

  clearManualFilters(): void {
    this.manualSearchText = '';
    this.manualSkillFilter = '';
    this.manualStatusFilter = 'All';
    this.manualMinPassedInterviews = null;
    this.manualMaxFailedInterviews = null;
    this.closeManualCandidateMenu();
  }

  visibleStrengthTags(match: TalentRediscoveryMatch): string[] {
    return match.strengths
      .filter((strength) => strength.toLowerCase().startsWith('matches '))
      .flatMap((strength) => strength.replace(/^Matches\s+/i, '').replace(/\.$/, '').split(','))
      .map((strength) => strength.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  summarizeGaps(match: TalentRediscoveryMatch): string {
    return match.gaps
      .map((gap) => gap.replace(/^Missing requested skill evidence:\s*/i, '').replace(/\.$/, ''))
      .slice(0, 3)
      .join(', ');
  }

  summarizeApplicantGaps(match: ApplicantRankingMatch): string {
    if (match.missingSkills.length > 0) {
      return `Gaps: ${match.missingSkills.slice(0, 3).join(', ')}`;
    }

    return match.gaps
      .slice(0, 2)
      .join(' ');
  }

  assignmentOwnerName(assignment: WorkflowAssignment): string {
    if (!assignment.claimedByUserId) {
      return assignment.assignedToGroupId || 'Unclaimed group assignment';
    }

    const currentUser = this.auth.currentUser();
    if (currentUser?.id === assignment.claimedByUserId) {
      return currentUser.name;
    }

    return this.store.getUserName(assignment.claimedByUserId);
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Experience not recorded' : `${value.toFixed(1)} yrs`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'not recorded' : `${value} days`;
  }

  displayApplicationTitle(application: CandidateApplicationEvidence): string {
    return application.displayJobTitle || application.jobPostTitle || application.jobTitle;
  }

  formatPassSummary(application: CandidateApplicationEvidence): string {
    if (application.interviewPassSummary) {
      return application.interviewPassSummary;
    }

    return `${application.interviewsPassed ?? 0}/${application.interviewsTotal ?? 0} passed`;
  }

  applicationHistoryLink(application: CandidateApplicationEvidence): string[] {
    return ['/app/recruitment/applications', application.jobApplicationId, 'history'];
  }

  candidateProfileLink(candidateId: string): string[] {
    return ['/app/recruitment/candidates', candidateId, 'profile'];
  }

  currentReturnUrl(): string {
    return this.router.url;
  }

  private matchesManualSearch(candidate: ManualCandidateSearchItem, normalizedText: string): boolean {
    const latestApplication = candidate.latestApplication;
    const searchableValues = [
      candidate.displayName,
      candidate.email,
      candidate.status,
      candidate.currentDesignation,
      candidate.currentCompany,
      ...(candidate.skills ?? []),
      latestApplication?.requestCode,
      latestApplication ? this.displayApplicationTitle(latestApplication) : null,
      latestApplication?.status,
    ];

    return searchableValues
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .some((value) => value.toLowerCase().includes(normalizedText));
  }

  private hasCandidateSkill(candidate: ManualCandidateSearchItem, skillName: string): boolean {
    return candidate.skills.some((skill) => skill.toLowerCase() === skillName.toLowerCase());
  }

  private nextSchedulableRound(application: RecruiterApplication): JobPostInterviewRound | undefined {
    const scheduledRoundIds = new Set(
      application.interviews
        .map((interview) => interview.jobPostInterviewRoundId)
        .filter((roundId): roundId is string => typeof roundId === 'string' && roundId.length > 0),
    );

    return this.activeInterviewRounds()
      .find((round) => !!round.jobPostInterviewRoundId && !scheduledRoundIds.has(round.jobPostInterviewRoundId));
  }

  private defaultScheduleLocalDateTime(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setMinutes(0, 0, 0);
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private canUseSourcingAssignment(): boolean {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return false;
    }

    const userId = this.auth.currentUser()?.id;
    return this.auth.isAdmin() ||
      (!!userId && (sourcing.assignment?.claimedByUserId === userId || sourcing.assignment?.assignedToUserId === userId));
  }

  private hydrateForm(sourcing: RecruiterSourcing): void {
    this.postSkillSearch.set('');
    this.postActiveSkillGroup.set(DEFAULT_SKILL_GROUP_LABEL);

    if (sourcing.jobPost) {
      this.form = {
        title: sourcing.jobPost.title,
        description: sourcing.jobPost.description,
        skillIds: sourcing.jobPost.skills.map((skill) => skill.skillId),
        experienceMinYears: sourcing.jobPost.experienceMinYears ?? null,
        experienceMaxYears: sourcing.jobPost.experienceMaxYears ?? null,
        requiredPositions: sourcing.jobPost.requiredPositions,
        interviewRounds: sourcing.jobPost.interviewRounds.map((round) => ({ ...round })),
      };
      return;
    }

    this.selectedTemplateId = sourcing.interviewTemplates[0]?.interviewTemplateId ?? '';
    const [minExperience, maxExperience] = this.parseExperience(sourcing.jobRequest.experience);
    this.form = {
      title: sourcing.jobRequest.title,
      description: sourcing.jobRequest.description,
      skillIds: sourcing.skills
        .filter((skill) => sourcing.jobRequest.skills.some((requestSkill) => requestSkill.toLowerCase() === skill.name.toLowerCase()))
        .map((skill) => skill.id),
      experienceMinYears: minExperience,
      experienceMaxYears: maxExperience,
      requiredPositions: sourcing.jobRequest.requiredPositions,
      interviewRounds: [],
    };
    this.applySelectedTemplate();
  }

  private normalizeSourcing(sourcing: RecruiterSourcing): RecruiterSourcing {
    return {
      ...sourcing,
      applications: sourcing.applications ?? [],
      applicantRankings: sourcing.applicantRankings ?? [],
      candidateSearchItems: sourcing.candidateSearchItems ?? [],
      talentRediscoveryMatches: sourcing.talentRediscoveryMatches ?? [],
      interviewTemplates: sourcing.interviewTemplates ?? [],
      hodInterviewers: sourcing.hodInterviewers ?? [],
      skills: sourcing.skills ?? [],
    };
  }

  private selectedTemplate(): InterviewTemplateOption | undefined {
    return this.sourcing()?.interviewTemplates.find((template) => template.interviewTemplateId === this.selectedTemplateId);
  }

  private buildCreateInput(): CreateJobPostInput {
    return {
      interviewTemplateId: this.selectedTemplateId,
      ...this.buildBaseInput(),
    };
  }

  private buildUpdateInput(): UpdateJobPostInput {
    return this.buildBaseInput();
  }

  private buildManualCandidateInput(): AddManualCandidateInput {
    return {
      existingCandidateId: this.blankToNull(this.manualCandidateForm.existingCandidateId),
      displayName: this.blankToNull(this.manualCandidateForm.displayName),
      email: this.manualCandidateForm.email.trim(),
      phone: this.blankToNull(this.manualCandidateForm.phone),
      linkedInUrl: this.blankToNull(this.manualCandidateForm.linkedInUrl),
      currentDesignation: this.blankToNull(this.manualCandidateForm.currentDesignation),
      currentCompany: this.blankToNull(this.manualCandidateForm.currentCompany),
      experienceYears: this.numberOrNull(this.manualCandidateForm.experienceYears),
      noticePeriodDays: this.numberOrNull(this.manualCandidateForm.noticePeriodDays),
      skillIds: this.manualCandidateForm.skillIds,
      sourceLabel: this.manualCandidateForm.sourceLabel,
      sourceDetail: this.blankToNull(this.manualCandidateForm.sourceDetail),
      sourceUrl: this.blankToNull(this.manualCandidateForm.sourceUrl),
      recruiterNotes: this.blankToNull(this.manualCandidateForm.recruiterNotes),
      universityName: this.blankToNull(this.manualCandidateForm.universityName),
      degreeName: this.blankToNull(this.manualCandidateForm.degreeName),
      graduationYear: this.numberOrNull(this.manualCandidateForm.graduationYear),
      invitationMessage: this.blankToNull(this.manualCandidateForm.invitationMessage),
    };
  }

  private buildBaseInput(): UpdateJobPostInput {
    return {
      title: this.form.title,
      description: this.form.description,
      skillIds: this.form.skillIds,
      experienceMinYears: this.numberOrNull(this.form.experienceMinYears),
      experienceMaxYears: this.numberOrNull(this.form.experienceMaxYears),
      requiredPositions: Number(this.form.requiredPositions) || 1,
      interviewRounds: this.form.interviewRounds.map((round, index) => ({
        jobPostInterviewRoundId: round.jobPostInterviewRoundId ?? null,
        interviewTemplateRoundId: round.interviewTemplateRoundId ?? null,
        roundOrder: index + 1,
        name: round.name,
        ownerUserId: round.ownerUserId ?? null,
        durationMinutes: Number(round.durationMinutes) || 60,
        status: round.status === 'Inactive' ? 'Inactive' : 'Active',
      })),
    };
  }

  private emptyManualCandidateForm(): ManualCandidateForm {
    return {
      existingCandidateId: '',
      displayName: '',
      email: '',
      phone: '',
      linkedInUrl: '',
      currentDesignation: '',
      currentCompany: '',
      experienceYears: null,
      noticePeriodDays: null,
      skillIds: [],
      sourceLabel: 'LinkedIn',
      sourceDetail: '',
      sourceUrl: '',
      recruiterNotes: '',
      universityName: '',
      degreeName: '',
      graduationYear: null,
      invitationMessage: this.defaultInvitationMessage(),
    };
  }

  private emptyScheduleForm(): ScheduleInterviewForm {
    return {
      jobApplicationId: '',
      jobPostInterviewRoundId: '',
      startsAtLocal: '',
      meetingLink: '',
      locationText: '',
    };
  }

  private defaultInvitationMessage(jobTitle?: string): string {
    const companyName = this.auth.currentUser()?.tenantDisplayName || 'Our company';
    const title = jobTitle || this.sourcing()?.jobPost?.title || this.sourcing()?.jobRequest.title || 'a new role';
    return `${companyName} is looking for ${title}. Please apply at our job portal for this job post if you are interested.`;
  }

  private applyParsedCv(parsed: ParseCandidateCvResult): void {
    const parsedSkillIds = this.skillIdsForNames(parsed.skills ?? []);
    const notes = [
      this.manualCandidateForm.recruiterNotes.trim(),
      parsed.summary ? `CV Parser Agent: ${parsed.summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    this.manualCandidateForm = {
      ...this.manualCandidateForm,
      displayName: parsed.displayName?.trim() || this.manualCandidateForm.displayName,
      email: parsed.email?.trim() || this.manualCandidateForm.email,
      phone: parsed.phone?.trim() || this.manualCandidateForm.phone,
      currentDesignation: parsed.currentDesignation?.trim() || this.manualCandidateForm.currentDesignation,
      currentCompany: parsed.currentCompany?.trim() || this.manualCandidateForm.currentCompany,
      experienceYears: parsed.experienceYears ?? this.manualCandidateForm.experienceYears,
      skillIds: Array.from(new Set([...this.manualCandidateForm.skillIds, ...parsedSkillIds])),
      universityName: parsed.universityName?.trim() || this.manualCandidateForm.universityName,
      degreeName: parsed.degreeName?.trim() || this.manualCandidateForm.degreeName,
      graduationYear: parsed.graduationYear ?? this.manualCandidateForm.graduationYear,
      recruiterNotes: notes,
    };
  }

  private skillIdsForNames(skillNames: string[]): string[] {
    const skillNameSet = new Set(skillNames.map((skill) => skill.toLowerCase()));
    return (this.sourcing()?.skills ?? [])
      .filter((skill) => skillNameSet.has(skill.name.toLowerCase()))
      .map((skill) => skill.id);
  }

  private applyJobPost(jobPost: JobPost): void {
    const current = this.sourcing();
    if (!current) {
      return;
    }

    this.sourcing.set({ ...current, jobPost });
    this.hydrateForm({ ...current, jobPost });
  }

  private emptyForm(): {
    title: string;
    description: string;
    skillIds: string[];
    experienceMinYears: number | null;
    experienceMaxYears: number | null;
    requiredPositions: number;
    interviewRounds: JobPostInterviewRound[];
  } {
    return {
      title: '',
      description: '',
      skillIds: [],
      experienceMinYears: null,
      experienceMaxYears: null,
      requiredPositions: 1,
      interviewRounds: [],
    };
  }

  private parseExperience(value: string): [number | null, number | null] {
    const range = value.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (range) {
      return [Number(range[1]), Number(range[2])];
    }

    const minimum = value.match(/(\d+(?:\.\d+)?)\+/);
    if (minimum) {
      return [Number(minimum[1]), null];
    }

    const maximum = value.match(/Up to\s+(\d+(?:\.\d+)?)/i);
    if (maximum) {
      return [null, Number(maximum[1])];
    }

    return [null, null];
  }

  private blankToNull(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private numberOrNull(value: number | null | undefined): number | null {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
  }

  private clearStatus(): void {
    this.message.set('');
    this.error.set('');
  }
}
