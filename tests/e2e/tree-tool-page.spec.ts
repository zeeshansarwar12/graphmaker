import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import { openPage, reloadPage } from './navigation';

const chart = '[data-rendered-chart-type="tree"] [data-chart-status="ready"]';

test('tree page edits branches, changes layout, restores and exports full diagrams', async ({ page }, testInfo) => {
  await openPage(page, '/tree-graph-maker/');
  await expect(page.getByRole('heading', { level: 1, name: 'Tree Diagram Maker' })).toBeVisible();
  await expect(page.locator(chart)).toContainText('Tree with 6 nodes and 3 levels');
  await page.getByLabel('Node 1 label', { exact: true }).fill('Roadmap');
  await page.getByRole('button', { name: 'Add child to node 1', exact: true }).click();
  await page.getByLabel('Node 7 label', { exact: true }).fill('Launch');
  await page.getByLabel('Node 7 parent', { exact: true }).selectOption('build');
  await expect(page.locator(chart)).toContainText('Development: Testing, Launch');
  await expect(page.getByLabel('Node 1 parent').locator('option')).toHaveCount(1);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await page.getByLabel('Tree layout').selectOption('vertical');
  await page.getByLabel('Graph title', { exact: true }).fill('Delivery plan');
  await page.getByLabel('Tree color', { exact: true }).fill('#0d9488');
  await expect(page.getByText('Autosaved on this device. No cloud backup.', { exact: true })).toBeVisible();
  await reloadPage(page);
  await expect(page.getByLabel('Node 7 label', { exact: true })).toHaveValue('Launch');
  await expect(page.locator('[data-chart-orientation="vertical"]')).toBeVisible();
  await expect(page.locator('[data-print-title]')).toHaveText('Delivery plan');
  await expect(page.locator(chart).locator('canvas')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('tree-desktop.png'), fullPage: false });
  for (const format of ['PNG', 'SVG', 'Download project backup']) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: format, exact: true }).click();
    const download = await downloading;
    const bytes = await readFile((await download.path())!);
    expect(bytes.length).toBeGreaterThan(100);
    if (format === 'SVG') { expect(bytes.toString()).toContain('Roadmap'); expect(bytes.toString()).toContain('Launch'); }
    if (format === 'PNG') expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    if (format === 'Download project backup') expect(JSON.parse(bytes.toString()).graphType).toBe('tree');
  }
});

test('tree branch deletion confirms descendants and recovers from an empty root', async ({ page }) => {
  await openPage(page, '/tree-graph-maker/');
  await page.getByRole('button', { name: 'Remove node 2 branch', exact: true }).click();
  const confirmation = page.getByRole('alertdialog', { name: 'Remove branch confirmation' });
  await expect(confirmation).toContainText('(3 nodes)');
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator(chart)).toContainText('6 nodes');
  await page.getByRole('button', { name: 'Remove node 2 branch', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Remove branch', exact: true }).click();
  await expect(page.locator(chart)).toContainText('3 nodes');
  await expect(page.locator(chart).locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Remove node 1 branch', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Remove branch', exact: true }).click();
  await expect(page.locator('[data-chart-status="empty"]')).toBeVisible();
  await page.getByRole('button', { name: 'Add root node', exact: true }).click();
  await expect(page.locator(chart)).toContainText('Tree with 1 node');
});

test('tree CSV imports validate roots, missing parents and cycles without rendering stale diagrams', async ({ page }) => {
  await openPage(page, '/tree-graph-maker/');
  await page.getByText('Import or edit a table', { exact: true }).click();
  async function upload(csv: string) {
    await page.getByLabel('Choose CSV file').setInputFiles({ name: 'tree.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  }
  await upload('ID,Label,Parent ID\nr,Root,\na,A,b\nb,B,a');
  await expect(page.getByRole('alert')).toContainText('cycle');
  await expect(page.locator(chart)).toHaveCount(0);
  await upload('ID,Label,Parent ID\nr,Root,\nc,Child,missing');
  await expect(page.getByRole('alert')).toContainText('does not exist');
  await upload('ID,Label,Parent ID\nr,Root,\nc,Child,r');
  await expect(page.locator(chart)).toContainText('Tree with 2 nodes');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('button', { name: 'Add root node', exact: true }).click();
  await expect(page.locator(chart)).toContainText('Tree with 1 node');
});

test('tree tool works on narrow mobile without page overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await openPage(page, '/tree-graph-maker/');
  await expect(page.getByRole('combobox', { name: 'Change chart type' })).toHaveValue('tree');
  await expect(page.locator(chart).locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('tree-mobile.png') });
  await page.getByRole('button', { name: 'Edit data', exact: true }).click();
  await page.getByLabel('Node 1 label', { exact: true }).fill('Mobile root');
  await expect(page.locator(chart)).toContainText('Root: Mobile root');
  await page.getByRole('button', { name: 'Open customization', exact: true }).click();
  await page.getByLabel('Tree layout').selectOption('vertical');
  await expect(page.getByLabel('X-axis title', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('switching to Tree preserves incompatible data until explicit sample replacement', async ({ page }) => {
  await openPage(page, '/');
  await page.getByLabel('Sales, row 1', { exact: true }).fill('99');
  await page.getByRole('radio', { name: 'Tree', exact: true }).click();
  await expect(page.getByText('Your current table is preserved.', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: 'Bar', exact: true }).click();
  await expect(page.getByLabel('Sales, row 1', { exact: true })).toHaveValue('99');
  await page.getByRole('radio', { name: 'Tree', exact: true }).click();
  await page.getByRole('button', { name: 'Start with sample tree', exact: true }).click();
  await expect(page.locator(chart)).toContainText('Tree with 6 nodes');
});


test('tree spreadsheet pastes and Excel imports retain text headers and numeric IDs', async ({ page }) => {
  await openPage(page, '/tree-graph-maker/');
  await page.getByText('Import or edit a table', { exact: true }).click();
  await page.getByLabel('ID, row 1', { exact: true }).evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'ID\tLabel\tParent ID\n1\tRoot\t\n2\tChild\t1');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  await expect(page.locator(chart)).toContainText('Tree with 2 nodes');
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['ID', 'Label', 'Parent ID'], ['r', 'Workbook root', ''], ['c', 'Workbook child', 'r']]), 'Tree');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  await page.getByLabel('Choose XLSX file').setInputFiles({ name: 'tree.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await page.getByRole('button', { name: 'Replace data', exact: true }).click();
  await expect(page.locator(chart)).toContainText('Workbook root: Workbook child');
});

for (const mobile of [false, true]) test(`tree preview node editing supports pointer, keyboard, cancel and persistence (${mobile ? 'mobile' : 'desktop'})`, async ({page}, testInfo) => {
  if (mobile) await page.setViewportSize({width:390,height:844});
  await openPage(page, '/tree-graph-maker/');
  const canvas = page.locator(`${chart} [data-chart-canvas]`);
  await expect(canvas.locator('canvas')).toBeVisible();
  await canvas.click({position:{x:70,y:155}});
  const editor = page.getByRole('dialog', {name:'Edit tree node',exact:true});
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel('Node label', {exact:true})).toBeFocused();
  await editor.getByLabel('Node label', {exact:true}).pressSequentially('Preview roadmap');
  await expect(editor.getByLabel('Node label', {exact:true})).toHaveValue('Preview roadmap');
  await editor.getByRole('button',{name:'Save label',exact:true}).click();
  await expect(page.getByLabel('Node 1 label',{exact:true})).toHaveValue('Preview roadmap');
  await expect(page.locator(chart)).toContainText('Root: Preview roadmap');
  await page.getByLabel('Edit a node in preview').selectOption('plan');
  await editor.getByLabel('Node label', {exact:true}).fill('Discard this');
  await editor.getByLabel('Node label', {exact:true}).press('Escape');
  await expect(editor).not.toBeVisible();
  await expect(page.getByLabel('Edit a node in preview')).toBeFocused();
  await page.getByLabel('Edit a node in preview').selectOption('plan');
  await expect(editor.getByLabel('Node label', {exact:true})).toHaveValue('Planning');
  await editor.getByLabel('Node label', {exact:true}).fill('   ');
  await expect(editor.getByRole('button',{name:'Save label',exact:true})).toBeDisabled();
  await editor.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.locator(chart)).toContainText('Planning');
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
  await reloadPage(page);
  await expect(page.getByLabel('Node 1 label',{exact:true})).toHaveValue('Preview roadmap');
  await page.getByLabel('Edit a node in preview').selectOption('root');
  await expect(editor.getByLabel('Node label', {exact:true})).toHaveValue('Preview roadmap');
  if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('tree-preview-edit.png'),fullPage:false});
});

for (const mobile of [false,true]) test(`tree canvas pans freely and resets without changing exports (${mobile ? 'mobile' : 'desktop'})`, async ({page},testInfo) => {
  if(mobile) await page.setViewportSize({width:390,height:844});
  await openPage(page,'/tree-graph-maker/');
  const viewport=page.locator('[data-tree-viewport]'),stage=page.locator('[data-tree-stage]');
  await expect(viewport).toBeVisible();
  await viewport.scrollIntoViewIfNeeded();
  const box=(await viewport.boundingBox())!;
  await page.mouse.move(box.x+80,box.y+155);
  await page.mouse.down();
  await page.mouse.move(box.x+170,box.y+205,{steps:8});
  await page.mouse.up();
  await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 90, 50)');
  await expect(page.getByRole('dialog',{name:'Edit tree node',exact:true})).not.toBeVisible();
  await viewport.focus();await viewport.press('ArrowLeft');
  await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 50)');
  await viewport.press('Home');
  await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  if (mobile) {
    const touch = await page.context().newCDPSession(page);
    await viewport.scrollIntoViewIfNeeded();
    const bounds=(await viewport.boundingBox())!;
    const point={x:Math.round(bounds.x+100),y:Math.round(bounds.y+100)};
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+60,y:point.y+30}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 60, 30)');
    await touch.detach();
    await page.getByRole('button',{name:'Reset view',exact:true}).click();
    await viewport.focus();
  }
  await viewport.press('ArrowRight');
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'SVG',exact:true}).click();
  const svg=await readFile((await (await downloading).path())!,'utf8');
  for(const name of ['Project','Research','Testing']) expect(svg).toContain(name);
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await page.locator(`${chart} [data-chart-canvas]`).click({position:{x:70,y:155}});
  await expect(page.getByRole('dialog',{name:'Edit tree node',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await viewport.evaluate(el=>el.scrollWidth>el.clientWidth && getComputedStyle(el).overflowX==='auto')).toBe(false);
  await viewport.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('tree-pan.png')});
});

for (const mobile of [false,true]) test(`tree zoom controls preserve editing, panning and full exports (${mobile ? 'mobile' : 'desktop'})`,async ({page},testInfo)=>{
  if(mobile) await page.setViewportSize({width:390,height:844});
  await openPage(page,'/tree-graph-maker/');
  const viewport=page.locator('[data-tree-viewport]'),stage=page.locator('[data-tree-stage]');
  const zoom=page.getByLabel('Tree zoom level',{exact:true});
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(zoom).toHaveText('125%');
  const bounds=(await viewport.boundingBox())!;
  // Click the transformed root to verify hit testing after zoom.
  const matrix=await stage.evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {x:m.e,y:m.f};});
  await viewport.click({position:{x:matrix.x+70*1.25,y:matrix.y+155*1.25}});
  const editor=page.getByRole('dialog',{name:'Edit tree node',exact:true});
  await expect(editor.getByLabel('Node label',{exact:true})).toHaveValue('Project');
  await editor.getByRole('button',{name:'Cancel',exact:true}).click();
  await viewport.focus();await viewport.press('+');
  await expect(zoom).toHaveText('150%');
  await viewport.press('ArrowRight');
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'SVG',exact:true}).click();
  const svg=await readFile((await (await downloading).path())!,'utf8');
  expect(svg).toContain('Research');expect(svg).toContain('Testing');
  for(let i=0;i<6;i++) {const b=page.getByRole('button',{name:'Zoom out',exact:true});if(await b.isEnabled()) await b.click();}
  await expect(zoom).toHaveText('5%');await expect(page.getByRole('button',{name:'Zoom out',exact:true})).toBeDisabled();
  for(let i=0;i<8;i++) await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(zoom).toHaveText('200%');await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Reset view',exact:true}).click();
  await expect(zoom).toHaveText('100%');await expect(stage).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await viewport.focus();await viewport.press('-');await expect(zoom).toHaveText('75%');
  await viewport.press('Home');await expect(zoom).toHaveText('100%');
  await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await viewport.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('tree-zoom.png')});
  expect(bounds.width).toBeGreaterThan(0);
});
