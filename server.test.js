import test from 'node:test';
import ExcelJS from 'exceljs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('production allows public browsing and XLSX export while collection remains local',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'standlist-production-'));
 await writeFile(path.join(dir,'state.json'),JSON.stringify({rows:[{name:'Fixture KBC Networks',stand:'17115',categories:'Data Transmission, Switches'},...Array.from({length:24},(_,i)=>({name:'Other '+i,stand:'shared'}))],jobs:[]}));
 const totalRecords=25+JSON.parse(await readFile('exhibitors.json','utf8')).length;
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'production',PORT:'0',DATA_DIR:dir,ACCESS_PASSWORD:'obsolete-password-is-ignored'},stdio:['ignore','pipe','pipe']});
 try{
  const output=await new Promise((resolve,reject)=>{server.stdout.once('data',data=>resolve(data.toString()));server.once('error',reject);server.once('exit',code=>reject(Error(`Server exited ${code}`)));});
  const port=output.match(/0\.0\.0\.0:(\d+)/)[1];
  const base='http://127.0.0.1:'+port;
  assert.equal((await fetch(base+'/healthz')).status,200);
  const headers={};
  const state=await fetch(base+'/api/state',{headers});assert.equal(state.status,200);assert.equal((await state.json()).rows.length,totalRecords);
  const first=await(await fetch(base+'/api/exhibitors',{headers})).json();
  assert.equal(first.rows.length,10);assert.equal(first.total,totalRecords);assert.equal(first.pages,Math.ceil(totalRecords/10));
  const second=await(await fetch(base+'/api/exhibitors?page=2',{headers})).json();
  assert.equal(second.rows.length,10);assert.equal(second.rows[0].name,'Other 9');
  const last=await(await fetch(base+'/api/exhibitors?page=999',{headers})).json();
  assert.equal(last.rows.length,totalRecords%10||10);assert.equal(last.page,Math.ceil(totalRecords/10));
  const filtered=await(await fetch(base+'/api/exhibitors?q=fixture%20kbc&page=2',{headers})).json();
  assert.equal(filtered.total,1);assert.equal(filtered.page,1);assert.equal(filtered.rows[0].name,'Fixture KBC Networks');
  const empty=await(await fetch(base+'/api/exhibitors?q=no-such-exhibitor-fixture-9e4bf73',{headers})).json();assert.equal(empty.total,0);assert.deepEqual(empty.rows,[]);
  const invalidPage=await(await fetch(base+'/api/exhibitors?page=-2',{headers})).json();assert.equal(invalidPage.page,1);
  const allExport=await fetch(base+'/api/export',{headers});
  const allBook=new ExcelJS.Workbook();await allBook.xlsx.load(Buffer.from(await allExport.arrayBuffer()));assert.equal(allBook.worksheets[0].rowCount,totalRecords+1);
  const exported=await fetch(base+'/api/export?q=fixture%20kbc',{headers});
  assert.match(exported.headers.get('content-disposition'),/isc-west-exhibitors.xlsx/);
  const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  assert.equal(book.worksheets[0].rowCount,2);
  assert.equal(book.worksheets[0].getRow(2).getCell(1).value,'Fixture KBC Networks');
  const html=await fetch(base,{headers});assert.equal(html.status,200);assert.match(await html.text(),/\/assets\//);
  const login=await fetch(base+'/login');assert.equal(login.url,base+'/');
  for(const route of ['collect','stop'])assert.equal((await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 }finally{server.kill();await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));await rm(dir,{recursive:true,force:true});}
});
