/**
 * WarehouseOS — Security Module Unit Tests
 * Tests authentication, session management, input sanitization, and RBAC
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const mockElement = () => ({
  innerHTML: '', innerText: '', textContent: '', className: '', id: '',
  appendChild: () => mockElement(), removeChild: () => {}, remove: () => {},
  querySelector: () => null, querySelectorAll: () => [],
  setAttribute: () => {}, getAttribute: () => '', removeAttribute: () => {},
  addEventListener: () => {}, removeEventListener: () => {},
  classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  style: {}, dataset: {}, children: [], parentElement: null,
  insertAdjacentHTML: () => {}, focus: () => {}, click: () => {},
  getBoundingClientRect: () => ({ top:0, left:0, width:100, height:50 }),
  value: '', checked: false, type: '', name: '',
  options: [], selectedIndex: 0
});

const ctx = vm.createContext({
  window: { addEventListener: () => {}, location: { hash: '' }, speechSynthesis: { speak: () => {}, cancel: () => {}, getVoices: () => [] } },
  document: {
    addEventListener: () => {},
    getElementById: () => mockElement(),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => { const el = mockElement(); el.tagName = tag.toUpperCase(); return el; },
    createTextNode: (text) => ({ textContent: text }),
    body: { appendChild: () => {}, removeChild: () => {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, style: {} },
    head: { appendChild: () => {} }
  },
  localStorage: (() => { const s = {}; return { getItem: k => s[k]||null, setItem: (k,v) => s[k]=v, removeItem: k => delete s[k], clear: () => Object.keys(s).forEach(k=>delete s[k]) }; })(),
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  console, setTimeout, setInterval, clearTimeout: () => {}, clearInterval: () => {},
  Math, Date, parseInt, parseFloat, JSON, Array, Object, String, Number, Boolean, Error, RegExp, Map, Set, Promise,
  btoa: str => Buffer.from(str).toString('base64'), atob: str => Buffer.from(str,'base64').toString(),
  alert: () => {}, confirm: () => true, prompt: () => ''
});

function load(f) {
  let code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  code = code.replace(/^(const|let) (Utils|Store|Router|INITIAL_DATA|SeedData|AuthModule) =/gm, 'var $2 =');
  vm.runInContext(code, ctx);
}
load('js/utils.js');
load('js/data.js');
load('js/store.js');
load('js/router.js');
load('js/modules/auth.js');

const Utils = ctx.Utils;
const AuthModule = ctx.AuthModule;

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  \u{1F7E2} PASS: ${name}`); passed++; }
  catch(e) { console.log(`  \u{1F534} FAIL: ${name}\n     ${e.message}`); failed++; }
}
function expect(a) {
  return {
    toBe(b) { if (a !== b) throw new Error(`Expected "${b}", got "${a}"`); },
    toContain(s) { if (typeof a !== 'string' || !a.includes(s)) throw new Error(`Expected to contain "${s}"`); },
    toBeDefined() { if (a === undefined || a === null) throw new Error(`Expected defined, got ${a}`); }
  };
}

console.log('\n\u{1F9EA} Security Module Tests');
console.log('\u2500'.repeat(40));

test('sanitizeHTML escapes script tags', () => {
  expect(Utils.sanitizeHTML('<script>alert("xss")</script>')).toContain('&lt;script&gt;');
});

test('sanitizeHTML escapes HTML entities', () => {
  expect(Utils.sanitizeHTML('&<>"\'')).toContain('&amp;');
  expect(Utils.sanitizeHTML('&<>"\'')).toContain('&lt;');
  expect(Utils.sanitizeHTML('&<>"\'')).toContain('&gt;');
});

test('sanitizeHTML handles null and non-string input', () => {
  expect(Utils.sanitizeHTML(null)).toBe('');
  expect(Utils.sanitizeHTML(undefined)).toBe('');
  expect(Utils.sanitizeHTML(123)).toBe('');
});

test('sanitizeInput strips dangerous characters', () => {
  expect(Utils.sanitizeInput('<script>')).toBe('script');
  expect(Utils.sanitizeInput('normal text')).toBe('normal text');
});

test('sanitizeInput trims whitespace', () => {
  expect(Utils.sanitizeInput('  hello  ')).toBe('hello');
});

test('AuthModule login rejects invalid credentials', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  const result = AuthModule.login('bad@email.com', 'wrongpass');
  expect(result.success).toBe(false);
});

test('AuthModule login accepts valid admin credentials', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  const result = AuthModule.login('admin@warehouse.os', 'admin');
  expect(result.success).toBe(true);
  expect(result.user.name).toBe('Veera Govind');
});

test('AuthModule isAdmin returns true for admin user', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  AuthModule.login('admin@warehouse.os', 'admin');
  expect(AuthModule.isAdmin()).toBe(true);
});

test('AuthModule isAdmin returns false for staff user', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  AuthModule.login('alex@warehouse.os', 'staff');
  expect(AuthModule.isAdmin()).toBe(false);
});

test('AuthModule register creates new user and auto-logs in', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  const res = AuthModule.register({ name: 'Test User', email: 'test@test.com', password: 'pass123', role: 'Staff' });
  expect(res.success).toBe(true);
  expect(res.user.email).toBe('test@test.com');
});

test('AuthModule register rejects duplicate emails', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  AuthModule.register({ name: 'User A', email: 'dup@test.com', password: 'pass' });
  const res = AuthModule.register({ name: 'User B', email: 'dup@test.com', password: 'pass' });
  expect(res.success).toBe(false);
});

test('AuthModule getCurrentUser returns user object', () => {
  ctx.localStorage.clear();
  AuthModule.init();
  const user = AuthModule.getCurrentUser();
  expect(user).toBeDefined();
  expect(user.name).toBeDefined();
});

console.log(`\n\u{1F4CB} Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('\u2728 All security tests passed!\n');
