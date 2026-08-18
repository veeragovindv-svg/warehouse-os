/**
 * WarehouseOS — Accessibility Compliance Tests
 * Validates semantic HTML, ARIA attributes, and a11y best practices
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  \u{1F7E2} PASS: ${name}`); passed++; }
  catch(e) { console.log(`  \u{1F534} FAIL: ${name}\n     ${e.message}`); failed++; }
}
function expect(a) {
  return {
    toBe(b) { if (a !== b) throw new Error(`Expected "${b}", got "${a}"`); },
    toContain(s) { if (!a.includes(s)) throw new Error(`Expected HTML to contain: ${s}`); },
    toBeGreaterThan(b) { if (!(a > b)) throw new Error(`Expected ${a} > ${b}`); }
  };
}

console.log('\n\u{1F9EA} Accessibility Compliance Tests');
console.log('\u2500'.repeat(40));

test('HTML document has lang attribute', () => {
  expect(html).toContain('lang="en"');
});

test('page has skip-to-content link', () => {
  expect(html).toContain('class="skip-link"');
  expect(html).toContain('Skip to main content');
});

test('page has semantic <main> element', () => {
  expect(html).toContain('<main');
});

test('page has semantic <header> with role="banner"', () => {
  expect(html).toContain('role="banner"');
});

test('page has semantic <nav> with aria-label', () => {
  expect(html).toContain('<nav');
  expect(html).toContain('aria-label="Main navigation"');
});

test('page has semantic <aside> for sidebar', () => {
  expect(html).toContain('<aside');
});

test('page has role="contentinfo" for footer region', () => {
  expect(html).toContain('role="contentinfo"');
});

test('page has breadcrumb navigation with aria-label', () => {
  expect(html).toContain('aria-label="Breadcrumb"');
});

test('all icon-only buttons have aria-label', () => {
  expect(html).toContain('aria-label="Toggle menu"');
  expect(html).toContain('aria-label="Collapse sidebar"');
  expect(html).toContain('aria-label="View alerts"');
  expect(html).toContain('aria-label="Refresh data"');
  expect(html).toContain('aria-label="Toggle Dark / Light Mode"');
});

test('search input has aria-label', () => {
  expect(html).toContain('aria-label="Search directory for orders, SKUs, or bins"');
});

test('alert badge has role="status" and aria-live', () => {
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite"');
});

test('logo image has alt text', () => {
  expect(html).toContain('alt="WarehouseOS Logo"');
});

test('decorative SVGs have aria-hidden', () => {
  const ariaHiddenCount = (html.match(/aria-hidden="true"/g) || []).length;
  expect(ariaHiddenCount).toBeGreaterThan(0);
});

test('page has meta description for SEO', () => {
  expect(html).toContain('<meta name="description"');
});

test('page has security CSP meta header', () => {
  expect(html).toContain('Content-Security-Policy');
});

test('page has X-Frame-Options security header', () => {
  expect(html).toContain('X-Frame-Options');
});

console.log(`\n\u{1F4CB} Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('\u2728 All accessibility tests passed!\n');
