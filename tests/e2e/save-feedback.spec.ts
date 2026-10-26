import {expect,test,type Page} from '@playwright/test';
import {instrumentStorage,holdNext,waitHeld,release,attachStorageTelemetry} from './storage-gate';
import {openPage,reloadPage} from './navigation';

const exportError='Add valid data before exporting the graph.';
const capacityError='You have 20 graphs. Delete a graph from My graphs before opening another template.';
const storageError='Local saving is unavailable in this browser. Export a project file to keep a copy.';
const saved='Autosaved on this device. No cloud backup.';

async function settle(page:Page) {
  // Let an already scheduled 350ms autosave enqueue before the explicit queue barrier.
  await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await expect(page.getByText(saved,{exact:true})).toBeVisible();
}

test.afterEach(async({page})=>{await attachStorageTelemetry(page);});

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
    await attachStorageTelemetry(page);await reloadPage(page);await expect(page.locator('[data-chart-status="empty"]')).toBeVisible();
    await page.getByRole('button',{name:'PNG',exact:true}).click();
    await expect(page.getByRole('alert')).toHaveText(exportError);
  });

  for(const delayedObservation of mode==='autosave'?[false,true]:[false]) {
  test(`${mode} completion preserves capacity feedback and all drafts${delayedObservation?' despite a delayed stale observation':''}`,async({page},testInfo)=>{
    await instrumentStorage(page);await openPage(page,'/supply-and-demand-graph-maker/');
    await page.getByLabel('Demand, row 1',{exact:true}).fill('123');
    const selector=page.getByLabel('My graphs',{exact:true});const first=await selector.inputValue();
    for(let i=0;i<19;i++)await page.getByLabel('Supply and demand template',{exact:true}).selectOption('equilibrium');
    await expect(selector.locator('option')).toHaveCount(20);await settle(page);
    const active=await selector.inputValue();
    const target={kind:'workspace' as const,activeId:active,value:'124'};
    if(mode==='autosave') {
      await holdNext(page,target);
      // Recreate the old mechanism: sample before the write, then delay only
      // delivery to the test driver. Browser writes/timers continue normally.
      const sampled=delayedObservation?await page.evaluate(()=>({at:Date.now(),held:window.feedbackStorageGate.snapshot().held})):null;
      const delayed=sampled?new Promise<typeof sampled>(resolve=>setTimeout(()=>resolve(sampled),6000)):null;
      await page.getByLabel('Quantity demanded, row 1',{exact:true}).fill('124');
      if(delayed){
        const stale=await delayed;
        expect(stale.held).toBeNull();
        await testInfo.attach('synthetic-delayed-observation',{body:JSON.stringify({...stale,returnedAt:Date.now(),delayMs:6000}),contentType:'application/json'});
      }
    } else {
      await page.getByLabel('Quantity demanded, row 1',{exact:true}).fill('124');await settle(page);
      await holdNext(page,target);await page.getByRole('button',{name:'Save locally',exact:true}).click();
    }
    await waitHeld(page);
    await page.getByLabel('Supply and demand template',{exact:true}).selectOption('supply-increase');
    await expect(page.getByRole('alert')).toHaveText(capacityError);
    await release(page);await expect(page.getByRole('alert')).toHaveText(capacityError);
    await expect(selector).toHaveValue(active);await expect(selector.locator('option')).toHaveCount(20);
    await page.screenshot({path:testInfo.outputPath('capacity-warning-retained.png')});
    await attachStorageTelemetry(page);await reloadPage(page);await expect(selector.locator('option')).toHaveCount(20);
    await expect(selector).toHaveValue(active);
    await expect(page.getByLabel('Quantity demanded, row 1',{exact:true})).toHaveValue('124');
    await selector.selectOption(first);
    await expect(page.getByLabel('Demand, row 1',{exact:true})).toHaveValue('123');
  });
  }
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
    await attachStorageTelemetry(page);await reloadPage(page);await expect(page.locator('[data-chart-status="empty"]')).toBeVisible();
  });
}
