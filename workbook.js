import ExcelJS from 'exceljs';
import {columns} from './records.js';
export async function workbook(rows) {
 const book=new ExcelJS.Workbook();
 const sheet=book.addWorksheet('ICS West Exhibitors');
 sheet.columns=Object.entries(columns).map(([key,header])=>({key,header,width:['description','why','categories'].includes(key)?60:30}));
 for(const row of rows) sheet.addRow(Object.fromEntries(Object.keys(columns).map(key=>[key,String(row[key]??'')])));
 sheet.views=[{state:'frozen',ySplit:1}];
 sheet.autoFilter={from:'A1',to:'K'+(rows.length+1)};
 sheet.getRow(1).font={bold:true};
 sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
 return book.xlsx.writeBuffer();
}
