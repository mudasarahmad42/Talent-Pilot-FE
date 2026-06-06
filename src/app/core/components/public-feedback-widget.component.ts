import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import {
  PublicFeedbackRequest,
  PublicFeedbackService,
} from '../services/public-feedback.service';
import { NotificationService } from '../services/notification.service';

interface FeedbackForm {
  name: string;
  email: string;
  message: string;
}

@Component({
  selector: 'app-public-feedback-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button
      type="button"
      class="feedback-fab"
      aria-label="Share feedback"
      (click)="openFeedback()"
      *ngIf="!isOpen"
    >
      <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
      <span>Feedback</span>
    </button>

    <div
      class="feedback-modal-backdrop"
      role="presentation"
      (click)="closeFeedback()"
      *ngIf="isOpen"
    >
      <section
        class="feedback-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        (click)="$event.stopPropagation()"
      >
        <header>
          <div class="feedback-title-row">
            <span class="material-symbols-outlined" aria-hidden="true">rate_review</span>
            <div>
              <p>Product feedback</p>
              <h2 id="feedback-title">Help us improve Talent Pilot</h2>
            </div>
          </div>
          <button
            type="button"
            class="feedback-close"
            aria-label="Close feedback form"
            (click)="closeFeedback()"
            [disabled]="isSubmitting"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <form class="feedback-form" (ngSubmit)="submitFeedback()" novalidate>
          <label>
            <span>Name</span>
            <input
              type="text"
              name="feedbackName"
              [(ngModel)]="form.name"
              autocomplete="name"
              maxlength="120"
              required
            />
          </label>

          <label>
            <span>Email address</span>
            <input
              type="email"
              name="feedbackEmail"
              [(ngModel)]="form.email"
              autocomplete="email"
              maxlength="254"
              required
            />
          </label>

          <label>
            <span>Message</span>
            <textarea
              name="feedbackMessage"
              [(ngModel)]="form.message"
              rows="5"
              maxlength="3000"
              required
            ></textarea>
          </label>

          <p
            class="feedback-status"
            [class.success]="statusTone === 'success'"
            [class.error]="statusTone === 'error'"
            *ngIf="statusMessage"
          >
            <span class="material-symbols-outlined" aria-hidden="true">
              {{ statusTone === 'success' ? 'check_circle' : 'error' }}
            </span>
            {{ statusMessage }}
          </p>

          <footer>
            <button type="button" class="secondary" (click)="closeFeedback()" [disabled]="isSubmitting">
              Cancel
            </button>
            <button type="submit" class="primary" [disabled]="!canSubmit || isSubmitting">
              <span class="material-symbols-outlined" aria-hidden="true">
                {{ isSubmitting ? 'progress_activity' : 'send' }}
              </span>
              {{ isSubmitting ? 'Sending...' : 'Send feedback' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        left: 24px;
        bottom: 24px;
        z-index: 1500;
        font-family: inherit;
        pointer-events: none;
      }

      .feedback-fab,
      .feedback-panel,
      .feedback-modal-backdrop {
        pointer-events: auto;
      }

      .feedback-fab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 48px;
        padding: 0 18px;
        border: 1px solid rgba(10, 102, 194, 0.28);
        border-radius: 999px;
        background: #0a66c2;
        color: #ffffff;
        box-shadow: 0 18px 40px rgba(10, 102, 194, 0.25);
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .feedback-fab:hover,
      .feedback-fab:focus-visible {
        background: #084f99;
        outline: 3px solid rgba(96, 165, 250, 0.34);
        outline-offset: 3px;
      }

      .feedback-fab .material-symbols-outlined,
      .primary .material-symbols-outlined {
        font-size: 20px;
      }

      .feedback-modal-backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.56);
        backdrop-filter: blur(3px);
      }

      .feedback-panel {
        width: min(520px, calc(100vw - 32px));
        max-height: calc(100vh - 48px);
        overflow: auto;
        border: 1px solid #dbe7f5;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
      }

      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 24px 24px 18px;
        border-bottom: 1px solid #e5edf7;
      }

      .feedback-title-row {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .feedback-title-row > .material-symbols-outlined {
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 10px;
        background: #e8f2ff;
        color: #0a66c2;
      }

      .feedback-title-row p,
      .feedback-title-row h2 {
        margin: 0;
      }

      .feedback-title-row p {
        color: #0a66c2;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .feedback-title-row h2 {
        color: #0f172a;
        font-size: 24px;
        line-height: 30px;
      }

      .feedback-close {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border: 1px solid #dbe7f5;
        border-radius: 10px;
        background: #f8fbff;
        color: #334155;
        cursor: pointer;
      }

      .feedback-close:hover,
      .feedback-close:focus-visible {
        border-color: #0a66c2;
        color: #0a66c2;
        outline: none;
      }

      .feedback-form {
        display: grid;
        gap: 16px;
        padding: 22px 24px 24px;
      }

      label {
        display: grid;
        gap: 7px;
        color: #26364b;
        font-weight: 800;
      }

      label span {
        font-size: 13px;
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid #c9d6e6;
        border-radius: 8px;
        background: #ffffff;
        color: #0f172a;
        font: inherit;
        font-weight: 600;
        line-height: 22px;
        padding: 12px 14px;
        resize: vertical;
      }

      textarea {
        min-height: 128px;
      }

      input:focus,
      textarea:focus {
        border-color: #0a66c2;
        box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.14);
        outline: none;
      }

      .feedback-status {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 700;
        line-height: 20px;
      }

      .feedback-status .material-symbols-outlined {
        font-size: 20px;
      }

      .feedback-status.success {
        border: 1px solid #b7ead7;
        background: #ecfdf5;
        color: #047857;
      }

      .feedback-status.error {
        border: 1px solid #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }

      footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 4px;
      }

      footer button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        border-radius: 8px;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      footer button:disabled {
        cursor: not-allowed;
        opacity: 0.62;
      }

      .secondary {
        border: 1px solid #d4dfed;
        background: #ffffff;
        color: #334155;
        padding: 0 18px;
      }

      .primary {
        border: 1px solid #0a66c2;
        background: #0a66c2;
        color: #ffffff;
        padding: 0 20px;
      }

      .primary:not(:disabled):hover,
      .primary:not(:disabled):focus-visible {
        background: #084f99;
        outline: none;
      }

      @media (max-width: 640px) {
        :host {
          left: 16px;
          right: auto;
          bottom: 16px;
        }

        .feedback-fab {
          min-height: 44px;
          padding: 0 14px;
        }

        .feedback-modal-backdrop {
          align-items: end;
          padding: 12px;
        }

        .feedback-panel {
          width: 100%;
          max-height: calc(100vh - 24px);
          border-radius: 14px 14px 10px 10px;
        }

        header,
        .feedback-form {
          padding-left: 18px;
          padding-right: 18px;
        }

        .feedback-title-row h2 {
          font-size: 21px;
          line-height: 27px;
        }

        footer {
          display: grid;
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PublicFeedbackWidgetComponent {
  private readonly feedbackService = inject(PublicFeedbackService);
  private readonly notifications = inject(NotificationService);
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected isOpen = false;
  protected isSubmitting = false;
  protected statusTone: 'success' | 'error' | null = null;
  protected statusMessage = '';
  protected form: FeedbackForm = {
    name: '',
    email: '',
    message: '',
  };

  protected get canSubmit(): boolean {
    return (
      this.form.name.trim().length > 0 &&
      this.emailPattern.test(this.form.email.trim()) &&
      this.form.message.trim().length > 0
    );
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen && !this.isSubmitting) {
      this.closeFeedback();
    }
  }

  protected openFeedback(): void {
    this.statusTone = null;
    this.statusMessage = '';
    this.isOpen = true;
  }

  protected closeFeedback(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isOpen = false;
  }

  protected submitFeedback(): void {
    if (!this.canSubmit || this.isSubmitting) {
      this.statusTone = 'error';
      this.statusMessage = 'Add your name, a valid email address, and a feedback message.';
      return;
    }

    this.isSubmitting = true;
    this.statusTone = null;
    this.statusMessage = '';

    this.feedbackService
      .submit(this.buildRequest())
      .pipe(
        timeout({ first: 20000 }),
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.statusTone = 'success';
          this.statusMessage = 'Thanks, your feedback was sent.';
          this.notifications.success('Thanks for the feedback.');
          this.form = { name: '', email: '', message: '' };
        },
        error: (error: unknown) => {
          this.statusTone = 'error';
          this.statusMessage = getErrorMessage(error);
          this.notifications.error(this.statusMessage);
        },
      });
  }

  private buildRequest(): PublicFeedbackRequest {
    return {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      message: this.form.message.trim(),
      ...this.readRouteContext(),
    };
  }

  private readRouteContext(): Pick<PublicFeedbackRequest, 'tenantSlug' | 'jobPostId'> {
    const segments = window.location.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => safeDecode(segment));
    const context: Pick<PublicFeedbackRequest, 'tenantSlug' | 'jobPostId'> = {};

    if (segments[0]?.toLowerCase() === 'candidate') {
      const candidateReservedSegments = new Set([
        'jobs',
        'apply',
        'signup',
        'invite-registration',
        'confirm-application',
        'profile',
        'my-applications',
        'applications',
        'interviews',
        'reapply-blocked',
      ]);
      const maybeTenantSlug = segments[1];

      if (maybeTenantSlug && !candidateReservedSegments.has(maybeTenantSlug.toLowerCase())) {
        context.tenantSlug = maybeTenantSlug;
      }
    }

    const jobPostId = findJobPostId(segments);
    if (jobPostId) {
      context.jobPostId = jobPostId;
    }

    return context;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function findJobPostId(segments: string[]): string | undefined {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const applyIndex = segments.findIndex((segment) => segment.toLowerCase() === 'apply');
  if (applyIndex >= 0 && uuidPattern.test(segments[applyIndex + 1] ?? '')) {
    return segments[applyIndex + 1];
  }

  const jobsIndex = segments.findIndex((segment) => segment.toLowerCase() === 'jobs');
  if (jobsIndex >= 0 && uuidPattern.test(segments[jobsIndex + 1] ?? '')) {
    return segments[jobsIndex + 1];
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
    return error.error.message;
  }

  return 'Feedback could not be sent right now. Please try again shortly.';
}
