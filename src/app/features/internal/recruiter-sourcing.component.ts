import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Subscription } from 'rxjs';
import {
  AddManualCandidateInput,
  ApplicantRankingMatch,
  CandidateApplicationEvidence,
  CreateJobPostInput,
  InterviewerOption,
  InterviewTemplateOption,
  JobPost,
  JobPostInterviewRound,
  LookupOption,
  ManualCandidateSearchItem,
  OnlineCandidateLead,
  OnlineHeadhuntingResult,
  ParseCandidateCvResult,
  ParsedCandidateCvEvidenceInput,
  RecruiterApplication,
  RecruiterApplicationDocument,
  RecruiterApplicationInterview,
  RecruiterSourcing,
  TalentRediscoveryMatch,
  UpdateJobPostInput,
  WorkflowAssignment,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RagAssistantPanelComponent } from '../../shared/rag-assistant-panel.component';
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
import { FileDownloadService } from '../../core/services/file-download.service';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

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
  parsedCvEvidence: ParsedCandidateCvEvidenceInput | null;
  onlineLeadId: string;
};

type SourcingTab = 'review' | 'applications' | 'analytics' | 'rediscovery' | 'headhunting' | 'post';
type OnlineLeadFilter = 'All' | 'Shortlisted' | 'Rejected' | 'NeedsEmail' | 'PossibleDuplicates';

type ApplicationTrendPoint = {
  dateKey: string;
  label: string;
  shortLabel: string;
  count: number;
};

type ApplicationTrendLabel = {
  dateKey: string;
  label: string;
};

type ApplicationAnalytics = {
  totalApplications: number;
  lastSevenDaysTotal: number;
  latestDayCount: number;
  previousDayCount: number;
  trendDelta: number;
  trendDirection: 'increasing' | 'decreasing' | 'flat';
  trendLabel: string;
  maxDailyCount: number;
  points: ApplicationTrendPoint[];
  axisLabels: ApplicationTrendLabel[];
};

type RediscoveryScoreMetric = {
  label: string;
  value: number;
  tone: 'skill' | 'semantic' | 'history' | 'role' | 'fit';
  description: string;
};

type ApplicantRankingScoreMetric = {
  label: string;
  value: number;
  tone: 'skill' | 'semantic' | 'fit' | 'history' | 'evidence' | 'recency';
  description: string;
};

type InterviewerGroup = {
  departmentName: string;
  options: InterviewerOption[];
};

type RecommendedHod = {
  id: string;
  name: string;
  departmentName?: string | null;
  description?: string | null;
};

type ScheduleInterviewForm = {
  jobApplicationId: string;
  jobPostInterviewRoundId: string;
  startsAtLocal: string;
  locationText: string;
};

type ScheduleEligibility = {
  status: 'eligible' | 'blocked' | 'complete';
  actionLabel: string;
  message: string;
  round?: JobPostInterviewRound;
  blockingRound?: JobPostInterviewRound;
};

type InterviewTimelineEntry = {
  key: string;
  roundName: string;
  status: string;
  startsAt?: string | null;
  interview?: RecruiterApplicationInterview;
  isUnscheduled: boolean;
};

@Component({
  selector: 'app-recruiter-sourcing',
  imports: [CommonModule, FormsModule, RouterLink, RagAssistantPanelComponent],
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
            [class.active]="activeTab() === 'headhunting'"
            [attr.aria-selected]="activeTab() === 'headhunting'"
            (click)="setTab('headhunting')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">travel_explore</span>
            AI Headhunting
            @if (onlineHeadhuntingLeadCount() > 0) {
              <strong>{{ onlineHeadhuntingLeadCount() }}</strong>
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
            [class.active]="activeTab() === 'analytics'"
            [attr.aria-selected]="activeTab() === 'analytics'"
            (click)="setTab('analytics')"
          >
            <span class="material-symbols-outlined" aria-hidden="true">monitoring</span>
            Job Analytics
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

        @if (isReadOnlySourcing()) {
          <p class="field-status warning">
            This recruiter sourcing work has moved forward and is available in read-only mode.
          </p>
        }
        @if (isCurrentJobPostClosed()) {
          <p class="field-status warning">
            This job post is closed and archived. Candidates cannot apply, recruiters cannot add sourced candidates, and pipeline actions are read-only.
          </p>
        }

        <section class="recruiter-sourcing-layout">
          <div class="ops-main-stack">
            @if (activeTab() === 'review') {
              <article id="rag-source-request-review" class="ops-panel request-summary-panel">
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
              <article id="rag-source-applications" class="ops-panel applications-panel">
                <div class="panel-header">
                  <div>
                    <h2>
                      Applications
                      <span class="status-badge info">{{ data.applications.length }} application(s)</span>
                    </h2>
                    <p class="muted">Review portal and manually sourced applications linked to this job post, then schedule candidate interview tasks.</p>
                  </div>
                  <div class="panel-actions applications-actions" aria-label="Application actions">
                    @if (data.jobPost) {
                      <button
                        class="btn secondary compact"
                        type="button"
                        [disabled]="!canAddManualCandidate()"
                        [attr.title]="manualCandidateDisabledReason()"
                        (click)="openManualCandidateModal()"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
                        Add sourced candidate
                      </button>
                    }
                    <button class="btn secondary compact ai-action" type="button" [disabled]="!canRankApplicants() || applicantRanking()" (click)="rankApplicants()">
                      <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                      {{ applicantRanking() ? 'Ranking...' : 'Rank Applicants' }}
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
                  <div class="empty-state applications-empty-state">
                    <strong>No applications yet</strong>
                    <p>Published portal applicants and manually sourced candidates will appear here.</p>
                  </div>
                } @else {
                  <div class="manual-candidate-list" role="table" aria-label="Recruiter candidate applications">
                    <div class="manual-candidate-header" role="row">
                      <span>Candidate</span>
                      <span>Source</span>
                      <span>Status / AI Match</span>
                      <span>Interviews</span>
                      <span>Actions</span>
                    </div>
                    @for (application of rankedApplications(data); track application.jobApplicationId) {
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
                        <div data-label="Status / AI Match">
                          <span [class]="applicationStatusBadgeClass(application.applicationStatus)">{{ application.applicationStatus }}</span>
                          @if (applicantRankingFor(application); as ranking) {
                            <section [class]="'applicant-ai-match-card ' + applicantAiTone(ranking)" aria-label="Applicant AI ranking">
                              <div class="applicant-ai-match-topline">
                                <span>AI match</span>
                                <strong>{{ applicantAiScore(ranking) }}%</strong>
                              </div>
                              <span class="applicant-score-meter" aria-hidden="true">
                                <span [style.width.%]="applicantAiScore(ranking)"></span>
                              </span>
                              <div class="applicant-ai-meta-row">
                                <span class="fit-pill">{{ applicantAiLabel(ranking) }}</span>
                                <span class="applicant-rank-pill">Ranked #{{ ranking.rank }} of {{ data.applications.length }}</span>
                              </div>
                            </section>
                            <div class="applicant-confidence-row">
                              <span>AI confidence</span>
                              <strong>{{ ranking.confidence || 'Not reported' }}</strong>
                            </div>
                            <small>{{ summarizeApplicantGaps(ranking) || 'No major gaps flagged by AI' }}</small>
                            <button class="table-link-button" type="button" (click)="toggleApplicantRankingDetails(application.jobApplicationId)">
                              {{ expandedApplicantRankingId() === application.jobApplicationId ? 'Hide rationale' : 'Show rationale' }}
                            </button>
                          } @else {
                            <small>No AI ranking yet</small>
                          }
                        </div>
                        <div class="interview-timeline-cell" data-label="Interviews">
                          @if (interviewTimelineEntries(application); as timelineEntries) {
                            <div class="interview-progress-row">
                              <span class="interview-progress-pill">{{ application.interviewPassSummary }}</span>
                              @if (interviewTimelineSummary(application); as timelineSummary) {
                                <small>{{ timelineSummary }}</small>
                              }
                            </div>
                            @if (timelineEntries.length === 0) {
                              <small class="interview-empty-note">No scheduled interviews yet</small>
                            } @else {
                              <ol class="interview-timeline-list" [attr.aria-label]="'Interview timeline for ' + application.candidateName">
                                @for (entry of timelineEntries.slice(0, 3); track entry.key) {
                                  <li [class]="interviewTimelineItemClass(entry)">
                                    <span class="interview-status-dot" aria-hidden="true"></span>
                                    <div class="interview-timeline-content">
                                      <div class="interview-timeline-title-row">
                                        <strong class="interview-round-name">{{ entry.roundName }}</strong>
                                        <span [class]="interviewStatusChipClass(entry.status)">{{ entry.status }}</span>
                                      </div>
                                      <small class="interview-timeline-meta">
                                        {{ entry.startsAt ? formatInterviewSchedule(entry.startsAt) : 'Waiting to be scheduled' }}
                                      </small>
                                      @if (entry.interview) {
                                        @if (interviewFeedbackActionLabel(entry.interview); as feedbackActionLabel) {
                                          <a
                                            class="table-link-button inline-feedback-link timeline-feedback-link"
                                            routerLink="/app/interview-feedback"
                                            [queryParams]="{ interviewId: entry.interview.interviewId, returnUrl: currentReturnUrl() }"
                                          >
                                            {{ feedbackActionLabel }}
                                          </a>
                                        }
                                      }
                                    </div>
                                  </li>
                                }
                              </ol>
                              @if (timelineEntries.length > 3) {
                                <small class="interview-overflow-note">+{{ timelineEntries.length - 3 }} more round{{ timelineEntries.length - 3 === 1 ? '' : 's' }}</small>
                              }
                            }
                          }
                        </div>
                        <div class="candidate-action-menu application-action-menu" data-label="Actions">
                          <button
                            class="icon-button action-menu-trigger"
                            type="button"
                            [attr.aria-expanded]="openApplicationActionMenuId() === application.jobApplicationId"
                            [attr.aria-label]="'Open actions for ' + application.candidateName"
                            (click)="toggleApplicationActionMenu(application.jobApplicationId)"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">more_vert</span>
                          </button>
                          @if (openApplicationActionMenuId() === application.jobApplicationId) {
                            <div class="action-dropdown" role="menu">
                              @if (canShortlistApplication(application)) {
                                <button
                                  role="menuitem"
                                  type="button"
                                  [disabled]="!canManageApplications() || saving()"
                                  (click)="closeApplicationActionMenu(); updateApplicationStatus(application, 'Shortlist')"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">playlist_add_check</span>
                                  Shortlist
                                </button>
                              }
                              <button
                                role="menuitem"
                                type="button"
                                [disabled]="!canManageApplications() || saving() || scheduleEligibility(application).status !== 'eligible'"
                                [attr.title]="scheduleEligibility(application).message"
                                (click)="closeApplicationActionMenu(); openScheduleModal(application)"
                              >
                                <span class="material-symbols-outlined" aria-hidden="true">event</span>
                                {{ scheduleEligibility(application).actionLabel }}
                              </button>
                              @if (canForwardToHiringManager(application)) {
                                <button
                                  role="menuitem"
                                  type="button"
                                  [disabled]="!canManageApplications() || saving()"
                                  (click)="closeApplicationActionMenu(); forwardToHiringManager(application)"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">send</span>
                                  Forward to Hiring Manager
                                </button>
                              }
                              @if (trackedInvitationLink(application); as inviteLink) {
                                <button
                                  role="menuitem"
                                  type="button"
                                  (click)="closeApplicationActionMenu(); openInvitationLinkModal(application)"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">link</span>
                                  View invite link
                                </button>
                              }
                              <button
                                role="menuitem"
                                type="button"
                                [disabled]="!canManageApplications() || saving()"
                                (click)="closeApplicationActionMenu(); updateApplicationStatus(application, 'Hold')"
                              >
                                <span class="material-symbols-outlined" aria-hidden="true">pause_circle</span>
                                Hold
                              </button>
                              <button
                                role="menuitem"
                                type="button"
                                class="danger-menu-item"
                                [disabled]="!canManageApplications() || saving()"
                                (click)="closeApplicationActionMenu(); updateApplicationStatus(application, 'Reject')"
                              >
                                <span class="material-symbols-outlined" aria-hidden="true">block</span>
                                Reject
                              </button>
                              <a
                                role="menuitem"
                                [routerLink]="candidateProfileLink(application.candidateId)"
                                [queryParams]="{ returnUrl: currentReturnUrl() }"
                                (click)="closeApplicationActionMenu()"
                              >
                                <span class="material-symbols-outlined" aria-hidden="true">badge</span>
                                View profile
                              </a>
                            </div>
                          }
                        </div>
                        @if (expandedApplicantRankingId() === application.jobApplicationId && applicantRankingFor(application); as ranking) {
                          <section class="rationale-details-card applicant-ranking-details">
                            <div class="applicant-ranking-summary">
                              <h3>Applicant Ranking rationale</h3>
                              <p>{{ ranking.explanation }}</p>
                              @if (applicantRankingScoreBreakdown(ranking).length > 0) {
                                <div class="applicant-score-breakdown" aria-label="Applicant ranking score breakdown">
                                  @for (metric of applicantRankingScoreBreakdown(ranking); track metric.label) {
                                    <div class="applicant-score-metric" [attr.title]="metric.description">
                                      <div class="applicant-score-label">
                                        <span>{{ metric.label }}</span>
                                        <span
                                          class="material-symbols-outlined score-help-icon"
                                          [attr.title]="metric.description"
                                          aria-hidden="true"
                                        >
                                          help
                                        </span>
                                      </div>
                                      <span
                                        class="applicant-score-track"
                                        role="meter"
                                        [attr.aria-label]="metric.label + ': ' + metric.value + '%. ' + metric.description"
                                        [attr.aria-valuenow]="metric.value"
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                      >
                                        <span
                                          class="applicant-score-fill"
                                          [class.skill]="metric.tone === 'skill'"
                                          [class.semantic]="metric.tone === 'semantic'"
                                          [class.fit]="metric.tone === 'fit'"
                                          [class.history]="metric.tone === 'history'"
                                          [class.evidence]="metric.tone === 'evidence'"
                                          [class.recency]="metric.tone === 'recency'"
                                          [style.width.%]="metric.value"
                                        ></span>
                                        <strong class="applicant-score-track-value">{{ metric.value }}%</strong>
                                      </span>
                                    </div>
                                  }
                                </div>
                              }
                            </div>
                            <div>
                              <h4>Why this applicant fits</h4>
                              <ul>
                                @for (strength of applicantRationaleStrengths(application, ranking); track strength) {
                                  <li>{{ strength }}</li>
                                }
                              </ul>
                            </div>
                            <div>
                              <h4>Skills and gaps</h4>
                              <div class="tag-stack">
                                @for (skill of applicantMatchedSkills(ranking); track skill) {
                                  <span class="skill-chip matched">{{ skill }}</span>
                                }
                              </div>
                              <ul>
                                @for (gap of applicantRationaleGaps(application, ranking); track gap) {
                                  <li>{{ gap }}</li>
                                }
                              </ul>
                            </div>
                            <div>
                              <h4>Application evidence</h4>
                              @if (applicationDocuments(application).length > 0) {
                                <div class="application-document-list">
                                  @for (document of applicationDocuments(application); track document.applicationDocumentId) {
                                    <button
                                      class="application-document-link"
                                      type="button"
                                      (click)="downloadApplicationDocument(document)"
                                    >
                                      <span class="material-symbols-outlined" aria-hidden="true">description</span>
                                      <span>
                                        <strong>{{ document.displayName }}</strong>
                                        <small>{{ applicationDocumentMeta(document) }}</small>
                                      </span>
                                      <span class="material-symbols-outlined download-icon" aria-hidden="true">download</span>
                                    </button>
                                  }
                                </div>
                              }
                              @if (applicantDocumentEvidence(application, ranking).length > 0) {
                                <ul>
                                  @for (evidence of applicantDocumentEvidence(application, ranking); track evidence) {
                                    <li>{{ evidence }}</li>
                                  }
                                </ul>
                              }
                            </div>
                            <div>
                              <h4>Interview and history signal</h4>
                              <ul>
                                @for (evidence of applicantHistoryEvidence(application, ranking); track evidence) {
                                  <li>{{ evidence }}</li>
                                }
                              </ul>
                              <small>{{ applicantSemanticNote(ranking) }}</small>
                            </div>
                          </section>
                        }
                      </article>
                    }
                  </div>
                }
              </article>
            }

            @if (activeTab() === 'analytics') {
              @if (applicationAnalytics(); as analytics) {
                <article id="rag-source-job-analytics" class="ops-panel job-analytics-panel">
                  <div class="panel-header">
                    <div>
                      <h2>Job Analytics</h2>
                      <p class="muted">Candidate application activity for this job post.</p>
                    </div>
                    <span class="status-badge info">{{ analytics.totalApplications }} applicant(s)</span>
                  </div>

                  <dl class="analytics-metric-grid">
                    <div>
                      <dt>Total applicants</dt>
                      <dd>{{ analytics.totalApplications }}</dd>
                      <small>All applications</small>
                    </div>
                    <div>
                      <dt>Last 7 days</dt>
                      <dd>{{ analytics.lastSevenDaysTotal }}</dd>
                      <small>Recent applications</small>
                    </div>
                    <div>
                      <dt>Latest day</dt>
                      <dd>{{ analytics.latestDayCount }}</dd>
                      <small>{{ dailyApplicationsLabel(analytics.latestDayCount) }}</small>
                    </div>
                    <div [class]="'trend-metric ' + analytics.trendDirection">
                      <dt>Daily trend</dt>
                      <dd>{{ analytics.trendLabel }}</dd>
                      <small>{{ trendDeltaLabel(analytics) }}</small>
                    </div>
                  </dl>

                  @if (analytics.totalApplications === 0) {
                    <div class="empty-state analytics-empty-state">
                      <strong>No application activity yet</strong>
                      <p>Daily applicant counts will appear after candidates apply or are manually sourced.</p>
                    </div>
                  } @else {
                    <section class="application-chart-section" aria-labelledby="application-chart-title">
                      <div class="analytics-section-header">
                        <div>
                          <h3 id="application-chart-title">Daily applications</h3>
                          <p class="muted">{{ applicationTrendSummary(analytics) }}</p>
                        </div>
                        <span class="status-badge subtle">Peak {{ analytics.maxDailyCount }}</span>
                      </div>
                      <div class="application-chart-frame">
                        <div class="application-chart-canvas-wrap">
                          <canvas
                            #applicationTrendCanvas
                            class="application-trend-chart"
                            role="img"
                            [attr.aria-label]="applicationTrendAriaLabel(analytics)"
                          >
                            {{ applicationTrendAriaLabel(analytics) }}
                          </canvas>
                        </div>
                      </div>
                    </section>
                  }
                </article>
              }
            }

            @if (activeTab() === 'rediscovery') {
              <article id="rag-source-talent-rediscovery" class="ops-panel talent-rediscovery-panel">
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

                <section class="manual-candidate-search candidate-pool-panel">
                  <div class="candidate-pool-filters">
                    <label class="stitch-field compact candidate-search-field">
                      <span>Search candidates</span>
                      <div class="candidate-search-input">
                        <span class="material-symbols-outlined" aria-hidden="true">search</span>
                        <input
                          name="manualCandidateSearch"
                          type="search"
                          placeholder="Name, role, or keyword..."
                          [(ngModel)]="manualSearchText"
                          (ngModelChange)="resetManualCandidatePage()"
                        />
                      </div>
                    </label>
                    <label class="stitch-field compact">
                      <span>Expertise</span>
                      <select name="manualSkillFilter" [(ngModel)]="manualSkillFilter" (ngModelChange)="resetManualCandidatePage()">
                        <option value="">All skills</option>
                        @for (skill of manualSkillOptions(data); track skill) {
                          <option [ngValue]="skill">{{ skill }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Status</span>
                      <select name="manualStatusFilter" [(ngModel)]="manualStatusFilter" (ngModelChange)="resetManualCandidatePage()">
                        <option value="All">Active leads</option>
                        @for (status of manualCandidateStatusOptions(); track status) {
                          <option [ngValue]="status">{{ status }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Min AI score</span>
                      <select name="manualMinAiScore" [(ngModel)]="manualMinAiScore" (ngModelChange)="resetManualCandidatePage()">
                        <option value="">Any score</option>
                        <option value="70">70%+</option>
                        <option value="80">80%+</option>
                        <option value="90">90%+</option>
                      </select>
                    </label>
                    <div class="candidate-filter-actions">
                      <button class="table-link-button clear-filter-action" type="button" (click)="clearManualFilters()">Clear filters</button>
                    </div>
                  </div>

                  @if (filteredManualCandidates().length === 0) {
                    <div class="empty-state compact">
                      <strong>No candidates match these filters</strong>
                      <p>Try a broader skill, status, or score filter.</p>
                    </div>
                  } @else {
                    <div class="candidate-pool-table" role="table" aria-label="Candidate rediscovery results">
                      <div class="candidate-pool-header" role="row">
                        <span>Candidate</span>
                        <span>AI Match</span>
                        <span>AI Reasoning</span>
                        <span>Key Skills</span>
                        <span>Last Activity</span>
                        <span>Status</span>
                        <span>Actions</span>
                      </div>
                      @for (candidate of pagedManualCandidates(); track candidate.candidateId) {
                        <article class="candidate-pool-row" role="row">
                          <div class="candidate-pool-identity" data-label="Candidate">
                            <span class="candidate-avatar">{{ candidateInitials(candidate.displayName) }}</span>
                            <div>
                              <strong>{{ candidate.displayName }}</strong>
                              <small>{{ candidate.currentDesignation || 'Designation not recorded' }}</small>
                              <small>{{ formatExperience(candidate.experienceYears) }} exp.</small>
                            </div>
                          </div>
                          <div [class]="'candidate-score-cell ' + candidateScoreTone(candidate)" data-label="AI Match">
                            <strong>{{ candidateAiScore(candidate) }}%</strong>
                            <span class="candidate-score-meter" aria-hidden="true">
                              <span [style.width.%]="candidateAiScore(candidate)"></span>
                            </span>
                            <small>{{ candidateAiLabel(candidate) }}</small>
                          </div>
                          <div class="candidate-reason-cell" data-label="AI Reasoning">
                            <p>{{ candidateReasonSummary(candidate) }}</p>
                            <small>{{ candidateReasonCaveat(candidate) }}</small>
                          </div>
                          <div class="candidate-skills-cell" data-label="Key Skills">
                            <div class="tag-stack compact-tags">
                              @for (skill of candidateKeySkills(candidate); track skill) {
                                <span class="skill-chip" [class.matched]="candidate.matchedSkills.includes(skill)">{{ skill }}</span>
                              }
                            </div>
                          </div>
                          <div class="candidate-activity-cell" data-label="Last Activity">
                            <div class="candidate-activity-block">
                              <div class="activity-status-line">
                                <span [class]="candidateActivityStatusClass(candidate)">
                                  {{ candidateActivityStatusLabel(candidate) }}
                                </span>
                                <span class="activity-time">{{ candidateActivityTime(candidate) }}</span>
                              </div>
                              <strong class="activity-title">{{ candidateActivityTitle(candidate) }}</strong>
                              <small class="activity-source">{{ candidateActivitySource(candidate) }}</small>
                            </div>
                          </div>
                          <div class="candidate-status-cell" data-label="Status">
                            <span class="candidate-status-chip" [class.active]="candidate.status === 'Active'" [class.benched]="candidate.status === 'Benched'">
                              {{ candidate.status }}
                            </span>
                          </div>
                          <div class="candidate-action-menu compact-actions" data-label="Actions">
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
                                    View history
                                  </a>
                                }
                                @if (rediscoveryMatchForCandidate(candidate); as match) {
                                  <button
                                    role="menuitem"
                                    type="button"
                                    (click)="toggleDetails(match.candidateId); closeManualCandidateMenu()"
                                  >
                                    <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                                    {{ expandedCandidateId() === match.candidateId ? 'Hide AI rationale' : 'Review AI rationale' }}
                                  </button>
                                }
                              </div>
                            }
                          </div>
                        </article>
                        @if (rediscoveryMatchForCandidate(candidate); as match) {
                          @if (expandedCandidateId() === match.candidateId) {
                            <article class="candidate-rationale-panel">
                              <div>
                                <h3>AI reasoning</h3>
                                @if (rediscoveryScoreBreakdown(match).length > 0) {
                                  <div class="rediscovery-score-breakdown" aria-label="Talent Rediscovery score breakdown">
                                    <strong class="rediscovery-score-heading">Score breakdown</strong>
                                    @for (metric of rediscoveryScoreBreakdown(match); track metric.label) {
                                      <div class="rediscovery-score-metric" [attr.title]="metric.description">
                                        <div class="rediscovery-score-label">
                                          <span>{{ metric.label }}</span>
                                          <span
                                            class="material-symbols-outlined score-help-icon"
                                            aria-hidden="true"
                                          >
                                            help
                                          </span>
                                          <strong>{{ metric.value }}%</strong>
                                        </div>
                                        <span
                                          class="rediscovery-score-track"
                                          role="meter"
                                          [attr.aria-label]="metric.label + ': ' + metric.value + '%. ' + metric.description"
                                          [attr.aria-valuenow]="metric.value"
                                          aria-valuemin="0"
                                          aria-valuemax="100"
                                        >
                                          <span
                                            class="rediscovery-score-fill"
                                            [class.skill]="metric.tone === 'skill'"
                                            [class.semantic]="metric.tone === 'semantic'"
                                            [class.history]="metric.tone === 'history'"
                                            [class.role]="metric.tone === 'role'"
                                            [class.fit]="metric.tone === 'fit'"
                                            [style.width.%]="metric.value"
                                          ></span>
                                        </span>
                                      </div>
                                    }
                                  </div>
                                }
                                <p>{{ match.explanation }}</p>
                              </div>
                              <section>
                                <h4>Strengths</h4>
                                <ul>
                                  @for (strength of match.strengths.slice(0, 4); track strength) {
                                    <li>{{ strength }}</li>
                                  }
                                </ul>
                              </section>
                              <section>
                                <h4>Application evidence</h4>
                                <div class="application-history-cards">
                                  @for (application of match.applicationEvidence.slice(0, 2); track application.jobApplicationId) {
                                    <article class="application-history-card compact">
                                      <strong>{{ displayApplicationTitle(application) }}</strong>
                                      <span>{{ application.requestCode }} - {{ application.status }}</span>
                                      <span>Interviews: {{ formatPassSummary(application) }}</span>
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
                            </article>
                          }
                        }
                      }
                      <footer class="candidate-pool-footer">
                        <span>
                          Showing {{ manualCandidateShowingStart() }} - {{ manualCandidateShowingEnd() }}
                          of {{ filteredManualCandidates().length }} candidates
                        </span>
                        <div class="candidate-pagination" aria-label="Candidate result pages">
                          <button
                            type="button"
                            [disabled]="!canGoToPreviousManualCandidatePage()"
                            (click)="goToManualCandidatePage(currentManualCandidatePage() - 1)"
                          >
                            Previous
                          </button>
                          @for (pageNumber of manualCandidatePageNumbers(); track pageNumber) {
                            <button
                              type="button"
                              [class.active]="pageNumber === currentManualCandidatePage()"
                              [attr.aria-current]="pageNumber === currentManualCandidatePage() ? 'page' : null"
                              (click)="goToManualCandidatePage(pageNumber)"
                            >
                              {{ pageNumber }}
                            </button>
                          }
                          <button
                            type="button"
                            [disabled]="!canGoToNextManualCandidatePage()"
                            (click)="goToManualCandidatePage(currentManualCandidatePage() + 1)"
                          >
                            Next
                          </button>
                        </div>
                      </footer>
                    </div>
                  }
                </section>
              </article>
            }

            @if (activeTab() === 'headhunting') {
              <article id="rag-source-ai-headhunting" class="ops-panel online-headhunting-panel">
                <div class="panel-header">
                  <div>
                    <h2>AI Headhunting</h2>
                    <p class="muted">Lead-only online discovery. Recruiter review is required before any invitation or pipeline action.</p>
                  </div>
                  <div class="panel-actions">
                    <button class="btn primary compact ai-action" type="button" [disabled]="!canRunOnlineHeadhunting() || onlineHeadhuntingSearching() || onlineHeadhuntingQueued()" (click)="runOnlineHeadhunting()">
                      <span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>
                      {{ onlineRunButtonLabel() }}
                    </button>
                    <button class="btn secondary compact" type="button" [disabled]="!canSearchMoreOnlineLeads() || onlineHeadhuntingSearching() || onlineHeadhuntingQueued()" (click)="searchMoreOnlineLeads()">
                      <span class="material-symbols-outlined" aria-hidden="true">search</span>
                      Search More
                    </button>
                  </div>
                </div>

                <div class="online-agent-strip" aria-label="Online headhunting status">
                  <span class="status-dot"></span>
                  <strong>{{ onlineAgentStatusLabel() }}</strong>
                  <span>Lead limit: 20/run</span>
                  <span>Daily cap: {{ onlineDailyUsageLabel() }}</span>
                  <span>Model: {{ onlineModelLabel() }}</span>
                  <span>Lead-only results</span>
                </div>

                <div class="online-source-filter" aria-label="Online source filters">
                  @for (source of onlineSourceOptions; track source) {
                    <span class="online-source-filter-item">
                      <label>
                        <input
                          type="checkbox"
                          [checked]="onlineSourceSelected(source)"
                          [attr.aria-describedby]="onlineSourceTooltipId(source)"
                          (change)="toggleOnlineSource(source)"
                        />
                        <span>{{ onlineSourceLabel(source) }}</span>
                      </label>
                      <span
                        class="source-filter-help"
                        tabindex="0"
                        [attr.aria-label]="onlineSourceTooltip(source)"
                        [attr.data-tooltip]="onlineSourceTooltip(source)"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </span>
                      <span class="sr-only" [id]="onlineSourceTooltipId(source)">{{ onlineSourceTooltip(source) }}</span>
                    </span>
                  }
                  <select [ngModel]="onlineLeadFilter()" (ngModelChange)="setOnlineLeadFilter($event)" aria-label="Filter online leads">
                    <option value="All">All Leads</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="NeedsEmail">Needs Email</option>
                    <option value="PossibleDuplicates">Possible Duplicates</option>
                  </select>
                </div>

                @if (!data.onlineHeadhunting?.leads?.length) {
                  <div class="empty-state">
                    <strong>No online leads have been discovered for this request yet.</strong>
                    <p>Run the agent to search approved online sources. Results stay as leads until a recruiter converts them.</p>
                  </div>
                } @else {
                  <section class="online-headhunting-layout">
                    <div class="online-lead-table" role="table" aria-label="AI headhunting online leads">
                      <div class="online-lead-row table-head" role="row">
                        <span>Candidate</span>
                        <span>Title & Location</span>
                        <span>Match</span>
                        <span>Source</span>
                        <span>Key Skills</span>
                        <span>Duplicate</span>
                        <span>Status</span>
                      </div>
                      @for (lead of filteredOnlineLeads(); track lead.onlineCandidateLeadId) {
                        <button
                          type="button"
                          class="online-lead-row"
                          role="row"
                          [class.active]="lead.onlineCandidateLeadId === selectedOnlineLeadId()"
                          [attr.aria-label]="'View details for ' + (lead.displayName || lead.sourceDisplayName || 'online lead')"
                          (click)="selectOnlineLead(lead)"
                        >
                          <span class="candidate-cell" role="cell">
                            <span class="avatar">{{ initials(lead.displayName || lead.sourceDisplayName) }}</span>
                            <span>
                              <strong>{{ lead.displayName || 'Unverified lead' }}</strong>
                              <small>{{ onlineLeadContactLabel(lead) }}</small>
                            </span>
                          </span>
                          <span role="cell">
                            <strong>{{ lead.currentTitle || 'Title not verified' }}</strong>
                            <small>{{ lead.locationText || 'Location unknown' }}</small>
                          </span>
                          <span role="cell">
                            <strong>{{ lead.matchScore | number: '1.0-0' }}%</strong>
                            <span class="score-bar"><span [style.width.%]="lead.matchScore"></span></span>
                          </span>
                          <span role="cell">
                            <span class="source-chip" [attr.title]="lead.sourceDisplayName || onlineSourceLabel(lead.sourceCode)">
                              {{ onlineLeadSourceChipLabel(lead) }}
                            </span>
                          </span>
                          <span role="cell" class="chip-list">
                            @for (skill of lead.matchedSkills.slice(0, 3); track skill) {
                              <span class="skill-chip">{{ skill }}</span>
                            }
                            @if (!lead.matchedSkills.length) {
                              <span class="muted">Snippet only</span>
                            }
                          </span>
                          <span role="cell">
                            <span [class]="onlineDuplicateClass(lead)">{{ onlineDuplicateLabel(lead) }}</span>
                          </span>
                          <span role="cell">
                            <span [class]="onlineLeadStatusClass(lead)">{{ onlineLeadStatusLabel(lead) }}</span>
                          </span>
                        </button>
                      }
                    </div>
                  </section>
                }
              </article>

              @if (onlineLeadDetailOpen()) {
                @if (selectedOnlineLead(); as lead) {
                  <div class="sourcing-modal-backdrop" role="presentation">
                    <section class="sourcing-modal-panel online-lead-modal" role="dialog" aria-modal="true" aria-labelledby="onlineLeadDetailTitle">
                      <header class="panel-header online-lead-modal-header">
                        <div class="drawer-header">
                          <div class="avatar large">{{ initials(lead.displayName || lead.sourceDisplayName) }}</div>
                          <div>
                            <p class="eyebrow">Online lead detail</p>
                            <h2 id="onlineLeadDetailTitle">{{ lead.displayName || 'Unverified lead' }}</h2>
                            <p class="muted">{{ lead.currentTitle || 'Title not verified' }} {{ lead.currentCompany ? 'at ' + lead.currentCompany : '' }}</p>
                            <div class="badge-row">
                              <span class="status-badge info">Unverified Lead</span>
                              <span class="status-badge">AI Inferred</span>
                              @if (lead.duplicateStatus !== 'NoMatch') {
                                <span class="status-badge warning">{{ onlineDuplicateLabel(lead) }}</span>
                              }
                            </div>
                          </div>
                        </div>
                        <button class="icon-button" type="button" aria-label="Close lead details" (click)="closeOnlineLeadModal()">
                          <span class="material-symbols-outlined" aria-hidden="true">close</span>
                        </button>
                      </header>

                      <div class="online-lead-modal-grid">
                        <section class="online-lead-modal-section online-lead-modal-wide">
                          <h4>Source Evidence</h4>
                          <p>{{ lead.evidenceSnippet }}</p>
                          <a class="table-link-button" [href]="lead.sourceUrl" target="_blank" rel="noopener">View source</a>
                        </section>

                        <section class="online-lead-modal-section">
                          <h4>AI Match Explanation</h4>
                          <p>{{ lead.fitSummary }}</p>
                          <div class="chip-list">
                            @for (strength of lead.strengths.slice(0, 4); track strength) {
                              <span class="skill-chip">{{ strength }}</span>
                            }
                          </div>
                        </section>

                        <section class="online-lead-modal-section">
                          <h4>Duplicate Check</h4>
                          <p>{{ lead.duplicateExplanation || onlineDuplicateLabel(lead) }}</p>
                          @if (lead.duplicateCandidateId) {
                            <a class="table-link-button" [routerLink]="candidateProfileLink(lead.duplicateCandidateId)" [queryParams]="{ returnUrl: currentReturnUrl() }">
                              Open internal candidate
                            </a>
                          }
                        </section>

                        <section class="online-lead-modal-section online-lead-modal-wide">
                          <h4>Outreach Draft</h4>
                          <p class="outreach-draft">{{ lead.outreachDraft }}</p>
                          @if (!lead.email) {
                            <p class="field-status warning">Email required before Talent Pilot can send an invite.</p>
                          }
                        </section>
                      </div>

                      <div class="drawer-actions">
                        <button
                          class="btn primary compact drawer-primary-action lead-action-tooltip"
                          type="button"
                          [attr.title]="onlineLeadActionTooltip('addToPipeline', lead)"
                          [attr.data-tooltip]="onlineLeadActionTooltip('addToPipeline', lead)"
                          (click)="openManualCandidateModalFromLead(lead)"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">playlist_add_check</span>
                          Add to Pipeline
                        </button>
                        <div class="drawer-action-grid" aria-label="Online lead actions">
                          <a
                            class="btn secondary compact lead-action-tooltip"
                            [href]="lead.sourceUrl"
                            target="_blank"
                            rel="noopener"
                            [attr.title]="onlineLeadActionTooltip('viewSource', lead)"
                            [attr.data-tooltip]="onlineLeadActionTooltip('viewSource', lead)"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                            View Source
                          </a>
                          <button
                            class="btn secondary compact lead-action-tooltip"
                            type="button"
                            [attr.title]="onlineLeadActionTooltip('saveProspect', lead)"
                            [attr.data-tooltip]="onlineLeadActionTooltip('saveProspect', lead)"
                            (click)="saveOnlineLead(lead)"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">bookmark_add</span>
                            Save Prospect
                          </button>
                          <button
                            class="btn danger compact lead-action-tooltip"
                            type="button"
                            [attr.title]="onlineLeadActionTooltip('rejectLead', lead)"
                            [attr.data-tooltip]="onlineLeadActionTooltip('rejectLead', lead)"
                            (click)="rejectOnlineLead(lead)"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">block</span>
                            Reject Lead
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                }
              }
            }

            @if (activeTab() === 'post') {
              <form id="rag-source-job-post" class="ops-panel job-post-editor" (ngSubmit)="saveDraft()">
              <div class="panel-header">
                <div>
                  <h2>{{ data.jobPost ? 'Job Post Editor' : 'Create Draft Job Post' }}</h2>
                  <p class="muted">
                    @if (isJobPostClosed(data.jobPost)) {
                      This post is archived. It is hidden from the portal and no new candidates can be added.
                    } @else {
                      Published posts appear on the Talent Pilot portal. Recruiters can also add sourced candidates manually.
                    }
                  </p>
                </div>
                <div class="post-header-actions">
                  @if (data.jobPost) {
                    <span [class]="jobPostStatusBadgeClass(data.jobPost.status)">{{ data.jobPost.status }}</span>
                  }
                </div>
              </div>

              @if (isJobPostClosed(data.jobPost)) {
                <p class="field-status warning">
                  Closed posts are archived for audit history. Public applications, manual sourcing, AI headhunting conversion, interview scheduling, and pipeline moves are disabled.
                </p>
              }

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

              <div class="modal-form-grid compact job-post-core-grid">
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

                <div class="round-editor-list" [class.has-rounds]="form.interviewRounds.length > 0" aria-label="Interview rounds">
                  @if (form.interviewRounds.length === 0) {
                    <p class="empty-inline-state">No interview rounds have been added.</p>
                  } @else {
                    @for (round of form.interviewRounds; track round.roundOrder; let index = $index) {
                    <article class="round-editor-row" [class.inactive]="round.status === 'Inactive'">
                      <div class="round-timeline-marker" aria-hidden="true">
                        <span>{{ index + 1 }}</span>
                      </div>
                      <div class="round-timeline-card">
                        <div class="round-sequence-label">
                          <span>Step {{ index + 1 }}</span>
                          @if (index === 0) {
                            <small>First interview</small>
                          } @else {
                            <small>After step {{ index }}</small>
                          }
                        </div>
                        <div class="round-card-top">
                          <div class="round-editor-main">
                            <label class="stitch-field compact round-name-field">
                              <span>Round {{ index + 1 }}</span>
                              <div class="round-name-input-wrap">
                                <input name="roundName{{ index }}" [(ngModel)]="round.name" [disabled]="!canEditContent()" />
                              </div>
                            </label>
                          </div>

                          <div class="round-controls">
                            <label class="stitch-field compact round-minutes-field">
                              <span>Minutes</span>
                              <input name="duration{{ index }}" type="number" min="15" max="240" [(ngModel)]="round.durationMinutes" [disabled]="!canEditContent()" />
                            </label>

                            <label class="stitch-field compact round-status-field">
                              <span>Status</span>
                              <select name="status{{ index }}" [(ngModel)]="round.status" [disabled]="!canEditContent()">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        <div class="round-interviewer-cell">
                          <div class="round-field-heading">
                            <span>Interviewer</span>
                            <small>{{ visibleInterviewerCountForRound(round, index) }} available</small>
                          </div>

                          <div class="selected-interviewer-summary" [class.unassigned]="!round.ownerUserId">
                            <span class="interviewer-avatar" aria-hidden="true">{{ selectedInterviewerInitials(round) }}</span>
                            <div>
                              <strong>{{ selectedInterviewerName(round) }}</strong>
                              <small>{{ selectedInterviewerMeta(round) }}</small>
                            </div>
                          </div>

                          <div class="interviewer-filter-row">
                            <label class="stitch-field compact interviewer-department-field">
                              <span>Department</span>
                              <select
                                name="interviewerDepartment{{ index }}"
                                [ngModel]="roundDepartmentFilter(round, index)"
                                [disabled]="!canEditContent()"
                                (ngModelChange)="setRoundDepartmentFilter(round, index, $event)"
                              >
                                <option value="">All departments</option>
                                @for (department of interviewerDepartments(); track department) {
                                  <option [value]="department">{{ department }}</option>
                                }
                              </select>
                            </label>
                            <label class="stitch-field compact interviewer-search-field">
                              <span>Search</span>
                              <input
                                name="interviewerSearch{{ index }}"
                                type="search"
                                [value]="roundSearch(round, index)"
                                [disabled]="!canEditContent()"
                                (input)="setRoundSearch(round, index, $event)"
                                placeholder="Name, role, email..."
                              />
                            </label>
                          </div>

                          <label class="stitch-field compact interviewer-select-field">
                            <span>Assign interviewer</span>
                            <select
                              name="ownerUser{{ index }}"
                              [ngModel]="round.ownerUserId ?? ''"
                              [disabled]="!canEditContent()"
                              (ngModelChange)="selectRoundInterviewer(index, $event)"
                            >
                              <option value="">Unassigned</option>
                              @for (group of interviewerGroupsForRound(round, index); track group.departmentName) {
                                <optgroup [label]="group.departmentName">
                                  @for (interviewer of group.options; track interviewer.userId) {
                                    <option [value]="interviewer.userId">
                                      {{ interviewer.displayName }} - {{ interviewer.designation || interviewer.email }}
                                    </option>
                                  }
                                </optgroup>
                              }
                            </select>
                          </label>
                          @if (roundInterviewerHelper(round, index); as helper) {
                            <small class="interviewer-helper">{{ helper }}</small>
                          }
                        </div>

                        <div class="round-card-footer">
                          @if (recommendedHodForRound(round, index); as hod) {
                            <div class="hod-recommendation-strip" [class.applied]="round.ownerUserId === hod.id">
                              <span class="material-symbols-outlined" aria-hidden="true">verified_user</span>
                              <div>
                                <span>Recommended HOD</span>
                                <strong>{{ hod.name }}</strong>
                                <small>{{ hodRecommendationReason(hod) }}</small>
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

                          <button type="button" class="round-remove-button" [disabled]="!canEditContent()" (click)="removeRound(index)">
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                    }
                  }
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
                  <button class="btn secondary" type="button" [disabled]="!canCloseJobPost() || saving()" (click)="closePost()">Close Post</button>
                }
              </div>
              </form>
            }
          </div>

          @if (activeTab() === 'applications' && data.applications.length > 0) {
            <app-rag-assistant-panel
              class="recruiter-assistant-floating"
              title="Applications Copilot"
              subtitle="Evidence from the request, job post, all applications, interviews, and ranking logs."
              placeholder="Ask about applicants, fit, gaps, or rankings..."
              contextType="RecruiterCandidateFit"
              [contextEntityId]="data.jobRequest.id"
              [focusEntityId]="null"
              [floatingLauncher]="true"
              launcherLabel="Open applications copilot"
              [suggestedQuestions]="applicationAssistantQuestions"
            />
          }

          @if (data.assignment && canClaimSourcingAssignment(data.assignment)) {
            <section class="sourcing-bottom-cards">
              @if (data.assignment; as assignment) {
                @if (canClaimSourcingAssignment(assignment)) {
                  <article class="ops-panel">
                    <h2>Claim sourcing work</h2>
                    <p class="muted">Claim this recruiter assignment before job post actions.</p>
                    <button type="button" class="btn primary full" (click)="claim(assignment.id)">Claim Sourcing Work</button>
                  </article>
                }
              }
            </section>
          }
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
              </div>

              <section class="post-editor-section">
                <h3>Education</h3>
                <div class="modal-form-grid education-grid">
                  <label class="stitch-field">
                    <span>Institute</span>
                    <input name="manualUniversity" [(ngModel)]="manualCandidateForm.universityName" />
                  </label>
                  <label class="stitch-field">
                    <span>Degree name</span>
                    <input name="manualDegree" [(ngModel)]="manualCandidateForm.degreeName" />
                  </label>
                  <label class="stitch-field">
                    <span>Graduated in</span>
                    <input name="manualGraduation" type="number" min="1970" max="2100" [(ngModel)]="manualCandidateForm.graduationYear" />
                  </label>
                </div>
              </section>

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

      @if (invitationLinkModalApplication(); as application) {
        @if (trackedInvitationLink(application); as inviteLink) {
          <div class="sourcing-modal-backdrop" role="presentation">
            <section class="sourcing-modal-panel compact-modal invite-link-modal" role="dialog" aria-modal="true" aria-labelledby="inviteLinkTitle">
              <header class="panel-header">
                <div>
                  <p class="eyebrow">Candidate invitation</p>
                  <h2 id="inviteLinkTitle">{{ application.candidateName }}</h2>
                  <p class="muted">This is the tracked portal link tied to this candidate invitation.</p>
                </div>
                <button class="icon-button" type="button" aria-label="Close" (click)="closeInvitationLinkModal()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <label class="stitch-field">
                <span>Invitation link</span>
                <textarea rows="3" readonly [value]="inviteLink"></textarea>
              </label>

              @if (invitationLinkCopyMessage()) {
                <p class="field-status success">{{ invitationLinkCopyMessage() }}</p>
              }

              <div class="modal-actions">
                <button class="btn secondary" type="button" (click)="closeInvitationLinkModal()">Close</button>
                <button class="btn secondary" type="button" (click)="openInvitationLink(inviteLink)">
                  <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                  Open link
                </button>
                <button class="btn primary" type="button" (click)="copyInvitationLink(inviteLink)">
                  <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
                  Copy link
                </button>
              </div>
            </section>
          </div>
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
                  <p class="muted">Creates a Google Calendar event and sends invitations to the candidate, hiring manager, and interviewer.</p>
                </div>
                <button class="icon-button" type="button" aria-label="Close" (click)="closeScheduleModal()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              @if (scheduleModalRound(application); as round) {
                <section class="schedule-round-summary" aria-label="Selected interview round">
                  <span class="material-symbols-outlined" aria-hidden="true">event</span>
                  <div>
                    <small>Next interview round</small>
                    <strong>{{ round.roundOrder }}. {{ round.name }}</strong>
                    <span>{{ round.ownerUserName || 'No default interviewer' }}</span>
                  </div>
                </section>
                <p class="muted schedule-sequence-helper">Rounds must be completed in order. Later rounds unlock after prior rounds are completed or skipped.</p>
              }

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Date and time</span>
                  <input name="scheduleStartsAt" type="datetime-local" required [(ngModel)]="scheduleForm.startsAtLocal" />
                </label>
                <label class="stitch-field">
                  <span>Location / notes</span>
                  <input name="scheduleLocation" placeholder="Office room, remote note, or logistical detail" [(ngModel)]="scheduleForm.locationText" />
                </label>
              </div>
              <p class="muted">
                Talent Pilot creates the meeting link from the connected Google Calendar organizer account for the selected time.
              </p>

              @if (scheduleError()) {
                <p class="field-status error">
                  {{ scheduleError() }}
                  @if (isGoogleCalendarScheduleError()) {
                    Connect it in
                    <a class="table-link-button" routerLink="/admin-center/integrations" (click)="closeScheduleModal()">Admin Center &gt; Integrations &gt; Google Calendar</a>.
                    Tenant admin access is required.
                  }
                </p>
              }

              <div class="modal-actions">
                <button class="btn secondary" type="button" (click)="closeScheduleModal()">Cancel</button>
                <button class="btn primary" type="submit" [disabled]="scheduleSaving() || !scheduleModalRound(application)">
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
        align-items: start;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr);
      }

      .sourcing-tabs {
        border-bottom: 1px solid #dbe3ef;
        display: flex;
        flex-wrap: wrap;
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

      .applications-actions .ai-action {
        min-width: 0;
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
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
        grid-template-columns: minmax(0, 1fr);
        max-height: calc(100vh - 72px);
        max-width: 920px;
        min-width: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 24px;
        width: min(920px, calc(100vw - 36px));
      }

      .sourcing-modal-panel > *,
      .sourcing-modal-panel .stitch-field,
      .sourcing-modal-panel .post-editor-section,
      .sourcing-modal-panel .skill-picker-panel,
      .sourcing-modal-panel .selected-skill-strip {
        max-width: 100%;
        min-width: 0;
      }

      .sourcing-modal-panel input,
      .sourcing-modal-panel select,
      .sourcing-modal-panel textarea {
        max-width: 100%;
        min-width: 0;
      }

      .sourcing-modal-panel .skill-group-tabs {
        margin: 6px 0 0;
        max-width: 100%;
        padding: 4px 4px 8px;
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

      .cv-parser-panel > div {
        min-width: 0;
      }

      .cv-parser-panel strong,
      .cv-parser-panel p {
        overflow-wrap: anywhere;
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
        width: min(720px, calc(100vw - 36px));
      }

      .sourcing-modal-panel .modal-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        max-width: 100%;
        min-width: 0;
      }

      .sourcing-modal-panel .modal-form-grid .stitch-field:last-child {
        grid-column: auto;
      }

      .sourcing-modal-panel .education-grid {
        grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(120px, 0.55fr);
      }

      .full-span {
        grid-column: 1 / -1;
      }

      .ai-action {
        min-width: 190px;
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
        grid-template-columns: minmax(180px, 1fr) minmax(170px, 0.85fr) minmax(180px, 0.9fr) minmax(250px, 1.2fr) minmax(76px, 0.35fr);
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

      .action-dropdown a,
      .action-dropdown button {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: var(--text);
        cursor: pointer;
        display: flex;
        font: inherit;
        gap: 8px;
        padding: 9px 10px;
        text-align: left;
        text-decoration: none;
      }

      .action-dropdown a:hover,
      .action-dropdown a:focus-visible,
      .action-dropdown button:hover,
      .action-dropdown button:focus-visible {
        background: #eef6ff;
        color: var(--primary);
        outline: none;
      }

      .action-dropdown button:disabled {
        color: #94a3b8;
        cursor: not-allowed;
        opacity: 0.7;
      }

      .action-dropdown button:disabled:hover {
        background: transparent;
        color: #94a3b8;
      }

      .action-dropdown .danger-menu-item {
        color: #b91c1c;
      }

      .action-dropdown .danger-menu-item .material-symbols-outlined {
        color: #b91c1c;
      }

      .action-dropdown .material-symbols-outlined {
        color: var(--primary);
        font-size: 18px;
      }

      .skill-chip.matched {
        background: #e8f2ff;
        color: #0b66c3;
      }

      .fit-pill {
        background: var(--blue-soft);
        border-radius: 999px;
        color: var(--primary);
        display: inline-block;
        font-size: 12px;
        font-weight: 800;
        margin: 0;
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

        .sourcing-modal-panel .modal-form-grid {
          grid-template-columns: 1fr;
        }

        .post-header-actions {
          justify-content: flex-start;
        }

        .applications-actions {
          justify-content: flex-start;
        }

        .rationale-details-card {
          grid-template-columns: 1fr;
        }

        .manual-candidate-filters {
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

      }

    `,
  ],
})
export class RecruiterSourcingComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('applicationTrendCanvas') private applicationTrendCanvas?: ElementRef<HTMLCanvasElement>;

  readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly fileDownloads = inject(FileDownloadService);
  readonly sourcing = signal<RecruiterSourcing | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rediscoveryRanking = signal(false);
  readonly applicantRanking = signal(false);
  readonly onlineHeadhuntingSearching = signal(false);
  readonly onlineHeadhuntingQueued = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly activeTab = signal<SourcingTab>('review');
  readonly applicationAnalytics = computed(() => this.buildApplicationAnalytics(this.sourcing()?.applications ?? []));
  readonly expandedCandidateId = signal<string | null>(null);
  readonly expandedApplicantRankingId = signal<string | null>(null);
  readonly selectedOnlineLeadId = signal<string | null>(null);
  readonly onlineLeadDetailOpen = signal(false);
  readonly onlineLeadFilter = signal<OnlineLeadFilter>('All');
  readonly openManualCandidateMenuId = signal<string | null>(null);
  readonly openApplicationActionMenuId = signal<string | null>(null);
  readonly manualCandidateModalOpen = signal(false);
  readonly manualCandidateSaving = signal(false);
  readonly manualCandidateError = signal('');
  readonly manualCandidatePage = signal(1);
  readonly cvParsing = signal(false);
  readonly cvParseError = signal('');
  readonly selectedApplication = signal<RecruiterApplication | null>(null);
  readonly invitationLinkModalApplication = signal<RecruiterApplication | null>(null);
  readonly invitationLinkCopyMessage = signal('');
  readonly scheduleModalOpen = signal(false);
  readonly scheduleSaving = signal(false);
  readonly scheduleError = signal('');
  readonly applicationAssistantQuestions = [
    'Which applicant is strongest?',
    'What skills are missing?',
    'Compare the top applicants.',
    'Summarize interview readiness.',
  ];
  selectedTemplateId = '';
  roundInterviewerDepartmentFilters: Record<string, string> = {};
  roundInterviewerSearches: Record<string, string> = {};
  readonly manualCandidatePageSize = 5;
  manualSearchText = '';
  manualSkillFilter = '';
  manualStatusFilter = 'All';
  manualMinAiScore = '';
  manualMinPassedInterviews: number | null = null;
  manualMaxFailedInterviews: number | null = null;
  readonly onlineSourceOptions = ['LinkedIn', 'GitHub', 'Portfolio', 'PublicSearch'];
  onlineSourceCodes: string[] = ['LinkedIn', 'GitHub', 'Portfolio', 'PublicSearch'];
  readonly postSkillSearch = signal('');
  readonly postActiveSkillGroup = signal(DEFAULT_SKILL_GROUP_LABEL);
  readonly manualSkillSearch = signal('');
  readonly manualActiveSkillGroup = signal(DEFAULT_SKILL_GROUP_LABEL);
  manualCandidateForm = this.emptyManualCandidateForm();
  scheduleForm: ScheduleInterviewForm = this.emptyScheduleForm();
  form = this.emptyForm();
  private applicationTrendChart: Chart<'bar', number[], string> | null = null;
  private applicationTrendChartSignature = '';
  private readonly routeEvents = new Subscription();
  private pendingSourceFragment: string | null = null;
  private readonly recruiterSourcingRefreshEffect = effect(() => {
    const refresh = this.store.recruiterSourcingRefresh();
    const jobRequestId = this.route.snapshot.paramMap.get('jobRequestId');
    if (!refresh || !jobRequestId || refresh.jobRequestId !== jobRequestId) {
      return;
    }

    void this.reloadAfterRealtimeRefresh(refresh.reason, refresh.leadCount ?? null);
  });

  ngOnInit(): void {
    this.applyInitialTab();
    if (this.route.fragment) {
      this.routeEvents.add(this.route.fragment.subscribe((fragment) => this.applySourceFragment(fragment)));
    }
    void this.load();
  }

  ngAfterViewChecked(): void {
    this.renderApplicationTrendChart();
    this.scrollToPendingSource();
  }

  ngOnDestroy(): void {
    this.routeEvents.unsubscribe();
    this.destroyApplicationTrendChart();
  }

  @HostListener('document:click', ['$event'])
  closeActionMenusOnOutsideClick(event: MouseEvent): void {
    if (!this.openManualCandidateMenuId() && !this.openApplicationActionMenuId()) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest('.candidate-action-menu')) {
      return;
    }

    this.closeActionMenus();
  }

  @HostListener('document:keydown.escape')
  closeOnlineLeadDetailOnEscape(): void {
    if (this.onlineLeadDetailOpen()) {
      this.closeOnlineLeadModal();
    }
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

    if (!this.canRunRediscovery()) {
      this.error.set(this.applicationManagementDisabledReason());
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

    if (!this.canRankApplicants()) {
      this.error.set(this.applicationManagementDisabledReason());
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

  canRunOnlineHeadhunting(): boolean {
    return this.canUseSourcingAssignment() && !this.isCurrentJobPostClosed() && this.onlineSourceCodes.length > 0;
  }

  canSearchMoreOnlineLeads(): boolean {
    const run = this.sourcing()?.onlineHeadhunting?.run;
    if (!run || !this.canRunOnlineHeadhunting()) {
      return false;
    }

    return run.dailyLeadCountBeforeRun + run.leadsReturned < run.dailyLeadLimit;
  }

  async runOnlineHeadhunting(): Promise<void> {
    await this.searchOnlineLeads(null);
  }

  async searchMoreOnlineLeads(): Promise<void> {
    const runId = this.sourcing()?.onlineHeadhunting?.run?.onlineCandidateSourcingRunId;
    if (!runId) {
      return;
    }

    await this.searchOnlineLeads(runId);
  }

  private async searchOnlineLeads(searchMoreFromRunId: string | null): Promise<void> {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return;
    }

    if (!this.canRunOnlineHeadhunting()) {
      this.error.set(this.onlineHeadhuntingDisabledReason());
      return;
    }

    this.onlineHeadhuntingSearching.set(true);
    this.clearStatus();
    try {
      const queued = await this.store.searchOnlineCandidates(sourcing.jobRequest.id, {
        limit: 20,
        sourceCodes: this.onlineSourceCodes,
        searchMoreFromRunId,
      });
      this.onlineHeadhuntingQueued.set(true);
      this.message.set(
        queued.message || 'AI Headhunting is running in the background. You will be notified when lead-only results are ready.',
      );
    } catch (error) {
      this.error.set(this.toErrorMessage(error, 'AI Headhunting could not complete. No candidates or applications were created.'));
    } finally {
      this.onlineHeadhuntingSearching.set(false);
    }
  }

  private async reloadAfterRealtimeRefresh(reason: string, leadCount: number | null = null): Promise<void> {
    const jobRequestId = this.route.snapshot.paramMap.get('jobRequestId');
    if (!jobRequestId) {
      return;
    }

    try {
      const sourcing = this.normalizeSourcing(await this.store.loadRecruiterSourcing(jobRequestId));
      this.sourcing.set(sourcing);
      this.hydrateForm(sourcing);
      this.onlineHeadhuntingQueued.set(false);
      this.onlineHeadhuntingSearching.set(false);

      const leads = sourcing.onlineHeadhunting?.leads ?? [];
      if (leads.length > 0) {
        this.selectedOnlineLeadId.set(leads[0].onlineCandidateLeadId);
      }

      if (reason === 'online_headhunting_completed') {
        if (leadCount === 0) {
          this.message.set('AI Headhunting found no new lead-only results. Existing leads are unchanged.');
        } else if (leadCount !== null) {
          this.message.set(`AI Headhunting added ${leadCount} new lead-only result(s).`);
        } else {
          this.message.set(`AI Headhunting returned ${this.onlineHeadhuntingLeadCount()} lead-only result(s).`);
        }
      } else if (reason === 'online_headhunting_failed') {
        this.error.set('AI Headhunting finished with an error. No candidates or applications were created.');
      }
    } catch {
      this.error.set('AI Headhunting finished, but this page could not refresh automatically.');
      this.onlineHeadhuntingQueued.set(false);
      this.onlineHeadhuntingSearching.set(false);
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

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Close and archive this job post? Candidates will no longer be able to apply, and recruiters will not be able to add or invite new candidates for this post.',
      );
      if (!confirmed) {
        return;
      }
    }

    this.saving.set(true);
    this.clearStatus();
    try {
      this.applyJobPost(await this.store.closeJobPost(jobPost.jobPostId));
      this.message.set('Job post closed and archived. Public applications and manual candidate invites are disabled.');
    } catch {
      this.error.set('Job post could not be closed.');
    } finally {
      this.saving.set(false);
    }
  }

  openManualCandidateModal(): void {
    const jobPost = this.sourcing()?.jobPost;
    if (!this.canAddManualCandidate()) {
      this.error.set(this.manualCandidateDisabledReason());
      return;
    }

    this.manualCandidateForm = this.emptyManualCandidateForm();
    this.manualCandidateForm.invitationMessage = this.defaultInvitationMessage(jobPost?.title);
    this.manualCandidateError.set('');
    this.cvParseError.set('');
    this.manualSkillSearch.set('');
    this.manualActiveSkillGroup.set(DEFAULT_SKILL_GROUP_LABEL);
    this.closeOnlineLeadModal();
    this.manualCandidateModalOpen.set(true);
  }

  closeManualCandidateModal(): void {
    if (this.manualCandidateSaving()) {
      return;
    }

    this.manualCandidateModalOpen.set(false);
    this.manualCandidateError.set('');
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
        parsedCvEvidence: null,
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
      parsedCvEvidence: null,
    };
  }

  async parseManualCandidateCv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
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
    } catch {
      this.cvParseError.set('CV Parser Agent could not parse this DOCX. Manual entry is still available.');
    } finally {
      this.cvParsing.set(false);
    }
  }

  async submitManualCandidate(jobPostId: string): Promise<void> {
    this.manualCandidateError.set('');
    if (!this.canAddManualCandidate()) {
      this.manualCandidateError.set(this.manualCandidateDisabledReason());
      return;
    }

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
    if (!this.canManageApplications()) {
      this.error.set(this.applicationManagementDisabledReason());
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
    if (!this.canManageApplications()) {
      this.error.set(this.applicationManagementDisabledReason());
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
      this.markApplicationForwarded(application.jobApplicationId);
      this.message.set(`${application.candidateName} forwarded to Hiring Manager Review.`);
      try {
        await this.load();
      } catch {
        this.message.set(`${application.candidateName} forwarded to Hiring Manager Review. Refresh the page to view the latest sourcing state.`);
      }
      this.activeTab.set('applications');
    } catch {
      this.error.set('Candidate could not be forwarded. Confirm all active rounds are completed or skipped.');
    } finally {
      this.saving.set(false);
    }
  }

  trackedInvitationLink(application: RecruiterApplication): string | null {
    const sourceUrl = application.sourceUrl?.trim();
    if (!application.isInvited || !sourceUrl || !this.isTrackedInvitationUrl(sourceUrl)) {
      return null;
    }

    return sourceUrl;
  }

  openInvitationLinkModal(application: RecruiterApplication): void {
    if (!this.trackedInvitationLink(application)) {
      this.error.set('No tracked invitation link is stored for this candidate.');
      return;
    }

    this.clearStatus();
    this.invitationLinkCopyMessage.set('');
    this.invitationLinkModalApplication.set(application);
  }

  closeInvitationLinkModal(): void {
    this.invitationLinkModalApplication.set(null);
    this.invitationLinkCopyMessage.set('');
  }

  openInvitationLink(inviteLink: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.open(inviteLink, '_blank', 'noopener,noreferrer');
  }

  async copyInvitationLink(inviteLink: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteLink);
      this.invitationLinkCopyMessage.set('Invitation link copied.');
    } catch {
      this.invitationLinkCopyMessage.set('Copy failed. Select the link and copy it manually.');
    }
  }

  openScheduleModal(application: RecruiterApplication): void {
    this.clearStatus();
    const eligibility = this.scheduleEligibility(application);
    if (eligibility.status !== 'eligible' || !eligibility.round?.jobPostInterviewRoundId) {
      this.scheduleError.set(eligibility.message);
      return;
    }

    this.selectedApplication.set(application);
    this.scheduleForm = {
      ...this.emptyScheduleForm(),
      jobApplicationId: application.jobApplicationId,
      jobPostInterviewRoundId: eligibility.round.jobPostInterviewRoundId,
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

    const eligibility = this.scheduleEligibility(application);
    if (eligibility.status !== 'eligible' || !eligibility.round?.jobPostInterviewRoundId) {
      this.scheduleError.set(eligibility.message);
      return;
    }

    const round = eligibility.round;
    const jobPostInterviewRoundId = round.jobPostInterviewRoundId;
    if (!jobPostInterviewRoundId) {
      this.scheduleError.set(eligibility.message);
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
        jobPostInterviewRoundId,
        interviewerUserId: round.ownerUserId,
        startsAtUtc: startsAt.toISOString(),
        meetingLink: null,
        locationText: this.blankToNull(this.scheduleForm.locationText),
      });
      this.message.set(`${round.name} scheduled for ${application.candidateName}.`);
      this.scheduleSaving.set(false);
      this.closeScheduleModal();
      await this.load();
      this.activeTab.set('applications');
    } catch (error) {
      this.scheduleError.set(this.toErrorMessage(
        error,
        'Interview could not be scheduled. Confirm prior rounds are completed or skipped, and that this round has an active default interviewer.',
      ));
    } finally {
      this.scheduleSaving.set(false);
    }
  }

  applySelectedTemplate(): void {
    const template = this.selectedTemplate();
    if (!template || this.sourcing()?.jobPost) {
      return;
    }

    this.roundInterviewerDepartmentFilters = {};
    this.roundInterviewerSearches = {};
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

  roundDepartmentFilter(round: JobPostInterviewRound, index: number): string {
    const key = this.roundFilterKey(round, index);
    return Object.prototype.hasOwnProperty.call(this.roundInterviewerDepartmentFilters, key)
      ? this.roundInterviewerDepartmentFilters[key]
      : this.jobDepartmentName();
  }

  setRoundDepartmentFilter(round: JobPostInterviewRound, index: number, value: string): void {
    this.roundInterviewerDepartmentFilters = {
      ...this.roundInterviewerDepartmentFilters,
      [this.roundFilterKey(round, index)]: value,
    };
  }

  roundSearch(round: JobPostInterviewRound, index: number): string {
    return this.roundInterviewerSearches[this.roundFilterKey(round, index)] ?? '';
  }

  setRoundSearch(round: JobPostInterviewRound, index: number, event: Event): void {
    this.roundInterviewerSearches = {
      ...this.roundInterviewerSearches,
      [this.roundFilterKey(round, index)]: ((event.target as HTMLInputElement | null)?.value ?? '').toString(),
    };
  }

  interviewerDepartments(): string[] {
    const jobDepartment = this.jobDepartmentName();
    return Array.from(
      new Set((this.sourcing()?.interviewers ?? []).map((interviewer) => this.interviewerDepartmentName(interviewer))),
    ).sort((left, right) => {
      if (left === jobDepartment) {
        return -1;
      }
      if (right === jobDepartment) {
        return 1;
      }
      return left.localeCompare(right);
    });
  }

  interviewerGroupsForRound(round: JobPostInterviewRound, index: number): InterviewerGroup[] {
    const grouped = new Map<string, InterviewerOption[]>();
    for (const interviewer of this.visibleInterviewersForRound(round, index)) {
      const departmentName = this.interviewerDepartmentName(interviewer);
      grouped.set(departmentName, [...(grouped.get(departmentName) ?? []), interviewer]);
    }

    return Array.from(grouped.entries())
      .map(([departmentName, options]) => ({
        departmentName,
        options: options.sort((left, right) => this.compareInterviewers(left, right)),
      }))
      .sort((left, right) => this.compareDepartmentNames(left.departmentName, right.departmentName));
  }

  visibleInterviewerCountForRound(round: JobPostInterviewRound, index: number): number {
    return this.visibleInterviewersForRound(round, index).length;
  }

  selectedInterviewerName(round: JobPostInterviewRound): string {
    return this.findInterviewerById(round.ownerUserId)?.displayName || round.ownerUserName || 'Not assigned';
  }

  selectedInterviewerInitials(round: JobPostInterviewRound): string {
    if (!round.ownerUserId) {
      return 'NA';
    }

    const parts = this.selectedInterviewerName(round)
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return 'NA';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  selectedInterviewerMeta(round: JobPostInterviewRound): string {
    const interviewer = this.findInterviewerById(round.ownerUserId);
    if (interviewer) {
      const parts = [
        interviewer.designation,
        this.interviewerDepartmentName(interviewer),
        `${interviewer.completedInterviewCount} completed interview${interviewer.completedInterviewCount === 1 ? '' : 's'}`,
      ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);

      return parts.join(' - ');
    }

    if (round.ownerUserId) {
      return 'Selected interviewer is not in the active employee list.';
    }

    return 'Select any active employee for this round.';
  }

  roundInterviewerHelper(round: JobPostInterviewRound, index: number): string {
    const options = this.visibleInterviewersForRound(round, index);
    if (options.length === 0) {
      return 'No active employees match this filter.';
    }

    const selected = this.findInterviewerById(round.ownerUserId);
    if (selected && !this.interviewerMatchesActiveFilters(selected, round, index)) {
      return 'Selected interviewer is shown even though they do not match the active filter.';
    }

    return '';
  }

  selectRoundInterviewer(index: number, userId: string): void {
    const selectedUserId = userId || null;
    const interviewer = this.findInterviewerById(selectedUserId);
    this.form.interviewRounds = this.form.interviewRounds.map((round, roundIndex) =>
      roundIndex === index
        ? {
            ...round,
            ownerUserId: selectedUserId,
            ownerUserName: interviewer?.displayName ?? null,
          }
        : round,
    );
  }

  shouldSuggestHod(round: JobPostInterviewRound, index: number): boolean {
    const name = round.name.toLowerCase();
    return index === this.form.interviewRounds.length - 1 || name.includes('hod') || name.includes('department head') || name.includes('final');
  }

  recommendedHodForRound(round: JobPostInterviewRound, index: number): RecommendedHod | undefined {
    if (!this.shouldSuggestHod(round, index)) {
      return undefined;
    }

    const fromInterviewers = (this.sourcing()?.interviewers ?? [])
      .filter((interviewer) => interviewer.isDepartmentHod && interviewer.isJobDepartmentMatch)
      .sort((left, right) => this.compareInterviewers(left, right))[0];
    if (fromInterviewers) {
      return {
        id: fromInterviewers.userId,
        name: fromInterviewers.displayName,
        departmentName: fromInterviewers.departmentName,
        description: fromInterviewers.designation,
      };
    }

    const fallback = this.sourcing()?.hodInterviewers?.[0];
    return fallback
      ? {
          id: fallback.id,
          name: fallback.name,
          description: fallback.description,
        }
      : undefined;
  }

  hodRecommendationReason(hod?: RecommendedHod): string {
    const department = hod?.departmentName || this.sourcing()?.jobPost?.department || this.sourcing()?.jobRequest.department || 'job post';
    return `${department} HOD matched to this job post department`;
  }

  formattedDescription(description: string): string {
    return formatJobDescription(description);
  }

  applyRecommendedHod(index: number, hod: RecommendedHod): void {
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

  private visibleInterviewersForRound(round: JobPostInterviewRound, index: number): InterviewerOption[] {
    const filtered = (this.sourcing()?.interviewers ?? [])
      .filter((interviewer) => this.interviewerMatchesActiveFilters(interviewer, round, index))
      .sort((left, right) => this.compareInterviewers(left, right));
    const selected = this.findInterviewerById(round.ownerUserId);
    if (!selected || filtered.some((interviewer) => interviewer.userId === selected.userId)) {
      return filtered;
    }

    return [selected, ...filtered];
  }

  private interviewerMatchesActiveFilters(
    interviewer: InterviewerOption,
    round: JobPostInterviewRound,
    index: number,
  ): boolean {
    const departmentFilter = this.roundDepartmentFilter(round, index);
    if (departmentFilter && this.interviewerDepartmentName(interviewer) !== departmentFilter) {
      return false;
    }

    const search = this.roundSearch(round, index).trim().toLowerCase();
    if (!search) {
      return true;
    }

    return [
      interviewer.displayName,
      interviewer.email,
      interviewer.departmentName,
      interviewer.designation,
      ...(interviewer.roleNames ?? []),
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .some((value) => value.toLowerCase().includes(search));
  }

  private findInterviewerById(userId?: string | null): InterviewerOption | undefined {
    if (!userId) {
      return undefined;
    }

    return this.sourcing()?.interviewers.find((interviewer) => interviewer.userId === userId);
  }

  private compareInterviewers(left: InterviewerOption, right: InterviewerOption): number {
    const departmentComparison = this.compareDepartmentNames(
      this.interviewerDepartmentName(left),
      this.interviewerDepartmentName(right),
    );
    if (departmentComparison !== 0) {
      return departmentComparison;
    }

    return left.displayName.localeCompare(right.displayName);
  }

  private compareDepartmentNames(left: string, right: string): number {
    const jobDepartment = this.jobDepartmentName();
    if (left === right) {
      return 0;
    }
    if (left === jobDepartment) {
      return -1;
    }
    if (right === jobDepartment) {
      return 1;
    }

    return left.localeCompare(right);
  }

  private interviewerDepartmentName(interviewer: InterviewerOption): string {
    return interviewer.departmentName?.trim() || 'Unassigned';
  }

  private jobDepartmentName(): string {
    return this.sourcing()?.jobPost?.department || this.sourcing()?.jobRequest.department || '';
  }

  private roundFilterKey(round: JobPostInterviewRound, index: number): string {
    return round.jobPostInterviewRoundId || round.interviewTemplateRoundId || `round-${round.roundOrder}-${index}`;
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
    return this.canUseSourcingAssignment() && !this.isCurrentJobPostClosed();
  }

  canRankApplicants(): boolean {
    const sourcing = this.sourcing();
    return this.canUseSourcingAssignment() &&
      this.isJobPostPublished(sourcing?.jobPost) &&
      !!sourcing?.jobPost &&
      (sourcing.applications?.length ?? 0) > 0;
  }

  canAddManualCandidate(): boolean {
    const jobPost = this.sourcing()?.jobPost;
    return this.canUseSourcingAssignment() && this.isJobPostPublished(jobPost);
  }

  canCloseJobPost(): boolean {
    const jobPost = this.sourcing()?.jobPost;
    return this.canUseSourcingAssignment() && !!jobPost && !this.isJobPostClosed(jobPost);
  }

  canManageApplications(): boolean {
    return this.canUseSourcingAssignment() && this.isJobPostPublished(this.sourcing()?.jobPost);
  }

  isCurrentJobPostClosed(): boolean {
    return this.isJobPostClosed(this.sourcing()?.jobPost);
  }

  isJobPostClosed(jobPost: RecruiterSourcing['jobPost'] | null | undefined): boolean {
    return this.normalizeStatus(jobPost?.status) === 'closed';
  }

  isJobPostPublished(jobPost: RecruiterSourcing['jobPost'] | null | undefined): boolean {
    return this.normalizeStatus(jobPost?.status) === 'published';
  }

  jobPostStatusBadgeClass(status: string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'closed') {
      return 'status-badge status-badge--closed';
    }

    if (normalized === 'published') {
      return 'status-badge status-badge--success';
    }

    if (normalized === 'draft') {
      return 'status-badge status-badge--draft';
    }

    return 'status-badge info';
  }

  applicationStatusBadgeClass(status: string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    const classes: Record<string, string> = {
      invited: 'status-badge status-badge--invited',
      applied: 'status-badge status-badge--applied',
      screening: 'status-badge status-badge--screening',
      shortlisted: 'status-badge status-badge--screening',
      interviewing: 'status-badge status-badge--interviewing',
      hiringmanagerreview: 'status-badge status-badge--review',
      offered: 'status-badge status-badge--offer',
      onhold: 'status-badge status-badge--hold',
      offerdeclined: 'status-badge status-badge--offer-declined',
      rejected: 'status-badge status-badge--danger',
      withdrawn: 'status-badge status-badge--closed',
      joined: 'status-badge status-badge--success',
      hired: 'status-badge status-badge--success',
    };

    return classes[normalized] ?? 'status-badge status-badge--neutral';
  }

  manualCandidateDisabledReason(): string {
    if (this.isCurrentJobPostClosed()) {
      return 'This job post is closed and archived. New manual candidates cannot be added or invited.';
    }

    if (!this.canUseSourcingAssignment()) {
      return 'Claim sourcing work before adding sourced candidates.';
    }

    return 'Publish the job post before adding sourced candidates.';
  }

  applicationManagementDisabledReason(): string {
    if (this.isCurrentJobPostClosed()) {
      return 'This job post is closed and archived. Existing applications are read-only.';
    }

    if (!this.canUseSourcingAssignment()) {
      return 'Claim sourcing work before updating candidate applications.';
    }

    return 'Publish the job post before updating candidate applications.';
  }

  onlineHeadhuntingDisabledReason(): string {
    if (this.isCurrentJobPostClosed()) {
      return 'This job post is closed and archived. AI Headhunting cannot search or convert new leads for it.';
    }

    if (this.onlineSourceCodes.length === 0) {
      return 'Select at least one source before running AI Headhunting.';
    }

    return 'Claim sourcing work before running AI Headhunting.';
  }

  canClaimSourcingAssignment(assignment: WorkflowAssignment): boolean {
    return assignment.status === 'Pending' && !assignment.claimedByUserId;
  }

  canShortlistApplication(application: RecruiterApplication): boolean {
    return ['applied', 'invited'].includes(this.normalizeStatus(application.applicationStatus));
  }

  canForwardToHiringManager(application: RecruiterApplication): boolean {
    if (
      !this.canManageApplications() ||
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

  canSubmitInterviewFeedback(interview: RecruiterApplicationInterview): boolean {
    return this.interviewFeedbackActionLabel(interview) !== null;
  }

  interviewFeedbackActionLabel(interview: RecruiterApplicationInterview): 'Add feedback' | 'Admin override feedback' | null {
    if (this.normalizeStatus(interview.status) !== 'scheduled') {
      return null;
    }

    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      return null;
    }

    if (interview.interviewerUserId === currentUser.id) {
      return 'Add feedback';
    }

    if (this.auth.isAdmin() && this.isInactiveInterviewer(interview)) {
      return 'Admin override feedback';
    }

    return null;
  }

  private isInactiveInterviewer(interview: RecruiterApplicationInterview): boolean {
    return interview.interviewerIsDeleted || this.normalizeStatus(interview.interviewerAccountStatus) !== 'active';
  }

  private normalizeStatus(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').toLowerCase();
  }

  canSubmitAssignedInterviewFeedback(interview: RecruiterApplicationInterview): boolean {
    const currentUserId = this.auth.currentUser()?.id;
    return (
      !!currentUserId &&
      interview.interviewerUserId === currentUserId &&
      interview.status === 'Scheduled'
    );
  }

  interviewTimelineEntries(application: RecruiterApplication): InterviewTimelineEntry[] {
    const rounds = this.activeInterviewRounds();
    if (rounds.length === 0) {
      return application.interviews.map((interview) => ({
        key: interview.interviewId,
        roundName: interview.roundName,
        status: interview.status,
        startsAt: interview.startsAt,
        interview,
        isUnscheduled: false,
      }));
    }

    const configuredRoundIds = new Set(rounds.map((round) => round.jobPostInterviewRoundId));
    const entries = rounds.map((round): InterviewTimelineEntry => {
      const interview = application.interviews.find((candidateInterview) =>
        candidateInterview.jobPostInterviewRoundId === round.jobPostInterviewRoundId);
      if (interview) {
        return {
          key: interview.interviewId,
          roundName: interview.roundName,
          status: interview.status,
          startsAt: interview.startsAt,
          interview,
          isUnscheduled: false,
        };
      }

      return {
        key: `unscheduled-${round.jobPostInterviewRoundId}`,
        roundName: round.name,
        status: 'Not scheduled',
        startsAt: null,
        isUnscheduled: true,
      };
    });

    const legacyInterviews = application.interviews
      .filter((interview) => !interview.jobPostInterviewRoundId || !configuredRoundIds.has(interview.jobPostInterviewRoundId))
      .map((interview): InterviewTimelineEntry => ({
        key: interview.interviewId,
        roundName: interview.roundName,
        status: interview.status,
        startsAt: interview.startsAt,
        interview,
        isUnscheduled: false,
      }));

    return [...entries, ...legacyInterviews];
  }

  interviewTimelineSummary(application: RecruiterApplication): string | null {
    const rounds = this.activeInterviewRounds();
    if (rounds.length === 0) {
      return application.interviews.length > 0
        ? `${application.interviews.length} round${application.interviews.length === 1 ? '' : 's'}`
        : null;
    }

    const entries = this.interviewTimelineEntries(application);
    const scheduledCount = entries.filter((entry) => !entry.isUnscheduled).length;
    const unscheduledCount = entries.filter((entry) => entry.isUnscheduled).length;

    if (unscheduledCount === 0) {
      return `${scheduledCount} round${scheduledCount === 1 ? '' : 's'}`;
    }

    if (scheduledCount === 0) {
      return `${unscheduledCount} not scheduled`;
    }

    return `${scheduledCount} round${scheduledCount === 1 ? '' : 's'}, ${unscheduledCount} not scheduled`;
  }

  interviewTimelineItemClass(entry: InterviewTimelineEntry): string {
    return `interview-timeline-item ${this.interviewStatusToken(entry.status)}`;
  }

  interviewStatusChipClass(status: string): string {
    return `interview-status-chip ${this.interviewStatusToken(status)}`;
  }

  formatInterviewSchedule(startsAt: string): string {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime())) {
      return 'Date not set';
    }

    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
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

  onlineAgentStatusLabel(): string {
    if (this.onlineHeadhuntingSearching()) {
      return 'Agent running';
    }

    if (this.onlineHeadhuntingQueued()) {
      return 'Agent queued';
    }

    const run = this.sourcing()?.onlineHeadhunting?.run;
    if (!run) {
      return 'Agent ready';
    }

    return `${run.searchStatus || 'Completed'}: ${run.leadsReturned} lead${run.leadsReturned === 1 ? '' : 's'} returned`;
  }

  onlineRunButtonLabel(): string {
    if (this.onlineHeadhuntingSearching()) {
      return 'Queueing...';
    }

    if (this.onlineHeadhuntingQueued()) {
      return 'Queued';
    }

    return 'Run Agent';
  }

  onlineDailyUsageLabel(): string {
    const run = this.sourcing()?.onlineHeadhunting?.run;
    if (!run) {
      return '0/100';
    }

    return `${run.dailyLeadCountBeforeRun + run.leadsReturned}/${run.dailyLeadLimit}`;
  }

  onlineModelLabel(): string {
    return this.sourcing()?.onlineHeadhunting?.run?.model ||
      this.sourcing()?.configuredAiModel ||
      'Not configured';
  }

  onlineSourceSelected(source: string): boolean {
    return this.onlineSourceCodes.some((code) => code.toLowerCase() === source.toLowerCase());
  }

  toggleOnlineSource(source: string): void {
    if (this.onlineSourceSelected(source)) {
      if (this.onlineSourceCodes.length === 1) {
        this.error.set('Select at least one online source.');
        return;
      }

      this.onlineSourceCodes = this.onlineSourceCodes.filter((code) => code.toLowerCase() !== source.toLowerCase());
      return;
    }

    this.onlineSourceCodes = [...this.onlineSourceCodes, source];
  }

  onlineSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      GitHub: 'GitHub API',
      LinkedIn: 'LinkedIn links',
      Portfolio: 'Portfolio',
      PublicSearch: 'Web search',
    };

    return labels[source] ?? source;
  }

  onlineSourceTooltip(source: string): string {
    const descriptions: Record<string, string> = {
      GitHub: 'Searches public GitHub users and repositories through the configured GitHub API/search path. Best for engineering roles and open-source evidence.',
      LinkedIn: 'Uses web search/X-Ray queries to find public LinkedIn profile links only. Talent Pilot does not scrape LinkedIn pages or send LinkedIn messages.',
      Portfolio: 'Searches public personal sites, resumes, CVs, and portfolio pages where candidates describe their work directly.',
      PublicSearch: 'Searches broader public web results such as profile pages, technical articles, directories, and other indexable candidate evidence.',
    };

    return descriptions[source] ?? 'Includes this source in the next AI Headhunting search run.';
  }

  onlineLeadSourceChipLabel(lead: OnlineCandidateLead): string {
    const labels: Record<string, string> = {
      GitHub: 'GitHub',
      LinkedIn: 'LinkedIn',
      Portfolio: 'Portfolio',
      PublicSearch: 'Web',
    };

    return labels[lead.sourceCode] ?? lead.sourceDisplayName ?? lead.sourceCode;
  }

  onlineSourceTooltipId(source: string): string {
    return `online-source-help-${source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }

  setOnlineLeadFilter(value: string): void {
    const allowed: OnlineLeadFilter[] = ['All', 'Shortlisted', 'Rejected', 'NeedsEmail', 'PossibleDuplicates'];
    const filter = allowed.includes(value as OnlineLeadFilter)
      ? value as OnlineLeadFilter
      : 'All';
    this.onlineLeadFilter.set(filter);
  }

  filteredOnlineLeads(): OnlineCandidateLead[] {
    const filter = this.onlineLeadFilter();
    return this.visibleOnlineLeadCandidates()
      .filter((lead) => {
        if (filter === 'NeedsEmail') {
          return !lead.email;
        }
        if (filter === 'PossibleDuplicates') {
          return lead.duplicateStatus !== 'NoMatch';
        }
        if (filter === 'Shortlisted' || filter === 'Rejected') {
          return lead.status === filter;
        }
        return true;
      })
      .sort((left, right) => this.compareOnlineLeadPriority(left, right));
  }

  onlineHeadhuntingLeadCount(): number {
    return this.visibleOnlineLeadCandidates().length;
  }

  private visibleOnlineLeadCandidates(): OnlineCandidateLead[] {
    const leads = this.sourcing()?.onlineHeadhunting?.leads ?? [];
    return leads
      .filter((lead) => !this.isLikelyJobPostingLead(lead))
      .filter((lead) => this.isOnlineLeadLocationCompatible(lead));
  }

  onlineLeadContactLabel(lead: OnlineCandidateLead): string {
    return lead.email?.trim() || lead.phone?.trim() || 'Needs email';
  }

  selectOnlineLead(lead: OnlineCandidateLead): void {
    this.selectedOnlineLeadId.set(lead.onlineCandidateLeadId);
    this.onlineLeadDetailOpen.set(true);
  }

  closeOnlineLeadModal(): void {
    this.onlineLeadDetailOpen.set(false);
  }

  selectedOnlineLead(): OnlineCandidateLead | null {
    const leads = this.filteredOnlineLeads();
    if (leads.length === 0) {
      return null;
    }

    return leads.find((lead) => lead.onlineCandidateLeadId === this.selectedOnlineLeadId()) ?? leads[0];
  }

  initials(name: string | null | undefined): string {
    return this.candidateInitials(name || 'Talent Pilot');
  }

  onlineDuplicateClass(lead: OnlineCandidateLead): string {
    const token = lead.duplicateStatus === 'ExactMatch'
      ? 'exact'
      : lead.duplicateStatus === 'PossibleDuplicate'
        ? 'possible'
        : 'clear';
    return `duplicate-chip ${token}`;
  }

  onlineDuplicateLabel(lead: OnlineCandidateLead): string {
    if (lead.duplicateStatus === 'ExactMatch') {
      return 'Exact match';
    }
    if (lead.duplicateStatus === 'PossibleDuplicate') {
      return 'Possible duplicate';
    }

    return 'No match';
  }

  onlineLeadStatusClass(lead: OnlineCandidateLead): string {
    const token = this.normalizeStatus(lead.status);
    if (token === 'rejected') {
      return 'status-badge danger';
    }
    if (token === 'converted') {
      return 'status-badge success';
    }
    if (token === 'shortlisted') {
      return 'status-badge info';
    }

    return 'status-badge neutral';
  }

  onlineLeadStatusLabel(lead: OnlineCandidateLead): string {
    return this.formatActivityStatus(lead.status || 'New');
  }

  onlineLeadActionTooltip(
    action: 'addToPipeline' | 'viewSource' | 'saveProspect' | 'rejectLead',
    lead: OnlineCandidateLead,
  ): string {
    switch (action) {
      case 'addToPipeline':
        return lead.email
          ? 'Convert this reviewed lead into the job pipeline. No external message is sent automatically.'
        : 'Open the pipeline form. Add a verified email before Talent Pilot can send an invite.';
      case 'viewSource':
        return 'Open the public source URL where the agent found this lead evidence.';
      case 'saveProspect':
        return 'Shortlist this lead for later review. It remains a lead until you add it to the pipeline.';
      case 'rejectLead':
        return 'Mark this lead as rejected so it can be filtered out. No candidate record is deleted.';
    }
  }

  private compareOnlineLeadPriority(left: OnlineCandidateLead, right: OnlineCandidateLead): number {
    const locationCompare = Number(!this.hasKnownOnlineLeadLocation(left)) - Number(!this.hasKnownOnlineLeadLocation(right));
    if (locationCompare !== 0) {
      return locationCompare;
    }

    const contactCompare = this.onlineLeadContactPriority(right) - this.onlineLeadContactPriority(left);
    if (contactCompare !== 0) {
      return contactCompare;
    }

    const scoreCompare = (right.matchScore ?? 0) - (left.matchScore ?? 0);
    if (scoreCompare !== 0) {
      return scoreCompare;
    }

    return left.rank - right.rank;
  }

  private onlineLeadContactPriority(lead: OnlineCandidateLead): number {
    let priority = 0;
    if (lead.phone?.trim()) {
      priority += 1;
    }

    if (lead.email?.trim()) {
      priority += 2;
    }

    return priority;
  }

  private hasKnownOnlineLeadLocation(lead: OnlineCandidateLead): boolean {
    const location = lead.locationText?.trim().toLowerCase();
    return !!location && !['unknown', 'location unknown', 'n/a', 'na', 'not available'].includes(location);
  }

  private isOnlineLeadLocationCompatible(lead: OnlineCandidateLead): boolean {
    const targetLocation = this.sourcing()?.jobPost?.location || this.sourcing()?.jobRequest.location;
    if (this.isFlexibleOnlineLocation(targetLocation)) {
      return true;
    }

    const terms = this.onlineTargetLocationTerms(targetLocation);
    if (!terms.length) {
      return true;
    }

    const searchable = [
      lead.locationText,
      lead.currentTitle,
      lead.currentCompany,
      lead.evidenceSnippet,
    ]
      .filter((value): value is string => !!value?.trim())
      .join(' ');

    return terms.some((term) => this.containsOnlineTerm(searchable, term));
  }

  private isFlexibleOnlineLocation(location: string | null | undefined): boolean {
    if (!location?.trim()) {
      return true;
    }

    return ['remote', 'hybrid', 'anywhere', 'global'].some((term) => this.containsOnlineTerm(location, term));
  }

  private onlineTargetLocationTerms(location: string | null | undefined): string[] {
    if (!location?.trim()) {
      return [];
    }

    const terms = location
      .split(/[\s,\/\\\-|()]+/u)
      .map((term) => term.trim())
      .filter((term) => term.length > 2)
      .filter((term) => !['remote', 'hybrid'].includes(term.toLowerCase()));

    if (terms.some((term) => ['lahore', 'karachi', 'islamabad', 'rawalpindi'].includes(term.toLowerCase()))) {
      terms.push('Pakistan');
    }

    return Array.from(new Set(terms.map((term) => term.toLowerCase())));
  }

  private containsOnlineTerm(value: string, term: string): boolean {
    if (!value.trim() || !term.trim()) {
      return false;
    }

    return value.toLowerCase().includes(term.toLowerCase());
  }

  private isLikelyJobPostingLead(lead: OnlineCandidateLead): boolean {
    const urls = [lead.sourceUrl, lead.profileUrl].filter((value): value is string => !!value?.trim());
    for (const value of urls) {
      try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        const path = url.pathname.toLowerCase();
        const jobBoardHosts = [
          'indeed.',
          'expertini.',
          'rozee.',
          'mustakbil.',
          'glassdoor.',
          'bayt.',
          'naukri.',
          'monster.',
          'ziprecruiter.',
          'simplyhired.',
          'workable.com',
          'greenhouse.io',
          'lever.co',
          'smartrecruiters.',
          'bamboohr.',
        ];
        if (jobBoardHosts.some((hostToken) => host.includes(hostToken))) {
          return true;
        }

        const jobPathSegments = ['/jobs', '/job/', '/careers', '/career/', '/company', '/companies', '/vacancy', '/vacancies', '/opening', '/openings', '/apply'];
        if (jobPathSegments.some((segment) => path.includes(segment))) {
          return true;
        }
      } catch {
        continue;
      }
    }

    const title = `${lead.displayName ?? ''} ${lead.currentTitle ?? ''}`.toLowerCase();
    const text = `${lead.displayName ?? ''} ${lead.currentTitle ?? ''} ${lead.currentCompany ?? ''} ${lead.evidenceSnippet ?? ''}`.toLowerCase();
    if (title.includes(' jobs in ') || title.endsWith(' jobs')) {
      return true;
    }

    const jobSignals = ['apply now', 'job description', 'job summary', 'job vacancy', 'latest jobs', 'posted on', 'salary', 'apply for this job', 'career opportunity'];
    return jobSignals.filter((signal) => text.includes(signal)).length >= 2;
  }

  async saveOnlineLead(lead: OnlineCandidateLead): Promise<void> {
    await this.updateOnlineLeadStatus(lead, 'Shortlisted', 'Online lead saved for recruiter review.');
  }

  async rejectOnlineLead(lead: OnlineCandidateLead): Promise<void> {
    await this.updateOnlineLeadStatus(lead, 'Rejected', 'Online lead rejected.');
  }

  openManualCandidateModalFromLead(lead: OnlineCandidateLead): void {
    if (!this.canAddManualCandidate()) {
      this.error.set(this.manualCandidateDisabledReason());
      return;
    }

    this.clearStatus();
    this.manualCandidateForm = {
      ...this.emptyManualCandidateForm(),
      displayName: lead.displayName ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      linkedInUrl: this.profileUrlForManualLead(lead),
      currentDesignation: lead.currentTitle ?? '',
      currentCompany: lead.currentCompany ?? '',
      skillIds: this.skillIdsForNames(lead.matchedSkills ?? []),
      sourceLabel: lead.sourceDisplayName || this.onlineSourceLabel(lead.sourceCode),
      sourceDetail: `AI Headhunting - ${lead.sourceDisplayName || this.onlineSourceLabel(lead.sourceCode)}`,
      sourceUrl: lead.profileUrl || lead.sourceUrl,
      recruiterNotes: this.onlineLeadRecruiterNotes(lead),
      invitationMessage: lead.outreachDraft || this.defaultInvitationMessage(),
      onlineLeadId: lead.onlineCandidateLeadId,
    };
    this.manualCandidateError.set(lead.email ? '' : 'Enter a verified email before sending an invitation.');
    this.cvParseError.set('');
    this.manualSkillSearch.set('');
    this.manualActiveSkillGroup.set(DEFAULT_SKILL_GROUP_LABEL);
    this.manualCandidateModalOpen.set(true);
  }

  private async updateOnlineLeadStatus(
    lead: OnlineCandidateLead,
    status: 'Shortlisted' | 'Rejected',
    successMessage: string,
  ): Promise<void> {
    if (!this.canUseSourcingAssignment()) {
      this.error.set('Claim sourcing work before updating online leads.');
      return;
    }

    this.clearStatus();
    try {
      const updated = await this.store.updateOnlineCandidateLeadStatus(lead.onlineCandidateLeadId, status);
      this.patchOnlineLead(updated);
      this.message.set(successMessage);
    } catch (error) {
      this.error.set(this.toErrorMessage(error, 'Online lead status could not be updated.'));
    }
  }

  private patchOnlineLead(updated: OnlineCandidateLead): void {
    const sourcing = this.sourcing();
    const onlineHeadhunting = sourcing?.onlineHeadhunting;
    if (!sourcing || !onlineHeadhunting) {
      return;
    }

    this.sourcing.set({
      ...sourcing,
      onlineHeadhunting: {
        ...onlineHeadhunting,
        leads: onlineHeadhunting.leads.map((lead) =>
          lead.onlineCandidateLeadId === updated.onlineCandidateLeadId
            ? { ...lead, ...updated }
            : lead,
        ),
      },
    });
    this.selectedOnlineLeadId.set(updated.onlineCandidateLeadId);
  }

  private profileUrlForManualLead(lead: OnlineCandidateLead): string {
    if (lead.profileUrl) {
      return lead.profileUrl;
    }

    return lead.sourceCode === 'LinkedIn' ? lead.sourceUrl : '';
  }

  private onlineLeadRecruiterNotes(lead: OnlineCandidateLead): string {
    return [
      lead.fitSummary,
      lead.gaps.length > 0 ? `Gaps: ${lead.gaps.join(', ')}` : null,
      lead.missingData.length > 0 ? `Missing data: ${lead.missingData.join(', ')}` : null,
      lead.duplicateExplanation ? `Duplicate check: ${lead.duplicateExplanation}` : null,
      `Source: ${lead.sourceUrl}`,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n');
  }

  setTab(tab: SourcingTab): void {
    this.activeTab.set(tab);
    if (tab !== 'headhunting') {
      this.closeOnlineLeadModal();
    }
    this.clearStatus();
  }

  private renderApplicationTrendChart(): void {
    if (this.activeTab() !== 'analytics') {
      this.destroyApplicationTrendChart();
      return;
    }

    const canvas = this.applicationTrendCanvas?.nativeElement;
    if (!canvas) {
      this.destroyApplicationTrendChart();
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const analytics = this.applicationAnalytics();
    const labels = analytics.points.map((point) => point.label);
    const values = analytics.points.map((point) => point.count);
    const signature = `${labels.join('|')}::${values.join('|')}`;
    if (this.applicationTrendChart && this.applicationTrendChartSignature === signature) {
      return;
    }

    this.destroyApplicationTrendChart();
    this.applicationTrendChartSignature = signature;
    this.applicationTrendChart = new Chart<'bar', number[], string>(context, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: values.map((value) => value > 0 ? 'rgba(11, 102, 195, 0.82)' : 'rgba(148, 163, 184, 0.22)'),
            borderColor: values.map((value) => value > 0 ? '#0b66c3' : '#cbd5e1'),
            borderRadius: 8,
            borderSkipped: false,
            borderWidth: 1,
            categoryPercentage: 0.7,
            maxBarThickness: 72,
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (tooltipItem) => `${tooltipItem.parsed.y} applicant(s)`,
            },
          },
        },
        responsive: true,
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#64748b',
              font: {
                weight: 700,
              },
              padding: 8,
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e2e8f0',
            },
            suggestedMax: Math.max(2, analytics.maxDailyCount + 1),
            ticks: {
              color: '#64748b',
              precision: 0,
              stepSize: 1,
            },
            title: {
              color: '#64748b',
              display: true,
              font: {
                weight: 700,
              },
              text: 'Applicants',
            },
          },
        },
      },
    });
  }

  private destroyApplicationTrendChart(): void {
    this.applicationTrendChart?.destroy();
    this.applicationTrendChart = null;
    this.applicationTrendChartSignature = '';
  }

  trendDeltaLabel(analytics: ApplicationAnalytics): string {
    if (analytics.totalApplications === 0) {
      return 'No daily movement';
    }

    if (analytics.trendDelta > 0) {
      return `+${analytics.trendDelta} from previous day`;
    }

    if (analytics.trendDelta < 0) {
      return `${analytics.trendDelta} from previous day`;
    }

    return 'No change from previous day';
  }

  dailyApplicationsLabel(count: number): string {
    return count === 1 ? '1 candidate applied' : `${count} candidates applied`;
  }

  applicationTrendSummary(analytics: ApplicationAnalytics): string {
    const firstLabel = analytics.axisLabels[0]?.label;
    const lastLabel = analytics.axisLabels[analytics.axisLabels.length - 1]?.label;
    return firstLabel && lastLabel ? `${firstLabel} to ${lastLabel}` : 'Latest activity window';
  }

  applicationTrendAriaLabel(analytics: ApplicationAnalytics): string {
    const points = analytics.points
      .map((point) => `${point.label}: ${point.count}`)
      .join(', ');
    return `Daily application counts. ${points}`;
  }

  private applyInitialTab(): void {
    const tab = this.toSourcingTab(this.route.snapshot.queryParamMap?.get('tab'));
    if (tab) {
      this.activeTab.set(tab);
    }

    this.applySourceFragment(this.route.snapshot.fragment);
  }

  private applySourceFragment(fragment: string | null): void {
    const tab = this.toSourcingTabFromFragment(fragment);
    if (!tab) {
      return;
    }

    this.activeTab.set(tab);
    this.pendingSourceFragment = fragment;
  }

  private scrollToPendingSource(): void {
    const fragment = this.pendingSourceFragment;
    if (!fragment) {
      return;
    }

    const target = document.getElementById(`rag-source-${fragment}`) ?? document.getElementById(fragment);
    if (!target) {
      return;
    }

    this.pendingSourceFragment = null;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.classList.add('rag-source-highlight');
      window.setTimeout(() => target.classList.remove('rag-source-highlight'), 1400);
    }, 0);
  }

  private toSourcingTab(tab: string | null | undefined): SourcingTab | null {
    return tab === 'review' ||
      tab === 'applications' ||
      tab === 'analytics' ||
      tab === 'rediscovery' ||
      tab === 'headhunting' ||
      tab === 'post'
      ? tab
      : null;
  }

  private toSourcingTabFromFragment(fragment: string | null | undefined): SourcingTab | null {
    switch (fragment) {
      case 'request-review':
        return 'review';
      case 'applications':
        return 'applications';
      case 'job-analytics':
        return 'analytics';
      case 'talent-rediscovery':
        return 'rediscovery';
      case 'ai-headhunting':
      case 'headhunting':
        return 'headhunting';
      case 'job-post':
        return 'post';
      default:
        return null;
    }
  }

  private buildApplicationAnalytics(applications: readonly RecruiterApplication[]): ApplicationAnalytics {
    const activityDates = applications
      .map((application) => this.toLocalDate(application.appliedAt))
      .filter((date): date is Date => Boolean(date));
    const endDate = activityDates.length > 0
      ? activityDates.reduce((latest, current) => (current > latest ? current : latest))
      : this.startOfLocalDay(new Date());
    const firstActivityDate = activityDates.length > 0
      ? activityDates.reduce((earliest, current) => (current < earliest ? current : earliest))
      : this.addDays(endDate, -6);
    const startDate = activityDates.length > 0 && this.daysBetween(firstActivityDate, endDate) === 0
      ? this.addDays(endDate, -1)
      : firstActivityDate;
    const windowLength = this.daysBetween(startDate, endDate) + 1;
    const countByDate = new Map<string, number>();

    for (const date of activityDates) {
      if (date < startDate || date > endDate) {
        continue;
      }

      const key = this.toDateKey(date);
      countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
    }

    const counts = Array.from({ length: windowLength }, (_, index) => {
      const date = this.addDays(startDate, index);
      return countByDate.get(this.toDateKey(date)) ?? 0;
    });
    const maxDailyCount = Math.max(0, ...counts);
    const points = counts.map((count, index) => {
      const date = this.addDays(startDate, index);
      return {
        dateKey: this.toDateKey(date),
        label: this.formatApplicationTrendDate(date),
        shortLabel: this.formatApplicationTrendShortDate(date),
        count,
      };
    });
    const latestDayCount = points[points.length - 1]?.count ?? 0;
    const previousDayCount = points[points.length - 2]?.count ?? 0;
    const trendDelta = latestDayCount - previousDayCount;
    const trendDirection = trendDelta > 0 ? 'increasing' : trendDelta < 0 ? 'decreasing' : 'flat';
    const trendLabel = applications.length === 0
      ? 'No activity'
      : trendDirection === 'increasing'
        ? 'Increasing'
        : trendDirection === 'decreasing'
          ? 'Decreasing'
          : 'Flat';
    return {
      totalApplications: applications.length,
      lastSevenDaysTotal: points.slice(-7).reduce((total, point) => total + point.count, 0),
      latestDayCount,
      previousDayCount,
      trendDelta,
      trendDirection,
      trendLabel,
      maxDailyCount,
      points,
      axisLabels: this.toApplicationTrendAxisLabels(points),
    };
  }

  private toLocalDate(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : this.startOfLocalDay(parsed);
  }

  private startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private daysBetween(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / millisecondsPerDay));
  }

  private toDateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private formatApplicationTrendDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }

  private formatApplicationTrendShortDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(date);
  }

  private toApplicationTrendAxisLabels(points: readonly ApplicationTrendPoint[]): ApplicationTrendLabel[] {
    if (points.length === 0) {
      return [];
    }

    return Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]))
      .map((index) => points[index])
      .filter((point): point is ApplicationTrendPoint => Boolean(point))
      .map((point) => ({ dateKey: point.dateKey, label: point.label }));
  }

  toggleDetails(candidateId: string): void {
    this.expandedCandidateId.set(this.expandedCandidateId() === candidateId ? null : candidateId);
  }

  toggleApplicantRankingDetails(jobApplicationId: string): void {
    this.expandedApplicantRankingId.set(this.expandedApplicantRankingId() === jobApplicationId ? null : jobApplicationId);
  }

  toggleManualCandidateMenu(candidateId: string): void {
    this.closeApplicationActionMenu();
    this.openManualCandidateMenuId.set(this.openManualCandidateMenuId() === candidateId ? null : candidateId);
  }

  closeManualCandidateMenu(): void {
    this.openManualCandidateMenuId.set(null);
  }

  toggleApplicationActionMenu(jobApplicationId: string): void {
    this.closeManualCandidateMenu();
    this.openApplicationActionMenuId.set(
      this.openApplicationActionMenuId() === jobApplicationId ? null : jobApplicationId,
    );
  }

  closeApplicationActionMenu(): void {
    this.openApplicationActionMenuId.set(null);
  }

  closeActionMenus(): void {
    this.closeManualCandidateMenu();
    this.closeApplicationActionMenu();
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
    return this.semanticSimilarityStatusLabel(this.sourcing()?.applicantRankings[0]?.semanticSimilarityStatus);
  }

  applicantRankingFor(application: RecruiterApplication): ApplicantRankingMatch | undefined {
    return this.sourcing()?.applicantRankings
      .find((ranking) => ranking.jobApplicationId === application.jobApplicationId);
  }

  rankedApplications(sourcing: RecruiterSourcing | null | undefined = this.sourcing()): RecruiterApplication[] {
    const applications = [...(sourcing?.applications ?? [])];
    const rankings = new Map(
      (sourcing?.applicantRankings ?? []).map((ranking) => [ranking.jobApplicationId, ranking]),
    );

    return applications.sort((left, right) => {
      const leftRanking = rankings.get(left.jobApplicationId);
      const rightRanking = rankings.get(right.jobApplicationId);

      if (leftRanking && rightRanking) {
        return (leftRanking.rank - rightRanking.rank) ||
          (rightRanking.score - leftRanking.score) ||
          this.compareAppliedAtDescending(left, right);
      }

      if (leftRanking) {
        return -1;
      }

      if (rightRanking) {
        return 1;
      }

      return this.compareAppliedAtDescending(left, right);
    });
  }

  filteredManualCandidates(): ManualCandidateSearchItem[] {
    const candidates = this.sourcing()?.candidateSearchItems ?? [];
    const text = this.manualSearchText.trim().toLowerCase();
    const minAiScore = this.manualMinAiScore ? Number(this.manualMinAiScore) : null;
    const minPassed = this.manualMinPassedInterviews === null || this.manualMinPassedInterviews === undefined
      ? null
      : Number(this.manualMinPassedInterviews);
    const maxFailed = this.manualMaxFailedInterviews === null || this.manualMaxFailedInterviews === undefined
      ? null
      : Number(this.manualMaxFailedInterviews);

    return candidates
      .filter((candidate) => this.isRediscoverableCandidate(candidate))
      .filter((candidate) => !text || this.matchesManualSearch(candidate, text))
      .filter((candidate) => this.manualSkillFilter === '' || this.hasCandidateSkill(candidate, this.manualSkillFilter))
      .filter((candidate) => this.manualStatusFilter === 'All' || candidate.status === this.manualStatusFilter)
      .filter((candidate) => minAiScore === null || this.candidateAiScore(candidate) >= minAiScore)
      .filter((candidate) => minPassed === null || candidate.passedInterviews >= minPassed)
      .filter((candidate) => maxFailed === null || candidate.failedInterviews <= maxFailed)
      .sort((left, right) => {
        const scoreDelta = this.candidateAiScore(right) - this.candidateAiScore(left);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        const matchedSkillDelta = right.matchedSkills.length - left.matchedSkills.length;
        if (matchedSkillDelta !== 0) {
          return matchedSkillDelta;
        }

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

  pagedManualCandidates(): ManualCandidateSearchItem[] {
    const candidates = this.filteredManualCandidates();
    const start = (this.currentManualCandidatePage() - 1) * this.manualCandidatePageSize;
    return candidates.slice(start, start + this.manualCandidatePageSize);
  }

  currentManualCandidatePage(): number {
    return Math.min(Math.max(1, this.manualCandidatePage()), this.manualCandidateTotalPages());
  }

  manualCandidateTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredManualCandidates().length / this.manualCandidatePageSize));
  }

  manualCandidatePageNumbers(): number[] {
    const total = this.manualCandidateTotalPages();
    const visibleCount = Math.min(5, total);
    const current = this.currentManualCandidatePage();
    const start = Math.max(1, Math.min(current - 2, total - visibleCount + 1));
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }

  manualCandidateShowingStart(): number {
    const total = this.filteredManualCandidates().length;
    return total === 0 ? 0 : (this.currentManualCandidatePage() - 1) * this.manualCandidatePageSize + 1;
  }

  manualCandidateShowingEnd(): number {
    return Math.min(this.filteredManualCandidates().length, this.currentManualCandidatePage() * this.manualCandidatePageSize);
  }

  canGoToPreviousManualCandidatePage(): boolean {
    return this.currentManualCandidatePage() > 1;
  }

  canGoToNextManualCandidatePage(): boolean {
    return this.currentManualCandidatePage() < this.manualCandidateTotalPages();
  }

  goToManualCandidatePage(page: number): void {
    this.manualCandidatePage.set(Math.min(Math.max(1, page), this.manualCandidateTotalPages()));
    this.closeManualCandidateMenu();
  }

  resetManualCandidatePage(): void {
    this.manualCandidatePage.set(1);
    this.closeManualCandidateMenu();
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
    this.manualMinAiScore = '';
    this.manualMinPassedInterviews = null;
    this.manualMaxFailedInterviews = null;
    this.resetManualCandidatePage();
    this.closeManualCandidateMenu();
  }

  rediscoveryMatchForCandidate(candidate: ManualCandidateSearchItem): TalentRediscoveryMatch | undefined {
    return this.sourcing()?.talentRediscoveryMatches
      .find((match) => match.candidateId === candidate.candidateId);
  }

  candidateAiScore(candidate: ManualCandidateSearchItem): number {
    const match = this.rediscoveryMatchForCandidate(candidate);
    if (match) {
      return Math.round(match.score);
    }

    const requiredSkillCount = Math.max((this.sourcing()?.jobRequest.skills.length ?? 0), 1);
    const skillScore = Math.min(60, Math.round((candidate.matchedSkills.length / requiredSkillCount) * 60));
    const interviewScore = Math.min(25, candidate.totalInterviews === 0
      ? 0
      : Math.round((candidate.passedInterviews / Math.max(candidate.totalInterviews, 1)) * 25));
    const profileScore = candidate.experienceYears ? 10 : 0;
    const recencyScore = candidate.latestApplication ? 5 : 0;

    return Math.min(96, Math.max(35, skillScore + interviewScore + profileScore + recencyScore));
  }

  candidateReasonSummary(candidate: ManualCandidateSearchItem): string {
    const match = this.rediscoveryMatchForCandidate(candidate);
    if (match) {
      const directSkillWarning = this.rediscoveryDirectSkillWarning(candidate, match.explanation);
      if (directSkillWarning) {
        return `${directSkillWarning} ${match.explanation}`;
      }

      if (candidate.matchedSkills.length === 0 && candidate.missingSkills.length > 0) {
        return `${this.rediscoveryDirectSkillWarning(candidate) || 'Current-request skill evidence is weak.'} Review before outreach.`;
      }

      return match.explanation;
    }

    if (candidate.matchedSkills.length > 0) {
      return `Manual pool score is driven by ${candidate.matchedSkills.slice(0, 3).join(', ')} skill overlap and ${candidate.passedInterviews}/${candidate.totalInterviews} interviews passed.`;
    }

    return 'Manual pool score is based on profile history and interview evidence; no strong current-skill match is recorded.';
  }

  private rediscoveryDirectSkillWarning(candidate: ManualCandidateSearchItem, explanation?: string): string {
    const primaryMissingRequirement = this.primaryMissingRequirement(candidate.missingSkills);
    if (!primaryMissingRequirement) {
      return '';
    }

    const warning = `${primaryMissingRequirement} is required, but no direct ${primaryMissingRequirement} evidence is recorded in this profile.`;
    const normalizedExplanation = (explanation ?? '').toLowerCase();
    const normalizedSkill = primaryMissingRequirement.toLowerCase();
    if (normalizedExplanation.includes(warning.toLowerCase()) ||
      normalizedExplanation.includes(`no direct ${normalizedSkill}`) ||
      normalizedExplanation.includes(`no past ${normalizedSkill}`)) {
      return '';
    }

    const matched = candidate.matchedSkills.length > 0
      ? ` ${candidate.matchedSkills.slice(0, 2).join(', ')} evidence should be treated as partial or transferable only.`
      : ' Any fit should be treated as transferable or incomplete until a recruiter verifies that requirement.';
    return `${warning}${matched}`;
  }

  private primaryMissingRequirement(missingSkills: readonly string[]): string | null {
    if (missingSkills.length === 0) {
      return null;
    }

    const priority = [
      'Technical recruitment',
      'Software engineering hiring',
      'B2B SaaS sales',
      'Enterprise sales',
      'CRM pipeline management',
      'Quota ownership',
      'Technical presales',
      'FP&A',
      'Budgeting',
      'Forecasting',
      'Performance marketing',
      'Paid ads',
      'Google Ads',
      'Meta Ads',
      'Customer success',
      'Product adoption',
      'Renewal management',
      'Automation testing',
      'Selenium',
      'Playwright',
      'Software project management',
      'Agile/Scrum',
      'Product owner',
      'Backlog management',
      'Data warehousing',
      'ETL',
      'Python',
      'FastAPI',
      'Django',
      'Flask',
      'Java',
      'Spring Boot',
      '.NET',
      '.NET Core',
      'C#',
      'Node.js',
      'React',
      'Angular',
      'Vue',
      'AWS',
      'Azure',
      'PostgreSQL',
      'SQL Server',
      'Design Patterns',
    ];
    return priority.find((skill) => missingSkills.some((missing) => missing.toLowerCase() === skill.toLowerCase()))
      ?? missingSkills[0];
  }

  private isRediscoverableCandidate(candidate: ManualCandidateSearchItem): boolean {
    const latestStatus = candidate.latestApplication?.status?.toLowerCase();
    return latestStatus !== 'joined' && latestStatus !== 'hired';
  }

  candidateReasonCaveat(candidate: ManualCandidateSearchItem): string {
    if (candidate.missingSkills.length > 0) {
      return `Gaps: ${candidate.missingSkills.slice(0, 3).join(', ')}`;
    }

    const latest = candidate.latestApplication;
    if (latest) {
      return `Latest: ${this.displayApplicationTitle(latest)} - ${latest.status}`;
    }

    return 'No prior application detail is linked.';
  }

  rediscoveryScoreBreakdown(match: TalentRediscoveryMatch): RediscoveryScoreMetric[] {
    const explanation = match.explanation ?? '';
    return [
      {
        label: 'Skill coverage',
        value: this.extractRationalePercent(explanation, /skill coverage score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'skill' as const,
        description: 'Direct overlap between this candidate profile and the required skills for the current job post.',
      },
      {
        label: 'Semantic match',
        value: this.extractRationalePercent(explanation, /vector similarity score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'semantic' as const,
        description: 'Vector similarity between the current requirement text and stored candidate profile, CV, cover-letter, and application evidence.',
      },
      {
        label: 'Interview outcome',
        value: this.extractRationalePercent(explanation, /historical outcome score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'history' as const,
        description: 'Strength of prior application outcomes and interview feedback, such as passed rounds, on-hold profiles, or non-fit rejections.',
      },
      {
        label: 'Similar role',
        value: this.extractRationalePercent(explanation, /similar-role score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'role' as const,
        description: 'How close the candidate previous applications are to this role title, department, client, and requested skills.',
      },
      {
        label: 'Experience and availability',
        value: this.extractRationalePercent(explanation, /experience\/availability score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'fit' as const,
        description: 'Fit between the required experience range and candidate experience plus notice-period availability.',
      },
    ].filter((metric): metric is RediscoveryScoreMetric => metric.value !== null);
  }

  applicantRankingScoreBreakdown(match: ApplicantRankingMatch): ApplicantRankingScoreMetric[] {
    const explanation = match.explanation ?? '';
    return [
      {
        label: 'Skill coverage',
        value: this.extractRationalePercent(explanation, /skill coverage score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'skill' as const,
        description: 'How much of the job post required skills are supported by this applicant profile, CV, cover letter, and application evidence.',
      },
      {
        label: 'Vector similarity',
        value: this.extractRationalePercent(explanation, /vector similarity score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'semantic' as const,
        description: 'Semantic similarity between the job requirement and the applicant profile, resume, cover letter, and parsed document evidence.',
      },
      {
        label: 'Experience and notice fit',
        value: this.extractRationalePercent(
          explanation,
          /(?:experience\/location\/notice fit|experience\/availability|experience and availability) score of\s+(\d+(?:\.\d+)?)%/i,
        ),
        tone: 'fit' as const,
        description: 'Fit between the role location, required experience, notice-period expectations, and the applicant available profile data.',
      },
      {
        label: 'Historical signal',
        value: this.extractRationalePercent(explanation, /historical (?:signal|outcome) score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'history' as const,
        description: 'Strength of prior application outcomes, interview results, and recruiter decisions for this applicant or similar roles.',
      },
      {
        label: 'Evidence completeness',
        value: this.extractRationalePercent(explanation, /evidence completeness score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'evidence' as const,
        description: 'How complete the current application evidence is, including resume, cover letter, parsed document text, and application metadata.',
      },
      {
        label: 'Application recency',
        value: this.extractRationalePercent(explanation, /application recency score of\s+(\d+(?:\.\d+)?)%/i),
        tone: 'recency' as const,
        description: 'How recent the current application is compared with older applicant or rediscovery signals.',
      },
    ].filter((metric): metric is ApplicantRankingScoreMetric => metric.value !== null);
  }

  private extractRationalePercent(explanation: string, pattern: RegExp): number | null {
    const match = explanation.match(pattern);
    if (!match?.[1]) {
      return null;
    }

    const parsed = Number.parseFloat(match[1]);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  candidateAiLabel(candidate: ManualCandidateSearchItem): string {
    const score = this.candidateAiScore(candidate);
    if (score >= 90) {
      return 'Strong fit';
    }
    if (score >= 80) {
      return 'Good fit';
    }
    if (score >= 70) {
      return 'Warm lead';
    }
    return 'Review';
  }

  candidateScoreTone(candidate: ManualCandidateSearchItem): string {
    const score = this.candidateAiScore(candidate);
    if (score >= 90) {
      return 'strong-fit';
    }
    if (score >= 80) {
      return 'good-fit';
    }
    if (score >= 70) {
      return 'warm-lead';
    }

    return 'review-fit';
  }

  applicantAiScore(ranking: ApplicantRankingMatch): number {
    return Math.min(100, Math.max(0, Math.round(ranking.score)));
  }

  applicantAiLabel(ranking: ApplicantRankingMatch): string {
    const score = this.applicantAiScore(ranking);
    if (score >= 90) {
      return 'Strong fit';
    }
    if (score >= 80) {
      return 'Good fit';
    }
    if (score >= 70) {
      return 'Warm lead';
    }

    return 'Review';
  }

  applicantAiTone(ranking: ApplicantRankingMatch): string {
    const score = this.applicantAiScore(ranking);
    if (score >= 90) {
      return 'strong-fit';
    }
    if (score >= 80) {
      return 'good-fit';
    }
    if (score >= 70) {
      return 'warm-lead';
    }

    return 'review-fit';
  }

  candidateInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'TP';
  }

  candidateKeySkills(candidate: ManualCandidateSearchItem): string[] {
    return Array.from(new Set([
      ...candidate.matchedSkills,
      ...candidate.skills,
    ]))
      .filter(Boolean)
      .slice(0, 4);
  }

  candidateActivityStatusLabel(candidate: ManualCandidateSearchItem): string {
    const latest = candidate.latestApplication;
    if (!latest) {
      return 'Profile';
    }

    return this.formatActivityStatus(latest.status);
  }

  candidateActivityStatusClass(candidate: ManualCandidateSearchItem): string {
    const status = (candidate.latestApplication?.status ?? 'profile')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (status === 'rejected') {
      return 'activity-status-chip rejected';
    }
    if (status === 'onhold') {
      return 'activity-status-chip on-hold';
    }
    if (status === 'offerdeclined') {
      return 'activity-status-chip offer-declined';
    }
    if (['applied', 'screening', 'shortlisted', 'interviewing', 'hiringmanagerreview', 'offered'].includes(status)) {
      return 'activity-status-chip active-application';
    }
    if (status === 'joined' || status === 'hired') {
      return 'activity-status-chip joined';
    }

    return 'activity-status-chip neutral';
  }

  candidateActivityTime(candidate: ManualCandidateSearchItem): string {
    const latest = candidate.latestApplication;
    if (!latest) {
      return 'Profile record';
    }

    return this.formatRelativeTime(latest.finalDecisionAt ?? latest.appliedAt);
  }

  candidateActivityTitle(candidate: ManualCandidateSearchItem): string {
    const latest = candidate.latestApplication;
    if (!latest) {
      return candidate.currentDesignation || 'Candidate profile';
    }

    return this.displayApplicationTitle(latest);
  }

  candidateActivitySource(candidate: ManualCandidateSearchItem): string {
    const latest = candidate.latestApplication;
    if (!latest) {
      return 'Candidate profile record';
    }

    return `via ${latest.sourceLabel || 'application history'}`;
  }

  private formatActivityStatus(status: string): string {
    const normalized = status.replace(/\s+/g, '').toLowerCase();
    const labels: Record<string, string> = {
      applied: 'Applied',
      screening: 'Screening',
      shortlisted: 'Shortlisted',
      interviewing: 'Interviewed',
      hiringmanagerreview: 'Final Review',
      offered: 'Offered',
      onhold: 'On Hold',
      offerdeclined: 'Offer Declined',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
      joined: 'Joined',
      hired: 'Hired',
    };

    return labels[normalized] ?? status.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  private compareAppliedAtDescending(left: RecruiterApplication, right: RecruiterApplication): number {
    return new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
  }

  private formatRelativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
      return 'recently';
    }

    const diffMs = Date.now() - timestamp;
    const diffDays = Math.max(0, Math.round(diffMs / 86_400_000));
    if (diffDays === 0) {
      return 'today';
    }
    if (diffDays === 1) {
      return '1 day ago';
    }
    if (diffDays < 30) {
      return `${diffDays} days ago`;
    }

    const diffMonths = Math.max(1, Math.round(diffDays / 30));
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }

  private interviewStatusToken(status: string): string {
    const normalized = status.replace(/\s+/g, '').toLowerCase();
    if (normalized.includes('notscheduled') || normalized.includes('unscheduled')) {
      return 'unscheduled';
    }
    if (normalized.includes('complete') || normalized.includes('pass')) {
      return 'completed';
    }
    if (normalized.includes('cancel') || normalized.includes('reject') || normalized.includes('fail')) {
      return 'failed';
    }
    if (normalized.includes('skip')) {
      return 'skipped';
    }
    if (normalized.includes('schedule')) {
      return 'scheduled';
    }

    return 'pending';
  }

  private truncateText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
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

  applicantRationaleStrengths(application: RecruiterApplication, match: ApplicantRankingMatch): string[] {
    const strengths = this.cleanRankingList(match.strengths);
    if (strengths.length > 0) {
      return strengths;
    }

    return this.cleanRankingList([
      `${application.candidateName} is ranked #${match.rank} with a ${this.applicantAiScore(match)}% AI match (${this.applicantAiLabel(match)}).`,
      application.currentDesignation ? `Current role evidence: ${application.currentDesignation}.` : '',
      application.experienceYears === null || application.experienceYears === undefined
        ? ''
        : `${this.formatExperience(application.experienceYears)} experience with ${this.formatNotice(application.noticePeriodDays)} notice.`,
      application.coverLetterText ? 'Cover letter text is available for reviewer context.' : '',
      application.isInvited ? 'Candidate was invited into this application flow.' : `Application source: ${application.sourceLabel}.`,
    ]);
  }

  applicantMatchedSkills(match: ApplicantRankingMatch): string[] {
    const storedSkills = this.cleanRankingList(match.matchedSkills);
    if (storedSkills.length > 0) {
      return storedSkills.slice(0, 8);
    }

    const explanation = [
      match.explanation,
      ...match.strengths,
      ...match.documentEvidence,
    ].join(' ').toLowerCase();
    return this.cleanRankingList(this.sourcing()?.jobRequest.skills ?? [])
      .filter((skill) => explanation.includes(skill.toLowerCase()))
      .slice(0, 8);
  }

  applicantRationaleGaps(application: RecruiterApplication, match: ApplicantRankingMatch): string[] {
    const explicitGaps = this.cleanRankingList([
      ...match.missingSkills.map((skill) => `Missing requested skill evidence: ${skill}.`),
      ...match.gaps,
    ]);
    if (explicitGaps.length > 0) {
      return explicitGaps;
    }

    const fallback = [];
    if (this.applicantMatchedSkills(match).length === 0) {
      fallback.push('Matched skill breakdown was not stored separately for this saved ranking run.');
    }
    if (this.isSemanticSimilarityUnavailable(match.semanticSimilarityStatus)) {
      fallback.push('Semantic similarity was unavailable; treat this as a directional AI ranking signal.');
    }
    fallback.push(
      this.applicantAiScore(match) >= 80
        ? 'No major gaps were flagged by AI; recruiter should still validate role, skills, and interview readiness.'
        : 'Review this applicant manually before progressing because the AI match score is below the good-fit threshold.',
    );

    if (!application.coverLetterText) {
      fallback.push('Cover letter text is not available in this application record.');
    }

    return this.cleanRankingList(fallback);
  }

  applicantDocumentEvidence(application: RecruiterApplication, match: ApplicantRankingMatch): string[] {
    const evidence = this.cleanRankingList(match.documentEvidence)
      .map((value) => this.sanitizeApplicantDocumentEvidence(value));
    const values = evidence.length > 0 ? evidence : [
      application.coverLetterText ? 'Cover letter submitted and available for review.' : 'No cover letter text is available.',
      `${application.sourceLabel} application submitted ${this.formatShortDate(application.appliedAt)}.`,
      application.sourceDetail ? `Source detail: ${application.sourceDetail}.` : '',
    ];

    const visibleValues = (application.documents?.length ?? 0) > 0
      ? values.filter((value) => !this.isDocumentEvidenceLine(value))
      : values;

    return this.cleanRankingList(visibleValues);
  }

  applicationDocuments(application: RecruiterApplication): RecruiterApplicationDocument[] {
    return application.documents ?? [];
  }

  applicationDocumentMeta(document: RecruiterApplicationDocument): string {
    const parts = [
      this.formatApplicationDocumentSize(document.sizeBytes),
      document.hasTextEvidence ? 'text parsed for semantic matching' : this.formatDocumentExtractionStatus(document.extractionStatus),
    ].filter(Boolean);

    return parts.join(' - ');
  }

  async downloadApplicationDocument(document: RecruiterApplicationDocument): Promise<void> {
    try {
      const response = await this.store.downloadRecruiterApplicationDocument(
        document.jobApplicationId,
        document.applicationDocumentId,
      );
      const blob = response.body;
      if (!blob) {
        throw new Error('The document response was empty.');
      }

      const fileName = this.fileNameFromContentDisposition(response.headers.get('content-disposition')) ??
        this.defaultApplicationDocumentFileName(document);
      this.fileDownloads.saveBlob(blob, fileName);
      this.message.set(`${document.displayName} download started.`);
      this.error.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Application document could not be downloaded.');
    }
  }

  private sanitizeApplicantDocumentEvidence(value: string): string {
    const withoutFileNames = value.replace(
      /\b[\w ().,\-]+\.(?:docx|doc|pdf|txt)\b/gi,
      'document',
    );

    return withoutFileNames
      .replace(/^Resume:\s*document/i, 'Resume document')
      .replace(/^CV:\s*document/i, 'Resume document')
      .replace(/\s+/g, ' ')
      .replace(/^document evidence:\s*/i, '')
      .trim();
  }

  private isDocumentEvidenceLine(value: string): boolean {
    const normalized = value.toLowerCase();
    return normalized.includes('document') ||
      normalized.includes('resume') ||
      normalized.includes('cv ') ||
      normalized.endsWith('cv') ||
      normalized.includes('cover letter');
  }

  private formatApplicationDocumentSize(sizeBytes: number): string {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return 'Size not available';
    }

    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private formatDocumentExtractionStatus(status: string | null | undefined): string {
    const normalized = (status ?? '').trim();
    if (!normalized) {
      return 'text status unavailable';
    }

    const compact = normalized.replace(/\s+/g, '').toLowerCase();
    if (compact.includes('complete') || compact.includes('success') || compact === 'parsed') {
      return 'text parsed';
    }
    if (compact.includes('pending') || compact.includes('processing')) {
      return 'text processing';
    }
    if (compact.includes('fail') || compact.includes('error')) {
      return 'text parsing failed';
    }

    return normalized.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  }

  private fileNameFromContentDisposition(header: string | null): string | null {
    if (!header) {
      return null;
    }

    const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1].trim());
    }

    const quotedMatch = header.match(/filename="([^"]+)"/i);
    if (quotedMatch?.[1]) {
      return quotedMatch[1].trim();
    }

    const plainMatch = header.match(/filename=([^;]+)/i);
    return plainMatch?.[1]?.trim() || null;
  }

  private defaultApplicationDocumentFileName(document: RecruiterApplicationDocument): string {
    const extension = document.contentType.includes('pdf')
      ? '.pdf'
      : document.contentType.includes('wordprocessingml') || document.contentType.includes('msword')
        ? '.docx'
        : '';
    const displayName = document.displayName.trim() || document.documentType || 'Application document';
    return extension && displayName.toLowerCase().endsWith(extension) ? displayName : `${displayName}${extension}`;
  }

  applicantHistoryEvidence(application: RecruiterApplication, match: ApplicantRankingMatch): string[] {
    const evidence = this.cleanRankingList(match.historicalOutcomeEvidence);
    if (evidence.length > 0) {
      return evidence;
    }

    if (application.interviews.length > 0) {
      return application.interviews.map((interview) => {
        const recommendation = interview.recommendation ? ` Recommendation: ${interview.recommendation}.` : '';
        return `${interview.roundName} - ${interview.status} - ${this.formatInterviewSchedule(interview.startsAt)}.${recommendation}`;
      });
    }

    return [`${application.interviewPassSummary || '0/0 passed'}. No interview evidence is recorded for this application yet.`];
  }

  applicantSemanticNote(match: ApplicantRankingMatch): string {
    const status = this.semanticSimilarityStatusLabel(match.semanticSimilarityStatus);
    if (this.isSemanticSimilarityUnavailable(match.semanticSimilarityStatus)) {
      return `Semantic similarity: ${status}; ranking used application, profile, and workflow evidence.`;
    }

    return `Semantic similarity: ${status}.`;
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

  private cleanRankingList(values: readonly string[]): string[] {
    return Array.from(new Set(values
      .map((value) => value.trim())
      .filter(Boolean)));
  }

  private semanticSimilarityStatusLabel(status: string | null | undefined): string {
    const value = status?.trim();
    if (!value) {
      return 'Not run';
    }

    const normalized = value.toLowerCase();
    if (!normalized.startsWith('unavailable')) {
      return value;
    }

    if (
      normalized.includes('actively refused') ||
      normalized.includes('connection refused') ||
      normalized.includes('no connection could be made') ||
      normalized.includes('localhost:11434')
    ) {
      return 'Unavailable: embedding service is not reachable. Start or reconnect Ollama, then rerun applicant ranking';
    }

    return value.replace(/^unavailable\s*:\s*/i, 'Unavailable: ');
  }

  private isSemanticSimilarityUnavailable(status: string | null | undefined): boolean {
    return (status ?? '').trim().toLowerCase().startsWith('unavailable');
  }

  private formatShortDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'date not recorded';
    }

    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
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

  scheduleEligibility(application: RecruiterApplication): ScheduleEligibility {
    if (!this.canManageApplications()) {
      return {
        status: 'blocked',
        actionLabel: this.isCurrentJobPostClosed() ? 'Post closed' : 'Publish post first',
        message: this.applicationManagementDisabledReason(),
      };
    }

    const rounds = this.activeInterviewRounds();
    if (rounds.length === 0) {
      return {
        status: 'complete',
        actionLabel: 'No active rounds',
        message: 'This job post has no active interview rounds configured.',
      };
    }

    const roundsWithIds = rounds.filter((round) => !!round.jobPostInterviewRoundId);
    const allRoundsScheduledOrResolved = roundsWithIds.length > 0 && roundsWithIds.every((round) =>
      application.interviews.some((interview) =>
        interview.jobPostInterviewRoundId === round.jobPostInterviewRoundId &&
        !['cancelled', 'canceled'].includes(this.normalizeStatus(interview.status))));
    if (allRoundsScheduledOrResolved) {
      return {
        status: 'complete',
        actionLabel: 'All rounds scheduled',
        message: 'All active interview rounds are already scheduled, completed, or skipped.',
      };
    }

    for (const round of rounds) {
      if (!round.jobPostInterviewRoundId) {
        continue;
      }

      const interviewsForRound = application.interviews
        .filter((interview) => interview.jobPostInterviewRoundId === round.jobPostInterviewRoundId);
      if (interviewsForRound.some((interview) => this.isResolvedInterviewStatus(interview.status))) {
        continue;
      }

      const blockingInterview = interviewsForRound
        .find((interview) => this.isPendingInterviewStatus(interview.status));
      if (blockingInterview) {
        return {
          status: 'blocked',
          actionLabel: `Complete ${round.name} first`,
          message: `${round.name} is ${this.interviewStatusLabel(blockingInterview.status)}. Complete or skip this round before scheduling the next interview.`,
          blockingRound: round,
        };
      }

      if (!round.ownerUserId) {
        return {
          status: 'blocked',
          actionLabel: `Assign ${round.name} interviewer`,
          message: `${round.name} needs a default interviewer before it can be scheduled.`,
          blockingRound: round,
        };
      }

      return {
        status: 'eligible',
        actionLabel: `Schedule ${round.name}`,
        message: `${round.name} is the next interview round to schedule.`,
        round,
      };
    }

    return {
      status: 'complete',
      actionLabel: 'All rounds complete',
      message: 'All active interview rounds are already completed or skipped.',
    };
  }

  scheduleModalRound(application: RecruiterApplication): JobPostInterviewRound | undefined {
    const eligibility = this.scheduleEligibility(application);
    return eligibility.status === 'eligible' ? eligibility.round : undefined;
  }

  private isResolvedInterviewStatus(status: string): boolean {
    return ['completed', 'skipped'].includes(this.normalizeStatus(status));
  }

  private isPendingInterviewStatus(status: string): boolean {
    return !['completed', 'skipped', 'cancelled', 'canceled'].includes(this.normalizeStatus(status));
  }

  private interviewStatusLabel(status: string): string {
    return this.formatActivityStatus(status).toLowerCase();
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
    const assignment = sourcing?.assignment;
    if (!sourcing || !assignment || !['Pending', 'Claimed'].includes(assignment.status)) {
      return false;
    }

    const userId = this.auth.currentUser()?.id;
    return this.auth.isAdmin() ||
      (!!userId && (assignment.claimedByUserId === userId || assignment.assignedToUserId === userId));
  }

  isReadOnlySourcing(): boolean {
    return !!this.sourcing() && !this.canUseSourcingAssignment();
  }

  private hydrateForm(sourcing: RecruiterSourcing): void {
    this.postSkillSearch.set('');
    this.postActiveSkillGroup.set(DEFAULT_SKILL_GROUP_LABEL);
    this.roundInterviewerDepartmentFilters = {};
    this.roundInterviewerSearches = {};

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
      onlineHeadhunting: this.normalizeOnlineHeadhunting(sourcing.onlineHeadhunting),
      interviewTemplates: sourcing.interviewTemplates ?? [],
      interviewers: (sourcing.interviewers ?? []).map((interviewer) => ({
        ...interviewer,
        roleNames: interviewer.roleNames ?? [],
      })),
      hodInterviewers: sourcing.hodInterviewers ?? [],
      skills: sourcing.skills ?? [],
    };
  }

  private normalizeOnlineHeadhunting(onlineHeadhunting: RecruiterSourcing['onlineHeadhunting']): OnlineHeadhuntingResult | null {
    if (!onlineHeadhunting) {
      return null;
    }

    return {
      ...onlineHeadhunting,
      run: {
        ...onlineHeadhunting.run,
        sourceCodes: onlineHeadhunting.run?.sourceCodes ?? [],
        queries: onlineHeadhunting.run?.queries ?? [],
      },
      leads: (onlineHeadhunting.leads ?? []).map((lead) => ({
        ...lead,
        strengths: lead.strengths ?? [],
        matchedSkills: lead.matchedSkills ?? [],
        gaps: lead.gaps ?? [],
        missingData: lead.missingData ?? [],
      })),
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
      parsedCvEvidence: this.manualCandidateForm.parsedCvEvidence,
      onlineLeadId: this.blankToNull(this.manualCandidateForm.onlineLeadId),
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
      parsedCvEvidence: null,
      onlineLeadId: '',
    };
  }

  private emptyScheduleForm(): ScheduleInterviewForm {
    return {
      jobApplicationId: '',
      jobPostInterviewRoundId: '',
      startsAtLocal: '',
      locationText: '',
    };
  }

  private defaultInvitationMessage(jobTitle?: string): string {
    const companyName = this.auth.currentUser()?.tenantDisplayName || 'Our company';
    const title = jobTitle || this.sourcing()?.jobPost?.title || this.sourcing()?.jobRequest.title || 'a new role';
    const portalLink = this.candidatePortalJobLink();
    return `${companyName} is looking for ${title}. If you are interested, please apply on our job portal: ${portalLink}`;
  }

  private candidatePortalJobLink(): string {
    const jobPostId = this.sourcing()?.jobPost?.jobPostId;
    const portalPath = jobPostId
      ? `/candidate/jobs/${encodeURIComponent(jobPostId)}?source=invite`
      : '/candidate/jobs?source=invite';

    return `${this.appOrigin()}${portalPath}`;
  }

  private appOrigin(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }

    return '';
  }

  private isTrackedInvitationUrl(value: string): boolean {
    try {
      const url = new URL(value, this.appOrigin() || 'http://localhost:4200');
      return url.pathname.includes('/candidate/jobs/')
        && url.searchParams.get('source')?.toLowerCase() === 'invite'
        && url.searchParams.has('inviteId')
        && url.searchParams.has('token');
    } catch {
      return false;
    }
  }

  private applyParsedCv(parsed: ParseCandidateCvResult): void {
    const parsedSkillIds = this.skillIdsForNames(parsed.skills ?? []);

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
      parsedCvEvidence: {
        fileName: parsed.fileName,
        contentType: parsed.contentType,
        sizeBytes: parsed.sizeBytes,
        contentHashSha256: parsed.contentHashSha256,
        extractedText: parsed.extractedText,
        summary: parsed.summary,
        agentRunId: parsed.agentRunId,
        model: parsed.model,
        parsedAtUtc: parsed.generatedAtUtc,
      },
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

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseMessage = error.error?.message;
      if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
      }

      if (error.status === 0) {
        return 'Unable to reach the server. Check the API connection.';
      }
    }

    return error instanceof Error && error.message ? error.message : fallback;
  }

  isGoogleCalendarScheduleError(): boolean {
    const message = this.scheduleError().toLowerCase();
    return message.includes('google calendar');
  }

  private numberOrNull(value: number | null | undefined): number | null {
    return value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value);
  }

  private markApplicationForwarded(jobApplicationId: string): void {
    const sourcing = this.sourcing();
    if (!sourcing) {
      return;
    }

    this.sourcing.set({
      ...sourcing,
      applications: sourcing.applications.map((application) =>
        application.jobApplicationId === jobApplicationId
          ? { ...application, applicationStatus: 'HiringManagerReview' }
          : application,
      ),
    });
  }

  private clearStatus(): void {
    this.message.set('');
    this.error.set('');
  }
}
