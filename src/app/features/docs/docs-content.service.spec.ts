import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DocsContentService } from './docs-content.service';
import { DocsArticleState, DocsManifest } from './docs.models';

describe('DocsContentService', () => {
  let service: DocsContentService;
  let http: HttpTestingController;

  const manifest: DocsManifest = {
    defaultModule: 'talent-pilot-app',
    modules: [
      {
        id: 'admin-center',
        label: 'Admin Center',
        description: 'Admin docs',
        basePath: 'admin-center',
        pages: [
          {
            id: 'overview',
            label: 'Admin Center Documentation',
            file: 'overview.md',
            summary: 'Admin overview',
          },
        ],
      },
      {
        id: 'candidate-portal',
        label: 'Candidate Portal',
        description: 'Candidate docs',
        basePath: 'candidate-portal',
        pages: [
          {
            id: 'profile-documents',
            label: 'Profile and Documents',
            file: 'profile-documents.md',
            summary: 'Profile docs',
          },
        ],
      },
      {
        id: 'talent-pilot-app',
        label: 'Talent Pilot App',
        description: 'Internal app docs',
        basePath: 'talent-pilot-app',
        pages: [
          {
            id: 'overview',
            label: 'Talent Pilot App Documentation',
            file: 'overview.md',
            summary: 'App overview',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DocsContentService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(DocsContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the manifest and default page', () => {
    let result: DocsArticleState | undefined;

    service.loadArticle(null, null).subscribe((state) => {
      result = state;
    });

    http.expectOne('/docs/docs-manifest.json').flush(manifest);
    http.expectOne('/docs/talent-pilot-app/overview.md').flush('# Talent Pilot App Documentation\n\n## Functions\n\nInternal work.');

    expect(result?.status).toBe('ready');
    if (result?.status !== 'ready') {
      throw new Error('Expected documentation to load.');
    }

    expect(result.module.id).toBe('talent-pilot-app');
    expect(result.page.id).toBe('overview');
    expect(result.html).toContain('<h1>Talent Pilot App Documentation</h1>');
  });

  it('resolves explicit module and page route parameters', () => {
    let result: DocsArticleState | undefined;

    service.loadArticle('candidate-portal', 'profile-documents').subscribe((state) => {
      result = state;
    });

    http.expectOne('/docs/docs-manifest.json').flush(manifest);
    http
      .expectOne('/docs/candidate-portal/profile-documents.md')
      .flush('# Profile and Documents\n\n## Documents\n\nUpload a CV.');

    expect(result?.status).toBe('ready');
    if (result?.status !== 'ready') {
      throw new Error('Expected documentation to load.');
    }

    expect(result.module.id).toBe('candidate-portal');
    expect(result.page.id).toBe('profile-documents');
  });

  it('renders markdown headings for the on-page rail', () => {
    const rendered = service.renderMarkdown('# Guide\n\n## Functions\n\nText\n\n### Group Management\n\nMore');

    expect(rendered.html).toContain('<h2>Functions</h2>');
    expect(rendered.html).toContain('<h3>Group Management</h3>');
    expect(rendered.headings).toEqual([
      { id: 'functions', title: 'Functions', level: 2 },
      { id: 'group-management', title: 'Group Management', level: 3 },
    ]);
  });

  it('returns a friendly error state when a markdown source file is missing', () => {
    let result: DocsArticleState | undefined;

    service.loadArticle('admin-center', 'overview').subscribe((state) => {
      result = state;
    });

    http.expectOne('/docs/docs-manifest.json').flush(manifest);
    http.expectOne('/docs/admin-center/overview.md').flush('Not found', {
      status: 404,
      statusText: 'Not Found',
    });

    expect(result?.status).toBe('error');
    if (result?.status !== 'error') {
      throw new Error('Expected documentation load to fail.');
    }

    expect(result.message).toContain('markdown source file exists');
    expect(result.module?.id).toBe('admin-center');
    expect(result.page?.id).toBe('overview');
  });
});
