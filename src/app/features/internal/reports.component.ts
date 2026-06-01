import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import {
  TenantAdminDashboard,
  TenantAdminDashboardAttentionItem,
  TenantAdminDashboardFunnelItem,
  TenantAdminDashboardPipelineItem,
  TenantAdminDashboardQuery,
  TenantAdminDashboardSkillDemandItem,
} from '../../core/models';

type ReportId =
  | 'overview'
  | 'funnel'
  | 'stage-aging'
  | 'source-quality'
  | 'department-skills'
  | 'interviews-offers'
  | 'ai-health';

type CsvValue = string | number | null | undefined;

@Component({
  selector: 'app-reports',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page ops-page reports-page">
      <header class="ops-page-header reports-header">
        <div>
          <p class="eyebrow">Admin Center / Tenant Reporting</p>
          <h1>Reports</h1>
          <p>Exportable, tenant-scoped reporting backed by job requests, job posts, candidates, interviews, offers, and AI runs.</p>
          @if (dashboard(); as reportData) {
            <small>Last refreshed {{ formatDateTime(reportData.generatedAtUtc) }}</small>
          }
        </div>
        <div class="ops-header-actions">
          <button class="btn secondary compact" type="button" (click)="loadReports()" [disabled]="loading()">
            <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
            Refresh
          </button>
          <button class="btn primary compact" type="button" (click)="exportActiveReport()" [disabled]="!dashboard()">
            <span class="material-symbols-outlined" aria-hidden="true">download</span>
            Export CSV
          </button>
        </div>
      </header>

      <section class="ops-panel reports-filter-panel" aria-label="Report filters">
        <label>
          From
          <input type="date" [(ngModel)]="filterFromDate" (change)="loadReports()" />
        </label>
        <label>
          To
          <input type="date" [(ngModel)]="filterToDate" (change)="loadReports()" />
        </label>
        <label>
          Department
          <select [(ngModel)]="filterDepartmentId" (change)="loadReports()">
            <option value="">All departments</option>
            @if (dashboard(); as reportData) {
              @for (department of reportData.filters.departments; track department.id) {
                <option [value]="department.id">{{ department.name }}</option>
              }
            }
          </select>
        </label>
        <label>
          Source
          <select [(ngModel)]="filterSourceLabel" (change)="loadReports()">
            <option value="">All sources</option>
            @if (dashboard(); as reportData) {
              @for (source of reportData.filters.sourceLabels; track source.id) {
                <option [value]="source.name">{{ source.name }}</option>
              }
            }
          </select>
        </label>
        <label>
          Recruiter
          <select [(ngModel)]="filterRecruiterUserId" (change)="loadReports()">
            <option value="">All recruiters</option>
            @if (dashboard(); as reportData) {
              @for (recruiter of reportData.filters.recruiters; track recruiter.id) {
                <option [value]="recruiter.id">{{ recruiter.name }}</option>
              }
            }
          </select>
        </label>
        <button class="btn secondary compact" type="button" (click)="clearFilters()">Reset</button>
      </section>

      @if (error()) {
        <p class="field-status error">{{ error() }}</p>
      }

      @if (dashboard(); as reportData) {
        <section class="reports-summary-grid" aria-label="Report summary">
          <article class="reports-summary-card">
            <span>Open requests</span>
            <strong>{{ reportData.summary.openJobRequests }}</strong>
            <small>{{ reportData.summary.openPositions }} open positions</small>
          </article>
          <article class="reports-summary-card">
            <span>Published posts</span>
            <strong>{{ reportData.summary.publishedJobPosts }}</strong>
            <small>Visible on candidate portal</small>
          </article>
          <article class="reports-summary-card">
            <span>Active applications</span>
            <strong>{{ reportData.summary.activeApplications }}</strong>
            <small>Non-terminal applications</small>
          </article>
          <article class="reports-summary-card">
            <span>Interviews this week</span>
            <strong>{{ reportData.summary.interviewsThisWeek }}</strong>
            <small>Scheduled next 7 days</small>
          </article>
          <article class="reports-summary-card">
            <span>Offers / joined</span>
            <strong>{{ reportData.summary.offers }} / {{ reportData.summary.joinedCandidates }}</strong>
            <small>Within selected range</small>
          </article>
        </section>

        <section class="reports-layout">
          <aside class="ops-panel reports-nav-panel" aria-label="Report sections">
            @for (report of reports; track report.id) {
              <button
                type="button"
                class="reports-nav-button"
                [class.active]="activeReport() === report.id"
                (click)="setActiveReport(report.id)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ report.icon }}</span>
                <span>
                  <strong>{{ report.label }}</strong>
                  <small>{{ report.description }}</small>
                </span>
              </button>
            }
          </aside>

          <div class="reports-main-stack">
            @if (activeReport() === 'overview') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Executive Overview</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Executive Overview means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Summarizes demand, candidate movement, operational exceptions, and final outcomes in one place.</span>
                        <span>Use this report as the starting point before drilling into funnel, stage aging, source quality, or AI health.</span>
                      </span>
                    </span>
                  </div>
                  <a routerLink="/app/job-requests">Open requests</a>
                </div>
                <div class="report-overview-grid">
                  <section>
                    <h3>Admin attention</h3>
                    <div class="report-attention-list">
                      @for (item of reportData.adminAttention; track item.title) {
                        <a [routerLink]="item.route" [class]="attentionClass(item)">
                          <strong>{{ item.count }}</strong>
                          <span>{{ item.title }}</span>
                          <small>{{ item.detail }}</small>
                        </a>
                      }
                    </div>
                  </section>
                  <section>
                    <h3>Operational efficiency</h3>
                    <div class="report-metric-grid">
                      <span><strong>{{ valueOrDash(reportData.operationalEfficiency.averageTimeToFillDays) }}</strong> avg days to fill</span>
                      <span><strong>{{ valueOrDash(reportData.operationalEfficiency.medianDaysOpen) }}</strong> median days open</span>
                      <span><strong>{{ reportData.operationalEfficiency.oldestOpenRequestDays }}</strong> oldest open request</span>
                      <span><strong>{{ reportData.operationalEfficiency.recruiterSourcingLoad }}</strong> recruiter load</span>
                    </div>
                  </section>
                </div>
              </article>
            }

            @if (activeReport() === 'funnel') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Hiring Funnel Report</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Hiring Funnel Report means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Shows where hiring work currently sits from PMO review through joined and closed requests.</span>
                        <span>Large counts in one stage indicate where work is accumulating and may need follow-up.</span>
                      </span>
                    </span>
                  </div>
                </div>
                @if (reportData.hiringFunnel.length > 0) {
                  <div class="report-funnel-list">
                    @for (item of reportData.hiringFunnel; track item.label) {
                      <a class="report-funnel-row" [routerLink]="routeForFunnel(item)">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.count }}</strong>
                        <i [style.width.%]="funnelWidth(item, reportData.hiringFunnel)"></i>
                        <small>{{ formatPercent(item.conversionRate) }} conversion</small>
                      </a>
                    }
                  </div>
                } @else {
                  <div class="empty-state">No funnel activity exists for this tenant yet.</div>
                }
              </article>
            }

            @if (activeReport() === 'stage-aging') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Stage Aging & Bottlenecks</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Stage Aging means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Lists open job requests by days spent in the current stage.</span>
                        <span>High-risk rows are the best candidates for admin escalation or workflow cleanup.</span>
                      </span>
                    </span>
                  </div>
                  <a routerLink="/app/job-requests">All requests</a>
                </div>
                @if (reportData.stageAging.length > 0) {
                  <div class="report-table-wrap">
                    <table class="report-table">
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
                        @for (request of reportData.stageAging; track request.jobRequestId) {
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
            }

            @if (activeReport() === 'source-quality') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Source Quality Report</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Source Quality Report means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Compares candidate sources by application volume, interview pass rate, offers, joined hires, and rejection or withdrawal rate.</span>
                        <span>Good sources should produce interviews, offers, and joined candidates, not just volume.</span>
                      </span>
                    </span>
                  </div>
                  <a routerLink="/app/candidates">Candidate pool</a>
                </div>
                @if (reportData.sourceQuality.length > 0) {
                  <div class="report-table-wrap">
                    <table class="report-table">
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
                        @for (source of reportData.sourceQuality; track source.sourceLabel) {
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
                  <div class="empty-state">No application source data exists in the selected range.</div>
                }
              </article>
            }

            @if (activeReport() === 'department-skills') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Department & Skills Demand</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Department and Skills Demand means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Compares hiring demand by department and shows requested skills against available candidate skills.</span>
                        <span>A high demand count with low candidate availability signals sourcing risk.</span>
                      </span>
                    </span>
                  </div>
                </div>
                <div class="report-section-grid">
                  <section>
                    <h3>Department performance</h3>
                    @if (reportData.departmentPerformance.length > 0) {
                      <div class="report-table-wrap">
                        <table class="report-table compact">
                          <thead>
                            <tr>
                              <th>Department</th>
                              <th>Requests</th>
                              <th>Open pos.</th>
                              <th>Apps</th>
                              <th>Interviews</th>
                              <th>Joined</th>
                              <th>Avg days</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (department of reportData.departmentPerformance; track department.department) {
                              <tr>
                                <td>{{ department.department }}</td>
                                <td>{{ department.openRequests }}</td>
                                <td>{{ department.openPositions }}</td>
                                <td>{{ department.applications }}</td>
                                <td>{{ department.interviews }}</td>
                                <td>{{ department.joined }}</td>
                                <td>{{ valueOrDash(department.averageTimeToFillDays) }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    } @else {
                      <div class="empty-state">No department activity to report.</div>
                    }
                  </section>
                  <section>
                    <h3>Skills demand</h3>
                    @if (reportData.skillsDemand.length > 0) {
                      <div class="report-skill-list">
                        @for (skill of reportData.skillsDemand; track skill.skill) {
                          <div>
                            <span>{{ skill.skill }}</span>
                            <i [style.width.%]="skillDemandWidth(skill.demandCount, reportData.skillsDemand)"></i>
                            <small>{{ skill.demandCount }} demand / {{ skill.candidateCount }} candidates / {{ skill.gap }} gap</small>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-state">No skill demand has been recorded.</div>
                    }
                  </section>
                </div>
              </article>
            }

            @if (activeReport() === 'interviews-offers') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>Interviews & Offer Outcomes</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What Interviews and Offer Outcomes means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Tracks interview execution, feedback discipline, offer drafts, meetings, and final candidate outcomes.</span>
                        <span>Pending feedback and offer declines are operational warning signs.</span>
                      </span>
                    </span>
                  </div>
                  <a routerLink="/app/interview-feedback">Feedback</a>
                </div>
                <div class="report-section-grid">
                  <section>
                    <h3>Interview operations</h3>
                    <div class="report-metric-grid">
                      <span><strong>{{ reportData.interviewOperations.scheduled }}</strong> scheduled</span>
                      <span><strong>{{ reportData.interviewOperations.completed }}</strong> completed</span>
                      <span><strong>{{ reportData.interviewOperations.skipped }}</strong> skipped</span>
                      <span><strong>{{ reportData.interviewOperations.noShow }}</strong> no-show</span>
                      <span class="danger"><strong>{{ reportData.interviewOperations.pendingFeedback }}</strong> pending feedback</span>
                      <span class="danger"><strong>{{ reportData.interviewOperations.overdueFeedback }}</strong> overdue</span>
                    </div>
                  </section>
                  <section>
                    <h3>Offer and fulfillment health</h3>
                    <div class="report-metric-grid">
                      <span><strong>{{ reportData.offerHealth.offerLetters }}</strong> offer drafts</span>
                      <span><strong>{{ reportData.offerHealth.presentationMeetings }}</strong> presentation meetings</span>
                      <span><strong>{{ reportData.offerHealth.offered }}</strong> offered</span>
                      <span><strong>{{ reportData.offerHealth.onHold }}</strong> on hold</span>
                      <span><strong>{{ reportData.offerHealth.rejected }}</strong> rejected</span>
                      <span><strong>{{ reportData.offerHealth.joined }}</strong> joined</span>
                    </div>
                  </section>
                </div>
              </article>
            }

            @if (activeReport() === 'ai-health') {
              <article class="ops-panel report-panel">
                <div class="panel-header">
                  <div class="section-title-with-help">
                    <h2>AI Health Report</h2>
                    <span class="agent-help admin-analytics-help">
                      <button type="button" class="agent-help-trigger" aria-label="What AI Health Report means">
                        <span class="material-symbols-outlined" aria-hidden="true">info</span>
                      </button>
                      <span class="agent-help-popover admin-analytics-popover" role="tooltip">
                        <strong>What this implies</strong>
                        <span>Shows whether advisory AI agents are running successfully and whether embeddings exist for semantic matching.</span>
                        <span>Low vector coverage means recommendation agents have less stored evidence for comparison.</span>
                      </span>
                    </span>
                  </div>
                  <a routerLink="/admin-center/ai-settings">AI Settings</a>
                </div>
                <div class="report-metric-grid ai-health-grid">
                  <span><strong>{{ reportData.aiHealth.runsToday }}</strong> runs today</span>
                  <span><strong>{{ reportData.aiHealth.failedRuns }}</strong> failed runs</span>
                  <span><strong>{{ reportData.aiHealth.activeEmbeddings }}</strong> active vectors</span>
                  <span><strong>{{ reportData.aiHealth.candidateEmbeddings }}</strong> candidate vectors</span>
                  <span><strong>{{ reportData.aiHealth.jobRequestEmbeddings + reportData.aiHealth.jobPostEmbeddings }}</strong> requirement vectors</span>
                  <span><strong>{{ reportData.aiHealth.employeeEmbeddings }}</strong> employee vectors</span>
                </div>
                <p class="admin-muted">
                  Latest bench matching: {{ formatDateTime(reportData.aiHealth.latestBenchMatchingAt) }}.
                  Latest talent rediscovery: {{ formatDateTime(reportData.aiHealth.latestTalentRediscoveryAt) }}.
                </p>
              </article>
            }
          </div>
        </section>
      } @else if (loading()) {
        <section class="ops-panel empty-state">Loading reports from backend...</section>
      } @else {
        <section class="ops-panel empty-state">
          <strong>Reports could not be loaded.</strong>
          <p>{{ error() ?? 'Try refreshing the page.' }}</p>
        </section>
      }
    </main>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);

  readonly dashboard = signal<TenantAdminDashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeReport = signal<ReportId>('overview');

  filterFromDate = '';
  filterToDate = '';
  filterDepartmentId = '';
  filterSourceLabel = '';
  filterRecruiterUserId = '';

  readonly reports: ReadonlyArray<{ id: ReportId; label: string; description: string; icon: string }> = [
    {
      id: 'overview',
      label: 'Executive Overview',
      description: 'Snapshot of tenant health and admin attention items.',
      icon: 'dashboard',
    },
    {
      id: 'funnel',
      label: 'Hiring Funnel',
      description: 'Stage counts and conversion rates.',
      icon: 'filter_alt',
    },
    {
      id: 'stage-aging',
      label: 'Stage Aging',
      description: 'Open requests by days in current stage.',
      icon: 'hourglass',
    },
    {
      id: 'source-quality',
      label: 'Source Quality',
      description: 'Candidate sources and outcome quality.',
      icon: 'source',
    },
    {
      id: 'department-skills',
      label: 'Department & Skills',
      description: 'Demand, supply, and skill gaps.',
      icon: 'analytics',
    },
    {
      id: 'interviews-offers',
      label: 'Interviews & Offers',
      description: 'Interview throughput and offer outcomes.',
      icon: 'event_available',
    },
    {
      id: 'ai-health',
      label: 'AI Health',
      description: 'Agent runs and vector coverage.',
      icon: 'smart_toy',
    },
  ];

  ngOnInit(): void {
    void this.loadReports();
  }

  setActiveReport(reportId: ReportId): void {
    this.activeReport.set(reportId);
  }

  async loadReports(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const query: TenantAdminDashboardQuery = {
        fromUtc: this.toStartIso(this.filterFromDate),
        toUtc: this.toEndIso(this.filterToDate),
        departmentId: this.filterDepartmentId || undefined,
        sourceLabel: this.filterSourceLabel || undefined,
        recruiterUserId: this.filterRecruiterUserId || undefined,
      };
      const reportData = await this.store.loadTenantAdminDashboard(query);
      this.dashboard.set(reportData);
    } catch {
      this.error.set('Reports could not be loaded from the backend.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters(): void {
    this.filterFromDate = '';
    this.filterToDate = '';
    this.filterDepartmentId = '';
    this.filterSourceLabel = '';
    this.filterRecruiterUserId = '';
    void this.loadReports();
  }

  exportActiveReport(): void {
    const reportData = this.dashboard();
    if (!reportData) {
      return;
    }

    const reportId = this.activeReport();
    const rows = this.csvRowsForReport(reportId, reportData);
    this.downloadCsv(`talent-pilot-${reportId}-report.csv`, rows);
  }

  funnelWidth(item: TenantAdminDashboardFunnelItem, items: TenantAdminDashboardFunnelItem[]): number {
    const max = Math.max(...items.map((candidate) => candidate.count), 1);
    return Math.max(4, Math.round((item.count / max) * 100));
  }

  skillDemandWidth(count: number, items: TenantAdminDashboardSkillDemandItem[]): number {
    const max = Math.max(...items.map((item) => item.demandCount), 1);
    return Math.max(6, Math.round((count / max) * 100));
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
    return `report-attention-item ${item.severity.toLowerCase()}`;
  }

  riskClass(risk: string): string {
    return `risk-pill ${risk.toLowerCase()}`;
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

  private csvRowsForReport(reportId: ReportId, reportData: TenantAdminDashboard): CsvValue[][] {
    if (reportId === 'overview') {
      return [
        ['Metric', 'Value'],
        ['Open job requests', reportData.summary.openJobRequests],
        ['Open positions', reportData.summary.openPositions],
        ['Published job posts', reportData.summary.publishedJobPosts],
        ['Active applications', reportData.summary.activeApplications],
        ['Interviews this week', reportData.summary.interviewsThisWeek],
        ['Offers', reportData.summary.offers],
        ['Joined candidates', reportData.summary.joinedCandidates],
        [],
        ['Admin attention', 'Count', 'Detail'],
        ...reportData.adminAttention.map((item) => [item.title, item.count, item.detail]),
      ];
    }

    if (reportId === 'funnel') {
      return [
        ['Stage', 'Count', 'Conversion rate'],
        ...reportData.hiringFunnel.map((item) => [item.label, item.count, this.formatPercent(item.conversionRate)]),
      ];
    }

    if (reportId === 'stage-aging') {
      return [
        ['Code', 'Title', 'Department', 'Current stage', 'Owner', 'Days in stage', 'Risk'],
        ...reportData.stageAging.map((item) => [
          item.requestCode,
          item.title,
          item.department,
          item.currentStage,
          item.ownerName,
          item.daysInStage,
          item.risk,
        ]),
      ];
    }

    if (reportId === 'source-quality') {
      return [
        ['Source', 'Applications', 'Interview pass rate', 'Offers', 'Joined', 'Rejected / withdrawn rate'],
        ...reportData.sourceQuality.map((source) => [
          source.sourceLabel,
          source.applications,
          this.formatPercent(source.interviewPassRate),
          source.offers,
          source.joined,
          this.formatPercent(source.rejectionWithdrawalRate),
        ]),
      ];
    }

    if (reportId === 'department-skills') {
      return [
        ['Department performance'],
        ['Department', 'Requests', 'Open positions', 'Applications', 'Interviews', 'Joined', 'Average days to fill'],
        ...reportData.departmentPerformance.map((department) => [
          department.department,
          department.openRequests,
          department.openPositions,
          department.applications,
          department.interviews,
          department.joined,
          this.valueOrDash(department.averageTimeToFillDays),
        ]),
        [],
        ['Skills demand'],
        ['Skill', 'Demand count', 'Candidate count', 'Gap'],
        ...reportData.skillsDemand.map((skill) => [skill.skill, skill.demandCount, skill.candidateCount, skill.gap]),
      ];
    }

    if (reportId === 'interviews-offers') {
      return [
        ['Interview operations'],
        ['Scheduled', reportData.interviewOperations.scheduled],
        ['Completed', reportData.interviewOperations.completed],
        ['Skipped', reportData.interviewOperations.skipped],
        ['No-show', reportData.interviewOperations.noShow],
        ['Pending feedback', reportData.interviewOperations.pendingFeedback],
        ['Overdue feedback', reportData.interviewOperations.overdueFeedback],
        [],
        ['Offer health'],
        ['Offer drafts', reportData.offerHealth.offerLetters],
        ['Presentation meetings', reportData.offerHealth.presentationMeetings],
        ['Offered', reportData.offerHealth.offered],
        ['On hold', reportData.offerHealth.onHold],
        ['Rejected', reportData.offerHealth.rejected],
        ['Joined', reportData.offerHealth.joined],
      ];
    }

    return [
      ['Metric', 'Value'],
      ['Runs today', reportData.aiHealth.runsToday],
      ['Failed runs', reportData.aiHealth.failedRuns],
      ['Active embeddings', reportData.aiHealth.activeEmbeddings],
      ['Candidate embeddings', reportData.aiHealth.candidateEmbeddings],
      ['Job request embeddings', reportData.aiHealth.jobRequestEmbeddings],
      ['Job post embeddings', reportData.aiHealth.jobPostEmbeddings],
      ['Employee embeddings', reportData.aiHealth.employeeEmbeddings],
      ['Latest bench matching', this.formatDateTime(reportData.aiHealth.latestBenchMatchingAt)],
      ['Latest talent rediscovery', this.formatDateTime(reportData.aiHealth.latestTalentRediscoveryAt)],
    ];
  }

  private downloadCsv(fileName: string, rows: CsvValue[][]): void {
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private toStartIso(value: string): string | undefined {
    return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
  }

  private toEndIso(value: string): string | undefined {
    return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
  }
}
