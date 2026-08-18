/**
 * WarehouseOS — Unit Test Runner
 * Self-contained node runner that executes unit tests for core modules.
 */

const fs = require('fs');
const path = require('path');

// 1. Mock Browser Environment for Node.js Execution
global.window = {
  addEventListener: () => {},
  location: { hash: '' }
};
global.document = {
  addEventListener: () => {},
  DOMContentLoaded: true,
  getElementById: () => ({
    innerHTML: '',
    appendChild: () => {},
    querySelector: () => null
  })
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
global.navigator = {
  clipboard: {
    writeText: () => Promise.resolve()
  }
};
global.location = global.window.location;

// 2. Load Core Application Source Code in VM Context
const vm = require('vm');
const testContext = vm.createContext({
  window: global.window,
  document: global.document,
  localStorage: global.localStorage,
  navigator: global.navigator,
  console: console,
  setTimeout: setTimeout,
  setInterval: setInterval,
  Math: Math,
  Date: Date,
  parseInt: parseInt,
  parseFloat: parseFloat,
  JSON: JSON
});

function loadScript(filePath) {
  let code = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  // Convert const declarations to var so they bind to the VM context properties
  code = code.replace(/^(const|let) (Utils|Store|Router|INITIAL_DATA) =/gm, 'var $2 =');
  vm.runInContext(code, testContext);
}

console.log('🧪 Initializing WarehouseOS Core Test Suite...');
loadScript('js/utils.js');
loadScript('js/data.js');
loadScript('js/store.js');
loadScript('js/router.js');

global.Utils = testContext.Utils;
global.Store = testContext.Store;
global.Router = testContext.Router;

// 3. Define Lightweight Test Assertions Library
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected: "${expected}" (type: ${typeof expected}), Got: "${actual}" (type: ${typeof actual})`);
      }
    },
    toEqual(expected) {
      const actStr = JSON.stringify(actual);
      const expStr = JSON.stringify(expected);
      if (actStr !== expStr) {
        throw new Error(`Expected equality:\nExp: ${expStr}\nGot: ${actStr}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got: ${actual}`);
      }
    },
    toContain(sub) {
      if (!actual || !actual.includes(sub)) {
        throw new Error(`Expected: "${actual}" to contain: "${sub}"`);
      }
    }
  };
}

// ─── UNIT TESTS DEFINITION ───────────────────────────────────

// Test Suite: Utils Formatting Helpers
test('Utils.currency formatting should append dollar sign and thousand separators', () => {
  expect(Utils.currency(1234.5)).toBe('$1,234.50');
  expect(Utils.currency(0)).toBe('$0.00');
});

test('Utils.percent should calculate rounded string percent representation', () => {
  expect(Utils.percent(5, 10)).toBe('50%');
  expect(Utils.percent(1, 3)).toBe('33%');
  expect(Utils.percent(0, 5)).toBe('0%');
});

test('Utils.timeAgo should format timestamp differences into readable strings', () => {
  const now = Date.now();
  expect(Utils.timeAgo(new Date(now - 10000).toISOString())).toBe('just now');
  expect(Utils.timeAgo(new Date(now - 120000).toISOString())).toBe('2m ago');
});

// Test Suite: Reactive Store Management
test('Store should load initial seed products and metrics', () => {
  Store.init();
  const products = Store.get.products();
  expect(products.length > 0).toBe(true);
  
  const kpis = Store.get.kpiSummary();
  expect(kpis.totalOrders).toBeDefined();
});

test('Store.adjustStock should modify quantities and record movements', () => {
  Store.init();
  const products = Store.get.products();
  const target = products[0];
  const initialQty = target.quantity;
  
  Store.adjustStock(target.id, -2, 'Order Fulfillment Pick', 'ORD-100');
  expect(Store.get.productById(target.id).quantity).toBe(initialQty - 2);
});

test('Store.addStaff should register personnel on roster', () => {
  Store.init();
  const initialCount = Store.get.staff().length;
  Store.addStaff({
    name: 'Test Engineer',
    role: 'QA Automation Lead',
    zone: 'E',
    status: 'active'
  });
  expect(Store.get.staff().length).toBe(initialCount + 1);
});

// Test Suite: Client Routing
test('Router should register paths and recall current active path', () => {
  const mockHandler = () => {};
  Router.register('/mock-path', mockHandler);
  Router.go('/mock-path');
  expect(global.window.location.hash).toBe('#/mock-path');
});

// ─── EXECUTE ALL TESTS ───────────────────────────────────────
let passed = 0;
let failed = 0;

console.log('\n🏃 Running assertions...');

tests.forEach(t => {
  try {
    t.fn();
    console.log(`  🟢 PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.log(`  🔴 FAIL: ${t.name}`);
    console.error(`     Error: ${err.message}\n`);
    failed++;
  }
});

console.log(`\n📋 Test Run Results: ${passed} Passed, ${failed} Failed`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✨ All tests completed successfully!');
  process.exit(0);
}
