import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateProfile } from '../../core/models';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-candidate-profile',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Candidate Profile</p>
          <h1>{{ profile()?.candidate?.displayName ?? 'Candidate' }}</h1>
          @if (profile(); as data) {
            <p>{{ data.candidate.email }} - {{ data.candidate.currentDesignation || 'Designation not recorded' }}</p>
          }
        </div>
        <div class="ops-header-actions">
          <button class="btn secondary compact" type="button" (click)="goBack()">Back to sourcing</button>
          <a class="btn secondary compact" routerLink="/app/recruitment/queue">Recruitment Queue</a>
        </div>
      </header>

      @if (loading()) {
        <section class="ops-panel">Loading candidate profile...</section>
      } @else if (error()) {
        <section class="ops-panel empty-state">
          <strong>{{ error() }}</strong>
          <p>This candidate may not exist in the current tenant or may require recruiter access.</p>
        </section>
      } @else if (profile(); as data) {
        <section class="candidate-profile-layout">
          <article class="ops-panel">
            <div class="panel-header">
              <div>
                <h2>Profile Summary</h2>
                <p class="muted">Recruiter-facing candidate record and historical hiring pipeline context.</p>
              </div>
              <span class="status-badge info">{{ data.candidate.status }}</span>
            </div>
            <dl class="evidence-grid">
              <div>
                <dt>Email</dt>
                <dd>{{ data.candidate.email }}</dd>
              </div>
              <div>
                <dt>Current role</dt>
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
              <div>
                <dt>Applications</dt>
                <dd>{{ data.applications.length }}</dd>
              </div>
            </dl>
          </article>

          <article class="ops-panel">
            <h2>Skills</h2>
            @if (data.skills.length === 0) {
              <p class="muted">No candidate skills are recorded.</p>
            } @else {
              <div class="candidate-skill-list">
                @for (skill of data.skills; track skill.skillId) {
                  <span class="skill-chip">
                    {{ skill.skillName }}
                    @if (skill.yearsExperience !== null && skill.yearsExperience !== undefined) {
                      <small>{{ skill.yearsExperience }} yrs</small>
                    }
                  </span>
                }
              </div>
            }
          </article>

          <article class="ops-panel full-span">
            <div class="panel-header">
              <div>
                <h2>Application History</h2>
                <p class="muted">Every known tenant application, status, and interview pass summary for this candidate.</p>
              </div>
            </div>

            @if (data.applications.length === 0) {
              <div class="empty-state">
                <strong>No applications recorded</strong>
                <p>This candidate has no hiring pipeline history yet.</p>
              </div>
            } @else {
              <div class="candidate-application-list">
                <div class="candidate-application-header">
                  <span>Job</span>
                  <span>Status</span>
                  <span>Interviews</span>
                  <span>Decision</span>
                  <span>Action</span>
                </div>
                @for (application of data.applications; track application.jobApplicationId) {
                  <article class="candidate-application-row">
                    <div>
                      <strong>{{ application.displayJobTitle }}</strong>
                      <small>{{ application.requestCode }} - {{ application.client }} - {{ application.department }}</small>
                    </div>
                    <div>
                      <strong>{{ application.status }}</strong>
                      <small>{{ application.sourceLabel }}</small>
                    </div>
                    <div>
                      <strong>{{ application.interviewPassSummary }}</strong>
                      <small>{{ application.location }}</small>
                    </div>
                    <div>
                      <strong>{{ application.finalDecisionAt ? (application.finalDecisionAt | date: 'mediumDate') : 'Not recorded' }}</strong>
                      <small>{{ application.finalDecisionReason || 'No decision reason recorded' }}</small>
                    </div>
                    <a
                      class="table-link-button"
                      [routerLink]="applicationHistoryLink(application.jobApplicationId)"
                      [queryParams]="{ returnUrl: currentReturnUrl() }"
                    >
                      Open application
                    </a>
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
export class CandidateProfileComponent implements OnInit {
  private readonly store = inject(TalentPilotStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly profile = signal<CandidateProfile | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const candidateId = this.route.snapshot.paramMap.get('candidateId');
    if (!candidateId) {
      this.error.set('Missing candidate id.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    try {
      this.profile.set(await this.store.loadCandidateProfile(candidateId));
    } catch {
      this.error.set('Candidate profile could not be loaded.');
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

  applicationHistoryLink(jobApplicationId: string): string[] {
    return ['/app/recruitment/applications', jobApplicationId, 'history'];
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value.toFixed(1)} years`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value} days`;
  }
}
