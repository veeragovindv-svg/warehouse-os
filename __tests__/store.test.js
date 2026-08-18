/**
 * WarehouseOS — Store Module Unit Tests
 * Tests reactive state management, CRUD operations, and data integrity
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({
  window: { addEventListener: () => {}, location: { hash: '' } },
  document: { addEventListener: () => {}, getElementById: () => ({ innerHTML: '', appendChild: () => {}, querySelector: () => null }) },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  console, setTimeout, setInterval, Math, Date, parseInt, parseFloat, JSON
});

function load(f) {
  let code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  code = code.replace(/^(const|let) (Utils|Store|Router|INITIAL_DATA|SeedData) =/gm, 'var $2 =');
  vm.runInContext(code, ctx);
}
load('js/utils.js');
load('js/data.js');
load('js/store.js');

const Store = ctx.Store;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  🟢 PASS: ${name}`); passed++; }
  catch(e) { console.log(`  🔴 FAIL: ${name}\n     ${e.message}`); failed++; }
}
function expect(a) {
  return {
    toBe(b) { if (a !== b) throw new Error(`Expected "${b}", got "${a}"`); },
    toBeDefined() { if (a === undefined || a === null) throw new Error(`Expected defined, got ${a}`); },
    toBeGreaterThan(b) { if (!(a > b)) throw new Error(`Expected ${a} > ${b}`); }
  };
}

console.log('\n🧪 Store Module Tests');
console.log('─'.repeat(40));

test('init loads seed data with products', () => {
  Store.init();
  expect(Store.get.products().length > 0).toBe(true);
});

test('init loads seed data with orders', () => {
  expect(Store.get.orders().length > 0).toBe(true);
});

test('init loads seed data with staff', () => {
  expect(Store.get.staff().length > 0).toBe(true);
});

test('kpiSummary returns valid metrics object', () => {
  const kpi = Store.get.kpiSummary();
  expect(kpi.totalOrders).toBeDefined();
  expect(kpi.fillRate).toBeDefined();
  expect(kpi.activeStaff).toBeDefined();
});

test('stockSummary returns inventory breakdown', () => {
  const summary = Store.get.stockSummary();
  expect(summary.total).toBeDefined();
  expect(summary.total).toBeGreaterThan(0);
});

test('adjustStock decreases product quantity correctly', () => {
  Store.init();
  const product = Store.get.products()[0];
  const before = product.quantity;
  Store.adjustStock(product.id, -3, 'Test pick', 'TST');
  const after = Store.get.productById(product.id).quantity;
  expect(after).toBe(before - 3);
});

test('addStaff creates new staff member with correct ID format', () => {
  Store.init();
  const before = Store.get.staff().length;
  const member = Store.addStaff({ name: 'QA Bot', role: 'Tester', zone: 'F', status: 'active' });
  expect(Store.get.staff().length).toBe(before + 1);
  expect(member.id.startsWith('ST-')).toBe(true);
  expect(member.name).toBe('QA Bot');
});

test('deleteStaff removes staff by ID', () => {
  Store.init();
  const member = Store.addStaff({ name: 'Temp Worker', role: 'Picker', zone: 'A' });
  const before = Store.get.staff().length;
  Store.deleteStaff(member.id);
  expect(Store.get.staff().length).toBe(before - 1);
});

test('addOrder creates order with pending status', () => {
  Store.init();
  const order = Store.addOrder({
    customer: 'Test Corp',
    priority: 'standard',
    items: [{ productId: 'PRD-051', name: 'Test Item', qty: 2 }]
  });
  expect(order.status).toBe('pending');
  expect(order.id.startsWith('ORD-')).toBe(true);
});

test('updateOrderStatus changes order state', () => {
  Store.init();
  const orders = Store.get.orders();
  const target = orders[0];
  Store.updateOrderStatus(target.id, 'dispatched');
  expect(Store.get.orderById(target.id).status).toBe('dispatched');
});

test('addAlert creates alert with pending status', () => {
  Store.init();
  const alert = Store.addAlert({ type: 'stock', severity: 'high', title: 'Test Alert', message: 'Unit test alert' });
  expect(alert.status).toBe('open');
  expect(alert.id).toBeDefined();
});

test('event emitter fires on state changes', () => {
  Store.init();
  let fired = false;
  Store.on('staff:changed', () => { fired = true; });
  Store.addStaff({ name: 'Event Test', role: 'Picker', zone: 'B' });
  expect(fired).toBe(true);
});

test('reset clears and reloads seed data', () => {
  Store.reset();
  expect(Store.get.products().length > 0).toBe(true);
});

console.log(`\n📋 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✨ All store tests passed!\n');
