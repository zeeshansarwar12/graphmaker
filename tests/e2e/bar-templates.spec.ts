import { test, expect } from '@playwright/test';
import { openPage, reloadPage } from './navigation';
import { createProjectSnapshot } from '../../src/lib/storage/graphProject';
import { createDefaultGraphSettings } from '../../src/graph/configs/graphSettings';
import { barTemplates, cloneBarTemplateData } from '../../src/content/barTemplates';

const pages=[
  {route:'/bar-graph-maker/',cell:'Sales, row 1',id:'monthly-sales',name:'Monthly sales',templateCell:'Sales, row 1',orientation:'Vertical'},
  {route:'/grouped-bar-chart-maker/',cell:'Class A, row 1',id:'year-comparison',name:'This year vs last year',templateCell:'Last year, row 1',orientation:'Vertical'},
  {route:'/horizontal-bar-graph-maker/',cell:'Responses, row 1',id:'product-ranking',name:'Product rankings',templateCell:'Sales, row 1',orientation:'Horizontal'},
];
for(const fixture of pages){
  test(`templates preserve edited graphs on ${fixture.route}`,async({page,request})=>{
    await openPage(page,fixture.route);
    const graphs=page.getByRole('combobox',{name:'My graphs',exact:true});
    await expect(graphs).toBeVisible();
    await expect(page.locator('#bar-templates article')).toHaveCount(3);
    const html=await(await request.get(fixture.route)).text();expect(html).toContain('Use template');
    await page.getByLabel(fixture.cell,{exact:true}).fill('123');
    await page.getByRole('button',{name:'Customize',exact:true}).click();
    await page.getByLabel('Graph title',{exact:true}).fill('My original chart');
    const original=await graphs.inputValue();
    await page.getByRole('link',{name:`Use template: ${fixture.name}`,exact:true}).click();
    await expect(graphs.locator('option')).toHaveCount(2);
    const second=await graphs.inputValue();expect(second).not.toBe(original);
    await expect(page.getByRole('radio',{name:fixture.orientation,exact:true})).toBeChecked();
    await page.getByLabel(fixture.templateCell,{exact:true}).fill('88');
    await graphs.selectOption(original);
    await expect(page.getByLabel(fixture.cell,{exact:true})).toHaveValue('123');
    await expect(page.getByLabel('Graph title',{exact:true})).toHaveValue('My original chart');
    await graphs.selectOption(second);
    await expect(page.getByLabel(fixture.templateCell,{exact:true})).toHaveValue('88');
    await page.getByRole('button',{name:'Save locally',exact:true}).click();
    await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
    await reloadPage(page);
    await expect(graphs).toHaveValue(second);await expect(graphs.locator('option')).toHaveCount(2);
    await expect(page.getByLabel(fixture.templateCell,{exact:true})).toHaveValue('88');
    page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Delete current graph',exact:true}).click();
    await expect(graphs.locator('option')).toHaveCount(2);
    page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete current graph',exact:true}).click();
    await expect(graphs.locator('option')).toHaveCount(1);
    await expect(page.getByLabel(fixture.cell,{exact:true})).toHaveValue('123');
    await page.getByRole('button',{name:'Save locally',exact:true}).click();await reloadPage(page);
    await expect(graphs.locator('option')).toHaveCount(1);
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('combobox',{name:'Bar template',exact:true}).selectOption(fixture.id);
    await expect(graphs.locator('option')).toHaveCount(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
  });
}
test('direct template fragments wait for restoration and unknown fragments preserve work',async({page})=>{
  await openPage(page,'/bar-graph-maker/');
  await page.getByLabel('Sales, row 1',{exact:true}).fill('321');
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
  await openPage(page,'/bar-graph-maker/#bar-template-favorite-subjects');
  const graphs=page.getByRole('combobox',{name:'My graphs',exact:true});
  await expect(graphs.locator('option')).toHaveCount(2);
  await expect(page.getByLabel('Votes, row 1',{exact:true})).toHaveValue('24');
  await graphs.selectOption('initial');await expect(page.getByLabel('Sales, row 1',{exact:true})).toHaveValue('321');
  await openPage(page,'/bar-graph-maker/#bar-template-unknown');
  await expect(graphs.locator('option')).toHaveCount(2);await expect(page.getByLabel('Sales, row 1',{exact:true})).toHaveValue('321');
  await openPage(page,'/grouped-bar-chart-maker/');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Grouped Bar Graph Maker');
  await expect(graphs.locator('option')).toHaveCount(1);
});

test('full bar collection refuses additional templates without losing the original',async({page})=>{
  await openPage(page,'/bar-graph-maker/');
  await page.getByLabel('Sales, row 1',{exact:true}).fill('456');
  const graphs=page.getByRole('combobox',{name:'My graphs',exact:true});
  await expect(graphs).toBeVisible();
  for(let i=0;i<19;i++)await page.getByRole('combobox',{name:'Bar template',exact:true}).selectOption('monthly-sales');
  await expect(graphs.locator('option')).toHaveCount(20);
  await page.getByRole('combobox',{name:'Bar template',exact:true}).selectOption('favorite-subjects');
  await expect(page.getByText('You have 20 graphs on this page.',{exact:false})).toBeVisible();
  await expect(graphs.locator('option')).toHaveCount(20);
  await graphs.selectOption('initial');await expect(page.getByLabel('Sales, row 1',{exact:true})).toHaveValue('456');
});

test('legacy single-page saves migrate without losing data or orientation',async({page})=>{
  await openPage(page,'/');
  const data=cloneBarTemplateData(barTemplates.find(t=>t.id==='monthly-sales')!);data.rows[0].cells[1]='777';
  const project=createProjectSnapshot({data,graphType:'bar',settings:{...createDefaultGraphSettings(),title:'Legacy saved graph',orientation:'horizontal'}});
  await page.evaluate(async snapshot=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDB.open('graph-maker',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    try { await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put({...snapshot,id:'current-project:/bar-graph-maker/'});
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
    }); } finally {db.close();}
  },project);
  await openPage(page,'/bar-graph-maker/');
  await expect(page.getByLabel('Sales, row 1',{exact:true})).toHaveValue('777');
  await expect(page.getByRole('radio',{name:'Horizontal',exact:true})).toBeChecked();
  await expect(page.getByRole('heading',{name:'Legacy saved graph',exact:true})).toBeVisible();
  const graphs=page.getByRole('combobox',{name:'My graphs',exact:true});
  await page.getByRole('combobox',{name:'Bar template',exact:true}).selectOption('monthly-sales');
  await expect(graphs.locator('option')).toHaveCount(2);
  await graphs.selectOption('initial');
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
  await reloadPage(page);
  await expect(graphs.locator('option')).toHaveCount(2);
  await expect(page.getByLabel('Sales, row 1',{exact:true})).toHaveValue('777');
  await expect(page.getByRole('radio',{name:'Horizontal',exact:true})).toBeChecked();
});
