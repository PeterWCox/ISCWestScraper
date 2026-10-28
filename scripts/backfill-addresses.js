import fs from 'node:fs';
import {chromium} from 'playwright';
import {extractProfile} from '../profile.js';
const snapshot=new URL('../exhibitors.json',import.meta.url);
const rows=JSON.parse(fs.readFileSync(snapshot));
const browser=await chromium.launch();
let cursor=0,done=0;const errors=[];
const save=()=>fs.writeFileSync(snapshot,JSON.stringify(rows,null,2));
try {
 await Promise.all(Array.from({length:3},async()=>{
  const page=await browser.newPage();
  while(cursor<rows.length){
   const row=rows[cursor++];
   for(let attempt=0;attempt<2;attempt++)try{
    await page.goto(row.source,{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('#exhibitor-details h1').waitFor({timeout:20000});
    row.address=(await page.locator('#exhibitor-details').evaluate(extractProfile)).address;
    row.addressCheckedAt=new Date().toISOString();save();break;
   }catch(error){if(attempt===1)errors.push({name:row.name,message:error.message.split('\n')[0]});}
   if(++done%20===0)console.log(`${done}/${rows.length} addresses checked; ${errors.length} errors`);
  }
  await page.close();
 }));
}finally{await browser.close();save();}
console.log(JSON.stringify({checked:done,withAddress:rows.filter(r=>r.address).length,errors}));
if(errors.length)process.exitCode=1;
