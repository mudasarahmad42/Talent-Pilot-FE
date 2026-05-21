import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        notifications.error(getHttpErrorMessage(error));
      }

      return throwError(() => error);
    }),
  );
};

function getHttpErrorMessage(error: HttpErrorResponse): string {
  if (typeof error.error?.message === 'string') {
    return error.error.message;
  }

  if (error.status === 0) {
    return 'Unable to reach the server. Check the API connection.';
  }

  return `Request failed with status ${error.status}.`;
}
