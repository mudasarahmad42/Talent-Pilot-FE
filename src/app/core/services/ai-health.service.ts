import { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { SUPPRESS_API_ERROR_TOAST } from '../interceptors/api-error.interceptor';
import { ApiService } from './api.service';

export const AI_AGENTS_WARNING_MESSAGE =
  'AI agents are currently unavailable due to a temporary service issue. Our team is working to restore access as soon as possible.';

interface AiHealthStatusResponse {
  available: boolean;
  status: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AiHealthService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly llmStatusSignal = signal<AiHealthStatusResponse | null>(null);
  private loading = false;
  private loaded = false;

  readonly llmUnavailable = computed(() => this.llmStatusSignal()?.available === false);

  ensureLoaded(): void {
    if (this.loading || this.loaded) {
      return;
    }

    if (!this.auth.currentUser()) {
      this.llmStatusSignal.set(null);
      this.loaded = false;
      return;
    }

    this.loading = true;
    void firstValueFrom(
      this.api.get<AiHealthStatusResponse>('ai-health/llm', {
        context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true),
      }),
    )
      .then((status) => {
        this.llmStatusSignal.set(status);
        this.loaded = true;
      })
      .catch(() => {
        this.llmStatusSignal.set({
          available: false,
          status: 'Unavailable',
          message: 'The LLM health check could not be completed.',
        });
        this.loaded = true;
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
