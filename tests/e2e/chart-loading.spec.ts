import {test,expect} from '@playwright/test';
import {openPage} from './navigation';

test('chart families and Excel parser are requested only when needed',async ({page})=>{
  const requested:string[]=[];page.on('request',request=>requested.push(new URL(request.url()).pathname));
  await openPage(page,'/');
  await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
  expect(requested.some(path=>/\/bar\.[^/]+\.js$/.test(path))).toBe(true);
  for(const family of ['tree','pie','radar','boxplot','xlsx']) expect(requested.some(path=>new RegExp('/'+family+'\\.[^/]+\\.js$').test(path))).toBe(false);
  await page.getByRole('radio',{name:'Pie',exact:true}).click();
  await expect(page.locator('[data-rendered-chart-type="pie"] [data-chart-status="ready"] canvas')).toBeVisible();
  expect(requested.some(path=>/\/pie\.[^/]+\.js$/.test(path))).toBe(true);
  expect(requested.some(path=>/\/tree\.[^/]+\.js$/.test(path))).toBe(false);
});

test('a failed chart module shows recovery and retry loads the diagram',async ({page})=>{
  let failed=false;
  await page.route('**/_astro/tree.*.js',route=>{if(!failed){failed=true;return route.abort();}return route.continue();});
  await openPage(page,'/tree-graph-maker/');
  await expect(page.getByRole('button',{name:'Save and reload editor',exact:true})).toBeVisible();
  await page.getByLabel('Node 1 label',{exact:true}).fill('Recovery tree');
  await page.getByRole('button',{name:'Save and reload editor',exact:true}).click();
  await expect(page.locator('[data-chart-status="ready"] canvas')).toBeVisible();
  await expect(page.getByLabel('Node 1 label',{exact:true})).toHaveValue('Recovery tree');
});
