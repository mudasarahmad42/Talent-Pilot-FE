import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigurationService } from './configuration.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly configuration = inject(ConfigurationService);

  get<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.get<TResponse>(this.url(path), options);
  }

  post<TResponse, TBody = unknown>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.post<TResponse>(this.url(path), body, options);
  }

  put<TResponse, TBody = unknown>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.put<TResponse>(this.url(path), body, options);
  }

  patch<TResponse, TBody = unknown>(path: string, body: TBody, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.patch<TResponse>(this.url(path), body, options);
  }

  delete<TResponse>(path: string, options?: ApiRequestOptions): Observable<TResponse> {
    return this.http.delete<TResponse>(this.url(path), options);
  }

  download(path: string): Observable<HttpResponse<Blob>> {
    return this.http.get(this.url(path), {
      observe: 'response',
      responseType: 'blob',
    });
  }

  private url(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.configuration.app.apiBaseUrl}${normalizedPath}`;
  }
}

type ApiRequestOptions = {
  context?: HttpContext;
};
