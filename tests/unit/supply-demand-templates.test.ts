import { describe, it, expect } from 'vitest';
import { createSupplyDemandTemplateData, supplyDemandTemplates } from '../../src/content/supplyDemandTemplates';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createSupplyDemandModel, curveIntersection, linearMarketData } from '../../src/graph/transforms/supplyDemandModel';
import { createSupplyDemandChartView } from '../../src/graph/configs/supplyDemandChart';
import { createProjectSnapshot, deserializeGraphProject, serializeGraphProject } from '../../src/lib/storage/graphProject';

describe('supply-demand scenarios',()=>{
  it.each(supplyDemandTemplates.map((t,i)=>({t,expected:[[60,20],[70,25],[50,15],[70,15],[50,25],[60,10]][i]})))('calculates $t.name',({t,expected})=>{
    const data=createSupplyDemandTemplateData();
    const settings={...createDefaultGraphSettings(),supplyDemandInputMode:'schedule' as const,supplyDemandDemandShift:t.demandShift,supplyDemandSupplyShift:t.supplyShift};
    const model=createSupplyDemandModel(data,settings);
    expect(model.original).toEqual({quantity:60,value:20});
    expect(model.equilibrium).toEqual({quantity:expected[0],value:expected[1]});
  });
  it('keeps presets isolated',()=>{const a=createSupplyDemandTemplateData();a.rows[0].cells[0]='999';expect(createSupplyDemandTemplateData().rows[0].cells[0]).toBe('0');});
  it('does not extrapolate or report ambiguous intersections',()=>{
    expect(curveIntersection([[0,5],[1,4]],[[0,1],[1,2]])).toBeNull();
    expect(curveIntersection([[0,0],[1,2],[2,0]],[[0,1],[2,1]])).toBeNull();
    expect(curveIntersection([[0,0],[1,1]],[[0,0],[1,1]])).toBeNull();
  });
  it('interpolates an irregular price schedule',()=>{
    const data=createSupplyDemandTemplateData();data.rows=[{id:'a',cells:['7','86','34']},{id:'b',cells:['29','42','78']}];
    expect(createSupplyDemandModel(data,{...createDefaultGraphSettings(),supplyDemandInputMode:'schedule'}).equilibrium).toEqual({quantity:60,value:20});
  });
  it('generates equations with known equilibrium and rejects invalid coefficients',()=>{
    const data=linearMarketData([120,2,20,3]);
    const p=createSupplyDemandModel(data,{...createDefaultGraphSettings(),supplyDemandInputMode:'schedule'}).equilibrium;
    expect(p?.quantity).toBeCloseTo(80);expect(p?.value).toBeCloseTo(20);
    expect(()=>linearMarketData([100,0,20,0])).toThrow();
    expect(()=>linearMarketData([100,NaN,20,2])).toThrow();
  });
  it('exports original curves only when requested, with distinct monochrome styles',()=>{
    const settings={...createDefaultGraphSettings(),supplyDemandInputMode:'schedule' as const,supplyDemandDemandShift:20,supplyDemandMonochrome:true};
    const view=createSupplyDemandChartView(createSupplyDemandTemplateData(),settings);
    if(view.status!=='ready')throw Error('not ready');
    expect(view.options.series).toHaveLength(5);expect(view.insight).toContain('Original equilibrium: quantity 60.00, price 20.00');
    const hidden=createSupplyDemandChartView(createSupplyDemandTemplateData(),{...settings,supplyDemandShowOriginal:false});
    if(hidden.status!=='ready')throw Error('not ready');expect(hidden.options.series).toHaveLength(3);
  });
  it('round trips economics settings and rejects corrupt imported settings',()=>{
    const settings={...createDefaultGraphSettings(),supplyDemandInputMode:'schedule' as const,supplyDemandDemandShift:-20,supplyDemandSupplyShift:20,supplyDemandShowOriginal:false,supplyDemandMonochrome:true};
    const project=createProjectSnapshot({data:createSupplyDemandTemplateData(),settings,graphType:'supplydemand',createdAt:new Date().toISOString()});
    const parsed=deserializeGraphProject(serializeGraphProject(project));expect(parsed.ok).toBe(true);if(parsed.ok)expect(parsed.project.settings).toMatchObject(settings);
    expect(deserializeGraphProject(JSON.stringify({...project,settings:{...settings,supplyDemandDemandShift:1000001}})).ok).toBe(false);
    const legacy: Partial<typeof settings>={...settings};delete legacy.supplyDemandInputMode;delete legacy.supplyDemandDemandShift;
    const restored=deserializeGraphProject(JSON.stringify({...project,settings:legacy}));if(!restored.ok)throw Error('legacy rejected');expect(restored.project.settings.supplyDemandInputMode).toBe('inverse');
  });
});
