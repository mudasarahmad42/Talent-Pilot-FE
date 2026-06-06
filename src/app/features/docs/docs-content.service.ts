import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { marked } from 'marked';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import { SUPPRESS_API_ERROR_TOAST } from '../../core/interceptors/api-error.interceptor';
import { DocsArticleState, DocsHeading, DocsManifest, DocsModule, DocsPage } from './docs.models';

interface ResolvedDocsSelection {
  module?: DocsModule;
  page?: DocsPage;
  error?: string;
}

interface RenderedMarkdown {
  html: string;
  headings: DocsHeading[];
}

@Injectable({ providedIn: 'root' })
export class DocsContentService {
  private readonly http = inject(HttpClient);
  private readonly manifest$ = this.http
    .get<DocsManifest>('/docs/docs-manifest.json', {
      context: this.suppressErrorToastContext(),
    })
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  loadArticle(moduleId: string | null, pageId: string | null): Observable<DocsArticleState> {
    return this.manifest$.pipe(
      switchMap((manifest) => {
        const selection = this.resolveSelection(manifest, moduleId, pageId);
        if (!selection.module || !selection.page) {
          return of({
            status: 'error' as const,
            message: selection.error ?? 'The requested documentation page could not be found.',
            manifest,
          });
        }

        return this.loadMarkdown(selection.module, selection.page).pipe(
          map((markdown) => {
            const rendered = this.renderMarkdown(markdown);
            return {
              status: 'ready' as const,
              manifest,
              module: selection.module as DocsModule,
              page: selection.page as DocsPage,
              html: rendered.html,
              headings: rendered.headings,
            };
          }),
          catchError(() =>
            of({
              status: 'error' as const,
              message: 'This documentation page could not be loaded. Check that the markdown source file exists.',
              manifest,
              module: selection.module,
              page: selection.page,
            }),
          ),
        );
      }),
      catchError(() =>
        of({
          status: 'error' as const,
          message: 'Product documentation could not be loaded. Check that docs-manifest.json exists.',
        }),
      ),
    );
  }

  resolveSelection(manifest: DocsManifest, moduleId: string | null, pageId: string | null): ResolvedDocsSelection {
    const module =
      manifest.modules.find((item) => item.id === moduleId) ??
      manifest.modules.find((item) => item.id === manifest.defaultModule) ??
      manifest.modules[0];

    if (!module) {
      return { error: 'No documentation modules are configured.' };
    }

    if (moduleId && module.id !== moduleId) {
      return { error: 'The requested documentation module does not exist.' };
    }

    const page = pageId ? module.pages.find((item) => item.id === pageId) : module.pages[0];
    if (!page) {
      return {
        module,
        error: pageId
          ? 'The requested documentation page does not exist in this module.'
          : 'This documentation module does not have any pages yet.',
      };
    }

    return { module, page };
  }

  renderMarkdown(markdown: string): RenderedMarkdown {
    const html = marked.parse(markdown, {
      async: false,
      gfm: true,
    }) as string;

    return this.decorateHeadings(html);
  }

  private loadMarkdown(module: DocsModule, page: DocsPage): Observable<string> {
    return this.http.get(`/docs/${module.basePath}/${page.file}`, {
      context: this.suppressErrorToastContext(),
      responseType: 'text',
    });
  }

  private decorateHeadings(html: string): RenderedMarkdown {
    if (typeof DOMParser === 'undefined') {
      return { html, headings: [] };
    }

    const document = new DOMParser().parseFromString(html, 'text/html');
    const usedIds = new Map<string, number>();
    const headings = Array.from(document.body.querySelectorAll('h2, h3')).map((heading) => {
      const title = heading.textContent?.trim() ?? 'Section';
      const baseId = this.slugify(title);
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

      return {
        id,
        title,
        level: heading.tagName.toLowerCase() === 'h2' ? 2 : 3,
      } satisfies DocsHeading;
    });

    return {
      html: document.body.innerHTML,
      headings,
    };
  }

  private slugify(value: string): string {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return slug || 'section';
  }

  private suppressErrorToastContext(): HttpContext {
    return new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true);
  }
}
