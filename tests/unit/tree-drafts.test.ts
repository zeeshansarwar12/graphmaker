import {describe,it,expect} from 'vitest';
import {parseTreeWorkspace} from '../../src/lib/storage/treeDrafts';
import {createProjectSnapshot} from '../../src/lib/storage/graphProject';
import {createTreeSampleData} from '../../src/graph/transforms/tree';
import {createDefaultGraphSettings} from '../../src/graph/configs/graphSettings';
const project=createProjectSnapshot({data:createTreeSampleData(),graphType:'tree',settings:createDefaultGraphSettings()});
describe('tree workspace restoration',()=>{
  it('restores valid drafts and active selection',()=>{expect(parseTreeWorkspace({activeId:'b',drafts:[{id:'a',project},{id:'b',project}]})).toMatchObject({activeId:'b',drafts:[{id:'a'},{id:'b'}]});});
  it('rejects invalid storage and skips malformed or duplicate drafts',()=>{expect(parseTreeWorkspace(null)).toBeNull();expect(parseTreeWorkspace({activeId:'a',drafts:[{id:'a',project:{}}]})).toBeNull();expect(parseTreeWorkspace({activeId:'missing',drafts:[{id:'a',project},{id:'a',project},{id:'bad',project:{}}]})).toMatchObject({activeId:'a',drafts:[{id:'a'}]});});
  it('bounds restored workspace size',()=>{expect(parseTreeWorkspace({activeId:'0',drafts:Array.from({length:30},(_,i)=>({id:String(i),project}))})?.drafts).toHaveLength(20);});
});
