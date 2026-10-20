import { expect, test } from '@playwright/test';
import { openPage, reloadPage } from './navigation';

const route = '/tree-graph-maker/';
const root = (page: import('@playwright/test').Page) => page.getByLabel('Node 1 label', { exact: true });
const saved = 'Autosaved on this device. No cloud backup.';

test('tree diagram keyword page and all six template previews are present in static HTML', async ({ page, request }) => {
  const html = await (await request.get(route)).text();
  for (const id of ['blank', 'project', 'organization', 'decision', 'website', 'classification']) {
    expect(html).toContain(`id="tree-template-${id}"`);
    expect(html).toContain(`href="/tree-graph-maker/#tree-template-${id}"`);
  }
  await openPage(page, route);
  await expect(page.getByRole('heading', { level: 1, name: 'Tree Diagram Maker' })).toBeVisible();
  await expect(page).toHaveTitle('Tree Diagram Maker & Generator — Free | GraphMaker');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://graphmaker.site/tree-graph-maker/');
  await expect(page.locator('#tree-templates article')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'What is a tree diagram?', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to create a tree diagram', exact: true })).toBeVisible();
});

test('desktop template gallery uses the shared visual language', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page, route);
  await page.locator('#tree-templates').scrollIntoViewIfNeeded();
  await page.locator('#tree-templates').screenshot({ path: testInfo.outputPath('tree-template-gallery-desktop.png') });
  await expect(page.locator('#tree-templates article svg')).toHaveCount(6);
});

test('tree SEO example is labeled and crawlable with current feature instructions',async ({page,request},testInfo)=>{
  const html=await (await request.get(route)).text();
  expect(html).toContain('Project tree diagram with a root, branches, and leaves');
  expect(html).toContain('Edit this project tree template');
  expect(html).not.toContain('Scroll large diagrams');
  await openPage(page,route);
  await expect(page.getByRole('heading',{name:'Tree diagram questions',exact:true})).toBeVisible();
  const figure=page.locator('[data-tree-diagram-example]');
  await expect(figure.getByRole('img')).toHaveAccessibleName('Project tree diagram with a root, branches, and leaves');
  await expect(figure).toContainText('Development');
  await figure.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('tree-example-desktop.png')});
  await page.setViewportSize({width:390,height:844});await figure.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('tree-example-mobile.png')});
});

test('template selection preserves drafts and restores edits after refresh',async ({page})=>{
  await openPage(page,route);
  await expect(page.getByLabel('Remember my diagrams on this device')).toBeChecked();
  await root(page).fill('My existing project');
  await page.getByLabel('Tree template',{exact:true}).selectOption('website');
  await expect(root(page)).toHaveValue('Website');
  await expect(page.getByRole('button',{name:'Load template',exact:true})).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const drafts=page.getByLabel('My diagrams',{exact:true});
  const ids=await drafts.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
  expect(ids).toHaveLength(2);
  await drafts.selectOption(ids[0]);await expect(root(page)).toHaveValue('My existing project');
  await root(page).fill('Kept and edited');
  await drafts.selectOption(ids[1]);await expect(root(page)).toHaveValue('Website');
  await expect(page.getByText(saved,{exact:true})).toBeVisible();await reloadPage(page);
  await expect(drafts.locator('option')).toHaveCount(2);
  await drafts.selectOption(ids[0]);await expect(root(page)).toHaveValue('Kept and edited');
});

test('session-only preference clears stored tree data but preserves drafts until reload',async ({page})=>{
  await openPage(page,route);await root(page).fill('Private draft');
  await expect(page.getByText(saved,{exact:true})).toBeVisible();
  await page.getByLabel('Remember my diagrams on this device').uncheck();
  await page.getByLabel('Tree template',{exact:true}).selectOption('decision');
  await expect(page.locator('[data-print-title]')).toHaveText('Decision outline');
  await expect(page.getByText('Session only. Diagrams are not saved on this device.',{exact:true})).toBeVisible();
  const drafts=page.getByLabel('My diagrams',{exact:true});
  await drafts.selectOption({index:0});await expect(root(page)).toHaveValue('Private draft');
  await expect.poll(()=>page.evaluate(async()=>new Promise(resolve=>{const request=indexedDB.open('graph-maker-tree-drafts',1);request.onsuccess=()=>{const db=request.result;const get=db.transaction('workspace').objectStore('workspace').get('current');get.onsuccess=()=>{resolve(get.result===undefined);db.close();};};}))).toBe(true);
  await reloadPage(page);await expect(page.getByLabel('Remember my diagrams on this device')).not.toBeChecked();
  await expect(root(page)).toHaveValue('Project');
  await page.getByLabel('Remember my diagrams on this device').check();await root(page).fill('Remember again');
  await expect(page.getByText(saved,{exact:true})).toBeVisible();await reloadPage(page);await expect(root(page)).toHaveValue('Remember again');
});

test('all gallery templates open new fitted diagrams on mobile',async ({page},testInfo)=>{
  await page.setViewportSize({width:320,height:780});await openPage(page,route);
  for(const [name,label] of [['blank hierarchy','Your topic'],['project plan','Project'],['organization chart','Company'],['decision outline','Need quick results?'],['website structure','Website'],['classification tree','Transport']]){
    await page.getByRole('link',{name:`Use ${name} template`,exact:true}).click();await expect(root(page)).toHaveValue(label);
    await expect.poll(()=>page.locator('[data-tree-stage]').evaluate(stage=>{const c=stage.querySelector('[data-chart-canvas]')!.getBoundingClientRect(),v=stage.parentElement!.getBoundingClientRect();return c.left>=v.left-1&&c.right<=v.right+1&&c.top>=v.top-1&&c.bottom<=v.bottom+1;})).toBe(true);
  }
  await expect(page.getByLabel('My diagrams',{exact:true}).locator('option')).toHaveCount(7);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('tree-drafts-mobile.png')});
});

test('a direct template URL preserves the previously saved diagram',async ({page})=>{
  await openPage(page,route);await root(page).fill('Existing saved tree');await expect(page.getByText(saved,{exact:true})).toBeVisible();
  await openPage(page,route+'#tree-template-decision');await expect(root(page)).toHaveValue('Need quick results?');
  await page.getByLabel('My diagrams',{exact:true}).selectOption({index:0});await expect(root(page)).toHaveValue('Existing saved tree');
});

test('deleting one draft keeps the other diagram and removes it after refresh',async ({page})=>{
  await openPage(page,route);await root(page).fill('Keep this diagram');
  await page.getByLabel('Tree template',{exact:true}).selectOption('website');await expect(root(page)).toHaveValue('Website');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete current diagram',exact:true}).click();
  await expect(root(page)).toHaveValue('Keep this diagram');await expect(page.getByLabel('My diagrams',{exact:true}).locator('option')).toHaveCount(1);
  await expect(page.getByText(saved,{exact:true})).toBeVisible();await reloadPage(page);
  await expect(page.getByLabel('My diagrams',{exact:true}).locator('option')).toHaveCount(1);await expect(root(page)).toHaveValue('Keep this diagram');
});
