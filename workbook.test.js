import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {workbook} from './workbook.js';
import {searchRows,columns} from './records.js';
test('XLSX round trip preserves all fields, categories, multiline text and literal formula-like strings',async()=>{
 const input={name:'=HYPERLINK("example")',categories:'Video, Access',description:'Line one\nLine two',address:'333 Bayview Ave\nAmityville\nNY\n11701-2800\nUnited States',stand:'0012',source:'https://example.com/company'};
 const book=new ExcelJS.Workbook();await book.xlsx.load(await workbook([input]));
 const sheet=book.worksheets[0];
 assert.deepEqual(sheet.getRow(1).values.slice(1),Object.values(columns));
 Object.keys(columns).forEach((key,i)=>assert.equal(sheet.getRow(2).getCell(i+1).value,input[key]??''));
 assert.equal(sheet.getRow(2).getCell(1).type,ExcelJS.ValueType.String);
 assert.equal(sheet.columnCount,11);assert.equal(sheet.rowCount,2);
});
test('search matches all exported fields without case sensitivity',()=>{
 const rows=[{name:'Acme',brands:'Door Brand'},{name:'Other',address:'333 Bayview Ave\nAmityville\nNY\n11701-2800\nUnited States',stand:'0012'}];
 assert.deepEqual(searchRows(rows,' DOOR '),[rows[0]]);
 assert.deepEqual(searchRows(rows,'0012'),[rows[1]]);
 assert.deepEqual(searchRows(rows,''),rows);
});

test('headers match the eleven-column client template exactly',()=>{
 assert.deepEqual(Object.values(columns),['Company Name','Website','email','LinkedIn URL','Why visit our stand','Description','Brands we will feature','Product Categories','Address','Stand(s) #','Source url']);
});
