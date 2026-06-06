import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  RagAssistantContextType,
  RagCitation,
  RagConversation,
  RagFeedbackRequest,
  RagMessage,
} from '../core/models';
import { TalentPilotStoreService } from '../core/talent-pilot-store.service';

interface RagMessageSegment {
  key: string;
  text: string;
  citation: RagCitation | null;
}

interface RagCitationEvidence {
  applicantScore: number | null;
  confidence: string | null;
  explanation: string | null;
  facts: { label: string; value: string }[];
  rank: string | null;
  skills: string[];
}

@Component({
  selector: 'app-rag-assistant-panel',
  imports: [CommonModule, FormsModule],
  template: `
    @if (floatingLauncher && !mobileOpen()) {
      <button
        class="rag-floating-launcher"
        type="button"
        [attr.aria-label]="launcherLabel"
        (click)="openFloatingPanel()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">smart_toy</span>
      </button>
    }

    <aside
      class="rag-assistant-panel"
      [class.mobile-open]="mobileOpen()"
      [class.collapsed]="collapsed()"
      [class.floating]="floatingLauncher"
      [class.floating-closed]="floatingLauncher && !mobileOpen()"
    >
      <header class="rag-assistant-header">
        <div>
          <p class="eyebrow">{{ eyebrow }}</p>
          <h2>{{ title }}</h2>
          @if (subtitle) {
            <small>{{ subtitle }}</small>
          }
        </div>
        <div class="rag-header-actions">
          <button
            class="rag-header-icon-button rag-collapse-toggle"
            type="button"
            [attr.aria-expanded]="floatingLauncher ? mobileOpen() : !collapsed()"
            [attr.aria-label]="floatingLauncher ? 'Collapse assistant panel' : (collapsed() ? 'Expand assistant panel' : 'Collapse assistant panel')"
            (click)="floatingLauncher ? closeFloatingPanel() : toggleCollapsed()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">{{ floatingLauncher ? 'close' : (collapsed() ? 'unfold_more' : 'unfold_less') }}</span>
          </button>
          @if (!floatingLauncher) {
            <button
              class="rag-header-icon-button rag-mobile-toggle"
              type="button"
              [attr.aria-expanded]="mobileOpen()"
              [attr.aria-label]="mobileOpen() ? 'Close assistant panel' : 'Open assistant panel'"
              (click)="toggleMobileOpen()"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ mobileOpen() ? 'close' : 'smart_toy' }}</span>
            </button>
          }
        </div>
      </header>

      <div #assistantBody class="rag-assistant-body">
        @if (loading()) {
          <div class="rag-state">
            <span class="material-symbols-outlined" aria-hidden="true">progress_activity</span>
            <strong>Loading assistant history</strong>
          </div>
        } @else {
          @if (messages().length === 0) {
            <section class="rag-empty-state">
              <strong>No questions yet</strong>
              <div class="rag-suggestion-list">
                @for (question of suggestedQuestions; track question) {
                  <button type="button" [disabled]="answering()" (click)="send(question)">
                    {{ question }}
                  </button>
                }
              </div>
            </section>
          } @else {
            <section class="rag-message-list" aria-live="polite">
              @for (message of messages(); track message.messageId) {
                <article [class]="'rag-message ' + message.role.toLowerCase()">
                  <div class="rag-message-meta">
                    <span>{{ message.role === 'User' ? 'You' : 'Assistant' }}</span>
                    <time>{{ formatTime(message.createdAtUtc) }}</time>
                  </div>
                  <div class="rag-message-bubble">
                    <p>
                      @for (segment of messageSegments(message); track segment.key) {
                        @if (segment.citation) {
                          @if (segment.citation.sourceRoute) {
                            <button
                              class="rag-inline-reference"
                              type="button"
                              [attr.aria-expanded]="activeCitationKey() === citationKey(segment.citation)"
                              [attr.aria-controls]="citationPreviewId(segment.citation)"
                              [attr.aria-describedby]="activeCitationKey() === citationKey(segment.citation) ? citationPreviewId(segment.citation) : null"
                              (click)="toggleCitationEvidence(segment.citation, $event)"
                            >
                              {{ referenceLabel(segment.citation) }}
                            </button>
                          } @else {
                            <button
                              class="rag-inline-reference"
                              type="button"
                              [attr.aria-expanded]="activeCitationKey() === citationKey(segment.citation)"
                              [attr.aria-controls]="citationPreviewId(segment.citation)"
                              [attr.aria-describedby]="activeCitationKey() === citationKey(segment.citation) ? citationPreviewId(segment.citation) : null"
                              (click)="toggleCitationEvidence(segment.citation, $event)"
                            >
                              {{ referenceLabel(segment.citation) }}
                            </button>
                          }
                        } @else {
                          <span>{{ segment.text }}</span>
                        }
                      }
                    </p>
                    @if (message.errorCode) {
                      <small class="rag-message-error">{{ friendlyMessageError(message) }}</small>
                    }
                  </div>
                  @if (message.role === 'Assistant' && message.citations.length > 0) {
                    <div class="rag-citation-list" aria-label="References">
                      <strong class="rag-citation-heading">References</strong>
                      @for (citation of message.citations; track citation.citationId) {
                        @if (citation.sourceRoute) {
                          <span
                            class="rag-citation-chip-wrap"
                          >
                            <button
                              class="rag-citation-chip"
                              type="button"
                              [attr.aria-expanded]="activeCitationKey() === citationKey(citation)"
                              [attr.aria-controls]="citationPreviewId(citation)"
                              [attr.aria-describedby]="activeCitationKey() === citationKey(citation) ? citationPreviewId(citation) : null"
                              (click)="toggleCitationEvidence(citation, $event)"
                            >
                              <span>{{ referenceLabel(citation) }}</span>
                              {{ citationTitle(citation) }}
                            </button>
                          </span>
                        } @else {
                          <span
                            class="rag-citation-chip-wrap"
                          >
                            <button
                              class="rag-citation-chip"
                              type="button"
                              [attr.aria-expanded]="activeCitationKey() === citationKey(citation)"
                              [attr.aria-controls]="citationPreviewId(citation)"
                              [attr.aria-describedby]="activeCitationKey() === citationKey(citation) ? citationPreviewId(citation) : null"
                              (click)="toggleCitationEvidence(citation, $event)"
                            >
                              <span>{{ referenceLabel(citation) }}</span>
                              {{ citationTitle(citation) }}
                            </button>
                          </span>
                        }
                      }
                      @if (activeCitationFor(message); as activeCitation) {
                        @if (citationEvidence(activeCitation); as evidence) {
                          <aside class="rag-evidence-card" [id]="citationPreviewId(activeCitation)" role="tooltip">
                            <div class="rag-evidence-card-header">
                              <span>Evidence preview</span>
                              <button type="button" aria-label="Hide evidence preview" (click)="hideCitationEvidence()">
                                <span class="material-symbols-outlined" aria-hidden="true">close</span>
                              </button>
                            </div>
                            <h3>{{ citationTitle(activeCitation) }}</h3>
                            <p class="rag-evidence-source">{{ citationSourceLabel(activeCitation) }}</p>

                            <div class="rag-evidence-bars">
                              <div class="rag-evidence-bar-row">
                                <div>
                                  <span>Retrieval relevance</span>
                                  <strong>{{ relevancePercent(activeCitation) }}%</strong>
                                </div>
                                <div class="rag-evidence-bar">
                                  <span [style.width.%]="relevancePercent(activeCitation)"></span>
                                </div>
                              </div>

                              @if (evidence.applicantScore !== null) {
                                <div class="rag-evidence-bar-row score">
                                  <div>
                                    <span>Applicant score</span>
                                    <strong>{{ formatEvidenceScore(evidence.applicantScore) }}</strong>
                                  </div>
                                  <div class="rag-evidence-bar">
                                    <span [style.width.%]="applicantScorePercent(evidence.applicantScore)"></span>
                                  </div>
                                </div>
                              }
                            </div>

                            <dl class="rag-evidence-facts">
                              @for (fact of evidence.facts; track fact.label) {
                                <div>
                                  <dt>{{ fact.label }}</dt>
                                  <dd>{{ fact.value }}</dd>
                                </div>
                              }
                            </dl>

                            @if (evidence.skills.length > 0) {
                              <div class="rag-evidence-skills" aria-label="Evidence skills">
                                @for (skill of evidence.skills; track skill) {
                                  <span>{{ skill }}</span>
                                }
                              </div>
                            }

                            @if (evidence.explanation) {
                              <p class="rag-evidence-summary">{{ evidence.explanation }}</p>
                            }
                            @if (activeCitation.sourceRoute) {
                              <a class="rag-evidence-source-link" [href]="citationSourceHref(activeCitation)" (click)="openCitationSource(activeCitation, $event)">
                                Open source
                              </a>
                            }
                          </aside>
                        }
                      }
                    </div>
                  }
                  @if (message.role === 'Assistant' && !message.errorCode) {
                    <div class="rag-feedback-row" aria-label="Answer feedback">
                      <button type="button" [disabled]="feedbackSavingId() === message.messageId" (click)="submitFeedback(message, 'Helpful')">
                        <span class="material-symbols-outlined" aria-hidden="true">thumb_up</span>
                      </button>
                      <button type="button" [disabled]="feedbackSavingId() === message.messageId" (click)="submitFeedback(message, 'NotHelpful')">
                        <span class="material-symbols-outlined" aria-hidden="true">thumb_down</span>
                      </button>
                    </div>
                  }
                </article>
              }
              @if (answering()) {
                <article class="rag-message assistant pending">
                  <div class="rag-message-meta">
                    <span>Assistant</span>
                  </div>
                  <div class="rag-message-bubble">
                    <p>Answering from retrieved evidence...</p>
                  </div>
                </article>
              }
            </section>
          }
        }

        @if (errorMessage()) {
          <div class="rag-error-state">
            <span class="material-symbols-outlined" aria-hidden="true">error</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (messages().length > 0) {
          <button class="rag-scroll-bottom" type="button" aria-label="Scroll assistant conversation to bottom" (click)="scrollToBottom()">
            <span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        }
      </div>

      <footer class="rag-compose">
        <textarea
          name="ragAssistantMessage"
          rows="3"
          [(ngModel)]="draftText"
          [disabled]="answering() || !contextEntityId"
          [placeholder]="placeholder"
          (keydown.enter)="handleEnter($event)"
        ></textarea>
        <button class="icon-button" type="button" [disabled]="answering() || !canSend()" aria-label="Send assistant question" (click)="send()">
          <span class="material-symbols-outlined" aria-hidden="true">send</span>
        </button>
      </footer>
    </aside>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .rag-assistant-panel {
        background: #ffffff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 132px);
        min-height: 520px;
        overflow: hidden;
        position: sticky;
        top: 96px;
      }

      .rag-floating-launcher {
        align-items: center;
        background: #0b66c3;
        border: 0;
        border-radius: 999px;
        bottom: 24px;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.22);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        height: 58px;
        justify-content: center;
        position: fixed;
        right: 24px;
        width: 58px;
        z-index: 80;
      }

      .rag-floating-launcher:hover,
      .rag-floating-launcher:focus-visible {
        background: #0759ad;
        outline: 3px solid rgba(11, 102, 195, 0.18);
      }

      .rag-floating-launcher .material-symbols-outlined {
        font-size: 28px;
      }

      .rag-assistant-panel.collapsed {
        max-height: none;
        min-height: 0;
      }

      .rag-assistant-panel.floating {
        bottom: 94px;
        max-height: min(680px, calc(100vh - 132px));
        min-height: min(560px, calc(100vh - 132px));
        position: fixed;
        right: 24px;
        top: auto;
        width: min(390px, calc(100vw - 32px));
        z-index: 80;
      }

      .rag-assistant-panel.floating-closed {
        display: none;
      }

      .rag-assistant-header {
        align-items: flex-start;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        padding: 16px;
      }

      .rag-assistant-header h2 {
        color: #0f172a;
        font-size: 16px;
        margin: 2px 0 4px;
      }

      .rag-assistant-header small {
        color: #64748b;
        display: block;
        line-height: 1.35;
      }

      .rag-header-actions {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 8px;
      }

      .rag-header-icon-button {
        align-items: center;
        background: #ffffff;
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        color: #0b66c3;
        cursor: pointer;
        display: inline-flex;
        height: 36px;
        justify-content: center;
        width: 36px;
      }

      .rag-header-icon-button:hover,
      .rag-header-icon-button:focus-visible {
        border-color: #0b66c3;
        outline: 0;
      }

      .rag-mobile-toggle {
        display: none;
      }

      .rag-assistant-body {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        gap: 14px;
        min-height: 0;
        overflow-y: auto;
        padding: 14px;
      }

      .rag-assistant-panel.collapsed .rag-assistant-body,
      .rag-assistant-panel.collapsed .rag-compose {
        display: none;
      }

      .rag-state,
      .rag-empty-state,
      .rag-error-state {
        border-radius: 8px;
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      .rag-state,
      .rag-empty-state {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #475569;
      }

      .rag-error-state {
        align-items: flex-start;
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #9f1239;
        grid-template-columns: 20px minmax(0, 1fr);
      }

      .rag-state .material-symbols-outlined {
        color: #0b66c3;
      }

      .rag-suggestion-list {
        display: grid;
        gap: 8px;
      }

      .rag-suggestion-list button {
        background: #ffffff;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        color: #0f172a;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        line-height: 1.35;
        padding: 10px 12px;
        text-align: left;
      }

      .rag-suggestion-list button:hover,
      .rag-suggestion-list button:focus-visible {
        border-color: #0b66c3;
        outline: 0;
      }

      .rag-suggestion-list button:disabled {
        cursor: wait;
        opacity: 0.64;
      }

      .rag-message-list {
        display: grid;
        gap: 14px;
      }

      .rag-message {
        display: grid;
        gap: 6px;
      }

      .rag-message-meta {
        align-items: center;
        color: #64748b;
        display: flex;
        font-size: 11px;
        font-weight: 800;
        justify-content: space-between;
        text-transform: uppercase;
      }

      .rag-message-bubble {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        line-height: 1.48;
        padding: 11px 12px;
      }

      .rag-message.user .rag-message-bubble {
        background: #eef6ff;
        border-color: #c7ddf5;
      }

      .rag-message.assistant .rag-message-bubble {
        background: #ffffff;
      }

      .rag-message.pending .rag-message-bubble {
        background: #f8fafc;
        color: #64748b;
      }

      .rag-message-bubble p {
        margin: 0;
        overflow-wrap: anywhere;
        white-space: pre-line;
      }

      .rag-inline-reference {
        align-items: center;
        background: #e8f1ff;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        color: #0b66c3;
        display: inline-flex;
        font-size: 11px;
        font-weight: 800;
        font-family: inherit;
        line-height: 1;
        margin: 0 2px;
        padding: 3px 7px;
        text-decoration: none;
        vertical-align: baseline;
        white-space: nowrap;
        cursor: pointer;
      }

      .rag-inline-reference:hover,
      .rag-inline-reference:focus-visible,
      .rag-inline-reference[aria-expanded='true'] {
        border-color: #0b66c3;
        outline: 0;
      }

      .rag-message-error {
        color: #b91c1c;
        display: block;
        margin-top: 8px;
      }

      .rag-citation-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        position: relative;
      }

      .rag-citation-heading {
        color: #64748b;
        flex-basis: 100%;
        font-size: 11px;
        letter-spacing: 0;
        line-height: 1.2;
        text-transform: uppercase;
      }

      .rag-citation-chip {
        align-items: center;
        background: #f8fafc;
        border: 1px solid #dbe3ef;
        border-radius: 999px;
        color: #334155;
        display: inline-flex;
        font-size: 11px;
        font-weight: 800;
        font-family: inherit;
        gap: 5px;
        max-width: 100%;
        min-height: 26px;
        overflow: hidden;
        padding: 0 9px 0 5px;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
      }

      .rag-citation-chip-wrap {
        display: inline-flex;
        max-width: 100%;
      }

      .rag-citation-chip:hover,
      .rag-citation-chip:focus-visible,
      .rag-citation-chip[aria-expanded='true'] {
        border-color: #0b66c3;
        outline: 0;
      }

      .rag-citation-chip span {
        background: #0b66c3;
        border-radius: 999px;
        color: #ffffff;
        flex: 0 0 auto;
        padding: 3px 6px;
      }

      .rag-feedback-row {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }

      .rag-feedback-row button {
        align-items: center;
        background: transparent;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        color: #64748b;
        cursor: pointer;
        display: inline-flex;
        height: 30px;
        justify-content: center;
        width: 34px;
      }

      .rag-feedback-row button:hover,
      .rag-feedback-row button:focus-visible {
        border-color: #0b66c3;
        color: #0b66c3;
        outline: 0;
      }

      .rag-feedback-row .material-symbols-outlined {
        font-size: 17px;
      }

      .rag-scroll-bottom {
        align-items: center;
        align-self: flex-end;
        background: #0b66c3;
        border: 0;
        border-radius: 999px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        height: 34px;
        justify-content: center;
        margin-top: -2px;
        position: sticky;
        bottom: 0;
        width: 34px;
        z-index: 2;
      }

      .rag-scroll-bottom:hover,
      .rag-scroll-bottom:focus-visible {
        background: #0759ad;
        outline: 2px solid rgba(11, 102, 195, 0.18);
      }

      .rag-scroll-bottom .material-symbols-outlined {
        font-size: 22px;
      }

      .rag-compose {
        align-items: end;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1fr) 40px;
        padding: 12px;
      }

      .rag-compose textarea {
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        color: #0f172a;
        font: inherit;
        min-height: 74px;
        padding: 10px 11px;
        resize: vertical;
      }

      .rag-compose textarea:focus {
        border-color: #0b66c3;
        outline: 2px solid rgba(11, 102, 195, 0.12);
      }

      .rag-compose .icon-button {
        height: 40px;
        width: 40px;
      }

      @media (max-width: 980px) {
        .rag-assistant-panel {
          max-height: none;
          min-height: 0;
          position: static;
        }

        .rag-floating-launcher {
          bottom: 18px;
          height: 56px;
          right: 18px;
          width: 56px;
        }

        .rag-assistant-panel.floating {
          bottom: 84px;
          max-height: calc(100vh - 112px);
          min-height: 0;
          position: fixed;
          right: 18px;
          width: min(390px, calc(100vw - 36px));
        }

        .rag-mobile-toggle {
          display: inline-flex;
        }

        .rag-assistant-panel:not(.floating) .rag-collapse-toggle {
          display: none;
        }

        .rag-assistant-body,
        .rag-compose,
        .rag-assistant-panel.collapsed .rag-assistant-body,
        .rag-assistant-panel.collapsed .rag-compose {
          display: none;
        }

        .rag-assistant-panel.mobile-open .rag-assistant-body {
          display: flex;
          max-height: 520px;
        }

        .rag-assistant-panel.mobile-open .rag-compose {
          display: grid;
        }

        .rag-assistant-panel.collapsed.mobile-open .rag-assistant-body,
        .rag-assistant-panel.collapsed.mobile-open .rag-compose {
          display: none;
        }
      }

      @media (max-width: 640px) {
        .rag-assistant-panel.floating {
          right: 16px;
          width: calc(100vw - 32px);
        }
      }
    `,
  ],
})
export class RagAssistantPanelComponent implements OnChanges {
  @ViewChild('assistantBody') private assistantBody?: ElementRef<HTMLElement>;

  @Input({ required: true }) contextType!: RagAssistantContextType;
  @Input({ required: true }) contextEntityId!: string;
  @Input() focusEntityId: string | null = null;
  @Input() title = 'AI Assistant';
  @Input() subtitle = '';
  @Input() eyebrow = 'Evidence-backed';
  @Input() placeholder = 'Ask a question...';
  @Input() suggestedQuestions: string[] = [];
  @Input() floatingLauncher = false;
  @Input() launcherLabel = 'Open assistant';

  private readonly store = inject(TalentPilotStoreService);
  private readonly router = inject(Router);
  readonly conversation = signal<RagConversation | null>(null);
  readonly loading = signal(false);
  readonly answering = signal(false);
  readonly errorMessage = signal('');
  readonly feedbackSavingId = signal<string | null>(null);
  readonly localMessages = signal<RagMessage[]>([]);
  readonly mobileOpen = signal(false);
  readonly collapsed = signal(false);
  readonly activeCitationKey = signal<string | null>(null);
  readonly messages = computed(() => [...(this.conversation()?.messages ?? []), ...this.localMessages()]);

  draftText = '';
  private contextKey = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['contextType'] && !changes['contextEntityId'] && !changes['focusEntityId']) {
      return;
    }

    const nextKey = `${this.contextType}|${this.contextEntityId}|${this.focusEntityId ?? ''}`;
    if (!this.contextType || !this.contextEntityId || nextKey === this.contextKey) {
      return;
    }

    this.contextKey = nextKey;
    this.localMessages.set([]);
    this.draftText = '';
    void this.loadConversation();
  }

  canSend(): boolean {
    return !!this.contextType && !!this.contextEntityId && this.draftText.trim().length > 0;
  }

  toggleMobileOpen(): void {
    const nextValue = !this.mobileOpen();
    this.mobileOpen.set(nextValue);
    if (nextValue) {
      this.collapsed.set(false);
      this.scheduleScrollToBottom();
    }
  }

  openFloatingPanel(): void {
    this.mobileOpen.set(true);
    this.collapsed.set(false);
    this.scheduleScrollToBottom('auto');
  }

  closeFloatingPanel(): void {
    this.mobileOpen.set(false);
    this.collapsed.set(false);
  }

  toggleCollapsed(): void {
    const nextValue = !this.collapsed();
    this.collapsed.set(nextValue);
    if (!nextValue) {
      this.scheduleScrollToBottom();
    }
  }

  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const body = this.assistantBody?.nativeElement;
    if (!body) {
      return;
    }

    if (typeof body.scrollTo === 'function') {
      body.scrollTo({ top: body.scrollHeight, behavior });
      return;
    }

    body.scrollTop = body.scrollHeight;
  }

  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    void this.send();
  }

  async send(question?: string): Promise<void> {
    const message = (question ?? this.draftText).trim();
    if (!message || !this.contextType || !this.contextEntityId || this.answering()) {
      return;
    }

    this.answering.set(true);
    this.errorMessage.set('');
    this.collapsed.set(false);
    this.mobileOpen.set(true);
    const conversationId = this.conversation()?.conversationId ?? null;
    const localUserMessage = this.createLocalMessage('User', message);
    this.localMessages.set([localUserMessage]);
    this.draftText = '';
    this.scheduleScrollToBottom();

    try {
      const response = await this.store.sendAssistantMessage({
        contextType: this.contextType,
        contextEntityId: this.contextEntityId,
        focusEntityId: this.focusEntityId || null,
        conversationId,
        message,
      });
      this.localMessages.set([]);
      this.conversation.set(await this.store.loadAssistantConversationById(response.conversationId));
      this.scheduleScrollToBottom();
    } catch (error) {
      const friendlyError = this.toErrorMessage(error);
      this.errorMessage.set(friendlyError);
      const reloaded = await this.reloadConversationAfterFailure(conversationId);
      if (!reloaded) {
        this.localMessages.set([
          localUserMessage,
          this.createLocalMessage('Assistant', friendlyError, this.toErrorCode(error) ?? 'ai_assistant.request_failed'),
        ]);
        this.scheduleScrollToBottom();
      }
    } finally {
      this.answering.set(false);
    }
  }

  async submitFeedback(message: RagMessage, rating: RagFeedbackRequest['rating']): Promise<void> {
    this.feedbackSavingId.set(message.messageId);
    this.errorMessage.set('');
    try {
      await this.store.submitAssistantFeedback(message.messageId, { rating });
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error));
    } finally {
      this.feedbackSavingId.set(null);
    }
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  messageSegments(message: RagMessage): RagMessageSegment[] {
    const content = this.displayMessageContent(message);
    if (!content) {
      return [{ key: `${message.messageId}-empty`, text: '', citation: null }];
    }

    const citationsByLabel = new Map(
      message.citations.map((citation) => [citation.label.toUpperCase(), citation]),
    );
    const segments: RagMessageSegment[] = [];
    const citationPattern = /\[(C\d+(?:\/C?\d+)*)\]|\b(C\d+(?:\/C?\d+)*)\b/gi;
    let cursor = 0;
    let segmentIndex = 0;

    for (const match of content.matchAll(citationPattern)) {
      const matchIndex = match.index ?? 0;
      if (matchIndex > cursor) {
        segments.push({
          key: `${message.messageId}-${segmentIndex++}`,
          text: content.slice(cursor, matchIndex),
          citation: null,
        });
      }

      const matchedLabel = (match[1] ?? match[2] ?? '').split('/')[0].toUpperCase();
      const citation = citationsByLabel.get(matchedLabel);
      if (citation) {
        segments.push({
          key: `${message.messageId}-${segmentIndex++}`,
          text: '',
          citation,
        });
      }

      cursor = matchIndex + match[0].length;
    }

    if (cursor < content.length) {
      segments.push({
        key: `${message.messageId}-${segmentIndex++}`,
        text: content.slice(cursor),
        citation: null,
      });
    }

    return segments.length > 0 ? segments : [{ key: `${message.messageId}-text`, text: content, citation: null }];
  }

  displayMessageContent(message: RagMessage): string {
    if (message.role !== 'Assistant') {
      return message.content;
    }

    return message.content
      .replace(/^\s*This question is in scope for the [^.]+ context\.\s*/i, '')
      .replace(/^\s*The user's latest question\s+"[^"]+"\s+is in-?scope for this context\.\s*/i, '')
      .replace(/\b(\d+)\.0000\b/g, '$1')
      .trim();
  }

  referenceLabel(citation: RagCitation): string {
    const number = citation.label.replace(/^C/i, '');
    return `Reference ${number}`;
  }

  citationTitle(citation: RagCitation): string {
    const title = citation.sourceTitle.trim();
    if (/^Unknown applicant ranking rationale$/i.test(title)) {
      return 'Applicant ranking rationale';
    }

    return title.replace(/^Unknown applicant\b/i, 'Applicant');
  }

  citationEvidenceText(citation: RagCitation): string {
    return citation.excerpt.replace(/\bUnknown applicant\b/gi, 'the applicant');
  }

  citationKey(citation: RagCitation): string {
    return citation.citationId || `${citation.label}-${citation.sourceEntityId}`;
  }

  citationPreviewId(citation: RagCitation): string {
    return `rag-evidence-${this.citationKey(citation)}`;
  }

  showCitationEvidence(citation: RagCitation): void {
    this.activeCitationKey.set(this.citationKey(citation));
  }

  toggleCitationEvidence(citation: RagCitation, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const key = this.citationKey(citation);
    this.activeCitationKey.set(this.activeCitationKey() === key ? null : key);
  }

  hideCitationEvidence(): void {
    this.activeCitationKey.set(null);
  }

  citationSourceHref(citation: RagCitation): string {
    return this.withCitationFragment(citation.sourceRoute ?? '', citation);
  }

  openCitationSource(citation: RagCitation, event?: Event): void {
    if (!citation.sourceRoute) {
      return;
    }

    event?.preventDefault();
    event?.stopPropagation();

    const fragment = this.citationSourceFragment(citation);
    const targetUrl = this.withCitationFragment(citation.sourceRoute, citation);
    this.hideCitationEvidence();
    if (this.floatingLauncher) {
      this.closeFloatingPanel();
    }

    void this.router.navigateByUrl(targetUrl).then(() => {
      window.setTimeout(() => this.scrollToSourceFragment(fragment), 80);
    });
  }

  activeCitationFor(message: RagMessage): RagCitation | null {
    const activeKey = this.activeCitationKey();
    if (!activeKey) {
      return null;
    }

    return message.citations.find((citation) => this.citationKey(citation) === activeKey) ?? null;
  }

  citationSourceLabel(citation: RagCitation): string {
    const sourceType = citation.sourceType.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return `${this.referenceLabel(citation)} - ${sourceType}`;
  }

  relevancePercent(citation: RagCitation): number {
    return this.toPercent(citation.score);
  }

  applicantScorePercent(score: number): number {
    return this.toPercent(score > 1 ? score / 100 : score);
  }

  formatEvidenceScore(score: number): string {
    const normalized = Number.isInteger(score) ? score.toString() : score.toFixed(1).replace(/\.0$/, '');
    return score <= 1 ? `${Math.round(score * 100)}%` : `${normalized}%`;
  }

  citationEvidence(citation: RagCitation): RagCitationEvidence {
    const excerpt = this.citationEvidenceText(citation);
    const candidate = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Candidate')) ?? null;
    const email = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Email'));
    const status = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Status'));
    const currentDesignation = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Current designation'));
    const currentCompany = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Current company'));
    const experience = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Experience'));
    const notice = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Notice'));
    const applicationStatus = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Application status'));
    const source = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Source'));
    const sourceDetail = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Source detail'));
    const coverLetter = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Cover letter'));
    const rank = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Rank')) ?? null;
    const confidence = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Confidence')) ?? null;
    const scoreValue = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Score'));
    const applicantScore = scoreValue ? Number.parseFloat(scoreValue.replace('%', '')) : Number.NaN;
    const matchedSkills = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Matched skills'));
    const skills = this.splitEvidenceList(matchedSkills);
    const facts = this.evidenceFacts([
      ['Rank', rank],
      ['Confidence', confidence],
      ['Candidate', candidate && candidate.toLowerCase() !== 'the applicant' ? candidate : null],
      ['Email', email],
      ['Status', status],
      ['Role', currentDesignation],
      ['Company', currentCompany],
      ['Experience', experience],
      ['Notice', notice],
      ['Application', applicationStatus],
      ['Source', source],
      ['Detail', sourceDetail],
    ]);
    const explanation = this.cleanEvidenceValue(this.extractCitationField(excerpt, 'Explanation'))
      ?? coverLetter;

    return {
      applicantScore: Number.isFinite(applicantScore) ? applicantScore : null,
      confidence,
      explanation: explanation ? this.truncateEvidenceText(explanation, 220) : null,
      facts,
      rank,
      skills,
    };
  }

  friendlyMessageError(message: RagMessage): string {
    if (message.errorCode === 'ai_assistant.no_evidence') {
      return 'No supporting evidence was found for that question.';
    }

    if (message.errorCode === 'ai_assistant.runtime_unavailable') {
      return 'The configured AI runtime is unavailable.';
    }

    return message.errorMessage || 'The assistant could not complete this answer.';
  }

  private async loadConversation(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      this.conversation.set(await this.store.loadAssistantConversation(
        this.contextType,
        this.contextEntityId,
        this.focusEntityId || null,
      ));
      this.localMessages.set([]);
      this.scheduleScrollToBottom('auto');
    } catch (error) {
      this.conversation.set(null);
      this.errorMessage.set(this.toErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadConversationAfterFailure(conversationId: string | null): Promise<boolean> {
    try {
      const conversation = conversationId
        ? await this.store.loadAssistantConversationById(conversationId)
        : await this.store.loadAssistantConversation(this.contextType, this.contextEntityId, this.focusEntityId || null);
      if (!conversation) {
        return false;
      }

      this.conversation.set(conversation);
      this.localMessages.set([]);
      this.scheduleScrollToBottom();
      return true;
    } catch {
      // The visible error already explains the failed assistant request.
      return false;
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const code = typeof error.error?.error === 'string' ? error.error.error : '';
      const message = typeof error.error?.message === 'string' ? error.error.message : '';
      if (code === 'ai_assistant.runtime_unavailable') {
        return 'AI runtime unavailable. Start the configured Ollama model and try again.';
      }

      if (code === 'ai_assistant.no_evidence') {
        return 'No relevant evidence was found for this context yet.';
      }

      if (message) {
        return message;
      }
    }

    return 'The assistant could not complete the request.';
  }

  private toErrorCode(error: unknown): string | null {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }

    return null;
  }

  private scheduleScrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    window.setTimeout(() => this.scrollToBottom(behavior), 0);
  }

  private toPercent(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value * 100)));
  }

  private evidenceFacts(entries: Array<[string, string | null]>): { label: string; value: string }[] {
    const seen = new Set<string>();
    return entries
      .filter((entry): entry is [string, string] => !!entry[1])
      .filter(([label]) => {
        const normalizedLabel = label.toLowerCase();
        if (seen.has(normalizedLabel)) {
          return false;
        }

        seen.add(normalizedLabel);
        return true;
      })
      .slice(0, 12)
      .map(([label, value]) => ({ label, value }));
  }

  private extractCitationField(text: string, fieldName: string): string | null {
    const fieldNames = [
      'Candidate',
      'Rank',
      'Score',
      'Confidence',
      'Explanation',
      'Strengths',
      'Gaps',
      'Matched skills',
      'Missing skills',
      'Document evidence',
      'Historical evidence',
      'Semantic similarity',
      'Email',
      'Status',
      'Current designation',
      'Current company',
      'Experience',
      'Notice',
      'Application status',
      'Source',
      'Source detail',
      'Cover letter',
      'Interview progress',
    ];
    const nextFields = fieldNames
      .filter((field) => field !== fieldName)
      .map((field) => field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const fieldPattern = new RegExp(`${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.*?)(?=\\s+(?:${nextFields}):|$)`, 'i');
    return fieldPattern.exec(text)?.[1] ?? null;
  }

  private cleanEvidenceValue(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const cleaned = value
      .replace(/\b(\d+)\.0000\b/g, '$1')
      .replace(/\s+(Cover let|Cover letter|Interview progress|Matched skills|Missing skills|Document evidence|Historical evidence)\.{0,3}$/i, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+\.\.\.$/, '...')
      .trim();

    if (!cleaned || /^not recorded$/i.test(cleaned) || /^\.+$/.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  private splitEvidenceList(value: string | null): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && !/^not recorded$/i.test(item) && !/^\.+$/.test(item))
      .slice(0, 6);
  }

  private truncateEvidenceText(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3).trim()}...`;
  }

  private withCitationFragment(route: string, citation: RagCitation): string {
    if (!route || route.includes('#')) {
      return route;
    }

    const fragment = this.citationSourceFragment(citation);
    return fragment ? `${route}#${fragment}` : route;
  }

  private citationSourceFragment(citation: RagCitation): string | null {
    if (this.contextType === 'RecruiterCandidateFit') {
      const sourceType = citation.sourceType.toLowerCase();
      if (
        sourceType.includes('application') ||
        sourceType.includes('applicant') ||
        sourceType.includes('interview')
      ) {
        return 'applications';
      }

      if (sourceType.includes('jobpost')) {
        return 'job-post';
      }

      if (sourceType.includes('jobrequest')) {
        return 'request-review';
      }
    }

    return null;
  }

  private scrollToSourceFragment(fragment: string | null): void {
    if (!fragment) {
      return;
    }

    const target = document.getElementById(`rag-source-${fragment}`) ?? document.getElementById(fragment);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('rag-source-highlight');
    window.setTimeout(() => target.classList.remove('rag-source-highlight'), 1400);
  }

  private createLocalMessage(role: RagMessage['role'], content: string, errorCode: string | null = null): RagMessage {
    return {
      messageId: `local-${role.toLowerCase()}-${Date.now()}`,
      role,
      content,
      model: null,
      agentRunId: null,
      promptVersion: null,
      errorCode,
      errorMessage: errorCode ? content : null,
      createdAtUtc: new Date().toISOString(),
      citations: [],
    };
  }
}
