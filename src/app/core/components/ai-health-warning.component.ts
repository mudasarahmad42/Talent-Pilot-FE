import { Component, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AI_AGENTS_WARNING_MESSAGE, AiHealthService } from '../services/ai-health.service';

@Component({
  selector: 'app-ai-health-warning',
  imports: [MatTooltipModule],
  template: `
    @if (aiHealth.llmUnavailable()) {
      <button
        type="button"
        class="topbar-icon-button ai-health-warning-button"
        [attr.aria-label]="warningMessage"
        [matTooltip]="warningMessage"
        matTooltipPosition="below"
      >
        <span class="material-symbols-outlined" aria-hidden="true">warning</span>
      </button>
    }
  `,
})
export class AiHealthWarningComponent {
  readonly aiHealth = inject(AiHealthService);
  readonly warningMessage = AI_AGENTS_WARNING_MESSAGE;

  constructor() {
    this.aiHealth.ensureLoaded();
  }
}
