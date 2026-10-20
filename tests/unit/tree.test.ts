import { describe, expect, it } from 'vitest';
import { createTreeData, createTreeSampleData, treeDescendants } from '../../src/graph/transforms/tree';
import { createTreeChartView } from '../../src/graph/configs/treeChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createProjectSnapshot, serializeGraphProject, deserializeGraphProject } from '../../src/lib/storage/graphProject';
import { treeToolPageConfig } from '../../src/content/toolPages';
import { parseCsvText } from '../../src/lib/import/tabularImport';

function table(rows: string[][]) { return { ...createTreeSampleData(), rows: rows.map((cells, i) => ({ id: `row-${i}`, cells })) }; }
describe('tree structure', () => {
  it('builds the sample hierarchy with accurate relationships and repeated labels', () => {
    expect(createTreeData(createTreeSampleData())).toMatchObject({ status: 'ready', count: 6, levels: 3, leaves: 3, root: { id: 'root', children: [{ id: 'plan', children: [{ id: 'research' }, { id: 'design' }] }, { id: 'build', children: [{ id: 'test' }] }] } });
    expect(createTreeData(table([['r', 'Same', ''], ['c', 'Same', 'r']])).status).toBe('ready');
  });
  it('accepts unordered rows and trims relationship IDs', () => {
    expect(createTreeData(table([['child', 'Leaf', ' root '], ['root', 'Root', '']]))).toMatchObject({ status: 'ready', root: { children: [{ id: 'child' }] } });
  });
  it.each([
    { rows: [['r', 'Root', ''], ['r', 'Duplicate', '']], message: /Duplicate/ },
    { rows: [['r', 'Root', ''], ['c', 'Child', 'absent']], message: /does not exist/ },
    { rows: [['r', 'Root', ''], ['c', 'Child', '']], message: /exactly one root/ },
    { rows: [['r', 'Root', 'r']], message: /own parent/ },
    { rows: [['r', 'Root', ''], ['a', 'A', 'b'], ['b', 'B', 'a']], message: /cycle/ },
    { rows: [['r', 'Root', 'c'], ['c', 'Child', 'r']], message: /exactly one root/ },
    { rows: [['r', '', '']], message: /ID and a label/ },
    { rows: [['r', 'x'.repeat(81), '']], message: /80 characters/ },
  ])('rejects invalid hierarchy: $message', ({ rows, message }) => {
    expect(createTreeData(table(rows))).toMatchObject({ status: 'invalid', message });
  });
  it('handles an empty tree and rejects unrelated table shapes', () => {
    expect(createTreeData(table([['', '', '']])).status).toBe('empty');
    const data = createTreeSampleData(); data.columns[0].name = 'Month';
    expect(createTreeData(data)).toMatchObject({ status: 'invalid', message: /three columns/ });
  });
  it('enforces 50 nodes and 10 levels without recursion overflow', () => {
    const wide = table([['r', 'Root', ''], ...Array.from({ length: 49 }, (_, i) => [`n${i}`, `Node ${i}`, 'r'])]);
    expect(createTreeData(wide).status).toBe('ready');
    wide.rows.push({ id: 'overflow', cells: ['overflow', 'Overflow', 'r'] });
    expect(createTreeData(wide)).toMatchObject({ status: 'invalid', message: /50 nodes/ });
    const chain = Array.from({ length: 11 }, (_, i) => [`n${i}`, `Node ${i}`, i ? `n${i - 1}` : '']);
    expect(createTreeData(table(chain.slice(0, 10)))).toMatchObject({ status: 'ready', levels: 10 });
    expect(createTreeData(table(chain))).toMatchObject({ status: 'invalid', message: /10 levels/ });
  });
  it('finds precisely the descendants for branch removal, even on corrupt cycles', () => {
    expect([...treeDescendants(createTreeSampleData(), 'plan')].sort()).toEqual(['design', 'plan', 'research']);
    expect(treeDescendants(table([['a', 'A', 'b'], ['b', 'B', 'a']]), 'a').size).toBe(2);
  });
  it('renders both layouts without numeric axes or hidden branches', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const view = createTreeChartView(createTreeSampleData(), { ...createDefaultGraphSettings(), orientation });
      expect(view.status).toBe('ready'); if (view.status !== 'ready') throw new Error('Missing chart');
      expect(view.options.xAxis).toBeUndefined();
      expect(view.series[0]).toMatchObject({ type: 'tree', symbol: 'rect', orient: orientation === 'horizontal' ? 'LR' : 'TB', expandAndCollapse: false, initialTreeDepth: -1 });
      expect(view.canvasWidth).toBeGreaterThanOrEqual(320);
      expect(view.summary).toContain('Planning: Research, Design');
    }
  });
  it('round trips a schema-v1 tree project with color and layout', () => {
    const settings = { ...createDefaultGraphSettings(), title: 'Roadmap', orientation: 'horizontal' as const, seriesColors: ['#123456'] };
    const project = createProjectSnapshot({ data: createTreeSampleData(), graphType: 'tree', settings });
    const result = deserializeGraphProject(serializeGraphProject(project));
    expect(result).toMatchObject({ ok: true, project: { graphType: 'tree', settings: { title: 'Roadmap', orientation: 'horizontal', seriesColors: ['#123456'] } } });
    if (result.ok) expect(createTreeData(result.project.data).status).toBe('ready');
  });
  it('parses ID/Label/Parent ID CSV and keeps the documented example in sync', () => {
    const parsed = parseCsvText('ID,Label,Parent ID\nr,Root,\nc,Child,r');
    expect(parsed.ok).toBe(true); if (parsed.ok) expect(createTreeData(parsed.data)).toMatchObject({ status: 'ready', count: 2 });
    expect(treeToolPageConfig.example.rows).toEqual(treeToolPageConfig.editor.sampleData.rows.map(row => row.cells));
    expect(treeToolPageConfig.canonical).toBe('/tree-graph-maker/');
  });
});
