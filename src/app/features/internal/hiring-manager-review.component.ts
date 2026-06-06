import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  GenerateOfferLetterInput,
  HiringReviewDecisionContextItem,
  HiringReviewDecisionMetric,
  HiringManagerReviewListItem,
  HiringReviewDetail,
  HiringReviewInterviewDetail,
  HiringOutcomeInput,
  OfferLetterDetails,
  ReportingManagerOption,
  ScheduleOfferPresentationMeetingInput,
  UpdateOfferLetterInput,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { RagAssistantPanelComponent } from '../../shared/rag-assistant-panel.component';

type OfferForm = {
  compensationText: string;
  startDate: string;
  reportingManager: string;
  workLocation: string;
  additionalNotes: string;
  body: string;
  status: string;
};

type MeetingForm = {
  meetingAtLocal: string;
  locationText: string;
  notes: string;
};

type PrintableOfferLetter = {
  companyName: string;
  companyMeta: string[];
  dateLine: string;
  recipientLine: string;
  subjectLine: string;
  salutation: string;
  introParagraphs: string[];
  detailItems: Array<{ label: string; value: string }>;
  bodyParagraphs: string[];
  signerLines: string[];
  acceptanceLines: string[];
};

type ReviewStatusFilterOption = {
  value: string;
  label: string;
  count: number;
};

@Component({
  selector: 'app-hiring-manager-review',
  imports: [CommonModule, FormsModule, MatTooltipModule, RouterLink, RagAssistantPanelComponent],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Hiring Manager</p>
          <h1>{{ detail() ? detail()!.candidate.displayName : 'Hiring Manager Review' }}</h1>
          @if (detail(); as data) {
            <p>{{ data.job.requestCode }} - {{ data.job.jobTitle }} - {{ data.job.client }}</p>
          } @else {
            <p>Review candidates after recruiter-led interviews and record the final hiring outcome.</p>
          }
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading hiring manager work...</section>
      } @else {
        @if (error()) {
          <p class="field-status error">{{ error() }}</p>
        }

        @if (detail(); as data) {
          <section class="hiring-review-shell">
            <div class="hiring-review-layout">
            <article class="ops-panel candidate-summary-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Candidate</p>
                  <h2>{{ data.candidate.displayName }}</h2>
                  <p class="muted">{{ data.candidate.email }}</p>
                </div>
                <span [class]="reviewStatusBadgeClass(data.job.applicationStatus)">{{ formatStatusLabel(data.job.applicationStatus) }}</span>
              </div>
              <dl class="review-meta-grid">
                <div>
                  <dt>Role</dt>
                  <dd>{{ data.candidate.currentDesignation || 'Not recorded' }}</dd>
                </div>
                <div>
                  <dt>Company</dt>
                  <dd>{{ data.candidate.currentCompany || 'Not recorded' }}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{{ formatExperience(data.candidate.experienceYears) }}</dd>
                </div>
                <div>
                  <dt>Notice</dt>
                  <dd>{{ formatNotice(data.candidate.noticePeriodDays) }}</dd>
                </div>
              </dl>
            </article>

            <article class="ops-panel job-summary-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Job</p>
                  <h2>{{ data.job.jobTitle }}</h2>
                  <p class="muted">{{ data.job.requestCode }} - {{ data.job.department }} - {{ data.job.location }}</p>
                </div>
                <span class="status-badge">{{ formatStatusLabel(data.job.requestStatus) }}</span>
              </div>
              <dl class="review-meta-grid">
                <div>
                  <dt>Client</dt>
                  <dd>{{ data.job.client }}</dd>
                </div>
                <div>
                  <dt>Fulfillment</dt>
                  <dd>{{ data.job.fulfilledPositions }} / {{ data.job.requiredPositions }}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{{ data.job.sourceLabel }}</dd>
                </div>
                <div>
                  <dt>Recruiter notes</dt>
                  <dd>{{ data.job.recruiterNotes || data.job.sourceDetail || 'No notes recorded' }}</dd>
                </div>
              </dl>
            </article>

            <article class="ops-panel full-span decision-brief-card">
              <div class="decision-brief-header">
                <div class="decision-brief-title">
                  <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                  <div>
                    <p>AI Decision Insight</p>
                    <h2>Hiring Manager Decision Brief</h2>
                  </div>
                </div>
                <span
                  class="decision-brief-advisory"
                  [matTooltip]="decisionBriefAgentTooltip"
                  matTooltipPosition="above"
                >
                  Advisory
                </span>
              </div>
              <p class="decision-brief-support">AI-supported summary from application, source, recruiter notes, and interview evidence.</p>
              <div class="decision-brief-evidence-grid" aria-label="Interview evidence summary">
                @for (metric of decisionBriefMetrics(data); track metric.key) {
                  <div [class]="'decision-brief-evidence-card tone-' + metric.tone">
                    <span class="material-symbols-outlined" aria-hidden="true">{{ metric.icon }}</span>
                    <div>
                      <strong>{{ metric.value }}</strong>
                      <small>{{ metric.label }}</small>
                    </div>
                    <i [style.width.%]="metric.score ?? 0"></i>
                  </div>
                }
              </div>
              <div class="decision-brief-context-grid" aria-label="Decision context">
                @for (item of decisionBriefContext(data); track item.key) {
                  <div [class]="'decision-brief-context-card tone-' + item.tone">
                    <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                    <small>{{ item.label }}</small>
                    <strong>{{ item.value }}</strong>
                  </div>
                }
              </div>
              <p class="decision-brief-copy">{{ decisionBriefNarrative(data) }}</p>
            </article>

            <article class="ops-panel full-span">
              <div class="panel-header">
                <div>
                  <h2>Interview Feedback</h2>
                  <p class="muted">All configured interview rounds are completed or skipped before this review starts.</p>
                </div>
                <span class="status-badge info">{{ completedInterviewCount(data.interviews) }} completed</span>
              </div>
              @if (data.interviews.length === 0) {
                <div class="empty-state">
                  <strong>No interview evidence</strong>
                  <p>This candidate has no recorded interview rounds.</p>
                </div>
              } @else {
                <div class="hiring-interview-list">
                  <div class="hiring-interview-header">
                    <span>Round</span>
                    <span>Interviewer</span>
                    <span>Scores</span>
                    <span>Feedback</span>
                  </div>
                  @for (interview of data.interviews; track interview.interviewId) {
                    <article class="hiring-interview-row">
                      <div>
                        <strong>{{ interview.roundName }}</strong>
                        <small>{{ interview.status }} - {{ interview.startsAt | date: 'medium' }}</small>
                      </div>
                      <div>
                        <strong>{{ interview.interviewerName }}</strong>
                        <small>{{ interview.recommendation || 'No recommendation' }}</small>
                      </div>
                      <div>
                        <strong>{{ scoreLabel(interview.averageScore) }}</strong>
                        <small>Tech {{ score(interview.technicalScore) }} - Comm {{ score(interview.communicationScore) }} - Culture {{ score(interview.cultureScore) }}</small>
                      </div>
                      <p>{{ interview.feedbackText || interview.skipReason || 'No feedback recorded.' }}</p>
                    </article>
                  }
                </div>
              }
            </article>

            <article class="ops-panel full-span offer-editor-card">
              <div class="panel-header">
                <div>
                  <h2>Offer Letter Draft</h2>
                  <p class="muted">MVP offer letters are editable Talent Pilot drafts. They are not approval workflows.</p>
                </div>
                @if (data.offerLetter) {
                  <span class="status-badge info">Version {{ data.offerLetter.version }} - {{ data.offerLetter.status }}</span>
                }
              </div>

              <div class="offer-form-grid">
                <label class="stitch-field">
                  <span>Compensation</span>
                  <input name="compensationText" placeholder="Example: PKR 350,000 per month" [(ngModel)]="offerForm.compensationText" />
                </label>
                <label class="stitch-field">
                  <span>Start date</span>
                  <input name="startDate" type="date" [(ngModel)]="offerForm.startDate" />
                </label>
                <div class="stitch-field reporting-manager-picker">
                  <span>Reporting manager</span>
                  <div class="reporting-manager-control" (click)="openReportingManagerPicker(data)">
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input
                      name="reportingManagerSearch"
                      autocomplete="off"
                      placeholder="Search employees"
                      [ngModel]="reportingManagerSearchText()"
                      (focus)="openReportingManagerPicker(data)"
                      (click)="openReportingManagerPicker(data)"
                      (keydown.escape)="closeReportingManagerPicker()"
                      (ngModelChange)="onReportingManagerSearch(data, $event)"
                    />
                    @if (offerForm.reportingManager) {
                      <button
                        class="reporting-manager-clear"
                        type="button"
                        aria-label="Clear reporting manager"
                        (click)="$event.stopPropagation(); clearReportingManager(data)"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">close</span>
                      </button>
                    }
                  </div>
                  @if (reportingManagerPickerOpen()) {
                    <div class="reporting-manager-results" role="listbox" aria-label="Reporting manager options">
                      @if (reportingManagerError()) {
                        <div class="reporting-manager-state">{{ reportingManagerError() }}</div>
                      } @else if (reportingManagerLoading() && reportingManagerOptions().length === 0) {
                        <div class="reporting-manager-state">Loading employees...</div>
                      } @else if (reportingManagerOptions().length === 0) {
                        <div class="reporting-manager-state">No employees found.</div>
                      } @else {
                        @for (manager of reportingManagerOptions(); track manager.employeeId) {
                          <button
                            class="reporting-manager-option"
                            type="button"
                            role="option"
                            [attr.aria-selected]="offerForm.reportingManager === manager.displayName"
                            [class.department-match]="manager.isDepartmentMatch"
                            (click)="$event.stopPropagation(); selectReportingManager(manager)"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">person</span>
                            <span class="reporting-manager-option-copy">
                              <strong>{{ manager.displayName }}</strong>
                              <small>{{ reportingManagerSubtitle(manager) }}</small>
                            </span>
                          </button>
                        }
                        @if (reportingManagerHasMore()) {
                          <button
                            class="reporting-manager-load-more"
                            type="button"
                            [disabled]="reportingManagerLoading()"
                            (click)="$event.stopPropagation(); loadMoreReportingManagers(data)"
                          >
                            {{ reportingManagerLoading() ? 'Loading...' : 'Load more employees' }}
                          </button>
                        }
                      }
                    </div>
                  }
                </div>
                <label class="stitch-field">
                  <span>Work location</span>
                  <input name="workLocation" [(ngModel)]="offerForm.workLocation" />
                </label>
              </div>

              @if (!data.offerLetter) {
                <label class="stitch-field">
                  <span>Additional notes</span>
                  <textarea name="additionalNotes" rows="3" [(ngModel)]="offerForm.additionalNotes"></textarea>
                </label>
                <button class="btn primary" type="button" [disabled]="saving()" (click)="generateOfferLetter(data)">
                  {{ saving() ? 'Generating...' : 'Generate offer letter' }}
                </button>
              } @else {
                <label class="stitch-field">
                  <span>Offer body</span>
                  <textarea class="offer-body-textarea" name="offerBody" rows="14" [(ngModel)]="offerForm.body"></textarea>
                </label>
                <div class="panel-actions">
                  <button class="btn secondary" type="button" (click)="printOffer(data)">Print / Download</button>
                  <button class="btn primary" type="button" [disabled]="saving()" (click)="saveOfferLetter(data.offerLetter)">
                    {{ saving() ? 'Saving...' : 'Save offer letter' }}
                  </button>
                </div>
              }
            </article>

            @if (data.offerLetter) {
              <div class="offer-action-section full-span">
                <article class="ops-panel offer-action-card">
                  <div class="offer-action-header">
                    <span class="material-symbols-outlined offer-action-header-icon" aria-hidden="true">event_upcoming</span>
                    <div>
                      <h2>In-person Offer Meeting</h2>
                      <p class="muted">Schedules a physical presentation invite email for the candidate.</p>
                    </div>
                  </div>

                  <div class="offer-action-form-grid">
                    <label class="stitch-field">
                      <span>Date and time</span>
                      <input name="meetingAtLocal" type="datetime-local" [(ngModel)]="meetingForm.meetingAtLocal" />
                    </label>
                    <label class="stitch-field">
                      <span>Physical location</span>
                      <input name="meetingLocation" placeholder="Office, floor, room" [(ngModel)]="meetingForm.locationText" />
                    </label>
                    <label class="stitch-field offer-action-full-row">
                      <span>Notes</span>
                      <textarea name="meetingNotes" rows="3" [(ngModel)]="meetingForm.notes"></textarea>
                    </label>
                  </div>

                  <button class="btn primary offer-action-button" type="button" [disabled]="saving()" (click)="scheduleMeeting(data.offerLetter)">
                    <span class="material-symbols-outlined" aria-hidden="true">event_available</span>
                    <span>Schedule meeting</span>
                  </button>

                  @if (data.presentationMeetings.length > 0) {
                    <div class="meeting-list">
                      @for (meeting of data.presentationMeetings; track meeting.offerPresentationMeetingId) {
                        <div class="meeting-list-item">
                          <span class="material-symbols-outlined meeting-list-icon" aria-hidden="true">event_available</span>
                          <div class="meeting-list-copy">
                            <div class="meeting-list-main">
                              <strong>{{ meeting.meetingAt | date: 'medium' }}</strong>
                              <span>{{ meeting.locationText }}</span>
                            </div>
                            <small>{{ meeting.status }}{{ meeting.notes ? ' - ' + meeting.notes : '' }}</small>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </article>

                <article class="ops-panel offer-action-card">
                  <div class="offer-action-header">
                    <span class="material-symbols-outlined offer-action-header-icon" aria-hidden="true">verified_user</span>
                    <div>
                      <h2>Final Outcome</h2>
                      <p class="muted">Record the candidate outcome after the offer conversation.</p>
                    </div>
                  </div>

                  <div class="offer-action-form-grid">
                    <label class="stitch-field">
                      <span>Outcome</span>
                      <select name="hiringOutcome" [(ngModel)]="outcomeForm.outcome">
                        <option value="Offered">Offered</option>
                        <option value="Hired">Candidate accepted / Hired</option>
                        <option value="Joined">Joined</option>
                        <option value="OfferDeclined">Offer declined</option>
                        <option value="Rejected">Rejected</option>
                        <option value="OnHold">On Hold</option>
                      </select>
                    </label>
                    @if (outcomeRequiresJoiningDate(outcomeForm.outcome)) {
                      <label class="stitch-field">
                        <span>Joining date</span>
                        <input name="hiringOutcomeJoiningDate" type="date" [(ngModel)]="outcomeForm.joiningDate" />
                      </label>
                    }
                    <label class="stitch-field offer-action-full-row">
                      <span>Reason / notes</span>
                      <textarea name="hiringOutcomeReason" rows="4" [(ngModel)]="outcomeForm.reason"></textarea>
                    </label>
                  </div>

                  <button class="btn primary offer-action-button" type="button" [disabled]="saving()" (click)="recordOutcome(data)">
                    <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
                    <span>Record outcome</span>
                  </button>
                </article>
              </div>
            }

            <article class="ops-panel close-request-card full-span" [class.closed]="isRequestClosed(data)">
              <div class="close-request-header">
                <span class="material-symbols-outlined close-request-icon" aria-hidden="true">
                  {{ isRequestClosed(data) ? 'lock' : 'lock_open' }}
                </span>
                <div>
                  <div class="close-request-title-row">
                    <h2>Close Job Request</h2>
                    @if (isRequestClosed(data)) {
                      <span class="close-request-badge">
                        <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        Closed
                      </span>
                    }
                  </div>
                  <p class="muted">
                    {{
                      isRequestClosed(data)
                        ? 'This request is no longer hiring. Candidate and offer records remain available for audit.'
                        : 'Use only when the business decides not to continue hiring for this request.'
                    }}
                  </p>
                </div>
              </div>
              @if (isRequestClosed(data)) {
                <div class="closed-request-summary">
                  <div>
                    <span class="closed-request-label">Closed reason</span>
                    <strong>{{ closedRequestReason(data) }}</strong>
                    <small>{{ closedRequestReasonSource(data) }}</small>
                  </div>
                  @if (data.job.requestClosedAt) {
                    <div>
                      <span class="closed-request-label">Closed on</span>
                      <strong>{{ data.job.requestClosedAt | date: 'medium' }}</strong>
                      <small>Job request and public job posts are closed.</small>
                    </div>
                  }
                </div>
              } @else {
                <label class="stitch-field">
                  <span>Close reason</span>
                  <textarea name="closeReason" rows="3" [(ngModel)]="closeReason"></textarea>
                </label>
                <button class="btn secondary danger" type="button" [disabled]="saving()" (click)="closeJobRequest(data)">
                  Close Job Request
                </button>
              }
            </article>
            </div>
            <app-rag-assistant-panel
              class="hiring-assistant-rail"
              title="Decision Assistant"
              subtitle="Evidence from candidate profile, source, recruiter notes, and interviews."
              placeholder="Ask about candidate evidence or comparison..."
              contextType="HiringDecisionBrief"
              [contextEntityId]="currentApplicationId()"
              [focusEntityId]="currentApplicationId()"
              [suggestedQuestions]="hiringAssistantQuestions"
              [floatingLauncher]="true"
              launcherLabel="Open decision assistant"
            />
          </section>
        } @else {
          <section class="review-list-panel ops-panel">
            <div class="panel-header">
              <div>
                <h2>Assigned Hiring Reviews</h2>
                <p class="muted">Candidates forwarded by recruiters after interview rounds are completed or skipped.</p>
              </div>
              <span class="status-badge info">{{ filteredReviews().length }} of {{ reviews().length }} review(s)</span>
            </div>

            @if (reviews().length === 0) {
              <div class="empty-state">
                <strong>No hiring manager review work</strong>
                <p>Recruiters forward candidates here after interviews are complete.</p>
              </div>
            } @else {
              <div class="review-list-toolbar" aria-label="Hiring review filters">
                <label class="stitch-field review-status-filter">
                  <span>Status</span>
                  <select
                    name="hiringReviewStatusFilter"
                    [ngModel]="reviewStatusFilter()"
                    (ngModelChange)="reviewStatusFilter.set($event)"
                  >
                    @for (option of reviewStatusOptions(); track option.value) {
                      <option [value]="option.value">{{ option.label }} ({{ option.count }})</option>
                    }
                  </select>
                </label>
              </div>

              @if (filteredReviews().length === 0) {
                <div class="empty-state">
                  <strong>No reviews match this status</strong>
                  <p>Choose another status to see assigned candidates.</p>
                </div>
              } @else {
                <div class="hm-review-table" role="table" aria-label="Hiring manager reviews">
                  <div class="hm-review-header" role="row">
                    <span>Candidate</span>
                    <span>Job</span>
                    <span>Status</span>
                    <span>Updated</span>
                    <span>Action</span>
                  </div>
                  @for (item of filteredReviews(); track item.jobApplicationId) {
                    <article class="hm-review-row" role="row">
                      <div>
                        <strong>{{ item.candidateName }}</strong>
                        <small>{{ item.candidateEmail }}</small>
                      </div>
                      <div>
                        <strong>{{ item.jobTitle }}</strong>
                        <small>{{ item.requestCode }} - {{ item.client }} - {{ item.department }}</small>
                      </div>
                      <div class="hm-review-status-cell">
                        <span [class]="reviewStatusBadgeClass(item.status)">{{ formatStatusLabel(item.status) }}</span>
                      </div>
                      <div class="hm-review-date-cell">
                        <span>{{ item.updatedAt | date: 'medium' }}</span>
                      </div>
                      <div class="hm-review-action-cell">
                        <a class="table-link-button" [routerLink]="reviewLink(item)">Open review</a>
                      </div>
                    </article>
                  }
                </div>
              }
            }
          </section>
        }
      }
    </main>
  `,
  styles: [
    `
      .hiring-review-shell {
        align-items: start;
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1fr);
      }

      .hiring-review-layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        min-width: 0;
      }

      .hiring-assistant-rail {
        min-width: 0;
      }

      .hiring-review-layout > .ops-panel {
        max-width: 100%;
        min-width: 0;
      }

      .full-span {
        grid-column: 1 / -1;
      }

      .panel-header {
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }

      .panel-header > div {
        min-width: 0;
      }

      .panel-header .status-badge {
        flex: 0 1 auto;
        justify-content: center;
        line-height: 1.2;
        max-width: min(220px, 44%);
        overflow-wrap: anywhere;
        text-align: center;
        white-space: normal;
      }

      .advisory-badge {
        cursor: help;
      }

      .review-list-toolbar {
        align-items: flex-end;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin: 4px 0 16px;
      }

      .review-status-filter {
        margin: 0;
        max-width: 280px;
        min-width: 220px;
        width: 100%;
      }

      .review-status-filter select {
        min-height: 42px;
      }

      .review-meta-grid,
      .offer-form-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin: 0;
      }

      .review-meta-grid div {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
      }

      .review-meta-grid dt {
        color: #64748b;
        font-size: 0.76rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .review-meta-grid dd {
        margin: 4px 0 0;
      }

      .hiring-interview-list,
      .hm-review-table {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }

      .hiring-interview-header,
      .hiring-interview-row,
      .hm-review-header,
      .hm-review-row {
        display: grid;
        gap: 0;
      }

      .hiring-interview-header,
      .hiring-interview-row {
        grid-template-columns: 1.1fr 1fr 1.25fr 1.6fr;
      }

      .hm-review-header,
      .hm-review-row {
        grid-template-columns:
          minmax(180px, 1.2fr) minmax(250px, 1.55fr) minmax(112px, 0.65fr) minmax(140px, 0.82fr)
          minmax(92px, 0.55fr);
      }

      .hiring-interview-header,
      .hm-review-header {
        background: #f8fafc;
        color: #334155;
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .hiring-interview-header span,
      .hiring-interview-row > *,
      .hm-review-header span,
      .hm-review-row > * {
        align-content: center;
        border-bottom: 1px solid #e2e8f0;
        min-width: 0;
        overflow: hidden;
        padding: 14px 16px;
      }

      .hm-review-row strong,
      .hm-review-row small {
        max-width: 100%;
        min-width: 0;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .hm-review-row strong {
        display: block;
        line-height: 1.25;
      }

      .hm-review-status-cell,
      .hm-review-action-cell {
        align-items: center;
        display: flex;
      }

      .hm-review-status-cell {
        justify-content: center;
      }

      .hm-review-status-cell .status-badge {
        flex: 0 1 auto;
        justify-content: center;
        line-height: 1.15;
        max-width: 100%;
        min-height: auto;
        overflow-wrap: anywhere;
        padding: 5px 10px;
        text-align: center;
        white-space: normal;
        width: auto;
      }

      .hm-review-date-cell {
        color: #0f172a;
        line-height: 1.35;
      }

      .hm-review-action-cell .table-link-button {
        line-height: 1.2;
      }

      .hiring-interview-row:last-child > *,
      .hm-review-row:last-child > * {
        border-bottom: 0;
      }

      .hiring-interview-row small,
      .hm-review-row small,
      .meeting-list small {
        color: #64748b;
        display: block;
        line-height: 1.25;
        margin-top: 4px;
      }

      .decision-brief-card {
        background: linear-gradient(135deg, #0a73ce 0%, #055cab 58%, #084b91 100%);
        border: 0;
        border-radius: 8px;
        box-shadow: 0 18px 34px rgba(8, 75, 145, 0.18);
        color: #ffffff;
        display: grid;
        gap: 18px;
        overflow: hidden;
        padding: 26px 30px;
        position: relative;
      }

      .decision-brief-card::after {
        background:
          linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
        content: '';
        inset: 0;
        pointer-events: none;
        position: absolute;
      }

      .decision-brief-header,
      .decision-brief-support,
      .decision-brief-evidence-grid,
      .decision-brief-context-grid,
      .decision-brief-copy {
        position: relative;
        z-index: 1;
      }

      .decision-brief-header {
        align-items: flex-start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        min-width: 0;
      }

      .decision-brief-title {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        min-width: 0;
      }

      .decision-brief-title .material-symbols-outlined {
        color: #ffffff;
        flex: 0 0 auto;
        font-size: 30px;
        line-height: 1;
      }

      .decision-brief-title p {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1;
        margin: 1px 0 8px;
        text-transform: uppercase;
      }

      .decision-brief-title h2 {
        color: #ffffff;
        font-size: 1.72rem;
        line-height: 1.12;
        margin: 0;
      }

      .decision-brief-advisory {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 999px;
        color: #075ca8;
        cursor: help;
        flex: 0 0 auto;
        font-size: 0.78rem;
        font-weight: 900;
        line-height: 1;
        padding: 9px 13px;
        text-align: center;
      }

      .decision-brief-support {
        color: rgba(255, 255, 255, 0.86);
        font-size: 1rem;
        line-height: 1.45;
        margin: 0;
        max-width: 860px;
      }

      .decision-brief-copy {
        color: #ffffff;
        font-size: 1.2rem;
        font-weight: 700;
        line-height: 1.5;
        margin: 0;
        max-width: 920px;
      }

      .offer-editor-card {
        display: grid;
        gap: 16px;
      }

      .offer-body-textarea {
        font-family: inherit;
        line-height: 1.55;
      }

      .panel-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .offer-action-section {
        align-items: stretch;
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1fr);
        min-width: 0;
      }

      .offer-action-card {
        align-content: start;
        display: grid;
        gap: 14px;
        min-width: 0;
        width: 100%;
      }

      .offer-action-header {
        align-items: flex-start;
        display: grid;
        gap: 12px;
        grid-template-columns: 42px minmax(0, 1fr);
        min-width: 0;
      }

      .offer-action-header h2 {
        line-height: 1.15;
        margin: 0;
      }

      .offer-action-header .muted {
        line-height: 1.28;
        margin-top: 4px;
      }

      .offer-action-header-icon {
        align-items: center;
        background: #e8f3ff;
        border: 1px solid #cfe7ff;
        border-radius: 8px;
        color: #0a66c2;
        display: inline-flex;
        font-size: 1.35rem;
        height: 42px;
        justify-content: center;
        line-height: 1;
        width: 42px;
      }

      .offer-action-form-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(170px, 1fr));
        min-width: 0;
      }

      .offer-action-full-row {
        grid-column: 1 / -1;
      }

      .offer-action-button {
        align-items: center;
        display: inline-flex;
        gap: 8px;
        justify-self: start;
        max-width: 100%;
        width: fit-content;
      }

      .offer-action-button .material-symbols-outlined {
        font-size: 1.08rem;
        line-height: 1;
      }

      .meeting-list {
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 0;
        margin-top: 12px;
        padding-top: 12px;
      }

      .meeting-list-item {
        align-items: flex-start;
        border-bottom: 1px solid #e2e8f0;
        display: grid;
        gap: 10px;
        grid-template-columns: 30px minmax(0, 1fr);
        min-width: 0;
        padding: 10px 0;
      }

      .meeting-list-item:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .meeting-list-icon {
        align-items: center;
        background: #e8f3ff;
        border-radius: 8px;
        color: #0a66c2;
        display: inline-flex;
        font-size: 1.08rem;
        height: 30px;
        justify-content: center;
        line-height: 1;
        width: 30px;
      }

      .meeting-list-copy {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .meeting-list-main {
        align-items: baseline;
        display: flex;
        flex-wrap: wrap;
        gap: 3px 10px;
        line-height: 1.25;
        min-width: 0;
      }

      .meeting-list-main strong,
      .meeting-list-main span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .meeting-list-main strong {
        color: #0f172a;
        font-size: 0.94rem;
      }

      .meeting-list-main span {
        color: #475569;
      }

      .meeting-list-copy small {
        margin-top: 0;
      }

      .close-request-card {
        border-color: #fecaca;
        display: grid;
        gap: 16px;
      }

      .close-request-card.closed {
        background: #f0fdf4;
        border-color: #86efac;
        box-shadow: 0 12px 26px rgba(22, 101, 52, 0.08);
      }

      .close-request-header {
        align-items: flex-start;
        display: grid;
        gap: 14px;
        grid-template-columns: 42px minmax(0, 1fr);
        min-width: 0;
      }

      .close-request-icon {
        align-items: center;
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #991b1b;
        display: inline-flex;
        font-size: 1.35rem;
        height: 42px;
        justify-content: center;
        line-height: 1;
        width: 42px;
      }

      .close-request-card.closed .close-request-icon {
        background: #dcfce7;
        border-color: #86efac;
        color: #15803d;
      }

      .close-request-title-row {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .close-request-title-row h2 {
        line-height: 1.15;
        margin: 0;
      }

      .close-request-header .muted {
        line-height: 1.35;
        margin: 7px 0 0;
      }

      .close-request-badge {
        align-items: center;
        background: #dcfce7;
        border: 1px solid #86efac;
        border-radius: 999px;
        color: #166534;
        display: inline-flex;
        font-size: 0.78rem;
        font-weight: 900;
        gap: 5px;
        line-height: 1;
        padding: 7px 10px;
      }

      .close-request-badge .material-symbols-outlined {
        font-size: 1rem;
        line-height: 1;
      }

      .closed-request-summary {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }

      .closed-request-summary > div {
        background: #ffffff;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        display: grid;
        gap: 7px;
        min-width: 0;
        padding: 14px 16px;
      }

      .closed-request-label {
        color: #15803d;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .closed-request-summary strong {
        color: #0f172a;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .closed-request-summary small {
        color: #64748b;
        line-height: 1.35;
      }

      .btn.danger {
        border-color: #fecaca;
        color: #991b1b;
      }

      @media (max-width: 980px) {
        .hiring-review-shell,
        .hiring-review-layout,
        .review-meta-grid,
        .offer-form-grid,
        .offer-action-section,
        .offer-action-form-grid,
        .closed-request-summary {
          grid-template-columns: 1fr;
        }

        .hiring-interview-header,
        .hm-review-header {
          display: none;
        }

        .hm-review-table {
          background: transparent;
          border: 0;
          display: grid;
          gap: 14px;
          overflow: visible;
        }

        .hiring-interview-row,
        .hm-review-row {
          grid-template-columns: 1fr;
        }

        .hm-review-row {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .hiring-interview-row > *,
        .hm-review-row > * {
          border-bottom: 1px solid #e2e8f0;
        }

        .hm-review-row > *:last-child {
          border-bottom: 0;
        }

        .decision-brief-card {
          padding: 22px;
        }

        .decision-brief-header {
          align-items: flex-start;
          flex-direction: column;
        }

        .decision-brief-title h2 {
          font-size: 1.34rem;
        }

        .decision-brief-copy {
          font-size: 1.06rem;
        }
      }

    `,
  ],
})
export class HiringManagerReviewComponent implements OnInit, OnDestroy {
  private readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly decisionBriefAgentTooltip =
    'Generated by AI Agent: Hiring Manager Decision Brief (hiring-manager-decision-brief). It summarizes candidate profile, source details, recruiter notes, job summary, interview statuses, scores, recommendations, and skipped-round reasons.';
  readonly hiringAssistantQuestions = [
    'Summarize the candidate evidence.',
    'What concerns are raised in interviews?',
    'Is there enough evidence to proceed?',
    'What should I verify before deciding?',
  ];

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly reviews = signal<HiringManagerReviewListItem[]>([]);
  readonly reviewStatusFilter = signal('all');
  readonly detail = signal<HiringReviewDetail | null>(null);
  readonly reportingManagerOptions = signal<ReportingManagerOption[]>([]);
  readonly reportingManagerSearchText = signal('');
  readonly reportingManagerLoading = signal(false);
  readonly reportingManagerHasMore = signal(false);
  readonly reportingManagerPickerOpen = signal(false);
  readonly reportingManagerError = signal('');

  offerForm: OfferForm = this.emptyOfferForm();
  meetingForm: MeetingForm = this.emptyMeetingForm();
  outcomeForm: HiringOutcomeInput = { outcome: 'Offered', reason: '', joiningDate: '' };
  closeReason = '';

  private readonly reportingManagerPageSize = 20;
  private reportingManagerSearchDebounce?: ReturnType<typeof setTimeout>;
  private reportingManagerRequestId = 0;

  readonly reviewStatusOptions = computed<ReviewStatusFilterOption[]>(() => {
    const counts = new Map<string, ReviewStatusFilterOption>();
    for (const review of this.reviews()) {
      const value = this.normalizeStatus(review.status) || 'notrecorded';
      const current = counts.get(value);
      if (current) {
        current.count += 1;
      } else {
        counts.set(value, {
          value,
          label: this.formatStatusLabel(review.status),
          count: 1,
        });
      }
    }

    const statusOrder = new Map(
      ['hiringmanagerreview', 'offered', 'hired', 'joined', 'onhold', 'rejected', 'offerdeclined'].map(
        (status, index) => [status, index],
      ),
    );

    return [
      { value: 'all', label: 'All statuses', count: this.reviews().length },
      ...Array.from(counts.values()).sort((left, right) => {
        const leftOrder = statusOrder.get(left.value) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = statusOrder.get(right.value) ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.label.localeCompare(right.label);
      }),
    ];
  });

  readonly filteredReviews = computed(() => {
    const selectedStatus = this.reviewStatusFilter();
    if (selectedStatus === 'all') {
      return this.reviews();
    }

    return this.reviews().filter((review) => this.normalizeStatus(review.status) === selectedStatus);
  });

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.reportingManagerSearchDebounce) {
      clearTimeout(this.reportingManagerSearchDebounce);
    }
  }

  @HostListener('document:click', ['$event'])
  closeReportingManagerPickerOnOutsideClick(event: MouseEvent): void {
    if (!this.reportingManagerPickerOpen()) {
      return;
    }

    const target = event.target as Element | null;
    if (target?.closest('.reporting-manager-picker')) {
      return;
    }

    this.closeReportingManagerPicker();
  }

  async load(): Promise<void> {
    const jobApplicationId = this.route.snapshot.paramMap.get('jobApplicationId');
    this.loading.set(true);
    this.error.set('');
    try {
      if (jobApplicationId) {
        const detail = await this.store.loadHiringReview(jobApplicationId);
        this.detail.set(detail);
        this.hydrateForms(detail);
      } else {
        const list = await this.store.loadHiringManagerReviews();
        this.reviews.set(list.items ?? []);
        this.detail.set(null);
      }
    } catch {
      this.error.set('Hiring manager work could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  reviewLink(item: HiringManagerReviewListItem): string[] {
    return ['/app/hiring-manager/reviews', item.jobApplicationId];
  }

  backToList(): void {
    void this.router.navigate(['/app/hiring-manager/reviews']);
  }

  openReportingManagerPicker(data: HiringReviewDetail): void {
    this.reportingManagerPickerOpen.set(true);

    if (this.reportingManagerOptions().length === 0) {
      void this.loadReportingManagerOptions(data, this.reportingManagerSearchText(), 0, false);
    }
  }

  closeReportingManagerPicker(): void {
    this.reportingManagerPickerOpen.set(false);
  }

  onReportingManagerSearch(data: HiringReviewDetail, value: string): void {
    this.reportingManagerSearchText.set(value);
    this.offerForm.reportingManager = '';
    this.reportingManagerPickerOpen.set(true);

    if (this.reportingManagerSearchDebounce) {
      clearTimeout(this.reportingManagerSearchDebounce);
    }

    this.reportingManagerSearchDebounce = setTimeout(() => {
      void this.loadReportingManagerOptions(data, value, 0, false);
    }, 250);
  }

  async loadMoreReportingManagers(data: HiringReviewDetail): Promise<void> {
    if (this.reportingManagerLoading() || !this.reportingManagerHasMore()) {
      return;
    }

    await this.loadReportingManagerOptions(
      data,
      this.reportingManagerSearchText(),
      this.reportingManagerOptions().length,
      true,
    );
  }

  selectReportingManager(option: ReportingManagerOption): void {
    this.offerForm.reportingManager = option.displayName;
    this.reportingManagerSearchText.set(option.displayName);
    this.reportingManagerPickerOpen.set(false);
  }

  clearReportingManager(data: HiringReviewDetail): void {
    this.offerForm.reportingManager = '';
    this.reportingManagerSearchText.set('');
    this.reportingManagerPickerOpen.set(true);
    void this.loadReportingManagerOptions(data, '', 0, false);
  }

  reportingManagerSubtitle(option: ReportingManagerOption): string {
    return [
      option.designation || 'Employee',
      option.department || 'No department',
      this.formatEmployeeExperience(option.experienceYears),
      option.location || '',
    ]
      .filter(Boolean)
      .join(' - ');
  }

  async generateOfferLetter(_data: HiringReviewDetail): Promise<void> {
    this.clearStatus();
    this.saving.set(true);
    try {
      const offer = await this.store.generateOfferLetter(this.currentApplicationId(), this.buildGenerateOfferInput());
      await this.reloadDetail(offer.jobApplicationId, 'Offer letter draft generated.');
    } catch {
      this.error.set('Offer letter could not be generated. Confirm you are the assigned Hiring Manager.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveOfferLetter(offer: OfferLetterDetails): Promise<void> {
    this.clearStatus();
    if (!this.offerForm.body.trim()) {
      this.error.set('Offer body is required.');
      return;
    }

    this.saving.set(true);
    try {
      const updated = await this.store.updateOfferLetter(offer.offerLetterId, this.buildUpdateOfferInput());
      await this.reloadDetail(updated.jobApplicationId, 'Offer letter saved.');
    } catch {
      this.error.set('Offer letter could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  async scheduleMeeting(offer: OfferLetterDetails): Promise<void> {
    this.clearStatus();
    const input = this.buildMeetingInput();
    if (!input) {
      return;
    }

    this.saving.set(true);
    try {
      const meeting = await this.store.scheduleOfferPresentationMeeting(offer.offerLetterId, input);
      await this.reloadDetail(meeting.jobApplicationId, 'Offer presentation meeting scheduled and candidate email queued.');
    } catch {
      this.error.set('Offer presentation meeting could not be scheduled.');
    } finally {
      this.saving.set(false);
    }
  }

  async recordOutcome(data: HiringReviewDetail): Promise<void> {
    this.clearStatus();
    if (this.outcomeRequiresReason(this.outcomeForm.outcome) && !this.outcomeForm.reason?.trim()) {
      this.error.set('A reason is required for declined, rejected, or on-hold outcomes.');
      return;
    }

    if (this.outcomeRequiresJoiningDate(this.outcomeForm.outcome) && !this.outcomeForm.joiningDate) {
      this.error.set('Joining date is required when the candidate is hired or joined.');
      return;
    }

    this.saving.set(true);
    try {
      const result = await this.store.recordHiringOutcome(this.currentApplicationId(), {
        outcome: this.outcomeForm.outcome,
        reason: this.blankToNull(this.outcomeForm.reason),
        joiningDate: this.outcomeRequiresJoiningDate(this.outcomeForm.outcome)
          ? this.blankToNull(this.outcomeForm.joiningDate)
          : null,
      });
      await this.reloadDetail(result.jobApplicationId, `${data.candidate.displayName} marked ${result.applicationStatus}.`);
    } catch {
      this.error.set('Hiring outcome could not be recorded.');
    } finally {
      this.saving.set(false);
    }
  }

  async closeJobRequest(data: HiringReviewDetail): Promise<void> {
    this.clearStatus();
    if (!this.closeReason.trim()) {
      this.error.set('Close reason is required.');
      return;
    }

    this.saving.set(true);
    try {
      await this.store.closeJobRequest(data.job.jobRequestId, { reason: this.closeReason.trim() });
      await this.reloadDetail(this.currentApplicationId(), 'Job Request closed.');
    } catch {
      this.error.set('Job Request could not be closed.');
    } finally {
      this.saving.set(false);
    }
  }

  printOffer(data: HiringReviewDetail): void {
    this.clearStatus();
    const printableBody = this.normalizePrintableOfferBody(this.offerForm.body);
    if (!printableBody) {
      this.error.set('Offer body is required before printing.');
      return;
    }

    const objectUrl = URL.createObjectURL(new Blob([this.buildOfferPrintHtml(printableBody, data)], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  private normalizePrintableOfferBody(body: string): string {
    const placeholderLines = new Set([
      '[Company Address]',
      '[City, Country]',
      '[Email / Phone]',
      '[Candidate Address]',
      '[Designation]',
    ]);

    return body
      .replace(/\r\n/g, '\n')
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return !placeholderLines.has(trimmed) && !/^Client\s*\/\s*Request:/i.test(trimmed);
      })
      .join('\n')
      .trim();
  }

  private buildOfferPrintHtml(body: string, data: HiringReviewDetail): string {
    const letter = this.parsePrintableOfferLetter(body, data);
    const title = this.escapeHtml(`Offer Letter - ${data.candidate.displayName}`);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      background: #f4f7fb;
      color: #111827;
      font-family: Arial, "Segoe UI", sans-serif;
      margin: 0;
      padding: 32px 14px;
    }

    .offer-sheet {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10);
      margin: 0 auto;
      max-width: 680px;
      overflow: hidden;
    }

    .template-header {
      background: #0a66c2;
      color: #fff;
      padding: 28px 32px;
    }

    .brand-lockup {
      align-items: center;
      display: flex;
      gap: 10px;
      min-width: 0;
    }

    .logo-grid {
      display: grid;
      flex: 0 0 auto;
      gap: 4px;
      grid-template-columns: repeat(2, 10px);
    }

    .logo-grid span {
      background: #60a5fa;
      border-radius: 4px;
      display: block;
      height: 10px;
      width: 10px;
    }

    .logo-grid span:nth-child(2) { background: #67e8f9; }
    .logo-grid span:nth-child(3) { background: #fff; }
    .logo-grid span:nth-child(4) { background: #1d4ed8; }

    .brand-lockup img {
      display: block;
      height: 18px;
      max-width: 70px;
      object-fit: contain;
    }

    .brand-lockup strong {
      color: #ffffff;
      display: block;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 20px;
    }

    .template-eyebrow {
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.2;
      margin: 18px 0 10px;
      text-transform: uppercase;
    }

    .template-header h1 {
      color: #ffffff;
      font-size: 26px;
      line-height: 32px;
      margin: 0;
    }

    .template-subtitle {
      color: #dbeafe;
      font-size: 14px;
      line-height: 21px;
      margin: 10px 0 0;
    }

    .letter-body {
      padding: 30px 32px 34px;
    }

    .document-meta {
      margin: 0 0 20px;
    }

    .document-meta p {
      color: #64748b;
      font-size: 13px;
      line-height: 20px;
      margin: 0;
    }

    .document-meta strong {
      color: #0f172a;
      font-weight: 700;
    }

    .salutation,
    .letter-copy p {
      color: #253044;
      font-size: 14px;
      line-height: 1.62;
      margin: 0 0 14px;
    }

    .salutation {
      color: #0f172a;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .details-card {
      border: 1px solid #dbeafe;
      border-radius: 12px;
      margin: 6px 0 24px;
      overflow: hidden;
    }

    .details-card h3 {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .5px;
      margin: 0;
      padding: 14px 16px;
      text-transform: uppercase;
    }

    .detail-grid {
      display: block;
    }

    .detail-item {
      border-top: 1px solid #e2e8f0;
      padding: 14px 16px;
    }

    .detail-item:first-child {
      border-top: 0;
    }

    .detail-item:nth-child(odd) {
      background: #f8fafc;
    }

    .detail-item span {
      color: #64748b;
      display: block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .5px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .detail-item strong {
      color: #111827;
      display: block;
      font-size: 16px;
      line-height: 22px;
    }

    .signature-block {
      display: grid;
      gap: 10px;
      margin-top: 28px;
      max-width: 280px;
    }

    .signature-line {
      border-top: 1px solid #cbd5e1;
      height: 1px;
      margin-top: 18px;
      width: 210px;
    }

    .signature-block p {
      color: #253044;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    .acceptance-card {
      border: 1px solid #cfe4ff;
      border-radius: 14px;
      margin-top: 28px;
      padding: 18px;
    }

    .acceptance-card h3 {
      color: #0a66c2;
      font-size: 15px;
      margin: 0 0 10px;
    }

    .acceptance-card p {
      color: #253044;
      font-size: 13px;
      line-height: 1.65;
      margin: 0 0 10px;
    }

    .print-hint {
      color: #64748b;
      font-size: 12px;
      margin: 14px auto 0;
      max-width: 680px;
      text-align: center;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }

      .offer-sheet {
        border-radius: 12px;
        box-shadow: none;
        max-width: none;
      }

      .print-hint {
        display: none;
      }
    }
  </style>
</head>
<body>
  <main class="offer-sheet">
    <header class="template-header">
      <div class="brand-lockup">
        <div class="logo-grid" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <img src="/ai-unlimited-mark.png" alt="" />
        <strong>Talent Pilot</strong>
      </div>
      <p class="template-eyebrow">Offer Letter</p>
      <h1>${this.escapeHtml(letter.subjectLine || 'Offer of Employment')}</h1>
      <p class="template-subtitle">${this.escapeHtml(letter.companyName)}${letter.dateLine ? ` - ${this.escapeHtml(letter.dateLine)}` : ''}</p>
    </header>

    <section class="letter-body">
      <div class="document-meta">
        <p>Candidate: <strong>${this.escapeHtml(letter.recipientLine || data.candidate.displayName)}</strong></p>
        ${letter.companyMeta.map((line) => `<p>${this.escapeHtml(line)}</p>`).join('')}
      </div>

      <p class="salutation">${this.escapeHtml(letter.salutation || `Dear ${data.candidate.displayName},`)}</p>
      <div class="letter-copy">
        ${this.renderPrintParagraphs(letter.introParagraphs)}
      </div>

      ${letter.detailItems.length ? this.renderPrintDetails(letter.detailItems) : ''}

      <div class="letter-copy">
        ${this.renderPrintParagraphs(letter.bodyParagraphs)}
      </div>

      ${letter.signerLines.length ? this.renderPrintSignature(letter.signerLines) : ''}
      ${letter.acceptanceLines.length ? this.renderPrintAcceptance(letter.acceptanceLines) : ''}
    </section>
  </main>
  <p class="print-hint">Use the print dialog destination "Save as PDF" to download this offer letter.</p>
  <script>
    window.addEventListener('load', function () {
      window.setTimeout(function () {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
  }

  private parsePrintableOfferLetter(body: string, data: HiringReviewDetail): PrintableOfferLetter {
    const lines = body
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const dateIndex = lines.findIndex((line) => /^Date:/i.test(line));
    const toIndex = lines.findIndex((line) => /^To:/i.test(line));
    const subjectIndex = lines.findIndex((line) => /^Subject:/i.test(line));
    const salutationIndex = lines.findIndex((line) => /^Dear\b/i.test(line));
    const detailHeadingIndex = lines.findIndex((line) =>
      /^Your employment details are as follows:?$/i.test(line),
    );
    const sincerelyIndex = lines.findIndex((line) => /^Sincerely,?$/i.test(line));
    const acceptanceIndex = lines.findIndex((line) => /^Acceptance$/i.test(line));

    const companyHeaderEnd = dateIndex >= 0 ? dateIndex : Math.max(0, Math.min(toIndex, subjectIndex, salutationIndex));
    const companyHeader = lines.slice(0, companyHeaderEnd).filter((line) => !/^(Date|To|Subject):/i.test(line));
    const companyName = companyHeader[0] || this.auth.currentUser()?.tenantDisplayName || 'Talent Pilot';
    const companyMeta = companyHeader.slice(1);

    const detailItems: Array<{ label: string; value: string }> = [];
    let detailsEndIndex = detailHeadingIndex >= 0 ? detailHeadingIndex + 1 : -1;
    if (detailHeadingIndex >= 0) {
      while (detailsEndIndex < lines.length) {
        const line = lines[detailsEndIndex];
        if (!line || /^(Date|To|Subject):/i.test(line)) {
          detailsEndIndex++;
          continue;
        }

        const separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) {
          break;
        }

        detailItems.push({
          label: line.slice(0, separatorIndex).trim(),
          value: line.slice(separatorIndex + 1).trim(),
        });
        detailsEndIndex++;
      }
    }

    const introStart = salutationIndex >= 0 ? salutationIndex + 1 : 0;
    const introEnd = detailHeadingIndex >= 0 ? detailHeadingIndex : this.firstPositiveIndex(sincerelyIndex, acceptanceIndex, lines.length);
    const bodyStart = detailsEndIndex >= 0 ? detailsEndIndex : introEnd;
    const bodyEnd = this.firstPositiveIndex(sincerelyIndex, acceptanceIndex, lines.length);

    return {
      companyName,
      companyMeta,
      dateLine: this.stripLineLabel(lines[dateIndex], 'Date'),
      recipientLine: this.stripLineLabel(lines[toIndex], 'To'),
      subjectLine: this.stripLineLabel(lines[subjectIndex], 'Subject'),
      salutation: lines[salutationIndex] || `Dear ${data.candidate.displayName},`,
      introParagraphs: lines.slice(introStart, introEnd),
      detailItems,
      bodyParagraphs: lines.slice(bodyStart, bodyEnd),
      signerLines:
        sincerelyIndex >= 0
          ? ['Sincerely,', ...lines.slice(sincerelyIndex + 1, acceptanceIndex >= 0 ? acceptanceIndex : lines.length)]
          : [],
      acceptanceLines: acceptanceIndex >= 0 ? lines.slice(acceptanceIndex + 1) : [],
    };
  }

  private renderPrintParagraphs(paragraphs: string[]): string {
    return paragraphs.map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`).join('');
  }

  private renderPrintDetails(items: Array<{ label: string; value: string }>): string {
    return `<section class="details-card">
      <h3>Employment details</h3>
      <div class="detail-grid">
        ${items
          .map(
            (item) => `<div class="detail-item">
              <span>${this.escapeHtml(item.label)}</span>
              <strong>${this.escapeHtml(item.value || '-')}</strong>
            </div>`,
          )
          .join('')}
      </div>
    </section>`;
  }

  private renderPrintSignature(lines: string[]): string {
    return `<section class="signature-block">
      <div class="signature-line"></div>
      ${lines.map((line) => `<p>${this.escapeHtml(line)}</p>`).join('')}
    </section>`;
  }

  private renderPrintAcceptance(lines: string[]): string {
    return `<section class="acceptance-card">
      <h3>Acceptance</h3>
      ${lines.map((line) => `<p>${this.escapeHtml(line)}</p>`).join('')}
    </section>`;
  }

  private stripLineLabel(line: string | undefined, label: string): string {
    return line?.replace(new RegExp(`^${label}:\\s*`, 'i'), '').trim() ?? '';
  }

  private formatPrintDate(value: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(value);
  }

  private firstPositiveIndex(...indexes: number[]): number {
    return indexes.find((index) => index >= 0) ?? indexes[indexes.length - 1] ?? 0;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  completedInterviewCount(interviews: HiringReviewInterviewDetail[]): number {
    return interviews.filter((interview) => this.normalizeStatus(interview.status) === 'completed').length;
  }

  skippedInterviewCount(interviews: HiringReviewInterviewDetail[]): number {
    return interviews.filter((interview) => this.normalizeStatus(interview.status) === 'skipped').length;
  }

  positiveRecommendationCount(interviews: HiringReviewInterviewDetail[]): number {
    return interviews.filter((interview) => this.isPositiveRecommendation(interview.recommendation)).length;
  }

  averageInterviewScore(interviews: HiringReviewInterviewDetail[]): number | null {
    const scores = interviews
      .map((interview) => interview.averageScore)
      .filter((score): score is number => typeof score === 'number');

    if (scores.length === 0) {
      return null;
    }

    return scores.reduce((total, score) => total + score, 0) / scores.length;
  }

  evidenceRatio(value: number, total: number): number {
    if (value <= 0 || total <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(8, Math.round((value / total) * 100)));
  }

  scoreRatio(value?: number | null): number {
    if (value === null || value === undefined || value <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(8, Math.round((value / 5) * 100)));
  }

  score(value?: number | null): string {
    return value === null || value === undefined ? '-' : `${value}/5`;
  }

  scoreLabel(value?: number | null): string {
    return value === null || value === undefined ? 'No score' : `${Number(value).toFixed(1)}/5 avg`;
  }

  decisionBriefMetrics(data: HiringReviewDetail): HiringReviewDecisionMetric[] {
    if (data.decisionBriefInsight?.metrics?.length) {
      return data.decisionBriefInsight.metrics;
    }

    return [
      {
        key: 'interviewsCleared',
        label: 'Completed rounds',
        value: `${this.completedInterviewCount(data.interviews)}`,
        score: this.evidenceRatio(this.completedInterviewCount(data.interviews), data.interviews.length),
        unit: '%',
        tone: 'success',
        icon: 'task_alt',
        detail: null,
      },
      {
        key: 'skippedRounds',
        label: 'Skipped rounds',
        value: `${this.skippedInterviewCount(data.interviews)}`,
        score: this.evidenceRatio(this.skippedInterviewCount(data.interviews), data.interviews.length),
        unit: '%',
        tone: 'neutral',
        icon: 'do_not_disturb_on',
        detail: null,
      },
      {
        key: 'collectiveSentiment',
        label: 'Positive recommendations',
        value: `${this.positiveRecommendationCount(data.interviews)}`,
        score: this.evidenceRatio(this.positiveRecommendationCount(data.interviews), this.completedInterviewCount(data.interviews)),
        unit: '%',
        tone: 'success',
        icon: 'thumb_up',
        detail: null,
      },
      {
        key: 'averageScore',
        label: 'Average score',
        value: this.scoreLabel(this.averageInterviewScore(data.interviews)),
        score: this.scoreRatio(this.averageInterviewScore(data.interviews)),
        unit: '%',
        tone: 'success',
        icon: 'speed',
        detail: null,
      },
    ];
  }

  decisionBriefContext(data: HiringReviewDetail): HiringReviewDecisionContextItem[] {
    if (data.decisionBriefInsight?.context?.length) {
      return data.decisionBriefInsight.context;
    }

    return [
      {
        key: 'applicationStatus',
        label: 'Application status',
        value: this.formatStatusLabel(data.job.applicationStatus),
        icon: 'approval_delegation',
        tone: 'info',
      },
      {
        key: 'source',
        label: 'Source',
        value: data.job.sourceLabel || 'Not recorded',
        icon: 'travel_explore',
        tone: 'info',
      },
      {
        key: 'recruiterNotes',
        label: 'Recruiter notes',
        value: this.recruiterNotesLabel(data),
        icon: 'edit_note',
        tone: data.job.recruiterNotes ? 'info' : 'warning',
      },
      {
        key: 'decisionControl',
        label: 'Decision control',
        value: 'Human review required',
        icon: 'verified_user',
        tone: 'info',
      },
    ];
  }

  decisionBriefNarrative(data: HiringReviewDetail): string {
    if (data.decisionBriefInsight?.summary) {
      return data.decisionBriefInsight.summary;
    }

    const cleaned = (data.decisionBrief ?? '')
      .replace(/\s*Application status is [^.]*\.\s*/i, ' ')
      .replace(/\s*No recruiter notes were recorded\.\s*/i, ' ')
      .replace(/\s*Human review remains required before [^.]*\.\s*/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || data.decisionBrief;
  }

  recruiterNotesLabel(data: HiringReviewDetail): string {
    const notes = data.job.recruiterNotes?.trim() || '';
    if (!notes) {
      return 'No notes recorded';
    }

    return notes.length > 52 ? `${notes.slice(0, 49)}...` : notes;
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${Number(value).toFixed(1)} years`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value} days`;
  }

  private formatEmployeeExperience(value?: number | null): string {
    if (value === null || value === undefined) {
      return 'Experience not recorded';
    }

    const numericValue = Number(value);
    const displayValue = Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
    return `${displayValue} yrs`;
  }

  formatStatusLabel(status?: string | null): string {
    const value = status?.trim() ?? '';
    if (!value) {
      return 'Not recorded';
    }

    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\bHm\b/g, 'HM')
      .trim();
  }

  reviewStatusBadgeClass(status?: string | null): string {
    const normalizedStatus = (status ?? '').toLowerCase().replace(/[\s_-]+/g, '');
    if (['joined', 'hired', 'accepted', 'offeraccepted'].includes(normalizedStatus)) {
      return 'status-badge status-badge--success';
    }

    if (['rejected', 'declined', 'offerdeclined'].includes(normalizedStatus)) {
      return 'status-badge status-badge--danger';
    }

    if (['onhold', 'hold'].includes(normalizedStatus)) {
      return 'status-badge status-badge--hold';
    }

    if (['offered', 'offer', 'offerextended'].includes(normalizedStatus)) {
      return 'status-badge status-badge--offer';
    }

    return 'status-badge info';
  }

  isRequestClosed(data: HiringReviewDetail): boolean {
    return this.isSameStatus(data.job.requestStatus, 'Closed');
  }

  closedRequestReason(data: HiringReviewDetail): string {
    const auditReason = data.job.requestCloseReason?.trim();
    if (auditReason) {
      return auditReason;
    }

    const finalOutcomeReason = data.job.finalOutcomeReason?.trim();
    if (finalOutcomeReason) {
      return finalOutcomeReason;
    }

    if (this.isSameStatus(data.job.applicationStatus, 'Hired') || this.isSameStatus(data.job.applicationStatus, 'Joined')) {
      return `${data.candidate.displayName} marked ${this.formatStatusLabel(data.job.applicationStatus)}.`;
    }

    return 'Closed by hiring workflow.';
  }

  closedRequestReasonSource(data: HiringReviewDetail): string {
    if (data.job.requestCloseReason?.trim()) {
      return 'Recorded when the hiring manager closed the request.';
    }

    if (data.job.finalOutcomeReason?.trim()) {
      return 'Using the final candidate outcome notes because this request was closed after offer decision.';
    }

    return 'No detailed close reason was recorded.';
  }

  private async loadReportingManagerOptions(
    data: HiringReviewDetail,
    search: string,
    skip: number,
    append: boolean,
  ): Promise<void> {
    const requestId = ++this.reportingManagerRequestId;
    this.reportingManagerLoading.set(true);
    this.reportingManagerError.set('');

    try {
      const response = await this.store.searchReportingManagerOptions(
        data.job.jobRequestId,
        search,
        skip,
        this.reportingManagerPageSize,
      );

      if (requestId !== this.reportingManagerRequestId) {
        return;
      }

      const items = response.items ?? [];
      this.reportingManagerOptions.set(append ? [...this.reportingManagerOptions(), ...items] : items);
      this.reportingManagerHasMore.set(Boolean(response.hasMore));
    } catch {
      if (requestId !== this.reportingManagerRequestId) {
        return;
      }

      if (!append) {
        this.reportingManagerOptions.set([]);
      }

      this.reportingManagerHasMore.set(false);
      this.reportingManagerError.set('Employees could not be loaded.');
    } finally {
      if (requestId === this.reportingManagerRequestId) {
        this.reportingManagerLoading.set(false);
      }
    }
  }

  private async reloadDetail(jobApplicationId: string, message: string): Promise<void> {
    const detail = await this.store.loadHiringReview(jobApplicationId);
    this.detail.set(detail);
    this.hydrateForms(detail);
    this.notifications.success(message);
  }

  currentApplicationId(): string {
    return this.route.snapshot.paramMap.get('jobApplicationId') ?? this.detail()?.offerLetter?.jobApplicationId ?? '';
  }

  private hydrateForms(detail: HiringReviewDetail): void {
    this.offerForm = this.emptyOfferForm(detail.offerLetter);
    this.meetingForm = this.emptyMeetingForm();
    this.outcomeForm = {
      outcome: this.hiringOutcomeFormStatus(detail.job.applicationStatus),
      reason: detail.job.finalOutcomeReason ?? '',
      joiningDate: detail.offerLetter?.startDate?.slice(0, 10) ?? '',
    };
    this.closeReason = '';
    this.reportingManagerRequestId += 1;
    this.reportingManagerSearchText.set(this.offerForm.reportingManager);
    this.reportingManagerOptions.set([]);
    this.reportingManagerHasMore.set(false);
    this.reportingManagerPickerOpen.set(false);
    this.reportingManagerError.set('');
    this.reportingManagerLoading.set(false);
  }

  private buildGenerateOfferInput(): GenerateOfferLetterInput {
    return {
      compensationText: this.blankToNull(this.offerForm.compensationText),
      startDate: this.blankToNull(this.offerForm.startDate),
      reportingManager: this.blankToNull(this.offerForm.reportingManager),
      workLocation: this.blankToNull(this.offerForm.workLocation),
      additionalNotes: this.blankToNull(this.offerForm.additionalNotes),
    };
  }

  private buildUpdateOfferInput(): UpdateOfferLetterInput {
    return {
      body: this.offerForm.body.trim(),
      compensationText: this.blankToNull(this.offerForm.compensationText),
      startDate: this.blankToNull(this.offerForm.startDate),
      reportingManager: this.blankToNull(this.offerForm.reportingManager),
      workLocation: this.blankToNull(this.offerForm.workLocation),
      status: this.offerForm.status || 'Draft',
    };
  }

  private buildMeetingInput(): ScheduleOfferPresentationMeetingInput | null {
    if (!this.meetingForm.meetingAtLocal) {
      this.error.set('Meeting date and time are required.');
      return null;
    }

    if (!this.meetingForm.locationText.trim()) {
      this.error.set('Physical location is required.');
      return null;
    }

    const meetingAt = new Date(this.meetingForm.meetingAtLocal);
    if (Number.isNaN(meetingAt.getTime())) {
      this.error.set('Select a valid meeting date and time.');
      return null;
    }

    return {
      meetingAtUtc: meetingAt.toISOString(),
      locationText: this.meetingForm.locationText.trim(),
      notes: this.blankToNull(this.meetingForm.notes),
    };
  }

  private emptyOfferForm(offer?: OfferLetterDetails | null): OfferForm {
    return {
      compensationText: offer?.compensationText ?? '',
      startDate: offer?.startDate?.slice(0, 10) ?? '',
      reportingManager: offer?.reportingManager ?? '',
      workLocation: offer?.workLocation ?? '',
      additionalNotes: '',
      body: offer?.body ?? '',
      status: offer?.status ?? 'Draft',
    };
  }

  private hiringOutcomeFormStatus(status?: string | null): HiringOutcomeInput['outcome'] {
    const normalized = status?.trim();
    return normalized === 'Rejected' ||
      normalized === 'OnHold' ||
      normalized === 'OfferDeclined' ||
      normalized === 'Hired' ||
      normalized === 'Joined' ||
      normalized === 'Offered'
      ? normalized
      : 'Offered';
  }

  outcomeRequiresJoiningDate(outcome?: string | null): boolean {
    return outcome === 'Hired' || outcome === 'Joined';
  }

  private outcomeRequiresReason(outcome?: string | null): boolean {
    return outcome === 'Rejected' || outcome === 'OnHold' || outcome === 'OfferDeclined';
  }

  private isSameStatus(status: string | null | undefined, expected: string): boolean {
    return status?.replace(/\s+/g, '').toLowerCase() === expected.replace(/\s+/g, '').toLowerCase();
  }

  private emptyMeetingForm(): MeetingForm {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(11, 0, 0, 0);
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return {
      meetingAtLocal: new Date(date.getTime() - offsetMs).toISOString().slice(0, 16),
      locationText: '',
      notes: '',
    };
  }

  private clearStatus(): void {
    this.error.set('');
  }

  private isPositiveRecommendation(value?: string | null): boolean {
    const normalized = this.normalizeStatus(value);
    return ['proceed', 'positive', 'recommended', 'recommend', 'hire', 'stronghire', 'yes'].includes(normalized);
  }

  private normalizeStatus(value?: string | null): string {
    return (value ?? '').replace(/[\s_-]+/g, '').toLowerCase();
  }

  private blankToNull(value?: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }
}
