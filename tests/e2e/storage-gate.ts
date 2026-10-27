import {expect,test,type Page} from '@playwright/test';

type Target = {kind:'empty'} | {kind:'workspace';activeId:string;value:string};
type Entry = {at:number;event:string;transaction?:number;[key:string]:unknown};
type Held = {generation:number;transaction:number;committedAt:number;callbackAt:number;heldAt:number};
type Observation = Held & {resolvedAt:number};

declare global {
  interface Window {
    feedbackStorageGate: {
      abort:boolean;
      arm:(target:Target)=>number;
      wait:()=>Promise<Observation>;
      release:()=>void;
      snapshot:()=>{events:Entry[];held:Held|null;generation:number};
    };
  }
}

// Test-only: native writes commit normally. Only the matched application's
// completion notification is withheld, keeping its promise pending until release.
export async function instrumentStorage(page:Page) {
  await page.addInitScript(()=>{
    const events:Entry[]=[];
    const record=(event:string,transaction?:number,detail:Record<string,unknown>={})=>{
      events.push({at:performance.timeOrigin+performance.now(),event,transaction,...detail});
    };
    let sequence=0,generation=0;
    let armed:{generation:number;target:Target;transaction?:number}|null=null;
    let held:Held|null=null,deliver:(()=>void)|null=null;
    const listeners=new Set<(value:Held)=>void>();
    const transactions=new WeakMap<IDBTransaction,{id:number;committedAt?:number}>();
    const gate=window.feedbackStorageGate={
      abort:false,
      arm(target:Target) {
        if(armed||held)throw new Error('Release the previous storage barrier before arming another.');
        armed={generation:++generation,target};
        record('armed',undefined,{generation,target});
        return generation;
      },
      wait() {
        record('browser-wait-start');
        // A latched event survives driver delay; no stale sampled boolean is polled.
        const observed=(value:Held)=>{
          const resolvedAt=performance.timeOrigin+performance.now();
          record('browser-wait-resolved',value.transaction);
          return {...value,resolvedAt};
        };
        if(held)return Promise.resolve(observed(held));
        return new Promise<Observation>((resolve,reject)=>{
          const finish=(value:Held)=>{clearTimeout(timer);listeners.delete(finish);resolve(observed(value));};
          const timer=setTimeout(()=>{
            listeners.delete(finish);record('browser-wait-timeout');
            reject(new Error(`Storage completion barrier timed out after 5000ms: ${JSON.stringify(gate.snapshot())}`));
          },5000);
          listeners.add(finish);
        });
      },
      release() {
        if(!deliver||!held)throw new Error('No matched committed transaction to release.');
        record('release',held.transaction);
        const callback=deliver;deliver=null;held=null;callback();
      },
      snapshot:()=>({events:[...events],held,generation}),
    };
    const nativeTransaction=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args:Parameters<typeof nativeTransaction>){
      const tx=nativeTransaction.apply(this,args);
      const meta={id:++sequence,committedAt:undefined as number|undefined};
      transactions.set(tx,meta);
      if(tx.mode==='readwrite') {
        record('created',meta.id,{database:this.name});
        tx.addEventListener('complete',()=>{
          meta.committedAt=performance.timeOrigin+performance.now();
          record('native-commit',meta.id);
        });
        tx.addEventListener('abort',()=>record('native-abort',meta.id,{error:tx.error?.name}));
        tx.addEventListener('error',()=>record('native-error',meta.id,{error:tx.error?.name}));
        if(gate.abort){gate.abort=false;queueMicrotask(()=>tx.abort());}
      }
      return tx;
    };
    const nativePut=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value:unknown,...args:Parameters<typeof nativePut> extends [unknown,...infer R]?R:never){
      const tx=this.transaction,meta=transactions.get(tx);
      // Inspect only synthetic test snapshots. A prior/other write cannot satisfy
      // the barrier for the active draft's intended edit.
      const data=value as {data?:{rows:{cells:string[]}[]};activeId?:string;drafts?:{id:string;project:{data:{rows:{cells:string[]}[]}}}[]};
      const active=data?.drafts?.find(draft=>draft.id===data.activeId);
      const target=armed?.target;
      const matches=target?.kind==='empty'
        ? tx.db.name==='graph-maker'&&this.name==='projects'&&data?.data?.rows.length===1&&data.data.rows[0].cells.every(cell=>cell==='')
        : target?.kind==='workspace'&&tx.db.name==='graph-maker-supply-drafts'&&this.name==='workspace'
          &&data?.activeId===target.activeId&&data.drafts?.length===20&&active?.project.data.rows[0]?.cells[1]===target.value;
      if(meta&&armed&&armed.transaction===undefined&&matches){
        armed.transaction=meta.id;
        record('matched-write',meta.id,{generation:armed.generation,target});
      }
      return nativePut.call(this,value,...args);
    };
    const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;
    Object.defineProperty(IDBTransaction.prototype,'oncomplete',{
      ...descriptor,
      set(handler:((this:IDBTransaction,event:Event)=>void)|null) {
        const tx=this as IDBTransaction;
        descriptor.set!.call(tx,function(event:Event){
          const meta=transactions.get(tx);
          if(meta)record('callback-arrival',meta.id);
          const callback=()=>{
            if(meta)record('application-notified',meta.id);
            handler?.call(tx,event);
          };
          if(meta&&armed?.transaction===meta.id){
            if(meta.committedAt===undefined)throw new Error('Completion callback preceded native commit observation.');
            const now=performance.timeOrigin+performance.now();
            held={generation:armed.generation,transaction:meta.id,committedAt:meta.committedAt,callbackAt:now,heldAt:now};
            armed=null;deliver=callback;record('held',meta.id);
            listeners.forEach(listener=>listener(held!));
          } else callback();
        });
      },
    });
  });
}

export async function holdNext(page:Page,target:Target={kind:'empty'}) {
  return page.evaluate(target=>window.feedbackStorageGate.arm(target),target);
}

export async function waitHeld(page:Page) {
  const startedAt=Date.now();
  try {
    const result=await page.evaluate(()=>window.feedbackStorageGate.wait());
    const returnedAt=Date.now();
    await test.info().attach('storage-barrier-observation',{
      body:JSON.stringify({startedAt,returnedAt,responseDelayMs:returnedAt-result.resolvedAt,...result}),contentType:'application/json',
    });
    expect(result.transaction).toBeGreaterThan(0);
    expect(result.generation).toBeGreaterThan(0);
    return result;
  } catch(error) {
    await test.info().attach('storage-driver-failure',{
      body:JSON.stringify({startedAt,failedAt:Date.now(),error:String(error)}),contentType:'application/json',
    });
    throw error;
  }
}

export async function release(page:Page) {
  await page.evaluate(()=>window.feedbackStorageGate.release());
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
}

export async function attachStorageTelemetry(page:Page) {
  await test.info().attach('storage-browser-events',{
    body:JSON.stringify(await page.evaluate(()=>window.feedbackStorageGate?.snapshot())),contentType:'application/json',
  });
}
