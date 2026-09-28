import type { GraphSettings } from './graphSettings';
import type { TabularData } from '../transforms/tabularData';

export type GraphType = 'bar' | 'boxplot' | 'dotplot' | 'histogram' | 'line' | 'pie' | 'radar' | 'scatter' | 'supplydemand' | 'xy';

export interface GraphEditorConfig {
  graphType: GraphType;
  initialSettings?: Partial<GraphSettings>;
  sampleData?: TabularData;
  slug: string;
}
