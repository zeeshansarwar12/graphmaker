import type { GraphSettings } from './graphSettings';
import type { TabularData } from '../transforms/tabularData';

export type GraphType = 'bar' | 'boxplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'xy';

export interface GraphEditorConfig {
  graphType: GraphType;
  initialSettings?: Partial<GraphSettings>;
  sampleData?: TabularData;
  slug: string;
}
