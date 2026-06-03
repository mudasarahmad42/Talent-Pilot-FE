import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateMeetingEvent, CandidateProfile } from '../../core/models';
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
                <h2>Meeting Events</h2>
                <p class="muted">Interview meeting links, calendar events, and attendees linked to this candidate.</p>
              </div>
              <span class="status-badge info">{{ meetingEvents(data).length }} event{{ meetingEvents(data).length === 1 ? '' : 's' }}</span>
            </div>

            @if (meetingEvents(data).length === 0) {
              <div class="empty-state">
                <strong>No meeting events yet</strong>
                <p>Scheduled interview meetings will appear here with links and participant details.</p>
              </div>
            } @else {
              <div class="candidate-meeting-group-list">
                @for (group of meetingEventGroups(data); track group.jobApplicationId) {
                  <section class="candidate-meeting-group">
                    <header class="candidate-meeting-group-header">
                      <div>
                        <span class="section-label">{{ group.requestCode }}</span>
                        <h3>{{ group.jobTitle }}</h3>
                        <p>{{ group.client }}</p>
                      </div>
                      <div class="candidate-meeting-group-actions">
                        <span class="status-badge info">{{ group.events.length }} round{{ group.events.length === 1 ? '' : 's' }}</span>
                        <a
                          class="table-link-button"
                          [routerLink]="applicationHistoryLink(group.jobApplicationId)"
                          [queryParams]="{ returnUrl: currentReturnUrl() }"
                        >
                          Open application
                        </a>
                      </div>
                    </header>

                    <div class="candidate-meeting-list">
                      @for (meeting of group.events; track meeting.interviewId) {
                        <article class="candidate-meeting-card">
                          <div class="candidate-meeting-heading">
                            <div>
                              <span [class]="meetingStatusBadgeClass(meeting.status)">{{ meeting.status }}</span>
                              <h4>{{ meeting.roundName }}</h4>
                            </div>
                          </div>

                          <dl class="candidate-meeting-meta">
                            <div>
                              <dt>Date and time</dt>
                              <dd>{{ formatMeetingDate(meeting.startsAt) }}</dd>
                            </div>
                            <div>
                              <dt>Duration</dt>
                              <dd>{{ meeting.durationMinutes }} minutes</dd>
                            </div>
                            <div>
                              <dt>Location / notes</dt>
                              <dd>{{ meeting.locationText || 'Not recorded' }}</dd>
                            </div>
                            <div>
                              <dt>Calendar</dt>
                              <dd>{{ meeting.calendarProvider || 'Manual link' }}</dd>
                            </div>
                          </dl>

                          <div class="candidate-meeting-actions">
                            @if (meeting.meetingLink) {
                              <a
                                class="btn secondary compact"
                                [href]="meeting.meetingLink"
                                target="_blank"
                                rel="noopener noreferrer"
                                (click)="openExternalLink($event, meeting.meetingLink)"
                              >
                                Open meeting
                              </a>
                            }
                            @if (meeting.calendarEventHtmlLink) {
                              <a
                                class="btn secondary compact"
                                [href]="meeting.calendarEventHtmlLink"
                                target="_blank"
                                rel="noopener noreferrer"
                                (click)="openExternalLink($event, meeting.calendarEventHtmlLink)"
                              >
                                Open calendar event
                              </a>
                            }
                          </div>

                          <div class="candidate-meeting-participants">
                            <span class="section-label">Participants</span>
                            <div class="candidate-meeting-participant-list">
                              @for (participant of meeting.participants; track participant.email) {
                                <span class="participant-chip">
                                  <strong>{{ participant.displayName }}</strong>
                                  <small>{{ formatParticipantRole(participant.role) }} - {{ participant.email }}</small>
                                </span>
                              }
                            </div>
                          </div>
                        </article>
                      }
                    </div>
                  </section>
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

  openExternalLink(event: MouseEvent, url: string | null | undefined): void {
    if (!url) {
      return;
    }

    event.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  meetingEvents(data: CandidateProfile) {
    return data.meetingEvents ?? [];
  }

  meetingEventGroups(data: CandidateProfile): CandidateMeetingGroup[] {
    const groups = new Map<string, CandidateMeetingGroup>();
    for (const meeting of this.meetingEvents(data)) {
      const key = meeting.jobApplicationId;
      const existing = groups.get(key);
      if (existing) {
        existing.events.push(meeting);
        continue;
      }

      groups.set(key, {
        jobApplicationId: meeting.jobApplicationId,
        requestCode: meeting.requestCode,
        jobTitle: meeting.jobTitle,
        client: meeting.client,
        events: [meeting],
      });
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      events: group.events.sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      ),
    }));
  }

  formatMeetingDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }

  formatParticipantRole(role: string): string {
    return role
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (value) => value.toUpperCase());
  }

  meetingStatusBadgeClass(status: string): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'completed') {
      return 'status-badge status-badge--success';
    }

    if (normalized === 'scheduled') {
      return 'status-badge status-badge--scheduled';
    }

    if (['cancelled', 'noshow'].includes(normalized)) {
      return 'status-badge status-badge--danger';
    }

    if (normalized === 'skipped') {
      return 'status-badge status-badge--hold';
    }

    return 'status-badge status-badge--neutral';
  }

  formatExperience(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value.toFixed(1)} years`;
  }

  formatNotice(value?: number | null): string {
    return value === null || value === undefined ? 'Not recorded' : `${value} days`;
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').replace(/\s+/g, '').toLowerCase();
  }
}

type CandidateMeetingGroup = {
  jobApplicationId: string;
  requestCode: string;
  jobTitle: string;
  client: string;
  events: CandidateMeetingEvent[];
};
