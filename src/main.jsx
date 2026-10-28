import React, {useEffect, useState, useRef} from 'react';
import {Search, Download, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight} from 'lucide-react';
import {createRoot} from 'react-dom/client';
import {SOURCE, columns} from '../records.js';
import './style.css';

function Cell({value, field, company}) {
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const content = useRef(null);
  useEffect(() => {
    const element = content.current;
    const measure = () => setOverflow(element.scrollHeight > parseFloat(getComputedStyle(element).lineHeight) * 3 + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(element);measure();
    return () => observer.disconnect();
  }, [value]);
  const id = React.useId();
  const text = value || '—';
  return <div className="cell">
    <div id={id} ref={content} className={'cell-content' + (expanded ? ' expanded' : '')}>
      {value && field === 'website' ? value.split('\n').map((url,i) => <React.Fragment key={url}>{i > 0 && <br/>}<a href={url} target="_blank" rel="noreferrer">{url}</a></React.Fragment>)
        : value && ['linkedin','source'].includes(field) ? <a href={value} target="_blank" rel="noreferrer">{value}</a>
        : value && field === 'email' ? <a href={'mailto:' + value}>{value}</a> : text}
    </div>
    {overflow && <button className="cell-toggle" aria-expanded={expanded} aria-controls={id} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${columns[field]} for ${company}`} onClick={() => setExpanded(!expanded)}>{expanded ? '⌄' : '>'}</button>}
  </div>;
}

function App() {
  const [data, setData] = useState({rows:[],page:1,pages:1,total:0,totalRecords:0});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller=new AbortController();
    setLoading(true);setError('');
    fetch('/api/exhibitors?q='+encodeURIComponent(search)+'&page='+page,{signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error('Unable to load exhibitors. Refresh to try again.');
      const result=await response.json();
      if(!controller.signal.aborted)setData({...result,query:search,loaded:true});
    }).catch(e => {if(!controller.signal.aborted)setError(e.message);}).finally(() => {if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  }, [search,page]);
  const visible = data.rows;
  const start=data.total?(data.page-1)*10+1:0;
  const end=data.total?(data.page-1)*10+data.rows.length:0;
  return <><header className="brandbar"><div className="brand"><img src="/logo.svg" alt=""/><span>Standlist</span></div><a href={SOURCE + '#/'} target="_blank" rel="noreferrer">Discover ISC <ArrowUpRight size={16}/></a></header><main>
    <div className="page-heading"><div><p className="eyebrow">Exhibitor directory · 2025</p><h1>ISC West exhibitors</h1><p className="intro">Search company profiles, explore product categories and export to Excel.</p></div><span className="dataset"><span className="dot"/>{data.loaded ? data.totalRecords.toLocaleString() : '…'} exhibitors</span></div>
    <div className="toolbar">
      <label className="search"><Search size={19}/><input type="search" aria-label="Search exhibitors" placeholder="Search exhibitors…" value={search} onChange={e => {setSearch(e.target.value);setPage(1);setSelected(null);}}/></label>
      <a className="export" aria-disabled={!visible.length} href={visible.length ? '/api/export?q=' + encodeURIComponent(data.query || '') : undefined}><Download size={17}/>Export to Excel</a>
    </div>
    <p className="count" role="status">{!data.loaded ? (loading ? 'Loading…' : '') : `${start}–${end} of ${data.total} exhibitors${data.query ? ` (${data.totalRecords} total)` : ''}`}</p>
    {error && <p role="alert">{error}</p>}
    <div className="table-scroll"><table aria-busy={loading}><thead><tr><th>Company</th><th>Product categories</th><th>Website</th><th>Stand</th></tr></thead>
      <tbody>{visible.map(row => <React.Fragment key={row.source}><tr className={selected === row.source ? 'selected' : ''}>
        <td><button className="company" aria-expanded={selected === row.source} aria-controls={'details-' + visible.indexOf(row)} onClick={() => setSelected(selected === row.source ? null : row.source)}>{row.name}<ChevronDown size={16}/></button><span className="company-hint">View exhibitor details</span></td>
        <td><Cell value={row.categories} field="categories" company={row.name}/></td>
        <td>{row.website ? row.website.split('\n').map(url => <a className="website" key={url} href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}<ArrowUpRight size={13}/></a>) : <span className="muted">—</span>}</td>
        <td><span className="stand">{row.stand || '—'}</span></td>
      </tr>{selected === row.source && <tr className="detail-row"><td colSpan="4"><dl id={'details-' + visible.indexOf(row)}>{Object.entries(columns).map(([field,label]) => <div key={field}><dt>{label}</dt><dd><Cell value={row[field]} field={field} company={row.name}/></dd></div>)}</dl></td></tr>}</React.Fragment>)}</tbody>
    </table></div>
    <nav className="pagination" aria-label="Table pagination">
      <button disabled={loading||!!error||data.page<=1} onClick={()=>setPage(data.page-1)}><ChevronLeft size={16}/>Previous</button>
      <span>Page {data.page} of {data.pages}</span>
      <button disabled={loading||!!error||data.page>=data.pages} onClick={()=>setPage(data.page+1)}>Next<ChevronRight size={16}/></button>
    </nav>
    {!loading && !error && !visible.length && <div className="empty"><h2>{search ? 'No matching exhibitors' : 'No exhibitors collected yet'}</h2>{search && <button onClick={() => {setSearch('');setPage(1);}}>Clear search</button>}</div>}
    <footer>Source: <a href={SOURCE + '#/'} target="_blank" rel="noreferrer">ISC West 2025 directory <ArrowUpRight size={13}/></a><span>All 11 fields included in Excel exports</span></footer>
  </main></>;
}
createRoot(document.getElementById('root')).render(<App/>);
