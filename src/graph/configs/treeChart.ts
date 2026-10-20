import type { EChartsOption } from 'echarts';
import type { TreeSeriesOption } from 'echarts/charts';
import type { TabularData } from '../transforms/tabularData';
import { createTreeData } from '../transforms/tree';
import type { GraphSettings } from './graphSettings';

export function createTreeChartView(data: TabularData, settings: GraphSettings) {
  const tree = createTreeData(data);
  if (tree.status !== 'ready') return tree;
  const horizontal = settings.orientation === 'horizontal';
  const color = settings.seriesColors[0] ?? '#2563eb';
  const series: TreeSeriesOption = {
    type: 'tree', data: [tree.root], orient: horizontal ? 'LR' : 'TB',
    top: 40, bottom: 50, left: horizontal ? 70 : 65, right: horizontal ? 140 : 65,
    symbol: 'rect', symbolSize: [110, 34], expandAndCollapse: false, initialTreeDepth: -1,
    roam: false, edgeShape: 'curve',
    label: { position: 'inside', color: '#10213a', fontSize: 13, width: 96, overflow: 'truncate' },
    leaves: { label: { position: 'inside' } },
    itemStyle: { color: '#ffffff', borderColor: color, borderWidth: 1.5 }, lineStyle: { color, width: 1.5, curveness: 0.5 }, emphasis: { focus: 'descendant' },
  };
  const options: EChartsOption = { animation: false, aria: { enabled: true, description: tree.summary }, tooltip: { trigger: 'item', renderMode: 'richText' }, series: [series] };
  return { status: 'ready' as const, options, series: [series], summary: `${settings.title || 'Tree graph'}. ${tree.summary}`,
    canvasHeight: horizontal ? Math.max(320, tree.leaves * 44 + 80) : Math.max(320, tree.levels * 100 + 50),
    canvasWidth: horizontal ? Math.max(320, tree.levels * 170 + 60) : Math.max(320, tree.leaves * 240 + 130),
  };
}
