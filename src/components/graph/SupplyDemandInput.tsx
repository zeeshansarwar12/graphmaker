import { useEffect, useState } from 'react';
import type { GraphSettings } from '../../graph/configs/graphSettings';
import type { TabularData } from '../../graph/transforms/tabularData';
import { linearMarketData } from '../../graph/transforms/supplyDemandModel';
import { supplyDemandTemplates } from '../../content/supplyDemandTemplates';
import type { SupplyDemandTemplate } from '../../content/supplyDemandTemplates';
import { DataGrid } from './DataGrid';

interface Props { data: TabularData; settings: GraphSettings; isReady: boolean; isSampleData: boolean; onChange: (data: TabularData, intent?: 'edit' | 'replace' | 'structure') => void; onSettings: (settings: GraphSettings) => void; onApplyTemplate: (template: SupplyDemandTemplate) => boolean }
const field = 'border-border mt-1 min-h-10 w-full rounded-md border bg-white px-3 font-normal';
export default function SupplyDemandInput({ data, settings, isReady, isSampleData, onChange, onSettings, onApplyTemplate }: Props) {
  const [coefficients, setCoefficients] = useState(['100','2','20','2']);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [equations, setEquations] = useState(false);
  function applyTemplate(id: string) {
    const template = supplyDemandTemplates.find(t=>t.id===id);
    if (!template || !onApplyTemplate(template)) return;
    setEquations(false);setError('');setNotice(template.explanation);
  }
  useEffect(()=>{
    function handleLink() {
      if(!isReady)return;
      if(location.hash==='#supply-equations' || location.hash==='#supply-shifts'){
        const target=document.getElementById(location.hash.slice(1)) as HTMLDetailsElement|null;
        if(location.hash==='#supply-equations')setEquations(true);
        if(target){target.open=true;target.scrollIntoView({block:'start'});target.querySelector('input')?.focus({preventScroll:true});}
        history.replaceState(null,'',`${location.pathname}${location.search}#editor`);
        return;
      }
      if (!location.hash.startsWith('#supply-template-')) return;
      const id = location.hash.slice('#supply-template-'.length);
      if (!supplyDemandTemplates.some(t=>t.id===id)) return;
      applyTemplate(id);
      history.replaceState(null,'',`${location.pathname}${location.search}#editor`);
      document.getElementById('editor')?.scrollIntoView({block:'start'});
    }
    const frame=requestAnimationFrame(handleLink);window.addEventListener('hashchange',handleLink);
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('hashchange',handleLink);};
  });
  const schedule=settings.supplyDemandInputMode==='schedule';
  function patch(values: Partial<GraphSettings>) {onSettings({...settings,...values});setNotice('');}
  return <div>
    <div className="border-border bg-surface-subtle mb-4 rounded-lg border p-3">
      <label className="block text-sm font-semibold">Supply and demand template<select aria-label="Supply and demand template" className={field} value="" onChange={e=>applyTemplate(e.target.value)}><option value="">Choose a template…</option>{supplyDemandTemplates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <a className="text-brand mt-2 inline-block text-sm underline" href="/supply-and-demand-graph-maker/#supply-templates">Preview six templates ↓</a>
    </div>
    <label className="mb-2 block text-sm font-semibold">Data format<select className={field} value={schedule?'schedule':'inverse'} onChange={e=>{if(window.confirm('Change how the existing columns are interpreted? Values stay unchanged. Use Price, Quantity demanded, Quantity supplied for schedules; use Quantity, Demand price, Supply price for inverse tables.'))patch({supplyDemandInputMode:e.target.value as 'schedule'|'inverse',supplyDemandXColumnId:null,supplyDemandDemandColumnId:null,supplyDemandSupplyColumnId:null});}}><option value="inverse">Quantity + demand and supply prices</option><option value="schedule">Price + quantities (textbook schedule)</option></select></label>
    <p className="text-text-muted mb-3 text-xs leading-5">{schedule?'Price, Quantity demanded, Quantity supplied.':'Quantity, Demand price, Supply price.'} Max 300 rows.</p>
    <details id="supply-equations" className="border-border mb-4 border-b pb-4" open={equations} onToggle={e=>setEquations(e.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold">Generate from linear equations</summary><p className="text-text-muted my-2 text-xs">Qd = a − bP · Qs = c + dP. Applying replaces the table with sampled values; your table is the saved source. Reopen this form to enter a new model; the fields are not fitted to your current table.</p><div className="grid grid-cols-2 gap-3">{['Demand intercept a','Demand slope b','Supply intercept c','Supply slope d'].map((label,i)=><label className="text-xs font-semibold" key={label}>{label}<input className={field} type="number" step="any" value={coefficients[i]} onChange={e=>setCoefficients(coefficients.map((v,j)=>i===j?e.target.value:v))}/></label>)}</div><button className="button-secondary mt-3" type="button" onClick={()=>{try{if(coefficients.some(v=>v.trim()===''))throw Error('Enter all four coefficients.');const next=linearMarketData(coefficients.map(Number));if(!window.confirm('Replace your current table with this equation example?'))return;onChange(next,'replace');patch({supplyDemandInputMode:'schedule',supplyDemandDemandShift:0,supplyDemandSupplyShift:0,supplyDemandXColumnId:null,supplyDemandDemandColumnId:null,supplyDemandSupplyColumnId:null,xAxisTitle:'Quantity',yAxisTitle:'Price'});setError('');setNotice('Equation values applied. Edit the generated schedule below.');}catch(e){setError(e instanceof Error?e.message:'Check the coefficients.');}}}>Apply equations</button>{error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</details>
    <details id="supply-shifts" className="border-border mt-4 border-t pt-4" open={!!((settings.supplyDemandDemandShift??0)||(settings.supplyDemandSupplyShift??0))}>
      <summary className="cursor-pointer text-sm font-semibold">Compare curve shifts (optional)</summary><p className="text-text-muted my-2 text-xs leading-5">Add quantity at every price: positive shifts right, negative shifts left. Shift amounts use your quantity units.</p>
      {(['demand','supply'] as const).map(kind=>{const key=kind==='demand'?'supplyDemandDemandShift':'supplyDemandSupplyShift';return <label className="mt-3 block text-sm font-semibold" key={kind}>{kind==='demand'?'Demand':'Supply'} shift<input className={field} type="number" min={-1000000} max={1000000} step="any" value={settings[key]??0} onChange={e=>{const value=Number(e.target.value);if(Number.isFinite(value)&&Math.abs(value)<=1e6)patch({[key]:value});}}/></label>;})}
      <button className="button-secondary mt-3" type="button" onClick={()=>patch({supplyDemandDemandShift:0,supplyDemandSupplyShift:0})}>Reset shifts</button>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.supplyDemandShowOriginal??true} onChange={e=>patch({supplyDemandShowOriginal:e.target.checked})}/>Show original curves and equilibrium</label>
    </details>
    <p className="text-text-muted my-3 text-xs" data-supply-shift-cue>Original data · Demand shift: {settings.supplyDemandDemandShift??0} · Supply shift: {settings.supplyDemandSupplyShift??0} units</p>
    <DataGrid headingLabel="Original market data" data={data} isSampleData={isSampleData} onChange={onChange}/>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.supplyDemandMonochrome??false} onChange={e=>patch({supplyDemandMonochrome:e.target.checked})}/>Black-and-white print style</label>
    {notice&&<p className="bg-brand-soft text-text mt-4 rounded-md p-3 text-sm leading-6" role="status">{notice}</p>}
  </div>;
}
