import type { GraphSettings } from '../../graph/configs/graphSettings';
import type { TabularData } from '../../graph/transforms/tabularData';
import { createSupplyDemandModel } from '../../graph/transforms/supplyDemandModel';

export default function SupplyDemandResults({data,settings}:{data:TabularData;settings:GraphSettings}) {
  const model=createSupplyDemandModel(data,settings);
  const original=model.shifted && (settings.supplyDemandShowOriginal??true);
  const format=(n:number|undefined)=>n===undefined?'—':n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return <section aria-label="Equilibrium comparison" aria-live="polite" className="border-border mb-4 overflow-hidden rounded-md border" data-supply-results>
    <table className="w-full text-left text-sm"><thead className="bg-surface-subtle"><tr><th className="px-3 py-2" scope="col">Equilibrium</th>{original&&<th className="px-3 py-2" scope="col">Original</th>}<th className="px-3 py-2" scope="col">{model.shifted?'Updated':'Result'}</th></tr></thead><tbody>
      <tr className="border-border border-t"><th className="px-3 py-2 font-medium" scope="row">Price</th>{original&&<td className="px-3 py-2 tabular-nums">{format(model.original?.value)}</td>}<td className="px-3 py-2 font-semibold tabular-nums">{format(model.equilibrium?.value)}</td></tr>
      <tr className="border-border border-t"><th className="px-3 py-2 font-medium" scope="row">Quantity</th>{original&&<td className="px-3 py-2 tabular-nums">{format(model.original?.quantity)}</td>}<td className="px-3 py-2 font-semibold tabular-nums">{format(model.equilibrium?.quantity)}</td></tr>
    </tbody></table>{!model.equilibrium&&<p className="px-3 pb-3 text-xs text-text-muted">No unique nonnegative equilibrium in the plotted range.</p>}
  </section>;
}
