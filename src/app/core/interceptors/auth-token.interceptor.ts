import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AUTH_ACCESS_TOKEN_KEY } from '../auth.service';
import { StorageService } from '../services/storage.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(StorageService).getString(AUTH_ACCESS_TOKEN_KEY);
  if (!token || request.url.includes('/auth/login') || request.url.includes('/auth/refresh')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
