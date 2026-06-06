import { AfterViewChecked, Component, ElementRef, OnDestroy, ViewEncapsulation, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { DocsContentService } from './docs-content.service';
import { DocsArticleState, DocsModule, DocsPage } from './docs.models';

@Component({
  selector: 'app-docs-page',
  imports: [RouterLink],
  templateUrl: './docs-page.component.html',
  styleUrl: './docs-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DocsPageComponent implements AfterViewChecked, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly docs = inject(DocsContentService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private appliedHeadingSignature = '';
  private appliedTableSignature = '';
  private headingApplyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = signal<DocsArticleState>({ status: 'loading' });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.state.set({ status: 'loading' });
          return this.docs.loadArticle(params.get('module'), params.get('page'));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        this.scheduleHeadingIdApplication();
      });
  }

  ngAfterViewChecked(): void {
    this.applyHeadingIds();
    this.applyTableLabels();
  }

  ngOnDestroy(): void {
    if (this.headingApplyTimer !== null) {
      clearTimeout(this.headingApplyTimer);
    }
  }

  modules(view: DocsArticleState): DocsModule[] {
    return view.status === 'ready' || view.status === 'error' ? (view.manifest?.modules ?? []) : [];
  }

  activeModuleId(view: DocsArticleState): string | null {
    return view.status === 'ready' || view.status === 'error' ? (view.module?.id ?? null) : null;
  }

  activePageId(view: DocsArticleState): string | null {
    return view.status === 'ready' || view.status === 'error' ? (view.page?.id ?? null) : null;
  }

  moduleRoute(module: DocsModule): unknown[] {
    return ['/docs', module.id];
  }

  pageRoute(module: DocsModule, page: DocsPage): unknown[] {
    return ['/docs', module.id, page.id];
  }

  private applyHeadingIds(): void {
    const view = this.state();
    if (view.status !== 'ready') {
      this.appliedHeadingSignature = '';
      this.appliedTableSignature = '';
      return;
    }

    const signature = `${view.module.id}/${view.page.id}:${view.headings.map((heading) => heading.id).join('|')}`;
    if (signature === this.appliedHeadingSignature) {
      return;
    }

    const headingElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.docs-article h2, .docs-article h3'),
    );
    if (headingElements.length < view.headings.length) {
      return;
    }

    view.headings.forEach((heading, index) => {
      headingElements[index]?.setAttribute('id', heading.id);
    });
    this.appliedHeadingSignature = signature;
  }

  private applyTableLabels(): void {
    const view = this.state();
    if (view.status !== 'ready') {
      this.appliedTableSignature = '';
      return;
    }

    const tables = Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLTableElement>('.docs-article table'));
    const signature = `${view.module.id}/${view.page.id}:${tables.length}:${view.html.length}`;
    if (signature === this.appliedTableSignature) {
      return;
    }

    tables.forEach((table) => {
      const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).map((header) =>
        header.textContent?.trim() ?? '',
      );
      if (headers.length === 0) {
        return;
      }

      table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
        Array.from(row.querySelectorAll<HTMLTableCellElement>('td')).forEach((cell, index) => {
          const label = headers[index];
          if (label) {
            cell.dataset['label'] = label;
          }
        });
      });
    });

    this.appliedTableSignature = signature;
  }

  private scheduleHeadingIdApplication(): void {
    if (this.headingApplyTimer !== null) {
      clearTimeout(this.headingApplyTimer);
    }

    this.headingApplyTimer = setTimeout(() => {
      this.headingApplyTimer = null;
      this.applyHeadingIds();
      this.applyTableLabels();
    });
  }
}
