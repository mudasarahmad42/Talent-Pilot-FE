import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
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
              <h2>Next AI-assisted work</h2>
              @if (nextPmoItem(); as item) {
                <p>
                  {{ item.jobRequest.code }} is waiting for PMO bench review before recruitment starts.
                </p>
                <a [routerLink]="['/app/job-requests', item.jobRequest.id]">Open request</a>
              } @else {
                <p>No PMO bench-review item is currently waiting in the backend snapshot.</p>
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
                <p><strong>{{ event.actorName }}</strong> {{ event.title }}</p>
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
  `,
})
export class DashboardComponent {
  readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly unreadCount = computed(() => {
    const user = this.currentUser();
    return user ? this.store.unreadCountForUser(user.id) : 0;
  });
  readonly myWork = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return [];
    }

    return this.store.pmoQueue().filter((item) => {
      const assignedToMyGroup = item.assignment.assignedToGroupId
        ? user.groups.includes(item.assignment.assignedToGroupId)
        : false;
      const assignedToMe = item.assignment.assignedToUserId === user.id;
      return assignedToMyGroup || assignedToMe;
    });
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
}
