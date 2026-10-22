import {describe,it,expect} from 'vitest';
import {parseSupplyWorkspace} from '../../src/lib/storage/supplyDrafts';
import {createProjectSnapshot} from '../../src/lib/storage/graphProject';
import {createSupplyDemandTemplateData} from '../../src/content/supplyDemandTemplates';
import {createDefaultGraphSettings} from '../../src/graph/configs/graphSettings';
const project=createProjectSnapshot({data:createSupplyDemandTemplateData(),graphType:'supplydemand',settings:createDefaultGraphSettings()});
describe('supply-demand workspace restoration',()=>{
  it('restores valid drafts and active selection',()=>{expect(parseSupplyWorkspace({activeId:'b',drafts:[{id:'a',project},{id:'b',project}]})).toMatchObject({activeId:'b',drafts:[{id:'a'},{id:'b'}]});});
  it('rejects invalid storage and skips malformed or duplicate drafts',()=>{expect(parseSupplyWorkspace(null)).toBeNull();expect(parseSupplyWorkspace({activeId:'a',drafts:[{id:'a',project:{}}]})).toBeNull();expect(parseSupplyWorkspace({activeId:'missing',drafts:[{id:'a',project},{id:'a',project},{id:'bad',project:{}}]})).toMatchObject({activeId:'a',drafts:[{id:'a'}]});});
  it('bounds restored workspace size',()=>{expect(parseSupplyWorkspace({activeId:'0',drafts:Array.from({length:30},(_,i)=>({id:String(i),project}))})?.drafts).toHaveLength(20);});
});
