export const SOURCE='https://www.discoverisc.com/west/en-us/2025-exhibitors/exhibitor-directory.html?locale=en-US&query=';
export const columns={name:'Company Name',website:'Website',email:'email',linkedin:'LinkedIn URL',why:'Why visit our stand',description:'Description',brands:'Brands we will feature',categories:'Product Categories',address:'Address',stand:'Stand(s) #',source:'Source url'};
export function searchRows(rows, query='') {
 const term=String(query).trim().toLowerCase();
 return rows.filter(row=>Object.keys(columns).some(key=>String(row[key]??'').toLowerCase().includes(term)));
}

export function exhibitorKey(source) {
 try {
  const url=new URL(source);
  const id=url.pathname.match(/\/exhibitor-details\.(?:.*\.)?org-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.html$/i);
  if(id && url.hostname==='www.discoverisc.com') return url.origin+url.pathname.split('/exhibitor-details.')[0]+'/org-'+id[1].toLowerCase();
  url.hash='';return url.href;
 } catch {return source;}
}
export function deduplicateRows(rows) {
 const records=new Map();
 for(const row of rows) {
  const key=row.source?exhibitorKey(row.source):Symbol();
  const previous=records.get(key);
  if(!previous) {records.set(key,{...row});continue;}
  const newer=(Date.parse(row.collectedAt||'')||0)>=(Date.parse(previous.collectedAt||'')||0);
  const [older,latest]=newer?[previous,row]:[row,previous];
  records.set(key,{...older,...Object.fromEntries(Object.entries(latest).filter(([,value])=>value!==''&&value!=null))});
 }
 return [...records.values()];
}
