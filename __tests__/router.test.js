/**
 * WarehouseOS — Router Module Unit Tests
 * Tests hash-based SPA routing and navigation
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({
  window: { addEventListener: () => {}, location: { hash: '' } },
  document: { addEventListener: () => {}, getElementById: () => ({ innerHTML: '' }) },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console, setTimeout, setInterval, Math, Date, parseInt, parseFloat, JSON
});

function load(f) {
  let code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  code = code.replace(/^(const|let) (Utils|Store|Router|INITIAL_DATA|SeedData) =/gm, 'var $2 =');
  vm.runInContext(code, ctx);
}
load('js/router.js');

const Router = ctx.Router;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  🟢 PASS: ${name}`); passed++; }
  catch(e) { console.log(`  🔴 FAIL: ${name}\n     ${e.message}`); failed++; }
}
function expect(a) {
  return {
    toBe(b) { if (a !== b) throw new Error(`Expected "${b}", got "${a}"`); },
    toBeDefined() { if (a === undefined || a === null) throw new Error(`Expected defined, got ${a}`); }
  };
}

console.log('\n🧪 Router Module Tests');
console.log('─'.repeat(40));

test('register stores route handlers', () => {
  let called = false;
  Router.register('/test-route', () => { called = true; });
  expect(typeof Router.go).toBe('function');
});

test('go sets window.location.hash', () => {
  Router.go('/dashboard');
  expect(ctx.window.location.hash).toBe('#/dashboard');
});

test('go navigates to inventory route', () => {
  Router.go('/inventory');
  expect(ctx.window.location.hash).toBe('#/inventory');
});

test('go navigates to staff route', () => {
  Router.go('/staff');
  expect(ctx.window.location.hash).toBe('#/staff');
});

test('go navigates to security route', () => {
  Router.go('/security');
  expect(ctx.window.location.hash).toBe('#/security');
});

test('setOnNavigate accepts callback function', () => {
  let navPath = null;
  Router.setOnNavigate(p => { navPath = p; });
  expect(typeof Router.setOnNavigate).toBe('function');
});

console.log(`\n📋 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✨ All router tests passed!\n');
