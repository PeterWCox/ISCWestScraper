import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicateRows,exhibitorKey} from './records.js';
const base='https://www.discoverisc.com/west/en-us/2025-exhibitors/exhibitor-directory/exhibitor-details.';
const id='2757ad37-0052-4160-bdb7-98b1c44b79ba';
test('Alarm.com slug variants merge by exhibitor ID and keep newer details plus older nonempty fields',()=>{
 const older={name:'Alarm.com',source:base+'alarmcom.org-'+id+'.html',collectedAt:'2026-10-08T22:52:18.699Z',categories:'Video',description:'Old'};
 const newer={...older,source:base+'org-'+id+'.html',collectedAt:'2026-10-08T22:54:31.974Z',categories:'',description:'New'};
 assert.equal(exhibitorKey(older.source),exhibitorKey(newer.source));
 for(const rows of [[older,newer],[newer,older]]) {
  const result=deduplicateRows(rows);assert.equal(result.length,1);
  assert.equal(result[0].source,newer.source);assert.equal(result[0].description,'New');assert.equal(result[0].categories,'Video');
 }
});
test('different exhibitor IDs sharing names or stands remain distinct',()=>{
 const a={name:'Company',stand:'14039',source:base+'org-'+id+'.html'};
 const b={...a,source:base+'org-07457e35-d7f3-40f6-abc7-21867e5a0808.html'};
 assert.equal(deduplicateRows([a,b]).length,2);
 assert.notEqual(exhibitorKey(a.source),exhibitorKey(a.source.replace('2025-exhibitors','2026-exhibitors')));
});
