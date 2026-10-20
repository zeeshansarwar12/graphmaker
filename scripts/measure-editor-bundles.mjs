import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import process from 'node:process';
import console from 'node:console';
import {URL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

// Run after build with an active production preview: node scripts/measure-editor-bundles.mjs http://127.0.0.1:4323
const root=fileURLToPath(new URL('../',import.meta.url));
const origin=process.argv[2] ?? 'http://127.0.0.1:4323';
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const route of ['/','/tree-graph-maker/']) {
    const page=await browser.newPage();const assets=new Set();
    page.on('response',response=>{const url=new URL(response.url());if(url.origin===new URL(origin).origin && url.pathname.startsWith('/_astro/') && url.pathname.endsWith('.js')) assets.add(url.pathname);});
    await page.goto(new URL(route,origin).href);
    await page.locator('[data-chart-status="ready"] canvas').waitFor();
    let rawBytes=0,gzipBytes=0;
    for(const asset of assets){const bytes=await readFile(resolve(root,'dist','.'+asset));rawBytes+=bytes.length;gzipBytes+=gzipSync(bytes).length;}
    results.push({route,requests:assets.size,rawBytes,gzipBytes,assets:[...assets]});
    await page.close();
  }
} finally {await browser.close();}
console.log(JSON.stringify(results,null,2));
