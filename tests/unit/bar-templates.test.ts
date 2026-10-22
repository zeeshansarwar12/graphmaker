import { describe, expect, it } from 'vitest';
import { barTemplates, barTemplatePages, cloneBarTemplateData, templatesForBarPage } from '../../src/content/barTemplates';
import { validateData } from '../../src/graph/transforms/tabularData';
import { createBarChartView } from '../../src/graph/configs/barChart';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { createProjectSnapshot } from '../../src/lib/storage/graphProject';
import { parseBarWorkspace } from '../../src/lib/storage/barDrafts';

describe('bar templates and workspaces',()=>{
  it('provides three valid examples per page with the intended orientation and series',()=>{
    expect(new Set(barTemplates.map(t=>t.id)).size).toBe(12);
    for(const page of barTemplatePages){
      expect(templatesForBarPage(page)).toHaveLength(3);
      for(const template of templatesForBarPage(page)){
        const data=cloneBarTemplateData(template);
        expect(validateData(data)).toEqual([]);
        const view=createBarChartView(data,{...createDefaultGraphSettings(),orientation:template.orientation});
        expect(view.status).toBe('ready');
        if(view.status==='ready')expect(view.series.length).toBe((page.includes('grouped')||page.includes('stacked'))?template.data.columns.length-1:1);
        if(!page.includes('stacked'))expect(template.orientation).toBe(page.includes('horizontal')?'horizontal':'vertical');
      }
    }
    expect(templatesForBarPage('/unknown/')).toEqual([]);
    const clone=cloneBarTemplateData(barTemplates.find(t=>t.id==='monthly-sales')!);clone.rows[0].cells[1]='999';clone.columns[0].name='Changed';
    expect(barTemplates.find(t=>t.id==='monthly-sales')!.data.rows[0].cells[1]).toBe('32');expect(barTemplates.find(t=>t.id==='monthly-sales')!.data.columns[0].name).toBe('Month');
  });
  it('validates every stored snapshot without evicting, skipping, or silently choosing another active draft',()=>{
    const project=createProjectSnapshot({data:cloneBarTemplateData(barTemplates.find(t=>t.id==='monthly-sales')!),graphType:'bar',settings:createDefaultGraphSettings()});
    const workspace={activeId:'a',drafts:[{id:'a',project}]};
    expect(parseBarWorkspace(workspace)?.drafts).toHaveLength(1);
    expect(parseBarWorkspace({...workspace,activeId:'missing'})).toBeNull();
    expect(parseBarWorkspace({...workspace,drafts:[...workspace.drafts,...workspace.drafts]})).toBeNull();
    expect(parseBarWorkspace({...workspace,drafts:[{id:'a',project:{}}]})).toBeNull();
    expect(parseBarWorkspace({...workspace,drafts:Array.from({length:21},(_,i)=>({id:`draft-${i}`,project})),activeId:'draft-0'})).toBeNull();
    expect(parseBarWorkspace({...workspace,drafts:Array.from({length:20},(_,i)=>({id:`draft-${i}`,project})),activeId:'draft-19'})?.drafts).toHaveLength(20);
  });
});
