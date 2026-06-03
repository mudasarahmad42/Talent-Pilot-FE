import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InterviewTask, SubmitInterviewFeedbackInput } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { AuthService } from '../../core/auth.service';

type FeedbackForm = {
  technicalScore: number;
  communicationScore: number;
  cultureScore: number;
  recommendation: string;
  feedbackText: string;
};

@Component({
  selector: 'app-interview-feedback',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page ops-page interview-feedback-page">
      <header class="ops-page-header interview-feedback-header">
        <div>
          <p class="eyebrow">Interview operations</p>
          <h1>Interview Feedback</h1>
          <p>Complete assigned candidate interviews and submit structured feedback for the recruiter.</p>
        </div>
        <div class="ops-header-actions">
          <a class="btn secondary compact" routerLink="/app/interview-scheduling">
            <span class="material-symbols-outlined" aria-hidden="true">event</span>
            Schedule
          </a>
          <a class="btn secondary compact" routerLink="/app/candidate-pipeline">
            <span class="material-symbols-outlined" aria-hidden="true">account_tree</span>
            Pipeline
          </a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading interview tasks...</section>
      } @else {
        @if (message()) {
          <p class="field-status success">{{ message() }}</p>
        }
        @if (error()) {
          <p class="field-status error">{{ error() }}</p>
        }

        <section class="ops-stats-grid interview-feedback-stats" aria-label="Interview feedback summary">
          <article class="ops-stat-card">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">assignment_ind</span>
            <div>
              <span>Assigned</span>
              <strong>{{ tasks().length }}</strong>
              <small>Interview tasks</small>
            </div>
          </article>
          <article class="ops-stat-card success">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">task_alt</span>
            <div>
              <span>Completed</span>
              <strong>{{ completedCount() }}</strong>
              <small>Feedback submitted</small>
            </div>
          </article>
          <article class="ops-stat-card warning">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">rate_review</span>
            <div>
              <span>Pending</span>
              <strong>{{ pendingCount() }}</strong>
              <small>Needs feedback</small>
            </div>
          </article>
          <article class="ops-stat-card danger">
            <span class="ops-stat-icon material-symbols-outlined" aria-hidden="true">notification_important</span>
            <div>
              <span>Overdue</span>
              <strong>{{ overdueCount() }}</strong>
              <small>Past schedule</small>
            </div>
          </article>
        </section>

        <section class="ops-panel interview-feedback-workbench">
          <div class="panel-header">
            <div>
              <h2>Assigned interviews</h2>
              <p class="muted">Feedback completion moves the candidate back to recruiter control for the next round.</p>
            </div>
            <span class="status-badge info">{{ pendingCount() }} pending</span>
          </div>

          @if (tasks().length === 0) {
            <article class="empty-state feedback-empty-state">
              <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
              <strong>No interview tasks assigned</strong>
              <p>Scheduled interviews assigned to you will appear here when a recruiter starts an interview round.</p>
            </article>
          } @else {
            <div class="interview-task-grid">
              @for (task of sortedTasks(); track task.interviewId) {
              <article class="interview-task-card" [class.completed-card]="task.status === 'Completed'" [class.overdue-card]="isOverdue(task)">
                <header class="task-card-header">
                  <div class="task-title-stack">
                    <span class="task-status-icon material-symbols-outlined" aria-hidden="true">{{ taskIcon(task) }}</span>
                    <div>
                      <p class="eyebrow">{{ task.requestCode }} - {{ task.client }}</p>
                      <h3>{{ task.candidateName }}</h3>
                      <p>{{ task.jobTitle }} - {{ task.roundName }}</p>
                    </div>
                  </div>
                  <span
                    class="status-badge"
                    [class.completed]="task.status === 'Completed'"
                    [class.warning]="task.status !== 'Completed' && !isOverdue(task)"
                    [class.danger]="isOverdue(task)"
                  >
                    {{ displayStatus(task) }}
                  </span>
                </header>

                <div class="task-context-row" aria-label="Interview context">
                  <span>
                    <span class="material-symbols-outlined" aria-hidden="true">person</span>
                    Candidate interview
                  </span>
                  <span>
                    <span class="material-symbols-outlined" aria-hidden="true">person_check</span>
                    Recruiter: {{ task.scheduledByName }}
                  </span>
                  @if (task.status === 'Completed') {
                    <span>
                      <span class="material-symbols-outlined" aria-hidden="true">analytics</span>
                      Avg score {{ averageScore(task) }}/5
                    </span>
                  }
                </div>

                <dl class="task-meta-grid">
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">event</span>
                    <dt>Scheduled</dt>
                    <dd>{{ task.startsAt | date: 'medium' }}</dd>
                  </div>
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">timer</span>
                    <dt>Duration</dt>
                    <dd>{{ task.durationMinutes }} minutes</dd>
                  </div>
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
                    <dt>Recruiter</dt>
                    <dd>{{ task.scheduledByName }}</dd>
                  </div>
                  <div>
                    <span class="material-symbols-outlined" aria-hidden="true">mail</span>
                    <dt>Candidate email</dt>
                    <dd>{{ task.candidateEmail }}</dd>
                  </div>
                </dl>

                @if (task.meetingLink || task.locationText) {
                  <div class="task-location">
                    @if (task.meetingLink) {
                      <a [href]="task.meetingLink" target="_blank" rel="noopener noreferrer">
                        <span class="material-symbols-outlined" aria-hidden="true">videocam</span>
                        Open meeting link
                      </a>
                    }
                    @if (task.locationText) {
                      <span class="task-note" aria-label="Interview notes">
                        <span class="material-symbols-outlined" aria-hidden="true">notes</span>
                        <span>{{ task.locationText }}</span>
                      </span>
                    }
                  </div>
                }

                @if (task.status === 'Completed') {
                  <section class="completed-feedback">
                    <div>
                      <span class="material-symbols-outlined" aria-hidden="true">verified</span>
                      <strong>{{ task.recommendation }}</strong>
                    </div>
                    <div class="feedback-score-row">
                      <span>Technical {{ task.technicalScore }}/5</span>
                      <span>Communication {{ task.communicationScore }}/5</span>
                      <span>Culture {{ task.cultureScore }}/5</span>
                    </div>
                    <p>{{ task.feedbackText }}</p>
                    <small>Submitted {{ task.submittedAt | date: 'medium' }}</small>
                  </section>
                } @else if (feedbackActionLabel(task); as feedbackActionLabel) {
                  <footer class="task-action-footer">
                    <span [class.overdue-text]="isOverdue(task)">
                      {{ isOverdue(task) ? 'Feedback is overdue for this scheduled interview.' : 'Submit feedback after the interview is completed.' }}
                    </span>
                    <button class="btn primary compact" type="button" (click)="openFeedback(task)">
                      <span class="material-symbols-outlined" aria-hidden="true">edit_note</span>
                      {{ feedbackActionLabel }}
                    </button>
                  </footer>
                } @else {
                  <footer class="task-action-footer">
                    <span>
                      Feedback is assigned to {{ task.interviewerName }}.
                    </span>
                  </footer>
                }
              </article>
            }
            </div>
          }
        </section>
      }

      @if (feedbackTask(); as task) {
        <div class="feedback-modal-backdrop" role="presentation">
          <form class="feedback-modal-panel" (ngSubmit)="submitFeedback(task)">
            <header class="panel-header">
              <div>
                <p class="eyebrow">Submit feedback</p>
                <h2>{{ task.roundName }} - {{ task.candidateName }}</h2>
                <p class="muted">This marks the interview completed and notifies the recruiter.</p>
              </div>
              <button class="icon-button" type="button" aria-label="Close" (click)="closeFeedback()">
                <span class="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </header>

            @if (isAdminOverrideFeedback(task)) {
              <p class="field-status warning admin-override-warning">
                This feedback will be recorded as an admin override because the assigned interviewer is inactive.
              </p>
            }

            <div class="score-grid">
              <label class="stitch-field">
                <span><span class="material-symbols-outlined" aria-hidden="true">code</span> Technical</span>
                <input type="number" name="technicalScore" min="1" max="5" required [(ngModel)]="feedbackForm.technicalScore" />
              </label>
              <label class="stitch-field">
                <span><span class="material-symbols-outlined" aria-hidden="true">forum</span> Communication</span>
                <input type="number" name="communicationScore" min="1" max="5" required [(ngModel)]="feedbackForm.communicationScore" />
              </label>
              <label class="stitch-field">
                <span><span class="material-symbols-outlined" aria-hidden="true">diversity_3</span> Culture</span>
                <input type="number" name="cultureScore" min="1" max="5" required [(ngModel)]="feedbackForm.cultureScore" />
              </label>
            </div>

            <label class="stitch-field">
              <span>Recommendation</span>
              <select name="recommendation" required [(ngModel)]="feedbackForm.recommendation">
                <option value="Proceed">Proceed</option>
                <option value="Hold">Hold</option>
                <option value="Reject">Reject</option>
              </select>
            </label>

            <label class="stitch-field">
              <span>Feedback</span>
              <textarea name="feedbackText" rows="5" required [(ngModel)]="feedbackForm.feedbackText"></textarea>
            </label>

            @if (feedbackError()) {
              <p class="field-status error">{{ feedbackError() }}</p>
            }

            <div class="modal-actions">
              <button class="btn secondary" type="button" (click)="closeFeedback()">Cancel</button>
              <button class="btn primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Submitting...' : 'Submit feedback' }}
              </button>
            </div>
          </form>
        </div>
      }
    </main>
  `,
  styles: [
    `
      .interview-feedback-header .btn {
        align-items: center;
        display: inline-flex;
        gap: 8px;
      }

      .interview-feedback-stats {
        margin-bottom: 18px;
      }

      .interview-feedback-workbench {
        display: grid;
        gap: 18px;
      }

      .interview-task-grid {
        display: grid;
        gap: 16px;
      }

      .interview-task-card {
        background: #fff;
        border: 1px solid #dfe7f2;
        border-left: 4px solid #0b72d9;
        border-radius: 8px;
        display: grid;
        gap: 16px;
        padding: 18px;
      }

      .interview-task-card.completed-card {
        border-left-color: #16a34a;
      }

      .interview-task-card.overdue-card {
        border-left-color: #dc2626;
      }

      .task-card-header {
        align-items: start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
      }

      .task-title-stack {
        align-items: start;
        display: flex;
        gap: 12px;
      }

      .task-status-icon {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        flex: 0 0 auto;
        font-size: 24px;
        height: 44px;
        justify-content: center;
        width: 44px;
      }

      .completed-card .task-status-icon {
        background: #dcfce7;
        color: #166534;
      }

      .overdue-card .task-status-icon {
        background: #fee2e2;
        color: #b91c1c;
      }

      .task-card-header h3 {
        margin: 0;
      }

      .status-badge.completed {
        background: #dcfce7;
        color: #166534;
      }

      .status-badge.warning {
        background: #fef3c7;
        color: #92400e;
      }

      .status-badge.danger {
        background: #fee2e2;
        color: #b91c1c;
      }

      .task-context-row {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .task-context-row span,
      .task-location a,
      .task-note {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .task-context-row > span {
        background: #f4f7fb;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        color: #45566e;
        font-size: 0.86rem;
        padding: 6px 10px;
      }

      .task-context-row .material-symbols-outlined,
      .task-location .material-symbols-outlined,
      .completed-feedback .material-symbols-outlined,
      .task-action-footer .material-symbols-outlined,
      .score-grid .material-symbols-outlined {
        font-size: 18px;
      }

      .task-meta-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        margin: 0;
      }

      .task-meta-grid div,
      .completed-feedback {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
      }

      .task-meta-grid div {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .task-meta-grid .material-symbols-outlined {
        color: #0b72d9;
        font-size: 20px;
      }

      .task-meta-grid dt {
        color: #64748b;
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .task-meta-grid dd {
        margin: 4px 0 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .task-location {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .task-location a,
      .task-note {
        background: #eef6ff;
        border: 1px solid #cfe1f5;
        border-radius: 8px;
        color: #005eb8;
        padding: 8px 10px;
        text-decoration: none;
      }

      .task-note {
        background: #f8fafc;
        border-color: #d8e2ef;
        color: #334155;
        flex: 1 1 280px;
      }

      .completed-feedback {
        display: grid;
        gap: 10px;
      }

      .completed-feedback > div:first-child {
        align-items: center;
        display: flex;
        gap: 8px;
      }

      .completed-feedback > div:first-child .material-symbols-outlined {
        color: #16a34a;
      }

      .feedback-score-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .feedback-score-row span {
        background: #fff;
        border: 1px solid #dbe5f0;
        border-radius: 999px;
        color: #32435a;
        font-size: 0.84rem;
        font-weight: 700;
        padding: 5px 9px;
      }

      .task-action-footer {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: flex;
        gap: 14px;
        justify-content: space-between;
        padding: 12px;
      }

      .task-action-footer .btn {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .overdue-text {
        color: #b91c1c;
        font-weight: 700;
      }

      .feedback-empty-state > .material-symbols-outlined {
        background: #eef6ff;
        border-radius: 10px;
        color: #005eb8;
        font-size: 32px;
        padding: 12px;
      }

      .feedback-modal-backdrop {
        align-items: center;
        background: rgb(15 23 42 / 0.48);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 24px;
        position: fixed;
        z-index: 50;
      }

      .feedback-modal-panel {
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 24px 80px rgb(15 23 42 / 0.28);
        display: grid;
        gap: 16px;
        max-width: 720px;
        padding: 24px;
        width: min(720px, 100%);
      }

      .score-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .score-grid .stitch-field > span {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .score-grid input {
        font-size: 1.15rem;
        font-weight: 800;
        text-align: center;
      }

      @media (max-width: 760px) {
        .task-card-header,
        .task-location,
        .task-action-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .score-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class InterviewFeedbackComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly tasks = signal<InterviewTask[]>([]);
  readonly feedbackTask = signal<InterviewTask | null>(null);
  readonly message = signal('');
  readonly error = signal('');
  readonly feedbackError = signal('');
  readonly completedCount = computed(() => this.tasks().filter((task) => task.status === 'Completed').length);
  readonly pendingCount = computed(() => this.tasks().filter((task) => task.status !== 'Completed').length);
  readonly overdueCount = computed(() => this.tasks().filter((task) => this.isOverdue(task)).length);

  feedbackForm: FeedbackForm = this.emptyFeedbackForm();

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.store.loadMyInterviewTasks();
      this.tasks.set(result.items ?? []);
      this.openRequestedFeedbackTask();
    } catch {
      this.error.set('Interview tasks could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  openFeedback(task: InterviewTask): void {
    if (!this.feedbackActionLabel(task)) {
      this.error.set('This interview is not available for feedback submission.');
      return;
    }

    this.feedbackTask.set(task);
    this.feedbackForm = this.emptyFeedbackForm();
    this.feedbackError.set('');
  }

  sortedTasks(): InterviewTask[] {
    return [...this.tasks()].sort((left, right) => {
      const priorityDelta = this.taskPriority(left) - this.taskPriority(right);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    });
  }

  isOverdue(task: InterviewTask): boolean {
    return task.status !== 'Completed' && new Date(task.startsAt).getTime() < Date.now();
  }

  taskIcon(task: InterviewTask): string {
    if (task.status === 'Completed') {
      return 'task_alt';
    }

    return this.isOverdue(task) ? 'notification_important' : 'rate_review';
  }

  displayStatus(task: InterviewTask): string {
    return this.isOverdue(task) ? 'Overdue' : task.status;
  }

  feedbackActionLabel(task: InterviewTask): 'Add feedback' | 'Admin override feedback' | null {
    if (this.normalizeStatus(task.status) !== 'scheduled') {
      return null;
    }

    const currentUser = this.auth.currentUser();
    if (!currentUser) {
      return null;
    }

    if (task.interviewerUserId === currentUser.id) {
      return 'Add feedback';
    }

    if (this.auth.isAdmin() && this.isInactiveInterviewer(task)) {
      return 'Admin override feedback';
    }

    return null;
  }

  isAdminOverrideFeedback(task: InterviewTask): boolean {
    return this.feedbackActionLabel(task) === 'Admin override feedback';
  }

  averageScore(task: InterviewTask): string {
    const scores = [task.technicalScore, task.communicationScore, task.cultureScore].filter(
      (score): score is number => typeof score === 'number'
    );

    if (scores.length === 0) {
      return 'Not scored';
    }

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return average.toFixed(1);
  }

  closeFeedback(): void {
    if (this.saving()) {
      return;
    }

    this.clearFeedback();
  }

  private clearFeedback(): void {
    this.feedbackTask.set(null);
    this.feedbackError.set('');
  }

  async submitFeedback(task: InterviewTask): Promise<void> {
    if (!this.feedbackActionLabel(task)) {
      this.feedbackError.set('This interview is not available for feedback submission.');
      return;
    }

    const payload: SubmitInterviewFeedbackInput = {
      technicalScore: Number(this.feedbackForm.technicalScore),
      communicationScore: Number(this.feedbackForm.communicationScore),
      cultureScore: Number(this.feedbackForm.cultureScore),
      recommendation: this.feedbackForm.recommendation,
      feedbackText: this.feedbackForm.feedbackText.trim(),
    };

    if (!payload.feedbackText) {
      this.feedbackError.set('Feedback comments are required.');
      return;
    }

    this.saving.set(true);
    this.feedbackError.set('');
    this.message.set('');
    try {
      await this.store.submitInterviewFeedback(task.interviewId, payload);
      this.message.set(`Feedback submitted for ${task.candidateName}.`);
      this.clearFeedback();
      await this.load();
    } catch {
      this.feedbackError.set('Feedback could not be submitted. Confirm this interview is still assigned to you.');
    } finally {
      this.saving.set(false);
    }
  }

  private emptyFeedbackForm(): FeedbackForm {
    return {
      technicalScore: 4,
      communicationScore: 4,
      cultureScore: 4,
      recommendation: 'Proceed',
      feedbackText: '',
    };
  }

  private taskPriority(task: InterviewTask): number {
    if (task.status === 'Completed') {
      return 2;
    }

    return this.isOverdue(task) ? 0 : 1;
  }

  private openRequestedFeedbackTask(): void {
    const interviewId = this.route.snapshot.queryParamMap.get('interviewId');
    if (!interviewId || this.feedbackTask()) {
      return;
    }

    const task = this.tasks().find((item) => item.interviewId === interviewId);
    if (!task) {
      this.error.set('That interview is not assigned to you or is no longer available for feedback.');
      return;
    }

    if (task.status === 'Completed') {
      return;
    }

    this.openFeedback(task);
  }

  private isInactiveInterviewer(task: InterviewTask): boolean {
    return task.interviewerIsDeleted || this.normalizeStatus(task.interviewerAccountStatus) !== 'active';
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').trim().toLowerCase();
  }
}
