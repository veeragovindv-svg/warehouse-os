/* ============================================================
   WarehouseOS — app.js
   Application entry point: module registry, nav, global events
   ============================================================ */

(function () {

  // ─── NAV CONFIG ────────────────────────────────────────────
  const NAV_ITEMS = [
    {
      section: 'Operations',
      items: [
        { path:'/dashboard',  label:'Dashboard',       icon:'📊', handler: renderDashboard },
        { path:'/inventory',  label:'Inventory',       icon:'📦', handler: c => InventoryModule.render(c) },
        { path:'/map',        label:'3D Floor Map',    icon:'🗺️', handler: c => WarehouseMapModule.render(c) },
        { path:'/orders',     label:'Orders',          icon:'🛒', handler: c => OrdersModule.render(c) },
        { path:'/allocation', label:'Allocation',      icon:'🔄', handler: c => AllocationModule.render(c) },
        { path:'/picking',    label:'Picking & Packing', icon:'👷', handler: c => PickingModule.render(c) },
      ]
    },
    {
      section: 'Management',
      items: [
        { path:'/alerts',      label:'Alert Center',      icon:'🚨', handler: c => AlertsModule.render(c),  badge: () => Store.get.openAlerts().length || null },
        { path:'/dispatch',    label:'Dispatch',          icon:'🚚', handler: c => DispatchModule.render(c) },
        { path:'/analytics',   label:'Analytics',         icon:'📈', handler: c => AnalyticsModule.render(c) },
        { path:'/help',        label:'AI Help & Copilot', icon:'🤖', handler: c => AICopilotModule.renderPage(c) },
        { path:'/video-guide', label:'How to Run Video',  icon:'🎬', handler: c => VideoGuideModule.render(c) },
      ]
    },
    {
      section: 'Predictive ML',
      items: [
        { path:'/markov',            label:'Markov Demand Model',  icon:'🔮', handler: c => MarkovPredictorModule.render(c) },
        { path:'/data-intelligence', label:'Unified Hub (Split)',   icon:'🧠', handler: c => DataIntelligenceModule.render(c) },
      ]
    },
    {
      section: 'Admin & Staff',
      items: [
        { path:'/staff',    label:'Staff & Add New Staff', icon:'👥', handler: c => StaffModule.render(c), badge: () => Store.get.staff().length || null },
        { path:'/security', label:'Security & Audit Logs', icon:'🛡️', handler: c => AuthModule.renderSecurityPage(c) },
      ]
    }
  ];

  // ─── ROUTER SETUP ──────────────────────────────────────────
  function setupRoutes() {
    NAV_ITEMS.forEach(section => {
      section.items.forEach(item => {
        Router.register(item.path, item.handler);
      });
    });

    // Default & Auth routes
    Router.register('/', renderDashboard);
    Router.register('/login', c => AuthModule.renderLoginPage(c));

    // After each navigation, update active nav + breadcrumb
    Router.setOnNavigate(path => {
      if (path !== '/ar' && window.ARModule?.cleanup) {
        ARModule.cleanup();
      }
      updateActiveNav(path);
      updateBreadcrumb(path);
      updateTopBarStats();
      updateAlertBadge();
    });
  }

  // ─── NAV RENDERING ─────────────────────────────────────────
  function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = NAV_ITEMS.map(section => `
      <div class="sidebar-section-label" role="group" aria-label="${section.section}">${section.section}</div>
      ${section.items.map(item => {
        const badge = item.badge ? item.badge() : null;
        return `
        <a class="nav-item" data-path="${item.path}" href="#${item.path}" 
           role="menuitem" aria-label="${item.label}">
          <span class="nav-icon" aria-hidden="true">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
          ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
        </a>`;
      }).join('')}
    `).join('');
  }

  function updateActiveNav(path) {
    Utils.qsa('.nav-item').forEach(item => {
      const isActive = item.dataset.path === path;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    // Refresh badge counts
    NAV_ITEMS.forEach(section => {
      section.items.forEach(item => {
        if (!item.badge) return;
        const navEl = Utils.qs(`.nav-item[data-path="${item.path}"]`);
        if (!navEl) return;
        let badgeEl = navEl.querySelector('.nav-badge');
        const count = item.badge();
        if (count) {
          if (!badgeEl) {
            badgeEl = document.createElement('span');
            badgeEl.className = 'nav-badge';
            navEl.appendChild(badgeEl);
          }
          badgeEl.textContent = count;
        } else {
          badgeEl?.remove();
        }
      });
    });
  }

  function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    const allItems = NAV_ITEMS.flatMap(s => s.items);
    const item = allItems.find(i => i.path === path);
    breadcrumb.innerHTML = `
      <li>WarehouseOS</li>
      <li>${item ? item.label : 'Dashboard'}</li>`;
  }

  function updateTopBarStats() {
    const statsEl = document.getElementById('top-bar-stats');
    if (!statsEl) return;
    const kpi = Store.get.kpiSummary();
    const stock = Store.get.stockSummary();
    statsEl.innerHTML = `
      <div class="top-stat clickable" onclick="Router.go('/orders')" title="View All Orders">
        <span class="top-stat-value">${kpi.totalOrders}</span>
        <span class="top-stat-label">Orders ↗</span>
      </div>
      <div class="top-stat clickable" onclick="InventoryModule.setFilterStatus('low');Router.go('/inventory')" title="Filter Low Stock Inventory (Quick Filter)">
        <span class="top-stat-value" style="color:var(--clr-warning-text)">${stock.lowStock}</span>
        <span class="top-stat-label">⚠️ Low Stock ↗</span>
      </div>
      <div class="top-stat clickable" onclick="InventoryModule.setFilterStatus('out');Router.go('/inventory')" title="Filter Stockouts in Inventory (Quick Filter)">
        <span class="top-stat-value" style="color:var(--clr-danger-text)">${stock.outOfStock}</span>
        <span class="top-stat-label">🚨 Out of Stock ↗</span>
      </div>
      <div class="top-stat clickable" onclick="Router.go('/analytics')" title="View Analytics & Fill Rate Trends">
        <span class="top-stat-value" style="color:var(--clr-success-text)">${kpi.fillRate}%</span>
        <span class="top-stat-label">Fill Rate ↗</span>
      </div>`;
  }

  function renderSparklineSVG(data, color = '#10B981', width = 90, height = 24) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible">
      <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      <circle cx="${width}" cy="${height - ((data[data.length-1] - min) / range) * (height - 6) - 3}" r="3" fill="${color}" />
    </svg>`;
  }

  function updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    if (!badge) return;
    const count = Store.get.openAlerts().length;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }

  // ─── DASHBOARD ─────────────────────────────────────────────
  function renderDashboard(container) {
    const kpi    = Store.get.kpiSummary();
    const stock  = Store.get.stockSummary();
    const orders = Store.get.orders();
    const alerts = Store.get.openAlerts().slice(0, 4);
    const recentOrders = [...orders]
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const tasks = Store.get.pickTasks().filter(t => t.status !== 'completed');

    const fillRateHistory = [91, 93, 90, 94, 92, 95, 96, 94, 97, 95, 98, kpi.fillRate];
    const orderVelocityHistory = [4, 7, 5, 8, 6, 9, 11, 7, 8, 6, 10, 8, 12, 9];

    container.innerHTML = `
    <div class="dashboard-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Operations Dashboard</h2>
          <p class="section-sub">Central Distribution Hub · ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="OrdersModule.quickOrderPrompt()">⚡ 1-Click Quick Order</button>
          <button class="btn btn-primary btn-sm" onclick="Router.go('/orders')">View All Orders</button>
        </div>
      </div>

      <!-- KPI Grid with Integrated Sparklines -->
      <div class="data-grid data-grid-4 mb-6">
        <div class="kpi-card" onclick="Router.go('/orders')">
          <div class="flex items-center justify-between">
            <div class="kpi-icon">🛒</div>
            <div class="flex items-center gap-1 text-xs text-success font-mono font-bold">
              <span>+14.2%</span>
            </div>
          </div>
          <div class="kpi-label">Total Orders</div>
          <div class="flex items-baseline justify-between">
            <div class="kpi-value" style="color:var(--clr-primary-light)">${kpi.totalOrders}</div>
            ${renderSparklineSVG(orderVelocityHistory, '#38BDF8', 75, 22)}
          </div>
        </div>

        <div class="kpi-card" onclick="Router.go('/orders')">
          <div class="flex items-center justify-between">
            <div class="kpi-icon">⏳</div>
            <div class="flex items-center gap-1 text-xs text-warning font-mono font-bold">
              <span>Queue Active</span>
            </div>
          </div>
          <div class="kpi-label">Pending Orders</div>
          <div class="flex items-baseline justify-between">
            <div class="kpi-value" style="color:var(--clr-warning-text)">${Store.get.orderSummary().pending}</div>
            ${renderSparklineSVG([8, 6, 9, 5, 4, 3, Store.get.orderSummary().pending], '#F59E0B', 75, 22)}
          </div>
        </div>

        <div class="kpi-card" onclick="Router.go('/alerts')">
          <div class="flex items-center justify-between">
            <div class="kpi-icon">🚨</div>
            <span class="badge ${kpi.openAlerts>3?'badge-danger':'badge-success'}" style="font-size:9px">
              ${kpi.openAlerts>3?'ATTENTION':'NORMAL'}
            </span>
          </div>
          <div class="kpi-label">Active Alerts</div>
          <div class="flex items-baseline justify-between">
            <div class="kpi-value" style="color:${kpi.openAlerts>3?'var(--clr-danger-text)':'var(--clr-text)'}">${kpi.openAlerts}</div>
            ${renderSparklineSVG([5, 4, 6, 7, 4, 3, kpi.openAlerts], kpi.openAlerts>3?'#EF4444':'#10B981', 75, 22)}
          </div>
        </div>

        <div class="kpi-card" onclick="Router.go('/analytics')">
          <div class="flex items-center justify-between">
            <div class="kpi-icon">📊</div>
            <div class="flex items-center gap-1 text-xs text-success font-mono font-bold">
              <span>SLA Target: 95%</span>
            </div>
          </div>
          <div class="kpi-label">Fill Rate</div>
          <div class="flex items-baseline justify-between">
            <div class="kpi-value" style="color:var(--clr-success-text)">${kpi.fillRate}%</div>
            ${renderSparklineSVG(fillRateHistory, '#10B981', 75, 22)}
          </div>
        </div>
      </div>

      <!-- Quick Action Banner -->
      ${Store.get.orderSummary().pending > 0 ? `
      <div class="alert-banner warning mb-6">
        <span class="alert-banner-icon">⚡</span>
        <div class="flex-1">
          <strong>${Store.get.orderSummary().pending} orders awaiting allocation</strong> — 
          Click below to allocate stock and generate pick tasks automatically.
        </div>
        <button class="btn btn-warning btn-sm" onclick="AllocationModule.allocateAll();Router.dispatch()">
          Allocate All Now
        </button>
      </div>` : ''}

      <div class="data-grid" style="grid-template-columns:1fr 1fr;gap:var(--sp-5)">
        <!-- Stock Health Card with SVG Progress Rings & Hover Glow -->
        <div class="card card-glow-interactive">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <h4 class="card-title">📦 Stock Health & Zone Capacity</h4>
              <span class="badge badge-success" style="font-size:9px">● Live Telemetry</span>
            </div>
            <a class="btn btn-ghost btn-sm" href="#/inventory">View All →</a>
          </div>
          <div class="card-body">
            <!-- Overall Health Metrics -->
            <div class="data-grid data-grid-3 mb-4" style="gap:var(--sp-3)">
              <div style="text-align:center;padding:var(--sp-3);background:var(--clr-success-dim);border-radius:var(--radius-md);border:1px solid rgba(16,185,129,0.2)">
                <div style="font-size:1.6rem;font-weight:800;color:var(--clr-success-text)">${stock.healthy}</div>
                <div class="text-xs text-muted font-bold">Healthy SKUs</div>
              </div>
              <div style="text-align:center;padding:var(--sp-3);background:var(--clr-warning-dim);border-radius:var(--radius-md);border:1px solid rgba(245,158,11,0.2)">
                <div style="font-size:1.6rem;font-weight:800;color:var(--clr-warning-text)">${stock.lowStock}</div>
                <div class="text-xs text-muted font-bold">Low Stock</div>
              </div>
              <div style="text-align:center;padding:var(--sp-3);background:var(--clr-danger-dim);border-radius:var(--radius-md);border:1px solid rgba(239,68,68,0.2)">
                <div style="font-size:1.6rem;font-weight:800;color:var(--clr-danger-text)">${stock.outOfStock}</div>
                <div class="text-xs text-muted font-bold">Stockouts</div>
              </div>
            </div>

            <!-- Zone SVG Circular Progress Rings Grid -->
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;padding-top:6px">
              ${SeedData.zones.map(z => {
                const prods = Store.get.productsByZone(z);
                const avgFill = prods.length ? Math.round(prods.reduce((s,p)=>s+p.quantity/p.maxCapacity,0)/prods.length*100) : 0;
                const ringColor = avgFill > 70 ? '#10B981' : avgFill > 35 ? '#F59E0B' : '#EF4444';
                const circumference = 2 * Math.PI * 18;
                const offset = circumference - (avgFill / 100) * circumference;
                return `
                <div class="flex items-center gap-2 p-2" style="background:var(--glass-bg-subtle);border-radius:var(--radius-lg);border:var(--glass-border)">
                  <div class="svg-ring-wrap" style="width:44px;height:44px">
                    <svg class="svg-ring" viewBox="0 0 44 44">
                      <circle class="ring-bg" cx="22" cy="22" r="18" stroke-width="3.5" fill="none"/>
                      <circle class="ring-fill" cx="22" cy="22" r="18" stroke-width="3.5" stroke="${ringColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" fill="none"/>
                    </svg>
                    <span class="ring-text" style="font-size:10px">${avgFill}%</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1">
                      <span class="product-row-zone zone-${z}" style="width:20px;height:20px;font-size:9px">${z}</span>
                      <span class="font-semibold text-xs truncate">${SeedData.zoneInfo[z]?.name||z}</span>
                    </div>
                    <div class="text-xs text-muted font-mono" style="font-size:9.5px">${prods.length} SKUs</div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="flex flex-col gap-4">
          <!-- Active Pick Tasks & Live Event Log Card with Hover Glow -->
          <div class="card card-glow-interactive">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <h4 class="card-title">👷 Pick Tasks & Live Event Stream</h4>
                <span class="badge badge-primary" style="font-size:9px">4s Pulse</span>
              </div>
              <a class="btn btn-ghost btn-sm" href="#/picking">All Tasks →</a>
            </div>
            <div class="card-body">
              <!-- Active Tasks Progress -->
              <div class="flex flex-col gap-2 mb-4">
                ${tasks.length === 0
                  ? '<div class="text-center text-muted text-xs p-2">No active pick tasks</div>'
                  : tasks.slice(0, 2).map(t => {
                      const pct = Math.round(t.items.filter(i=>i.picked).length/t.items.length*100);
                      return `
                      <div class="p-2" style="background:var(--glass-bg-subtle);border-radius:var(--radius-md);border:var(--glass-border)">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-mono text-xs font-bold" style="color:var(--clr-primary)">${t.id} → ${t.orderId}</span>
                          <span class="font-mono text-xs font-bold">${pct}%</span>
                        </div>
                        <div class="progress" style="height:5px">
                          <div class="progress-bar ${pct===100?'success':'warning'}" style="width:${pct}%"></div>
                        </div>
                      </div>`;
                    }).join('')}
              </div>

              <!-- Live Event Stream Log -->
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-xs font-bold text-muted uppercase">Real-Time Floor Activity</span>
                <span class="text-xs font-mono text-success" style="font-size:9.5px">● Streaming</span>
              </div>
              <div class="live-event-stream" id="dashboard-live-event-stream">
                <!-- Initial Event items -->
                <div class="live-event-item">
                  <span class="live-event-badge">PICK</span>
                  <span class="truncate">Marcus Vance scanned 2× ELC-MCU-001 at BIN-A02</span>
                  <span class="live-event-time">just now</span>
                </div>
                <div class="live-event-item">
                  <span class="live-event-badge" style="background:rgba(16,185,129,0.15);color:#34D399">PACK</span>
                  <span class="truncate">Elena Rostova completed pack for Order ORD-003</span>
                  <span class="live-event-time">12s ago</span>
                </div>
                <div class="live-event-item">
                  <span class="live-event-badge" style="background:rgba(168,85,247,0.15);color:#C084FC">AGV</span>
                  <span class="truncate">Robot AGV-02 docked at Staging Bay 3</span>
                  <span class="live-event-time">28s ago</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="card card-glow-interactive">
            <div class="card-header">
              <h4 class="card-title">🛒 Recent Orders</h4>
              <a class="btn btn-ghost btn-sm" href="#/orders">All →</a>
            </div>
            <div class="card-body" style="padding:0">
              ${recentOrders.slice(0, 3).map(o => `
              <div class="flex items-center gap-3 px-4 py-2.5" style="border-bottom:1px solid var(--clr-border);cursor:pointer" onclick="OrdersModule.openOrderDetail('${o.id}')">
                <span class="font-mono text-xs font-bold" style="color:var(--clr-primary);min-width:65px">${o.id}</span>
                <span class="text-xs flex-1 truncate font-medium">${o.customerName}</span>
                <span class="badge priority-${o.priority}">${Utils.priorityLabel(o.priority)}</span>
                <span class="badge status-${o.status}">${Utils.statusLabel(o.status)}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Active Alerts Preview -->
      ${alerts.length > 0 ? `
      <div class="card card-glow-interactive mt-5">
        <div class="card-header">
          <h4 class="card-title">🚨 Active Alerts</h4>
          <a class="btn btn-ghost btn-sm" href="#/alerts">View All (${Store.get.openAlerts().length}) →</a>
        </div>
        <div class="card-body" style="padding:0">
          ${alerts.map(a => `
          <div class="alert-item ${a.severity}" style="border-radius:0;border-left-width:3px;margin:0">
            <div class="alert-icon-wrap ${a.severity}">
              ${{stockout:'🚨',low_stock:'⚠️',damaged:'💔',missing:'🔍'}[a.type]||'⚠️'}
            </div>
            <div class="alert-content flex-1">
              <div class="flex items-center gap-2">
                <span class="alert-id-tag font-mono font-bold text-xs">${a.id}</span>
                <span class="alert-message">${a.message}</span>
              </div>
              <div class="alert-time text-xs mt-1">${Utils.timeAgo(a.createdAt)}</div>
            </div>
            <span class="badge ${a.severity==='critical'?'badge-danger':'badge-warning'}">${a.severity.toUpperCase()}</span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Quick Navigation -->
      <div class="card card-glow-interactive mt-5">
        <div class="card-header"><h4 class="card-title">Quick Actions</h4></div>
        <div class="card-body">
          <div class="flex flex-wrap gap-3">
            <button class="btn btn-primary" onclick="OrdersModule.openCreateModal()">➕ New Order</button>
            <button class="btn btn-secondary font-bold" onclick="OrdersModule.quickOrderPrompt()">⚡ 1-Click Quick Order</button>
            <button class="btn btn-secondary" onclick="AllocationModule.allocateAll();Router.dispatch()">⚡ Allocate All</button>
            <button class="btn btn-secondary" onclick="Router.go('/map')">🗺️ 3D Floor Map</button>
            <button class="btn btn-secondary" onclick="Router.go('/ar')">🥽 AR View</button>
            <button class="btn btn-secondary" onclick="Router.go('/analytics')">📈 Analytics</button>
            <button class="btn btn-secondary" onclick="AnalyticsModule.exportReport()">📊 Export Report</button>
            <button class="btn btn-danger btn-sm" onclick="WarehouseApp.resetData()">↺ Reset Demo Data</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function dashKPI(label, value, icon, color, href) {
    return `<div class="kpi-card" style="cursor:pointer" onclick="Router.go('${href}')">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" style="color:${color};font-size:2rem">${value}</div>
    </div>`;
  }

  // ─── GLOBAL EVENTS ─────────────────────────────────────────
  function setupGlobalEvents() {
    // Modal close button
    document.getElementById('modal-close-btn')?.addEventListener('click', Utils.Modal.close);
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) Utils.Modal.close();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        Utils.Modal.close();
        document.getElementById('confirm-overlay')?.classList.add('hidden');
      }
    });

    // Sidebar collapse
    document.getElementById('sidebar-collapse-btn')?.addEventListener('click', () => {
      document.getElementById('app-shell')?.classList.toggle('sidebar-collapsed');
    });

    // Mobile menu
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      Store.checkAutoAlerts();
      Router.dispatch();
      updateTopBarStats();
      Utils.Toast.info('Refreshed', 'Data updated');
    });

    // Global search
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const q = Utils.sanitizeInput(e.target.value);
          if (!q) return;
          Router.go('/inventory');
          setTimeout(() => {
            const inv = document.getElementById('inv-search');
            if (inv) { inv.value = q; inv.dispatchEvent(new Event('input')); }
          }, 100);
        }
      });
    }

    // Store events — update badge on any change
    Store.on('alerts:changed', updateAlertBadge);
    Store.on('alerts:changed', updateTopBarStats);
    Store.on('orders:changed', updateTopBarStats);
    Store.on('products:changed', updateTopBarStats);
  }

  // ─── PUBLIC API ────────────────────────────────────────────
  const WarehouseApp = {
    init() {
      Store.init();
      if (window.AuthModule) {
        AuthModule.init();
      }
      renderNav();
      setupRoutes();
      setupGlobalEvents();
      updateTopBarStats();
      updateAlertBadge();

      // Navigate to dashboard if no hash
      if (!window.location.hash || window.location.hash === '#') {
        Router.go('/dashboard');
      } else {
        Router.dispatch();
      }

      // Initialize Floating AI Copilot Widget
      if (window.AICopilotModule) {
        AICopilotModule.init();
      }

      // Start 4-second live floor event stream
      startLiveEventSimulation();

      // Start 1-second live animated time & date clock
      startLiveClockUpdater();


    },

    resetData() {
      if (confirm('Reset all demo data to factory defaults? All manual changes will be lost.')) {
        Store.reset();
        window.location.reload();
      }
    },

    openAdminModal() {
      const staff = Store.get.staff();
      const products = Store.get.products();
      const orders = Store.get.orders();

      Utils.Modal.open('🛡️ Admin Access & Executive Controls', `
        <div class="flex flex-col gap-4">
          <!-- Profile Card -->
          <div class="flex items-center gap-3 p-3.5 rounded-xl" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3)">
            <div class="user-avatar font-bold" style="width:44px;height:44px;font-size:15px;background:linear-gradient(135deg, #A855F7, #6366F1);color:#fff">VG</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm" style="color:#C084FC">Veera Govind</span>
                <span class="badge badge-purple" style="font-size:9px">Root Admin</span>
              </div>
              <div class="text-xs text-muted">Operations Director · Session: Active · Clearance: Level 5</div>
            </div>
            <span class="badge badge-success">● Verified</span>
          </div>

          <!-- Quick Stats -->
          <div class="data-grid data-grid-3 text-center" style="gap:10px">
            <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
              <div class="text-xs text-muted">Staff Roster</div>
              <div class="font-mono font-bold text-sm text-primary">${staff.length} Active</div>
            </div>
            <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
              <div class="text-xs text-muted">Inventory SKUs</div>
              <div class="font-mono font-bold text-sm text-success">${products.length} Products</div>
            </div>
            <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
              <div class="text-xs text-muted">Order Queue</div>
              <div class="font-mono font-bold text-sm text-warning">${orders.length} Total</div>
            </div>
          </div>

          <!-- Admin Quick Action Links -->
          <div class="flex flex-col gap-2 pt-2">
            <button class="btn btn-primary btn-sm font-bold justify-start" onclick="Utils.Modal.close();StaffModule.openAddStaffModal()">
              ➕ Onboard / Add New Staff Member
            </button>
            <button class="btn btn-secondary btn-sm justify-start" onclick="Utils.Modal.close();Router.go('/staff')">
              👥 Open Full Staff Management Directory
            </button>
            <button class="btn btn-secondary btn-sm justify-start" onclick="Utils.Modal.close();AnalyticsModule.exportReport()">
              📊 Export System Audit Report (CSV)
            </button>
            <button class="btn btn-danger btn-sm justify-start" onclick="WarehouseApp.resetData()">
              ↺ Factory Reset All State & Demo Data
            </button>
          </div>
        </div>
      `, { size: 'md' });
    }
  };

  // ─── LIVE TIME & DATE CLOCK UPDATER (1-SEC TICK) ─────────
  function startLiveClockUpdater() {
    function tick() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? String(hours).padStart(2, '0') : '12';

      const timeStr = `${hours}:${minutes}:${seconds}`;

      // Format: Monday, Aug 17, 2026
      const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
      const dateStr = now.toLocaleDateString('en-US', options);

      const timeEl = document.getElementById('live-time-display');
      const ampmEl = document.getElementById('live-ampm-display');
      const dateEl = document.getElementById('live-date-display');

      if (timeEl) timeEl.textContent = timeStr;
      if (ampmEl) ampmEl.textContent = ampm;
      if (dateEl) dateEl.textContent = dateStr;
    }

    tick();
    setInterval(tick, 1000);
  }

  // ─── LIVE REAL-TIME FLOOR EVENT STREAM (4-SEC INTERVAL) ────
  const SIMULATED_FLOOR_EVENTS = [
    { badge: 'PICK', bg: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', text: 'Marcus Vance scanned 3× ELC-MCU-001 at BIN-A02' },
    { badge: 'PACK', bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', text: 'Elena Rostova sealed box for Order ORD-002' },
    { badge: 'AGV', bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', text: 'Robotic Tug AGV-04 docked at Packing Station 2' },
    { badge: 'VERIFY', bg: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', text: 'Kai Tanaka verified barcode on SKU HDW-M8B-004' },
    { badge: 'RESTOCK', bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', text: 'Zone C Bin C03 replenished (+25 units)' },
    { badge: 'DISPATCH', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', text: 'FedEx Priority manifested shipment TRK-9481' },
    { badge: 'PICK', bg: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', text: 'Marcus Vance confirmed Bin B01 for Task PCK-001' },
    { badge: 'AUDIT', bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', text: 'Cycle count audit matched 100% in Zone E' }
  ];

  let eventStreamIndex = 0;
  function startLiveEventSimulation() {
    setInterval(() => {
      const streamEl = document.getElementById('dashboard-live-event-stream');
      if (!streamEl) return;

      const ev = SIMULATED_FLOOR_EVENTS[eventStreamIndex % SIMULATED_FLOOR_EVENTS.length];
      eventStreamIndex++;

      const itemEl = document.createElement('div');
      itemEl.className = 'live-event-item';
      itemEl.innerHTML = `
        <span class="live-event-badge" style="background:${ev.bg};color:${ev.color}">${ev.badge}</span>
        <span class="truncate">${ev.text}</span>
        <span class="live-event-time">just now</span>
      `;

      streamEl.prepend(itemEl);

      // Keep max 4 items
      while (streamEl.children.length > 4) {
        streamEl.removeChild(streamEl.lastChild);
      }
    }, 4000);
  }

  // Boot
  window.WarehouseApp = WarehouseApp;
  document.addEventListener('DOMContentLoaded', () => WarehouseApp.init());
})();
