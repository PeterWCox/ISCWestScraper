import { chromium } from 'playwright';
import { readProfile } from './profile.js';
import {SOURCE,exhibitorKey} from './records.js';
export {SOURCE} from './records.js';

export function collectionStatus(job){return job.cancelled?'Stopped':job.errors.length?'Complete with errors':'Complete';}
export async function collect(job,onUpdate){
 const discovery=await chromium.launch({headless:true});
 const links=new Map();
 try {
  const page=await discovery.newPage();
  await page.goto(job.url,{waitUntil:'domcontentloaded',timeout:60000});
  const visited=new Set();
  for(let n=0;n<100;n++){
   await page.locator('a[href*="exhibitor-details."]').first().waitFor({timeout:45000});
   const found=await page.locator('a[href*="exhibitor-details."]').evaluateAll(els=>els.map(e=>({url:e.href,name:e.innerText.trim()||e.querySelector('img')?.alt||''})));
   for(const item of found)if(!links.has(exhibitorKey(item.url)))links.set(exhibitorKey(item.url),item);
   job.discovered=[...links.values()];onUpdate();
   const next=page.getByRole('link',{name:/next page SEO link/i});
   if(!(await next.count())||links.size>=job.limit||job.cancelled)break;
   const href=await next.first().getAttribute('href');
   if(!href)break;
   const nextUrl=new URL(href,page.url()).href;
   if(visited.has(nextUrl))throw Error('Directory pagination repeated before reaching its end.');
   visited.add(nextUrl);job.pages.push(nextUrl);
   await page.goto(nextUrl,{waitUntil:'domcontentloaded',timeout:60000});
  }
 }finally{await discovery.close();}
 const items=[...links.values()].slice(0,job.limit);job.total=items.length;onUpdate();
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(job.concurrency||1,3)},async()=>{
  let browser,page;
  try{
   while(cursor<items.length&&!job.cancelled){
    const item=items[cursor++];
    for(let attempt=1;attempt<=3;attempt++){
     try{
      if(!browser?.isConnected()||page?.isClosed()){
       await browser?.close().catch(()=>{});
       browser=await chromium.launch({headless:true});page=await browser.newPage();
      }
      await page.goto(item.url,{waitUntil:'domcontentloaded',timeout:45000});
      await page.locator('#exhibitor-details h1').waitFor({timeout:25000});
      const row=await readProfile(page);
      if(!row.name)throw Error('Company name is missing.');
      row.source=item.url;row.collectedAt=new Date().toISOString();row.addressCheckedAt=row.collectedAt;
      job.rows.push(row);break;
     }catch(error){
      await browser?.close().catch(()=>{});browser=undefined;page=undefined;
      if(attempt===3)job.errors.push({name:item.name||item.url,source:item.url,message:error.message.split('\n')[0]});
     }
    }
    job.done++;onUpdate();
   }
  }finally{await browser?.close().catch(()=>{});}
 }));
 job.status=collectionStatus(job);onUpdate();
}
