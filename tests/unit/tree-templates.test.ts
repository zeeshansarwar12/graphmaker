import { describe, expect, it } from 'vitest';
import { treeTemplates, findTreeTemplate, createTreeTemplateData } from '../../src/content/treeTemplates';
import { createTreeData } from '../../src/graph/transforms/tree';
import { createTreeChartView } from '../../src/graph/configs/treeChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { treeToolPageConfig } from '../../src/content/toolPages';

describe('tree diagram templates', () => {
  it('provides six distinct, named starter diagrams without duplicate routes', () => {
    expect(treeTemplates).toHaveLength(6);
    expect(new Set(treeTemplates.map(template => template.id)).size).toBe(6);
    expect(treeTemplates.map(template => template.id)).toEqual(['blank', 'project', 'organization', 'decision', 'website', 'classification']);
    expect(treeToolPageConfig.canonical).toBe('/tree-graph-maker/');
    expect(treeToolPageConfig.h1).toBe('Tree Diagram Maker');
  });
  it.each(treeTemplates)('$name creates a valid, exportable hierarchy with isolated data', template => {
    expect(findTreeTemplate(template.id)).toBe(template);
    const before = JSON.stringify(template);
    const data = createTreeTemplateData(template);
    expect(createTreeData(data)).toMatchObject({ status: 'ready', count: template.rows.length });
    expect(createTreeChartView(data, { ...createDefaultGraphSettings(), title: template.title, orientation: template.orientation }).status).toBe('ready');
    data.rows[0].cells[1] = 'Changed'; data.columns[0].name = 'Changed';
    expect(JSON.stringify(template)).toBe(before);
    expect(createTreeTemplateData(template).rows[0].cells[1]).toBe(template.rows[0][1]);
    expect(createTreeTemplateData(template).columns[0].name).toBe('ID');
  });
  it('does not resolve unknown fragment IDs', () => {
    expect(findTreeTemplate('unknown')).toBeUndefined();
    expect(findTreeTemplate('<script>')).toBeUndefined();
  });
});
