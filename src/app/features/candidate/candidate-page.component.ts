import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  PortalApplyToJobPostInput,
  PortalJobApplicationResult,
  PortalJobPostDetail,
  PortalJobPostListItem,
  PortalApplicationTimelineItem,
  PortalMyApplicationItem,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

type CandidatePageId =
  | 'jobs'
  | 'job-detail'
  | 'apply'
  | 'invite-registration'
  | 'confirm-application'
  | 'profile'
  | 'my-applications'
  | 'application-status'
  | 'interviews'
  | 'reapply-blocked';

type JourneyStepState = 'done' | 'current' | 'upcoming';

interface ApplicationJourneyStep {
  label: string;
  date?: string | null;
  icon: string;
  state: JourneyStepState;
}

@Component({
  selector: 'app-candidate-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="candidate-page stitch-candidate-page">
      @if (pageId() !== 'application-status') {
        <section class="candidate-hero-v2 compact">
          <div class="candidate-hero-copy">
            <span class="candidate-hero-eyebrow">
              <span class="material-symbols-outlined" aria-hidden="true">travel_explore</span>
              Talent Pilot Portal
            </span>
            <h1>{{ pageTitle() }}</h1>
            <p>{{ pageSubtitle() }}</p>
          </div>
        </section>
      }

      @if (error()) {
        <p class="field-status error">{{ error() }}</p>
      }
      @if (success()) {
        <p class="field-status success">{{ success() }}</p>
      }

      @if (loading()) {
        <section class="candidate-panel">Loading...</section>
      } @else {
        @switch (pageId()) {
          @case ('jobs') {
            <section class="portal-job-list">
              @if (jobPosts().length === 0) {
                <article class="candidate-panel empty-state">
                  <strong>No open jobs are published right now.</strong>
                  <p>Recruiters publish Talent Pilot portal jobs from the sourcing workspace.</p>
                </article>
              } @else {
                @for (job of jobPosts(); track job.jobPostId) {
                  <article class="candidate-panel portal-job-card">
                    <div class="portal-job-main">
                      <span class="portal-job-icon material-symbols-outlined" aria-hidden="true">work</span>
                      <div>
                        <span class="candidate-status-pill">{{ job.department }}</span>
                        <h2>{{ job.title }}</h2>
                        <p class="portal-job-meta">
                          <span><span class="material-symbols-outlined" aria-hidden="true">apartment</span>{{ job.companyName }}</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{ job.location }}</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">workspace_premium</span>{{ experienceLabel(job) }}</span>
                        </p>
                      </div>
                      <div class="portal-skill-row">
                        @for (skill of job.skills.slice(0, 6); track skill.skillId) {
                          <span>{{ skill.name }}</span>
                        }
                      </div>
                    </div>
                    <div class="portal-job-actions">
                      <a class="btn secondary" [routerLink]="['/candidate/jobs', job.jobPostId]">
                        <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                        View details
                      </a>
                      <a class="btn primary" [routerLink]="['/candidate/apply', job.jobPostId]">
                        <span class="material-symbols-outlined" aria-hidden="true">send</span>
                        Apply
                      </a>
                    </div>
                  </article>
                }
              }
            </section>
          }

          @case ('job-detail') {
            @if (jobPost(); as job) {
              <section class="candidate-content-grid">
                <article class="candidate-panel portal-detail-card">
                  <span class="candidate-status-pill">{{ job.status }}</span>
                  <h2>{{ job.title }}</h2>
                  <p class="muted">{{ job.companyName }} - {{ job.client }} - {{ job.department }}</p>
                  <dl class="portal-facts">
                    <div>
                      <dt>Location</dt>
                      <dd>{{ job.location }}</dd>
                    </div>
                    <div>
                      <dt>Experience</dt>
                      <dd>{{ experienceLabel(job) }}</dd>
                    </div>
                    <div>
                      <dt>Positions</dt>
                      <dd>{{ job.requiredPositions }}</dd>
                    </div>
                    <div>
                      <dt>Published</dt>
                      <dd>{{ job.publishedAt | date: 'mediumDate' }}</dd>
                    </div>
                  </dl>
                  <h3>Description</h3>
                  <p class="job-description">{{ job.description }}</p>
                  <h3>Skills</h3>
                  <div class="portal-skill-row">
                    @for (skill of job.skills; track skill.skillId) {
                      <span>{{ skill.name }}</span>
                    }
                  </div>
                </article>
                <aside class="candidate-status-rail">
                  <article class="candidate-profile-cta">
                    <span class="material-symbols-outlined" aria-hidden="true">how_to_reg</span>
                    <strong>Interested?</strong>
                    <p>Applications are linked to this job post and the original Job Request for recruiter tracking.</p>
                    <a class="btn primary full" [routerLink]="['/candidate/apply', job.jobPostId]">
                      <span class="material-symbols-outlined" aria-hidden="true">send</span>
                      Apply for this job
                    </a>
                    <a routerLink="/candidate/jobs">
                      <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                      Back to jobs
                    </a>
                  </article>
                </aside>
              </section>
            } @else {
              <section class="candidate-panel empty-state">This job post is not available.</section>
            }
          }

          @case ('apply') {
            @if (jobPost(); as job) {
              <form class="candidate-content-grid" (ngSubmit)="submitApplication()">
                <article class="candidate-panel portal-application-form">
                  <div class="portal-form-heading">
                    <span class="portal-job-icon material-symbols-outlined" aria-hidden="true">assignment_turned_in</span>
                    <div>
                      <h2>Apply for {{ job.title }}</h2>
                      <p class="muted">{{ job.companyName }} - {{ job.location }}</p>
                    </div>
                  </div>
                  <div class="candidate-form-grid">
                    <label class="stitch-field">
                      <span>Phone</span>
                      <input name="phone" [(ngModel)]="applyForm.phone" />
                    </label>
                    <label class="stitch-field">
                      <span>LinkedIn URL</span>
                      <input name="linkedInUrl" [(ngModel)]="applyForm.linkedInUrl" />
                    </label>
                    <label class="stitch-field">
                      <span>Current title</span>
                      <input name="currentDesignation" [(ngModel)]="applyForm.currentDesignation" />
                    </label>
                    <label class="stitch-field">
                      <span>Current company</span>
                      <input name="currentCompany" [(ngModel)]="applyForm.currentCompany" />
                    </label>
                    <label class="stitch-field">
                      <span>Total experience</span>
                      <input name="experienceYears" type="number" min="0" step="0.5" [(ngModel)]="applyForm.experienceYears" />
                    </label>
                    <label class="stitch-field">
                      <span>Notice period days</span>
                      <input name="noticePeriodDays" type="number" min="0" [(ngModel)]="applyForm.noticePeriodDays" />
                    </label>
                    <label class="stitch-field">
                      <span>Primary university</span>
                      <input name="universityName" [(ngModel)]="applyForm.universityName" />
                    </label>
                    <label class="stitch-field">
                      <span>Degree</span>
                      <input name="degreeName" [(ngModel)]="applyForm.degreeName" />
                    </label>
                    <label class="stitch-field">
                      <span>Graduation year</span>
                      <input name="graduationYear" type="number" min="1970" max="2100" [(ngModel)]="applyForm.graduationYear" />
                    </label>
                  </div>
                  <label class="stitch-field portal-cover-letter-field">
                    <span>Cover letter</span>
                    <textarea
                      name="coverLetter"
                      rows="5"
                      [(ngModel)]="applyForm.coverLetter"
                      placeholder="Share why this role is a strong fit for your background."
                    ></textarea>
                  </label>
                  <label class="candidate-document-upload">
                    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                    <strong>{{ selectedDocumentFile()?.name || 'Upload resume / CV' }}</strong>
                    <small>DOCX only for MVP. Files are stored through Talent Pilot document storage.</small>
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      (change)="onApplicationDocumentSelected($event)"
                    />
                  </label>
                  @if (documentUploadError()) {
                    <p class="field-status error">{{ documentUploadError() }}</p>
                  }
                  @if (applicationResult(); as result) {
                    <div class="candidate-application-result">
                      <strong>{{ result.alreadyApplied ? 'Existing application found' : 'Application submitted' }}</strong>
                      <p>Status: {{ result.status }}</p>
                      <a [routerLink]="['/candidate/applications', result.jobApplicationId, 'status']">View application status</a>
                    </div>
                  }
                </article>
                <aside class="candidate-status-rail">
                  <article class="candidate-profile-cta">
                    <span class="material-symbols-outlined" aria-hidden="true">checklist</span>
                    <strong>{{ job.title }}</strong>
                    <p>{{ job.department }} - {{ experienceLabel(job) }} - {{ job.location }}</p>
                    <button class="btn primary full" type="submit" [disabled]="submitting()">
                      <span class="material-symbols-outlined" aria-hidden="true">send</span>
                      {{ submitting() ? 'Submitting...' : 'Submit application' }}
                    </button>
                    <a [routerLink]="['/candidate/jobs', job.jobPostId]">
                      <span class="material-symbols-outlined" aria-hidden="true">description</span>
                      Review job post
                    </a>
                  </article>
                </aside>
              </form>
            } @else {
              <section class="candidate-panel empty-state">This job post is not available for applications.</section>
            }
          }

          @case ('my-applications') {
            <section class="portal-application-list">
              @if (myApplications().length === 0) {
                <article class="candidate-panel empty-state">
                  <strong>No applications yet.</strong>
                  <p>Apply to a published job post to see status history here.</p>
                  <a routerLink="/candidate/jobs">Browse jobs</a>
                </article>
              } @else {
                @for (application of myApplications(); track application.jobApplicationId) {
                  <article class="candidate-panel portal-application-card">
                    <div class="portal-job-main">
                      <span class="portal-job-icon material-symbols-outlined" aria-hidden="true">assignment</span>
                      <div>
                        <span class="candidate-status-pill">{{ application.status }}</span>
                        <h2>{{ application.jobTitle }}</h2>
                        <p class="portal-job-meta">
                          <span><span class="material-symbols-outlined" aria-hidden="true">apartment</span>{{ application.companyName }}</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">lan</span>{{ application.department }}</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{ application.location }}</span>
                        </p>
                      </div>
                      <small>{{ application.sourceLabel }} - Applied {{ application.appliedAt | date: 'mediumDate' }}</small>
                    </div>
                    <div>
                      <strong>{{ application.interviewPassSummary }}</strong>
                      <a [routerLink]="['/candidate/applications', application.jobApplicationId, 'status']">
                        <span class="material-symbols-outlined" aria-hidden="true">query_stats</span>
                        View status
                      </a>
                    </div>
                  </article>
                }
              }
            </section>
          }

          @case ('application-status') {
            @if (selectedApplication(); as application) {
              <section class="application-status-page">
                <header class="application-status-header">
                  <nav class="status-breadcrumb" aria-label="Application breadcrumb">
                    <a routerLink="/candidate/my-applications">My Applications</a>
                    <span>/</span>
                    <span>{{ application.companyName }}</span>
                  </nav>
                  <div class="status-title-row">
                    <div>
                      <h1>{{ application.jobTitle }}</h1>
                      <p>
                        {{ application.companyName }} - {{ application.client }} - {{ application.department }}
                        <span class="candidate-status-pill">{{ applicationStatusLabel(application.status) }}</span>
                      </p>
                    </div>
                    <a class="btn secondary" [routerLink]="['/candidate/jobs', application.jobPostId]">
                      <span class="material-symbols-outlined" aria-hidden="true">description</span>
                      View Job Description
                    </a>
                  </div>
                </header>

                <article class="candidate-progress-message">
                  <span class="material-symbols-outlined" aria-hidden="true">celebration</span>
                  <div>
                    <strong>{{ statusGreeting(application) }}</strong>
                    <p>{{ statusSummary(application) }}</p>
                  </div>
                </article>

                <section class="application-status-layout">
                  <div class="application-status-main">
                    <article class="candidate-panel application-journey-card">
                      <header>
                        <h2>Application Journey</h2>
                      </header>
                      <ol class="journey-steps">
                        @for (step of journeySteps(application); track step.label) {
                          <li [class.done]="step.state === 'done'" [class.current]="step.state === 'current'" [class.upcoming]="step.state === 'upcoming'">
                            <span class="journey-dot">
                              <span class="material-symbols-outlined" aria-hidden="true">{{ step.icon }}</span>
                            </span>
                            <strong>{{ step.label }}</strong>
                            <small>
                              @if (step.date) {
                                {{ step.date | date: 'MMM d' }}
                              } @else if (step.state === 'current') {
                                Current
                              } @else {
                                Pending
                              }
                            </small>
                          </li>
                        }
                      </ol>
                      <div class="journey-event-list">
                        @for (event of application.timeline ?? []; track $index) {
                          <div class="journey-event">
                            <span class="material-symbols-outlined" aria-hidden="true">{{ timelineIcon(event.kind) }}</span>
                            <div>
                              <strong>{{ event.title }}</strong>
                              <p>{{ event.occurredAt | date: 'medium' }} - {{ journeyEventDescription(event, application) }}</p>
                            </div>
                            <span class="candidate-status-pill">{{ event.status }}</span>
                          </div>
                        } @empty {
                          <div class="journey-event">
                            <span class="material-symbols-outlined" aria-hidden="true">assignment_turned_in</span>
                            <div>
                              <strong>Application received</strong>
                              <p>{{ application.appliedAt | date: 'medium' }} - The recruiter can now review your application.</p>
                            </div>
                            <span class="candidate-status-pill">{{ application.sourceLabel }}</span>
                          </div>
                        }
                      </div>
                    </article>

                    <article class="next-step-card">
                      <header>
                        <span class="material-symbols-outlined" aria-hidden="true">event_note</span>
                        <h2>{{ nextStepTitle(application) }}</h2>
                      </header>
                      <div class="next-step-grid">
                        <div class="next-step-fact">
                          <span class="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                          <div>
                            <small>Date & time</small>
                            <strong>{{ nextStepDate(application) }}</strong>
                          </div>
                        </div>
                        <div class="next-step-fact">
                          <span class="material-symbols-outlined" aria-hidden="true">location_on</span>
                          <div>
                            <small>Location</small>
                            <strong>{{ application.location || 'Recruiter will confirm' }}</strong>
                          </div>
                        </div>
                        <div class="next-step-fact preparation">
                          <span class="material-symbols-outlined" aria-hidden="true">tips_and_updates</span>
                          <div>
                            <small>Preparation tips</small>
                            <p>{{ nextStepGuidance(application) }}</p>
                          </div>
                        </div>
                      </div>
                      <div class="next-step-actions">
                        <button class="btn light" type="button" disabled>
                          <span class="material-symbols-outlined" aria-hidden="true">videocam</span>
                          Join Interview
                        </button>
                        <button class="btn outline-light" type="button" disabled>Reschedule Request</button>
                      </div>
                    </article>

                    <article class="candidate-panel submitted-documents-card">
                      <h2>Submitted Documents</h2>
                      @if ((application.documents ?? []).length === 0) {
                        <p class="muted">No uploaded documents are attached to this application yet.</p>
                      }
                      @for (document of application.documents ?? []; track document.applicationDocumentId) {
                        <div class="submitted-document-row">
                          <span class="material-symbols-outlined" aria-hidden="true">description</span>
                          <div>
                            <strong>{{ document.fileName }}</strong>
                            <p>{{ document.documentType }} uploaded {{ document.uploadedAt | date: 'mediumDate' }}. Stored by {{ document.storageProvider }}.</p>
                            <small>{{ formatFileSize(document.sizeBytes) }}</small>
                          </div>
                          <span class="candidate-status-pill">Recorded</span>
                        </div>
                      }
                      <div class="submitted-document-row">
                        <span class="material-symbols-outlined" aria-hidden="true">description</span>
                        <div>
                          <strong>Application profile</strong>
                          <p>Submitted {{ application.appliedAt | date: 'mediumDate' }} through {{ application.sourceLabel }}.</p>
                        </div>
                        <span class="candidate-status-pill">Recorded</span>
                      </div>
                      <p class="document-storage-note">
                        Files are stored on the Talent Pilot server in MVP. The application only depends on storage metadata, so Azure Blob can replace the local provider later.
                      </p>
                    </article>
                  </div>

                  <aside class="application-status-rail">
                    <article class="candidate-panel recruiter-support-card">
                      <h2>Recruiter Support</h2>
                      <div class="support-person">
                        <span class="avatar-circle">TP</span>
                        <div>
                          <strong>Recruitment team</strong>
                          <p>Talent acquisition support</p>
                        </div>
                      </div>
                      <p class="support-note">Your recruiter will update this page as your interviews, review, offer meeting, and final decision move forward.</p>
                      <button class="btn primary full" type="button" disabled>
                        <span class="material-symbols-outlined" aria-hidden="true">mail</span>
                        Message Support
                      </button>
                      <a class="btn secondary full" routerLink="/candidate/my-applications">
                        <span class="material-symbols-outlined" aria-hidden="true">help</span>
                        Help Center
                      </a>
                    </article>

                    <article class="candidate-panel application-policy-card">
                      <h2>Application Policy</h2>
                      <p>Talent Pilot tracks every application under one audited hiring journey. If this application is not selected, it remains available for future candidate rediscovery unless your profile is withdrawn.</p>
                      @if (application.finalDecisionAt) {
                        <strong>Final status after {{ application.finalDecisionAt | date: 'mediumDate' }}</strong>
                      }
                    </article>

                    <article class="candidate-panel company-card">
                      <h2>About {{ application.companyName }}</h2>
                      <p>{{ application.companyName }} is hiring for {{ application.department }} talent through Talent Pilot.</p>
                      <div class="company-meta">
                        <span class="company-meta-dot"></span>
                        <small>Talent Pilot portal</small>
                        <small>{{ application.department }}</small>
                        <small>{{ application.location }}</small>
                      </div>
                    </article>
                  </aside>
                </section>
              </section>
            } @else {
              <section class="candidate-panel empty-state">This application was not found for the signed-in candidate.</section>
            }
          }

          @default {
            <section class="candidate-panel empty-state">
              <strong>{{ pageTitle() }} is not active in this slice.</strong>
              <p>Published jobs, applications, and application status are live. The remaining candidate views will be wired with the interview slice.</p>
              <a routerLink="/candidate/jobs">Browse jobs</a>
            </section>
          }
        }
      }
    </main>
  `,
  styles: [
    `
      .candidate-page {
        display: grid;
        gap: 18px;
        padding: 28px;
      }

      .candidate-hero-v2 {
        align-items: center;
        display: flex;
        gap: 18px;
        justify-content: space-between;
      }

      .candidate-hero-copy span,
      .candidate-status-pill {
        color: #64748b;
        font-size: 12px;
        font-weight: 800;
        margin-right: 0;
        text-transform: uppercase;
      }

      .candidate-hero-copy .candidate-hero-eyebrow {
        align-items: center;
        color: #075dad;
        display: inline-flex;
        gap: 8px;
      }

      .candidate-hero-eyebrow .material-symbols-outlined {
        font-size: 20px;
      }

      .candidate-hero-copy h1 {
        margin: 6px 0 4px;
      }

      .candidate-hero-copy p,
      .muted {
        color: #64748b;
        margin: 0;
      }

      .candidate-panel {
        background: #fff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        padding: 20px;
      }

      .portal-job-main,
      .portal-form-heading {
        align-items: start;
        display: grid;
        gap: 14px;
        grid-template-columns: 48px minmax(0, 1fr);
      }

      .portal-job-icon {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        font-size: 24px;
        height: 48px;
        justify-content: center;
        width: 48px;
      }

      .portal-job-main > .portal-skill-row {
        grid-column: 2;
        margin-top: 0;
      }

      .portal-job-meta {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .portal-job-meta > span,
      .portal-job-actions a,
      .portal-application-card a,
      .candidate-profile-cta a,
      .candidate-profile-cta button {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }

      .portal-job-meta .material-symbols-outlined,
      .portal-job-actions .material-symbols-outlined,
      .portal-application-card .material-symbols-outlined,
      .candidate-profile-cta .material-symbols-outlined,
      .candidate-profile-cta button .material-symbols-outlined {
        font-size: 18px;
      }

      .portal-job-list,
      .portal-application-list {
        display: grid;
        gap: 14px;
      }

      .portal-job-card,
      .portal-application-card {
        align-items: center;
        display: flex;
        gap: 18px;
        justify-content: space-between;
      }

      .portal-job-card h2,
      .portal-application-card h2,
      .portal-detail-card h2 {
        margin: 8px 0 4px;
      }

      .portal-job-actions,
      .portal-application-card > div:last-child {
        align-items: flex-end;
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .portal-skill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }

      .portal-skill-row span {
        background: #eef6ff;
        border-radius: 999px;
        color: #0b66c3;
        font-size: 12px;
        font-weight: 800;
        padding: 4px 9px;
      }

      .candidate-content-grid {
        align-items: start;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) 320px;
      }

      .candidate-status-rail,
      .candidate-profile-cta {
        display: grid;
        gap: 12px;
      }

      .candidate-profile-cta {
        background: #fff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        padding: 18px;
      }

      .candidate-profile-cta > .material-symbols-outlined {
        background: rgb(255 255 255 / 0.16);
        border: 1px solid rgb(255 255 255 / 0.24);
        border-radius: 8px;
        font-size: 28px;
        padding: 10px;
        width: max-content;
      }

      .candidate-timeline-card {
        background: #fff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        display: grid;
        gap: 16px;
        padding: 18px;
      }

      .candidate-timeline-card header {
        align-items: center;
        display: flex;
        gap: 12px;
      }

      .candidate-timeline-card header > .material-symbols-outlined {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        font-size: 24px;
        height: 44px;
        justify-content: center;
        width: 44px;
      }

      .candidate-timeline-card header strong {
        display: block;
        font-size: 18px;
      }

      .candidate-timeline-card header p {
        color: #64748b;
        margin: 2px 0 0;
      }

      .candidate-timeline {
        display: grid;
        gap: 0;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .candidate-timeline li {
        display: grid;
        gap: 12px;
        grid-template-columns: 34px minmax(0, 1fr);
        min-height: 74px;
        position: relative;
      }

      .candidate-timeline li:not(:last-child)::before {
        background: #dbe3ef;
        bottom: 0;
        content: '';
        left: 16px;
        position: absolute;
        top: 34px;
        width: 2px;
      }

      .timeline-marker {
        align-items: center;
        background: #075dad;
        border-radius: 999px;
        color: #fff;
        display: inline-flex;
        height: 34px;
        justify-content: center;
        position: relative;
        width: 34px;
        z-index: 1;
      }

      .timeline-marker .material-symbols-outlined {
        font-size: 18px;
      }

      .timeline-content {
        padding-bottom: 16px;
      }

      .timeline-content strong {
        display: block;
        line-height: 1.25;
      }

      .timeline-content p {
        color: #64748b;
        font-size: 13px;
        line-height: 1.45;
        margin: 4px 0 8px;
      }

      .candidate-timeline-link {
        align-items: center;
        border-top: 1px solid #edf2f7;
        display: inline-flex;
        gap: 6px;
        padding-top: 14px;
      }

      .portal-facts,
      .candidate-form-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .portal-facts {
        margin: 18px 0;
      }

      .portal-facts dt {
        color: #64748b;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .portal-facts dd {
        margin: 4px 0 0;
      }

      .job-description {
        line-height: 1.6;
        white-space: pre-line;
      }

      .portal-application-form {
        display: grid;
        gap: 16px;
      }

      .candidate-document-upload {
        align-items: center;
        background: #f8fbff;
        border: 1px dashed #b8c8dc;
        border-radius: 8px;
        color: #334155;
        cursor: pointer;
        display: grid;
        gap: 8px 12px;
        grid-template-columns: 44px minmax(0, 1fr);
        padding: 16px;
        position: relative;
      }

      .candidate-document-upload:hover,
      .candidate-document-upload:focus-within {
        border-color: #0b66c3;
        box-shadow: 0 0 0 1px rgb(11 102 195 / 16%);
      }

      .candidate-document-upload > .material-symbols-outlined {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        height: 44px;
        justify-content: center;
        width: 44px;
      }

      .candidate-document-upload strong,
      .candidate-document-upload small {
        min-width: 0;
      }

      .candidate-document-upload small {
        color: #64748b;
      }

      .candidate-document-upload input {
        inset: 0;
        opacity: 0;
        position: absolute;
      }

      .candidate-application-result,
      .empty-state {
        border: 1px dashed #b6c6da;
        border-radius: 8px;
        padding: 16px;
      }

      .full {
        width: 100%;
      }

      @media (max-width: 900px) {
        .candidate-page {
          padding: 18px;
        }

        .candidate-hero-v2,
        .portal-job-card,
        .portal-application-card {
          align-items: stretch;
          display: grid;
        }

        .candidate-content-grid,
        .portal-facts,
        .candidate-form-grid,
        .portal-job-main,
        .portal-form-heading {
          grid-template-columns: 1fr;
        }

        .portal-job-main > .portal-skill-row {
          grid-column: auto;
        }

        .portal-job-actions,
        .portal-application-card > div:last-child {
          justify-items: stretch;
        }
      }
    `,
  ],
})
export class CandidatePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: null });
  private readonly routePageId = toSignal(this.route.data.pipe(map((data) => data['pageId'] as CandidatePageId)), {
    initialValue: 'jobs',
  });
  private lastLoadKey = '';

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly jobPosts = signal<PortalJobPostListItem[]>([]);
  readonly jobPost = signal<PortalJobPostDetail | null>(null);
  readonly myApplications = signal<PortalMyApplicationItem[]>([]);
  readonly applicationResult = signal<PortalJobApplicationResult | null>(null);
  readonly selectedDocumentFile = signal<File | null>(null);
  readonly documentUploadError = signal('');
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly pageId = computed(() => this.routePageId());
  readonly routeId = computed(() => this.routeParams()?.get('id') ?? null);
  readonly applyJobPostId = computed(() => this.routeParams()?.get('jobId') ?? null);
  readonly selectedApplication = computed(() => {
    const applicationId = this.routeId();
    return this.myApplications().find((item) => item.jobApplicationId === applicationId) ?? null;
  });

  readonly applyForm: PortalApplyToJobPostInput = {
    phone: '',
    linkedInUrl: '',
    currentDesignation: '',
    currentCompany: '',
    experienceYears: null,
    noticePeriodDays: null,
    universityName: '',
    degreeName: '',
    graduationYear: null,
    coverLetter: '',
  };

  constructor() {
    effect(() => {
      const key = [
        this.pageId(),
        this.routeId() ?? '',
        this.applyJobPostId() ?? '',
        this.currentUser()?.id ?? 'anonymous',
      ].join('|');

      if (key === this.lastLoadKey) {
        return;
      }

      this.lastLoadKey = key;
      queueMicrotask(() => void this.loadCurrentPage());
    });
  }

  pageTitle(): string {
    switch (this.pageId()) {
      case 'job-detail':
        return this.jobPost()?.title ?? 'Job Details';
      case 'apply':
        return 'Apply';
      case 'my-applications':
        return 'My Applications';
      case 'application-status':
        return 'Application Status';
      default:
        return 'Open Jobs';
    }
  }

  pageSubtitle(): string {
    switch (this.pageId()) {
      case 'job-detail':
        return 'Review the published job post before applying.';
      case 'apply':
        return 'Your application will be linked to the job post and tracked by the recruiter.';
      case 'my-applications':
        return 'Track your Talent Pilot job applications and outcomes.';
      case 'application-status':
        return 'View the current status of this application.';
      default:
        return 'Browse published Talent Pilot portal jobs. Sign in only when you are ready to apply.';
    }
  }

  async submitApplication(): Promise<void> {
    const jobPostId = this.applyJobPostId();
    if (!jobPostId) {
      return;
    }

    this.submitting.set(true);
    this.clearStatus();
    try {
      const result = await this.store.applyToPortalJobPost(jobPostId, this.cleanApplicationInput(this.applyForm));
      const selectedFile = this.selectedDocumentFile();
      let successMessage = result.alreadyApplied
        ? 'You already have an active application for this job.'
        : 'Application submitted.';

      if (selectedFile) {
        try {
          await this.store.uploadPortalApplicationDocument(result.jobApplicationId, selectedFile, 'Resume');
          this.selectedDocumentFile.set(null);
          successMessage = result.alreadyApplied
            ? 'Existing application found and resume uploaded.'
            : 'Application submitted and resume uploaded.';
        } catch {
          this.documentUploadError.set(
            'Application was saved, but the resume upload failed. Keep the file as DOCX and try again.',
          );
        }
      }

      this.applicationResult.set(result);
      this.success.set(successMessage);
      await this.loadMyApplications();
    } catch {
      this.error.set('Application could not be submitted. Confirm the post is still published and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  experienceLabel(job: Pick<PortalJobPostListItem, 'experienceMinYears' | 'experienceMaxYears'>): string {
    const min = job.experienceMinYears;
    const max = job.experienceMaxYears;
    if (min !== null && min !== undefined && max !== null && max !== undefined) {
      return `${min}-${max} years`;
    }
    if (min !== null && min !== undefined) {
      return `${min}+ years`;
    }
    return 'Experience flexible';
  }

  onApplicationDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.documentUploadError.set('');

    if (!file) {
      this.selectedDocumentFile.set(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      this.selectedDocumentFile.set(null);
      this.documentUploadError.set('Upload a DOCX resume for this MVP.');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.selectedDocumentFile.set(null);
      this.documentUploadError.set('Resume must be 5 MB or smaller.');
      input.value = '';
      return;
    }

    this.selectedDocumentFile.set(file);
  }

  formatFileSize(sizeBytes: number): string {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return 'Size not recorded';
    }

    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  timelineIcon(kind: string): string {
    switch (kind) {
      case 'Applied':
        return 'assignment_turned_in';
      case 'Interview':
        return 'play_arrow';
      case 'OfferMeeting':
        return 'event_available';
      case 'FinalOutcome':
        return 'verified';
      default:
        return 'radio_button_checked';
    }
  }

  applicationStatusLabel(status: string): string {
    return this.humanizeStatus(status).toUpperCase();
  }

  statusGreeting(application: PortalMyApplicationItem): string {
    const firstName = this.currentUser()?.displayName?.split(' ')[0] || 'there';
    const status = application.status.toLowerCase();
    if (status.includes('joined')) {
      return `Congratulations, ${firstName}!`;
    }
    if (status.includes('offered')) {
      return `Offer step is ready, ${firstName}.`;
    }
    if (this.isDecisionStatus(status)) {
      return `Application update, ${firstName}.`;
    }
    return `Great progress, ${firstName}!`;
  }

  statusSummary(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (status.includes('interview')) {
      return this.currentStatusContext(application);
    }
    if (status.includes('hiringmanager')) {
      return 'Your completed interviews are with the hiring manager for final review.';
    }
    if (status.includes('offered')) {
      return 'The hiring manager has moved this application into the offer stage.';
    }
    if (status.includes('joined')) {
      return 'This application has reached the joined outcome.';
    }
    if (application.finalDecisionReason) {
      return application.finalDecisionReason;
    }
    return 'Recruiter updates will appear here as the hiring pipeline moves.';
  }

  journeySteps(application: PortalMyApplicationItem): ApplicationJourneyStep[] {
    const status = application.status.toLowerCase();
    const decision = this.isDecisionStatus(status);
    const finalReview = decision || status.includes('hiringmanager') || status.includes('offer');
    const interviewing = finalReview || status.includes('interview') || application.interviewsTotal > 0;
    const recruiterReview = status.includes('interview') && this.interviewsComplete(application) && !finalReview;
    const screeningDone = interviewing || finalReview || decision;
    const interviewDate = this.latestTimelineDate(application, (event) => event.kind === 'Interview');
    const reviewDate = this.latestTimelineDate(application, (event) => event.kind === 'OfferMeeting') ?? interviewDate;
    const finalDate =
      application.finalDecisionAt ??
      this.latestTimelineDate(application, (event) => event.kind === 'FinalOutcome') ??
      reviewDate;

    return [
      {
        label: 'Applied',
        date: application.appliedAt,
        icon: 'check',
        state: 'done',
      },
      {
        label: 'Screening',
        date: screeningDone ? application.appliedAt : null,
        icon: screeningDone ? 'check' : 'hourglass_top',
        state: screeningDone ? 'done' : 'current',
      },
      {
        label: 'Interviewing',
        date: interviewDate,
        icon: finalReview || recruiterReview ? 'check' : 'forum',
        state: finalReview || recruiterReview ? 'done' : interviewing ? 'current' : 'upcoming',
      },
      {
        label: recruiterReview ? 'Recruiter Review' : 'Final Review',
        date: recruiterReview || finalReview ? reviewDate : null,
        icon: decision ? 'check' : 'person_check',
        state: decision ? 'done' : finalReview || recruiterReview ? 'current' : 'upcoming',
      },
      {
        label: 'Decision',
        date: finalDate,
        icon: decision ? 'task_alt' : 'flag',
        state: decision ? 'current' : 'upcoming',
      },
    ];
  }

  nextStepTitle(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    const scheduledInterview = this.latestTimelineEvent(
      application,
      (event) => event.kind === 'Interview' && !this.eventLooksComplete(event),
    );
    if (scheduledInterview) {
      return `Next Step: ${scheduledInterview.title}`;
    }
    if (status.includes('interview')) {
      if (this.interviewsComplete(application)) {
        return 'Next Step: Recruiter Post-Interview Review';
      }

      return `Next Step: Interview ${this.nextInterviewNumber(application)}${this.interviewTotalSuffix(application)}`;
    }
    if (status.includes('hiringmanager')) {
      return 'Next Step: Hiring Manager Review';
    }
    if (status.includes('offered')) {
      return 'Next Step: Offer Presentation';
    }
    if (this.isDecisionStatus(status)) {
      return `Final Status: ${this.humanizeStatus(application.status)}`;
    }
    return `Next Step: ${this.humanizeStatus(application.status)}`;
  }

  nextStepDate(application: PortalMyApplicationItem): string {
    const event =
      this.latestTimelineEvent(application, (item) => item.kind === 'Interview' && !this.eventLooksComplete(item)) ??
      this.latestTimelineEvent(application, (item) => item.kind === 'OfferMeeting') ??
      this.latestTimelineEvent(application, () => true);
    return this.formatDateTime(event?.occurredAt ?? application.finalDecisionAt);
  }

  nextStepGuidance(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (status.includes('interview')) {
      if (this.interviewsComplete(application)) {
        return 'All configured interviews are complete. The recruiter is reviewing the interview packet and can forward it to Hiring Manager Review or schedule another round if needed.';
      }

      return `Interview ${this.nextInterviewNumber(application)} is pending. The recruiter will share the schedule once the interviewer and time slot are confirmed.`;
    }
    if (status.includes('hiringmanager')) {
      return 'Your interview packet is in final review. The hiring manager will decide whether to move to offer, hold, or close.';
    }
    if (status.includes('offered')) {
      return 'Watch for the in-person offer presentation invite and bring any documents requested by the hiring manager.';
    }
    if (this.isDecisionStatus(status)) {
      return application.finalDecisionReason || 'This application has a final recorded outcome.';
    }
    return 'Keep your profile and contact details current while the recruiter reviews the application.';
  }

  isCurrentStatusEvent(event: PortalApplicationTimelineItem): boolean {
    return event.kind === 'Status' || event.title.toLowerCase().startsWith('current status');
  }

  journeyEventDescription(event: PortalApplicationTimelineItem, application: PortalMyApplicationItem): string {
    return this.isCurrentStatusEvent(event) ? this.currentStatusContext(application) : event.description;
  }

  currentStatusContext(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (status.includes('interview')) {
      if (this.interviewsComplete(application)) {
        return `All ${application.interviewsTotal} configured interviews are complete (${application.interviewPassSummary}). Your application is currently with the recruiter for post-interview review before Hiring Manager Review.`;
      }

      return `Interview ${this.nextInterviewNumber(application)}${this.interviewTotalSuffix(application)} is the next pending round. The recruiter owns scheduling and will update this page when it is confirmed.`;
    }

    if (status.includes('hiringmanager')) {
      return 'The recruiter has forwarded your completed interview packet to the hiring manager for final review.';
    }

    if (status.includes('offered')) {
      return 'The hiring manager has moved this application into offer handling.';
    }

    if (this.isDecisionStatus(status)) {
      return application.finalDecisionReason || `This application is currently ${this.humanizeStatus(application.status)}.`;
    }

    return 'The recruiter will update this application as it moves through the hiring pipeline.';
  }

  private latestTimelineDate(
    application: PortalMyApplicationItem,
    predicate: (event: PortalApplicationTimelineItem) => boolean,
  ): string | null {
    return this.latestTimelineEvent(application, predicate)?.occurredAt ?? null;
  }

  private latestTimelineEvent(
    application: PortalMyApplicationItem,
    predicate: (event: PortalApplicationTimelineItem) => boolean,
  ): PortalApplicationTimelineItem | null {
    return (application.timeline ?? [])
      .filter(predicate)
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))[0] ?? null;
  }

  private eventLooksComplete(event: PortalApplicationTimelineItem): boolean {
    const text = `${event.title} ${event.description} ${event.status}`.toLowerCase();
    return (
      text.includes('completed') ||
      text.includes('passed') ||
      text.includes('proceed') ||
      text.includes('rejected') ||
      text.includes('joined') ||
      text.includes('declined')
    );
  }

  private interviewsComplete(application: PortalMyApplicationItem): boolean {
    return application.interviewsTotal > 0 && application.interviewsPassed >= application.interviewsTotal;
  }

  private nextInterviewNumber(application: PortalMyApplicationItem): number {
    if (application.interviewsTotal <= 0) {
      return application.interviewsPassed + 1;
    }

    return Math.min(application.interviewsPassed + 1, application.interviewsTotal);
  }

  private interviewTotalSuffix(application: PortalMyApplicationItem): string {
    return application.interviewsTotal > 0 ? ` of ${application.interviewsTotal}` : '';
  }

  private isDecisionStatus(status: string): boolean {
    return (
      status.includes('joined') ||
      status.includes('rejected') ||
      status.includes('onhold') ||
      status.includes('on hold') ||
      status.includes('hired') ||
      status.includes('withdrawn') ||
      status.includes('declined')
    );
  }

  private humanizeStatus(status: string): string {
    return status
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Recruiter will update this timeline';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Recruiter will update this timeline';
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private async loadCurrentPage(): Promise<void> {
    this.loading.set(true);
    this.clearStatus();
    this.applicationResult.set(null);

    try {
      switch (this.pageId()) {
        case 'jobs':
          await this.loadJobs();
          break;
        case 'job-detail':
          await this.loadJobPost(this.routeId());
          break;
        case 'apply':
          await this.loadJobPost(this.applyJobPostId());
          break;
        case 'my-applications':
        case 'application-status':
          await this.loadMyApplications();
          break;
      }
    } catch {
      this.error.set('The requested candidate portal data could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadJobs(): Promise<void> {
    const result = await this.store.loadPortalJobPosts();
    this.jobPosts.set(result.items ?? []);
  }

  private async loadJobPost(jobPostId: string | null): Promise<void> {
    this.jobPost.set(null);
    if (!jobPostId) {
      return;
    }

    this.jobPost.set(await this.store.loadPortalJobPost(jobPostId));
  }

  private async loadMyApplications(): Promise<void> {
    const result = await this.store.loadPortalMyApplications();
    this.myApplications.set(result.items ?? []);
  }

  private cleanApplicationInput(input: PortalApplyToJobPostInput): PortalApplyToJobPostInput {
    return {
      phone: this.blankToNull(input.phone),
      linkedInUrl: this.blankToNull(input.linkedInUrl),
      currentDesignation: this.blankToNull(input.currentDesignation),
      currentCompany: this.blankToNull(input.currentCompany),
      experienceYears: this.numberOrNull(input.experienceYears),
      noticePeriodDays: this.numberOrNull(input.noticePeriodDays),
      universityName: this.blankToNull(input.universityName),
      degreeName: this.blankToNull(input.degreeName),
      graduationYear: this.numberOrNull(input.graduationYear),
      coverLetter: this.blankToNull(input.coverLetter),
    };
  }

  private blankToNull(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private numberOrNull(value: number | null | undefined): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return null;
    }

    return Number(value);
  }

  private clearStatus(): void {
    this.error.set('');
    this.success.set('');
    this.documentUploadError.set('');
  }
}
