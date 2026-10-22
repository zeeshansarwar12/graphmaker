import { expect, test } from '@playwright/test';
import { openPage } from './navigation';

test('stacked bars preserve layout, edits, templates and downloads', async ({page,request})=>{
  await page.setViewportSize({width:390,height:844});
  await openPage(page,'/stacked-bar-graph-maker/');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Stacked Bar Graph Maker');
  await expect(page.getByRole('radio',{name:'Stacked',exact:true})).toBeChecked();
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('vertical stacked bar graph');
  await page.getByLabel('Staff, row 1').fill('75');
  await page.getByRole('radio',{name:'Horizontal',exact:true}).check();
  await page.getByRole('button',{name:'Save locally',exact:true}).click();
  await page.reload();
  await expect(page.getByLabel('Staff, row 1')).toHaveValue('75');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('horizontal stacked bar graph');
  await page.getByRole('radio',{name:'Grouped',exact:true}).check();
  await expect(page.getByLabel('Staff, row 1')).toHaveValue('75');
  await page.getByRole('radio',{name:'Stacked',exact:true}).check();
  for(const name of ['SVG','PNG']){
    const event=page.waitForEvent('download');
    await page.getByRole('button',{name,exact:true}).click();
    const download=await event;expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename().toLowerCase()).toMatch(new RegExp('\\.'+name.toLowerCase()+'$'));
  }
  await page.getByRole('combobox',{name:'Bar template',exact:true}).selectOption('channel-sales');
  await expect(page.getByLabel('Online, row 1')).toHaveValue('70');
  await expect(page.getByRole('radio',{name:'Stacked',exact:true})).toBeChecked();
  await expect(page.getByRole('combobox',{name:'My graphs',exact:true}).locator('option')).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth)).toBe(false);
  const html=await(await request.get('/stacked-bar-graph-maker/')).text();
  expect(html).toContain('Segmented Bar Graph Maker');expect(html).toContain('#application');
  expect(html.indexOf('id="related-heading"')).toBeGreaterThan(html.indexOf('id="bar-templates-heading"'));
});
