// Functions passed to Playwright must be self-contained when serialized.
export function categoriesExpanded(root = document.querySelector('#exhibitor-details')) {
  if (!root) return false;
  return [...root.querySelectorAll('[data-dtm-category-name="Product Categories"]')].every(element => {
    const responses = JSON.parse(element.getAttribute('data-dtm-responses') || '[]');
    return element.querySelectorAll('[data-testid="filter-tag"]').length === responses.length;
  });
}

export function extractProfile(root) {
  const text = id => {
    const element = root.querySelector('#' + id);
    return element ? element.innerText.replace(element.querySelector('h2')?.innerText || '', '').trim() : '';
  };
  const anchors = [...root.querySelectorAll('a[href]')];
  const href = pattern => anchors.find(anchor => pattern.test(anchor.href))?.href || '';
  const website=anchors.find(anchor=>/^https?:/.test(anchor.textContent.trim()));
  const websiteUrls=(website?.getAttribute('href')||'').match(/https?:\/\/[^\s,]+/g)||[];
  return {
    name: root.querySelector('h1')?.innerText.trim(),
    website: websiteUrls.length>1?websiteUrls.join('\n'):website?.href||'',
    email: href(/^mailto:/).replace('mailto:', '').split('?')[0],
    stand: root.innerText.match(/Stand\(s\):\s*([^\n]+)/)?.[1]?.trim() || '',
    linkedin: href(/linkedin\.com\/company\//),
    why: text('exhibitor_details_showobjective'),
    description: text('exhibitor_details_description'),
    brands: text('exhibitor_details_brands'),
    address: [...root.querySelectorAll('#exhibitor_details_address p span')].map(element=>element.innerText.trim()).filter(Boolean).join('\n') || text('exhibitor_details_address'),
    categories: [...root.querySelectorAll('[data-dtm-category-name="Product Categories"] [data-testid="filter-tag"]')]
      .map(element => element.innerText.trim()).join(', '),
  };
}

export async function readProfile(page) {
  const more = page.getByRole('button', { name: 'Show all categories', exact: true });
  if (await more.count()) {
    await more.click();
    await page.getByRole('button', { name: 'Show fewer categories', exact: true })
      .waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(categoriesExpanded, undefined, { timeout: 10000 });
  }
  return page.locator('#exhibitor-details').evaluate(extractProfile);
}
