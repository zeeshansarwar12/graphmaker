import {expect,test} from '@playwright/test';
import {instrumentStorage,holdNext,waitHeld,attachStorageTelemetry} from './storage-gate';

test.afterEach(async({page})=>{await attachStorageTelemetry(page);});

test('storage barrier ignores another draft and an older value despite a delayed stale observation',async({page},testInfo)=>{
  await instrumentStorage(page);await page.goto('/privacy/',{waitUntil:'domcontentloaded'});
  const generation=await holdNext(page,{kind:'workspace',activeId:'intended',value:'124'});
  // Delay delivery of a known pre-write sample, while native IndexedDB continues.
  // Keep this protocol control separate from the six complete UI regressions.
  const sampled=await page.evaluate(()=>({at:Date.now(),held:window.feedbackStorageGate.snapshot().held}));
  const delayed=new Promise<typeof sampled>(resolve=>setTimeout(()=>resolve(sampled),6000));
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const open=indexedDB.open('graph-maker-supply-drafts',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('workspace');
      open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
    });
    for(const [activeId,value] of [['other','124'],['intended','123'],['intended','124']]){
      await new Promise<void>((resolve,reject)=>{
        const tx=db.transaction('workspace','readwrite');
        tx.addEventListener('complete',()=>resolve());tx.onabort=()=>reject(tx.error);
        tx.oncomplete=()=>{};
        tx.objectStore('workspace').put({activeId,drafts:Array.from({length:20},(_,i)=>({id:i===0?activeId:`draft-${i}`,project:{data:{rows:[{cells:['0',value,'20']}]}}}))},'current');
      });
    }
    db.close();
  });
  const stale=await delayed;
  expect(stale.held).toBeNull();
  await testInfo.attach('synthetic-delayed-observation',{body:JSON.stringify({...stale,returnedAt:Date.now(),delayMs:6000}),contentType:'application/json'});
  const held=await waitHeld(page);
  expect(held.committedAt).toBeGreaterThanOrEqual(sampled.at);
  expect(held.committedAt).toBeLessThan(held.resolvedAt);
  expect(held.generation).toBe(generation);
  const before=await page.evaluate(()=>window.feedbackStorageGate.snapshot());
  expect(before.events.filter(event=>event.event==='matched-write')).toHaveLength(1);
  expect(before.events.filter(event=>event.event==='application-notified')).toHaveLength(2);
  expect(before.events.filter(event=>event.event==='native-commit')).toHaveLength(3);
  expect(before.events.find(event=>event.event==='held')?.transaction).toBe(held.transaction);
  await page.evaluate(()=>window.feedbackStorageGate.release());
  expect((await page.evaluate(()=>window.feedbackStorageGate.snapshot())).events.filter(event=>event.event==='application-notified')).toHaveLength(3);
});

test('storage barrier reports missing native completion within the unchanged five-second browser deadline',async({page})=>{
  await instrumentStorage(page);await page.goto('/privacy/',{waitUntil:'domcontentloaded'});
  await holdNext(page,{kind:'workspace',activeId:'absent',value:'124'});
  const result=await page.evaluate(async()=>{
    const start=performance.now();
    try{await window.feedbackStorageGate.wait();return {error:'unexpected success',elapsed:performance.now()-start};}
    catch(error){return {error:String(error),elapsed:performance.now()-start};}
  });
  expect(result.error).toContain('timed out after 5000ms');
  expect(result.elapsed).toBeGreaterThanOrEqual(5000);
  expect((await page.evaluate(()=>window.feedbackStorageGate.snapshot())).held).toBeNull();
});
