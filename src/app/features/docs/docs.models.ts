export interface DocsManifest {
  defaultModule: string;
  modules: DocsModule[];
}

export interface DocsModule {
  id: string;
  label: string;
  description: string;
  basePath: string;
  pages: DocsPage[];
}

export interface DocsPage {
  id: string;
  label: string;
  file: string;
  summary: string;
}

export interface DocsHeading {
  id: string;
  title: string;
  level: 2 | 3;
}

export type DocsArticleState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      manifest: DocsManifest;
      module: DocsModule;
      page: DocsPage;
      html: string;
      headings: DocsHeading[];
    }
  | {
      status: 'error';
      message: string;
      manifest?: DocsManifest;
      module?: DocsModule;
      page?: DocsPage;
    };
