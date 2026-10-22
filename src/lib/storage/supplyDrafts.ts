import {parseGraphProject} from './graphProject';
import type {GraphProject} from './graphProject';
export interface SupplyDraft {id:string; project:GraphProject}
export interface SupplyWorkspace {activeId:string; drafts:SupplyDraft[]}
export const supplyDraftLimit=20;

function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('graph-maker-supply-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('workspace');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
let writes:Promise<void>=Promise.resolve();
export function writeSupplyWorkspace(value:SupplyWorkspace|null):Promise<void>{
  const captured=value ? structuredClone(value) : null;
  const next=writes.catch(()=>{}).then(async()=>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');if(captured)tx.objectStore('workspace').put(captured,'current');else tx.objectStore('workspace').delete('current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}});
  writes=next;return next;
}
export async function readSupplyWorkspace():Promise<SupplyWorkspace|null>{
  const db=await database();try{
    const value=await new Promise<unknown>((resolve,reject)=>{const request=db.transaction('workspace').objectStore('workspace').get('current');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    return parseSupplyWorkspace(value);
  }finally{db.close();}
}

export function parseSupplyWorkspace(value:unknown):SupplyWorkspace|null {
    if(!value || typeof value!=='object' || !('drafts' in value) || !Array.isArray(value.drafts) || !('activeId' in value) || typeof value.activeId!=='string') return null;
    const drafts:SupplyDraft[]=[];
    for(const draft of value.drafts.slice(0,supplyDraftLimit)){if(!draft || typeof draft.id!=='string' || drafts.some(item=>item.id===draft.id))continue;const parsed=parseGraphProject(draft.project);if(parsed.ok)drafts.push({id:draft.id,project:parsed.project});}
    return drafts.length ? {activeId:drafts.some(d=>d.id===value.activeId)?value.activeId:drafts[0].id,drafts} : null;
}
