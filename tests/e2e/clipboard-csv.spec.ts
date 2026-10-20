import {test,expect} from '@playwright/test';
import {openPage,reloadPage} from './navigation';
const exam='Exam results\nCategory,Value\nEnglish,72\nMath,88\nScience,81\nHistory,65\nComputer,94';
for(const button of [false,true]) test(`exam CSV paste renders five correct bars (${button?'Paste data':'cell paste'})`,async ({page},testInfo)=>{
  await openPage(page,'/');
  if(button){await page.evaluate(text=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=>text}});},exam);await page.getByRole('button',{name:'Paste data',exact:true}).click();await expect(page.getByRole('region',{name:'Preview import'})).toContainText('5 rows');await page.getByRole('button',{name:'Replace data',exact:true}).click();}
  else await page.getByLabel('Month, row 1',{exact:true}).evaluate((element,text)=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain',text);element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData}));},exam);
  await expect(page.locator('[data-print-title]')).toHaveText('Exam results');
  await expect(page.getByLabel('Category, row 1',{exact:true})).toHaveValue('English');
  await expect(page.getByLabel('Value, row 5',{exact:true})).toHaveValue('94');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Computer 94');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();await reloadPage(page);
  await expect(page.locator('[data-print-title]')).toHaveText('Exam results');await expect(page.getByLabel('Value, row 2',{exact:true})).toHaveValue('88');
  await page.locator('section[aria-labelledby="editor-heading"]').screenshot({path:testInfo.outputPath('exam-results-paste.png')});
});

test('equation switching preserves pasted table across refresh and repeated switches',async ({page},testInfo)=>{
  await openPage(page,'/');
  await page.getByLabel('Month, row 1',{exact:true}).evaluate((element,text)=>{const clipboardData=new DataTransfer();clipboardData.setData('text/plain',text);element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData}));},exam);
  await page.getByRole('radio',{name:/Equation/}).click();
  await expect(page.locator('[data-chart-status="ready"]')).toBeVisible();
  await expect(page.getByText('Autosaved on this device. No cloud backup.',{exact:true})).toBeVisible();
  await reloadPage(page);
  await expect(page.getByRole('radio',{name:/Equation/})).toHaveAttribute('aria-checked','true');
  await page.getByRole('radio',{name:'Bar',exact:true}).click();
  await expect(page.locator('[data-print-title]')).toHaveText('Exam results');
  await expect(page.getByLabel('Category, row 1',{exact:true})).toHaveValue('English');
  await expect(page.getByLabel('Value, row 5',{exact:true})).toHaveValue('94');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('radio',{name:/Equation/}).click();
  await page.getByRole('radio',{name:'Bar',exact:true}).click();
  for (const [index, [subject, value]] of [['English','72'],['Math','88'],['Science','81'],['History','65'],['Computer','94']].entries()) {
    await expect(page.getByLabel(`Category, row ${index+1}`,{exact:true})).toHaveValue(subject);
    await expect(page.getByLabel(`Value, row ${index+1}`,{exact:true})).toHaveValue(value);
  }
  await expect(page.locator('[data-print-title]')).toHaveText('Exam results');
  await expect(page.locator('[data-chart-status="ready"]')).toContainText('Computer 94');
  await page.locator('section[aria-labelledby="editor-heading"]').screenshot({path:testInfo.outputPath('exam-after-equation-switch.png')});
});
