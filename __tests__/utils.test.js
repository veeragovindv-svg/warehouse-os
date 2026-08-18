/**
 * WarehouseOS — Utils Module Unit Tests
 * Tests formatting helpers, sanitization, and utility functions
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Setup browser mocks
const ctx = vm.createContext({
  window: { addEventListener: () => {}, location: { hash: '' } },
  document: { addEventListener: () => {}, getElementById: () => ({ innerHTML: '', appendChild: () => {}, querySelector: () => null }) },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  console, setTimeout, setInterval, Math, Date, parseInt, parseFloat, JSON,
  AudioContext: class { createOscillator() { return { type:'', frequency: { setValueAtTime(){}, linearRampToValueAtTime(){} }, connect(){}, start(){}, stop(){} }; } createGain() { return { gain: { setValueAtTime(){}, linearRampToValueAtTime(){} }, connect(){} }; } get destination() { return {}; } }
});

function load(f) {
  let code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  code = code.replace(/^(const|let) (Utils|Store|Router|INITIAL_DATA|SeedData) =/gm, 'var $2 =');
  vm.runInContext(code, ctx);
}
load('js/utils.js');

const Utils = ctx.Utils;

// Test runner
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  🟢 PASS: ${name}`); passed++; }
  catch(e) { console.log(`  🔴 FAIL: ${name}\n     ${e.message}`); failed++; }
}
function expect(a) {
  return {
    toBe(b) { if (a !== b) throw new Error(`Expected "${b}", got "${a}"`); },
    toContain(s) { if (!a.includes(s)) throw new Error(`Expected "${a}" to contain "${s}"`); },
    toBeDefined() { if (a === undefined || a === null) throw new Error(`Expected defined, got ${a}`); }
  };
}

console.log('\n🧪 Utils Module Tests');
console.log('─'.repeat(40));

test('currency formats with dollar sign and decimals', () => {
  expect(Utils.currency(1234.5)).toBe('$1,234.50');
  expect(Utils.currency(0)).toBe('$0.00');
  expect(Utils.currency(99.999)).toBe('$100.00');
});

test('percent calculates rounded percentage string', () => {
  expect(Utils.percent(5, 10)).toBe('50%');
  expect(Utils.percent(1, 3)).toBe('33%');
  expect(Utils.percent(0, 0)).toBe('0%');
});

test('timeAgo returns human-readable relative time', () => {
  const now = Date.now();
  expect(Utils.timeAgo(new Date(now - 10000).toISOString())).toBe('just now');
  expect(Utils.timeAgo(new Date(now - 120000).toISOString())).toBe('2m ago');
  expect(Utils.timeAgo(new Date(now - 7200000).toISOString())).toBe('2h ago');
});

test('formatDate returns formatted date string', () => {
  expect(Utils.formatDate(null)).toBe('—');
  const d = Utils.formatDate('2025-06-15T10:00:00Z');
  expect(d).toContain('Jun');
});

test('dueUrgency returns correct urgency level', () => {
  expect(Utils.dueUrgency(null)).toBe('ok');
  expect(Utils.dueUrgency(new Date(Date.now() - 86400000).toISOString())).toBe('overdue');
  expect(Utils.dueUrgency(new Date(Date.now() + 3600000).toISOString())).toBe('urgent');
});

test('stockClass returns correct stock status', () => {
  expect(Utils.stockClass(0, 10)).toBe('critical');
  expect(Utils.stockClass(5, 10)).toBe('low');
  expect(Utils.stockClass(50, 10)).toBe('healthy');
});

test('sanitizeHTML escapes HTML entities', () => {
  expect(Utils.sanitizeHTML('<script>alert(1)</script>')).toContain('&lt;');
  expect(Utils.sanitizeHTML('"quoted"')).toContain('&quot;');
  expect(Utils.sanitizeHTML('')).toBe('');
  expect(Utils.sanitizeHTML(null)).toBe('');
});

test('sanitizeInput strips dangerous characters', () => {
  expect(Utils.sanitizeInput('<b>bold</b>')).toBe('bbold/b');
  expect(Utils.sanitizeInput('  hello  ')).toBe('hello');
  expect(Utils.sanitizeInput(123)).toBe('');
});

test('uid generates unique identifiers with prefix', () => {
  const id1 = Utils.uid('TEST-');
  const id2 = Utils.uid('TEST-');
  expect(id1).toContain('TEST-');
  expect(id1 !== id2).toBe(true);
});

test('debounce returns a function', () => {
  const fn = Utils.debounce(() => {}, 100);
  expect(typeof fn).toBe('function');
});

console.log(`\n📋 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✨ All utils tests passed!\n');
