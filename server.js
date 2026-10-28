import express from 'express';
import {createServer as createViteServer} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {collect,SOURCE} from './scraper.js';
import {searchRows,deduplicateRows,exhibitorKey} from './records.js';
import {workbook} from './workbook.js';
const production=process.env.NODE_ENV==='production';
const app=express();
app.get('/healthz',(req,res)=>res.json({ok:true}));
app.get('/login',(req,res)=>res.redirect('/'));
app.use(express.json());
const dataDir=process.env.DATA_DIR||'.data';fs.mkdirSync(dataDir,{recursive:true});
const stateFile=path.join(dataDir,'state.json');
const snapshot=JSON.parse(fs.readFileSync(new URL('./exhibitors.json',import.meta.url),'utf8'));
let data=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{rows:snapshot,jobs:[]};
const addresses=new Map(snapshot.filter(row=>row.addressCheckedAt).map(row=>[exhibitorKey(row.source),row]));
for(const row of data.rows){
 const published=addresses.get(exhibitorKey(row.source));
 if(published && (Date.parse(row.addressCheckedAt||'')||0)<Date.parse(published.addressCheckedAt)){
  row.address=published.address;row.addressCheckedAt=published.addressCheckedAt;
 }
}
for(const j of data.jobs)if(j.status==='Collecting')j.status='Interrupted';
const save=()=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(data));fs.renameSync(stateFile+'.tmp',stateFile);};
data.rows=deduplicateRows([...data.rows,...snapshot]);save();
app.get('/api/exhibitors',(req,res)=>{
 const matches=searchRows(data.rows,req.query.q);
 const pageSize=10;
 const pages=Math.max(1,Math.ceil(matches.length/pageSize));
 const requested=Number(req.query.page);
 const page=Number.isSafeInteger(requested)&&requested>0?Math.min(requested,pages):1;
 res.json({rows:matches.slice((page-1)*pageSize,page*pageSize),page,pageSize,pages,total:matches.length,totalRecords:data.rows.length});
});
app.get('/api/state',(req,res)=>res.json(data));
app.post('/api/collect',(req,res)=>{
 if(production)return res.status(403).json({error:'Collection is available locally only.'});
 if(data.jobs.some(j=>j.status==='Collecting'))return res.status(409).json({error:'A collection is already running.'});
 let url;try{url=new URL(req.body.url||SOURCE);if(url.protocol!=='https:'||url.href.replace(/#.*$/,'')!==SOURCE)throw Error();}catch{return res.status(400).json({error:'Only the ISC West directory shown in this app is supported.'});}
 const job={id:Date.now(),name:req.body.name||'ISC West exhibitor directory',url:url.href,limit:Math.max(1,Math.min(1000,Number(req.body.limit)||25)),total:0,done:0,status:'Collecting',rows:[],errors:[],pages:[],createdAt:new Date().toISOString()};data.jobs.unshift(job);save();res.json(job);
 const update=()=>{data.rows=deduplicateRows([...data.rows,...job.rows]);save();};
 collect(job,update).catch(e=>{job.status='Failed';job.errors.push({name:'Collection',message:e.message.split('\n')[0]});}).finally(update);
});
app.post('/api/stop',(req,res)=>{if(production)return res.status(403).json({error:'Collection is available locally only.'});const j=data.jobs.find(j=>j.status==='Collecting');if(j)j.cancelled=true;save();res.json({ok:true});});
app.get('/api/export',async(req,res,next)=>{try{
 const bytes=await workbook(searchRows(data.rows,req.query.q));
 res.setHeader('Content-Disposition','attachment; filename="isc-west-exhibitors.xlsx"');
 res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(Buffer.from(bytes));
}catch(error){next(error);}});
if(production){
 app.use(express.static(path.resolve('dist')));
 app.get('/{*path}',(req,res)=>res.sendFile(path.resolve('dist/index.html')));
}else{
 const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
}
const port=process.env.PORT===undefined?5173:Number(process.env.PORT);
const host=production?'0.0.0.0':'127.0.0.1';
const server=app.listen(port,host,()=>console.log(`Standlist running on ${host}:${server.address().port}`));
