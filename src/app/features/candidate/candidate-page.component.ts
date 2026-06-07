import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  PortalApplyToJobPostInput,
  PortalCandidateProfile,
  PortalCandidateProfileDocument,
  PortalCandidateProfileSkillOption,
  PortalJobApplicationResult,
  PortalInvitationContext,
  PortalJobPostDetail,
  PortalJobPostListItem,
  PortalApplicationDocument,
  PortalApplicationTimelineItem,
  PortalMyApplicationItem,
  PublicPortalContext,
  UpdatePortalCandidateProfileInput,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';
import { FileDownloadService } from '../../core/services/file-download.service';

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
  tone?: 'rejected';
}

interface CandidateJobFilters {
  search: string;
  department: string;
  location: string;
  experience: string;
}

interface CandidateApplicationFilters {
  status: string;
  dateRange: '30' | '90' | 'all';
  department: string;
}

interface CandidateProfileForm {
  displayName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  currentDesignation: string;
  currentCompany: string;
  experienceYears: number | null;
  expectedSalaryAmount: number | null;
  expectedSalaryCurrency: string;
  noticePeriodDays: number | null;
  universityName: string;
  degreeName: string;
  graduationYear: number | null;
  currentWorkCompany: string;
  currentWorkTitle: string;
}

interface CandidateInterviewCard {
  application: PortalMyApplicationItem;
  event: PortalApplicationTimelineItem;
  isUpcoming: boolean;
}

interface CandidateInterviewGroup {
  application: PortalMyApplicationItem;
  interviews: CandidateInterviewCard[];
  upcomingCount: number;
  pastCount: number;
}

@Component({
  selector: 'app-candidate-page',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="candidate-page stitch-candidate-page">
      @if (pageId() !== 'application-status' && pageId() !== 'profile' && pageId() !== 'apply' && pageId() !== 'job-detail' && pageId() !== 'my-applications') {
        <section class="candidate-hero-v2" [class.portal-image-hero]="pageId() === 'jobs'" [class.compact]="pageId() !== 'jobs'">
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
            <section class="candidate-portal-layout">
              <div class="candidate-jobs-column">
                <form class="candidate-job-filters" (ngSubmit)="applyJobFilters()">
                  <label class="stitch-field search-field">
                    <span>Search</span>
                    <input
                      name="jobSearch"
                      [(ngModel)]="jobFilters.search"
                      placeholder="Search by job title, keyword, or company..."
                    />
                  </label>
                  <div class="candidate-filter-row">
                    <label class="stitch-field compact">
                      <span>Department</span>
                      <select name="jobDepartment" [(ngModel)]="jobFilters.department">
                        <option value="">All departments</option>
                        @for (department of jobDepartmentOptions(); track department) {
                          <option [value]="department">{{ department }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Location</span>
                      <select name="jobLocation" [(ngModel)]="jobFilters.location">
                        <option value="">All locations</option>
                        @for (location of jobLocationOptions(); track location) {
                          <option [value]="location">{{ location }}</option>
                        }
                      </select>
                    </label>
                    <label class="stitch-field compact">
                      <span>Experience</span>
                      <select name="jobExperience" [(ngModel)]="jobFilters.experience">
                        <option value="">Any experience</option>
                        <option value="0-2">0-2 years</option>
                        <option value="3-5">3-5 years</option>
                        <option value="5-plus">5+ years</option>
                        <option value="flexible">Flexible</option>
                      </select>
                    </label>
                    <button class="btn primary" type="submit">
                      <span class="material-symbols-outlined" aria-hidden="true">filter_alt</span>
                      Apply Filters
                    </button>
                  </div>
                </form>

                <section class="portal-job-list">
                  @if (jobPosts().length === 0) {
                    <article class="candidate-panel empty-state">
                      <strong>No open jobs are published right now.</strong>
                      <p>Recruiters publish Talent Pilot portal jobs from the sourcing workspace.</p>
                    </article>
                  } @else if (visibleJobPosts().length === 0) {
                    <article class="candidate-panel empty-state">
                      <strong>No jobs match the selected filters.</strong>
                      <button class="btn secondary" type="button" (click)="clearJobFilters()">Clear filters</button>
                    </article>
                  } @else {
                    @for (job of visibleJobPosts(); track job.jobPostId) {
                      <article
                        class="candidate-panel portal-job-card portal-job-card-v2"
                        [class.applied]="jobIsApplied(job.jobPostId)"
                        [attr.aria-disabled]="jobIsApplied(job.jobPostId) ? 'true' : null"
                      >
                        <div class="portal-job-main">
                          <span class="portal-job-icon material-symbols-outlined" aria-hidden="true">work</span>
                          <div class="portal-job-copy">
                            <div class="portal-job-title-row">
                              <span class="candidate-status-pill">{{ job.department }}</span>
                              <small>{{ experienceLabel(job) }}</small>
                            </div>
                            <h2>{{ job.title }}</h2>
                            <p class="portal-job-meta">
                              <span><span class="material-symbols-outlined" aria-hidden="true">apartment</span>{{ job.companyName }}</span>
                              <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{ job.location }}</span>
                              <span><span class="material-symbols-outlined" aria-hidden="true">event</span>{{ job.publishedAt | date: 'shortDate' }}</span>
                            </p>
                            <div class="portal-skill-row">
                              @for (skill of job.skills.slice(0, 5); track skill.skillId) {
                                <span>{{ skill.name }}</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="portal-job-actions">
                          @if (applicationForJob(job.jobPostId); as application) {
                            @if (myApplicationIsInvited(application)) {
                              <span class="candidate-status-pill invited">Invited</span>
                              <a class="btn primary" [routerLink]="candidateRoute('apply', job.jobPostId)">
                                <span class="material-symbols-outlined" aria-hidden="true">send</span>
                                Complete Application
                              </a>
                            } @else {
                              <span class="candidate-status-pill applied">Applied</span>
                              <a class="btn secondary" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                                <span class="material-symbols-outlined" aria-hidden="true">query_stats</span>
                                View Status
                              </a>
                            }
                          } @else {
                            <a class="btn secondary" [routerLink]="candidateRoute('jobs', job.jobPostId)">
                              <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                              View Details
                            </a>
                            <a class="btn primary" [routerLink]="jobListStartApplicationRoute(job)" [queryParams]="jobListStartApplicationQueryParams(job)">
                              <span class="material-symbols-outlined" aria-hidden="true">send</span>
                              Apply Now
                            </a>
                          }
                        </div>
                      </article>
                    }
                  }
                </section>
              </div>

              <aside class="candidate-status-rail candidate-jobs-rail">
                @if (currentUser(); as user) {
                  @if (isCandidateUser()) {
                    <article class="candidate-panel candidate-status-card">
                      <h2>Candidate Status</h2>
                      <div class="candidate-stat-row">
                        <span class="material-symbols-outlined" aria-hidden="true">assignment</span>
                        <div>
                          <strong>{{ myApplications().length | number: '2.0-0' }}</strong>
                          <small>Applications active track</small>
                        </div>
                      </div>
                      <div class="candidate-stat-row">
                        <span class="material-symbols-outlined" aria-hidden="true">event</span>
                        <div>
                          <strong>{{ upcomingInterviewCount() | number: '2.0-0' }}</strong>
                          <small>Interviews upcoming</small>
                        </div>
                      </div>
                    </article>
                    <article class="candidate-panel candidate-next-step-card">
                      <h2>Next Step</h2>
                      <p>{{ candidateNextStep() }}</p>
                      <a class="btn secondary full" [routerLink]="candidateRoute('my-applications')">Track applications</a>
                    </article>
                    <article class="candidate-panel candidate-profile-cta">
                      <strong>Complete your profile</strong>
                      <p>{{ profileCompletionLabel() }}</p>
                      <div class="profile-progress" aria-hidden="true">
                        <span [style.width.%]="profileCompletionPercent()"></span>
                      </div>
                      <a class="btn primary full" [routerLink]="candidateRoute('profile')">Update Profile</a>
                    </article>
                  } @else {
                    <article class="candidate-panel candidate-profile-cta">
                      <strong>Candidate account required</strong>
                      <p>You are signed in as {{ user.roleDisplayName ?? 'an internal user' }}. Use a candidate account to apply, track applications, and manage a candidate profile.</p>
                      <a class="btn secondary full" routerLink="/auth/login" [queryParams]="{ returnUrl: candidateRoute('profile').join('/'), switchAccount: 'candidate' }">Switch account</a>
                    </article>
                  }
                } @else {
                  <article class="candidate-panel candidate-profile-cta">
                    <strong>Create your candidate profile</strong>
                    <p>Create an account when you are ready to apply, save your profile, and track application progress.</p>
                    <a class="btn primary full" [routerLink]="candidateSignupRoute()" [queryParams]="{ returnUrl: candidateRoute('profile').join('/') }">Create account</a>
                    <a class="btn secondary full" routerLink="/auth/login" [queryParams]="{ returnUrl: candidateRoute('profile').join('/'), switchAccount: 'candidate' }">Sign in</a>
                  </article>
                }
              </aside>
            </section>
          }

          @case ('job-detail') {
            @if (jobPost(); as job) {
              <section class="candidate-job-detail-page">
                <nav class="job-detail-breadcrumb" aria-label="Breadcrumb">
                  <a [routerLink]="candidateRoute('jobs')">Jobs</a>
                  <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                  <span>{{ job.department }}</span>
                  <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                  <strong>{{ job.title }}</strong>
                </nav>

                <section class="job-detail-layout">
                  <div class="job-detail-main">
                    <article class="job-detail-hero-card">
                      <div class="job-detail-hero-copy">
                        <span class="job-detail-department">{{ job.department }}</span>
                        <h1>{{ job.title }}</h1>
                        <p class="job-detail-meta">
                          <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{ job.location }}</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">business_center</span>Full-time</span>
                          <span><span class="material-symbols-outlined" aria-hidden="true">trending_up</span>{{ experienceLabel(job) }}</span>
                        </p>
                        <div class="job-detail-skill-row" aria-label="Key skills">
                          @for (skill of job.skills.slice(0, 4); track skill.skillId) {
                            <span>{{ skill.name }}</span>
                          }
                        </div>
                      </div>
                      <button
                        class="job-detail-save-button"
                        type="button"
                        [class.saved]="jobSavedForLater(job.jobPostId)"
                        [attr.aria-label]="jobSavedForLater(job.jobPostId) ? 'Job saved' : 'Save job for later'"
                        [attr.aria-pressed]="jobSavedForLater(job.jobPostId)"
                        [attr.title]="jobSavedForLater(job.jobPostId) ? 'Job saved' : 'Save job for later'"
                        (click)="saveJobForLater(job)"
                      >
                        <span class="material-symbols-outlined" aria-hidden="true">
                          {{ jobSavedForLater(job.jobPostId) ? 'bookmark_added' : 'bookmark_add' }}
                        </span>
                      </button>
                    </article>

                    <article class="candidate-panel job-detail-content-card">
                      <section class="job-detail-section">
                        <h2>Job Description</h2>
                        <p>{{ jobDescriptionText(job) }}</p>
                      </section>

                      <section class="job-detail-section">
                        <h2>Key Responsibilities</h2>
                        <ul>
                          @for (item of jobResponsibilities(job); track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </section>

                      <section class="job-detail-section">
                        <h2>Technical Requirements</h2>
                        <ul>
                          @for (item of jobTechnicalRequirements(job); track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </section>

                      <section class="job-detail-section">
                        <h2>Nice-to-have Skills</h2>
                        <div class="job-detail-nice-skills">
                          @for (skill of jobNiceToHaveSkills(job); track skill) {
                            <span>{{ skill }}</span>
                          }
                        </div>
                      </section>

                      <section class="job-detail-about">
                        <div>
                          <h2>About TKXEL</h2>
                          <p>
                            TKXEL is a premium software development firm committed to delivering excellence in engineering.
                            We partner with teams to solve complex technical challenges.
                          </p>
                          <a [routerLink]="candidateRoute('jobs')">View Company Profile</a>
                        </div>
                        <img src="/candidate-portal-hero.png" alt="TKXEL engineering workspace" />
                      </section>
                    </article>
                  </div>

                  <aside class="job-detail-sidebar">
                    @if (jobDetailVisitedFromInviteLink()) {
                      <article class="job-detail-invite-card">
                        <span class="material-symbols-outlined" aria-hidden="true">celebration</span>
                        <strong>You've been invited to apply</strong>
                        <p>TKXEL Recruitment invited you to review this role. Start the application when you are ready to submit your interest.</p>
                        @if (applicationForJob(job.jobPostId); as application) {
                          @if (myApplicationIsInvited(application)) {
                            <a
                              class="btn light full"
                              [routerLink]="jobDetailStartApplicationRoute(job)"
                              [queryParams]="jobDetailStartApplicationQueryParams(job)"
                            >
                              {{ jobDetailStartApplicationLabel('Complete Application') }}
                              <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                            </a>
                          } @else {
                            <a class="btn light full" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                              View Application
                              <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                            </a>
                          }
                        } @else {
                          <a
                            class="btn light full"
                            [routerLink]="jobDetailStartApplicationRoute(job)"
                            [queryParams]="jobDetailStartApplicationQueryParams(job)"
                          >
                            {{ jobDetailStartApplicationLabel('Start Application') }}
                            <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                          </a>
                        }
                      </article>
                    }

                    <article class="candidate-panel job-detail-summary-card">
                      <h2>Job Summary</h2>
                      <dl>
                        <div>
                          <dt>Salary Range</dt>
                          <dd>Competitive</dd>
                        </div>
                        <div>
                          <dt>Posted Date</dt>
                          <dd>{{ job.publishedAt | date: 'mediumDate' }}</dd>
                        </div>
                        <div>
                          <dt>Applications</dt>
                          <dd>{{ jobIsApplied(job.jobPostId) ? 'Applied' : 'Accepting' }}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{{ job.location }}</dd>
                        </div>
                      </dl>
                    </article>

                    <article class="candidate-panel job-detail-share-card">
                      <h2>Share this role</h2>
                      <div>
                        <button type="button" aria-label="Share role" (click)="shareJob(job)">
                          <span class="material-symbols-outlined" aria-hidden="true">share</span>
                        </button>
                        <button type="button" aria-label="Copy job link" (click)="copyJobLink(job)">
                          <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
                        </button>
                        <a [href]="jobEmailShareLink(job)" aria-label="Email job link">
                          <span class="material-symbols-outlined" aria-hidden="true">mail</span>
                        </a>
                      </div>
                    </article>
                  </aside>
                </section>
              </section>
            } @else {
              <section class="candidate-panel empty-state">This job post is not available.</section>
            }
          }

          @case ('apply') {
            @if (jobPost(); as job) {
              <form class="portal-apply-page" (ngSubmit)="submitApplication()">
                <section class="portal-apply-summary" aria-labelledby="portal-apply-title">
                  <a class="portal-apply-department" [routerLink]="candidateRoute('jobs', job.jobPostId)">
                    <span class="material-symbols-outlined" aria-hidden="true">business</span>
                    {{ job.department }}
                  </a>
                  <h1 id="portal-apply-title">{{ job.title }}</h1>
                  <p>{{ job.companyName }} - {{ job.location }} - {{ experienceLabel(job) }}</p>
                  <div class="portal-apply-chip-row" aria-label="Required skills">
                    @for (skill of job.skills.slice(0, 4); track skill.skillId) {
                      <span>{{ skill.name }}</span>
                    }
                  </div>
                </section>

                @if (completedApplicationForJob(job.jobPostId); as application) {
                  <article class="candidate-panel portal-reapply-blocked-card">
                    <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
                    <strong>Already applied</strong>
                    <p>This role is already linked to your candidate account. Continue from the existing application instead of submitting again.</p>
                    <div class="portal-reapply-actions">
                      <a class="btn primary" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                        <span class="material-symbols-outlined" aria-hidden="true">query_stats</span>
                        View Status
                      </a>
                      <a class="btn secondary" [routerLink]="candidateRoute('jobs')">
                        <span class="material-symbols-outlined" aria-hidden="true">work</span>
                        Browse Jobs
                      </a>
                    </div>
                  </article>
                } @else {
                <nav class="portal-application-sections" aria-label="Application form sections">
                  <button
                    type="button"
                    [class.complete]="applicationProfileSectionComplete()"
                    (click)="scrollToApplicationSection('portal-profile-section')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {{ applicationProfileSectionComplete() ? 'check_circle' : 'person' }}
                    </span>
                    <span>
                      <strong>Profile & experience</strong>
                      <small>Contact, work, education</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    [class.complete]="applicationCvSectionComplete()"
                    (click)="scrollToApplicationSection('portal-cv-section')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {{ applicationCvSectionComplete() ? 'check_circle' : 'upload_file' }}
                    </span>
                    <span>
                      <strong>CV upload</strong>
                      <small>Attach DOCX resume</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    [class.complete]="applicationReviewSectionComplete()"
                    (click)="scrollToApplicationSection('portal-review-section')"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">
                      {{ applicationReviewSectionComplete() ? 'check_circle' : 'fact_check' }}
                    </span>
                    <span>
                      <strong>Review & submit</strong>
                      <small>Consent and final action</small>
                    </span>
                  </button>
                </nav>

                <article class="candidate-panel portal-application-form portal-apply-card">
                  <section class="portal-apply-section" id="portal-profile-section">
                    <h2 class="portal-apply-section-title">
                      <span class="material-symbols-outlined" aria-hidden="true">person</span>
                      Profile Information
                    </h2>
                    <div class="candidate-form-grid portal-apply-form-grid">
                      <label class="stitch-field">
                        <span>Full Name</span>
                        <input name="fullName" [value]="candidateDisplayName()" readonly />
                      </label>
                      <label class="stitch-field">
                        <span>Email</span>
                        <input name="email" [value]="candidateEmail()" readonly />
                      </label>
                      <label class="stitch-field">
                        <span>Phone Number</span>
                        <input name="phone" placeholder="+92 300 0000000" [(ngModel)]="applyForm.phone" />
                      </label>
                      <label class="stitch-field">
                        <span>LinkedIn URL</span>
                        <input name="linkedInUrl" placeholder="linkedin.com/in/username" [(ngModel)]="applyForm.linkedInUrl" />
                      </label>
                      <label class="stitch-field">
                        <span>Current Designation</span>
                        <input name="currentDesignation" placeholder="e.g. Software Engineer" [(ngModel)]="applyForm.currentDesignation" />
                      </label>
                      <label class="stitch-field">
                        <span>Current Company</span>
                        <input name="currentCompany" placeholder="e.g. Current employer" [(ngModel)]="applyForm.currentCompany" />
                      </label>
                      <label class="stitch-field">
                        <span>Total Experience (Years)</span>
                        <input
                          name="experienceYears"
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="e.g. 5"
                          [(ngModel)]="applyForm.experienceYears"
                        />
                      </label>
                      <label class="stitch-field">
                        <span>Expected Salary (Annual)</span>
                        <input name="expectedSalary" [value]="expectedSalaryLabel()" placeholder="Add in Profile" readonly />
                      </label>
                      <label class="stitch-field">
                        <span>Notice Period</span>
                        <select name="noticePeriodDays" [(ngModel)]="applyForm.noticePeriodDays">
                          <option [ngValue]="null">Immediate</option>
                          <option [ngValue]="15">15 days</option>
                          <option [ngValue]="30">30 days</option>
                          <option [ngValue]="45">45 days</option>
                          <option [ngValue]="60">60 days</option>
                          <option [ngValue]="90">90 days</option>
                        </select>
                      </label>
                      <div class="stitch-field portal-date-range-field" role="group" aria-labelledby="interview-availability-label">
                        <span id="interview-availability-label">Availability for Interview</span>
                        <div class="portal-date-range-control">
                          <label class="portal-date-input">
                            <span>From</span>
                            <input
                              name="interviewAvailabilityStartDate"
                              type="date"
                              aria-label="Interview availability from"
                              [min]="minimumInterviewAvailabilityDate()"
                              [(ngModel)]="applyForm.interviewAvailabilityStartDate"
                            />
                          </label>
                          <label class="portal-date-input">
                            <span>To</span>
                            <input
                              name="interviewAvailabilityEndDate"
                              type="date"
                              aria-label="Interview availability to"
                              [min]="interviewAvailabilityEndMinDate()"
                              [(ngModel)]="applyForm.interviewAvailabilityEndDate"
                            />
                          </label>
                        </div>
                        @if (interviewAvailabilityRangeError(); as rangeError) {
                          <small class="portal-field-hint error">{{ rangeError }}</small>
                        }
                      </div>
                      <label class="stitch-field">
                        <span>Primary University</span>
                        <input name="universityName" placeholder="e.g. FAST-NUCES" [(ngModel)]="applyForm.universityName" />
                      </label>
                      <label class="stitch-field">
                        <span>Degree</span>
                        <input name="degreeName" placeholder="e.g. BSCS" [(ngModel)]="applyForm.degreeName" />
                      </label>
                      <label class="stitch-field">
                        <span>Graduation Year</span>
                        <input
                          name="graduationYear"
                          type="number"
                          min="1970"
                          max="2100"
                          placeholder="e.g. 2019"
                          [(ngModel)]="applyForm.graduationYear"
                        />
                      </label>
                      <label class="stitch-field portal-cover-letter-field">
                        <span>Cover Letter</span>
                        <textarea
                          name="coverLetter"
                          rows="4"
                          [(ngModel)]="applyForm.coverLetter"
                          placeholder="Share why this role is a strong fit for your background."
                        ></textarea>
                      </label>
                    </div>
                  </section>

                  <section class="portal-apply-section" id="portal-cv-section">
                    <h2 class="portal-apply-section-title">
                      <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                      CV Upload
                    </h2>
                    <label class="candidate-document-upload portal-apply-upload">
                      <span class="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
                      <strong>{{ applicationCvLabel() }}</strong>
                      <small>{{ applicationCvHint() }}</small>
                      <em>{{ selectedDocumentFile() ? 'Application CV' : profileResumeDocument() ? 'Profile CV fallback' : 'DOCX only' }}</em>
                      <input
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        (change)="onApplicationDocumentSelected($event)"
                      />
                    </label>
                    @if (documentUploadError()) {
                      <p class="field-status error">{{ documentUploadError() }}</p>
                    }
                  </section>

                  <section class="portal-apply-section" id="portal-review-section">
                    <h2 class="portal-apply-section-title">
                      <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
                      Review & Consent
                    </h2>
                    <div class="portal-review-consent">
                      By submitting this application, you confirm that the information provided is accurate and complete to the best of your knowledge. TKXEL is an equal opportunity employer and reviews all applicants consistently.
                    </div>
                    <label class="portal-consent-check">
                      <input name="applicationConsentAccepted" type="checkbox" [(ngModel)]="applicationConsentAccepted" />
                      <span>
                        I agree to the <a [routerLink]="candidateRoute('profile')">profile policy</a> and <a [routerLink]="candidateRoute('jobs')">candidate terms</a>.
                      </span>
                    </label>
                  </section>

                  @if (applicationResult(); as result) {
                    <div class="candidate-application-result">
                      <strong>{{ result.alreadyApplied ? 'Existing application found' : 'Application submitted' }}</strong>
                      <p>Status: {{ result.status }}</p>
                      <a [routerLink]="candidateRoute('applications', result.jobApplicationId, 'status')">View application status</a>
                    </div>
                  }

                  <footer class="portal-apply-actions">
                    <button class="btn secondary" type="button" (click)="saveApplicationDraft()">
                      Save Draft
                    </button>
                    <button class="btn primary" type="submit" [disabled]="submitting() || !applicationConsentAccepted">
                      {{ submitting() ? 'Submitting...' : 'Submit Application' }}
                    </button>
                  </footer>
                </article>
                }
              </form>
            } @else {
              <section class="candidate-panel empty-state">This job post is not available for applications.</section>
            }
          }

          @case ('my-applications') {
            <section class="candidate-applications-page">
              <header class="applications-page-header">
                <h1>My Applications</h1>
                <p>Track and manage your professional journey. Stay updated on your progress and respond to recruiter invitations.</p>
              </header>

              <form class="applications-filter-bar" (ngSubmit)="applyMyApplicationFilters()">
                <label class="application-filter-field">
                  <span>Status</span>
                  <select name="applicationStatus" [(ngModel)]="myApplicationFilters.status">
                    <option value="">All Statuses</option>
                    @for (status of myApplicationStatusOptions(); track status) {
                      <option [value]="status">{{ humanReadableStatus(status) }}</option>
                    }
                  </select>
                </label>
                <label class="application-filter-field">
                  <span>Date Applied</span>
                  <select name="applicationDateRange" [(ngModel)]="myApplicationFilters.dateRange">
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="all">All dates</option>
                  </select>
                </label>
                <label class="application-filter-field">
                  <span>Department</span>
                  <select name="applicationDepartment" [(ngModel)]="myApplicationFilters.department">
                    <option value="">All departments</option>
                    @for (department of myApplicationDepartmentOptions(); track department) {
                      <option [value]="department">{{ department }}</option>
                    }
                  </select>
                </label>
                <button class="applications-clear-button" type="button" (click)="clearMyApplicationFilters()" [disabled]="!myApplicationFiltersActive()">
                  <span class="material-symbols-outlined" aria-hidden="true">filter_alt_off</span>
                  Clear Filters
                </button>
              </form>

              <section class="application-card-list">
              @if (myApplications().length === 0) {
                <article class="candidate-panel empty-state">
                  <strong>No applications yet.</strong>
                  <p>Apply to a published job post to see status history here.</p>
                  <a [routerLink]="candidateRoute('jobs')">Browse jobs</a>
                </article>
              } @else if (visibleMyApplications().length === 0) {
                <article class="candidate-panel empty-state">
                  <strong>No applications match the selected filters.</strong>
                  <button class="btn secondary" type="button" (click)="clearMyApplicationFilters()">Clear filters</button>
                </article>
              } @else {
                @for (application of visibleMyApplications(); track application.jobApplicationId) {
                  <article
                    class="application-tracker-card"
                    [class.invited]="myApplicationIsInvited(application)"
                    [class.final]="myApplicationIsFinal(application) && !myApplicationIsSuccessfulFinal(application)"
                    [class.completed]="myApplicationIsSuccessfulFinal(application)"
                  >
                    <div class="application-card-main">
                      <span class="application-card-icon material-symbols-outlined" aria-hidden="true">{{ myApplicationIcon(application) }}</span>
                      <div class="application-card-copy">
                        <div class="application-title-row">
                          <h2>{{ application.jobTitle }}</h2>
                          @if (myApplicationIsInvited(application)) {
                            <span class="application-mini-status invited">
                              <span class="material-symbols-outlined" aria-hidden="true">campaign</span>
                              Invited
                            </span>
                          }
                        </div>
                        <p>{{ myApplicationMeta(application) }}</p>
                        @if (myApplicationIsInvited(application)) {
                          <small>Received: {{ application.appliedAt | date: 'mediumDate' }} <span>-</span> Response requested</small>
                        }
                      </div>
                    </div>

                    @if (!myApplicationIsInvited(application)) {
                      <div class="application-card-status">
                        <span>Status</span>
                        <strong [class]="myApplicationStatusClass(application)">
                          <span class="material-symbols-outlined" aria-hidden="true">{{ myApplicationStatusIcon(application) }}</span>
                          {{ myApplicationStatusLabel(application) }}
                        </strong>
                      </div>
                      <div class="application-card-date">
                        <span>{{ myApplicationDateHeading(application) }}</span>
                        <strong>{{ myApplicationDateValue(application) }}</strong>
                      </div>
                    }

                    <div class="application-card-actions">
                      @if (myApplicationIsInvited(application)) {
                        <a class="btn primary" [routerLink]="candidateRoute('apply', application.jobPostId)">
                          Complete Application
                        </a>
                        <button class="application-text-action" type="button" disabled>Not Interested</button>
                      } @else if (myApplicationIsSuccessfulFinal(application)) {
                        <a class="application-details-link" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                          View Details
                          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                        </a>
                      } @else if (myApplicationIsFinal(application)) {
                        <button class="application-text-action archive" type="button" disabled>
                          Archive
                          <span class="material-symbols-outlined" aria-hidden="true">archive</span>
                        </button>
                      } @else {
                        <a class="application-details-link" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                          View Details
                          <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                        </a>
                      }
                    </div>

                    <footer class="application-card-note">
                      <span class="material-symbols-outlined" aria-hidden="true">{{ myApplicationFooterIcon(application) }}</span>
                      <span>{{ myApplicationFooterText(application) }}</span>
                      @if (!myApplicationIsInvited(application) && !myApplicationIsFinal(application)) {
                        <a class="btn secondary compact" [routerLink]="candidateRoute('applications', application.jobApplicationId, 'status')">
                          Prepare Now
                        </a>
                      }
                    </footer>
                  </article>
                }
              }
              </section>

              <article class="applications-guide-callout">
                <span class="material-symbols-outlined" aria-hidden="true">tips_and_updates</span>
                <div>
                  <strong>{{ myApplicationsGuideTitle() }}</strong>
                  <p>{{ myApplicationsGuideText() }}</p>
                </div>
                <a class="btn secondary compact" [routerLink]="candidateRoute('interviews')">
                  Read Guide
                </a>
              </article>
            </section>
          }

          @case ('application-status') {
            @if (selectedApplication(); as application) {
              <section class="application-status-page">
                <header class="application-status-header">
                  <nav class="status-breadcrumb" aria-label="Application breadcrumb">
                    <a [routerLink]="candidateRoute('my-applications')">My Applications</a>
                    <span>/</span>
                    <span>{{ application.companyName }}</span>
                  </nav>
                  <div class="status-title-row">
                    <div>
                      <h1>{{ application.jobTitle }}</h1>
                      <p>
                        {{ application.companyName }} - {{ application.client }} - {{ application.department }}
                        <span [class]="candidateStatusPillClass(application.status)">{{ applicationStatusLabel(application.status) }}</span>
                      </p>
                    </div>
                    <a class="btn secondary" [routerLink]="candidateRoute('jobs', application.jobPostId)">
                      <span class="material-symbols-outlined" aria-hidden="true">description</span>
                      View Job Description
                    </a>
                  </div>
                </header>

                <article [class]="candidateProgressMessageClass(application)">
                  <span class="material-symbols-outlined" aria-hidden="true">{{ statusMessageIcon(application) }}</span>
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
                          <li
                            [class.done]="step.state === 'done'"
                            [class.current]="step.state === 'current'"
                            [class.upcoming]="step.state === 'upcoming'"
                            [class.rejected]="step.tone === 'rejected'"
                          >
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
                          <div [class]="journeyEventClass(event, application)">
                            <span class="material-symbols-outlined" aria-hidden="true">{{ timelineEventIcon(event, application) }}</span>
                            <div>
                              <strong>{{ event.title }}</strong>
                              <p>{{ event.occurredAt | date: 'medium' }} - {{ journeyEventDescription(event, application) }}</p>
                            </div>
                            <span [class]="candidateStatusPillClass(event.status)">{{ event.status }}</span>
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
                            <p>{{ document.documentType }} uploaded {{ document.uploadedAt | date: 'mediumDate' }}.</p>
                            <small>{{ documentEvidenceSummary(document) }}</small>
                            <small>{{ formatFileSize(document.sizeBytes) }}</small>
                          </div>
                          <span
                            class="candidate-status-pill document-evidence-pill"
                            [class.extracted]="documentEvidenceClass(document) === 'extracted'"
                            [class.failed]="documentEvidenceClass(document) === 'failed'"
                            [class.unsupported]="documentEvidenceClass(document) === 'unsupported'"
                            [class.pending]="documentEvidenceClass(document) === 'pending'">
                            {{ documentEvidenceLabel(document) }}
                          </span>
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
                      <a class="btn secondary full" [routerLink]="candidateRoute('my-applications')">
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
                      <p>{{ application.companyName }} uses Talent Pilot to manage hiring across departments including engineering, HR, marketing, sales, finance, and operations.</p>
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

          @case ('profile') {
            <form class="candidate-profile-layout candidate-profile-view" (ngSubmit)="savePortalProfile()">
              <section class="candidate-profile-main-stack">
                <article class="candidate-panel profile-summary-card">
                  <span class="candidate-profile-avatar">{{ profileInitials() }}</span>
                  <div class="profile-summary-copy">
                    @if (profileEditing()) {
                      <label class="stitch-field compact">
                        <span>Display name</span>
                        <input name="profileDisplayName" required [(ngModel)]="profileForm.displayName" />
                      </label>
                      <label class="stitch-field compact">
                        <span>Current title</span>
                        <input name="profileTitleSummary" [(ngModel)]="profileForm.currentDesignation" />
                      </label>
                    } @else {
                      <h2>{{ profileForm.displayName || 'Candidate Profile' }}</h2>
                      <p>{{ profileForm.currentDesignation || 'Title not specified' }}</p>
                    }
                    <div class="profile-progress-line">
                      <div class="profile-progress" aria-hidden="true">
                        <span [style.width.%]="profileCompletionPercent()"></span>
                      </div>
                      <small>{{ profileCompletionPercent() }}%</small>
                    </div>
                  </div>
                  <div class="profile-summary-actions">
                    @if (profileEditing()) {
                      <button class="btn secondary" type="button" (click)="cancelProfileEdit()">Cancel</button>
                      <button class="btn primary" type="submit" [disabled]="submitting()">
                        {{ submitting() ? 'Saving...' : 'Save Profile' }}
                      </button>
                    } @else {
                      <button class="btn secondary" type="button" (click)="startProfileEdit()">Edit Profile</button>
                    }
                  </div>
                </article>

                <article class="candidate-panel profile-card-section">
                  <header>
                    <span class="material-symbols-outlined" aria-hidden="true">person</span>
                    <h2>Personal Information</h2>
                  </header>
                  @if (profileEditing()) {
                    <div class="candidate-form-grid">
                      <label class="stitch-field">
                        <span>Full name</span>
                        <input name="profileFullName" required [(ngModel)]="profileForm.displayName" />
                      </label>
                      <label class="stitch-field">
                        <span>Email</span>
                        <input name="profileEmail" [ngModel]="profileForm.email" readonly />
                      </label>
                      <label class="stitch-field">
                        <span>Phone</span>
                        <input name="profilePhone" [(ngModel)]="profileForm.phone" />
                      </label>
                      <label class="stitch-field">
                        <span>LinkedIn</span>
                        <input name="profileLinkedIn" [(ngModel)]="profileForm.linkedInUrl" />
                      </label>
                    </div>
                  } @else {
                    <dl class="profile-detail-grid">
                      <div>
                        <dt>Full name</dt>
                        <dd>{{ profileValue(profileForm.displayName) }}</dd>
                      </div>
                      <div>
                        <dt>Email</dt>
                        <dd>
                          {{ profileValue(profileForm.email) }}
                          @if (profileEmailIsVerified()) {
                            <span class="profile-verified-chip" [title]="profileEmailVerificationTitle()">Email verified</span>
                          }
                        </dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{{ profileValue(profileForm.phone) }}</dd>
                      </div>
                      <div>
                        <dt>LinkedIn</dt>
                        <dd>{{ profileValue(profileForm.linkedInUrl) }}</dd>
                      </div>
                    </dl>
                  }
                </article>

                <article class="candidate-panel profile-card-section">
                  <header>
                    <span class="material-symbols-outlined" aria-hidden="true">work</span>
                    <h2>Professional Information</h2>
                  </header>
                  @if (profileEditing()) {
                    <div class="candidate-form-grid">
                      <label class="stitch-field">
                        <span>Current company</span>
                        <input name="profileCompany" [(ngModel)]="profileForm.currentCompany" />
                      </label>
                      <label class="stitch-field">
                        <span>Designation</span>
                        <input name="profileDesignation" [(ngModel)]="profileForm.currentDesignation" />
                      </label>
                      <label class="stitch-field">
                        <span>Total experience</span>
                        <input name="profileExperience" type="number" min="0" step="0.5" [(ngModel)]="profileForm.experienceYears" />
                      </label>
                      <label class="stitch-field">
                        <span>Notice period days</span>
                        <input name="profileNotice" type="number" min="0" [(ngModel)]="profileForm.noticePeriodDays" />
                      </label>
                      <label class="stitch-field">
                        <span>Expected salary</span>
                        <input name="profileSalary" type="number" min="0" step="1000" [(ngModel)]="profileForm.expectedSalaryAmount" />
                      </label>
                      <label class="stitch-field">
                        <span>Currency</span>
                        <input name="profileCurrency" maxlength="3" [(ngModel)]="profileForm.expectedSalaryCurrency" />
                      </label>
                      <label class="stitch-field">
                        <span>Institute</span>
                        <input name="profileInstitute" [(ngModel)]="profileForm.universityName" />
                      </label>
                      <label class="stitch-field">
                        <span>Degree name</span>
                        <input name="profileDegree" [(ngModel)]="profileForm.degreeName" />
                      </label>
                      <label class="stitch-field">
                        <span>Graduated in</span>
                        <input name="profileGraduationYear" type="number" min="1950" max="2100" [(ngModel)]="profileForm.graduationYear" />
                      </label>
                    </div>
                  } @else {
                    <dl class="profile-detail-grid">
                      <div>
                        <dt>Current company</dt>
                        <dd>{{ profileValue(profileForm.currentCompany) }}</dd>
                      </div>
                      <div>
                        <dt>Designation</dt>
                        <dd>{{ profileValue(profileForm.currentDesignation) }}</dd>
                      </div>
                      <div>
                        <dt>Total experience</dt>
                        <dd>{{ profileExperienceText() }}</dd>
                      </div>
                      <div>
                        <dt>Expected salary</dt>
                        <dd>{{ profileSalaryText() }}</dd>
                      </div>
                      <div>
                        <dt>Institute</dt>
                        <dd>{{ profileValue(profileForm.universityName) }}</dd>
                      </div>
                      <div>
                        <dt>Degree name</dt>
                        <dd>{{ profileValue(profileForm.degreeName) }}</dd>
                      </div>
                    </dl>
                  }
                </article>

                <article class="candidate-panel profile-card-section">
                  <header>
                    <span class="material-symbols-outlined" aria-hidden="true">psychology</span>
                    <h2>Technical Skills</h2>
                  </header>
                  @if (profileEditing()) {
                    <div class="profile-skill-heading">
                      <label class="stitch-field compact">
                        <span>Search skills</span>
                        <input name="profileSkillSearch" [(ngModel)]="profileSkillSearch" placeholder="Search skills..." />
                      </label>
                    </div>
                    <div class="profile-skill-grid compact-list">
                      @for (skill of visibleProfileSkillOptions(); track skill.skillId) {
                        <label class="profile-skill-option">
                          <input
                            type="checkbox"
                            [checked]="profileSkillSelected(skill.skillId)"
                            (change)="toggleProfileSkill(skill.skillId, $event)"
                          />
                          <span>
                            <strong>{{ skill.skillName }}</strong>
                            <small>{{ skill.category || 'General' }}</small>
                          </span>
                        </label>
                      }
                    </div>
                  } @else {
                    <div class="profile-chip-list">
                      @for (skill of selectedProfileSkills(); track skill.skillId) {
                        <span>{{ skill.skillName }} <small>{{ skill.skillLevel }}</small></span>
                      } @empty {
                        <span>No skills selected</span>
                      }
                    </div>
                  }
                </article>

                <article class="candidate-panel profile-card-section">
                  <header>
                    <span class="material-symbols-outlined" aria-hidden="true">description</span>
                    <h2>Resume / CV</h2>
                  </header>
                  @if (profileResumeName(); as resumeName) {
                    <div class="profile-resume-row">
                      <span class="material-symbols-outlined" aria-hidden="true">article</span>
                      <div>
                        <strong>{{ resumeName }}</strong>
                        <small>Saved to your profile. Job application uploads override this file.</small>
                      </div>
                      @if (profileResumeDocument(); as resumeDocument) {
                        <button
                          class="btn secondary"
                          type="button"
                          [disabled]="profileDocumentUploading()"
                          (click)="downloadProfileResume(resumeDocument)"
                        >
                          Download
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="profile-resume-row empty">
                      <span class="material-symbols-outlined" aria-hidden="true">article</span>
                      <div>
                        <strong>No resume uploaded yet</strong>
                        <small>Choose a DOCX file before applying to a role.</small>
                      </div>
                    </div>
                  }
                  <label class="profile-resume-dropzone">
                    <span class="material-symbols-outlined" aria-hidden="true">upload_file</span>
                    <strong>{{ profileDocumentUploading() ? 'Uploading Resume...' : profileResumeName() ? 'Replace Resume' : 'Choose Resume' }}</strong>
                    <small>DOCX only, up to 5 MB.</small>
                    <input
                      type="file"
                      [disabled]="profileDocumentUploading()"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      (change)="onProfileResumeSelected($event)"
                    />
                  </label>
                  @if (documentUploadError()) {
                    <p class="field-status error">{{ documentUploadError() }}</p>
                  }
                </article>

              </section>

              <aside class="candidate-status-rail profile-right-rail">
                <article class="candidate-panel profile-tip-card">
                  <span class="material-symbols-outlined" aria-hidden="true">tips_and_updates</span>
                  <strong>Smart Profile Tip</strong>
                  <p>{{ profileCompletionLabel() }}</p>
                </article>
                <article class="candidate-panel profile-ready-card">
                  <strong>Ready for a change?</strong>
                  <p>We found roles matching your current profile.</p>
                  <a class="btn light full" [routerLink]="candidateRoute('jobs')">Explore New Roles</a>
                </article>
              </aside>
            </form>
          }

          @case ('interviews') {
            <section class="portal-application-list candidate-interview-list">
              @if (candidateInterviewGroups().length === 0) {
                <article class="candidate-panel empty-state">
                  <strong>No interviews scheduled yet.</strong>
                  <p>Interview invitations and completed rounds appear here once recruiters update your application timeline.</p>
                  <a [routerLink]="candidateRoute('my-applications')">View applications</a>
                </article>
              } @else {
                @for (group of candidateInterviewGroups(); track group.application.jobApplicationId) {
                  <article class="candidate-panel candidate-interview-group-card">
                    <header class="candidate-interview-group-header">
                      <div class="portal-job-main">
                        <span class="portal-job-icon material-symbols-outlined" aria-hidden="true">work</span>
                        <div>
                          <span class="candidate-status-pill">{{ group.upcomingCount > 0 ? 'Active interviews' : 'Past interviews' }}</span>
                          <h2>{{ group.application.jobTitle }}</h2>
                          <p class="portal-job-meta">
                            <span><span class="material-symbols-outlined" aria-hidden="true">business</span>{{ group.application.companyName }}</span>
                            <span><span class="material-symbols-outlined" aria-hidden="true">location_on</span>{{ group.application.location }}</span>
                            <span><span class="material-symbols-outlined" aria-hidden="true">event_available</span>{{ group.interviews.length }} interview{{ group.interviews.length === 1 ? '' : 's' }}</span>
                            <span><span class="material-symbols-outlined" aria-hidden="true">task_alt</span>{{ group.upcomingCount }} upcoming / {{ group.pastCount }} past</span>
                          </p>
                        </div>
                      </div>
                      <a class="btn secondary" [routerLink]="candidateRoute('applications', group.application.jobApplicationId, 'status')">
                        View timeline
                      </a>
                    </header>

                    <div class="candidate-interview-event-list">
                      @for (card of group.interviews; track card.application.jobApplicationId + card.event.occurredAt + card.event.title) {
                        <div class="candidate-interview-event" [class.upcoming]="card.isUpcoming">
                          <span class="material-symbols-outlined" aria-hidden="true">{{ card.isUpcoming ? 'event' : 'event_available' }}</span>
                          <div>
                            <div class="candidate-interview-event-title">
                              <span class="candidate-status-pill">{{ card.isUpcoming ? 'Upcoming' : 'Past' }}</span>
                              <strong>{{ card.event.title }}</strong>
                            </div>
                            <p class="portal-job-meta">
                              <span><span class="material-symbols-outlined" aria-hidden="true">schedule</span>{{ card.event.occurredAt | date: 'medium' }}</span>
                            </p>
                            <small>{{ card.event.description }}</small>
                          </div>
                        </div>
                      }
                    </div>
                  </article>
                }
              }
            </section>
          }

          @default {
            <section class="candidate-panel empty-state">
              <strong>{{ pageTitle() }} is not active in this slice.</strong>
              <p>Published jobs, applications, and application status are live. The remaining candidate views will be wired with the interview slice.</p>
              <a [routerLink]="candidateRoute('jobs')">Browse jobs</a>
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

      .portal-job-title-row {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
        min-width: 0;
      }

      .portal-job-title-row .candidate-status-pill {
        flex: 0 0 auto;
      }

      .portal-job-title-row small {
        color: #334155;
        font-size: 13px;
        line-height: 1.25;
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

      .portal-job-actions {
        min-width: 154px;
      }

      .candidate-interview-group-card {
        display: grid;
        gap: 16px;
      }

      .candidate-interview-group-header {
        align-items: start;
        display: flex;
        gap: 18px;
        justify-content: space-between;
      }

      .candidate-interview-group-header h2 {
        margin: 8px 0 4px;
      }

      .candidate-interview-group-header > a {
        flex: 0 0 auto;
        white-space: nowrap;
      }

      .candidate-interview-event-list {
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 0;
        position: relative;
      }

      .candidate-interview-event {
        align-items: start;
        display: grid;
        gap: 12px;
        grid-template-columns: 34px minmax(0, 1fr);
        padding: 14px 0;
        position: relative;
      }

      .candidate-interview-event + .candidate-interview-event {
        border-top: 1px solid #eef2f7;
      }

      .candidate-interview-event::before,
      .candidate-interview-event::after {
        background: #c7d8ec;
        content: '';
        left: 16px;
        position: absolute;
        width: 2px;
        z-index: 0;
      }

      .candidate-interview-event::before {
        top: 0;
        bottom: calc(100% - 31px);
      }

      .candidate-interview-event::after {
        top: 48px;
        bottom: 0;
      }

      .candidate-interview-event:first-child::before,
      .candidate-interview-event:last-child::after {
        display: none;
      }

      .candidate-interview-event > .material-symbols-outlined {
        align-items: center;
        background: #e8f1ff;
        border-radius: 8px;
        color: #075dad;
        display: inline-flex;
        font-size: 19px;
        height: 34px;
        justify-content: center;
        position: relative;
        width: 34px;
        z-index: 1;
      }

      .candidate-interview-event.upcoming > .material-symbols-outlined {
        background: #e8f7ef;
        color: #147a4b;
      }

      .candidate-interview-event-title {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .candidate-interview-event-title strong {
        font-size: 16px;
      }

      .candidate-interview-event small {
        color: #334155;
        display: block;
        margin-top: 6px;
      }

      .portal-job-actions .btn {
        border-radius: 8px;
        height: 42px;
        justify-content: center;
        padding: 0 16px;
        white-space: nowrap;
        width: 154px;
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

      .recruiter-support-card {
        display: grid;
        gap: 12px;
      }

      .recruiter-support-card .btn.full {
        min-height: 42px;
        width: 100%;
      }

      .recruiter-support-card .btn.full + .btn.full {
        margin-top: 2px;
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

      .candidate-job-detail-page {
        display: grid;
        gap: 18px;
        margin: 0 auto;
        min-width: 0;
        width: min(100%, 1210px);
      }

      .job-detail-breadcrumb {
        align-items: center;
        color: #64748b;
        display: flex;
        flex-wrap: wrap;
        font-size: 14px;
        gap: 6px;
        min-width: 0;
      }

      .job-detail-breadcrumb a,
      .job-detail-breadcrumb strong {
        color: #075dad;
        font-weight: 800;
        text-decoration: none;
      }

      .job-detail-breadcrumb .material-symbols-outlined {
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
      }

      .job-detail-layout {
        align-items: start;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) 320px;
        min-width: 0;
      }

      .job-detail-main,
      .job-detail-sidebar {
        display: grid;
        gap: 16px;
        min-width: 0;
      }

      .job-detail-hero-card {
        align-items: start;
        background: #d9ecff;
        border: 1px solid #b9daf8;
        border-radius: 8px;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) auto;
        min-width: 0;
        padding: 24px;
      }

      .job-detail-hero-copy {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .job-detail-department {
        background: #c7e5ff;
        border-radius: 999px;
        color: #075dad;
        display: inline-flex;
        font-size: 12px;
        font-weight: 900;
        justify-self: start;
        letter-spacing: 0;
        padding: 5px 12px;
      }

      .job-detail-hero-card h1 {
        color: #0f2544;
        font-size: 34px;
        line-height: 1.1;
        margin: 0;
        overflow-wrap: anywhere;
      }

      .job-detail-meta {
        align-items: center;
        color: #35506e;
        display: flex;
        flex-wrap: wrap;
        gap: 12px 18px;
        margin: 0;
      }

      .job-detail-meta > span {
        align-items: center;
        display: inline-flex;
        gap: 6px;
        min-width: 0;
      }

      .job-detail-meta .material-symbols-outlined {
        color: #075dad;
        font-size: 19px;
        line-height: 1;
      }

      .job-detail-skill-row,
      .job-detail-nice-skills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        min-width: 0;
      }

      .job-detail-skill-row span,
      .job-detail-nice-skills span {
        background: #c7e5ff;
        border: 1px solid #b4d8f6;
        border-radius: 999px;
        color: #164a7c;
        display: inline-flex;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.2;
        padding: 6px 11px;
        white-space: nowrap;
      }

      .job-detail-save-button {
        align-items: center;
        background: #0f2544;
        border: 1px solid #0f2544;
        border-radius: 8px;
        color: #fff;
        cursor: pointer;
        display: inline-flex;
        height: 44px;
        justify-content: center;
        padding: 0;
        width: 44px;
      }

      .job-detail-save-button:hover,
      .job-detail-save-button:focus-visible {
        background: #075dad;
        border-color: #075dad;
        outline: none;
      }

      .job-detail-save-button .material-symbols-outlined {
        font-size: 24px;
      }

      .job-detail-content-card {
        display: grid;
        gap: 22px;
        min-width: 0;
        padding: 24px;
      }

      .job-detail-section {
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .job-detail-section h2,
      .job-detail-about h2,
      .job-detail-summary-card h2,
      .job-detail-share-card h2 {
        color: #075dad;
        font-size: 18px;
        margin: 0;
      }

      .job-detail-section p,
      .job-detail-section li,
      .job-detail-about p {
        color: #334963;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .job-detail-section p,
      .job-detail-section ul,
      .job-detail-about p {
        margin: 0;
      }

      .job-detail-section ul {
        display: grid;
        gap: 8px;
        padding-left: 20px;
      }

      .job-detail-about {
        align-items: center;
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
        min-width: 0;
        padding-top: 22px;
      }

      .job-detail-about > div {
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .job-detail-about a {
        color: #075dad;
        font-weight: 800;
      }

      .job-detail-about img {
        aspect-ratio: 16 / 9;
        border-radius: 8px;
        height: auto;
        object-fit: cover;
        width: 100%;
      }

      .job-detail-sidebar {
        position: sticky;
        top: 84px;
      }

      .job-detail-invite-card {
        background: #075dad;
        border-radius: 8px;
        color: #fff;
        display: grid;
        gap: 10px;
        padding: 18px;
      }

      .job-detail-invite-card > .material-symbols-outlined {
        background: rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        font-size: 24px;
        padding: 9px;
        width: max-content;
      }

      .job-detail-invite-card p,
      .job-detail-invite-card small {
        color: rgba(255, 255, 255, 0.84);
        margin: 0;
      }

      .job-detail-invite-card .btn.light {
        background: #fff;
        border-color: #fff;
        color: #075dad;
      }

      .job-detail-summary-card,
      .job-detail-share-card {
        display: grid;
        gap: 16px;
      }

      .job-detail-summary-card dl {
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 12px;
        margin: 0;
        padding-top: 14px;
      }

      .job-detail-summary-card dl > div {
        align-items: start;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }

      .job-detail-summary-card dt {
        color: #64748b;
        font-size: 12px;
        font-weight: 900;
      }

      .job-detail-summary-card dd {
        color: #0f172a;
        font-weight: 800;
        margin: 0;
        text-align: right;
      }

      .job-detail-share-card > div {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .job-detail-share-card button,
      .job-detail-share-card a {
        align-items: center;
        background: #f1f5f9;
        border: 0;
        border-radius: 8px;
        color: #334155;
        cursor: pointer;
        display: inline-flex;
        height: 42px;
        justify-content: center;
        text-decoration: none;
      }

      .job-detail-share-card button:hover,
      .job-detail-share-card a:hover {
        background: #e8f1ff;
        color: #075dad;
      }

      @media (max-width: 900px) {
        .candidate-page {
          padding: 18px;
        }

        .candidate-hero-v2,
        .portal-job-card,
        .portal-application-card,
        .candidate-interview-group-header {
          align-items: stretch;
          display: grid;
        }

        .candidate-interview-group-header > a {
          justify-content: center;
          width: 100%;
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

        .portal-job-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          min-width: 0;
        }

        .portal-job-actions .btn {
          width: 100%;
        }

        .candidate-job-detail-page {
          width: 100%;
        }

        .job-detail-layout,
        .job-detail-about {
          grid-template-columns: 1fr;
        }

        .job-detail-sidebar {
          position: static;
        }
      }

      @media (max-width: 640px) {
        .job-detail-hero-card {
          grid-template-columns: 1fr;
          padding: 18px;
        }

        .job-detail-save-button {
          justify-self: start;
        }

        .job-detail-hero-card h1 {
          font-size: 28px;
        }

        .job-detail-summary-card dl > div {
          grid-template-columns: 1fr;
          gap: 4px;
        }

        .job-detail-summary-card dd {
          text-align: left;
        }
      }
    `,
  ],
})
export class CandidatePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TalentPilotStoreService);
  private readonly auth = inject(AuthService);
  private readonly fileDownloads = inject(FileDownloadService);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: null });
  private readonly routeQueryParams = toSignal(this.route.queryParamMap, { initialValue: null });
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
  readonly portalInvitation = signal<PortalInvitationContext | null>(null);
  readonly portalInvitationError = signal('');
  readonly myApplications = signal<PortalMyApplicationItem[]>([]);
  readonly portalProfile = signal<PortalCandidateProfile | null>(null);
  readonly portalContext = signal<PublicPortalContext | null>(null);
  readonly selectedProfileSkillIds = signal<Set<string>>(new Set());
  readonly profileEditing = signal(false);
  readonly applicationResult = signal<PortalJobApplicationResult | null>(null);
  readonly selectedDocumentFile = signal<File | null>(null);
  readonly profileDocumentUploading = signal(false);
  readonly documentUploadError = signal('');
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly pageId = computed(() => this.routePageId());
  readonly tenantSlug = computed(() => this.routeParams()?.get('tenantSlug') ?? null);
  readonly routeId = computed(() => this.routeParams()?.get('id') ?? null);
  readonly applyJobPostId = computed(() => this.routeParams()?.get('jobId') ?? null);
  readonly routeInviteId = computed(() => this.routeQueryParams()?.get('inviteId') ?? null);
  readonly routeInviteToken = computed(() => this.routeQueryParams()?.get('token') ?? null);
  readonly trackedPortalInvitation = computed(() => {
    const invitation = this.portalInvitation();
    const job = this.jobPost();
    return invitation && job && invitation.jobPostId === job.jobPostId && !invitation.isExpired && !invitation.isRevoked
      ? invitation
      : null;
  });
  readonly jobDetailHasTrackedInvite = computed(() => {
    return this.trackedPortalInvitation() !== null;
  });
  readonly jobDetailVisitedFromInviteLink = computed(() => {
    if (this.jobDetailHasTrackedInvite()) {
      return true;
    }

    const params = this.routeQueryParams();
    const source = params?.get('source')?.toLowerCase() ?? '';
    const invite = params?.get('invite')?.toLowerCase() ?? '';

    return source === 'invite' || invite === 'true' || (params?.has('invite') && invite !== 'false');
  });
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
    interviewAvailabilityStartDate: '',
    interviewAvailabilityEndDate: '',
    universityName: '',
    degreeName: '',
    graduationYear: null,
    coverLetter: '',
  };

  readonly jobFilters: CandidateJobFilters = {
    search: '',
    department: '',
    location: '',
    experience: '',
  };

  readonly myApplicationFilters: CandidateApplicationFilters = {
    status: '',
    dateRange: '30',
    department: '',
  };

  readonly profileForm: CandidateProfileForm = {
    displayName: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    currentDesignation: '',
    currentCompany: '',
    experienceYears: null,
    expectedSalaryAmount: null,
    expectedSalaryCurrency: 'PKR',
    noticePeriodDays: null,
    universityName: '',
    degreeName: '',
    graduationYear: null,
    currentWorkCompany: '',
    currentWorkTitle: '',
  };

  applicationConsentAccepted = false;
  profileSkillSearch = '';

  constructor() {
    effect(() => {
      const key = [
        this.pageId(),
        this.tenantSlug() ?? '',
        this.routeId() ?? '',
        this.applyJobPostId() ?? '',
        this.routeInviteId() ?? '',
        this.routeInviteToken() ?? '',
        this.currentUser()?.id ?? 'anonymous',
      ].join('|');

      if (key === this.lastLoadKey) {
        return;
      }

      this.lastLoadKey = key;
      setTimeout(() => void this.loadCurrentPage(), 0);
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
      case 'profile':
        return 'Profile';
      case 'interviews':
        return 'Interviews';
      case 'application-status':
        return 'Application Status';
      default:
        return `Join the Future of Engineering at ${this.portalContext()?.careerDisplayName ?? 'TKXEL'}`;
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
      case 'profile':
        return 'Create and maintain the profile recruiters use for candidate context.';
      case 'interviews':
        return 'Review upcoming and completed interview timeline events.';
      case 'application-status':
        return 'View the current status of this application.';
      default:
        return this.portalContext()?.companyCity
          ? `Explore open roles from ${this.portalContext()?.careerDisplayName}. Your career path starts here.`
          : "Work with the world's leading brands on cutting-edge software solutions. Your career path starts here.";
    }
  }

  async submitApplication(): Promise<void> {
    const jobPostId = this.applyJobPostId();
    if (!jobPostId) {
      return;
    }

    const existingApplication = this.completedApplicationForJob(jobPostId);
    if (existingApplication) {
      this.clearStatus();
      this.applicationResult.set({
        jobApplicationId: existingApplication.jobApplicationId,
        jobPostId: existingApplication.jobPostId,
        jobRequestId: existingApplication.jobRequestId,
        status: existingApplication.status,
        alreadyApplied: true,
      });
      this.success.set('You already applied to this job. Track the existing application instead.');
      return;
    }

    const availabilityRangeError = this.interviewAvailabilityRangeError();
    if (availabilityRangeError) {
      this.success.set('');
      this.error.set(availabilityRangeError);
      return;
    }

    if (!this.applicationConsentAccepted) {
      this.success.set('');
      this.error.set('Confirm the application consent before submitting.');
      return;
    }

    this.submitting.set(true);
    this.clearStatus();
    try {
      const result = await this.store.applyToPortalJobPost(jobPostId, {
        ...this.cleanApplicationInput(this.applyForm),
        ...this.applicationInviteInput(),
      });
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
      this.removeApplicationDraft(jobPostId);
      await this.loadMyApplications();
    } catch {
      this.error.set('Application could not be submitted. Confirm the post is still published and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  saveApplicationDraft(): void {
    const key = this.applicationDraftKey();
    if (!key || typeof window === 'undefined') {
      this.success.set('');
      this.error.set('Draft could not be saved in this browser session.');
      return;
    }

    try {
      window.sessionStorage.setItem(
        key,
        JSON.stringify({
          applyForm: this.cleanApplicationInput(this.applyForm),
          applicationConsentAccepted: this.applicationConsentAccepted,
          savedAtUtc: new Date().toISOString(),
        }),
      );
      this.clearStatus();
      this.success.set('Draft saved in this browser session.');
    } catch {
      this.success.set('');
      this.error.set('Draft could not be saved in this browser session.');
    }
  }

  scrollToApplicationSection(sectionId: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  applyJobFilters(): void {
    this.jobFilters.search = this.jobFilters.search.trim();
  }

  clearJobFilters(): void {
    this.jobFilters.search = '';
    this.jobFilters.department = '';
    this.jobFilters.location = '';
    this.jobFilters.experience = '';
  }

  visibleJobPosts(): PortalJobPostListItem[] {
    const search = this.jobFilters.search.trim().toLowerCase();
    return this.jobPosts().filter((job) => {
      const searchHaystack = [
        job.title,
        job.companyName,
        job.client,
        job.department,
        job.location,
        ...job.skills.map((skill) => skill.name),
      ]
        .join(' ')
        .toLowerCase();

      return (
        (!search || searchHaystack.includes(search)) &&
        (!this.jobFilters.department || job.department === this.jobFilters.department) &&
        (!this.jobFilters.location || job.location === this.jobFilters.location) &&
        this.matchesExperienceFilter(job)
      );
    });
  }

  applyMyApplicationFilters(): void {
    this.myApplicationFilters.status = this.myApplicationFilters.status.trim();
    this.myApplicationFilters.department = this.myApplicationFilters.department.trim();
  }

  clearMyApplicationFilters(): void {
    this.myApplicationFilters.status = '';
    this.myApplicationFilters.dateRange = 'all';
    this.myApplicationFilters.department = '';
  }

  myApplicationFiltersActive(): boolean {
    return (
      this.myApplicationFilters.status !== '' ||
      this.myApplicationFilters.dateRange !== 'all' ||
      this.myApplicationFilters.department !== ''
    );
  }

  visibleMyApplications(): PortalMyApplicationItem[] {
    const dateCutoff = this.myApplicationDateCutoff();
    return this.myApplications().filter((application) => {
      const appliedAt = Date.parse(application.appliedAt);
      return (
        (!this.myApplicationFilters.status || application.status === this.myApplicationFilters.status) &&
        (!this.myApplicationFilters.department || application.department === this.myApplicationFilters.department) &&
        (!dateCutoff || (!Number.isNaN(appliedAt) && appliedAt >= dateCutoff))
      );
    });
  }

  myApplicationStatusOptions(): string[] {
    return this.uniqueSorted(this.myApplications().map((application) => application.status));
  }

  myApplicationDepartmentOptions(): string[] {
    return this.uniqueSorted(this.myApplications().map((application) => application.department));
  }

  humanReadableStatus(status: string): string {
    return this.humanizeStatus(status);
  }

  myApplicationIsInvited(application: PortalMyApplicationItem): boolean {
    return application.status.toLowerCase().includes('invited');
  }

  myApplicationIsFinal(application: PortalMyApplicationItem): boolean {
    const status = application.status.toLowerCase();
    return this.isDecisionStatus(status) && !this.isHiredAwaitingJoining(status);
  }

  myApplicationIsSuccessfulFinal(application: PortalMyApplicationItem): boolean {
    const status = application.status.toLowerCase();
    return status.includes('joined');
  }

  myApplicationIcon(application: PortalMyApplicationItem): string {
    if (this.myApplicationIsInvited(application)) {
      return 'dynamic_feed';
    }
    if (this.isHiredAwaitingJoining(application.status.toLowerCase())) {
      return 'event_available';
    }
    if (this.myApplicationIsSuccessfulFinal(application)) {
      return 'task_alt';
    }
    if (this.myApplicationIsFinal(application)) {
      return 'inventory_2';
    }
    return 'track_changes';
  }

  myApplicationMeta(application: PortalMyApplicationItem): string {
    return `${application.department} - ${application.location || 'Location pending'} - ${application.companyName}`;
  }

  myApplicationStatusLabel(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (status.includes('interview')) {
      const scheduledInterview = this.latestTimelineEvent(
        application,
        (event) => event.kind === 'Interview' && !this.eventLooksComplete(event),
      );
      return scheduledInterview ? 'Interview Scheduled' : this.humanizeStatus(application.status);
    }

    return this.humanizeStatus(application.status);
  }

  myApplicationStatusClass(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase().replace(/\s+/g, '');
    if (status.includes('interview')) {
      return 'application-status-pill interview';
    }
    if (status.includes('screening') || status.includes('shortlisted')) {
      return 'application-status-pill active';
    }
    if (status.includes('rejected') || status.includes('declined') || status.includes('withdrawn')) {
      return 'application-status-pill rejected';
    }
    if (status.includes('onhold')) {
      return 'application-status-pill hold';
    }
    if (status.includes('joined') || status.includes('hired') || status.includes('offered')) {
      return 'application-status-pill success';
    }
    return 'application-status-pill neutral';
  }

  myApplicationStatusIcon(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (status.includes('interview')) {
      return 'event';
    }
    if (status.includes('rejected') || status.includes('declined') || status.includes('withdrawn')) {
      return 'close';
    }
    if (status.includes('joined') || status.includes('hired') || status.includes('offered')) {
      return 'check';
    }
    return 'radio_button_checked';
  }

  myApplicationDateHeading(application: PortalMyApplicationItem): string {
    if (this.isHiredAwaitingJoining(application.status.toLowerCase())) {
      return 'Joining Date';
    }
    if (this.myApplicationIsSuccessfulFinal(application)) {
      return 'Joined Date';
    }

    return this.myApplicationIsFinal(application) ? 'Date Applied' : 'Last Updated';
  }

  myApplicationDateValue(application: PortalMyApplicationItem): string {
    if (this.isHiredAwaitingJoining(application.status.toLowerCase())) {
      return this.formatDateOnly(application.offerStartDate);
    }
    if (this.myApplicationIsSuccessfulFinal(application)) {
      return this.formatDateOnly(application.finalDecisionAt ?? application.offerStartDate ?? application.appliedAt);
    }

    if (this.myApplicationIsFinal(application)) {
      return this.formatDateOnly(application.appliedAt);
    }

    const latest =
      this.latestTimelineEvent(application, () => true)?.occurredAt ??
      application.finalDecisionAt ??
      application.appliedAt;
    return this.formatDateOnly(latest);
  }

  myApplicationFooterIcon(application: PortalMyApplicationItem): string {
    if (this.myApplicationIsInvited(application)) {
      return 'info';
    }
    if (this.isHiredAwaitingJoining(application.status.toLowerCase())) {
      return 'event_available';
    }
    if (this.myApplicationIsSuccessfulFinal(application)) {
      return 'task_alt';
    }
    if (this.myApplicationIsFinal(application)) {
      return 'archive';
    }
    return 'settings_suggest';
  }

  myApplicationFooterText(application: PortalMyApplicationItem): string {
    if (this.myApplicationIsInvited(application)) {
      return 'Our recruitment team identified your profile as a great match for this role.';
    }
    if (this.isHiredAwaitingJoining(application.status.toLowerCase())) {
      const joiningDate = this.formatDateOnly(application.offerStartDate);
      return joiningDate === 'Date pending'
        ? 'Your offer acceptance is recorded. The recruitment team will confirm joining details.'
        : `Your offer acceptance is recorded. Joining is scheduled for ${joiningDate}.`;
    }
    if (this.myApplicationIsFinal(application)) {
      return application.finalDecisionReason || `This application is currently ${this.humanizeStatus(application.status)}.`;
    }

    const title = this.nextStepTitle(application).replace(/^Next Step:\s*/i, '');
    const date = this.nextStepDate(application);
    return date === 'Recruiter will update this timeline' ? `Next Step: ${title}.` : `Next Step: ${title} on ${date}.`;
  }

  myApplicationsGuideTitle(): string {
    const upcoming = this.candidateInterviewCards().find((card) => card.isUpcoming);
    return upcoming ? 'Career Guide: Nailing the Technical Interview' : 'Career Guide: Stay Ready for Recruiter Updates';
  }

  myApplicationsGuideText(): string {
    const upcoming = this.candidateInterviewCards().find((card) => card.isUpcoming);
    if (upcoming) {
      return `We noticed you have an upcoming ${upcoming.event.title.toLowerCase()}. Check out our latest guide on best practices for ${upcoming.application.jobTitle} challenges.`;
    }

    return 'Keep your profile current and review role details regularly so you can respond quickly when recruiters update an application.';
  }

  jobDepartmentOptions(): string[] {
    return this.uniqueSorted(this.jobPosts().map((job) => job.department));
  }

  jobLocationOptions(): string[] {
    return this.uniqueSorted(this.jobPosts().map((job) => job.location));
  }

  applicationForJob(jobPostId: string): PortalMyApplicationItem | null {
    return this.myApplications().find((application) => application.jobPostId === jobPostId) ?? null;
  }

  completedApplicationForJob(jobPostId: string): PortalMyApplicationItem | null {
    const application = this.applicationForJob(jobPostId);
    return application && !this.myApplicationIsInvited(application) ? application : null;
  }

  jobIsApplied(jobPostId: string): boolean {
    return this.completedApplicationForJob(jobPostId) !== null;
  }

  isCandidateUser(): boolean {
    return this.currentUser()?.roles.includes('Candidate') ?? false;
  }

  candidateDisplayName(): string {
    return this.profileForm.displayName || this.portalProfile()?.displayName || this.currentUser()?.displayName || this.currentUser()?.name || 'Candidate';
  }

  candidateEmail(): string {
    return this.profileForm.email || this.portalProfile()?.email || this.currentUser()?.email || '';
  }

  profileEmailIsVerified(): boolean {
    const profile = this.portalProfile();
    if (!profile || profile.isEmailVerified === false) {
      return false;
    }

    return Boolean(profile?.isEmailVerified || profile?.emailVerifiedAt || profile?.emailVerifiedAtUtc);
  }

  profileEmailVerificationTitle(): string {
    const verifiedAt = this.portalProfile()?.emailVerifiedAtUtc ?? this.portalProfile()?.emailVerifiedAt;
    return verifiedAt ? `Verified on ${this.formatDateOnly(verifiedAt)}` : 'Verification confirmed by Talent Pilot';
  }

  expectedSalaryLabel(): string {
    const salary = this.profileSalaryText();
    return salary === 'Not specified' ? '' : salary;
  }

  minimumInterviewAvailabilityDate(): string {
    return this.toDateInputValue(new Date());
  }

  interviewAvailabilityEndMinDate(): string {
    return this.blankToNull(this.applyForm.interviewAvailabilityStartDate) ?? this.minimumInterviewAvailabilityDate();
  }

  interviewAvailabilityRangeError(): string {
    const startDate = this.blankToNull(this.applyForm.interviewAvailabilityStartDate);
    const endDate = this.blankToNull(this.applyForm.interviewAvailabilityEndDate);

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return 'Choose both interview availability dates.';
    }

    if (startDate && endDate && endDate < startDate) {
      return 'Availability end date must be on or after the start date.';
    }

    return '';
  }

  applicationProfileSectionComplete(): boolean {
    const requiredValues = [
      this.candidateDisplayName(),
      this.candidateEmail(),
      this.applyForm.phone,
      this.applyForm.currentDesignation,
      this.applyForm.currentCompany,
      this.applyForm.experienceYears,
      this.applyForm.universityName,
      this.applyForm.degreeName,
      this.applyForm.graduationYear,
    ];

    return requiredValues.every((value) => this.valueIsFilled(value));
  }

  applicationCvSectionComplete(): boolean {
    return (this.selectedDocumentFile() !== null || this.profileResumeDocument() !== null) && !this.documentUploadError();
  }

  applicationReviewSectionComplete(): boolean {
    return this.applicationConsentAccepted;
  }

  upcomingInterviewCount(): number {
    return this.candidateInterviewCards().filter((card) => card.isUpcoming).length;
  }

  candidateNextStep(): string {
    const nextInterview = this.candidateInterviewCards().find((card) => card.isUpcoming);
    if (nextInterview) {
      return `${nextInterview.event.title} for ${nextInterview.application.jobTitle}`;
    }

    const latestApplication = [...this.myApplications()].sort(
      (left, right) => Date.parse(right.appliedAt) - Date.parse(left.appliedAt),
    )[0];
    if (latestApplication) {
      return this.nextStepTitle(latestApplication).replace(/^Next Step:\s*/i, '');
    }

    return 'Apply to a role to start your hiring journey.';
  }

  profileCompletionPercent(): number {
    const checks = [
      this.profileForm.displayName,
      this.profileForm.email,
      this.profileForm.phone,
      this.profileForm.linkedInUrl,
      this.profileForm.currentDesignation,
      this.profileForm.currentCompany,
      this.profileForm.experienceYears,
      this.profileForm.noticePeriodDays,
      this.profileForm.universityName,
      this.profileForm.degreeName,
      this.profileForm.currentWorkCompany,
      this.selectedProfileSkillIds().size > 0 ? 'skills' : '',
      this.profileResumeName(),
    ];
    const completed = checks.filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
    return Math.round((completed / checks.length) * 100);
  }

  profileCompletionLabel(): string {
    const percent = this.profileCompletionPercent();
    if (percent >= 85) {
      return 'Your profile has enough context for recruiter review and rediscovery.';
    }
    if (percent >= 50) {
      return 'Add skills, education, and current work details to improve candidate context.';
    }
    return 'Start with contact details, current role, education, and core skills.';
  }

  startProfileEdit(): void {
    this.profileEditing.set(true);
  }

  cancelProfileEdit(): void {
    const profile = this.portalProfile();
    if (profile) {
      this.populateProfileForm(profile);
    }

    this.profileEditing.set(false);
    this.clearStatus();
  }

  profileInitials(): string {
    const name = this.profileForm.displayName || this.currentUser()?.name || 'Candidate';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  profileValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined || String(value).trim() === '') {
      return 'Not specified';
    }

    return String(value);
  }

  profileExperienceText(): string {
    const years = this.numberOrNull(this.profileForm.experienceYears);
    if (years === null) {
      return 'Not specified';
    }

    const yearText = years === 1 ? '1 year' : `${years} years`;
    return this.profileForm.noticePeriodDays !== null && this.profileForm.noticePeriodDays !== undefined
      ? `${yearText} - ${this.profileForm.noticePeriodDays} days notice`
      : yearText;
  }

  profileSalaryText(): string {
    const amount = this.numberOrNull(this.profileForm.expectedSalaryAmount);
    if (amount === null) {
      return 'Not specified';
    }

    const currency = this.profileForm.expectedSalaryCurrency?.trim().toUpperCase() || 'PKR';
    return `${currency} ${new Intl.NumberFormat('en').format(amount)}`;
  }

  profileResumeName(): string | null {
    return this.profileResumeDocument()?.fileName ?? null;
  }

  profileResumeDocument(): PortalCandidateProfileDocument | null {
    return this.portalProfile()?.resumeDocument ?? null;
  }

  applicationCvLabel(): string {
    const applicationFile = this.selectedDocumentFile();
    if (applicationFile) {
      return applicationFile.name;
    }

    return this.profileResumeName() ?? 'Upload CV';
  }

  applicationCvHint(): string {
    if (this.selectedDocumentFile()) {
      return 'This application-specific CV will be submitted for the role.';
    }

    if (this.profileResumeDocument()) {
      return 'Using your profile CV. Upload a different DOCX here to override it for this application.';
    }

    return 'Drag and drop or click to browse files.';
  }

  selectedProfileSkills() {
    const selected = this.selectedProfileSkillIds();
    const profileSkills = new Map((this.portalProfile()?.skills ?? []).map((skill) => [skill.skillId, skill]));
    return (this.portalProfile()?.skillOptions ?? [])
      .filter((skill) => selected.has(skill.skillId))
      .map((skill) => {
        const saved = profileSkills.get(skill.skillId);
        return {
          skillId: skill.skillId,
          skillName: skill.skillName,
          skillLevel: saved?.skillLevel ?? 'Intermediate',
        };
      });
  }

  visibleProfileSkillOptions(): PortalCandidateProfileSkillOption[] {
    const search = this.profileSkillSearch.trim().toLowerCase();
    const selected = this.selectedProfileSkillIds();
    return (this.portalProfile()?.skillOptions ?? [])
      .filter((skill) => {
        if (!search) {
          return true;
        }

        return `${skill.skillName} ${skill.category ?? ''}`.toLowerCase().includes(search);
      })
      .sort((left, right) => {
        const leftSelected = selected.has(left.skillId) ? 0 : 1;
        const rightSelected = selected.has(right.skillId) ? 0 : 1;
        if (leftSelected !== rightSelected) {
          return leftSelected - rightSelected;
        }

        return left.skillName.localeCompare(right.skillName);
      })
      .slice(0, 48);
  }

  profileSkillSelected(skillId: string): boolean {
    return this.selectedProfileSkillIds().has(skillId);
  }

  toggleProfileSkill(skillId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedProfileSkillIds());
    if (checked) {
      next.add(skillId);
    } else {
      next.delete(skillId);
    }

    this.selectedProfileSkillIds.set(next);
  }

  async savePortalProfile(): Promise<void> {
    this.submitting.set(true);
    this.clearStatus();
    try {
      const profile = await this.store.updatePortalCandidateProfile(this.buildProfileInput());
      this.populateProfileForm(profile);
      this.profileEditing.set(false);
      this.success.set('Candidate profile saved.');
    } catch {
      this.error.set('Candidate profile could not be saved. Check required fields and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  candidateInterviewCards(): CandidateInterviewCard[] {
    const now = Date.now();
    return this.myApplications()
      .flatMap((application) =>
        (application.timeline ?? [])
          .filter((event) => event.kind === 'Interview' || `${event.title} ${event.description}`.toLowerCase().includes('interview'))
          .map((event) => ({
            application,
            event,
            isUpcoming: Date.parse(event.occurredAt) >= now && !this.eventLooksComplete(event),
          })),
      )
      .sort((left, right) => Date.parse(left.event.occurredAt) - Date.parse(right.event.occurredAt));
  }

  candidateInterviewGroups(): CandidateInterviewGroup[] {
    const groups = new Map<string, CandidateInterviewGroup>();
    for (const card of this.candidateInterviewCards()) {
      const key = card.application.jobApplicationId;
      const existing = groups.get(key);
      if (existing) {
        existing.interviews.push(card);
        existing.upcomingCount += card.isUpcoming ? 1 : 0;
        existing.pastCount += card.isUpcoming ? 0 : 1;
      } else {
        groups.set(key, {
          application: card.application,
          interviews: [card],
          upcomingCount: card.isUpcoming ? 1 : 0,
          pastCount: card.isUpcoming ? 0 : 1,
        });
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        interviews: [...group.interviews].sort((left, right) => Date.parse(left.event.occurredAt) - Date.parse(right.event.occurredAt)),
      }))
      .sort((left, right) => this.compareCandidateInterviewGroups(left, right));
  }

  private compareCandidateInterviewGroups(left: CandidateInterviewGroup, right: CandidateInterviewGroup): number {
    if (left.upcomingCount !== right.upcomingCount) {
      return right.upcomingCount - left.upcomingCount;
    }

    const leftTime = this.candidateInterviewGroupSortTime(left);
    const rightTime = this.candidateInterviewGroupSortTime(right);
    if (left.upcomingCount > 0 || right.upcomingCount > 0) {
      return leftTime - rightTime;
    }

    return rightTime - leftTime;
  }

  private candidateInterviewGroupSortTime(group: CandidateInterviewGroup): number {
    const relevant = group.upcomingCount > 0
      ? group.interviews.filter((card) => card.isUpcoming)
      : group.interviews;
    const times = relevant
      .map((card) => Date.parse(card.event.occurredAt))
      .filter((time) => Number.isFinite(time));

    if (times.length === 0) {
      return 0;
    }

    return group.upcomingCount > 0 ? Math.min(...times) : Math.max(...times);
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

  jobDescriptionText(job: PortalJobPostDetail): string {
    const description = job.description?.trim();
    if (description) {
      return description
        .replace(/^Role Summary\s*/i, '')
        .split(/\s+Responsibilities\s+-?\s+/i)[0]
        .split(/\s+Required Skills\s+-?\s+/i)[0]
        .trim();
    }

    return `${job.companyName} is looking for a ${job.title} to help deliver scalable, high-performance solutions for ${job.client}. This role combines hands-on engineering with collaboration across product, design, and delivery teams.`;
  }

  jobResponsibilities(job: PortalJobPostDetail): string[] {
    return [
      `Design and implement production-grade ${job.title} solutions for ${job.client}.`,
      `Collaborate with cross-functional teams to define architecture, delivery approach, and technical specifications.`,
      'Perform code reviews and champion engineering best practices across the team.',
      `Deploy, maintain, and improve services used by ${job.companyName} customers and stakeholders.`,
    ];
  }

  jobTechnicalRequirements(job: PortalJobPostDetail): string[] {
    const requirements = [
      `${this.experienceLabel(job)} of software development experience aligned to this role.`,
      'Strong problem-solving skills and comfort working in a fast-paced engineering environment.',
    ];

    const topSkills = job.skills.slice(0, 5).map((skill) => skill.name);
    if (topSkills.length > 0) {
      requirements.unshift(`Hands-on experience with ${topSkills.join(', ')}.`);
    }

    return requirements;
  }

  jobNiceToHaveSkills(job: PortalJobPostDetail): string[] {
    const extraSkills = job.skills.slice(4).map((skill) => skill.name);
    const fallbackSkills = job.skills.slice(0, 3).map((skill) => skill.name);
    return (extraSkills.length > 0 ? extraSkills : fallbackSkills).slice(0, 5);
  }

  async copyJobLink(job: PortalJobPostDetail): Promise<void> {
    const link = this.jobDetailUrl(job);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }

      this.clearStatus();
      this.success.set('Job link copied.');
    } catch {
      this.success.set('');
      this.error.set('Job link could not be copied.');
    }
  }

  async shareJob(job: PortalJobPostDetail): Promise<void> {
    const link = this.jobDetailUrl(job);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: job.title,
          text: `${job.companyName} is hiring ${job.title}.`,
          url: link,
        });
        return;
      }

      await this.copyJobLink(job);
    } catch {
      this.success.set('');
      this.error.set('Job link could not be shared.');
    }
  }

  saveJobForLater(job: PortalJobPostDetail): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(
        `talent-pilot.saved-job.${job.jobPostId}`,
        JSON.stringify({ jobPostId: job.jobPostId, title: job.title, savedAtUtc: new Date().toISOString() }),
      );
      this.clearStatus();
      this.success.set('Job saved in this browser session.');
    } catch {
      this.success.set('');
      this.error.set('Job could not be saved in this browser session.');
    }
  }

  jobSavedForLater(jobPostId: string): boolean {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(`talent-pilot.saved-job.${jobPostId}`) !== null;
  }

  jobEmailShareLink(job: PortalJobPostDetail): string {
    const subject = encodeURIComponent(`${job.companyName} role: ${job.title}`);
    const body = encodeURIComponent(`I found this role on Talent Pilot:\n\n${job.title}\n${this.jobDetailUrl(job)}`);
    return `mailto:?subject=${subject}&body=${body}`;
  }

  jobDetailInviteQueryParams(): Record<string, string> | null {
    const inviteId = this.routeInviteId();
    const token = this.routeInviteToken();
    if (this.trackedPortalInvitation() && inviteId && token) {
      return { source: 'invite', inviteId, token };
    }

    return this.jobDetailVisitedFromInviteLink() ? { source: 'invite' } : null;
  }

  jobDetailStartApplicationRoute(job: PortalJobPostDetail): unknown[] | string {
    if (this.isCandidateUser()) {
      return this.candidateRoute('apply', job.jobPostId);
    }

    return this.currentUser() ? '/auth/login' : this.candidateSignupRoute();
  }

  jobDetailStartApplicationQueryParams(job: PortalJobPostDetail): Record<string, string> | null {
    if (this.isCandidateUser()) {
      return this.jobDetailInviteQueryParams();
    }

    const returnUrl = this.candidateApplyReturnUrl(job);
    return this.currentUser()
      ? this.candidateSignInQueryParams(job.jobPostId, returnUrl)
      : this.candidateSignupQueryParams(job.jobPostId, returnUrl);
  }

  jobListStartApplicationRoute(job: PortalJobPostListItem): unknown[] | string {
    if (this.isCandidateUser()) {
      return this.candidateRoute('apply', job.jobPostId);
    }

    return this.currentUser() ? '/auth/login' : this.candidateSignupRoute();
  }

  jobListStartApplicationQueryParams(job: PortalJobPostListItem): Record<string, string> | null {
    if (this.isCandidateUser()) {
      return null;
    }

    const returnUrl = this.candidateApplyReturnUrl(job);
    return this.currentUser()
      ? this.candidateSignInQueryParams(job.jobPostId, returnUrl)
      : this.candidateSignupQueryParams(job.jobPostId, returnUrl);
  }

  jobDetailStartApplicationLabel(candidateLabel: string): string {
    if (this.isCandidateUser()) {
      return candidateLabel;
    }

    return this.currentUser() ? 'Switch account to apply' : 'Create account to apply';
  }

  candidateRoute(...segments: Array<string | null | undefined>): unknown[] {
    const normalizedSegments = segments.filter((segment): segment is string => Boolean(segment));
    const slug = this.tenantSlug() ?? this.portalContext()?.slug ?? null;
    return slug ? ['/candidate', slug, ...normalizedSegments] : ['/candidate', ...normalizedSegments];
  }

  candidateSignupRoute(): unknown[] {
    const slug = this.tenantSlug() ?? this.portalContext()?.slug ?? null;
    return slug ? ['/candidate', slug, 'signup'] : ['/candidate', 'signup'];
  }

  candidateSignupQueryParams(jobPostId: string, returnUrl: string): Record<string, string> {
    const params: Record<string, string> = {
      jobPostId,
      returnUrl,
    };
    const slug = this.tenantSlug() ?? this.portalContext()?.slug;
    if (slug) {
      params['tenantSlug'] = slug;
    }

    return params;
  }

  candidateSignInQueryParams(jobPostId: string, returnUrl: string): Record<string, string> {
    return {
      jobPostId,
      returnUrl,
      switchAccount: 'candidate',
    };
  }

  shortInvitationId(candidateInvitationId: string): string {
    const compact = candidateInvitationId.replaceAll('-', '');
    return compact.length > 8 ? compact.slice(-8).toUpperCase() : candidateInvitationId.toUpperCase();
  }

  onApplicationDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = this.validateResumeFileInput(input);
    this.selectedDocumentFile.set(file);
  }

  async onProfileResumeSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = this.validateResumeFileInput(input);
    if (!file) {
      return;
    }

    this.profileDocumentUploading.set(true);
    try {
      const result = await this.store.uploadPortalCandidateProfileDocument(file, 'Resume');
      this.portalProfile.update((profile) => profile ? { ...profile, resumeDocument: result.document } : profile);
      this.success.set('Resume saved to your candidate profile.');
      this.error.set('');
    } catch {
      this.documentUploadError.set('Resume could not be saved. Keep the file as DOCX and try again.');
    } finally {
      this.profileDocumentUploading.set(false);
      input.value = '';
    }
  }

  async downloadProfileResume(document: PortalCandidateProfileDocument): Promise<void> {
    try {
      const response = await this.store.downloadPortalCandidateProfileDocument(document.candidateProfileDocumentId);
      const blob = response.body;
      if (!blob) {
        throw new Error('The document response was empty.');
      }

      this.fileDownloads.saveBlob(blob, this.fileNameFromContentDisposition(response.headers.get('content-disposition')) ?? document.fileName);
      this.success.set('Resume download started.');
      this.error.set('');
    } catch {
      this.error.set('Resume could not be downloaded.');
    }
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

  private validateResumeFileInput(input: HTMLInputElement): File | null {
    const file = input.files?.[0] ?? null;
    this.documentUploadError.set('');

    if (!file) {
      return null;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      this.documentUploadError.set('Upload a DOCX resume for this MVP.');
      input.value = '';
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.documentUploadError.set('Resume must be 5 MB or smaller.');
      input.value = '';
      return null;
    }

    return file;
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

  documentEvidenceLabel(document: PortalApplicationDocument): string {
    if (document.hasTextEvidence) {
      return 'Text indexed';
    }

    const status = (document.extractionStatus || '').toLowerCase();
    if (status.includes('failed')) {
      return 'Extraction failed';
    }
    if (status.includes('unsupported')) {
      return 'Unsupported';
    }
    if (status.includes('pending')) {
      return 'Pending text';
    }

    return 'Recorded';
  }

  documentEvidenceClass(document: PortalApplicationDocument): string {
    if (document.hasTextEvidence) {
      return 'extracted';
    }

    const status = (document.extractionStatus || '').toLowerCase();
    if (status.includes('failed')) {
      return 'failed';
    }
    if (status.includes('unsupported')) {
      return 'unsupported';
    }
    return 'pending';
  }

  documentEvidenceSummary(document: PortalApplicationDocument): string {
    if (document.hasTextEvidence) {
      const extractedAt = document.extractedAt ? ` on ${new Date(document.extractedAt).toLocaleDateString()}` : '';
      const parser = document.parserVersion ? ` by ${document.parserVersion}` : '';
      return `Text evidence extracted${extractedAt}${parser}.`;
    }

    if (document.extractionError) {
      return `Text extraction issue: ${document.extractionError}`;
    }

    return 'Text evidence will be indexed after DOCX extraction completes.';
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

  timelineEventIcon(event: PortalApplicationTimelineItem, application: PortalMyApplicationItem): string {
    return this.timelineEventLooksRejected(event, application) ? 'close' : this.timelineIcon(event.kind);
  }

  applicationStatusLabel(status: string): string {
    return this.humanizeStatus(status).toUpperCase();
  }

  candidateStatusPillClass(status: string | null | undefined): string {
    return this.statusLooksRejected(status) ? 'candidate-status-pill rejected' : 'candidate-status-pill';
  }

  candidateProgressMessageClass(application: PortalMyApplicationItem): string {
    return this.statusLooksRejected(application.status) ? 'candidate-progress-message rejected' : 'candidate-progress-message';
  }

  statusMessageIcon(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if (this.statusLooksRejected(status)) {
      return 'cancel';
    }
    if (status.includes('joined') || this.isHiredAwaitingJoining(status)) {
      return 'celebration';
    }
    if (status.includes('offered')) {
      return 'event_available';
    }
    if (this.isDecisionStatus(status)) {
      return 'info';
    }
    return 'track_changes';
  }

  statusGreeting(application: PortalMyApplicationItem): string {
    const firstName = this.currentUser()?.displayName?.split(' ')[0] || 'there';
    const status = application.status.toLowerCase();
    if (this.statusLooksRejected(status)) {
      return 'Unfortunately, we have decided not to continue with your application.';
    }
    if (status.includes('joined') || this.isHiredAwaitingJoining(status)) {
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
    if (this.isHiredAwaitingJoining(status)) {
      return application.offerStartDate
        ? `Your offer acceptance is recorded. Joining is scheduled for ${this.formatDateOnly(application.offerStartDate)}.`
        : 'Your offer acceptance is recorded. The recruitment team will confirm joining details.';
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
    const successfulDecision = status.includes('joined') || this.isHiredAwaitingJoining(status);
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

    const steps: ApplicationJourneyStep[] = [
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
        icon: decision && this.statusLooksRejected(status) ? 'close' : decision ? 'task_alt' : 'flag',
        state: successfulDecision ? 'done' : decision ? 'current' : 'upcoming',
        tone: decision && this.statusLooksRejected(status) ? 'rejected' : undefined,
      },
    ];

    if (successfulDecision) {
      const joined = status.includes('joined');
      steps.push({
        label: 'Joining',
        date: application.offerStartDate ?? (joined ? finalDate : null),
        icon: joined ? 'task_alt' : 'event_available',
        state: joined ? 'done' : 'current',
      });
    }

    return steps;
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
    if (this.isHiredAwaitingJoining(status)) {
      return 'Next Step: Joining';
    }
    if (this.isDecisionStatus(status)) {
      return `Final Status: ${this.humanizeStatus(application.status)}`;
    }
    return `Next Step: ${this.humanizeStatus(application.status)}`;
  }

  nextStepDate(application: PortalMyApplicationItem): string {
    const status = application.status.toLowerCase();
    if ((this.isHiredAwaitingJoining(status) || status.includes('joined')) && application.offerStartDate) {
      return this.formatDateOnly(application.offerStartDate);
    }

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
    if (this.isHiredAwaitingJoining(status)) {
      const joiningDate = this.formatDateOnly(application.offerStartDate);
      return joiningDate === 'Date pending'
        ? 'Your offer acceptance is recorded. The recruitment team will confirm your joining details.'
        : `Your offer acceptance is recorded. Please prepare for joining on ${joiningDate}.`;
    }
    if (status.includes('joined')) {
      return application.finalDecisionReason || 'Your joining has been recorded by the hiring team.';
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

  journeyEventClass(event: PortalApplicationTimelineItem, application: PortalMyApplicationItem): string {
    return this.timelineEventLooksRejected(event, application) ? 'journey-event rejected' : 'journey-event';
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

    if (this.isHiredAwaitingJoining(status)) {
      return application.offerStartDate
        ? `Your offer acceptance is recorded and joining is scheduled for ${this.formatDateOnly(application.offerStartDate)}.`
        : 'Your offer acceptance is recorded. The recruitment team will confirm joining details.';
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

  private timelineEventLooksRejected(event: PortalApplicationTimelineItem, application: PortalMyApplicationItem): boolean {
    return (
      event.kind === 'FinalOutcome' &&
      (
        this.statusLooksRejected(event.status) ||
        this.statusLooksRejected(event.title) ||
        this.statusLooksRejected(event.description) ||
        this.statusLooksRejected(application.status)
      )
    );
  }

  private statusLooksRejected(value: string | null | undefined): boolean {
    const normalized = value?.toLowerCase().replace(/\s+/g, '') ?? '';
    return normalized.includes('rejected') || normalized.includes('declined') || normalized.includes('withdrawn');
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

  private isHiredAwaitingJoining(status: string): boolean {
    return status.includes('hired');
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

  private formatDateOnly(value: string | null | undefined): string {
    if (!value) {
      return 'Date pending';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Date pending';
    }

    return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  }

  private myApplicationDateCutoff(): number | null {
    if (this.myApplicationFilters.dateRange === 'all') {
      return null;
    }

    const days = Number(this.myApplicationFilters.dateRange);
    if (!Number.isFinite(days)) {
      return null;
    }

    return Date.now() - days * 86_400_000;
  }

  private matchesExperienceFilter(job: Pick<PortalJobPostListItem, 'experienceMinYears' | 'experienceMaxYears'>): boolean {
    const filter = this.jobFilters.experience;
    if (!filter) {
      return true;
    }

    const jobMin = job.experienceMinYears ?? 0;
    const jobMax = job.experienceMaxYears ?? Number.POSITIVE_INFINITY;
    if (filter === 'flexible') {
      return job.experienceMinYears === null || job.experienceMinYears === undefined;
    }

    const [filterMin, filterMax] =
      filter === '5-plus'
        ? [5, Number.POSITIVE_INFINITY]
        : filter.split('-').map((value) => Number(value));
    return jobMin <= filterMax && jobMax >= filterMin;
  }

  private uniqueSorted(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => !!value?.trim()))].sort((left, right) =>
      left.localeCompare(right),
    );
  }

  private buildProfileInput(): UpdatePortalCandidateProfileInput {
    const selectedSkills = this.selectedProfileSkillIds();
    const selectedSkillInputs = [...selectedSkills].map((skillId, index) => ({
      skillId,
      skillLevel: index < 3 ? 'Advanced' : 'Intermediate',
      yearsExperience: this.numberOrNull(this.profileForm.experienceYears),
      isPrimary: index < 3,
    }));

    return {
      displayName: this.profileForm.displayName.trim(),
      phone: this.blankToNull(this.profileForm.phone),
      linkedInUrl: this.blankToNull(this.profileForm.linkedInUrl),
      currentDesignation: this.blankToNull(this.profileForm.currentDesignation),
      currentCompany: this.blankToNull(this.profileForm.currentCompany),
      experienceYears: this.numberOrNull(this.profileForm.experienceYears),
      expectedSalaryAmount: this.numberOrNull(this.profileForm.expectedSalaryAmount),
      expectedSalaryCurrency: this.blankToNull(this.profileForm.expectedSalaryCurrency)?.toUpperCase() ?? null,
      noticePeriodDays: this.numberOrNull(this.profileForm.noticePeriodDays),
      primaryEducation: {
        universityName: this.blankToNull(this.profileForm.universityName),
        degreeName: this.blankToNull(this.profileForm.degreeName),
        graduationYear: this.numberOrNull(this.profileForm.graduationYear),
      },
      currentWorkHistory: {
        companyName: this.blankToNull(this.profileForm.currentWorkCompany),
        title: this.blankToNull(this.profileForm.currentWorkTitle),
      },
      skills: selectedSkillInputs,
    };
  }

  populateProfileForm(profile: PortalCandidateProfile): void {
    this.portalProfile.set(profile);
    this.profileForm.displayName = profile.displayName ?? '';
    this.profileForm.email = profile.email ?? '';
    this.profileForm.phone = profile.phone ?? '';
    this.profileForm.linkedInUrl = profile.linkedInUrl ?? '';
    this.profileForm.currentDesignation = profile.currentDesignation ?? '';
    this.profileForm.currentCompany = profile.currentCompany ?? '';
    this.profileForm.experienceYears = profile.experienceYears ?? null;
    this.profileForm.expectedSalaryAmount = profile.expectedSalaryAmount ?? null;
    this.profileForm.expectedSalaryCurrency = profile.expectedSalaryCurrency ?? 'PKR';
    this.profileForm.noticePeriodDays = profile.noticePeriodDays ?? null;
    this.profileForm.universityName = profile.primaryEducation?.universityName ?? '';
    this.profileForm.degreeName = profile.primaryEducation?.degreeName ?? '';
    this.profileForm.graduationYear = profile.primaryEducation?.graduationYear ?? null;
    this.profileForm.currentWorkCompany = profile.currentWorkHistory?.companyName ?? profile.currentCompany ?? '';
    this.profileForm.currentWorkTitle = profile.currentWorkHistory?.title ?? profile.currentDesignation ?? '';
    this.selectedProfileSkillIds.set(new Set((profile.skills ?? []).map((skill) => skill.skillId)));
  }

  private async loadCurrentPage(): Promise<void> {
    this.loading.set(true);
    this.clearStatus();
    this.applicationResult.set(null);

    try {
      await this.loadPublicPortalContextForPage();
      switch (this.pageId()) {
        case 'jobs':
          await this.loadJobs();
          break;
        case 'job-detail':
          await this.loadJobDetailPage();
          break;
        case 'apply':
          await this.loadApplicationPage();
          break;
        case 'my-applications':
        case 'application-status':
          await this.loadMyApplications();
          break;
        case 'profile':
          await this.loadPortalProfile();
          break;
        case 'interviews':
          await this.loadMyApplications();
          break;
      }
    } catch {
      this.error.set('The requested candidate portal data could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPublicPortalContextForPage(): Promise<void> {
    const jobPostId = this.applyJobPostId() ?? (this.pageId() === 'job-detail' ? this.routeId() : null);
    try {
      this.portalContext.set(await this.store.loadPublicPortalContext({
        tenantSlug: this.tenantSlug(),
        jobPostId,
      }));
    } catch {
      this.portalContext.set(null);
    }
  }

  private async loadJobs(): Promise<void> {
    const resolvedTenantSlug = this.tenantSlug() ?? this.portalContext()?.slug ?? null;
    if (!this.portalContext() || !resolvedTenantSlug) {
      this.jobPosts.set([]);
      this.error.set('Candidate portal tenant could not be resolved.');
      return;
    }

    const result = await this.store.loadPortalJobPosts(resolvedTenantSlug);
    this.jobPosts.set(result.items ?? []);

    if (this.isCandidateUser()) {
      try {
        await Promise.all([this.loadMyApplications(), this.loadPortalProfile()]);
      } catch {
        // The public jobs list should remain usable even if candidate-only context cannot load.
      }
    } else {
      this.myApplications.set([]);
      this.portalProfile.set(null);
    }
  }

  private async loadJobPost(jobPostId: string | null): Promise<void> {
    this.jobPost.set(null);
    if (!jobPostId) {
      return;
    }

    this.jobPost.set(await this.store.loadPortalJobPost(jobPostId));
  }

  private async loadJobDetailPage(): Promise<void> {
    await this.loadJobPost(this.routeId());
    await this.loadTrackedInvitation();
    if (!this.isCandidateUser()) {
      return;
    }

    try {
      await this.loadMyApplications();
    } catch {
      this.myApplications.set([]);
    }
  }

  private async loadMyApplications(): Promise<void> {
    const result = await this.store.loadPortalMyApplications();
    this.myApplications.set(result.items ?? []);
  }

  private async loadPortalProfile(): Promise<void> {
    const profile = await this.store.loadPortalCandidateProfile();
    this.populateProfileForm(profile);
  }

  private async loadApplicationPage(): Promise<void> {
    const jobPostId = this.applyJobPostId();
    await Promise.all([this.loadJobPost(jobPostId), this.loadPortalProfile(), this.loadMyApplications(), this.loadTrackedInvitation()]);
    this.prefillApplicationFormFromProfile();
    this.applicationConsentAccepted = false;
    this.restoreApplicationDraft(jobPostId);
  }

  private async loadTrackedInvitation(): Promise<void> {
    this.portalInvitation.set(null);
    this.portalInvitationError.set('');

    const inviteId = this.routeInviteId();
    const token = this.routeInviteToken();
    if (!inviteId || !token) {
      return;
    }

    try {
      this.portalInvitation.set(await this.store.loadPortalInvitation(inviteId, token));
    } catch {
      this.portalInvitationError.set('Invitation tracking details could not be verified.');
    }
  }

  private prefillApplicationFormFromProfile(): void {
    const profile = this.portalProfile();
    if (!profile) {
      return;
    }

    this.applyForm.phone = this.applyForm.phone || profile.phone || '';
    this.applyForm.linkedInUrl = this.applyForm.linkedInUrl || profile.linkedInUrl || '';
    this.applyForm.currentDesignation =
      this.applyForm.currentDesignation || profile.currentDesignation || profile.currentWorkHistory?.title || '';
    this.applyForm.currentCompany =
      this.applyForm.currentCompany || profile.currentCompany || profile.currentWorkHistory?.companyName || '';
    this.applyForm.experienceYears = this.applyForm.experienceYears ?? profile.experienceYears ?? null;
    this.applyForm.noticePeriodDays = this.applyForm.noticePeriodDays ?? profile.noticePeriodDays ?? null;
    this.applyForm.universityName = this.applyForm.universityName || profile.primaryEducation?.universityName || '';
    this.applyForm.degreeName = this.applyForm.degreeName || profile.primaryEducation?.degreeName || '';
    this.applyForm.graduationYear = this.applyForm.graduationYear ?? profile.primaryEducation?.graduationYear ?? null;
  }

  private restoreApplicationDraft(jobPostId: string | null): void {
    const key = this.applicationDraftKey(jobPostId);
    if (!key || typeof window === 'undefined') {
      return;
    }

    try {
      const rawDraft = window.sessionStorage.getItem(key);
      if (!rawDraft) {
        return;
      }

      const draft = JSON.parse(rawDraft) as {
        applyForm?: PortalApplyToJobPostInput;
        applicationConsentAccepted?: boolean;
      };

      if (draft.applyForm) {
        this.applyForm.phone = draft.applyForm.phone ?? '';
        this.applyForm.linkedInUrl = draft.applyForm.linkedInUrl ?? '';
        this.applyForm.currentDesignation = draft.applyForm.currentDesignation ?? '';
        this.applyForm.currentCompany = draft.applyForm.currentCompany ?? '';
        this.applyForm.experienceYears = draft.applyForm.experienceYears ?? null;
        this.applyForm.noticePeriodDays = draft.applyForm.noticePeriodDays ?? null;
        this.applyForm.interviewAvailabilityStartDate = draft.applyForm.interviewAvailabilityStartDate ?? '';
        this.applyForm.interviewAvailabilityEndDate = draft.applyForm.interviewAvailabilityEndDate ?? '';
        this.applyForm.universityName = draft.applyForm.universityName ?? '';
        this.applyForm.degreeName = draft.applyForm.degreeName ?? '';
        this.applyForm.graduationYear = draft.applyForm.graduationYear ?? null;
        this.applyForm.coverLetter = draft.applyForm.coverLetter ?? '';
      }

      this.applicationConsentAccepted = draft.applicationConsentAccepted ?? false;
    } catch {
      // Ignore a stale browser-session draft and keep the profile-prefilled form.
    }
  }

  private removeApplicationDraft(jobPostId: string): void {
    const key = this.applicationDraftKey(jobPostId);
    if (!key || typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Session draft cleanup should never block the submitted application.
    }
  }

  private applicationDraftKey(jobPostId: string | null = this.applyJobPostId()): string | null {
    const userId = this.currentUser()?.id;
    if (!userId || !jobPostId) {
      return null;
    }

    return `talent-pilot.portal-application.${userId}.${jobPostId}`;
  }

  private jobDetailUrl(job: PortalJobPostDetail): string {
    const slug = this.tenantSlug() ?? this.portalContext()?.slug ?? null;
    const path = slug
      ? `/candidate/${encodeURIComponent(slug)}/jobs/${encodeURIComponent(job.jobPostId)}`
      : `/candidate/jobs/${encodeURIComponent(job.jobPostId)}`;
    if (typeof window === 'undefined') {
      return path;
    }

    return `${window.location.origin}${path}`;
  }

  candidateApplyReturnUrl(job: { jobPostId: string }): string {
    const slug = this.tenantSlug() ?? this.portalContext()?.slug ?? null;
    const path = slug
      ? `/candidate/${encodeURIComponent(slug)}/apply/${encodeURIComponent(job.jobPostId)}`
      : `/candidate/apply/${encodeURIComponent(job.jobPostId)}`;
    const queryParams = this.jobDetailInviteQueryParams();
    if (!queryParams) {
      return path;
    }

    return `${path}?${new URLSearchParams(queryParams).toString()}`;
  }

  private applicationInviteInput(): Pick<PortalApplyToJobPostInput, 'candidateInvitationId' | 'invitationToken'> {
    const invitation = this.trackedPortalInvitation();
    const token = this.routeInviteToken();
    return invitation && token
      ? {
          candidateInvitationId: invitation.candidateInvitationId,
          invitationToken: token,
        }
      : {};
  }

  private cleanApplicationInput(input: PortalApplyToJobPostInput): PortalApplyToJobPostInput {
    return {
      phone: this.blankToNull(input.phone),
      linkedInUrl: this.blankToNull(input.linkedInUrl),
      currentDesignation: this.blankToNull(input.currentDesignation),
      currentCompany: this.blankToNull(input.currentCompany),
      experienceYears: this.numberOrNull(input.experienceYears),
      noticePeriodDays: this.numberOrNull(input.noticePeriodDays),
      interviewAvailabilityStartDate: this.blankToNull(input.interviewAvailabilityStartDate),
      interviewAvailabilityEndDate: this.blankToNull(input.interviewAvailabilityEndDate),
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

  private valueIsFilled(value: string | number | null | undefined): boolean {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  private toDateInputValue(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }

  private clearStatus(): void {
    this.error.set('');
    this.success.set('');
    this.documentUploadError.set('');
  }
}
