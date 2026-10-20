import { use } from 'echarts/core';
export type ChartEngine = 'bar' | 'line' | 'pie' | 'radar' | 'tree' | 'boxplot' | 'scatter' | 'xy';
const loaders = {
  bar: () => import('./bar'), line: () => import('./line'), pie: () => import('./pie'),
  radar: () => import('./radar'), tree: () => import('./tree'), boxplot: () => import('./boxplot'),
  scatter: () => import('./scatter'), xy: () => import('./xy'),
};
const loaded = new Map<ChartEngine, Promise<void>>();
export function loadChartEngine(type: ChartEngine): Promise<void> {
  let pending=loaded.get(type);
  if (!pending) {
    pending=loaders[type]().then(module => {use(module.default);}).catch(error => {loaded.delete(type);throw error;});
    loaded.set(type,pending);
  }
  return pending;
}
