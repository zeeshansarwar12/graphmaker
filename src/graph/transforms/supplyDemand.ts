import type { TabularData } from './tabularData';

export interface SupplyDemandPoint {
  demand: number;
  quantity: number;
  supply: number;
}

export interface SupplyDemandEquilibrium {
  quantity: number;
  value: number;
}

export interface SupplyDemandMapping {
  demandColumnIndex: number | null;
  supplyColumnIndex: number | null;
  xColumnIndex: number | null;
}

export interface SupplyDemandData extends SupplyDemandMapping {
  demandName: string;
  equilibrium: SupplyDemandEquilibrium | null;
  isCompatible: boolean;
  points: SupplyDemandPoint[];
  skippedRowCount: number;
  supplyName: string;
  xName: string;
}

interface SupplyDemandPreferences {
  demandColumnId?: string | null;
  supplyColumnId?: string | null;
  xColumnId?: string | null;
}

const quantityHeader = /^(?:q|qty|quantity|units?)$/i;
const demandHeader = /(?:demand|buyers?|demanded)/i;
const supplyHeader = /(?:supply|sellers?|supplied)/i;

function isNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

function numericCandidateIndexes(data: TabularData): number[] {
  return data.columns.flatMap((_, index) => (
    data.rows.some((row) => isNumber(row.cells[index] ?? '')) ? [index] : []
  ));
}

function selectColumnIndex(
  data: TabularData,
  preferredId: string | null | undefined,
  headerPattern: RegExp,
  candidates: readonly number[],
  excluded: readonly number[],
): number | null {
  const preferredIndex = preferredId
    ? data.columns.findIndex((column) => column.id === preferredId)
    : -1;
  if (preferredIndex >= 0 && !excluded.includes(preferredIndex)) return preferredIndex;

  const semanticIndex = data.columns.findIndex((column, index) => (
    !excluded.includes(index) && headerPattern.test(column.name.trim())
  ));
  if (semanticIndex >= 0) return semanticIndex;
  return candidates.find((index) => !excluded.includes(index)) ?? null;
}

export function findSupplyDemandEquilibrium(
  points: readonly SupplyDemandPoint[],
): SupplyDemandEquilibrium | null {
  if (points.length === 0) return null;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const currentDifference = current.demand - current.supply;
    if (currentDifference === 0) {
      return { quantity: current.quantity, value: current.demand };
    }

    const next = points[index + 1];
    if (!next || next.quantity === current.quantity) continue;
    const nextDifference = next.demand - next.supply;
    if (currentDifference * nextDifference >= 0) continue;

    const fraction = currentDifference / (currentDifference - nextDifference);
    const quantity = current.quantity + fraction * (next.quantity - current.quantity);
    const demandValue = current.demand + fraction * (next.demand - current.demand);
    const supplyValue = current.supply + fraction * (next.supply - current.supply);
    return { quantity, value: (demandValue + supplyValue) / 2 };
  }

  return null;
}

export function createSupplyDemandData(
  data: TabularData,
  preferences: SupplyDemandPreferences = {},
): SupplyDemandData {
  const candidates = numericCandidateIndexes(data);
  const xColumnIndex = selectColumnIndex(
    data,
    preferences.xColumnId,
    quantityHeader,
    candidates,
    [],
  );
  const demandColumnIndex = selectColumnIndex(
    data,
    preferences.demandColumnId,
    demandHeader,
    candidates,
    xColumnIndex === null ? [] : [xColumnIndex],
  );
  const supplyColumnIndex = selectColumnIndex(
    data,
    preferences.supplyColumnId,
    supplyHeader,
    candidates,
    [xColumnIndex, demandColumnIndex].filter((index): index is number => index !== null),
  );
  const isCompatible = xColumnIndex !== null
    && demandColumnIndex !== null
    && supplyColumnIndex !== null
    && new Set([xColumnIndex, demandColumnIndex, supplyColumnIndex]).size === 3;
  const points: SupplyDemandPoint[] = [];
  let skippedRowCount = 0;

  if (isCompatible) {
    data.rows.forEach((row) => {
      if (!row.cells.some((value) => value.trim() !== '')) return;
      const quantity = row.cells[xColumnIndex]?.trim() ?? '';
      const demand = row.cells[demandColumnIndex]?.trim() ?? '';
      const supply = row.cells[supplyColumnIndex]?.trim() ?? '';
      if (!isNumber(quantity) || !isNumber(demand) || !isNumber(supply)) {
        skippedRowCount += 1;
        return;
      }
      points.push({ demand: Number(demand), quantity: Number(quantity), supply: Number(supply) });
    });
  }

  points.sort((left, right) => left.quantity - right.quantity);
  return {
    demandColumnIndex,
    demandName: demandColumnIndex === null ? '' : data.columns[demandColumnIndex]?.name.trim() || 'Demand',
    equilibrium: findSupplyDemandEquilibrium(points),
    isCompatible,
    points,
    skippedRowCount,
    supplyColumnIndex,
    supplyName: supplyColumnIndex === null ? '' : data.columns[supplyColumnIndex]?.name.trim() || 'Supply',
    xColumnIndex,
    xName: xColumnIndex === null ? '' : data.columns[xColumnIndex]?.name.trim() || 'Quantity',
  };
}

export function createSupplyDemandSuggestedLabels(data: TabularData): {
  title: string;
  xAxisTitle: string;
  yAxisTitle: string;
} {
  const mapped = createSupplyDemandData(data);
  return {
    title: 'Supply and Demand Graph',
    xAxisTitle: mapped.xName || 'Quantity',
    yAxisTitle: 'Price / Value',
  };
}
