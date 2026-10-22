import { test, expect } from '@playwright/test';
import { openPage, reloadPage } from './navigation';

test('scenario gallery integrates with existing editor and saved projects',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await openPage(page,'/supply-and-demand-graph-maker/');
  await expect(page.locator('#supply-templates article')).toHaveCount(6);
  await page.getByRole('link',{name:'Use template: Demand increases',exact:true}).click();
  await expect(page.getByLabel('Data format')).toHaveValue('schedule');
  await expect(page.locator('[data-chart-insight]')).toContainText('New equilibrium: quantity 70.00, price 25.00.');
  await expect(page.locator('[data-chart-insight]')).toContainText('Original equilibrium: quantity 60.00, price 20.00.');
  await page.getByLabel('Show original curves and equilibrium').uncheck();
  await expect(page.locator('[data-chart-insight]')).not.toContainText('Original equilibrium');
  await page.getByLabel('Black-and-white print style').check();
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.')).toBeVisible();
  await reloadPage(page);
  await expect(page.getByLabel('Demand shift',{exact:true})).toHaveValue('20');
  await expect(page.getByLabel('Black-and-white print style')).toBeChecked();
  await expect(page.getByLabel('Show original curves and equilibrium')).not.toBeChecked();
  for(const name of ['PNG','SVG','Download project backup']){
    const event=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const download=await event;expect(await download.failure()).toBeNull();
  }
  await page.setViewportSize({width:375,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('equation sampling produces a schedule and simultaneous template remains editable',async({page})=>{
  await openPage(page,'/supply-and-demand-graph-maker/');
  await page.getByText('Generate from linear equations',{exact:true}).click();
  await page.getByLabel('Demand intercept a',{exact:true}).fill('120');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Apply equations'}).click();
  await expect(page.locator('[data-chart-insight]')).toContainText('quantity 70.00, price 25.00');
  await page.getByLabel('Supply and demand template',{exact:true}).selectOption('simultaneous');
  await expect(page.locator('[data-chart-insight]')).toContainText('quantity 60.00, price 10.00');
  await page.getByLabel('Supply shift',{exact:true}).fill('30');
  await expect(page.locator('[data-chart-insight]')).toContainText('quantity 65.00, price 7.50');
});


test('mobile comparison, shift reset and export feedback are clear',async({page})=>{
  await page.setViewportSize({width:364,height:800});
  await openPage(page,'/supply-and-demand-graph-maker/');
  await page.getByLabel('Supply and demand template',{exact:true}).selectOption('supply-increase');
  const results=page.getByRole('region',{name:'Equilibrium comparison'});
  await expect(results).toContainText('15.00');
  await expect(results).toContainText('70.00');
  await expect(results).toContainText('Original');
  await expect(page.getByRole('heading',{name:'Original market data',exact:true})).toBeVisible();
  await expect(page.locator('[data-supply-shift-cue]')).toContainText('Supply shift: 20');
  await page.getByRole('link',{name:'Adjust shifts →',exact:true}).click();
  await expect(page.getByLabel('Demand shift',{exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Reset shifts',exact:true}).click();
  await expect(results).toContainText('20.00');await expect(results).toContainText('60.00');
  await expect(results).not.toContainText('Original');
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download PNG',exact:true}).click();expect(await (await event).failure()).toBeNull();
  await expect(page.getByText('PNG generated—check your downloads.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
