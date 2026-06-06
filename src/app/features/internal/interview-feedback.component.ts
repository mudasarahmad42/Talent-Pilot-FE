import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  InterviewQuestionRecommendation,
  InterviewQuestionRecommendationSet,
  InterviewTask,
  SubmitInterviewFeedbackInput,
} from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { AuthService } from '../../core/auth.service';
import { FileDownloadService } from '../../core/services/file-download.service';

type FeedbackForm = {
  technicalScore: number;
  communicationScore: number;
  cultureScore: number;
  recommendation: string;
  feedbackText: string;
};

type FeedbackTaskTab = 'active' | 'past';

@Component({
  selector: 'app-interview-feedback',
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page ops-page interview-feedback-page">
      <header class="ops-page-header interview-feedback-header">
        <div>
          <p class="eyebrow">Interview operations</p>
          <h1>Interview Feedback</h1>
          <p>Complete assigned candidate interviews and submit structured feedback for the recruiter.</p>
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
              <h2>Interview tasks</h2>
              <p class="muted">Active interviews need attention. Past interviews keep submitted feedback history separate.</p>
            </div>
            <span class="status-badge info">
              {{ activeFeedbackTab() === 'active' ? pendingCount() + ' active' : completedCount() + ' past' }}
            </span>
          </div>

          <div class="feedback-tab-list" role="tablist" aria-label="Interview task views">
            <button
              class="btn compact feedback-tab-button"
              type="button"
              role="tab"
              id="active-interviews-tab"
              aria-controls="interview-task-panel"
              [class.active]="activeFeedbackTab() === 'active'"
              [class.primary]="activeFeedbackTab() === 'active'"
              [class.secondary]="activeFeedbackTab() !== 'active'"
              [attr.aria-selected]="activeFeedbackTab() === 'active'"
              (click)="setFeedbackTab('active')"
            >
              <span class="material-symbols-outlined" aria-hidden="true">pending_actions</span>
              Active interviews
              <strong>{{ pendingCount() }}</strong>
            </button>
            <button
              class="btn compact feedback-tab-button"
              type="button"
              role="tab"
              id="past-interviews-tab"
              aria-controls="interview-task-panel"
              [class.active]="activeFeedbackTab() === 'past'"
              [class.primary]="activeFeedbackTab() === 'past'"
              [class.secondary]="activeFeedbackTab() !== 'past'"
              [attr.aria-selected]="activeFeedbackTab() === 'past'"
              (click)="setFeedbackTab('past')"
            >
              <span class="material-symbols-outlined" aria-hidden="true">history</span>
              Past interviews
              <strong>{{ completedCount() }}</strong>
            </button>
          </div>

          @if (tasks().length === 0) {
            <article class="empty-state feedback-empty-state">
              <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
              <strong>No interview tasks assigned</strong>
              <p>Scheduled interviews assigned to you will appear here when a recruiter starts an interview round.</p>
            </article>
          } @else if (visibleInterviewTasks().length === 0) {
            <article
              id="interview-task-panel"
              class="empty-state feedback-empty-state"
              role="tabpanel"
              [attr.aria-labelledby]="activeFeedbackTab() === 'active' ? 'active-interviews-tab' : 'past-interviews-tab'"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ activeFeedbackTab() === 'active' ? 'pending_actions' : 'history' }}</span>
              <strong>{{ activeFeedbackTab() === 'active' ? 'No active interviews' : 'No past interviews' }}</strong>
              <p>
                {{
                  activeFeedbackTab() === 'active'
                    ? 'Interviews that still need feedback will appear here.'
                    : 'Completed interviews will appear here after feedback is submitted.'
                }}
              </p>
            </article>
          } @else {
            <div
              id="interview-task-panel"
              class="interview-task-grid"
              role="tabpanel"
              [attr.aria-labelledby]="activeFeedbackTab() === 'active' ? 'active-interviews-tab' : 'past-interviews-tab'"
            >
              @for (task of visibleInterviewTasks(); track task.interviewId) {
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

                <section class="ai-question-panel" aria-label="AI interview question recommendations">
                  <header class="ai-question-header">
                    <div>
                      <p class="eyebrow">AI interview questions</p>
                      <h4>{{ task.roundName }} guide</h4>
                    </div>
                    <div class="ai-question-actions">
                      @if (questionSet(task.interviewId)) {
                        <button class="btn primary compact" type="button" (click)="openQuestionModal(task)">
                          <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                          Open questions
                        </button>
                      } @else {
                        <button
                          class="btn primary compact"
                          type="button"
                          [disabled]="isQuestionGenerating(task.interviewId) || isQuestionLoading(task.interviewId)"
                          (click)="generateQuestions(task, false)"
                        >
                          <span class="material-symbols-outlined" aria-hidden="true">psychology</span>
                          {{ isQuestionGenerating(task.interviewId) ? 'Generating...' : 'Generate' }}
                        </button>
                      }
                    </div>
                  </header>

                  @if (questionError(task.interviewId)) {
                    <p class="field-status error">{{ questionError(task.interviewId) }}</p>
                  }

                  @if (isQuestionLoading(task.interviewId)) {
                    <p class="muted">Loading saved recommendations...</p>
                  } @else if (questionSet(task.interviewId); as set) {
                    <div class="ai-question-summary">
                      <p>{{ set.summary }}</p>
                    </div>

                    <div class="ai-question-preview-list">
                      <strong>{{ set.questions.length }} recommended questions</strong>
                      @for (question of previewQuestions(set); track question.questionRecommendationId) {
                        <p>
                          <span>{{ question.sortOrder }}</span>
                          {{ question.questionText }}
                        </p>
                      }
                    </div>
                    <p class="ai-question-disclaimer">Human interviewer owns the final assessment.</p>
                  } @else {
                    <p class="muted">No saved AI question set for this interview.</p>
                  }
                </section>

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

      @if (questionModalSet(); as set) {
        @if (questionModalTask(); as task) {
          <div class="feedback-modal-backdrop question-modal-backdrop" role="presentation">
            <section class="question-modal-panel" role="dialog" aria-modal="true" aria-label="AI interview questions">
              <header class="question-modal-header">
                <div>
                  <p class="eyebrow">AI interview questions</p>
                  <h2>{{ task.candidateName }} - {{ task.roundName }}</h2>
                  <p>{{ set.summary }}</p>
                </div>
                <button class="icon-button question-modal-close-button" type="button" aria-label="Close questions" (click)="closeQuestionModal()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <div class="question-modal-toolbar">
                <div class="question-modal-actions">
                  <button
                    class="btn secondary compact"
                    type="button"
                    [disabled]="isQuestionDownloading(task.interviewId)"
                    (click)="downloadQuestions(task, set)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    {{ isQuestionDownloading(task.interviewId) ? 'Preparing...' : 'Download DOCX' }}
                  </button>
                  <button
                    class="btn secondary compact"
                    type="button"
                    [disabled]="isQuestionGenerating(task.interviewId)"
                    (click)="generateQuestions(task, true)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">sync</span>
                    {{ isQuestionGenerating(task.interviewId) ? 'Regenerating...' : 'Regenerate' }}
                  </button>
                </div>
              </div>

              <div class="question-modal-list">
                @for (question of set.questions; track question.questionRecommendationId) {
                  <article class="modal-question-item">
                    <header>
                      <span class="question-order">{{ question.sortOrder }}</span>
                      <div>
                        <h3>{{ question.questionText }}</h3>
                        <small>{{ question.skillName || question.roundType }} - {{ question.difficulty }}</small>
                      </div>
                    </header>
                    <div class="ai-question-detail">
                      <p><strong>Expected signal</strong>{{ question.expectedSignal }}</p>
                      <p><strong>Rationale</strong>{{ question.rationale }}</p>
                      @if (question.followUps.length) {
                        <div>
                          <strong>Follow-ups</strong>
                          <ul>
                            @for (followUp of question.followUps; track followUp) {
                              <li>{{ followUp }}</li>
                            }
                          </ul>
                        </div>
                      }
                      @if (question.evaluationRubric.length) {
                        <div>
                          <strong>Rubric</strong>
                          <ul>
                            @for (rubric of question.evaluationRubric; track rubric) {
                              <li>{{ rubric }}</li>
                            }
                          </ul>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            </section>
          </div>
        }
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

      .feedback-tab-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .feedback-tab-button {
        align-items: center;
        display: inline-flex;
        gap: 8px;
      }

      .feedback-tab-button strong {
        font-size: 0.78rem;
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

      .ai-question-panel {
        background: #f8fbff;
        border: 1px solid #d8e7f7;
        border-radius: 8px;
        display: grid;
        gap: 12px;
        padding: 14px;
      }

      .ai-question-header {
        align-items: start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .ai-question-header h4 {
        margin: 0;
      }

      .ai-question-actions .btn {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .ai-question-actions .material-symbols-outlined {
        font-size: 18px;
      }

      .ai-question-summary {
        display: grid;
        gap: 8px;
      }

      .ai-question-summary p {
        margin: 0;
      }

      .ai-question-list {
        display: grid;
        gap: 8px;
      }

      .ai-question-preview-list {
        background: #fff;
        border: 1px solid #dbe5f0;
        border-radius: 8px;
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      .ai-question-preview-list strong {
        color: #1f3349;
      }

      .ai-question-preview-list p {
        align-items: start;
        display: grid;
        gap: 8px;
        grid-template-columns: auto minmax(0, 1fr);
        margin: 0;
      }

      .ai-question-preview-list p span {
        align-items: center;
        background: #0b72d9;
        border-radius: 999px;
        color: #fff;
        display: inline-flex;
        font-size: 0.78rem;
        font-weight: 800;
        height: 22px;
        justify-content: center;
        width: 22px;
      }

      .ai-question-item {
        background: #fff;
        border: 1px solid #dbe5f0;
        border-radius: 8px;
        overflow: hidden;
      }

      .ai-question-item summary {
        align-items: start;
        cursor: pointer;
        display: grid;
        gap: 4px 10px;
        grid-template-columns: auto minmax(0, 1fr);
        padding: 12px;
      }

      .question-order {
        align-items: center;
        background: #0b72d9;
        border-radius: 999px;
        color: #fff;
        display: inline-flex;
        font-size: 0.8rem;
        font-weight: 800;
        height: 24px;
        justify-content: center;
        width: 24px;
      }

      .ai-question-item summary > span:not(.question-order),
      .ai-question-item summary small {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .ai-question-item summary small {
        color: #64748b;
        grid-column: 2;
      }

      .ai-question-detail {
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 10px;
        padding: 12px;
      }

      .ai-question-detail p {
        margin: 0;
      }

      .ai-question-detail strong {
        color: #1f3349;
        display: block;
        font-size: 0.78rem;
        margin-bottom: 3px;
        text-transform: uppercase;
      }

      .ai-question-detail ul {
        margin: 6px 0 0;
        padding-left: 18px;
      }

      .ai-question-disclaimer {
        color: #45566e;
        font-size: 0.82rem;
        font-weight: 700;
        margin: 0;
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

      .question-modal-backdrop {
        align-items: center;
        padding: 32px;
      }

      .question-modal-panel {
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 24px 80px rgb(15 23 42 / 0.28);
        display: grid;
        gap: 14px;
        grid-template-rows: auto auto auto minmax(0, 1fr);
        max-height: min(88vh, 900px);
        max-width: 1040px;
        overflow: hidden;
        padding: 20px;
        width: min(1040px, 100%);
      }

      .question-modal-header {
        align-items: start;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        padding-bottom: 14px;
      }

      .question-modal-header > div {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .question-modal-header h2,
      .question-modal-header p {
        margin: 0;
      }

      .question-modal-close-button {
        align-items: center;
        appearance: none;
        background: #fff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        color: #475569;
        cursor: pointer;
        display: inline-flex;
        flex: 0 0 36px;
        height: 36px;
        justify-content: center;
        line-height: 1;
        margin: 0;
        padding: 0;
        width: 36px;
      }

      .question-modal-close-button:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
      }

      .question-modal-close-button:focus-visible {
        outline: 2px solid rgba(10, 102, 194, 0.35);
        outline-offset: 2px;
      }

      .question-modal-close-button .material-symbols-outlined {
        display: block;
        font-size: 20px;
        height: 20px;
        line-height: 20px;
        width: 20px;
      }

      .question-modal-toolbar {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: flex;
        gap: 14px;
        justify-content: flex-end;
        padding: 10px 12px;
      }

      .question-modal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }

      .question-modal-actions .btn {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .question-modal-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
        overflow: auto;
        padding: 2px 8px 2px 0;
      }

      .modal-question-item {
        background: #fff;
        border: 1px solid #dbe5f0;
        border-radius: 8px;
        flex: 0 0 auto;
        overflow: hidden;
      }

      .modal-question-item > header {
        align-items: start;
        background: #f8fbff;
        display: grid;
        gap: 10px;
        grid-template-columns: auto minmax(0, 1fr);
        padding: 14px;
      }

      .modal-question-item h3 {
        font-size: 1rem;
        margin: 0 0 4px;
      }

      .modal-question-item small {
        color: #64748b;
      }

      .modal-question-item .ai-question-detail {
        padding: 14px;
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
        .question-modal-backdrop {
          padding: 12px;
        }

        .question-modal-panel {
          max-height: 94vh;
          padding: 14px;
        }

        .task-card-header,
        .task-location,
        .ai-question-header,
        .question-modal-header,
        .question-modal-toolbar,
        .task-action-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .question-modal-actions {
          justify-content: flex-start;
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
  private readonly fileDownloads = inject(FileDownloadService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly tasks = signal<InterviewTask[]>([]);
  readonly questionRecommendations = signal<Record<string, InterviewQuestionRecommendationSet | null>>({});
  readonly questionLoading = signal<Record<string, boolean>>({});
  readonly questionGenerating = signal<Record<string, boolean>>({});
  readonly questionDownloading = signal<Record<string, boolean>>({});
  readonly questionErrors = signal<Record<string, string>>({});
  readonly questionModalInterviewId = signal<string | null>(null);
  readonly feedbackTask = signal<InterviewTask | null>(null);
  readonly activeFeedbackTab = signal<FeedbackTaskTab>('active');
  readonly message = signal('');
  readonly error = signal('');
  readonly feedbackError = signal('');
  readonly completedCount = computed(() => this.tasks().filter((task) => task.status === 'Completed').length);
  readonly pendingCount = computed(() => this.tasks().filter((task) => task.status !== 'Completed').length);
  readonly overdueCount = computed(() => this.tasks().filter((task) => this.isOverdue(task)).length);
  readonly activeInterviewTasks = computed(() => this.sortedTasks().filter((task) => task.status !== 'Completed'));
  readonly pastInterviewTasks = computed(() => this.sortedTasks().filter((task) => task.status === 'Completed'));
  readonly visibleInterviewTasks = computed(() =>
    this.activeFeedbackTab() === 'active' ? this.activeInterviewTasks() : this.pastInterviewTasks(),
  );

  feedbackForm: FeedbackForm = this.emptyFeedbackForm();

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.store.loadMyInterviewTasks();
      const items = result.items ?? [];
      this.tasks.set(items);
      await this.loadQuestionRecommendationsForTasks(items);
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

  setFeedbackTab(tab: FeedbackTaskTab): void {
    this.activeFeedbackTab.set(tab);
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

  questionSet(interviewId: string): InterviewQuestionRecommendationSet | null {
    return this.questionRecommendations()[interviewId] ?? null;
  }

  isQuestionLoading(interviewId: string): boolean {
    return this.questionLoading()[interviewId] ?? false;
  }

  isQuestionGenerating(interviewId: string): boolean {
    return this.questionGenerating()[interviewId] ?? false;
  }

  isQuestionDownloading(interviewId: string): boolean {
    return this.questionDownloading()[interviewId] ?? false;
  }

  questionError(interviewId: string): string {
    return this.questionErrors()[interviewId] ?? '';
  }

  previewQuestions(set: InterviewQuestionRecommendationSet): InterviewQuestionRecommendation[] {
    return set.questions.slice(0, 2);
  }

  questionModalSet(): InterviewQuestionRecommendationSet | null {
    const interviewId = this.questionModalInterviewId();
    return interviewId ? this.questionSet(interviewId) : null;
  }

  questionModalTask(): InterviewTask | null {
    const interviewId = this.questionModalInterviewId();
    return interviewId ? this.tasks().find((task) => task.interviewId === interviewId) ?? null : null;
  }

  openQuestionModal(task: InterviewTask): void {
    if (!this.questionSet(task.interviewId)) {
      return;
    }

    this.questionModalInterviewId.set(task.interviewId);
  }

  closeQuestionModal(): void {
    this.questionModalInterviewId.set(null);
  }

  async downloadQuestions(task: InterviewTask, set: InterviewQuestionRecommendationSet): Promise<void> {
    if (this.isQuestionDownloading(task.interviewId)) {
      return;
    }

    this.setQuestionDownloading(task.interviewId, true);
    this.setQuestionError(task.interviewId, '');
    try {
      const response = await this.store.downloadInterviewQuestionRecommendationsDocx(task.interviewId);
      const blob = response.body;
      if (!blob) {
        throw new Error('The question download response was empty.');
      }

      const fileName = this.fileNameFromContentDisposition(response.headers.get('content-disposition')) ??
        this.defaultQuestionFileName(task, set);
      this.fileDownloads.saveBlob(blob, fileName);
      this.message.set('Interview question DOCX download started.');
    } catch {
      this.setQuestionError(task.interviewId, 'Interview questions could not be downloaded.');
    } finally {
      this.setQuestionDownloading(task.interviewId, false);
    }
  }

  async generateQuestions(task: InterviewTask, regenerate: boolean): Promise<void> {
    if (this.isQuestionGenerating(task.interviewId)) {
      return;
    }

    this.setQuestionGenerating(task.interviewId, true);
    this.setQuestionError(task.interviewId, '');
    try {
      const result = await this.store.generateInterviewQuestionRecommendations(task.interviewId, {
        regenerateReason: regenerate ? 'Interviewer requested a refreshed question set.' : null,
      });
      this.questionRecommendations.update((items) => ({ ...items, [task.interviewId]: result }));
    } catch {
      this.setQuestionError(
        task.interviewId,
        'AI questions could not be generated. Confirm the LLM runtime and seeded question bank are available.',
      );
    } finally {
      this.setQuestionGenerating(task.interviewId, false);
    }
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

  private async loadQuestionRecommendationsForTasks(tasks: InterviewTask[]): Promise<void> {
    const interviewIds = tasks.map((task) => task.interviewId);
    this.questionRecommendations.update((items) =>
      Object.fromEntries(Object.entries(items).filter(([interviewId]) => interviewIds.includes(interviewId))),
    );

    await Promise.all(
      interviewIds.map(async (interviewId) => {
        this.setQuestionLoading(interviewId, true);
        try {
          const result = await this.store.loadInterviewQuestionRecommendations(interviewId);
          this.questionRecommendations.update((items) => ({ ...items, [interviewId]: result }));
        } finally {
          this.setQuestionLoading(interviewId, false);
        }
      }),
    );
  }

  private setQuestionLoading(interviewId: string, loading: boolean): void {
    this.questionLoading.update((items) => ({ ...items, [interviewId]: loading }));
  }

  private setQuestionGenerating(interviewId: string, generating: boolean): void {
    this.questionGenerating.update((items) => ({ ...items, [interviewId]: generating }));
  }

  private setQuestionDownloading(interviewId: string, downloading: boolean): void {
    this.questionDownloading.update((items) => ({ ...items, [interviewId]: downloading }));
  }

  private setQuestionError(interviewId: string, error: string): void {
    this.questionErrors.update((items) => ({ ...items, [interviewId]: error }));
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

  private defaultQuestionFileName(task: InterviewTask, set: InterviewQuestionRecommendationSet): string {
    const normalizedCandidate = task.candidateName.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
    const normalizedRound = task.roundName.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
    return `${normalizedCandidate || 'candidate'}-${normalizedRound || 'interview'}-questions-v${set.versionNumber}.docx`;
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
