import test from 'node:test';import assert from 'node:assert/strict';import {collectionStatus} from './scraper.js';
test('failed profiles cannot be reported as a complete extraction',()=>{
 assert.equal(collectionStatus({errors:[{message:'Browser closed'}]}),'Complete with errors');
 assert.equal(collectionStatus({errors:[]}), 'Complete');
 assert.equal(collectionStatus({errors:[],cancelled:true}), 'Stopped');
});
