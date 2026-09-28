import { describe, expect, it } from 'vitest';

import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createSupplyDemandChartView } from '../../src/graph/configs/supplyDemandChart';
import {
  createSupplyDemandData,
  findSupplyDemandEquilibrium,
} from '../../src/graph/transforms/supplyDemand';
import { createDataFromRows } from '../../src/graph/transforms/tabularData';

function table(headers: string[], rows: string[][]) {
  return createDataFromRows([headers, ...rows]);
}

const economicsData = table(
  ['Quantity', 'Demand', 'Supply'],
  [
    ['10', '90', '20'],
    ['20', '80', '30'],
    ['30', '70', '40'],
    ['40', '60', '50'],
    ['50', '50', '60'],
    ['60', '40', '70'],
    ['70', '30', '80'],
  ],
);

describe('supply and demand transformation', () => {
  it('maps Quantity, Demand, and Supply and calculates an interpolated equilibrium', () => {
    const mapped = createSupplyDemandData(economicsData);

    expect(mapped).toMatchObject({
      demandColumnIndex: 1,
      demandName: 'Demand',
      isCompatible: true,
      skippedRowCount: 0,
      supplyColumnIndex: 2,
      supplyName: 'Supply',
      xColumnIndex: 0,
      xName: 'Quantity',
    });
    expect(mapped.equilibrium).toEqual({ quantity: 45, value: 55 });
  });

  it('detects equivalent headers and honors explicit mapping', () => {
    const equivalent = table(
      ['Q', 'Buyers', 'Sellers'],
      [['10', '90', '20'], ['20', '60', '50'], ['30', '30', '80']],
    );
    const automatic = createSupplyDemandData(equivalent);
    const remapped = createSupplyDemandData(equivalent, {
      demandColumnId: equivalent.columns[2].id,
      supplyColumnId: equivalent.columns[1].id,
      xColumnId: equivalent.columns[0].id,
    });

    expect(automatic).toMatchObject({ demandName: 'Buyers', supplyName: 'Sellers', xName: 'Q' });
    expect(remapped).toMatchObject({ demandName: 'Sellers', supplyName: 'Buyers', xName: 'Q' });
  });

  it('uses true numeric X values and sorts irregular quantities', () => {
    const irregular = table(
      ['Quantity', 'Demand', 'Supply'],
      [['50', '30', '90'], ['5', '100', '20'], ['17', '70', '40']],
    );
    const mapped = createSupplyDemandData(irregular);
    const view = createSupplyDemandChartView(irregular, createDefaultGraphSettings());

    expect(mapped.points.map((point) => point.quantity)).toEqual([5, 17, 50]);
    expect(mapped.equilibrium?.quantity).toBeCloseTo(28);
    expect(mapped.equilibrium?.value).toBeCloseTo(56.6666667);
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready supply and demand chart');
    expect(view.options).toMatchObject({
      series: [
        { data: [[5, 100], [17, 70], [50, 30]], name: 'Demand', type: 'line' },
        { data: [[5, 20], [17, 40], [50, 90]], name: 'Supply', type: 'line' },
        { type: 'scatter' },
      ],
      xAxis: { scale: true, type: 'value' },
      yAxis: { scale: true, type: 'value' },
    });
  });

  it('returns no equilibrium when curves do not cross in the supplied range', () => {
    const points = [
      { demand: 90, quantity: 10, supply: 20 },
      { demand: 80, quantity: 20, supply: 30 },
      { demand: 70, quantity: 40, supply: 40 },
    ];
    const data = table(
      ['Quantity', 'Demand', 'Supply'],
      points.map((point) => [String(point.quantity), String(point.demand), String(point.supply)]),
    );
    const view = createSupplyDemandChartView(data, createDefaultGraphSettings());

    expect(findSupplyDemandEquilibrium(points)).toBeNull();
    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready supply and demand chart');
    expect(view.equilibrium).toBeNull();
    expect(view.insight).toBe('No equilibrium appears within the supplied quantity range.');
    expect(view.options.series).toHaveLength(2);
  });

  it('skips incomplete rows, reports invalid values, and never fabricates a crossing', () => {
    const data = table(
      ['Quantity', 'Demand', 'Supply'],
      [['10', '90', '20'], ['20', 'invalid', '30'], ['30', '70', ''], ['40', '60', '50']],
    );
    const view = createSupplyDemandChartView(data, createDefaultGraphSettings());

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready supply and demand chart');
    expect(view.points).toHaveLength(2);
    expect(view.warning).toBe('2 rows were ignored because Quantity, Demand, or Supply was blank or non-numeric.');
    expect(view.equilibrium).toBeNull();
  });

  it('rejects a dataset with only quantity and one value series', () => {
    const incomplete = table(['Quantity', 'Demand'], [['10', '90'], ['20', '80']]);
    const view = createSupplyDemandChartView(incomplete, createDefaultGraphSettings());

    expect(createSupplyDemandData(incomplete).isCompatible).toBe(false);
    expect(view).toEqual({
      message: 'Add or map three distinct numeric columns for Quantity, Demand, and Supply.',
      status: 'empty',
      title: 'This data may not be suitable for a supply and demand graph.',
    });
  });

  it('can hide only the equilibrium marker while retaining the calculation', () => {
    const view = createSupplyDemandChartView(economicsData, {
      ...createDefaultGraphSettings(),
      showEquilibrium: false,
    });

    expect(view.status).toBe('ready');
    if (view.status !== 'ready') throw new Error('Expected a ready supply and demand chart');
    expect(view.equilibrium).toEqual({ quantity: 45, value: 55 });
    expect(view.options.series).toHaveLength(2);
  });
});
