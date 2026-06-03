import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HistoricalApplicationDetail, HistoricalInterviewDetail } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-historical-application-detail',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Historical Application</p>
          <h1>{{ detail()?.application?.displayJobTitle ?? 'Application history' }}</h1>
          @if (detail(); as data) {
            <p>{{ data.application.requestCode }} - {{ data.application.client }} - {{ data.application.department }}</p>
          }
        </div>
        <div class="ops-header-actions">
          <button class="btn secondary compact" type="button" (click)="goBack()">Back to sourcing</button>
          @if (detail(); as data) {
            <a
              class="btn secondary compact"
              [routerLink]="candidateProfileLink(data.candidate.candidateId)"
              [queryParams]="{ returnUrl: currentReturnUrl() }"
            >
              Candidate Profile
            </a>
          }
          <a class="btn secondary compact" routerLink="/app/recruitment/queue">Recruitment Queue</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading historical application...</section>
      } @else if (error()) {
        <section class="ops-panel empty-state">
          <strong>{{ error() }}</strong>
          <p>This application may not exist in the current tenant or may require recruiter access.</p>
        </section>
      } @else if (detail(); as data) {
        <section class="historical-application-layout">
          <article class="ops-panel">
            <div class="panel-header">
              <div>
                <h2>{{ data.candidate.displayName }}</h2>
                <p class="muted">{{ data.candidate.email }}</p>
              </div>
              <span class="status-badge info">Candidate: {{ data.candidate.status }}</span>
            </div>

            <dl class="evidence-grid">
              <div>
                <dt>Candidate role</dt>
                <dd>{{ data.candidate.currentDesignation || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Current company</dt>
                <dd>{{ data.candidate.currentCompany || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{{ formatExperience(data.candidate.experienceYears) }}</dd>
              </div>
              <div>
                <dt>Notice period</dt>
                <dd>{{ formatNotice(data.candidate.noticePeriodDays) }}</dd>
              </div>
            </dl>
          </article>

          <article class="ops-panel">
            <div class="panel-header">
              <div>
                <h2>Original Application</h2>
                <p class="muted">Outcome for this previous hiring pipeline.</p>
              </div>
              <span class="status-badge info">Outcome: {{ data.application.status }}</span>
            </div>
            <dl class="evidence-grid">
              <div>
                <dt>Job title</dt>
                <dd>{{ data.application.displayJobTitle }}</dd>
              </div>
              <div>
                <dt>Job post status</dt>
                <dd>{{ data.application.jobPostStatus || 'No linked job post' }}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{{ data.application.sourceLabel }}</dd>
              </div>
              <div>
                <dt>Applied</dt>
                <dd>{{ data.application.appliedAt | date: 'mediumDate' }}</dd>
              </div>
              <div>
                <dt>Final decision</dt>
                <dd>{{ data.application.finalDecisionAt ? (data.application.finalDecisionAt | date: 'mediumDate') : 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Interview result</dt>
                <dd>{{ data.application.interviewsPassed }} of {{ data.application.interviewsTotal }} interviews passed</dd>
              </div>
            </dl>
            <div class="application-outcome-note">
              <strong>{{ outcomeSummary(data) }}</strong>
              <p>
                Interview performance is evidence for rediscovery; the application outcome remains the final historical
                pipeline status.
              </p>
            </div>
            @if (data.application.finalDecisionReason) {
              <p class="field-status">{{ data.application.finalDecisionReason }}</p>
            }
          </article>

          <article class="ops-panel full-span">
            <div class="panel-header">
              <div>
                <h2>Interview Evidence</h2>
                <p class="muted">Read-only feedback from the previous application.</p>
              </div>
              <span class="status-badge info">{{ data.application.interviewPassSummary }}</span>
            </div>

            @if (data.interviews.length === 0) {
              <div class="empty-state">
                <strong>No interview records</strong>
                <p>This application has no scheduled or submitted interview evidence.</p>
              </div>
            } @else {
              <div class="historical-interview-list">
                <div class="historical-interview-header">
                  <span>Round</span>
                  <span>Status</span>
                  <span>Scores</span>
                  <span>Feedback</span>
                </div>
                @for (interview of data.interviews; track interview.interviewId) {
                  <article class="historical-interview-row">
                    <div>
                      <strong>{{ interview.roundName }}</strong>
                      <small>{{ interview.startsAt | date: 'medium' }}</small>
                    </div>
                    <div>
                      <strong>{{ interview.recommendation || interview.status }}</strong>
                      <small>{{ interviewFeedbackStatus(interview) }}</small>
                    </div>
                    <div>
                      <strong>{{ interview.averageScore !== null && interview.averageScore !== undefined ? interview.averageScore + '/5 avg' : 'No score' }}</strong>
                      <small>Tech {{ score(interview.technicalScore) }} - Comm {{ score(interview.communicationScore) }} - Culture {{ score(interview.cultureScore) }}</small>
                    </div>
                    <p>{{ interview.feedbackSummary || 'No written feedback recorded.' }}</p>
                  </article>
                }
              </div>
            }
          </article>
        </section>
      }
    </main>
  `,
})
export class HistoricalApplicationDetailComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly detail = signal<HistoricalApplicationDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const jobApplicationId = this.route.snapshot.paramMap.get('jobApplicationId');
    if (!jobApplicationId) {
      this.error.set('Missing historical application id.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      this.detail.set(await this.store.loadHistoricalApplication(jobApplicationId));
    } catch {
      this.error.set('Historical application could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl || '/app/recruitment/queue');
  }

  currentReturnUrl(): string {
    return this.router.url;
  }

  candidateProfileLink(candidateId: string): string[] {
    return ['/app/recruitment/candidates', candidateId, 'profile'];
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value.toFixed(1)} years`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value} days`;
  }

  score(value?: number | null): string {
    return value === null || value === undefined ? '-' : `${value}/5`;
  }

  outcomeSummary(data: HistoricalApplicationDetail): string {
    return `${data.application.interviewPassSummary}; final outcome was ${data.application.status}.`;
  }

  interviewFeedbackStatus(interview: HistoricalInterviewDetail): string {
    if (interview.submittedAt) {
      return 'Feedback submitted';
    }

    const startsAt = new Date(interview.startsAt).getTime();
    if (Number.isFinite(startsAt) && startsAt <= Date.now()) {
      return 'Feedback pending from interviewer';
    }

    return 'Feedback not due yet';
  }
}
