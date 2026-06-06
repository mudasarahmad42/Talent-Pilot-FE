import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SUPPRESS_API_ERROR_TOAST } from '../interceptors/api-error.interceptor';
import { ApiService } from './api.service';

export interface PublicFeedbackRequest {
  name: string;
  email: string;
  message: string;
  tenantSlug?: string;
  jobPostId?: string;
}

export interface PublicFeedbackResponse {
  provider: string;
  messageId: string;
  submittedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class PublicFeedbackService {
  private readonly api = inject(ApiService);

  submit(input: PublicFeedbackRequest): Observable<PublicFeedbackResponse> {
    return this.api.post<PublicFeedbackResponse, PublicFeedbackRequest>('feedback', input, {
      context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true),
    });
  }
}
