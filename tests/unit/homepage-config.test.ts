import { describe, expect, it } from 'vitest';

import { homepageGraphConfig } from '../../src/graph/configs/homepage';
import type { GraphEditorConfig } from '../../src/graph/configs/homepage';

describe('homepage graph configuration', () => {
  it('uses the documented bar-chart starting point', () => {
    expect(homepageGraphConfig).toEqual({
      graphType: 'bar',
      slug: '/',
    });
  });

  it('keeps the shared editor configuration open to every V1 graph type', () => {
    const graphTypes: GraphEditorConfig['graphType'][] = [
      'bar',
      'line',
      'pie',
      'xy',
      'scatter',
      'histogram',
      'boxplot',
      'radar',
      'dotplot',
      'supplydemand',
    ];
    const specialistConfigs: GraphEditorConfig[] = graphTypes.map((graphType) => ({
      graphType,
      slug: `/${graphType}-maker/`,
    }));

    expect(specialistConfigs).toHaveLength(10);
    expect(homepageGraphConfig).toEqual({ graphType: 'bar', slug: '/' });
  });
});
