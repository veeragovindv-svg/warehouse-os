/* ============================================================
   WarehouseOS — router.js
   Hash-based client-side router
   ============================================================ */

const Router = (() => {
  const routes = {};
  let currentRoute = null;
  let onNavigate = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function go(path, params = {}) {
    window.location.hash = '#' + path;
  }

  function getCurrentPath() {
    const hash = window.location.hash;
    if (!hash || hash === '#') return '/';
    return hash.replace('#', '').split('?')[0];
  }

  function dispatch() {
    const path = getCurrentPath();
    const handler = routes[path] || routes['/'];
    if (!handler) return;

    currentRoute = path;

    // Update page content
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    // Render the module
    if (onNavigate) onNavigate(path);
    handler(pageContent);
  }

  function setOnNavigate(fn) {
    onNavigate = fn;
  }

  function getCurrent() {
    return currentRoute;
  }

  // Listen for hash changes
  window.addEventListener('hashchange', dispatch);
  // Initial dispatch on load
  document.addEventListener('DOMContentLoaded', () => setTimeout(dispatch, 0));

  return { register, go, dispatch, getCurrent, setOnNavigate };
})();
