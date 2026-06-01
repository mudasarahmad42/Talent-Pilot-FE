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
                    <span class="status-badge">{{ item.jobRequest.stage }}</span>
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
      <main class="page ops-page dashboard-page recruiter-dashboard-page">
        <header class="ops-page-header recruiter-dashboard-header">
          <div>
            <p class="eyebrow">Recruiter workspace</p>
            <h1>Recruiter Sourcing Dashboard</h1>
            <p>Claim PMO-forwarded requests, publish job posts, rank applicants, and keep interviews moving.</p>
          </div>
        </header>

        @if (recruiterLoading()) {
          <section class="ops-panel empty-state">Loading recruiter dashboard...</section>
        } @else if (recruiterDashboard(); as dashboard) {
          @if (recruiterError()) {
            <p class="field-status error">{{ recruiterError() }}</p>
          }

          <section class="admin-kpi-grid recruiter-kpi-grid">
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/recruitment/queue">
              <span>Sourcing work</span>
              <strong>{{ recruiterStats().sourcingWork }}</strong>
              <small>Pending group work plus your claimed requests</small>
            </a>
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/recruitment/queue">
              <span>Claimed by me</span>
              <strong>{{ recruiterStats().claimedByMe }}</strong>
              <small>Requests you currently own</small>
            </a>
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/job-publishing">
              <span>Draft posts</span>
              <strong>{{ recruiterStats().draftPosts }}</strong>
              <small>Need publishing before portal applications</small>
            </a>
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/job-publishing">
              <span>Published posts</span>
              <strong>{{ recruiterStats().publishedPosts }}</strong>
              <small>Visible on the candidate portal</small>
            </a>
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/candidate-pipeline">
              <span>Active applications</span>
              <strong>{{ recruiterStats().activeApplications }}</strong>
              <small>Current candidates not in terminal states</small>
            </a>
            <a class="admin-kpi-card recruiter-kpi-card" routerLink="/app/interview-scheduling">
              <span>Interview follow-ups</span>
              <strong>{{ recruiterStats().interviewFollowUps }}</strong>
              <small>Scheduled interviews or feedback follow-ups</small>
            </a>
          </section>

          <section class="admin-dashboard-grid recruiter-dashboard-grid">
            <article class="ops-panel admin-panel admin-wide-panel recruiter-priority-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Priority Sourcing Work</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Priority Sourcing Work means" aria-describedby="recruiter-priority-work-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="recruiter-priority-work-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Shows recruiter-visible SOURCING work: unclaimed group items and requests claimed by you.</span>
                        <span>Unclaimed rows should be picked from Recruitment Queue; claimed rows should be opened and moved through job post, applications, and interviews.</span>
                      </span>
                    </span>
                  </div>
                  <p>Active PMO handoffs that need recruiter ownership or sourcing progress.</p>
                </div>
                <a routerLink="/app/recruitment/queue">Recruitment Queue</a>
              </div>

              @if (recruiterPriorityQueue().length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table recruiter-work-table">
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Client / department</th>
                        <th>Ownership</th>
                        <th>Job post</th>
                        <th>Next action</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of recruiterPriorityQueue(); track item.jobRequest.id) {
                        <tr>
                          <td>
                            <strong>{{ item.jobRequest.code }}</strong>
                            <small>{{ item.jobRequest.title }}</small>
                          </td>
                          <td>
                            <strong>{{ item.jobRequest.client }}</strong>
                            <small>{{ item.jobRequest.department }} - {{ item.jobRequest.location }}</small>
                          </td>
                          <td>
                            <span class="status-badge">{{ recruiterOwnerLabel(item) }}</span>
                            <small>{{ formatAssignmentAge(item.assignment.assignedAt) }}</small>
                          </td>
                          <td>
                            <span class="status-badge">{{ item.jobPostStatus }}</span>
                            <small>{{ item.jobPostUpdatedAt ? formatDateTime(item.jobPostUpdatedAt) : 'No job post yet' }}</small>
                          </td>
                          <td>
                            <a class="btn secondary compact" [routerLink]="['/app/recruitment/sourcing', item.jobRequest.id]">
                              {{ recruiterQueueActionLabel(item) }}
                            </a>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">No recruiter-visible sourcing work is currently available.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Applications to Move</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Applications to Move means" aria-describedby="recruiter-applications-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="recruiter-applications-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Current applicants from the portal or manual sourcing that still need recruiter action.</span>
                        <span>Use this to schedule first interviews, follow up after feedback, or forward completed interview packets to Hiring Manager Review.</span>
                      </span>
                    </span>
                  </div>
                  <p>Non-terminal applications connected to your visible job posts.</p>
                </div>
                <a routerLink="/app/candidate-pipeline">Pipeline</a>
              </div>
              @if (recruiterApplicationActions().length > 0) {
                <div class="recruiter-action-list">
                  @for (item of recruiterApplicationActions(); track item.application.jobApplicationId) {
                    <a class="recruiter-action-row" [routerLink]="['/app/recruitment/sourcing', item.sourcing.jobRequest.id]" [queryParams]="{ tab: 'applications' }">
                      <span>
                        <strong>{{ item.application.candidateName }}</strong>
                        <small>{{ item.application.currentDesignation || 'Candidate' }} - {{ item.application.sourceLabel }}</small>
                      </span>
                      <span>
                        <strong>{{ item.jobPost?.title ?? item.sourcing.jobRequest.title }}</strong>
                        <small>{{ item.application.interviewPassSummary || interviewSummary(item.application.interviewsPassed, item.application.interviewsTotal) }}</small>
                      </span>
                      <span class="status-badge">{{ statusLabel(item.application.applicationStatus) }}</span>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state">No active applications need recruiter action right now.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Job Post Publishing</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Job Post Publishing means" aria-describedby="recruiter-posting-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="recruiter-posting-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Tracks draft, published, and closed Talent Pilot job posts owned by recruiting.</span>
                        <span>Draft posts need review and publishing; published posts should be monitored for applications and applicant ranking.</span>
                      </span>
                    </span>
                  </div>
                  <p>Latest recruiter job posts and publication states.</p>
                </div>
                <a routerLink="/app/job-publishing">Job Publishing</a>
              </div>
              @if (recruiterLatestPosts().length > 0) {
                <div class="recruiter-post-list">
                  @for (post of recruiterLatestPosts(); track post.jobPostId) {
                    <a class="recruiter-post-row" [routerLink]="['/app/recruitment/sourcing', post.jobRequestId]">
                      <span>
                        <strong>{{ post.title }}</strong>
                        <small>{{ post.requestCode }} - {{ post.department }} - {{ post.location }}</small>
                      </span>
                      <span class="status-badge">{{ post.status }}</span>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state">No job posts have been created yet.</div>
              }
            </article>

            <article class="ops-panel admin-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>AI Recruiting Support</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What AI Recruiting Support means" aria-describedby="recruiter-ai-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="recruiter-ai-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Summarizes recruiter-side advisory AI: Talent Rediscovery for warm candidates and Applicant Ranking for current applications.</span>
                        <span>AI output is advisory only. Recruiters still decide who to invite, interview, reject, or forward.</span>
                      </span>
                    </span>
                  </div>
                  <p>Advisory signals available in recruiter sourcing flows.</p>
                </div>
              </div>
              <div class="admin-ai-grid recruiter-ai-grid">
                <a routerLink="/app/recruitment/talent-rediscovery" [queryParams]="firstRecruiterJobRequestId() ? { jobRequestId: firstRecruiterJobRequestId() } : null">
                  <span>Talent Rediscovery</span>
                  <strong>{{ recruiterStats().rediscoveredCandidates }}</strong>
                  <small>Warm candidates ranked before external sourcing.</small>
                </a>
                <a [routerLink]="firstRecruiterJobRequestId() ? ['/app/recruitment/sourcing', firstRecruiterJobRequestId()] : ['/app/recruitment/queue']" [queryParams]="{ tab: 'applications' }">
                  <span>Applicant Ranking</span>
                  <strong>{{ recruiterStats().rankedApplicants }}</strong>
                  <small>Current applications with persisted AI fit scores.</small>
                </a>
                <a [routerLink]="firstRecruiterJobRequestId() ? ['/app/recruitment/sourcing', firstRecruiterJobRequestId()] : ['/app/recruitment/queue']" [queryParams]="{ tab: 'job-post' }">
                  <span>Job Post Drafting</span>
                  <strong>{{ recruiterStats().draftPosts }}</strong>
                  <small>Draft posts can be refined and published manually.</small>
                </a>
              </div>
            </article>

            <article class="ops-panel admin-panel admin-wide-panel">
              <div class="panel-header">
                <div>
                  <div class="section-title-with-help">
                    <h2>Interview Follow-ups</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Interview Follow-ups means" aria-describedby="recruiter-interview-help">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span id="recruiter-interview-help" class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Upcoming scheduled interviews and completed interviews that may still need feedback review.</span>
                        <span>After all configured rounds are completed or skipped, the recruiter can forward the candidate to Hiring Manager Review.</span>
                      </span>
                    </span>
                  </div>
                  <p>Scheduled interviews and feedback checkpoints across active applications.</p>
                </div>
                <a routerLink="/app/interview-scheduling">Interview Scheduling</a>
              </div>
              @if (recruiterInterviewFollowUps().length > 0) {
                <div class="admin-table-wrap">
                  <table class="admin-dashboard-table compact">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Job</th>
                        <th>Round</th>
                        <th>When</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of recruiterInterviewFollowUps(); track item.interview.interviewId) {
                        <tr>
                          <td>
                            <strong>{{ item.application.candidateName }}</strong>
                            <small>{{ item.application.candidateEmail }}</small>
                          </td>
                          <td>{{ item.jobPost?.title ?? item.sourcing.jobRequest.title }}</td>
                          <td>{{ item.interview.roundName }}</td>
                          <td>{{ formatDateTime(item.interview.startsAt) }}</td>
                          <td><span class="status-badge">{{ statusLabel(item.interview.status) }}</span></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <div class="empty-state">No interview follow-ups are currently visible.</div>
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
  readonly adminDashboard = signal<TenantAdminDashboard | null>(null);
  readonly adminLoading = signal(false);
  readonly adminError = signal<string | null>(null);
  readonly pmoDashboard = signal<PmoDashboard | null>(null);
  readonly pmoLoading = signal(false);
  readonly pmoError = signal<string | null>(null);
  readonly recruiterDashboard = signal<CandidateOperationsDataset | null>(null);
  readonly recruiterLoading = signal(false);
  readonly recruiterError = signal<string | null>(null);
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
  readonly firstRecruiterJobRequestId = computed(
    () =>
      this.recruiterPriorityQueue()[0]?.jobRequest.id ??
      this.recruiterLatestPosts()[0]?.jobRequestId ??
      this.recruiterDashboard()?.sourcing[0]?.jobRequest.id ??
      null,
  );

  ngOnInit(): void {
    if (this.isTenantAdmin()) {
      void this.loadAdminDashboard();
    } else if (this.isPmoOnly()) {
      void this.loadPmoDashboard();
    } else if (this.isRecruiterOnly()) {
      void this.loadRecruiterDashboard();
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
    if (item.label === 'Offered' || item.label === 'Joined') {
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

  statusLabel(status: string): string {
    return status.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  recruiterOwnerLabel(item: RecruitmentQueueItem): string {
    if (this.isRecruiterQueueClaimed(item)) {
      return item.recruiterOwnerName ? `Claimed by ${item.recruiterOwnerName}` : 'Claimed';
    }

    return 'Unclaimed group work';
  }

  recruiterQueueActionLabel(item: RecruitmentQueueItem): string {
    return this.isRecruiterQueueClaimed(item) ? 'Open workspace' : 'Claim in queue';
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
