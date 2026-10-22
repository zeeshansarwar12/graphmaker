import { parseGraphProject } from './graphProject';
import type { GraphProject } from './graphProject';
export interface BarDraft { id: string; project: GraphProject }
export interface BarWorkspace { activeId: string; drafts: BarDraft[] }
export const barDraftLimit = 20;
export function parseBarWorkspace(value: unknown): BarWorkspace | null {
  if (!value || typeof value !== 'object' || !('drafts' in value) || !Array.isArray(value.drafts)
    || !('activeId' in value) || typeof value.activeId !== 'string' || !value.drafts.length || value.drafts.length > barDraftLimit) return null;
  const drafts: BarDraft[] = [];
  for (const draft of value.drafts) {
    if (!draft || typeof draft !== 'object' || typeof draft.id !== 'string' || !draft.id || drafts.some(d => d.id === draft.id)) return null;
    const parsed = parseGraphProject(draft.project);
    if (!parsed.ok) return null;
    drafts.push({ id: draft.id, project: parsed.project });
  }
  return drafts.some(d => d.id === value.activeId) ? { activeId: value.activeId, drafts } : null;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request=indexedDB.open('graph-maker-bar-drafts',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('workspaces');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
let writes: Promise<void> = Promise.resolve();
export function writeBarWorkspace(page: string, value: BarWorkspace): Promise<void> {
  const captured=structuredClone(value);
  const next=writes.catch(()=>{}).then(async()=>{
    const db=await database();
    try { await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(captured,page);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    }); } finally { db.close(); }
  });
  writes=next;return next;
}
export async function readBarWorkspace(page: string): Promise<BarWorkspace | null> {
  const db=await database();
  try { const value=await new Promise<unknown>((resolve,reject)=>{
    const request=db.transaction('workspaces').objectStore('workspaces').get(page);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  }); return parseBarWorkspace(value); } finally { db.close(); }
}
