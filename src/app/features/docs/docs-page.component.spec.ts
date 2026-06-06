import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DocsContentService } from './docs-content.service';
import { DocsPageComponent } from './docs-page.component';
import { DocsArticleState, DocsManifest } from './docs.models';

describe('DocsPageComponent', () => {
  const manifest: DocsManifest = {
    defaultModule: 'talent-pilot-app',
    modules: [
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

  const readyState: DocsArticleState = {
    status: 'ready',
    manifest,
    module: manifest.modules[0],
    page: manifest.modules[0].pages[0],
    html: '<h1>Profile and Documents</h1><h2>Documents</h2><p>Upload a CV.</p>',
    headings: [{ id: 'documents', title: 'Documents', level: 2 }],
  };

  let docsService: Pick<DocsContentService, 'loadArticle'>;

  beforeEach(async () => {
    docsService = {
      loadArticle: vi.fn().mockReturnValue(of(readyState)),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'docs', component: DocsPageComponent },
          { path: 'docs/:module/:page', component: DocsPageComponent },
        ]),
        { provide: DocsContentService, useValue: docsService },
      ],
    }).compileComponents();
  });

  it('passes route parameters to the documentation loader', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/docs/candidate-portal/profile-documents', DocsPageComponent);

    expect(docsService.loadArticle).toHaveBeenCalledWith('candidate-portal', 'profile-documents');
  });

  it('renders markdown content and on-page links', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/docs/candidate-portal/profile-documents', DocsPageComponent);

    const nativeElement = harness.routeNativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Profile and Documents');
    expect(nativeElement.querySelector('.docs-product-nav')).toBeNull();
    expect(nativeElement.querySelector('.docs-article')?.innerHTML).toContain('<h2 id="documents">Documents</h2>');
    expect(nativeElement.querySelector('.docs-toc a')?.getAttribute('href')).toBe('#documents');
  });

  it('adds markdown table header labels for responsive table layout', async () => {
    docsService.loadArticle = vi.fn().mockReturnValue(
      of({
        ...readyState,
        html: `
          <h1>Tech Stack</h1>
          <table>
            <thead><tr><th>Process</th><th>What It Does</th></tr></thead>
            <tbody><tr><td>Optional AI runtime</td><td>Runs local LLM and embedding calls.</td></tr></tbody>
          </table>
        `,
        headings: [],
      }),
    );
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/docs/candidate-portal/profile-documents', DocsPageComponent);

    const nativeElement = harness.routeNativeElement as HTMLElement;
    const cells = nativeElement.querySelectorAll('.docs-article td');
    expect(cells[0]?.getAttribute('data-label')).toBe('Process');
    expect(cells[1]?.getAttribute('data-label')).toBe('What It Does');
  });

  it('loads the default documentation page without route parameters', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/docs', DocsPageComponent);

    expect(docsService.loadArticle).toHaveBeenCalledWith(null, null);
  });
});
