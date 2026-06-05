import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { formatActivityTitle } from '../../core/activity-formatting';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import {
  JobPostListItem,
  JobRequest,
  JobRequestStage,
  InterviewTask,
  HiringManagerDashboard,
  HiringManagerDashboardAgingBucket,
  HiringManagerDashboardStatusBreakdownItem,
  ApplicantRankingMatch,
  PmoDashboard,
  PmoDashboardAgingBucket,
  PmoDashboardDecisionSplit,
  PmoDashboardRecommendationTrendItem,
  PmoDashboardSkillBenchItem,
  RecruiterSourcing,
  RecruitmentQueueItem,
  TenantAdminDashboard,
  TenantAdminDashboardAttentionItem,
  TenantAdminDashboardFunnelItem,
  TenantAdminDashboardPipelineItem,
  WorkflowAssignment,
} from '../../core/models';
import {
  CandidateOperationsApplication,
  CandidateOperationsDataService,
  CandidateOperationsDataset,
  CandidateOperationsInterview,
} from './candidate-operations-data.service';

interface PresalesActionItem {
  jobRequest: JobRequest;
  assignment?: WorkflowAssignment;
  lastActivityAt: string;
}

interface RecruiterActiveJobPost {
  post: JobPostListItem;
  totalApplicants: number;
  activeApplicants: number;
  latestApplicationAt?: string | null;
}

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, RouterLink],
  template: `
    @if (isTenantAdmin()) {
      <main class="page ops-page dashboard-page admin-dashboard-page">
        <header class="ops-page-header admin-dashboard-header">
          <div>
            <p class="eyebrow">Admin Center / Tenant Management</p>
            <h1>Tenant Admin Dashboard</h1>
            <p>Recruitment health across job requests, job posts, candidates, interviews, offers, and AI activity.</p>
            @if (adminDashboard(); as dashboard) {
              <small>Last refreshed {{ formatDateTime(dashboard.generatedAtUtc) }}</small>
            }
          </div>
        </header>

        @if (adminDashboard(); as dashboard) {
          <section class="ops-panel admin-dashboard-filters" aria-label="Dashboard filters">
            <label>
              From
              <input type="date" [(ngModel)]="filterFromDate" (change)="loadAdminDashboard()" />
            </label>
            <label>
              To
              <input type="date" [(ngModel)]="filterToDate" (change)="loadAdminDashboard()" />
            </label>
            <label>
              Department
              <select [(ngModel)]="filterDepartmentId" (change)="loadAdminDashboard()">
                <option value="">All departments</option>
                @for (department of dashboard.filters.departments; track department.id) {
                  <option [value]="department.id">{{ department.name }}</option>
                }
              </select>
            </label>
            <label>
              Source
              <select [(ngModel)]="filterSourceLabel" (change)="loadAdminDashboard()">
                <option value="">All sources</option>
                @for (source of dashboard.filters.sourceLabels; track source.id) {
                  <option [value]="source.name">{{ source.name }}</option>
                }
              </select>
            </label>
            <label>
              Recruiter
              <select [(ngModel)]="filterRecruiterUserId" (change)="loadAdminDashboard()">
                <option value="">All recruiters</option>
                @for (recruiter of dashboard.filters.recruiters; track recruiter.id) {
                  <option [value]="recruiter.id">{{ recruiter.name }}</option>
                }
              </select>
            </label>
            <button class="btn secondary compact" type="button" (click)="clearAdminFilters()">Reset</button>
          </section>

          @if (adminError()) {
            <p class="field-status error">{{ adminError() }}</p>
          }

          <section class="admin-kpi-grid">
            <a class="admin-kpi-card" routerLink="/app/job-requests">
              <span>Open job requests</span>
              <strong>{{ dashboard.summary.openJobRequests }}</strong>
              <small>{{ dashboard.summary.openPositions }} open positions</small>
            </a>
            <a class="admin-kpi-card" routerLink="/app/job-requests">
              <span>Open / filled positions</span>
              <strong>{{ dashboard.summary.openPositions }} / {{ dashboard.summary.fulfilledPositions }}</strong>
              <small>{{ dashboard.summary.requiredPositions }} required total</small>
            </a>
            <a class="admin-kpi-card" routerLink="/app/job-publishing">
              <span>Published job posts</span>
              <strong>{{ dashboard.summary.publishedJobPosts }}</strong>
              <small>Visible on candidate portal</small>
            </a>
            <a class="admin-kpi-card" routerLink="/app/candidates">
              <span>Active applications</span>
              <strong>{{ dashboard.summary.activeApplications }}</strong>
              <small>Non-terminal applications</small>
            </a>
            <a class="admin-kpi-card" routerLink="/app/interview-scheduling">
              <span>Interviews this week</span>
              <strong>{{ dashboard.summary.interviewsThisWeek }}</strong>
              <small>Scheduled next 7 days</small>
            </a>
            <a class="admin-kpi-card" routerLink="/app/offer-onboarding">
              <span>Offers / joined</span>
              <strong>{{ dashboard.summary.offers }} / {{ dashboard.summary.joinedCandidates }}</strong>
              <small>Within selected range</small>
            </a>
          </section>

          <section class="admin-dashboard-grid">
            <article class="ops-panel admin-panel admin-funnel-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Hiring Funnel Performance</h2>
                    <span class="agent-help admin-analytics-help">
                      <button
                        type="button"
                        class="agent-help-trigger"
                        aria-label="What Hiring Funnel Performance means"
                        aria-describedby="admin-hiring-funnel-help"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="admin-hiring-funnel-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Shows how tenant hiring work is distributed across each major stage.</span>
                        <span>Large counts in one stage point to where requests or candidates may be accumulating.</span>
                        <span>Conversion percentages compare that stage with the request baseline so admins can spot drop-offs.</span>
                      </span>
                    </span>
                  </div>
                  <p>Current stage counts plus date-bound candidate movement.</p>
                </div>
                <a routerLink="/app/job-requests">All requests</a>
              </div>
              @if (dashboard.hiringFunnel.length > 0) {
                <div class="admin-funnel-list">
                  @for (item of dashboard.hiringFunnel; track item.label) {
                    <a class="admin-funnel-row" [routerLink]="routeForFunnel(item)">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.count }}</strong>
                      <i [style.width.%]="funnelWidth(item, dashboard.hiringFunnel)"></i>
                      <small>{{ formatPercent(item.conversionRate) }} conversion</small>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state">No funnel activity exists for this tenant yet.</div>
              }
            </article>

            <aside class="ops-panel admin-panel admin-attention-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Admin Attention</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Admin Attention means"
                      aria-describedby="admin-attention-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-attention-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Highlights configuration or operational gaps that need tenant admin action.</span>
                      <span>These items usually block clean routing, candidate progress, or timely feedback.</span>
                      <span>Use this panel as the admin exception queue before reviewing broader analytics.</span>
                    </span>
                  </span>
                </div>
              </div>
              <div class="admin-attention-list">
                @for (item of dashboard.adminAttention; track item.title) {
                  <a [routerLink]="item.route" [class]="attentionClass(item)">
                    <strong>{{ item.count }}</strong>
                    <span>{{ item.title }}</span>
                    <small>{{ item.detail }}</small>
                  </a>
                }
              </div>
            </aside>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Offer & Fulfillment Health</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Offer and Fulfillment Health means"
                      aria-describedby="admin-offer-health-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-offer-health-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Tracks the final hiring phase after interviews are complete.</span>
                      <span>It shows offer drafts, presentation meetings, candidates offered, joined, or kept on hold.</span>
                      <span>Open positions remaining indicates whether hiring demand is still unmet.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/app/offer-onboarding">Offer outcome</a>
              </div>
              <div class="admin-metric-mini-grid">
                <span><strong>{{ dashboard.offerHealth.offerLetters }}</strong> offer drafts</span>
                <span><strong>{{ dashboard.offerHealth.presentationMeetings }}</strong> meetings</span>
                <span><strong>{{ dashboard.offerHealth.offered }}</strong> offered</span>
                <span><strong>{{ dashboard.offerHealth.onHold }}</strong> on hold</span>
                <span><strong>{{ dashboard.offerHealth.joined }}</strong> joined</span>
                <span><strong>{{ dashboard.offerHealth.openPositionsRemaining }}</strong> positions open</span>
              </div>
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Candidate Pipeline Breakdown</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Candidate Pipeline Breakdown means"
                      aria-describedby="admin-candidate-pipeline-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-candidate-pipeline-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Summarizes current candidate application statuses across the tenant.</span>
                      <span>It helps admins see whether candidates are mostly applying, interviewing, waiting for review, offered, or closed out.</span>
                      <span>Uneven distribution can reveal process delays or sourcing quality issues.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/app/candidates">Candidates</a>
              </div>
              @if (dashboard.candidatePipeline.length > 0) {
                <div class="admin-pipeline-list">
                  @for (item of dashboard.candidatePipeline; track item.status) {
                    <div class="admin-pipeline-row">
                      <span>{{ statusLabel(item.status) }}</span>
                      <strong>{{ item.count }}</strong>
                      <i [style.width.%]="pipelineWidth(item, dashboard.candidatePipeline)"></i>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No active candidate pipeline data yet.</div>
              }
            </article>

            <article class="ops-panel admin-panel admin-wide-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Efficiency & Workload Metrics</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Efficiency and Workload Metrics mean"
                      aria-describedby="admin-efficiency-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-efficiency-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Measures how quickly work moves and where operational load currently sits.</span>
                      <span>Time-to-fill and days-open values indicate speed; PMO, recruiter, and HM counts indicate workload.</span>
                      <span>High workload plus long aging points to likely capacity or process bottlenecks.</span>
                    </span>
                  </span>
                </div>
                <span class="status-badge">Database backed</span>
              </div>
              <div class="admin-efficiency-grid">
                <span><strong>{{ valueOrDash(dashboard.operationalEfficiency.averageTimeToFillDays) }}</strong> avg days to fill</span>
                <span><strong>{{ valueOrDash(dashboard.operationalEfficiency.medianDaysOpen) }}</strong> median days open</span>
                <span><strong>{{ dashboard.operationalEfficiency.oldestOpenRequestDays }}</strong> oldest open days</span>
                <span><strong>{{ dashboard.operationalEfficiency.pmoQueueLoad }}</strong> PMO load</span>
                <span><strong>{{ dashboard.operationalEfficiency.recruiterSourcingLoad }}</strong> recruiter load</span>
                <span><strong>{{ dashboard.operationalEfficiency.hiringManagerPendingReviews }}</strong> HM reviews</span>
              </div>
            </article>

            <article class="ops-panel admin-panel admin-wide-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Stage Aging & Bottlenecks</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Stage Aging and Bottlenecks mean"
                      aria-describedby="admin-stage-aging-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-stage-aging-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Lists open requests that have spent time in their current stage.</span>
                      <span>Longer aging and higher risk indicate requests that may need admin follow-up.</span>
                      <span>This is the fastest way to find stuck PMO, recruiter, interview, or offer work.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/app/job-requests">Open requests</a>
              </div>
              @if (dashboard.stageAging.length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Current stage</th>
                        <th>Owner</th>
                        <th>Days</th>
                        <th>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (request of dashboard.stageAging; track request.jobRequestId) {
                        <tr>
                          <td><a [routerLink]="['/app/job-requests', request.jobRequestId]">{{ request.requestCode }}</a></td>
                          <td>{{ request.title }}</td>
                          <td>{{ request.department }}</td>
                          <td>{{ request.currentStage }}</td>
                          <td>{{ request.ownerName }}</td>
                          <td>{{ request.daysInStage }}</td>
                          <td><span [class]="riskClass(request.risk)">{{ request.risk }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">No aging risk for open requests.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Department Performance</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Department Performance means"
                      aria-describedby="admin-department-performance-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-department-performance-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Compares demand and hiring progress by department.</span>
                      <span>Requests and open positions show demand; applications and joined counts show supply and outcomes.</span>
                      <span>Departments with demand but low movement may need sourcing or routing attention.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.departmentPerformance.length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table compact">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Requests</th>
                        <th>Open pos.</th>
                        <th>Apps</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (department of dashboard.departmentPerformance; track department.department) {
                        <tr>
                          <td>{{ department.department }}</td>
                          <td>{{ department.openRequests }}</td>
                          <td>{{ department.openPositions }}</td>
                          <td>{{ department.applications }}</td>
                          <td>{{ department.joined }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">No department activity yet.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Skills Demand</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Skills Demand means"
                      aria-describedby="admin-skills-demand-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-skills-demand-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows which skills are repeatedly requested in active hiring work.</span>
                      <span>The bar compares each skill against the highest-demand skill in the current tenant snapshot.</span>
                      <span>The count compares demand against active candidate profiles with that skill. High demand with low candidate availability is a sourcing risk.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.skillsDemand.length > 0) {
                <div class="admin-skill-list">
                  @for (skill of dashboard.skillsDemand; track skill.skill) {
                    <div>
                      <span>{{ skill.skill }}</span>
                      <i [style.width.%]="skillDemandWidth(skill.demandCount, dashboard.skillsDemand)"></i>
                      <small>{{ skill.demandCount }} demand / {{ skill.candidateCount }} candidates</small>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No active request skills to report.</div>
              }
            </article>

            <article class="ops-panel admin-panel admin-wide-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Source Quality Analysis</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Source Quality Analysis means"
                      aria-describedby="admin-source-quality-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-source-quality-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows which candidate sources produce useful hiring outcomes.</span>
                      <span>Interview pass, offer, joined, and rejection rates help compare Job Portal, LinkedIn, referrals, rediscovery, and manual sourcing.</span>
                      <span>Strong sources should receive more recruiter attention; weak sources may need process or targeting changes.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/app/candidates">Candidate pool</a>
              </div>
              @if (dashboard.sourceQuality.length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Applications</th>
                        <th>Interview pass</th>
                        <th>Offers</th>
                        <th>Joined</th>
                        <th>Rejected / withdrawn</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (source of dashboard.sourceQuality; track source.sourceLabel) {
                        <tr>
                          <td>{{ source.sourceLabel }}</td>
                          <td>{{ source.applications }}</td>
                          <td>{{ formatPercent(source.interviewPassRate) }}</td>
                          <td>{{ source.offers }}</td>
                          <td>{{ source.joined }}</td>
                          <td>{{ formatPercent(source.rejectionWithdrawalRate) }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">No application source data in the selected range.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Interview Operations</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What Interview Operations means"
                      aria-describedby="admin-interview-operations-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-interview-operations-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Tracks interview execution and feedback discipline.</span>
                      <span>Scheduled and completed counts show throughput; skipped and no-show counts show exceptions.</span>
                      <span>Pending or overdue feedback delays recruiter and hiring-manager decisions.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/app/interview-feedback">Feedback</a>
              </div>
              <div class="admin-health-grid">
                <span><strong>{{ dashboard.interviewOperations.scheduled }}</strong> scheduled</span>
                <span><strong>{{ dashboard.interviewOperations.completed }}</strong> completed</span>
                <span><strong>{{ dashboard.interviewOperations.skipped }}</strong> skipped</span>
                <span><strong>{{ dashboard.interviewOperations.noShow }}</strong> no-show</span>
                <span class="danger"><strong>{{ dashboard.interviewOperations.pendingFeedback }}</strong> pending feedback</span>
                <span class="danger"><strong>{{ dashboard.interviewOperations.overdueFeedback }}</strong> overdue</span>
              </div>
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>AI Health</h2>
                  <span class="agent-help admin-analytics-help">
                    <button
                      type="button"
                      class="agent-help-trigger"
                      aria-label="What AI Health means"
                      aria-describedby="admin-ai-health-help"
                    >
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="admin-ai-health-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows whether advisory AI agents and embeddings are being used successfully.</span>
                      <span>Runs and failed runs expose runtime health; active vectors show semantic-search coverage.</span>
                      <span>Low vector coverage means AI recommendations have less stored context to compare against.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/admin-center/ai-settings">AI Settings</a>
              </div>
              <div class="admin-ai-grid">
                <span><strong>{{ dashboard.aiHealth.runsToday }}</strong> runs today</span>
                <span><strong>{{ dashboard.aiHealth.failedRuns }}</strong> failed runs</span>
                <span><strong>{{ dashboard.aiHealth.activeEmbeddings }}</strong> active vectors</span>
                <span><strong>{{ dashboard.aiHealth.candidateEmbeddings }}</strong> candidate vectors</span>
                <span><strong>{{ dashboard.aiHealth.jobRequestEmbeddings + dashboard.aiHealth.jobPostEmbeddings }}</strong> requirement vectors</span>
                <span><strong>{{ dashboard.aiHealth.employeeEmbeddings }}</strong> employee vectors</span>
              </div>
              <p class="admin-muted">
                Bench: {{ formatDateTime(dashboard.aiHealth.latestBenchMatchingAt) }}.
                Rediscovery: {{ formatDateTime(dashboard.aiHealth.latestTalentRediscoveryAt) }}.
              </p>
            </article>
          </section>
        } @else if (adminLoading()) {
          <section class="ops-panel empty-state">Loading tenant analytics...</section>
        } @else {
          <section class="ops-panel empty-state">
            <strong>Tenant analytics could not be loaded.</strong>
            <p>{{ adminError() ?? 'Try refreshing the dashboard.' }}</p>
          </section>
        }
      </main>
    } @else if (isPmoOnly()) {
      <main class="page ops-page dashboard-page pmo-dashboard-page">
        <header class="ops-page-header pmo-dashboard-header">
          <div>
            <p class="eyebrow">PMO workspace</p>
            <h1>PMO Review Dashboard</h1>
            <p>Prioritize PMO Review work, bench fit, and Presales recommendation outcomes.</p>
            @if (pmoDashboard(); as dashboard) {
              <small>Last refreshed {{ formatDateTime(dashboard.generatedAtUtc) }}</small>
            }
          </div>
        </header>

        @if (pmoDashboard(); as dashboard) {
          <section class="ops-panel pmo-dashboard-filters" aria-label="PMO dashboard filters">
            <label>
              From
              <input type="date" [(ngModel)]="pmoFromDate" (change)="loadPmoDashboard()" />
            </label>
            <label>
              To
              <input type="date" [(ngModel)]="pmoToDate" (change)="loadPmoDashboard()" />
            </label>
            <label>
              Department
              <select [(ngModel)]="pmoDepartmentId" (change)="loadPmoDashboard()">
                <option value="">All PMO departments</option>
                @for (department of dashboard.filters.departments; track department.id) {
                  <option [value]="department.id">{{ department.name }}</option>
                }
              </select>
            </label>
            <button class="btn secondary compact" type="button" (click)="clearPmoFilters()">Reset</button>
          </section>

          @if (pmoError()) {
            <p class="field-status error">{{ pmoError() }}</p>
          }

          <section class="pmo-kpi-grid">
            <a class="pmo-kpi-card attention" routerLink="/app/pmo/queue">
              <span class="material-symbols-outlined" aria-hidden="true">assignment_late</span>
              <div>
                <small>Unclaimed reviews</small>
                <strong>{{ dashboard.summary.unclaimedReviews }}</strong>
                <p>Group-routed PMO work waiting for ownership.</p>
              </div>
            </a>
            <a class="pmo-kpi-card" routerLink="/app/pmo/queue">
              <span class="material-symbols-outlined" aria-hidden="true">assignment_ind</span>
              <div>
                <small>My claimed reviews</small>
                <strong>{{ dashboard.summary.myClaimedReviews }}</strong>
                <p>PMO Review items currently owned by you.</p>
              </div>
            </a>
            <a class="pmo-kpi-card" routerLink="/app/pmo/queue">
              <span class="material-symbols-outlined" aria-hidden="true">reply</span>
              <div>
                <small>Returned from Presales</small>
                <strong>{{ dashboard.summary.returnedFromPresales }}</strong>
                <p>Recommendation decisions that came back in the selected window.</p>
              </div>
            </a>
            <a class="pmo-kpi-card" routerLink="/app/pmo/queue">
              <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              <div>
                <small>AI-ranked requests</small>
                <strong>{{ dashboard.summary.aiRankedRequests }}</strong>
                <p>Requests with saved Bench Matching results.</p>
              </div>
            </a>
            <a class="pmo-kpi-card success" routerLink="/app/pmo/queue">
              <span class="material-symbols-outlined" aria-hidden="true">recommend</span>
              <div>
                <small>Recommended to Presales</small>
                <strong>{{ dashboard.summary.recommendedToPresales }}</strong>
                <p>Requests where PMO sent internal employees for review.</p>
              </div>
            </a>
            <a class="pmo-kpi-card" routerLink="/app/recruitment/queue">
              <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
              <div>
                <small>Forwarded to recruiters</small>
                <strong>{{ dashboard.summary.forwardedToRecruiters }}</strong>
                <p>Requests PMO handed to recruiting after internal review.</p>
              </div>
            </a>
          </section>

          <section class="pmo-dashboard-grid">
            <article class="ops-panel pmo-panel pmo-workqueue-panel pmo-wide-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Priority PMO Review Queue</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Priority PMO Review Queue means" aria-describedby="pmo-workqueue-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="pmo-workqueue-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Shows PMO-visible pending group work and reviews you already claimed.</span>
                        <span>Older items and unclaimed items should be handled first so Presales is not blocked.</span>
                        <span>The CTA opens the review workspace where ownership, AI ranking, recommendations, or recruiter handoff happen.</span>
                      </span>
                    </span>
                  </div>
                  <p>Only active PMO Review assignments visible to your role are shown.</p>
                </div>
                <a routerLink="/app/pmo/queue">PMO Queue</a>
              </div>
              @if (dashboard.workQueue.length > 0) {
                <div class="pmo-work-table">
                  <div class="pmo-work-table-head">
                    <span>Request</span>
                    <span>Department</span>
                    <span>Owner</span>
                    <span>Bench context</span>
                    <span>Action</span>
                  </div>
                  @for (item of dashboard.workQueue; track item.assignmentId) {
                    <div class="pmo-work-row">
                      <span>
                        <strong>{{ item.requestCode }}</strong>
                        <small>{{ item.title }} - {{ item.client }}</small>
                        <small>{{ item.priority }} priority - {{ item.daysWaiting }} day(s) waiting</small>
                      </span>
                      <span>
                        <strong>{{ item.department }}</strong>
                        <small>{{ item.location }}</small>
                      </span>
                      <span>
                        <strong>{{ item.ownerState }}</strong>
                        <small>{{ item.latestAction }}</small>
                      </span>
                      <span>
                        <strong>{{ formatScore(item.topFitScore) }}</strong>
                        <small>{{ item.eligibleEmployeeCount }} eligible / {{ item.pendingReferralCount }} referral(s) pending</small>
                      </span>
                      <a class="btn primary compact" [routerLink]="['/app/pmo/review', item.jobRequestId]">{{ item.cta }}</a>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No PMO Review work is currently visible for you.</div>
              }
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Bench Matching Insights</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Bench Matching Insights means" aria-describedby="pmo-bench-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-bench-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Summarizes latest Bench Matching AI context for active PMO reviews.</span>
                      <span>Eligible employees and location fit help PMO judge whether internal fulfillment is realistic.</span>
                      <span>Open skill gaps point to requests that may need recruiter handoff.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.benchInsights.length > 0) {
                <div class="pmo-bench-list">
                  @for (item of dashboard.benchInsights; track item.jobRequestId) {
                    <a class="pmo-bench-row" [routerLink]="['/app/pmo/review', item.jobRequestId]">
                      <span>
                        <strong>{{ item.requestCode }} - {{ item.title }}</strong>
                        <small>{{ item.aiStatus }} · {{ formatDateTime(item.latestRankedAt) }}</small>
                      </span>
                      <span>
                        <strong>{{ formatScore(item.topFitScore) }}</strong>
                        <small>{{ item.topEmployeeName || 'No ranked employee yet' }}</small>
                      </span>
                      <span>
                        <strong>{{ item.eligibleEmployeeCount }}</strong>
                        <small>{{ item.locationFitCount }} location fit · {{ item.openSkillGaps }} gap(s)</small>
                      </span>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state">Run Bench Matching AI from PMO Review to populate this panel.</div>
              }
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Recommendation Outcomes</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Recommendation Outcomes mean" aria-describedby="pmo-outcomes-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-outcomes-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Tracks how Presales responded to PMO internal employee recommendations.</span>
                      <span>Low response rate means recommendations are waiting on Presales; high rejection may indicate weak fit or missing context.</span>
                      <span>Fulfilled internally shows PMO recommendations that closed demand without external recruiting.</span>
                    </span>
                  </span>
                </div>
              </div>
              <div class="pmo-outcome-grid">
                <span><strong>{{ dashboard.recommendationOutcomes.pendingPresalesReview }}</strong> pending Presales</span>
                <span><strong>{{ dashboard.recommendationOutcomes.acceptedByPresales }}</strong> accepted</span>
                <span><strong>{{ dashboard.recommendationOutcomes.rejectedByPresales }}</strong> rejected</span>
                <span><strong>{{ dashboard.recommendationOutcomes.fulfilledInternally }}</strong> fulfilled internally</span>
                <span><strong>{{ formatPercent(dashboard.recommendationOutcomes.presalesResponseRate) }}</strong> response rate</span>
              </div>
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Review Aging</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Review Aging means" aria-describedby="pmo-aging-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-aging-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Groups active PMO assignments by how long they have waited.</span>
                      <span>Items in the 4-7 and 8+ day buckets are the most likely to block Presales and hiring progress.</span>
                    </span>
                  </span>
                </div>
              </div>
              <div class="pmo-bar-list">
                @for (bucket of dashboard.agingBuckets; track bucket.label) {
                  <div class="pmo-bar-row">
                    <span>{{ bucket.label }}</span>
                    <strong>{{ bucket.count }}</strong>
                    <i [style.width.%]="pmoAgingWidth(bucket, dashboard.agingBuckets)"></i>
                  </div>
                }
              </div>
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Requests by Department</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Requests by Department means" aria-describedby="pmo-department-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-department-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows which departments are creating PMO workload.</span>
                      <span>High average age in one department can indicate missing bench availability or unclear request details.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.departmentLoad.length > 0) {
                <div class="pmo-metric-list">
                  @for (department of dashboard.departmentLoad; track department.department) {
                    <div>
                      <strong>{{ department.department }}</strong>
                      <span>{{ department.pendingReviews }} pending / {{ department.claimedReviews }} claimed</span>
                      <small>{{ department.averageAgeDays }} avg day(s)</small>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No department PMO workload in the selected scope.</div>
              }
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>PMO Decision Split</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What PMO Decision Split means" aria-describedby="pmo-decision-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-decision-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Compares PMO outcomes: internal recommendations, recruiter handoffs, and returned Presales decisions.</span>
                      <span>A handoff-heavy split can mean the bench does not currently cover demand.</span>
                    </span>
                  </span>
                </div>
              </div>
              <div class="pmo-bar-list">
                @for (item of dashboard.decisionSplit; track item.decision) {
                  <div class="pmo-bar-row">
                    <span>{{ item.decision }}</span>
                    <strong>{{ item.count }}</strong>
                    <i [style.width.%]="pmoDecisionWidth(item, dashboard.decisionSplit)"></i>
                  </div>
                }
              </div>
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Recommendation Acceptance Trend</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Recommendation Acceptance Trend means" aria-describedby="pmo-trend-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-trend-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows daily recommendation volume and Presales accept/reject movement.</span>
                      <span>It helps PMO see whether recommendation quality is improving over time.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.recommendationTrend.length > 0) {
                <div class="pmo-trend-list">
                  @for (item of dashboard.recommendationTrend; track item.periodStartUtc) {
                    <div>
                      <strong>{{ formatShortDate(item.periodStartUtc) }}</strong>
                      <span>{{ item.recommended }} sent</span>
                      <i [style.width.%]="pmoTrendWidth(item, dashboard.recommendationTrend)"></i>
                      <small>{{ item.accepted }} accepted / {{ item.rejected }} rejected</small>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No PMO recommendation trend exists in this window.</div>
              }
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Skill Demand vs Bench</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Skill Demand versus Bench means" aria-describedby="pmo-skill-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-skill-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Compares active PMO request skills against available bench employees with those skills.</span>
                      <span>Large gaps suggest PMO may need to forward the request to recruiters sooner.</span>
                    </span>
                  </span>
                </div>
              </div>
              @if (dashboard.skillDemandVsBench.length > 0) {
                <div class="pmo-skill-list">
                  @for (item of dashboard.skillDemandVsBench; track item.skill) {
                    <div>
                      <span>{{ item.skill }}</span>
                      <i [style.width.%]="pmoSkillWidth(item, dashboard.skillDemandVsBench)"></i>
                      <small>{{ item.demandCount }} demand / {{ item.benchAvailableCount }} bench · gap {{ item.gap }}</small>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">No skill demand exists for visible PMO reviews.</div>
              }
            </article>

            <article class="ops-panel pmo-panel">
              <div class="panel-header">
                <div class="section-title-with-help">
                  <h2>Bench Matching AI Health</h2>
                  <span class="agent-help admin-analytics-help">
                    <button type="button" class="agent-help-trigger" aria-label="What Bench Matching AI Health means" aria-describedby="pmo-ai-help">
                      <span class="material-symbols-outlined" aria-hidden="true">info</span>
                    </button>
                    <span id="pmo-ai-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                      <strong>What this implies</strong>
                      <span>Shows whether the Bench Matching agent is running and has employee vectors to support matching.</span>
                      <span>Failed runs or low employee embeddings mean PMOs should treat AI context as incomplete.</span>
                    </span>
                  </span>
                </div>
                <a routerLink="/admin-center/ai-settings">AI Settings</a>
              </div>
              <div class="pmo-health-grid">
                <span><strong>{{ dashboard.aiHealth.runsInWindow }}</strong> runs in window</span>
                <span><strong>{{ dashboard.aiHealth.failedRuns }}</strong> failed runs</span>
                <span><strong>{{ dashboard.aiHealth.rankedRequests }}</strong> ranked requests</span>
                <span><strong>{{ dashboard.aiHealth.employeeEmbeddings }}</strong> employee vectors</span>
              </div>
              <p class="admin-muted">Latest run: {{ formatDateTime(dashboard.aiHealth.latestRunAt) }}</p>
            </article>
          </section>
        } @else if (pmoLoading()) {
          <section class="ops-panel empty-state">Loading PMO Review dashboard...</section>
        } @else {
          <section class="ops-panel empty-state">
            <strong>PMO dashboard could not be loaded.</strong>
            <p>{{ pmoError() ?? 'Try refreshing the dashboard.' }}</p>
          </section>
        }
      </main>
    } @else if (isPresalesOnly()) {
      <main class="page ops-page dashboard-page presales-dashboard-page">
        <header class="ops-page-header presales-dashboard-header">
          <div>
            <p class="eyebrow">Presales workspace</p>
            <h1>My Request Dashboard</h1>
            <p>Track Job Requests you created and respond to PMO recommendation updates.</p>
          </div>
        </header>

        <section class="presales-kpi-grid">
          <a class="presales-kpi-card" routerLink="/app/job-requests">
            <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
            <div>
              <small>My open requests</small>
              <strong>{{ presalesStats().open }}</strong>
              <p>Requests still moving through PMO, recruiting, interviews, or offer.</p>
            </div>
          </a>
          <a class="presales-kpi-card" routerLink="/app/job-requests">
            <span class="material-symbols-outlined" aria-hidden="true">manage_search</span>
            <div>
              <small>Awaiting PMO review</small>
              <strong>{{ presalesStats().awaitingPmo }}</strong>
              <p>Requests waiting for internal bench or recruiter handoff decision.</p>
            </div>
          </a>
          <a class="presales-kpi-card attention" routerLink="/app/my-work">
            <span class="material-symbols-outlined" aria-hidden="true">reviews</span>
            <div>
              <small>Needs my review</small>
              <strong>{{ presalesStats().needsReview }}</strong>
              <p>PMO employee recommendations waiting for your accept/reject decision.</p>
            </div>
          </a>
          <a class="presales-kpi-card" routerLink="/app/job-requests">
            <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
            <div>
              <small>In recruiting</small>
              <strong>{{ presalesStats().inRecruiting }}</strong>
              <p>Requests forwarded to recruiters or candidate interviews.</p>
            </div>
          </a>
          <a class="presales-kpi-card success" routerLink="/app/job-requests">
            <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>
            <div>
              <small>Fulfilled / closed</small>
              <strong>{{ presalesStats().closed }}</strong>
              <p>Requests that reached final fulfillment or closure.</p>
            </div>
          </a>
        </section>

        <section class="presales-dashboard-grid">
          <article class="ops-panel presales-action-panel">
            <div class="panel-header">
              <div>
                <h2>Action Required</h2>
                <p>PMO recommendations and request updates that need your response.</p>
              </div>
              <a routerLink="/app/my-work">My Work</a>
            </div>
            @if (presalesActionItems().length > 0) {
              <div class="presales-action-list">
                @for (item of presalesActionItems(); track item.jobRequest.id) {
                  <a class="presales-action-row" [routerLink]="['/app/job-requests', item.jobRequest.id]">
                    <span class="material-symbols-outlined" aria-hidden="true">priority_high</span>
                    <div>
                      <strong>{{ item.jobRequest.code }} - {{ item.jobRequest.title }}</strong>
                      <small>{{ item.jobRequest.department }} - PMO recommendations are ready for your review.</small>
                    </div>
                    <span class="presales-action-cta">Review recommendation</span>
                  </a>
                }
              </div>
            } @else {
              <div class="empty-state">No PMO recommendations need your review right now.</div>
            }
          </article>

          <article class="ops-panel presales-stage-panel">
            <div class="panel-header">
              <div>
                <h2>My Requests by Stage</h2>
                <p>Only requests you created or are assigned to review.</p>
              </div>
              <a routerLink="/app/job-requests">My Job Requests</a>
            </div>
            <div class="presales-stage-list">
              @for (stage of presalesStageStats(); track stage.stage) {
                <a class="presales-stage-row" routerLink="/app/job-requests">
                  <span>{{ stage.stage }}</span>
                  <strong>{{ stage.count }}</strong>
                  <i [style.width.%]="stage.width"></i>
                </a>
              }
            </div>
          </article>

          <article class="ops-panel presales-recent-panel">
            <div class="panel-header">
              <div>
                <h2>Recently Updated Requests</h2>
                <p>Latest movement from PMO, recruiting, interviews, or offer outcome.</p>
              </div>
              <a routerLink="/app/job-requests">View all</a>
            </div>
            @if (presalesRecentRequests().length > 0) {
              <div class="presales-request-table">
                <div class="presales-request-table-head">
                  <span>Request</span>
                  <span>Stage</span>
                  <span>Owner</span>
                  <span>Last activity</span>
                </div>
                @for (item of presalesRecentRequests(); track item.jobRequest.id) {
                  <a class="presales-request-row" [routerLink]="['/app/job-requests', item.jobRequest.id]">
                    <span>
                      <strong>{{ item.jobRequest.code }}</strong>
                      <small>{{ item.jobRequest.title }}</small>
                    </span>
                    <span [class]="statusBadgeClass(item.jobRequest.stage)">{{ item.jobRequest.stage }}</span>
                    <span>{{ ownerLabel(item.jobRequest) }}</span>
                    <span>{{ formatDateTime(item.lastActivityAt) }}</span>
                  </a>
                }
              </div>
            } @else {
              <div class="empty-state">
                Create your first Job Request to start tracking PMO and recruiting progress.
              </div>
            }
          </article>
        </section>
      </main>
    } @else if (isRecruiterOnly()) {
      <main class="page ops-page dashboard-page recruiter-dashboard-page recruiter-overview-page">
        <header class="recruiter-overview-header">
          <nav class="recruiter-breadcrumb" aria-label="Breadcrumb">
            <span>Recruiter Portal</span>
            <span class="material-symbols-outlined" data-icon="chevron_right" aria-hidden="true"></span>
            <strong>Dashboard</strong>
          </nav>
          <div class="recruiter-overview-heading">
            <div>
              <h1>Sourcing Overview</h1>
              <p>Claim requisitions, move critical applicants, monitor AI support, and keep interviews on schedule.</p>
            </div>
          </div>
        </header>

        @if (recruiterLoading()) {
          <section class="ops-panel empty-state">Loading recruiter dashboard...</section>
        } @else if (recruiterDashboard(); as dashboard) {
          @if (recruiterError()) {
            <p class="field-status error">{{ recruiterError() }}</p>
          }

          <section id="recruiter-overview" class="recruiter-overview-kpis" aria-label="Recruiter sourcing metrics">
            <a class="recruiter-overview-kpi attention" routerLink="/app/recruitment/queue">
              <span>Sourcing work</span>
              <strong>{{ recruiterStats().sourcingWork }}</strong>
              <small>{{ recruiterStats().claimedByMe }} claimed</small>
            </a>
            <a class="recruiter-overview-kpi" routerLink="/app/recruitment/queue">
              <span>My queue</span>
              <strong>{{ recruiterStats().claimedByMe }}</strong>
              <small>Owned by me</small>
            </a>
            <a class="recruiter-overview-kpi" routerLink="/app/job-publishing">
              <span>Drafts</span>
              <strong>{{ recruiterStats().draftPosts }}</strong>
              <small>Need publishing</small>
            </a>
            <a class="recruiter-overview-kpi" routerLink="/app/job-publishing">
              <span>Live posts</span>
              <strong>{{ recruiterStats().publishedPosts }}</strong>
              <small>Candidate portal</small>
            </a>
            <a class="recruiter-overview-kpi" routerLink="/app/candidate-pipeline">
              <span>Total apps</span>
              <strong>{{ recruiterStats().activeApplications }}</strong>
              <small>Active pipeline</small>
            </a>
            <a class="recruiter-overview-kpi action-needed" routerLink="/app/interview-scheduling">
              <span>Follow-ups</span>
              <strong>{{ recruiterStats().interviewFollowUps }}</strong>
              <small>Action req.</small>
            </a>
          </section>

          <section class="recruiter-overview-layout">
            <section class="recruiter-overview-rail recruiter-overview-card-row" aria-label="Recruiter dashboard support cards">
              <article class="ops-panel recruiter-rail-card recruiter-ai-copilot-card">
                <div class="recruiter-rail-card-title">
                  <span class="material-symbols-outlined" data-icon="auto_awesome" aria-hidden="true"></span>
                  <h2>AI Co-Pilot Support</h2>
                </div>
                <a class="recruiter-ai-support-row" routerLink="/app/recruitment/talent-rediscovery" [queryParams]="firstRecruiterJobRequestId() ? { jobRequestId: firstRecruiterJobRequestId() } : null">
                  <span class="material-symbols-outlined" data-icon="groups" aria-hidden="true"></span>
                  <span>
                    <strong>Talent Rediscovery</strong>
                    <small>{{ recruiterStats().rediscoveredCandidates }} warm matches identified</small>
                  </span>
                  <span class="material-symbols-outlined" data-icon="chevron_right" aria-hidden="true"></span>
                </a>
                <a class="recruiter-ai-support-row" [routerLink]="firstRecruiterJobRequestId() ? ['/app/recruitment/sourcing', firstRecruiterJobRequestId()] : ['/app/recruitment/queue']" [queryParams]="{ tab: 'applications' }">
                  <span class="material-symbols-outlined" data-icon="bar_chart" aria-hidden="true"></span>
                  <span>
                    <strong>Applicant Ranking</strong>
                    <small>{{ recruiterStats().rankedApplicants }} ranked fit scores active</small>
                  </span>
                  <span class="material-symbols-outlined" data-icon="chevron_right" aria-hidden="true"></span>
                </a>
                <a class="recruiter-ai-support-row" [routerLink]="firstRecruiterJobRequestId() ? ['/app/recruitment/sourcing', firstRecruiterJobRequestId()] : ['/app/recruitment/queue']" [queryParams]="{ tab: 'job-post' }">
                  <span class="material-symbols-outlined" data-icon="edit_note" aria-hidden="true"></span>
                  <span>
                    <strong>Draft Generation</strong>
                    <small>{{ recruiterStats().draftPosts }} job post drafts ready</small>
                  </span>
                  <span class="material-symbols-outlined" data-icon="chevron_right" aria-hidden="true"></span>
                </a>
              </article>

              <article class="ops-panel recruiter-rail-card recruiter-schedule-card">
                <div class="recruiter-rail-heading">
                  <h2>Today's Schedule</h2>
                  <span class="recruiter-small-pill">{{ recruiterStats().interviewFollowUps }} pending</span>
                </div>
                @if (recruiterTodaySchedule().length > 0) {
                  <div class="recruiter-schedule-list">
                    @for (item of recruiterTodaySchedule(); track item.interview.interviewId) {
                      <a class="recruiter-schedule-row" [routerLink]="['/app/recruitment/sourcing', item.sourcing.jobRequest.id]" [queryParams]="{ tab: 'applications' }">
                        <span class="recruiter-schedule-avatar">{{ candidateInitials(item.application.candidateName) }}</span>
                        <span>
                          <strong>{{ item.application.candidateName }}</strong>
                          <small>{{ item.jobPost?.title ?? item.sourcing.jobRequest.title }} - {{ item.interview.roundName }}</small>
                        </span>
                        <time>{{ formatTime(item.interview.startsAt) }}</time>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="empty-state compact">No interviews scheduled for today.</div>
                }
                <a class="btn secondary compact recruiter-full-width" routerLink="/app/interview-scheduling">Full Calendar</a>
              </article>

              <article id="recruiter-active-jobs" class="ops-panel recruiter-rail-card recruiter-active-posts-card">
                <div class="recruiter-rail-heading">
                  <h2>Active Posts</h2>
                  <span>{{ recruiterStats().publishedPosts }} live</span>
                </div>
                @if (recruiterActiveJobPosts().length > 0) {
                  <div class="recruiter-rail-post-list">
                    @for (item of recruiterActiveJobPosts(); track item.post.jobPostId) {
                      <a class="recruiter-rail-post-row" [routerLink]="['/app/recruitment/sourcing', item.post.jobRequestId]" [queryParams]="{ tab: 'applications' }">
                        <span>
                          <strong>{{ item.post.title }}</strong>
                          <small>{{ item.post.requestCode }} - {{ item.post.location }}</small>
                        </span>
                        <span>{{ item.activeApplicants }}/{{ item.totalApplicants }}</span>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="empty-state compact">No published job posts are visible to candidates right now.</div>
                }
                <a class="recruiter-manage-link" routerLink="/app/job-publishing">Manage all posts</a>
              </article>
            </section>

            <article id="recruiter-listings" class="ops-panel recruiter-dashboard-card recruiter-listing-panel">
              <div class="recruiter-listing-header">
                <div class="recruiter-listing-title">
                  @if (activeRecruiterListingTab() === 'requisitions') {
                    <h2>Open Requisitions</h2>
                    <p>PMO handoffs that need recruiter ownership, sourcing workspace updates, or applicant progress.</p>
                  } @else {
                    <h2>Top Applicants by Job</h2>
                    <p>Best current active applicant for each job, using persisted Applicant Ranking first.</p>
                  }
                </div>
                <div class="recruiter-listing-actions">
                  <div class="recruiter-listing-tabs" role="tablist" aria-label="Recruiter listing views">
                    <button
                      type="button"
                      role="tab"
                      [class.active]="activeRecruiterListingTab() === 'requisitions'"
                      [attr.aria-selected]="activeRecruiterListingTab() === 'requisitions'"
                      (click)="setRecruiterListingTab('requisitions')"
                    >
                      Open Requisitions
                      <span>{{ recruiterPriorityQueue().length }}</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      [class.active]="activeRecruiterListingTab() === 'applicants'"
                      [attr.aria-selected]="activeRecruiterListingTab() === 'applicants'"
                      (click)="setRecruiterListingTab('applicants')"
                    >
                      Top Applicants
                      <span>{{ recruiterCriticalApplicants().length }}</span>
                    </button>
                  </div>
                  @if (activeRecruiterListingTab() === 'requisitions') {
                    <a class="recruiter-card-link" routerLink="/app/recruitment/queue">
                      View all
                      <span class="material-symbols-outlined" data-icon="arrow_forward" aria-hidden="true"></span>
                    </a>
                  } @else {
                    <a class="recruiter-card-link" routerLink="/app/candidate-pipeline">
                      Pipeline
                      <span class="material-symbols-outlined" data-icon="arrow_forward" aria-hidden="true"></span>
                    </a>
                  }
                </div>
              </div>

              @if (activeRecruiterListingTab() === 'requisitions') {
                <section id="recruiter-sourcing" role="tabpanel" aria-label="Open requisitions">
                  @if (recruiterPriorityQueue().length > 0) {
                    <div class="recruiter-table-scroll">
                      <table class="recruiter-overview-table open-requisition-table">
                        <thead>
                          <tr>
                            <th>Requisition</th>
                            <th>Department</th>
                            <th>Aging</th>
                            <th>Owner</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of recruiterPriorityQueue(); track item.jobRequest.id) {
                            <tr>
                              <td>
                                <strong>{{ item.jobRequest.code }}</strong>
                                <small>{{ item.jobRequest.title }}</small>
                                <small>{{ item.jobRequest.client }}</small>
                              </td>
                              <td>
                                <strong>{{ item.jobRequest.department }}</strong>
                                <small>{{ item.jobRequest.location }}</small>
                              </td>
                              <td>
                                <strong class="recruiter-aging-text">{{ formatAssignmentAge(item.assignment.assignedAt) }}</strong>
                              </td>
                              <td>
                                <div class="requisition-owner-cell">
                                  <span [class]="statusBadgeClass(recruiterOwnerLabel(item))">{{ recruiterOwnerShortLabel(item) }}</span>
                                  <small>{{ recruiterOwnerDetail(item) }}</small>
                                  <small>{{ item.jobPostUpdatedAt ? formatDateTime(item.jobPostUpdatedAt) : 'No job post yet' }}</small>
                                </div>
                              </td>
                              <td>
                                <details class="row-action-menu recruiter-row-menu">
                                  <summary aria-label="Open requisition actions">
                                    <span class="material-symbols-outlined" data-icon="more_vert" aria-hidden="true"></span>
                                  </summary>
                                  <div class="row-action-menu-panel" role="menu">
                                    <a [routerLink]="recruiterQueueActionLink(item)" role="menuitem">
                                      <span class="material-symbols-outlined" data-icon="open_in_new" aria-hidden="true"></span>
                                      {{ recruiterQueueActionLabel(item) }}
                                    </a>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <div class="empty-state">No recruiter-visible sourcing work is currently available.</div>
                  }
                </section>
              } @else {
                <section id="recruiter-applicants" role="tabpanel" aria-label="Top applicants by job">
                  @if (recruiterCriticalApplicants().length > 0) {
                    <div class="recruiter-table-scroll">
                      <table class="recruiter-overview-table critical-applicant-table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Position</th>
                            <th>Applicant ranking</th>
                            <th>Current stage</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of recruiterCriticalApplicants(); track item.application.jobApplicationId) {
                            <tr>
                              <td>
                                <div class="recruiter-candidate-cell">
                                  <span class="recruiter-avatar">{{ candidateInitials(item.application.candidateName) }}</span>
                                  <span>
                                    <strong>{{ item.application.candidateName }}</strong>
                                    <small>{{ item.application.sourceLabel }}</small>
                                    <small>{{ item.application.currentDesignation || 'Candidate' }}</small>
                                  </span>
                                </div>
                              </td>
                              <td>
                                <strong>{{ item.jobPost?.title ?? item.sourcing.jobRequest.title }}</strong>
                                <small>{{ item.sourcing.jobRequest.department }}</small>
                              </td>
                              <td>
                                <div class="recruiter-ai-insight">
                                  <strong>{{ criticalApplicantScore(item) }}</strong>
                                  @if (criticalApplicantInsight(item)) {
                                  <small>{{ criticalApplicantInsight(item) }}</small>
                                }
                                  @if (!criticalApplicantRanking(item)) {
                                    <small>No persisted applicant ranking for this application.</small>
                                  }
                                </div>
                              </td>
                              <td>
                                <span [class]="statusBadgeClass(item.application.applicationStatus)">{{ statusLabel(item.application.applicationStatus) }}</span>
                                <small>{{ item.application.interviewPassSummary || interviewSummary(item.application.interviewsPassed, item.application.interviewsTotal) }}</small>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  } @else {
                    <div class="empty-state">No active applications need recruiter action right now.</div>
                  }
                </section>
              }
            </article>
          </section>
        } @else {
          <section class="ops-panel empty-state">
            <strong>Recruiter dashboard could not be loaded.</strong>
            <p>{{ recruiterError() ?? 'Try refreshing the dashboard.' }}</p>
          </section>
        }
      </main>
    } @else if (isHiringManagerDashboard()) {
      <main class="page ops-page dashboard-page hiring-manager-dashboard-page">
        <header class="ops-page-header hiring-manager-dashboard-header">
          <div>
            <p class="eyebrow">Hiring Manager</p>
            <h1>Good morning, {{ firstName() }}</h1>
            <p>Your final review queue, offer follow-ups, and hiring outcomes.</p>
            @if (hiringManagerDashboard(); as dashboard) {
              <small>Last refreshed {{ formatDateTime(dashboard.generatedAtUtc) }}</small>
            }
          </div>
        </header>

        @if (hiringManagerLoading()) {
          <section class="ops-panel empty-state">Loading Hiring Manager dashboard...</section>
        } @else if (hiringManagerDashboard(); as dashboard) {
          @if (hiringManagerError()) {
            <p class="field-status error">{{ hiringManagerError() }}</p>
          }

          <section class="ops-stats-grid" aria-label="Hiring manager decision summary">
            <article class="ops-stat-card warning">
              <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">approval_delegation</span>
              <div>
                <span>Pending reviews</span>
                <strong>{{ dashboard.summary.pendingReviews }}</strong>
                <small>Need final decision</small>
              </div>
            </article>
            <article class="ops-stat-card">
              <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">draft</span>
              <div>
                <span>Offer follow-ups</span>
                <strong>{{ dashboard.summary.offerFollowUps }}</strong>
                <small>Drafts, meetings, offered, joining</small>
              </div>
            </article>
            <article class="ops-stat-card">
              <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">pause_circle</span>
              <div>
                <span>On hold</span>
                <strong>{{ dashboard.summary.onHold }}</strong>
                <small>Paused decisions</small>
              </div>
            </article>
            <article class="ops-stat-card success">
              <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">task_alt</span>
              <div>
                <span>Completed outcomes</span>
                <strong>{{ dashboard.summary.completedOutcomes }}</strong>
                <small>Joined or rejected</small>
              </div>
            </article>
            <article class="ops-stat-card danger">
              <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">hourglass_top</span>
              <div>
                <span>Oldest waiting</span>
                <strong>{{ dashboard.summary.oldestWaitingDays }}</strong>
                <small>Days in active review</small>
              </div>
            </article>
          </section>

          <section class="admin-dashboard-grid">
            <article class="ops-panel admin-panel full-span">
              <div class="panel-header">
                <div>
                  <h2>Priority decision queue</h2>
                  <p class="muted">Active reviews first, then oldest waiting candidates.</p>
                </div>
              </div>
              @if (dashboard.priorityReviews.length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table compact">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Job</th>
                        <th>Status</th>
                        <th>Evidence</th>
                        <th>Waiting</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (review of dashboard.priorityReviews; track review.jobApplicationId) {
                        <tr>
                          <td>
                            <strong>{{ review.candidateName }}</strong>
                            <small>{{ review.candidateEmail }}</small>
                          </td>
                          <td>
                            <strong>{{ review.jobTitle }}</strong>
                            <small>{{ review.requestCode }} - {{ review.client }} - {{ review.department }}</small>
                          </td>
                          <td><span [class]="statusBadgeClass(review.status)">{{ statusLabel(review.status) }}</span></td>
                          <td>
                            <strong>{{ review.completedInterviews }} interviews</strong>
                            <small>{{ review.positiveRecommendations }} positive - {{ hiringReviewScoreLabel(review.averageScore) }}</small>
                          </td>
                          <td>
                            <strong>{{ review.daysWaiting }}d</strong>
                            <small>Updated {{ formatShortDate(review.updatedAt) }}</small>
                          </td>
                          <td>
                            <a class="table-link-button" [routerLink]="['/app/hiring-manager/reviews', review.jobApplicationId]">Open review</a>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">
                  <strong>No hiring decisions assigned</strong>
                  <p>Candidates forwarded by recruiters after interviews will appear here.</p>
                </div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <h2>Offer and outcome pipeline</h2>
                  <p class="muted">Offer artifacts and late-stage candidate states.</p>
                </div>
              </div>
              <div class="hiring-breakdown-list">
                @for (item of dashboard.offerPipeline; track item.status) {
                  <div class="hiring-breakdown-row">
                    <div class="hiring-breakdown-row-main">
                      <span>{{ item.status }}</span>
                      <strong>{{ item.count }}</strong>
                    </div>
                    <span class="hiring-breakdown-track" aria-hidden="true">
                      <i [style.width.%]="hiringBreakdownWidth(item, dashboard.offerPipeline)"></i>
                    </span>
                  </div>
                }
              </div>
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <h2>Decision aging</h2>
                  <p class="muted">Active reviews grouped by days waiting.</p>
                </div>
              </div>
              <div class="hiring-breakdown-list">
                @for (bucket of dashboard.agingBuckets; track bucket.label) {
                  <div class="hiring-breakdown-row">
                    <div class="hiring-breakdown-row-main">
                      <span>{{ bucket.label }}</span>
                      <strong>{{ bucket.count }}</strong>
                    </div>
                    <span class="hiring-breakdown-track" aria-hidden="true">
                      <i [style.width.%]="hiringAgingWidth(bucket, dashboard.agingBuckets)"></i>
                    </span>
                  </div>
                }
              </div>
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <h2>Outcome split</h2>
                  <p class="muted">Final or late-stage hiring decisions in your queue.</p>
                </div>
              </div>
              <div class="admin-metric-mini-grid">
                @for (item of dashboard.outcomeSplit; track item.status) {
                  <span><strong>{{ item.count }}</strong> {{ item.status }}</span>
                }
              </div>
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <h2>AI transparency</h2>
                  <p class="muted">Decision brief source and boundary.</p>
                </div>
                <span class="status-badge info">Advisory</span>
              </div>
              <p class="admin-muted">
                Decision briefs are generated by Hiring Manager Decision Brief (hiring-manager-decision-brief) from candidate,
                source, recruiter notes, job, and interview evidence. Final decisions remain human-owned.
              </p>
            </article>

            <article class="ops-panel admin-panel full-span">
              <div class="panel-header">
                <div>
                  <h2>Recent hiring activity</h2>
                  <p class="muted">Latest handoffs, offer changes, meetings, and recorded outcomes.</p>
                </div>
              </div>
              @if (dashboard.recentActivity.length > 0) {
                <div class="activity-feed">
                  @for (event of dashboard.recentActivity; track event.id) {
                    <p>
                      <strong>{{ event.actorName || 'System' }}</strong>
                      {{ activityTitle(event.title) }}
                      <small>{{ event.requestCode }} - {{ event.candidateName }} - {{ formatDateTime(event.createdAt) }}</small>
                    </p>
                  }
                </div>
              } @else {
                <div class="empty-state">No hiring-manager activity has been recorded yet.</div>
              }
            </article>
          </section>
        } @else {
          <section class="ops-panel empty-state">
            <strong>Hiring Manager dashboard could not be loaded.</strong>
            <p>{{ hiringManagerError() ?? 'Try refreshing the dashboard.' }}</p>
          </section>
        }
      </main>
    } @else if (isInterviewerDashboard()) {
      <main class="page ops-page dashboard-page interviewer-dashboard-page">
        <header class="ops-page-header interviewer-dashboard-header">
          <div>
            <p class="eyebrow">My interviews</p>
            <h1>Good morning, {{ firstName() }}</h1>
            <p>Here is your interview schedule and feedback queue for today.</p>
          </div>
        </header>

        @if (interviewerLoading()) {
          <section class="ops-panel empty-state">Loading your interview dashboard...</section>
        } @else {
          @if (interviewerError()) {
            <p class="field-status error">{{ interviewerError() }}</p>
          }

          <section class="ops-stats-grid interviewer-kpi-grid" aria-label="My interview summary">
            <article class="ops-stat-card">
              <span class="ops-stat-icon material-symbols-outlined" data-icon="today" aria-hidden="true"></span>
              <div>
                <span>Today</span>
                <strong>{{ interviewerStats().today }}</strong>
                <small>Scheduled interviews</small>
              </div>
            </article>
            <article class="ops-stat-card">
              <span class="ops-stat-icon material-symbols-outlined" data-icon="event" aria-hidden="true"></span>
              <div>
                <span>Upcoming</span>
                <strong>{{ interviewerStats().upcoming }}</strong>
                <small>Future interviews</small>
              </div>
            </article>
            <article class="ops-stat-card warning">
              <span class="ops-stat-icon material-symbols-outlined" data-icon="rate_review" aria-hidden="true"></span>
              <div>
                <span>Pending feedback</span>
                <strong>{{ interviewerStats().pending }}</strong>
                <small>Needs your input</small>
              </div>
            </article>
            <article class="ops-stat-card danger">
              <span class="ops-stat-icon material-symbols-outlined" data-icon="notification_important" aria-hidden="true"></span>
              <div>
                <span>Overdue</span>
                <strong>{{ interviewerStats().overdue }}</strong>
                <small>Past scheduled time</small>
              </div>
            </article>
            <article class="ops-stat-card success">
              <span class="ops-stat-icon material-symbols-outlined" data-icon="task_alt" aria-hidden="true"></span>
              <div>
                <span>Submitted</span>
                <strong>{{ interviewerStats().completed }}</strong>
                <small>Feedback completed</small>
              </div>
            </article>
          </section>

          @if (interviewerTasks().length === 0) {
            <section class="ops-panel interviewer-empty-state">
              <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
              <div>
                <strong>No interview tasks assigned</strong>
                <p>Scheduled interviews assigned to you will appear here with meeting links and feedback actions.</p>
                <a class="btn secondary compact" routerLink="/app/interview-feedback">Open feedback workbench</a>
              </div>
            </section>
          } @else {
            <section class="interviewer-dashboard-grid">
              <article class="ops-panel interviewer-panel interviewer-wide-panel">
                <div class="panel-header">
                  <div>
                    <h2>Today's interviews</h2>
                    <p class="muted">Candidate interviews scheduled for your local day.</p>
                  </div>
                  <span class="status-badge info">{{ todayInterviewTasks().length }} today</span>
                </div>
                @if (todayInterviewTasks().length > 0) {
                  @if (todayInterviewFollowUpTasks().length > 0) {
                    <div class="interviewer-feedback-reminder">
                      <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
                      <p>{{ todayInterviewFollowUpMessage() }}</p>
                      @if (todayInterviewFollowUpActionTask(); as actionTask) {
                        <a
                          class="btn secondary compact"
                          routerLink="/app/interview-feedback"
                          [queryParams]="{ interviewId: actionTask.interviewId }"
                        >
                          Add feedback
                        </a>
                      }
                    </div>
                  }
                  <div class="interviewer-task-list">
                    @for (task of todayInterviewTasks(); track task.interviewId) {
                      <article class="interviewer-task-row" [class.overdue]="isInterviewTaskOverdue(task)">
                        <span class="material-symbols-outlined" aria-hidden="true">{{ interviewerTaskIcon(task) }}</span>
                        <div>
                          <strong>{{ task.candidateName }}</strong>
                          <small>{{ task.jobTitle }} - {{ task.roundName }}</small>
                          <small>{{ task.client }} - Recruiter: {{ task.scheduledByName }}</small>
                        </div>
                        <div class="interviewer-task-meta">
                          <span>{{ interviewTaskTime(task) }}</span>
                          <small>{{ task.durationMinutes }} min</small>
                        </div>
                        <div class="interviewer-task-actions">
                          @if (task.meetingLink) {
                            <a class="btn secondary compact" [href]="task.meetingLink" target="_blank" rel="noreferrer">
                              <span class="material-symbols-outlined" aria-hidden="true">videocam</span>
                              Join
                            </a>
                          } @else if (task.locationText) {
                            <span class="status-badge status-badge--idle">{{ task.locationText }}</span>
                          }
                          @if (interviewFeedbackActionLabel(task); as feedbackActionLabel) {
                            <a
                              class="btn primary compact"
                              routerLink="/app/interview-feedback"
                              [queryParams]="{ interviewId: task.interviewId }"
                            >
                              {{ feedbackActionLabel }}
                            </a>
                          }
                        </div>
                      </article>
                    }
                  </div>
                } @else {
                  <div class="empty-state">No interviews are scheduled for today.</div>
                }
              </article>

              <article class="ops-panel interviewer-panel">
                <div class="panel-header">
                  <div>
                    <h2>Upcoming interviews</h2>
                    <p class="muted">Next scheduled interviews after today.</p>
                  </div>
                </div>
                @if (upcomingInterviewTasks().length > 0) {
                  <div class="interviewer-compact-list">
                    @for (task of upcomingInterviewTasks(); track task.interviewId) {
                      <a
                        class="interviewer-compact-row"
                        routerLink="/app/interview-feedback"
                        [queryParams]="{ interviewId: task.interviewId }"
                      >
                        <span>
                          <strong>{{ task.candidateName }}</strong>
                          <small>{{ task.jobTitle }} - {{ task.roundName }}</small>
                        </span>
                        <span>
                          <strong>{{ formatShortDate(task.startsAt) }}</strong>
                          <small>{{ interviewTaskTime(task) }}</small>
                        </span>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="empty-state">No upcoming interviews after today.</div>
                }
              </article>

              <article class="ops-panel interviewer-panel">
                <div class="panel-header">
                  <div>
                    <h2>Pending feedback</h2>
                    <p class="muted">Interviews waiting for your structured feedback.</p>
                  </div>
                  <a routerLink="/app/interview-feedback">View all</a>
                </div>
                @if (pendingFeedbackTasks().length > 0) {
                  <div class="interviewer-compact-list">
                    @for (task of pendingFeedbackTasks(); track task.interviewId) {
                      <a
                        class="interviewer-compact-row"
                        [class.overdue]="isInterviewTaskOverdue(task)"
                        routerLink="/app/interview-feedback"
                        [queryParams]="{ interviewId: task.interviewId }"
                      >
                        <span>
                          <strong>{{ task.candidateName }}</strong>
                          <small>{{ task.roundName }} - {{ task.scheduledByName }}</small>
                        </span>
                        <span [class]="statusBadgeClass(interviewerTaskStatusLabel(task))">
                          {{ interviewerTaskStatusLabel(task) }}
                        </span>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="empty-state">No feedback is pending.</div>
                }
              </article>

              <article class="ops-panel interviewer-panel interviewer-wide-panel">
                <div class="panel-header">
                  <div>
                    <h2>Recently submitted feedback</h2>
                    <p class="muted">Completed interview feedback and recommendations.</p>
                  </div>
                  <span class="status-badge status-badge--success">{{ recentFeedbackTasks().length }} recent</span>
                </div>
                @if (recentFeedbackTasks().length > 0) {
                  <div class="admin-table-wrap">
                    <table class="admin-dashboard-table compact interviewer-feedback-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Job</th>
                          <th>Round</th>
                          <th>Recommendation</th>
                          <th>Avg score</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (task of recentFeedbackTasks(); track task.interviewId) {
                          <tr>
                            <td>
                              <strong>{{ task.candidateName }}</strong>
                              <small>{{ task.candidateEmail }}</small>
                            </td>
                            <td>{{ task.jobTitle }}</td>
                            <td>{{ task.roundName }}</td>
                            <td><span [class]="statusBadgeClass(task.recommendation)">{{ task.recommendation || 'Submitted' }}</span></td>
                            <td>{{ averageInterviewTaskScore(task) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <div class="empty-state">Submitted feedback will appear here after you complete interviews.</div>
                }
              </article>

            </section>
          }
        }
      </main>
    } @else {
      <main class="page ops-page dashboard-page">
        <header class="ops-page-header">
          <div>
            <p class="eyebrow">Dashboard</p>
            <h1>Good morning, {{ firstName() }}</h1>
            <p>Here is your recruitment ecosystem health for today.</p>
          </div>
          <div class="ops-header-actions">
            <a class="btn secondary compact" routerLink="/app/interview-scheduling">
              <span class="material-symbols-outlined" aria-hidden="true">event</span>
              Schedule Interview
            </a>
            <a class="btn secondary compact" routerLink="/app/candidates/new">
              <span class="material-symbols-outlined" aria-hidden="true">person_add</span>
              Add Candidate
            </a>
            <a class="btn primary compact" routerLink="/app/job-requests/new">
              <span class="material-symbols-outlined" aria-hidden="true">add</span>
              New Job Request
            </a>
          </div>
        </header>

        <section class="ops-stats-grid">
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">assignment</span>
            <div>
              <span>Open job requests</span>
              <strong>{{ store.openJobRequests().length }}</strong>
              <small>Loaded from backend</small>
            </div>
          </article>
          <article class="ops-stat-card warning">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">pending_actions</span>
            <div>
              <span>PMO queue items</span>
              <strong>{{ store.pmoQueue().length }}</strong>
              <small>Action required</small>
            </div>
          </article>
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">notifications</span>
            <div>
              <span>Unread notifications</span>
              <strong>{{ unreadCount() }}</strong>
              <small>For current user</small>
            </div>
          </article>
          <article class="ops-stat-card success">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">inventory_2</span>
            <div>
              <span>Total requests</span>
              <strong>{{ store.jobRequests().length }}</strong>
              <small>Snapshot count</small>
            </div>
          </article>
        </section>

        <section class="dashboard-grid">
          <div class="dashboard-primary">
            <article class="ops-insight-card dark">
              <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              <div>
                <h2>Next PMO Review</h2>
                @if (nextPmoItem(); as item) {
                  <p>
                    {{ item.jobRequest.code }} is waiting for PMO internal employee review before recruitment starts.
                  </p>
                  <a [routerLink]="['/app/pmo/review', item.jobRequest.id]">Open PMO Review</a>
                } @else {
                  <p>No PMO Review item is currently waiting in the backend snapshot.</p>
                  <a routerLink="/app/job-requests">View requests</a>
                }
              </div>
            </article>

            <article class="ops-panel chart-card">
              <div class="panel-header">
                <h2>Open Requests By Stage</h2>
                <span class="status-badge">Backend snapshot</span>
              </div>
              @if (stageStats().length > 0) {
                <div class="bar-chart" aria-label="Open requests by stage">
                  @for (stage of stageStats(); track stage.label) {
                    <span [style.height.%]="stage.height" [title]="stage.label + ': ' + stage.count"></span>
                  }
                </div>
                <div class="chart-legend">
                  @for (stage of stageStats(); track stage.label) {
                    <span><i></i> {{ stage.label }}: {{ stage.count }}</span>
                  }
                </div>
              } @else {
                <div class="empty-state">No open request stages returned by backend.</div>
              }
            </article>

            <article class="ops-panel">
              <div class="panel-header">
                <h2>My Tasks</h2>
                <a routerLink="/app/my-work">View all</a>
              </div>
              @if (myWork().length > 0) {
                <div class="stack-list">
                  @for (item of myWork(); track item.assignment.id) {
                    <a class="work-row ops-work-row" [routerLink]="['/app/job-requests', item.jobRequest.id]">
                      <span>
                        <strong>{{ item.jobRequest.code }}</strong>
                        <small>{{ item.jobRequest.title }}</small>
                      </span>
                      <span class="status-badge priority">{{ item.assignment.status }}</span>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state">No assigned requests.</div>
              }
            </article>
          </div>

          <aside class="dashboard-rail">
            <article class="ops-panel interview-card">
              <div class="panel-header">
                <h2>Interviews</h2>
                <a routerLink="/app/interview-scheduling">View all</a>
              </div>
              <div class="empty-state">Interview schedule endpoint is required for this panel.</div>
            </article>

            <article class="ops-panel at-risk-card">
              <div class="panel-header">
                <h2>At-risk Requests</h2>
                <span class="material-symbols-outlined" aria-hidden="true">warning</span>
              </div>
              <div class="empty-state">Risk scoring endpoint is required for this panel.</div>
            </article>
          </aside>

          <aside class="dashboard-activity ops-panel">
            <h2>Recent Activity</h2>
            @if (recentActivity().length > 0) {
              <div class="activity-feed">
                @for (event of recentActivity(); track event.id) {
                  <p><strong>{{ event.actorName || 'System' }}</strong> {{ activityTitle(event.title) }}</p>
                }
              </div>
            } @else {
              <div class="empty-state">No activity has been loaded from backend yet.</div>
            }
          </aside>
        </section>

        <section class="scope-soft-note dashboard-scope-note">
          <strong>MVP boundary</strong>
          <p>AI recommends candidates and employees. PMO, recruiters, interviewers, and hiring managers still make the decisions.</p>
        </section>
      </main>
    }
  `,
})
export class DashboardComponent implements OnInit {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly candidateOperations = inject(CandidateOperationsDataService);

  readonly currentUser = this.auth.currentUser;
  readonly isTenantAdmin = computed(() => this.auth.isAdmin());
  readonly isPresalesOnly = computed(() => this.auth.hasAnyRole(['Presales']) && !this.auth.isAdmin());
  readonly isPmoOnly = computed(() => this.auth.hasAnyRole(['PMO']) && !this.auth.isAdmin());
  readonly isRecruiterOnly = computed(() => this.auth.hasAnyRole(['Recruiter']) && !this.auth.isAdmin());
  readonly isHiringManagerDashboard = computed(() =>
    this.auth.hasAnyRole(['HiringManager']) &&
    !this.auth.isAdmin() &&
    !this.auth.hasAnyRole(['PMO', 'Recruiter']),
  );
  readonly isInterviewerDashboard = computed(() =>
    this.auth.hasAnyRole(['Interviewer', 'HOD']) &&
    !this.auth.isAdmin() &&
    !this.auth.hasAnyRole(['PMO', 'Recruiter', 'HiringManager']),
  );
  readonly adminDashboard = signal<TenantAdminDashboard | null>(null);
  readonly adminLoading = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly pmoDashboard = signal<PmoDashboard | null>(null);
  readonly pmoLoading = signal(false);
  readonly pmoError = signal<string | null>(null);
  readonly recruiterDashboard = signal<CandidateOperationsDataset | null>(null);
  readonly recruiterLoading = signal(false);
  readonly recruiterError = signal<string | null>(null);
  readonly hiringManagerDashboard = signal<HiringManagerDashboard | null>(null);
  readonly hiringManagerLoading = signal(false);
  readonly hiringManagerError = signal<string | null>(null);
  readonly interviewerTasks = signal<InterviewTask[]>([]);
  readonly interviewerLoading = signal(false);
  readonly interviewerError = signal<string | null>(null);
  readonly activeRecruiterListingTab = signal<'requisitions' | 'applicants'>('requisitions');
  filterFromDate = '';
  filterToDate = '';
  filterDepartmentId = '';
  filterSourceLabel = '';
  filterRecruiterUserId = '';
  pmoFromDate = '';
  pmoToDate = '';
  pmoDepartmentId = '';

  readonly unreadCount = computed(() => {
    const user = this.currentUser();
    return user ? this.store.unreadCountForUser(user.id) : 0;
  });
  readonly myWork = computed(() => {
    return this.store.myWork();
  });

  readonly firstName = computed(() => this.currentUser()?.name.split(' ')[0] ?? 'there');
  readonly nextPmoItem = computed(() => this.store.pmoQueue()[0]);
  readonly recentActivity = computed(() => this.store.activity().slice(0, 4));
  readonly stageStats = computed(() => {
    const counts = new Map<string, number>();
    for (const request of this.store.openJobRequests()) {
      counts.set(request.stage, (counts.get(request.stage) ?? 0) + 1);
    }

    const maxCount = Math.max(...counts.values(), 0);
    return Array.from(counts.entries()).map(([label, count]) => ({
      label,
      count,
      height: maxCount > 0 ? Math.max(18, Math.round((count / maxCount) * 100)) : 18,
    }));
  });
  readonly presalesRequests = computed(() => this.store.jobRequests());
  readonly presalesActionItems = computed<PresalesActionItem[]>(() => {
    const userId = this.currentUser()?.id;
    const reviewAssignments = this.store.assignments().filter(
      (assignment) =>
        assignment.stage === 'Presales Review' &&
        assignment.status !== 'Completed' &&
        (!userId || assignment.assignedToUserId === userId || assignment.claimedByUserId === userId),
    );

    const items = new Map<string, PresalesActionItem>();
    for (const assignment of reviewAssignments) {
      const jobRequest = this.store.jobRequests().find((request) => request.id === assignment.entityId);
      if (jobRequest) {
        items.set(jobRequest.id, {
          assignment,
          jobRequest,
          lastActivityAt: this.lastActivityAt(jobRequest),
        });
      }
    }

    for (const jobRequest of this.presalesRequests().filter((request) => request.stage === 'Presales Review')) {
      if (!items.has(jobRequest.id)) {
        items.set(jobRequest.id, {
          jobRequest,
          lastActivityAt: this.lastActivityAt(jobRequest),
        });
      }
    }

    return Array.from(items.values()).sort(
      (left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime(),
    );
  });
  readonly presalesStats = computed(() => {
    const requests = this.presalesRequests();
    const recruitingStages: JobRequestStage[] = [
      'Recruiter Sourcing',
      'Interviewing',
      'Hiring Manager Review',
      'Offer Outcome',
    ];
    return {
      open: requests.filter((request) => request.stage !== 'Closed').length,
      awaitingPmo: requests.filter((request) => request.stage === 'PMO Review').length,
      needsReview: this.presalesActionItems().length,
      inRecruiting: requests.filter((request) => recruitingStages.includes(request.stage)).length,
      closed: requests.filter((request) => request.stage === 'Closed').length,
    };
  });
  readonly presalesStageStats = computed(() => {
    const stageOrder: JobRequestStage[] = [
      'PMO Review',
      'Presales Review',
      'Recruiter Sourcing',
      'Interviewing',
      'Hiring Manager Review',
      'Offer Outcome',
      'Closed',
    ];
    const counts = new Map<JobRequestStage, number>();
    for (const request of this.presalesRequests()) {
      counts.set(request.stage, (counts.get(request.stage) ?? 0) + 1);
    }

    const maxCount = Math.max(...stageOrder.map((stage) => counts.get(stage) ?? 0), 1);
    return stageOrder.map((stage) => {
      const count = counts.get(stage) ?? 0;
      return {
        stage,
        count,
        width: count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 2,
      };
    });
  });
  readonly presalesRecentRequests = computed<PresalesActionItem[]>(() =>
    this.presalesRequests()
      .map((jobRequest) => ({
        jobRequest,
        lastActivityAt: this.lastActivityAt(jobRequest),
      }))
      .sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
      .slice(0, 6),
  );
  readonly recruiterStats = computed(() => {
    const dashboard = this.recruiterDashboard();
    const userId = this.currentUser()?.id;
    if (!dashboard) {
      return {
        sourcingWork: 0,
        claimedByMe: 0,
        draftPosts: 0,
        publishedPosts: 0,
        activeApplications: 0,
        interviewFollowUps: 0,
        rediscoveredCandidates: 0,
        rankedApplicants: 0,
      };
    }

    const claimedByMe = dashboard.queueItems.filter((item) =>
      Boolean(
        userId &&
          (item.assignment.claimedByUserId === userId || item.assignment.assignedToUserId === userId),
      ),
    ).length;

    return {
      sourcingWork: dashboard.queueItems.length,
      claimedByMe,
      draftPosts: dashboard.jobPosts.filter((post) => post.status === 'Draft').length,
      publishedPosts: dashboard.jobPosts.filter((post) => post.status === 'Published').length,
      activeApplications: dashboard.applications.filter((item) => !this.isTerminalApplication(item.application.applicationStatus)).length,
      interviewFollowUps: this.recruiterInterviewFollowUps().length,
      rediscoveredCandidates: dashboard.sourcing.reduce(
        (total, item) => total + (item.talentRediscoveryMatches?.length ?? 0),
        0,
      ),
      rankedApplicants: dashboard.sourcing.reduce((total, item) => total + (item.applicantRankings?.length ?? 0), 0),
    };
  });
  readonly recruiterPriorityQueue = computed(() => {
    const dashboard = this.recruiterDashboard();
    if (!dashboard) {
      return [];
    }

    return [...dashboard.queueItems]
      .sort((left, right) => {
        const leftClaimed = this.isRecruiterQueueClaimed(left) ? 1 : 0;
        const rightClaimed = this.isRecruiterQueueClaimed(right) ? 1 : 0;
        if (leftClaimed !== rightClaimed) {
          return leftClaimed - rightClaimed;
        }

        return new Date(left.assignment.assignedAt).getTime() - new Date(right.assignment.assignedAt).getTime();
      })
      .slice(0, 6);
  });
  readonly recruiterActiveJobPosts = computed<RecruiterActiveJobPost[]>(() => {
    const dashboard = this.recruiterDashboard();
    if (!dashboard) {
      return [];
    }

    return dashboard.jobPosts
      .filter((post) => post.status === 'Published')
      .map((post) => {
        const applications = this.recruiterApplicationsForPost(post, dashboard.applications);
        const latestApplicationAt =
          applications
            .map((item) => item.application.appliedAt)
            .filter(Boolean)
            .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

        return {
          post,
          totalApplicants: applications.length,
          activeApplicants: applications.filter((item) => !this.isTerminalApplication(item.application.applicationStatus)).length,
          latestApplicationAt,
        };
      })
      .sort((left, right) => {
        const leftActivity = left.latestApplicationAt ?? left.post.updatedAt;
        const rightActivity = right.latestApplicationAt ?? right.post.updatedAt;
        return (
          right.activeApplicants - left.activeApplicants ||
          right.totalApplicants - left.totalApplicants ||
          new Date(rightActivity).getTime() - new Date(leftActivity).getTime()
        );
      })
      .slice(0, 6);
  });
  readonly recruiterLatestPosts = computed(() => {
    const dashboard = this.recruiterDashboard();
    return dashboard
      ? [...dashboard.jobPosts]
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
          .slice(0, 5)
      : [];
  });
  readonly recruiterApplicationActions = computed(() => {
    const dashboard = this.recruiterDashboard();
    return dashboard
      ? [...dashboard.applications]
          .filter((item) => !this.isTerminalApplication(item.application.applicationStatus))
          .sort(
            (left, right) =>
              this.applicationActionPriority(left) - this.applicationActionPriority(right) ||
              new Date(right.application.appliedAt).getTime() - new Date(left.application.appliedAt).getTime(),
          )
          .slice(0, 6)
      : [];
  });
  readonly recruiterCriticalApplicants = computed(() =>
    this.topRecruiterApplicantsByJob(),
  );
  readonly recruiterInterviewFollowUps = computed(() => {
    const dashboard = this.recruiterDashboard();
    return dashboard
      ? [...dashboard.interviews]
          .filter((item) => this.isRecruiterInterviewFollowUp(item))
          .sort(
            (left, right) =>
              new Date(left.interview.startsAt).getTime() - new Date(right.interview.startsAt).getTime(),
          )
          .slice(0, 6)
      : [];
  });
  readonly recruiterTodaySchedule = computed(() =>
    this.recruiterInterviewFollowUps()
      .filter((item) => this.isSameLocalDay(item.interview.startsAt, new Date()))
      .slice(0, 3),
  );
  readonly firstRecruiterJobRequestId = computed(
    () =>
      this.recruiterDashboard()?.sourcing[0]?.jobRequest.id ??
      this.recruiterLatestPosts()[0]?.jobRequestId ??
      null,
  );
  readonly todayInterviewTasks = computed(() =>
    this.sortedInterviewTasks()
      .filter((task) => this.isSameLocalDay(task.startsAt, new Date()))
      .slice(0, 6),
  );
  readonly todayInterviewFollowUpTasks = computed(() =>
    this.todayInterviewTasks().filter((task) => this.isOneHourPastScheduledStart(task)),
  );
  readonly todayInterviewFollowUpActionTask = computed(
    () => this.todayInterviewFollowUpTasks().find((task) => this.interviewFeedbackActionLabel(task)) ?? null,
  );
  readonly upcomingInterviewTasks = computed(() => {
    const now = Date.now();
    return this.sortedInterviewTasks()
      .filter((task) => new Date(task.startsAt).getTime() > now)
      .filter((task) => !this.isSameLocalDay(task.startsAt, new Date()))
      .slice(0, 6);
  });
  readonly pendingFeedbackTasks = computed(() =>
    this.interviewerTasks()
      .filter((task) => !this.isCompletedInterviewTask(task))
      .sort((left, right) => {
        const leftOverdue = this.isInterviewTaskOverdue(left) ? 0 : 1;
        const rightOverdue = this.isInterviewTaskOverdue(right) ? 0 : 1;
        return leftOverdue - rightOverdue || new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
      })
      .slice(0, 6),
  );
  readonly recentFeedbackTasks = computed(() =>
    this.interviewerTasks()
      .filter((task) => this.isCompletedInterviewTask(task))
      .sort((left, right) => {
        const leftTime = new Date(left.submittedAt ?? left.startsAt).getTime();
        const rightTime = new Date(right.submittedAt ?? right.startsAt).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 6),
  );
  readonly interviewerStats = computed(() => {
    const tasks = this.interviewerTasks();
    return {
      today: tasks.filter((task) => this.isSameLocalDay(task.startsAt, new Date())).length,
      upcoming: tasks.filter((task) => new Date(task.startsAt).getTime() > Date.now()).length,
      pending: tasks.filter((task) => !this.isCompletedInterviewTask(task)).length,
      overdue: tasks.filter((task) => this.isInterviewTaskOverdue(task)).length,
      completed: tasks.filter((task) => this.isCompletedInterviewTask(task)).length,
    };
  });

  ngOnInit(): void {
    if (this.isTenantAdmin()) {
      void this.loadAdminDashboard();
    } else if (this.isPmoOnly()) {
      void this.loadPmoDashboard();
    } else if (this.isRecruiterOnly()) {
      void this.loadRecruiterDashboard();
    } else if (this.isHiringManagerDashboard()) {
      void this.loadHiringManagerDashboard();
    } else if (this.isInterviewerDashboard()) {
      void this.loadInterviewerDashboard();
    }
  }

  async loadAdminDashboard(): Promise<void> {
    if (!this.isTenantAdmin()) {
      return;
    }

    this.adminLoading.set(true);
    this.adminError.set(null);
    try {
      const dashboard = await this.store.loadTenantAdminDashboard({
        fromUtc: this.toStartIso(this.filterFromDate),
        toUtc: this.toEndIso(this.filterToDate),
        departmentId: this.filterDepartmentId || undefined,
        sourceLabel: this.filterSourceLabel || undefined,
        recruiterUserId: this.filterRecruiterUserId || undefined,
      });
      this.adminDashboard.set(dashboard);
    } catch {
      this.adminError.set('Tenant analytics could not be loaded from the backend.');
    } finally {
      this.adminLoading.set(false);
    }
  }

  clearAdminFilters(): void {
    this.filterFromDate = '';
    this.filterToDate = '';
    this.filterDepartmentId = '';
    this.filterSourceLabel = '';
    this.filterRecruiterUserId = '';
    void this.loadAdminDashboard();
  }

  async loadPmoDashboard(): Promise<void> {
    if (!this.isPmoOnly()) {
      return;
    }

    this.pmoLoading.set(true);
    this.pmoError.set(null);
    try {
      const dashboard = await this.store.loadPmoDashboard({
        fromUtc: this.toStartIso(this.pmoFromDate),
        toUtc: this.toEndIso(this.pmoToDate),
        departmentId: this.pmoDepartmentId || undefined,
      });
      this.pmoDashboard.set(dashboard);
    } catch {
      this.pmoError.set('PMO dashboard could not be loaded from the backend.');
    } finally {
      this.pmoLoading.set(false);
    }
  }

  clearPmoFilters(): void {
    this.pmoFromDate = '';
    this.pmoToDate = '';
    this.pmoDepartmentId = '';
    void this.loadPmoDashboard();
  }

  async loadRecruiterDashboard(): Promise<void> {
    if (!this.isRecruiterOnly()) {
      return;
    }

    this.recruiterLoading.set(true);
    this.recruiterError.set(null);
    try {
      this.recruiterDashboard.set(await this.candidateOperations.load());
    } catch {
      this.recruiterError.set('Recruiter dashboard could not be loaded from the backend.');
    } finally {
      this.recruiterLoading.set(false);
    }
  }

  async loadHiringManagerDashboard(): Promise<void> {
    if (!this.isHiringManagerDashboard()) {
      return;
    }

    this.hiringManagerLoading.set(true);
    this.hiringManagerError.set(null);
    try {
      this.hiringManagerDashboard.set(await this.store.loadHiringManagerDashboard());
    } catch {
      this.hiringManagerError.set('Hiring Manager dashboard could not be loaded from the backend.');
    } finally {
      this.hiringManagerLoading.set(false);
    }
  }

  async loadInterviewerDashboard(): Promise<void> {
    if (!this.isInterviewerDashboard()) {
      return;
    }

    this.interviewerLoading.set(true);
    this.interviewerError.set(null);
    try {
      const list = await this.store.loadMyInterviewTasks();
      this.interviewerTasks.set(list.items);
    } catch {
      this.interviewerError.set('Your interview dashboard could not be loaded from the backend.');
    } finally {
      this.interviewerLoading.set(false);
    }
  }

  funnelWidth(item: TenantAdminDashboardFunnelItem, items: TenantAdminDashboardFunnelItem[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return Math.max(4, Math.round((item.count / max) * 100));
  }

  pipelineWidth(item: TenantAdminDashboardPipelineItem, items: TenantAdminDashboardPipelineItem[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return Math.max(6, Math.round((item.count / max) * 100));
  }

  skillDemandWidth(count: number, items: { demandCount: number }[]): number {
    const max = Math.max(...items.map((item) => item.demandCount), 1);
    return Math.max(6, Math.round((count / max) * 100));
  }

  pmoAgingWidth(item: PmoDashboardAgingBucket, items: PmoDashboardAgingBucket[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return item.count > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 2;
  }

  pmoDecisionWidth(item: PmoDashboardDecisionSplit, items: PmoDashboardDecisionSplit[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return item.count > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 2;
  }

  pmoTrendWidth(item: PmoDashboardRecommendationTrendItem, items: PmoDashboardRecommendationTrendItem[]): number {
    const max = Math.max(...items.map((candidate) => candidate.recommended), 1);
    return item.recommended > 0 ? Math.max(6, Math.round((item.recommended / max) * 100)) : 2;
  }

  pmoSkillWidth(item: PmoDashboardSkillBenchItem, items: PmoDashboardSkillBenchItem[]): number {
    const max = Math.max(...items.map((candidate) => candidate.demandCount), 1);
    return item.demandCount > 0 ? Math.max(6, Math.round((item.demandCount / max) * 100)) : 2;
  }

  hiringBreakdownWidth(
    item: HiringManagerDashboardStatusBreakdownItem,
    items: HiringManagerDashboardStatusBreakdownItem[],
  ): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return item.count > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 2;
  }

  hiringAgingWidth(item: HiringManagerDashboardAgingBucket, items: HiringManagerDashboardAgingBucket[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return item.count > 0 ? Math.max(6, Math.round((item.count / max) * 100)) : 2;
  }

  hiringReviewScoreLabel(value: number | null | undefined): string {
    return value === null || value === undefined ? 'No score' : `${Number(value).toFixed(1)}/5 avg`;
  }

  routeForFunnel(item: TenantAdminDashboardFunnelItem): string {
    if (item.label === 'Published Jobs') {
      return '/app/job-publishing';
    }
    if (item.label === 'Applications' || item.label === 'Interviewing') {
      return '/app/candidates';
    }
    if (item.label === 'Hiring Manager Review') {
      return '/app/hiring-manager/reviews';
    }
    if (item.label === 'Offered' || item.label === 'Pending joining' || item.label === 'Joined') {
      return '/app/offer-onboarding';
    }
    return '/app/job-requests';
  }

  attentionClass(item: TenantAdminDashboardAttentionItem): string {
    return `admin-attention-item ${item.severity.toLowerCase()}`;
  }

  riskClass(risk: string): string {
    return `risk-pill ${risk.toLowerCase()}`;
  }

  statusLabel(status: string | null | undefined): string {
    return status ? status.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Not recorded';
  }

  statusBadgeClass(status: string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    if (normalized.includes('unclaimed') || normalized === 'notstarted') {
      return 'status-badge status-badge--idle';
    }
    if (normalized.includes('claimed')) {
      return 'status-badge status-badge--claimed';
    }

    const classByStatus = new Map<string, string>([
      ['published', 'status-badge--success'],
      ['draft', 'status-badge--draft'],
      ['closed', 'status-badge--closed'],
      ['applied', 'status-badge--applied'],
      ['invited', 'status-badge--invited'],
      ['screening', 'status-badge--screening'],
      ['interviewing', 'status-badge--interviewing'],
      ['scheduled', 'status-badge--scheduled'],
      ['completed', 'status-badge--success'],
      ['overdue', 'status-badge--danger'],
      ['skipped', 'status-badge--idle'],
      ['cancelled', 'status-badge--danger'],
      ['rejected', 'status-badge--danger'],
      ['withdrawn', 'status-badge--closed'],
      ['offered', 'status-badge--offer'],
      ['joined', 'status-badge--success'],
      ['hired', 'status-badge--success'],
      ['hiringmanagerreview', 'status-badge--review'],
      ['offerdeclined', 'status-badge--offer-declined'],
      ['onhold', 'status-badge--hold'],
    ]);

    return `status-badge ${classByStatus.get(normalized) ?? 'status-badge--neutral'}`;
  }

  recruiterOwnerLabel(item: RecruitmentQueueItem): string {
    if (this.isRecruiterQueueClaimed(item)) {
      return item.recruiterOwnerName ? `Claimed by ${item.recruiterOwnerName}` : 'Claimed';
    }

    return 'Unclaimed group work';
  }

  recruiterOwnerShortLabel(item: RecruitmentQueueItem): string {
    return this.isRecruiterQueueClaimed(item) ? 'Claimed' : 'Unclaimed';
  }

  recruiterOwnerDetail(item: RecruitmentQueueItem): string {
    if (this.isRecruiterQueueClaimed(item)) {
      return item.recruiterOwnerName ? `Claimed by ${item.recruiterOwnerName}` : 'Claimed by recruiter';
    }

    return 'No recruiter owner yet';
  }

  recruiterQueueActionLabel(item: RecruitmentQueueItem): string {
    return this.isRecruiterQueueClaimed(item) ? 'Open workspace' : 'Claim in queue';
  }

  recruiterQueueActionLink(item: RecruitmentQueueItem): string[] {
    return this.isRecruiterQueueClaimed(item)
      ? ['/app/recruitment/sourcing', item.jobRequest.id]
      : ['/app/recruitment/queue'];
  }

  setRecruiterListingTab(tab: 'requisitions' | 'applicants'): void {
    this.activeRecruiterListingTab.set(tab);
  }

  topRecruiterApplicantsByJob(): CandidateOperationsApplication[] {
    const dashboard = this.recruiterDashboard();
    if (!dashboard) {
      return [];
    }

    const topByJob = new Map<string, CandidateOperationsApplication>();
    for (const item of dashboard.applications) {
      if (this.isTerminalApplication(item.application.applicationStatus)) {
        continue;
      }

      const key = this.recruiterApplicationJobKey(item);
      const current = topByJob.get(key);
      if (!current || this.compareRecruiterApplicantsForJob(item, current) < 0) {
        topByJob.set(key, item);
      }
    }

    return [...topByJob.values()].sort((left, right) => {
      const leftRanking = this.criticalApplicantRanking(left);
      const rightRanking = this.criticalApplicantRanking(right);
      return (
        (rightRanking?.score ?? -1) - (leftRanking?.score ?? -1) ||
        new Date(right.application.appliedAt).getTime() - new Date(left.application.appliedAt).getTime()
      );
    });
  }

  criticalApplicantRanking(item: CandidateOperationsApplication): ApplicantRankingMatch | undefined {
    return item.sourcing.applicantRankings.find(
      (ranking) => ranking.jobApplicationId === item.application.jobApplicationId,
    );
  }

  criticalApplicantScore(item: CandidateOperationsApplication): string {
    const ranking = this.criticalApplicantRanking(item);
    return ranking ? `${Math.round(ranking.score)}% fit` : 'Not ranked yet';
  }

  criticalApplicantInsight(item: CandidateOperationsApplication): string {
    const ranking = this.criticalApplicantRanking(item);
    if (!ranking) {
      return '';
    }

    return ranking.strengths[0] || ranking.explanation || '';
  }

  candidateInitials(name: string | null | undefined): string {
    const parts = (name ?? '')
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.length > 0
      ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
      : 'TP';
  }

  formatAssignmentAge(value: string | null | undefined): string {
    if (!value) {
      return 'Assigned date not recorded';
    }

    const assignedAt = new Date(value).getTime();
    if (Number.isNaN(assignedAt)) {
      return 'Assigned date not recorded';
    }

    const diffHours = Math.max(0, (Date.now() - assignedAt) / 3_600_000);
    if (diffHours < 24) {
      return `${Math.max(1, Math.round(diffHours))}h in queue`;
    }

    return `${Math.round(diffHours / 24)}d in queue`;
  }

  interviewSummary(passed: number, total: number): string {
    return total > 0 ? `${passed}/${total} interviews passed` : 'No interviews scheduled yet';
  }

  interviewTaskTime(task: InterviewTask): string {
    const startsAt = new Date(task.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return 'Time not set';
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(startsAt);
  }

  todayInterviewFollowUpMessage(): string {
    const tasks = this.todayInterviewFollowUpTasks();
    const name = this.firstName();

    if (tasks.length === 1) {
      return `Hi ${name}, today's interview with ${tasks[0].candidateName} is now more than an hour past its scheduled time. If feedback has not been submitted yet, please add it promptly so the hiring process can move forward without delay.`;
    }

    return `Hi ${name}, ${tasks.length} of today's interviews are now more than an hour past their scheduled time. If feedback is still outstanding, please add it promptly so the hiring process can move forward without delay.`;
  }

  formatTime(value: string | null | undefined): string {
    if (!value) {
      return 'Time not set';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Time not set';
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  interviewerTaskIcon(task: InterviewTask): string {
    if (this.isCompletedInterviewTask(task)) {
      return 'task_alt';
    }

    return this.isInterviewTaskOverdue(task) ? 'notification_important' : 'event';
  }

  interviewerTaskStatusLabel(task: InterviewTask): string {
    if (this.isCompletedInterviewTask(task)) {
      return 'Completed';
    }

    return this.isInterviewTaskOverdue(task) ? 'Overdue' : this.statusLabel(task.status || 'Scheduled');
  }

  interviewFeedbackActionLabel(task: InterviewTask): 'Add feedback' | 'Admin override feedback' | null {
    if (this.normalizeStatus(task.status) !== 'scheduled') {
      return null;
    }

    const currentUser = this.currentUser();
    if (!currentUser) {
      return null;
    }

    if (task.interviewerUserId === currentUser.id) {
      return 'Add feedback';
    }

    if (this.auth.isAdmin() && this.isInactiveInterviewTaskInterviewer(task)) {
      return 'Admin override feedback';
    }

    return null;
  }

  isCompletedInterviewTask(task: InterviewTask): boolean {
    return this.normalizeStatus(task.status) === 'completed';
  }

  isInterviewTaskOverdue(task: InterviewTask): boolean {
    const startsAt = new Date(task.startsAt).getTime();
    return !this.isCompletedInterviewTask(task) && !Number.isNaN(startsAt) && startsAt < Date.now();
  }

  isOneHourPastScheduledStart(task: InterviewTask): boolean {
    const startsAt = new Date(task.startsAt).getTime();
    return !Number.isNaN(startsAt) && Date.now() - startsAt >= 3_600_000;
  }

  averageInterviewTaskScore(task: InterviewTask): string {
    const scores = [task.technicalScore, task.communicationScore, task.cultureScore].filter(
      (score): score is number => typeof score === 'number',
    );

    if (scores.length === 0) {
      return 'Not scored';
    }

    const average = scores.reduce((total, score) => total + score, 0) / scores.length;
    return `${Math.round(average * 10) / 10}/5`;
  }

  private isInactiveInterviewTaskInterviewer(task: InterviewTask): boolean {
    return task.interviewerIsDeleted || this.normalizeStatus(task.interviewerAccountStatus) !== 'active';
  }

  applicantLabel(count: number): string {
    return count === 1 ? 'applicant' : 'applicants';
  }

  activityTitle(title: string): string {
    return formatActivityTitle(title);
  }

  formatPercent(value: number | null | undefined): string {
    return value === null || value === undefined ? '0%' : `${Math.round(value * 10) / 10}%`;
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  }

  valueOrDash(value: number | null | undefined): string {
    return value === null || value === undefined ? '-' : `${value}`;
  }

  formatScore(value: number | null | undefined): string {
    return value === null || value === undefined ? 'Not ranked' : `${Math.round(value)}% fit`;
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  }

  ownerLabel(request: JobRequest): string {
    if (request.stage === 'Closed') {
      return 'Closed';
    }

    const assignedUserId = request.ownerId ?? this.assignmentForRequest(request.id)?.assignedToUserId;
    if (assignedUserId) {
      const person = this.store.people().find((candidate) => candidate.userId === assignedUserId);
      if (person) {
        return person.displayName;
      }
    }

    if (request.stage === 'PMO Review' || request.stage === 'Presales Review') {
      return 'PMO / Presales';
    }
    if (request.stage === 'Recruiter Sourcing' || request.stage === 'Interviewing') {
      return 'Recruiting team';
    }
    if (request.stage === 'Hiring Manager Review' || request.stage === 'Offer Outcome') {
      return 'Hiring Manager';
    }
    return 'Talent Pilot';
  }

  private assignmentForRequest(jobRequestId: string): WorkflowAssignment | undefined {
    return this.store
      .assignments()
      .find((assignment) => assignment.entityId === jobRequestId && assignment.status !== 'Completed');
  }

  private isRecruiterQueueClaimed(item: RecruitmentQueueItem): boolean {
    return Boolean(item.assignment.claimedByUserId || item.assignment.assignedToUserId);
  }

  private isTerminalApplication(status: string | null | undefined): boolean {
    return ['rejected', 'withdrawn', 'joined', 'hired', 'offerdeclined'].includes(this.normalizeStatus(status));
  }

  private recruiterApplicationsForPost(
    post: JobPostListItem,
    applications: CandidateOperationsApplication[],
  ): CandidateOperationsApplication[] {
    return applications.filter((item) => {
      const linkedJobPostId = item.jobPost?.jobPostId ?? item.sourcing.jobPost?.jobPostId ?? null;
      return linkedJobPostId ? linkedJobPostId === post.jobPostId : item.sourcing.jobRequest.id === post.jobRequestId;
    });
  }

  private recruiterApplicationJobKey(item: CandidateOperationsApplication): string {
    return item.jobPost?.jobPostId
      ?? item.sourcing.jobPost?.jobPostId
      ?? item.sourcing.jobRequest.id;
  }

  private compareRecruiterApplicantsForJob(
    left: CandidateOperationsApplication,
    right: CandidateOperationsApplication,
  ): number {
    const leftRanking = this.criticalApplicantRanking(left);
    const rightRanking = this.criticalApplicantRanking(right);
    if (leftRanking || rightRanking) {
      return (rightRanking?.score ?? -1) - (leftRanking?.score ?? -1);
    }

    return (
      this.applicationActionPriority(left) - this.applicationActionPriority(right) ||
      new Date(right.application.appliedAt).getTime() - new Date(left.application.appliedAt).getTime()
    );
  }

  private applicationActionPriority(item: CandidateOperationsApplication): number {
    const status = this.normalizeStatus(item.application.applicationStatus);
    if (status === 'applied' || status === 'invited') {
      return 1;
    }

    if (item.application.interviewsTotal > 0 && item.application.interviewsPassed >= item.application.interviewsTotal) {
      return 2;
    }

    if (status.includes('interview')) {
      return 3;
    }

    return 4;
  }

  private isRecruiterInterviewFollowUp(item: CandidateOperationsInterview): boolean {
    if (this.isTerminalApplication(item.application.applicationStatus)) {
      return false;
    }

    const status = this.normalizeStatus(item.interview.status);
    return status === 'scheduled' || status === 'completed';
  }

  private sortedInterviewTasks(): InterviewTask[] {
    return [...this.interviewerTasks()].sort(
      (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );
  }

  private isSameLocalDay(value: string, compareWith: Date): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return (
      date.getFullYear() === compareWith.getFullYear() &&
      date.getMonth() === compareWith.getMonth() &&
      date.getDate() === compareWith.getDate()
    );
  }

  private normalizeStatus(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, '').toLowerCase();
  }

  private lastActivityAt(request: JobRequest): string {
    return (
      this.store
        .activity()
        .filter((event) => event.entityId === request.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
        ?.createdAt ?? request.createdAt
    );
  }

  private toStartIso(value: string): string | undefined {
    return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
  }

  private toEndIso(value: string): string | undefined {
    return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
  }
}
