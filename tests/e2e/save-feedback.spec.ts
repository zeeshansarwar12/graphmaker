import {expect,test,type Page} from '@playwright/test';
import {openPage,reloadPage} from './navigation';

declare global {
  interface Window {
    feedbackStorageGate: {hold:boolean;abort:boolean;pending:(()=>void)[];completed:number};
  }
}

const exportError='Add valid data before exporting the graph.';
const capacityError='You have 20 graphs. Delete a graph from My graphs before opening another template.';
const storageError='Local saving is unavailable in this browser. Export a project file to keep a copy.';
const saved='Autosaved on this device. No cloud backup.';

// Delay only application notification of one real successful IDB transaction.
// Aborts use the native transaction API, exercising the application's rejection path.
async function instrumentStorage(page:Page) {
  await page.addInitScript(()=>{
    const gate=window.feedbackStorageGate={hold:false,abort:false,pending:[] as (()=>void)[],completed:0};
    const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete')!;
    Object.defineProperty(IDBTransaction.prototype,'oncomplete',{
      ...descriptor,
      set(handler:((this:IDBTransaction,event:Event)=>void)|null) {
        const transaction=this as IDBTransaction;
        descriptor.set!.call(transaction,function(event:Event) {
          const deliver=()=>{handler?.call(transaction,event);gate.completed++;};
          if(transaction.mode==='readwrite'&&gate.hold){gate.hold=false;gate.pending.push(deliver);}
          else deliver();
        });
      },
    });
    const transaction=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args:Parameters<typeof transaction>){
      const next=transaction.apply(this,args);
      if(next.mode==='readwrite'&&gate.abort){gate.abort=false;queueMicrotask(()=>next.abort());}
      return next;
    };
  });
}

async function settle(page:Page) {
  // Let an already scheduled 350ms autosave enqueue before the explicit queue barrier.
  await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await expect(page.getByText(saved,{exact:true})).toBeVisible();
}

async function holdNext(page:Page) {await page.evaluate(()=>{window.feedbackStorageGate.hold=true;});}
async function waitHeld(page:Page) {await expect.poll(()=>page.evaluate(()=>window.feedbackStorageGate.pending.length)).toBe(1);}
async function release(page:Page) {
  await page.evaluate(()=>{window.feedbackStorageGate.pending.splice(0).forEach(deliver=>deliver());});
  await expect(page.getByText(saved,{exact:true})).toBeVisible();
}

for(const mode of ['autosave','manual save'] as const) {
  test(`${mode} completion preserves a newer invalid-export warning`,async({page},testInfo)=>{
    await instrumentStorage(page);await openPage(page,'/');await settle(page);
    if(mode==='autosave') {
      await holdNext(page);await page.getByRole('button',{name:'Clear',exact:true}).click();
    } else {
      await page.getByRole('button',{name:'Clear',exact:true}).click();await settle(page);
      await holdNext(page);await page.getByRole('button',{name:'Save locally',exact:true}).click();
    }
    await waitHeld(page);await page.getByRole('button',{name:'PNG',exact:true}).click();
    await expect(page.getByRole('alert')).toHaveText(exportError);
    await release(page);await expect(page.getByRole('alert')).toHaveText(exportError);
    await page.screenshot({path:testInfo.outputPath('export-warning-retained.png')});
    await reloadPage(page);await expect(page.locator('[data-chart-status="empty"]')).toBeVisible();
    await page.getByRole('button',{name:'PNG',exact:true}).click();
    await expect(page.getByRole('alert')).toHaveText(exportError);
  });

  test(`${mode} completion preserves capacity feedback and all drafts`,async({page},testInfo)=>{
    await instrumentStorage(page);await openPage(page,'/supply-and-demand-graph-maker/');
    await page.getByLabel('Demand, row 1',{exact:true}).fill('123');
    const selector=page.getByLabel('My graphs',{exact:true});const first=await selector.inputValue();
    for(let i=0;i<19;i++)await page.getByLabel('Supply and demand template',{exact:true}).selectOption('equilibrium');
    await expect(selector.locator('option')).toHaveCount(20);await settle(page);
    if(mode==='autosave') {
      await holdNext(page);await page.getByLabel('Quantity demanded, row 1',{exact:true}).fill('124');
    } else {
      await holdNext(page);await page.getByRole('button',{name:'Save locally',exact:true}).click();
    }
    await waitHeld(page);const active=await selector.inputValue();
    await page.getByLabel('Supply and demand template',{exact:true}).selectOption('supply-increase');
    await expect(page.getByRole('alert')).toHaveText(capacityError);
    await release(page);await expect(page.getByRole('alert')).toHaveText(capacityError);
    await expect(selector).toHaveValue(active);await expect(selector.locator('option')).toHaveCount(20);
    await page.screenshot({path:testInfo.outputPath('capacity-warning-retained.png')});
    await reloadPage(page);await expect(selector.locator('option')).toHaveCount(20);
    await expect(selector).toHaveValue(active);await selector.selectOption(first);
    await expect(page.getByLabel('Demand, row 1',{exact:true})).toHaveValue('123');
  });
}

for(const withExportWarning of [false,true]) {
  test(`successful manual recovery clears a real storage error${withExportWarning?' while retaining a newer export warning':''}`,async({page})=>{
    await instrumentStorage(page);await openPage(page,'/');await settle(page);
    await page.evaluate(()=>{window.feedbackStorageGate.abort=true;});
    await page.getByRole('button',{name:'Clear',exact:true}).click();
    await expect(page.getByRole('alert')).toHaveText(storageError);
    await holdNext(page);await page.getByRole('button',{name:'Save locally',exact:true}).click();await waitHeld(page);
    if(withExportWarning){await page.getByRole('button',{name:'PNG',exact:true}).click();await expect(page.getByText(exportError,{exact:true})).toBeVisible();}
    await release(page);await expect(page.getByText(storageError,{exact:true})).toHaveCount(0);
    if(withExportWarning)await expect(page.getByRole('alert')).toHaveText(exportError);
    else await expect(page.getByRole('alert')).toHaveCount(0);
    await reloadPage(page);await expect(page.locator('[data-chart-status="empty"]')).toBeVisible();
  });
}
