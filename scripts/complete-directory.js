import fs from 'node:fs';
import {collect,SOURCE} from '../scraper.js';
import {deduplicateRows} from '../records.js';
fs.mkdirSync('.data',{recursive:true});
const job={url:SOURCE,limit:1000,concurrency:3,total:0,done:0,status:'Collecting',rows:[],errors:[],pages:[],createdAt:new Date().toISOString()};
let previous=-1;
const update=()=>{
 fs.writeFileSync('.data/full-collection.json.tmp',JSON.stringify(job));
 fs.renameSync('.data/full-collection.json.tmp','.data/full-collection.json');
 if(job.done%25===0 && job.done!==previous){previous=job.done;console.log(`${job.done}/${job.total} profiles, ${job.rows.length} successful, ${job.errors.length} errors; ${job.discovered?.length||0} discovered`);}
};
try{await collect(job,update);}catch(error){job.status='Failed';job.errors.push({name:'Collection',message:error.message});update();throw error;}
if(job.errors.length||job.cancelled){console.log(JSON.stringify({status:job.status,errors:job.errors}));process.exitCode=1;}
else{
 const rows=deduplicateRows(job.rows);
 fs.writeFileSync('exhibitors.json',JSON.stringify(rows,null,2));
 console.log(JSON.stringify({status:job.status,discovered:job.total,unique:rows.length}));
}
