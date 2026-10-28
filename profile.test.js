import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseHTML } from 'linkedom';
import { categoriesExpanded, extractProfile, readProfile } from './profile.js';

const records = JSON.parse(fs.readFileSync(new URL('./test/fixtures/spot-checks.json', import.meta.url)));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const categories = {
  'CHeKT Visual Security': ['Alarm Monitoring Software', 'Central Station Monitoring Services', 'Proprietary Monitoring Systems', 'Outdoor Intrusion Sensors', 'Perimeter & Barrier Protection', 'Vehicle Detection', 'Video Motion Detectors', 'Burglar Alarms', 'AI & Machine Learning', 'Edge Device Security', 'Cloud Storage'],
  'Alarm.com': [],
  'KBC Networks': ['Data Transmission', 'Switches', 'Video Transmission Equipment', 'Wireless Communication Equipment'],
  'Zygal': ['Managed Services', 'Video Management Software/System', 'Video Motion Detectors', 'Central Monitoring'],
  'Deep Sentinel': ['Proprietary Monitoring Systems', 'Perimeter Barriers/Deterrents/Bollards', 'Detection', 'Guard Companies/Equipment', 'Incident Reporting', 'Physical Security', 'Commercial Security', 'Residential Security', 'Video Motion Detectors', 'Bells/Sirens', 'AI & Machine Learning'],
  'DEGSON TECHNOLOGY CO.,LTD': ['Alarm Monitoring Software', 'Central Station Equipment', 'Central Station Monitoring Services', 'Proprietary Monitoring Systems', 'Personal Emergency Response Services', 'Physical Security Information Management', 'Climate Control', 'Custom Installed Sound & Video Systems', 'Digital Doorbells', 'Video Management Software/System', 'Door Panels', 'Annunciators', 'Batteries/Power Supplies', 'Bells/Sirens', 'Burglar Alarms', 'Controls/Control Panels/Control Communicators', 'Fire Alarm', 'Sounding Devices', 'Temperature Alarms', 'Wireless Alarm Equipment', 'DIY', 'Central Monitoring', 'Network Security Products', 'Telecommunications Security Products', 'Wireless Security Products', 'Installation - Tools, Supplies, Accessories'],
};

// Reduced fixtures preserve the source's section IDs, tag markup, and social ordering.
function fixture(record, expanded = true) {
  const productCategories = categories[record.name];
  const section = (id, title, value) => value ? `<div id="${id}"><h2>${title}</h2><p>${escape(value)}</p></div>` : '';
  const tags = productCategories.slice(0, expanded ? undefined : 3).map(value => `<span data-testid="filter-tag">${escape(value)}</span>`).join('');
  const { document } = parseHTML(`<html><body><div id="exhibitor-details">
    <h1>${escape(record.name)}</h1>
    ${section('exhibitor_details_showobjective', 'Why visit our stand', record.why)}
    ${section('exhibitor_details_description', 'Description', record.description)}
    ${section('exhibitor_details_brands', 'Brands we will feature', record.brands)}
    <div data-dtm-category-name="Features"><span data-testid="filter-tag">International</span></div>
    <div data-dtm-category-name="Is your company a diverse-owned business?"><span data-testid="filter-tag">Veteran Owned Business</span></div>
    ${productCategories.length ? `<div data-dtm-category-name="Product Categories" data-dtm-responses="${escape(JSON.stringify(productCategories.map(name => ({ name }))))}">${tags}</div>` : ''}
    <div>Stand(s): ${escape(record.stand)}</div>
    <h2>FOLLOW US</h2><a href="https://www.facebook.com/example">FACEBOOK</a><a href="https://www.youtube.com/example">YOUTUBE</a><a href="${escape(record.linkedin)}">LINKEDIN</a>
    <h2>COMPANY CONTACTS</h2><a href="${escape(record.website)}">${escape(record.website)}</a><a href="mailto:${record.email}">${record.email}</a>
    </div><footer><a href="mailto:inquiry@isc.reedexpo.com">Event email</a><a href="https://www.linkedin.com/company/isc-security-events/">Event LinkedIn</a></footer></body></html>`);
  return document.querySelector('#exhibitor-details');
}

for (const record of records) {
  test(`verified ${record.name} profile preserves every extracted field`, () => {
    const { source, ...expected } = record;
    assert.deepEqual(extractProfile(fixture(record)), {...expected,address:''});
  });
}

test('absent brands and categories stay blank instead of borrowing footer data', () => {
  assert.equal(extractProfile(fixture(records.find(r => r.name === 'CHeKT Visual Security'))).brands, '');
  assert.equal(extractProfile(fixture(records.find(r => r.name === 'Alarm.com'))).categories, '');
  const root = fixture(records[0]);
  root.querySelector('a[href^="mailto:"]').remove();
  root.querySelector('a[href*="linkedin.com"]').remove();
  const result = extractProfile(root);
  assert.equal(result.email, '');
  assert.equal(result.linkedin, '');
});

test('shared stand 14039 is retained for both CHeKT and Alarm.com', () => {
  for (const name of ['CHeKT Visual Security', 'Alarm.com']) {
    assert.equal(extractProfile(fixture(records.find(r => r.name === name))).stand, '14039');
  }
});

test('category readiness rejects the incomplete lists found during spot checks', () => {
  for (const name of ['KBC Networks', 'Zygal', 'Deep Sentinel']) {
    const record = records.find(r => r.name === name);
    assert.equal(categoriesExpanded(fixture(record, false)), false, name);
    assert.equal(categoriesExpanded(fixture(record)), true, name);
  }
  assert.equal(categoriesExpanded(null), false);
  assert.equal(categoriesExpanded(fixture(records.find(r => r.name === 'Alarm.com'))), true);
});

test('DEGSON preserves the comma-containing category and excludes features and ownership', () => {
  const root = fixture(records.find(r => r.name === 'DEGSON TECHNOLOGY CO.,LTD'));
  assert.equal(root.querySelectorAll('[data-dtm-category-name="Product Categories"] [data-testid="filter-tag"]').length, 26);
  const result = extractProfile(root);
  assert.ok(result.categories.endsWith('Installation - Tools, Supplies, Accessories'));
  assert.ok(!result.categories.includes('International'));
  assert.ok(!result.categories.includes('Veteran Owned Business'));
});

test('readProfile waits for asynchronous category expansion before extracting', async () => {
  const record = records.find(r => r.name === 'Deep Sentinel');
  let root = fixture(record, false);
  let release;
  const expansion = new Promise(resolve => { release = resolve; });
  let waiting;
  const reachedWait = new Promise(resolve => { waiting = resolve; });
  const page = {
    getByRole: (_role, { name }) => name === 'Show all categories'
      ? { count: async () => 1, click: async () => {} }
      : { waitFor: async () => {} },
    waitForFunction: async predicate => {
      assert.equal(predicate(root), false);
      waiting();
      await expansion;
      assert.equal(predicate(root), true);
    },
    locator: () => ({ evaluate: async fn => fn(root) }),
  };
  let finished = false;
  const read = readProfile(page).then(value => { finished = true; return value; });
  await reachedWait;
  assert.equal(finished, false, 'must not export the three initially visible categories');
  root = fixture(record);
  release();
  assert.equal((await read).categories, record.categories);
});

test('readProfile handles profiles with no expansion control', async () => {
  const record = records.find(r => r.name === 'Alarm.com');
  const page = {
    getByRole: () => ({ count: async () => 0 }),
    waitForFunction: () => { throw Error('No category expansion expected'); },
    locator: () => ({ evaluate: async fn => fn(fixture(record)) }),
  };
  assert.equal((await readProfile(page)).categories, '');
});


test('Napco address preserves the client template lines and excludes footer addresses',()=>{
 const {document}=parseHTML('<div id="exhibitor-details"><h1>Napco</h1><div id="exhibitor_details_address"><h2>ADDRESS</h2><p><span>333 Bayview Ave</span><span>Amityville</span><span>NY</span><span>11701-2800</span><span>United States</span></p></div></div><footer>Event address</footer>');
 assert.equal(extractProfile(document.querySelector('#exhibitor-details')).address,'333 Bayview Ave\nAmityville\nNY\n11701-2800\nUnited States');
});

 test('multiple published websites remain separate usable URLs',()=>{
 const {document}=parseHTML('<div id="exhibitor-details"><h1>Bold</h1><a href="https://www.boldgroup.com, https://www.securitysoftware.com">https://www.boldgroup.com, https://www.securitysoftware.com</a></div>');
 assert.equal(extractProfile(document.querySelector('#exhibitor-details')).website,'https://www.boldgroup.com\nhttps://www.securitysoftware.com');
});
