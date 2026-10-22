import type { GraphSettings } from '../configs/graphSettings';
import { createSupplyDemandData } from './supplyDemand';
import type { SupplyDemandEquilibrium } from './supplyDemand';
import type { TabularData } from './tabularData';

export type CurvePoint = [number, number];

// Curves are connected piecewise-linear segments, not a fit or extrapolation.
export function curveIntersection(demand: CurvePoint[], supply: CurvePoint[]): SupplyDemandEquilibrium | null {
  const candidates: SupplyDemandEquilibrium[] = [];
  for (let i = 1; i < demand.length; i += 1) {
    for (let j = 1; j < supply.length; j += 1) {
      const [ax, ay] = demand[i - 1]; const [bx, by] = demand[i];
      const [cx, cy] = supply[j - 1]; const [dx, dy] = supply[j];
      const rx = bx - ax; const ry = by - ay; const sx = dx - cx; const sy = dy - cy;
      const cross = rx * sy - ry * sx;
      if (Math.abs(cross) < 1e-10) continue;
      const t = ((cx - ax) * sy - (cy - ay) * sx) / cross;
      const u = ((cx - ax) * ry - (cy - ay) * rx) / cross;
      if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) continue;
      const quantity = ax + t * rx; const value = ay + t * ry;
      if (quantity < 0 || value < 0) continue;
      if (!candidates.some(p => Math.abs(p.quantity - quantity) < 1e-7 && Math.abs(p.value - value) < 1e-7)) candidates.push({ quantity, value });
    }
  }
  // A single exact point is useful too; ambiguous intersections are not an answer.
  if (demand.length === 1 && supply.length === 1 && demand[0][0] === supply[0][0] && demand[0][1] === supply[0][1]) return { quantity: demand[0][0], value: demand[0][1] };
  return candidates.length === 1 ? candidates[0] : null;
}

export function createSupplyDemandModel(data: TabularData, settings: GraphSettings) {
  const mapped = createSupplyDemandData(data, { xColumnId: settings.supplyDemandXColumnId, demandColumnId: settings.supplyDemandDemandColumnId, supplyColumnId: settings.supplyDemandSupplyColumnId });
  const schedule = settings.supplyDemandInputMode === 'schedule';
  const points = mapped.points.slice(0, 300);
  const demand: CurvePoint[] = points.map(p => schedule ? [p.demand, p.quantity] : [p.quantity, p.demand]);
  const supply: CurvePoint[] = points.map(p => schedule ? [p.supply, p.quantity] : [p.quantity, p.supply]);
  const demandShift = settings.supplyDemandDemandShift ?? 0;
  const supplyShift = settings.supplyDemandSupplyShift ?? 0;
  const shiftedDemand: CurvePoint[] = demand.map(([q,p]) => [q + demandShift, p]);
  const shiftedSupply: CurvePoint[] = supply.map(([q,p]) => [q + supplyShift, p]);
  return { mapped, demand, supply, shiftedDemand, shiftedSupply, shifted: demandShift !== 0 || supplyShift !== 0, original: curveIntersection(demand, supply), equilibrium: curveIntersection(shiftedDemand, shiftedSupply), limited: mapped.points.length > 300 };
}

export function linearMarketData(coefficients: readonly number[]): TabularData {
  const [a,b,c,d] = coefficients;
  if (coefficients.length !== 4 || coefficients.some(v => !Number.isFinite(v) || Math.abs(v) > 1e6) || a < 0 || b < 0 || d < 0 || b + d === 0) throw new Error('Use finite coefficients up to 1,000,000; a, b and d must be nonnegative, with at least one positive slope.');
  const equilibrium = (a - c) / (b + d);
  const maxPrice = Math.max(40, equilibrium > 0 ? equilibrium * 1.75 : 40);
  return { columns: [{ id:'column-1',name:'Price',kind:'number' },{ id:'column-2',name:'Quantity demanded',kind:'number' },{ id:'column-3',name:'Quantity supplied',kind:'number' }], rows: Array.from({length:81},(_,i) => { const p = i * maxPrice / 80; return { id:`row-${i+1}`,cells:[p,a-b*p,c+d*p].map(v=>String(Number(v.toFixed(8)))) }; }) };
}
