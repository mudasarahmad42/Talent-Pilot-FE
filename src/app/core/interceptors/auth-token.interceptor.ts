import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth.service';

const AUTH_REFRESH_RETRY = new HttpContextToken<boolean>(() => false);

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (isAuthEndpoint(request.url)) {
    return next(request);
  }

  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  if (!token) {
    return next(request);
  }

  return next(withBearerToken(request, token)).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        request.context.get(AUTH_REFRESH_RETRY)
      ) {
        return throwError(() => error);
      }

      return auth.refreshSession().pipe(
        switchMap((newToken) =>
          next(
            withBearerToken(
              request.clone({
                context: request.context.set(AUTH_REFRESH_RETRY, true),
              }),
              newToken,
            ),
          ),
        ),
        catchError((refreshError: unknown) => {
          auth.handleAuthExpired();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function withBearerToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/login-options') || url.includes('/auth/refresh');
}
