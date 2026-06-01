import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  GenerateOfferLetterInput,
  HiringManagerReviewListItem,
  HiringReviewDetail,
  HiringReviewInterviewDetail,
  HiringOutcomeInput,
  OfferLetterDetails,
  ScheduleOfferPresentationMeetingInput,
  UpdateOfferLetterInput,
} from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

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

@Component({
  selector: 'app-hiring-manager-review',
  imports: [CommonModule, FormsModule, RouterLink],
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
        <div class="ops-header-actions">
          @if (detail()) {
            <button class="btn secondary compact" type="button" (click)="backToList()">Back to reviews</button>
          }
          <a class="btn secondary compact" routerLink="/app/offer-onboarding">Offer Outcome</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading hiring manager work...</section>
      } @else {
        @if (message()) {
          <p class="field-status success">{{ message() }}</p>
        }
        @if (error()) {
          <p class="field-status error">{{ error() }}</p>
        }

        @if (detail(); as data) {
          <section class="hiring-review-layout">
            <article class="ops-panel candidate-summary-card">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Candidate</p>
                  <h2>{{ data.candidate.displayName }}</h2>
                  <p class="muted">{{ data.candidate.email }}</p>
                </div>
                <span class="status-badge info">{{ data.job.applicationStatus }}</span>
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
                <span class="status-badge">{{ data.job.requestStatus }}</span>
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
              <div class="panel-header">
                <div>
                  <h2>Hiring Manager Decision Brief</h2>
                  <p class="muted">AI-supported summary from application, source, recruiter notes, and interview evidence.</p>
                </div>
                <span class="status-badge info">Advisory</span>
              </div>
              <p>{{ data.decisionBrief }}</p>
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
                <label class="stitch-field">
                  <span>Reporting manager</span>
                  <input name="reportingManager" [(ngModel)]="offerForm.reportingManager" />
                </label>
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
                  <button class="btn secondary" type="button" (click)="printOffer()">Print / Download</button>
                  <button class="btn primary" type="button" [disabled]="saving()" (click)="saveOfferLetter(data.offerLetter)">
                    {{ saving() ? 'Saving...' : 'Save offer letter' }}
                  </button>
                </div>
              }
            </article>

            @if (data.offerLetter) {
              <article class="ops-panel">
                <div class="panel-header">
                  <div>
                    <h2>In-person Offer Meeting</h2>
                    <p class="muted">Schedules a physical presentation invite email for the candidate.</p>
                  </div>
                </div>
                <label class="stitch-field">
                  <span>Date and time</span>
                  <input name="meetingAtLocal" type="datetime-local" [(ngModel)]="meetingForm.meetingAtLocal" />
                </label>
                <label class="stitch-field">
                  <span>Physical location</span>
                  <input name="meetingLocation" placeholder="Office, floor, room" [(ngModel)]="meetingForm.locationText" />
                </label>
                <label class="stitch-field">
                  <span>Notes</span>
                  <textarea name="meetingNotes" rows="3" [(ngModel)]="meetingForm.notes"></textarea>
                </label>
                <button class="btn primary" type="button" [disabled]="saving()" (click)="scheduleMeeting(data.offerLetter)">
                  Schedule presentation meeting
                </button>

                @if (data.presentationMeetings.length > 0) {
                  <div class="meeting-list">
                    @for (meeting of data.presentationMeetings; track meeting.offerPresentationMeetingId) {
                      <div>
                        <strong>{{ meeting.meetingAt | date: 'medium' }}</strong>
                        <span>{{ meeting.locationText }}</span>
                        <small>{{ meeting.status }}{{ meeting.notes ? ' - ' + meeting.notes : '' }}</small>
                      </div>
                    }
                  </div>
                }
              </article>

              <article class="ops-panel">
                <div class="panel-header">
                  <div>
                    <h2>Final Outcome</h2>
                    <p class="muted">Record the candidate outcome after the offer conversation.</p>
                  </div>
                </div>
                <label class="stitch-field">
                  <span>Outcome</span>
                  <select name="hiringOutcome" [(ngModel)]="outcomeForm.outcome">
                    <option value="Offered">Offered</option>
                    <option value="Rejected">Rejected</option>
                    <option value="OnHold">On Hold</option>
                    <option value="Joined">Joined</option>
                  </select>
                </label>
                <label class="stitch-field">
                  <span>Reason / notes</span>
                  <textarea name="hiringOutcomeReason" rows="4" [(ngModel)]="outcomeForm.reason"></textarea>
                </label>
                <button class="btn primary" type="button" [disabled]="saving()" (click)="recordOutcome(data)">
                  Record outcome
                </button>
              </article>
            }

            <article class="ops-panel close-request-card full-span">
              <div>
                <h2>Close Job Request</h2>
                <p class="muted">Use only when the business decides not to continue hiring for this request.</p>
              </div>
              <label class="stitch-field">
                <span>Close reason</span>
                <textarea name="closeReason" rows="3" [(ngModel)]="closeReason"></textarea>
              </label>
              <button class="btn secondary danger" type="button" [disabled]="saving()" (click)="closeJobRequest(data)">
                Close Job Request
              </button>
            </article>
          </section>
        } @else {
          <section class="review-list-panel ops-panel">
            <div class="panel-header">
              <div>
                <h2>Assigned Hiring Reviews</h2>
                <p class="muted">Candidates forwarded by recruiters after interview rounds are completed or skipped.</p>
              </div>
              <span class="status-badge info">{{ reviews().length }} review(s)</span>
            </div>

            @if (reviews().length === 0) {
              <div class="empty-state">
                <strong>No hiring manager review work</strong>
                <p>Recruiters forward candidates here after interviews are complete.</p>
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
                @for (item of reviews(); track item.jobApplicationId) {
                  <article class="hm-review-row" role="row">
                    <div>
                      <strong>{{ item.candidateName }}</strong>
                      <small>{{ item.candidateEmail }}</small>
                    </div>
                    <div>
                      <strong>{{ item.jobTitle }}</strong>
                      <small>{{ item.requestCode }} - {{ item.client }} - {{ item.department }}</small>
                    </div>
                    <span class="status-badge info">{{ item.status }}</span>
                    <span>{{ item.updatedAt | date: 'medium' }}</span>
                    <a class="table-link-button" [routerLink]="reviewLink(item)">Open review</a>
                  </article>
                }
              </div>
            }
          </section>
        }
      }
    </main>
  `,
  styles: [
    `
      .hiring-review-layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .full-span {
        grid-column: 1 / -1;
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
        grid-template-columns: 1.2fr 1.6fr 0.8fr 0.9fr 0.7fr;
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
        border-bottom: 1px solid #e2e8f0;
        min-width: 0;
        padding: 14px 16px;
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
        margin-top: 4px;
      }

      .decision-brief-card p {
        color: #334155;
        line-height: 1.55;
        margin: 0;
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

      .meeting-list {
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 10px;
        margin-top: 12px;
        padding-top: 12px;
      }

      .close-request-card {
        border-color: #fecaca;
      }

      .btn.danger {
        border-color: #fecaca;
        color: #991b1b;
      }

      @media (max-width: 980px) {
        .hiring-review-layout,
        .review-meta-grid,
        .offer-form-grid {
          grid-template-columns: 1fr;
        }

        .hiring-interview-header,
        .hm-review-header {
          display: none;
        }

        .hiring-interview-row,
        .hm-review-row {
          grid-template-columns: 1fr;
        }

        .hiring-interview-row > *,
        .hm-review-row > * {
          border-bottom: 1px solid #e2e8f0;
        }
      }
    `,
  ],
})
export class HiringManagerReviewComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly reviews = signal<HiringManagerReviewListItem[]>([]);
  readonly detail = signal<HiringReviewDetail | null>(null);

  offerForm: OfferForm = this.emptyOfferForm();
  meetingForm: MeetingForm = this.emptyMeetingForm();
  outcomeForm: HiringOutcomeInput = { outcome: 'Offered', reason: '' };
  closeReason = '';

  ngOnInit(): void {
    void this.load();
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
    if ((this.outcomeForm.outcome === 'Rejected' || this.outcomeForm.outcome === 'OnHold') && !this.outcomeForm.reason?.trim()) {
      this.error.set('A reason is required for rejected or on-hold outcomes.');
      return;
    }

    this.saving.set(true);
    try {
      const result = await this.store.recordHiringOutcome(this.currentApplicationId(), {
        outcome: this.outcomeForm.outcome,
        reason: this.blankToNull(this.outcomeForm.reason),
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

  printOffer(): void {
    window.print();
  }

  completedInterviewCount(interviews: HiringReviewInterviewDetail[]): number {
    return interviews.filter((interview) => interview.status === 'Completed').length;
  }

  score(value?: number | null): string {
    return value === null || value === undefined ? '-' : `${value}/5`;
  }

  scoreLabel(value?: number | null): string {
    return value === null || value === undefined ? 'No score' : `${Number(value).toFixed(1)}/5 avg`;
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${Number(value).toFixed(1)} years`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value} days`;
  }

  private async reloadDetail(jobApplicationId: string, message: string): Promise<void> {
    const detail = await this.store.loadHiringReview(jobApplicationId);
    this.detail.set(detail);
    this.hydrateForms(detail);
    this.message.set(message);
  }

  private currentApplicationId(): string {
    return this.route.snapshot.paramMap.get('jobApplicationId') ?? this.detail()?.offerLetter?.jobApplicationId ?? '';
  }

  private hydrateForms(detail: HiringReviewDetail): void {
    this.offerForm = this.emptyOfferForm(detail.offerLetter);
    this.meetingForm = this.emptyMeetingForm();
    this.outcomeForm = { outcome: 'Offered', reason: '' };
    this.closeReason = '';
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
    this.message.set('');
  }

  private blankToNull(value?: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }
}
