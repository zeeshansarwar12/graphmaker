import type { GraphEditorConfig } from './editor';

export type { GraphEditorConfig } from './editor';

export const homepageGraphConfig = {
  graphType: 'bar',
  slug: '/',
} as const satisfies GraphEditorConfig;
