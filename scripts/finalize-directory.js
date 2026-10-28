import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readProfile} from '../profile.js';
import {SOURCE,exhibitorKey,columns} from '../records.js';
import {workbook} from '../workbook.js';
const job=JSON.parse(fs.readFileSync('.data/full-collection.json'));
assert.equal(job.done,job.total);assert.equal(job.total,813);
const rows=job.rows;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const exceptions=[];const checked=[];
try{
 for(const error of job.errors){
  assert.equal(error.name.trim(),'Cisco');
  await page.goto(SOURCE+'Cisco',{waitUntil:'domcontentloaded'});
  const name=page.locator('[data-testid="name-control"]').filter({hasText:/^Cisco\s*$/});
  await name.waitFor();
  const row=await name.evaluate(element=>{
   const card=element.closest('.exh-detail-container');
   return {name:element.innerText.trim(),stand:card.querySelector('.directory-stand span:last-child')?.innerText.trim()||'',description:card.querySelector('[data-testid="show-description"]')?.innerText.trim()||'',brands:card.querySelector('[data-testid="exh-brands"] p')?.innerText.trim()||'',categories:card.querySelector('[data-testid="exh-tags"]')?.innerText.trim()||'',source:element.querySelector('a').href};
  });
  for(const key of Object.keys(columns))row[key]??='';
  row.collectedAt=new Date().toISOString();row.profileStatus='Source detail page unavailable';
  rows.push(row);exceptions.push({name:row.name,source:row.source,reason:'Detail page remained blank after three retries. Name, stand, description, brands and categories recovered from the published directory card; other fields left blank.'});
 }
 const malformed=rows.filter(row=>row.website.includes('%20')||row.website.includes(','));
 const samples=['Napco Security Technologies Inc.','Alarm.com','OpenEye','Bold Group & SIS','Alarm Lock Systems, Inc.'];
 const targets=[...new Set([...malformed,...samples.map(name=>rows.find(r=>r.name===name)).filter(Boolean),rows[400],rows[600],rows[800]])];
 for(const row of targets){
  await page.goto(row.source,{waitUntil:'domcontentloaded'});await page.locator('#exhibitor-details h1').waitFor();
  const fresh=await readProfile(page);
  const categories=await page.locator('[data-dtm-category-name="Product Categories"]').evaluateAll(elements=>elements.map(e=>({expected:JSON.parse(e.getAttribute('data-dtm-responses')||'[]').length,actual:e.querySelectorAll('[data-testid="filter-tag"]').length})));
  for(const group of categories)assert.equal(group.actual,group.expected);
  for(const key of Object.keys(columns).filter(key=>!['website','source'].includes(key)))assert.equal(fresh[key]||'',row[key]||'',`${row.name}: ${key}`);
  row.website=fresh.website;
  checked.push({name:row.name,source:row.source,categoryCounts:categories,fieldsMatched:true});
 }
}finally{await browser.close();}
assert.equal(rows.length,813);assert.equal(new Set(rows.map(r=>exhibitorKey(r.source))).size,813);
assert.deepEqual(new Set(rows.map(r=>exhibitorKey(r.source))),new Set(job.discovered.map(r=>exhibitorKey(r.url))));
rows.sort((a,b)=>a.name.localeCompare(b.name));
fs.writeFileSync('exhibitors.json',JSON.stringify(rows,null,2));
const out='/Users/petercox/Downloads/CodexAssets/ICS-West-Exhibitors.xlsx';
fs.writeFileSync(out,await workbook(rows));
const audit={date:new Date().toISOString(),discovered:813,rows:rows.length,unique:813,exceptions,checked,published:Object.fromEntries(Object.keys(columns).map(key=>[key,rows.filter(r=>r[key]).length])),export:out};
fs.writeFileSync('.data/final-audit.json',JSON.stringify(audit,null,2));console.log(JSON.stringify(audit,null,2));
