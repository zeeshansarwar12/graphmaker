import type { TabularData } from '../graph/transforms/tabularData';

export const supplyDemandTemplates = [
  { id:'equilibrium', name:'Market equilibrium', description:'Two curves and one market-clearing price. A simple starting point.', demandShift:0, supplyShift:0, explanation:'At price 20, quantity demanded and quantity supplied both equal 60.' },
  { id:'demand-increase', name:'Demand increases', description:'More buyers enter the market. Compare old and new equilibrium.', demandShift:20, supplyShift:0, explanation:'Demand shifts right. With supply unchanged, price rises to 25 and quantity rises to 70.' },
  { id:'demand-decrease', name:'Demand decreases', description:'Preferences change and buyers demand less at every price.', demandShift:-20, supplyShift:0, explanation:'Demand shifts left. With supply unchanged, price falls to 15 and quantity falls to 50.' },
  { id:'supply-increase', name:'Supply increases', description:'Lower production costs increase supply at every price.', demandShift:0, supplyShift:20, explanation:'Supply shifts right. With demand unchanged, price falls to 15 and quantity rises to 70.' },
  { id:'supply-decrease', name:'Supply decreases', description:'An input shortage raises costs and reduces supply.', demandShift:0, supplyShift:-20, explanation:'Supply shifts left. With demand unchanged, price rises to 25 and quantity falls to 50.' },
  { id:'simultaneous', name:'Demand decreases + supply increases', description:'Two shifts at once. Explore why the quantity outcome depends on their sizes.', demandShift:-20, supplyShift:20, explanation:'Equal shifts with these equal slopes reduce price to 10 and keep quantity at 60. Other relative shifts can increase or decrease quantity.' },
] as const;
export type SupplyDemandTemplate = typeof supplyDemandTemplates[number];
export function createSupplyDemandTemplateData(): TabularData {
  return { columns: [{id:'column-1',name:'Price',kind:'number'},{id:'column-2',name:'Quantity demanded',kind:'number'},{id:'column-3',name:'Quantity supplied',kind:'number'}], rows: Array.from({length:9},(_,i)=>({id:`row-${i+1}`,cells:[i*5,100-i*10,20+i*10].map(String)})) };
}
