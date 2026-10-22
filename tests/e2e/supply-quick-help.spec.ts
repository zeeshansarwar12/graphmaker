import { test, expect } from '@playwright/test';
import { openPage } from './navigation';

test('compact keyword resources are static and open the existing tool controls',async({page,request})=>{
  const html=await (await request.get('/supply-and-demand-graph-maker/')).text();
  for(const text of ['Supply and demand curve shifts','Supply and demand equations','Supply and demand graph practice problems','What is an industry supply curve?'])expect(html).toContain(text);
  await openPage(page,'/supply-and-demand-graph-maker/');
  await expect(page.locator('#supply-practice details')).toHaveCount(4);
  await page.getByRole('link',{name:'Open equation inputs ↑',exact:true}).click();
  await expect(page.getByLabel('Demand intercept a',{exact:true})).toBeVisible();
  await expect(page.locator('#supply-equations')).toHaveAttribute('open','');
  await page.getByText('Generate from linear equations',{exact:true}).click();
  await expect(page.locator('#supply-equations')).not.toHaveAttribute('open','');
  await page.getByRole('link',{name:'Open shift controls ↑',exact:true}).click();
  await expect(page.getByLabel('Demand shift',{exact:true})).toBeVisible();
  await page.getByText('1. Find equilibrium: Qd = 100 − 2P, Qs = 20 + 2P.',{exact:true}).click();
  await expect(page.locator('#supply-practice')).toContainText('Price = 20; quantity = 60.');
  const before=await page.getByLabel('My graphs',{exact:true}).locator('option').count();
  await page.locator('#supply-practice details').first().getByRole('link',{name:'Try this graph ↑'}).click();
  await expect(page.getByLabel('My graphs',{exact:true}).locator('option')).toHaveCount(before+1);
  await expect(page.getByRole('region',{name:'Equilibrium comparison'})).toContainText('60.00');
  await page.setViewportSize({width:364,height:800});
  await page.getByRole('link',{name:'Practice questions',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
