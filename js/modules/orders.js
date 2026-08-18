/* ============================================================
   WarehouseOS — modules/orders.js
   Order Management & Prioritization Module
   ============================================================ */

const OrdersModule = (() => {

  let currentView = 'pipeline'; // 'pipeline' | 'table'
  let filters = { search:'', status:'all', priority:'all' };
  let orderDensity = 'compact'; // 'compact' | 'comfortable'
  let selectedOrderIds = new Set();

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
  }

  function buildHTML() {
    const summary = Store.get.orderSummary();
    const isAllSelected = false; // Logic handled in renderContent/TableHTML
    return `
    <div class="orders-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Order Management</h2>
          <p class="section-sub">${summary.total} total orders · ${summary.pending} pending</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="OrdersModule.quickOrderPrompt()">
            ⚡ 1-Click Quick Order
          </button>
          <button class="btn btn-secondary btn-sm" onclick="OrdersModule.exportOrders()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 10v4h12v-4M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Export
          </button>
          <button class="btn btn-primary btn-sm" onclick="OrdersModule.openCreateModal()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            New Order
          </button>
        </div>
      </div>

      <!-- ⚡ 1-Click Simple Quick Order Presets Banner -->
      <div class="card card-glow-interactive mb-4 p-3" style="background:linear-gradient(135deg, rgba(6,182,212,0.1), rgba(15,23,42,0.9));border:1px solid rgba(6,182,212,0.3)">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚡</span>
            <div>
              <div class="font-bold text-xs text-primary">Get Order Simply (1-Click Instant Order Presets)</div>
              <div class="text-xs text-muted">Click any preset to instantly create and auto-allocate an order with 0 typing</div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button class="btn btn-secondary btn-xs font-semibold" onclick="OrdersModule.quickCreateOrder('tech')">
              🚀 VIP Tech Bundle
            </button>
            <button class="btn btn-secondary btn-xs font-semibold" onclick="OrdersModule.quickCreateOrder('hardware')">
              🛠️ Hardware Pack
            </button>
            <button class="btn btn-secondary btn-xs font-semibold" onclick="OrdersModule.quickCreateOrder('safety')">
              📦 Safety Kit
            </button>
            <button class="btn btn-primary btn-xs font-semibold" onclick="OrdersModule.quickCreateOrder('random')">
              🎲 Random In-Stock Order
            </button>
          </div>
        </div>
      </div>

      <!-- KPI row -->
      <div class="data-grid data-grid-4 mb-6">
        ${['pending','allocated','picking','dispatched'].map(s => {
          const icons = {pending:'⏳',allocated:'✅',picking:'🚶',dispatched:'🚚'};
          const colors = {pending:'var(--clr-text-muted)',allocated:'var(--clr-info-text)',picking:'var(--clr-warning-text)',dispatched:'var(--clr-purple)'};
          return `<div class="kpi-card" style="cursor:pointer" onclick="OrdersModule.setStatusFilter('${s}')">
            <div class="kpi-icon">${icons[s]}</div>
            <div class="kpi-label">${Utils.statusLabel(s)}</div>
            <div class="kpi-value" style="color:${colors[s]};font-size:2rem">${summary[s]||0}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- View toggle + filters + Density -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input type="search" id="ord-search" placeholder="Search order ID or customer…" />
        </div>
        <select id="ord-status-filter" class="filter-select">
          <option value="all">All Statuses</option>
          ${['pending','allocated','picking','packed','dispatched','delivered'].map(s =>
            `<option value="${s}" ${filters.status===s?'selected':''}>${Utils.statusLabel(s)}</option>`
          ).join('')}
        </select>
        <select id="ord-priority-filter" class="filter-select">
          <option value="all">All Priorities</option>
          <option value="vip">🟣 VIP</option>
          <option value="express">🟡 Express</option>
          <option value="standard">⚪ Standard</option>
        </select>

        <div class="ml-auto flex items-center gap-2">
          <!-- Density Toggle -->
          <div class="btn-group" title="Row Density">
            <button class="btn btn-secondary btn-sm ${orderDensity==='compact'?'active':''}" id="ord-density-compact" title="Compact">
              ⊟ Compact
            </button>
            <button class="btn btn-secondary btn-sm ${orderDensity==='comfortable'?'active':''}" id="ord-density-comfortable" title="Comfortable">
              ⊞ Comfortable
            </button>
          </div>

          <!-- View Switcher -->
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm ${currentView==='pipeline'?'active':''}" id="view-pipeline-btn" title="Pipeline Kanban view">
              ⬜⬜ Pipeline
            </button>
            <button class="btn btn-secondary btn-sm ${currentView==='table'?'active':''}" id="view-list-btn" title="List view">
              ☰ List
            </button>
            <button class="btn btn-secondary btn-sm ${currentView==='completed'?'active':''}" id="view-completed-btn" title="Completed & Dispatched Orders Archive">
              ✅ Completed Archive
            </button>
          </div>
        </div>
      </div>

      <div id="orders-content"></div>

      <!-- Floating Batch Order Actions Bar -->
      <div id="ord-batch-bar" class="batch-actions-bar ${selectedOrderIds.size>0?'show':''}">
        <span class="badge badge-primary font-mono font-bold" id="ord-batch-count-badge" style="font-size:11px">
          ${selectedOrderIds.size} Orders Selected
        </span>
        <button class="btn btn-primary btn-xs font-bold" onclick="OrdersModule.batchAllocate()">
          ⚡ Bulk Allocate
        </button>
        <button class="btn btn-secondary btn-xs font-bold" onclick="OrdersModule.batchPrintLabels()">
          🏷️ Print Thermal Labels
        </button>
        <button class="btn btn-secondary btn-xs" onclick="OrdersModule.batchExport()">
          📊 Export Selected
        </button>
        <button class="btn btn-ghost btn-xs text-muted" onclick="OrdersModule.clearSelection()">
          ✕ Clear
        </button>
      </div>
    </div>`;
  }

  function renderContent(container) {
    const allOrders = Utils.filterOrders(Store.get.orders(), filters);
    const contentEl = Utils.qs('#orders-content', container || document);
    if (!contentEl) return;

    if (currentView === 'pipeline') {
      contentEl.innerHTML = renderPipelineHTML(allOrders);
    } else if (currentView === 'completed') {
      contentEl.innerHTML = renderCompletedArchiveHTML(allOrders);
    } else {
      contentEl.innerHTML = renderTableHTML(allOrders);
    }

    // Table action binding
    if (currentView === 'table' || currentView === 'completed') {
      Utils.qsa('.ord-action-btn', contentEl).forEach(btn => {
        btn.addEventListener('click', e => {
          const action  = e.currentTarget.dataset.action;
          const orderId = e.currentTarget.dataset.id;
          handleTableAction(action, orderId);
        });
      });

      // Bind Select All Orders
      const selectAll = document.getElementById('ord-select-all');
      if (selectAll) {
        selectAll.addEventListener('change', e => {
          const checked = e.target.checked;
          allOrders.forEach(o => {
            if (checked) selectedOrderIds.add(o.id);
            else selectedOrderIds.delete(o.id);
          });
          updateOrderBatchBar();
          renderContent(container);
        });
      }

      // Bind Row checkboxes
      Utils.qsa('.ord-row-checkbox', contentEl).forEach(cb => {
        cb.addEventListener('change', e => {
          const id = e.target.value;
          if (e.target.checked) selectedOrderIds.add(id);
          else selectedOrderIds.delete(id);
          updateOrderBatchBar();
        });
      });
    }
  }

  function updateOrderBatchBar() {
    const bar = document.getElementById('ord-batch-bar');
    const badge = document.getElementById('ord-batch-count-badge');
    if (!bar) return;
    if (selectedOrderIds.size > 0) {
      bar.classList.add('show');
      if (badge) badge.textContent = `${selectedOrderIds.size} Orders Selected`;
    } else {
      bar.classList.remove('show');
    }
  }

  function clearSelection() {
    selectedOrderIds.clear();
    updateOrderBatchBar();
    renderContent(document.getElementById('page-content') || document.body);
  }

  function batchAllocate() {
    if (selectedOrderIds.size === 0) return;
    let count = 0;
    selectedOrderIds.forEach(id => {
      const order = Store.get.orderById(id);
      if (order && order.status === 'pending') {
        Store.allocateOrder(id);
        count++;
      }
    });
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Batch Allocation', `Successfully allocated ${count} pending orders!`);
    clearSelection();
    Router.dispatch();
  }

  function batchPrintLabels() {
    if (selectedOrderIds.size === 0) return;
    Utils.Sound?.playBeep?.();
    Utils.Toast.success('Thermal Labels Queued', `Sent ${selectedOrderIds.size} shipping barcodes to Zebra Thermal Printer`);
  }

  function batchExport() {
    if (selectedOrderIds.size === 0) return;
    const selectedOrders = Store.get.orders().filter(o => selectedOrderIds.has(o.id));
    Utils.exportCSV(selectedOrders, 'selected_orders.csv');
    Utils.Toast.success('Export Complete', `Exported ${selectedOrders.length} orders to CSV`);
  }

  function renderPipelineHTML(orders) {
    const stages = [
      { key:'pending',    label:'Pending',    color:'var(--clr-text-muted)', bg:'var(--clr-surface-2)' },
      { key:'allocated',  label:'Allocated',  color:'var(--clr-info-text)',  bg:'var(--clr-info-dim)' },
      { key:'picking',    label:'Picking',    color:'var(--clr-warning-text)', bg:'var(--clr-warning-dim)' },
      { key:'packed',     label:'Packed',     color:'var(--clr-primary-light)', bg:'var(--clr-primary-dim)' },
      { key:'dispatched', label:'Dispatched', color:'var(--clr-purple)',     bg:'rgba(168,85,247,0.1)' },
    ];

    return `
    <div class="pipeline-board">
      ${stages.map(s => {
        const stageOrders = orders.filter(o => o.status === s.key);
        return `
        <div class="pipeline-col">
          <div class="pipeline-col-header" style="border-top:3px solid ${s.color}">
            <span class="pipeline-col-title">${s.label}</span>
            <span class="badge" style="background:${s.bg};color:${s.color}">${stageOrders.length}</span>
          </div>
          <div class="pipeline-col-cards">
            ${stageOrders.length === 0 ? '<div class="text-xs text-muted p-2">No orders</div>' :
              stageOrders.map(o => pipelineCardHTML(o)).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function pipelineCardHTML(o) {
    const urgency = Utils.dueUrgency(o.dueDate);
    const urgencyClass = {overdue:'order-due-urgent', urgent:'order-due-urgent', soon:'order-due-soon', ok:'order-due-ok'}[urgency];
    const priorityBadge = `<span class="badge priority-${o.priority} badge-dot">${Utils.priorityLabel(o.priority)}</span>`;
    return `
    <div class="pipeline-card" onclick="OrdersModule.openOrderDetail('${o.id}')">
      <div class="pipeline-card-id">${o.id}</div>
      <div class="pipeline-card-customer">${o.customerName}</div>
      <div class="pipeline-card-meta">
        ${priorityBadge}
        <span class="text-xs ${urgencyClass}">${Utils.dueLabel(o.dueDate)}</span>
      </div>
      <div class="text-xs text-muted mt-1">${o.items.length} item${o.items.length!==1?'s':''}</div>
    </div>`;
  }

  function renderTableHTML(orders) {
    const sorted = [...orders].sort((a,b) => Utils.orderPriorityScore(b) - Utils.orderPriorityScore(a));
    if (sorted.length === 0) return `<div class="empty-state"><div class="empty-state-icon">📋</div><h4>No orders match filters</h4></div>`;
    const isAllSelected = sorted.length > 0 && sorted.every(o => selectedOrderIds.has(o.id));

    return `<div class="table-wrapper">
      <table class="data-table ${orderDensity==='compact'?'table-compact':'table-comfortable'}">
        <thead><tr>
          <th style="width:36px;text-align:center">
            <input type="checkbox" id="ord-select-all" ${isAllSelected?'checked':''} title="Select All Orders" />
          </th>
          <th>Order ID</th><th>Customer</th><th>Priority</th>
          <th>Status</th><th>Items</th><th>Due Date</th>
          <th>Created</th><th class="col-actions">Actions</th>
        </tr></thead>
        <tbody>
          ${sorted.map(o => {
            const urgency = Utils.dueUrgency(o.dueDate);
            const urgencyClass = {overdue:'danger',urgent:'danger',soon:'warning',ok:''}[urgency];
            const isChecked = selectedOrderIds.has(o.id);
            return `<tr class="${isChecked?'row-selected':''}">
              <td style="text-align:center">
                <input type="checkbox" class="ord-row-checkbox" value="${o.id}" ${isChecked?'checked':''} />
              </td>
              <td class="col-sku font-bold" style="color:var(--clr-primary-light);cursor:pointer" onclick="OrdersModule.openOrderDetail('${o.id}')">${o.id}</td>
              <td>
                <div class="font-semibold text-sm" style="color:var(--clr-text)">${o.customerName}</div>
                <div class="text-xs text-muted">${o.customerTier}</div>
              </td>
              <td><span class="badge priority-${o.priority} badge-dot">${Utils.priorityLabel(o.priority)}</span></td>
              <td><span class="badge status-${o.status}">${Utils.statusLabel(o.status)}</span></td>
              <td class="col-num">${o.items.length}</td>
              <td><span class="${urgencyClass?'text-'+urgencyClass:''} font-mono text-xs">${Utils.formatDate(o.dueDate)}</span></td>
              <td class="text-xs text-muted">${Utils.timeAgo(o.createdAt)}</td>
              <td class="col-actions">
                <button class="btn btn-ghost btn-sm" onclick="OrdersModule.openOrderDetail('${o.id}')">View</button>
                ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="OrdersModule.allocateOne('${o.id}')">Allocate</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function bindEvents(container) {
    const searchEl = Utils.qs('#ord-search', container);
    if (searchEl) {
      searchEl.value = filters.search;
      searchEl.addEventListener('input', Utils.debounce(e => {
        filters.search = e.target.value;
        renderContent(container);
      }, 200));
    }

    Utils.qs('#ord-status-filter', container)?.addEventListener('change', e => {
      filters.status = e.target.value; renderContent(container);
    });
    Utils.qs('#ord-priority-filter', container)?.addEventListener('change', e => {
      filters.priority = e.target.value; renderContent(container);
    });
    Utils.qs('#view-pipeline-btn', container)?.addEventListener('click', () => {
      currentView = 'pipeline'; container.querySelectorAll('.btn-group .btn').forEach(b=>b.classList.remove('active'));
      Utils.qs('#view-pipeline-btn',container)?.classList.add('active');
      renderContent(container);
    });
    Utils.qs('#view-list-btn', container)?.addEventListener('click', () => {
      currentView = 'table'; container.querySelectorAll('.btn-group .btn').forEach(b=>b.classList.remove('active'));
      Utils.qs('#view-list-btn',container)?.classList.add('active');
      renderContent(container);
    });
    Utils.qs('#view-completed-btn', container)?.addEventListener('click', () => {
      currentView = 'completed'; container.querySelectorAll('.btn-group .btn').forEach(b=>b.classList.remove('active'));
      Utils.qs('#view-completed-btn',container)?.classList.add('active');
      renderContent(container);
    });

    Utils.qs('#ord-density-compact', container)?.addEventListener('click', () => {
      orderDensity = 'compact';
      Utils.qs('#ord-density-compact', container)?.classList.add('active');
      Utils.qs('#ord-density-comfortable', container)?.classList.remove('active');
      renderContent(container);
    });
    Utils.qs('#ord-density-comfortable', container)?.addEventListener('click', () => {
      orderDensity = 'comfortable';
      Utils.qs('#ord-density-comfortable', container)?.classList.add('active');
      Utils.qs('#ord-density-compact', container)?.classList.remove('active');
      renderContent(container);
    });

    renderContent(container);
  }

  function renderCompletedArchiveHTML(allOrders) {
    const completedOrders = allOrders.filter(o => o.status === 'dispatched' || o.status === 'delivered' || o.status === 'packed');
    const dispatches = Store.get.dispatches();

    return `
    <div class="completed-archive-module">
      <div class="card card-glow-interactive mb-4">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-xl">✅</span>
            <div>
              <h4 class="card-title text-success">Completed & Dispatched Orders Archive</h4>
              <p class="text-xs text-muted">Single unified repository for all fulfilled, packed, and manifested carrier shipments</p>
            </div>
          </div>
          <span class="badge badge-success font-mono" style="font-size:10px">${completedOrders.length} Completed Orders</span>
        </div>
        <div class="card-body">
          <div class="data-grid data-grid-3 mb-4" style="gap:12px">
            <div class="p-3 rounded-lg text-center" style="background:var(--clr-success-dim);border:1px solid rgba(16,185,129,0.2)">
              <div class="font-mono text-xl font-bold text-success">${completedOrders.length}</div>
              <div class="text-xs text-muted font-bold">Total Fulfilled Orders</div>
            </div>
            <div class="p-3 rounded-lg text-center" style="background:var(--clr-primary-dim);border:1px solid rgba(6,182,212,0.2)">
              <div class="font-mono text-xl font-bold text-primary">${completedOrders.reduce((s,o)=>s+o.items.reduce((iS,i)=>iS+i.quantity,0),0)}</div>
              <div class="text-xs text-muted font-bold">Units Shipped</div>
            </div>
            <div class="p-3 rounded-lg text-center" style="background:var(--clr-purple-dim);border:1px solid rgba(168,85,247,0.2)">
              <div class="font-mono text-xl font-bold" style="color:#C084FC">99.8%</div>
              <div class="text-xs text-muted font-bold">On-Time Carrier SLA</div>
            </div>
          </div>

          ${completedOrders.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <h4>No completed orders found</h4>
              <p class="text-xs text-muted">Orders that reach Packed, Dispatched, or Delivered status will appear here automatically.</p>
            </div>
          ` : `
            <div class="table-wrapper" style="border:none">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Order ID & Customer</th>
                    <th>Priority</th>
                    <th>Carrier / Tracking</th>
                    <th class="col-num">Items Shipped</th>
                    <th>Completion Date</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${completedOrders.map(o => {
                    const disp = dispatches.find(d => d.orderId === o.id);
                    const totalQty = o.items.reduce((s,i)=>s+i.quantity,0);
                    return `
                    <tr>
                      <td>
                        <div class="font-mono font-bold text-sm" style="color:var(--clr-primary)">${o.id}</div>
                        <div class="font-semibold text-xs">${o.customerName}</div>
                        <div class="text-xs text-muted font-mono">${o.customerTier} Tier</div>
                      </td>
                      <td>
                        <span class="badge priority-${o.priority}">${Utils.priorityLabel(o.priority)}</span>
                      </td>
                      <td>
                        ${o.carrier ? `
                          <div class="flex items-center gap-1.5 font-bold text-xs">
                            <span>${Utils.carrierIcon(o.carrier)}</span>
                            <span>${o.carrier}</span>
                          </div>
                          <div class="font-mono text-xs text-muted">${o.trackingId || disp?.trackingId || 'TRK-984210'}</div>
                        ` : '<span class="text-xs text-muted">Staged for Dispatch</span>'}
                      </td>
                      <td class="col-num font-mono font-bold">
                        ${totalQty} units
                      </td>
                      <td>
                        <div class="text-xs font-mono">${o.dispatchedAt ? Utils.formatDate(o.dispatchedAt) : Utils.formatDate(o.createdAt)}</div>
                        <div class="text-xs text-success">✅ SLA Met</div>
                      </td>
                      <td>
                        <span class="badge status-${o.status}">${Utils.statusLabel(o.status)}</span>
                      </td>
                      <td class="text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button class="btn btn-ghost btn-xs ord-action-btn" data-action="view" data-id="${o.id}">
                            📄 Details
                          </button>
                          <button class="btn btn-primary btn-xs" onclick="DispatchModule.openThermalLabelModal('${o.id}')">
                            🖨️ Label
                          </button>
                        </div>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    </div>`;
  }

  function handleTableAction(action, orderId) {
    if (action === 'view')  openOrderDetail(orderId);
    if (action === 'alloc') allocateOne(orderId);
  }

  // ─── ORDER DETAIL MODAL ────────────────────────────────────
  function openOrderDetail(orderId) {
    const o = Store.get.orderById(orderId);
    if (!o) return;

    const totalItems = o.items.reduce((s,i)=>s+i.quantity,0);
    const totalAllocated = o.items.reduce((s,i)=>s+i.allocated,0);
    const allocPct = totalItems ? Math.round(totalAllocated/totalItems*100) : 0;

    const timelineEvents = buildTimeline(o);

    Utils.Modal.open(`Order ${o.id} — ${o.customerName}`, `
      <div class="split-layout" style="grid-template-columns:1fr 260px;gap:var(--sp-5)">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="badge priority-${o.priority} badge-dot" style="font-size:0.8rem">${Utils.priorityLabel(o.priority)}</span>
            <span class="badge status-${o.status}">${Utils.statusLabel(o.status)}</span>
            ${o.notes ? `<span class="chip">📝 ${o.notes}</span>` : ''}
          </div>

          <h5 class="font-semibold mb-3">Order Items</h5>
          <div class="order-items-list mb-5">
            ${o.items.map(item => {
              const product = Store.get.productById(item.productId);
              const allocOk = item.allocated >= item.quantity;
              return `<div class="order-item-row">
                <div class="order-item-qty">${item.quantity}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-sm truncate">${item.name}</div>
                  <div class="font-mono text-xs text-muted">${item.sku}</div>
                </div>
                <div class="text-xs ${allocOk?'text-success':'text-warning'}">
                  ${item.allocated}/${item.quantity} allocated
                </div>
                ${product ? `<span class="chip">${product.zone}-${product.bin.split('-').slice(1).join('-')}</span>` : ''}
              </div>`;
            }).join('')}
          </div>

          ${totalItems > 0 ? `
          <div class="mb-4">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-muted">Allocation Progress</span>
              <span class="font-mono font-bold">${allocPct}%</span>
            </div>
            <div class="progress progress-lg">
              <div class="progress-bar ${allocPct===100?'success':allocPct>0?'warning':''}" style="width:${allocPct}%"></div>
            </div>
          </div>` : ''}

          ${o.status === 'pending' ? `
          <button class="btn btn-primary" onclick="OrdersModule.allocateOne('${o.id}');Utils.Modal.close()">
            🔄 Allocate Stock
          </button>` : ''}
          ${o.status === 'packed' ? `
          <button class="btn btn-success" onclick="OrdersModule.goToDispatch('${o.id}')">
            🚚 Schedule Dispatch
          </button>` : ''}
        </div>

        <div>
          <h5 class="font-semibold mb-3">Order Details</h5>
          <div class="kv-list mb-5">
            <div class="kv-item"><span class="kv-key">Customer</span><span class="kv-val">${o.customerName}</span></div>
            <div class="kv-item"><span class="kv-key">Tier</span><span class="kv-val">${o.customerTier}</span></div>
            <div class="kv-item"><span class="kv-key">Created</span><span class="kv-val font-mono">${Utils.formatDate(o.createdAt)}</span></div>
            <div class="kv-item"><span class="kv-key">Due Date</span><span class="kv-val font-mono">${Utils.formatDate(o.dueDate)}</span></div>
            ${o.carrier ? `<div class="kv-item"><span class="kv-key">Carrier</span><span class="kv-val">${Utils.carrierIcon(o.carrier)} ${o.carrier}</span></div>` : ''}
            ${o.trackingId ? `<div class="kv-item"><span class="kv-key">Tracking</span><span class="tracking-id text-xs">${o.trackingId}</span></div>` : ''}
          </div>

          <h5 class="font-semibold mb-3">Timeline</h5>
          <div class="timeline">
            ${timelineEvents.map(ev => `
            <div class="timeline-item">
              <div class="timeline-dot ${ev.done?'done':ev.active?'active':''}"></div>
              <div class="timeline-content">
                <div class="timeline-label">${ev.label}</div>
                ${ev.time ? `<div class="timeline-time">${ev.time}</div>` : ''}
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>`, { size:'lg' });
  }

  function buildTimeline(order) {
    const stages = ['pending','allocated','picking','packed','dispatched','delivered'];
    const idx = stages.indexOf(order.status);
    const labels = ['Order Placed','Stock Allocated','Picking Started','Packed & Ready','Dispatched','Delivered'];
    return stages.map((s,i) => ({
      label: labels[i],
      done:  i < idx,
      active: i === idx,
      time: i === 0 ? Utils.formatDateTime(order.createdAt)
          : i === idx && order.dispatchedAt ? Utils.formatDateTime(order.dispatchedAt)
          : null
    }));
  }

  // ─── ACTIONS ───────────────────────────────────────────────
  function allocateOne(orderId) {
    const result = Store.allocateOrder(orderId);
    if (result.success) {
      const msg = result.partial ? 'Partial allocation — some items unavailable' : 'Full allocation complete';
      Utils.Toast[result.partial?'warning':'success']('Order Allocated', msg);
    } else {
      Utils.Toast.error('Allocation Failed', result.reason);
    }
    Router.dispatch();
  }

  function goToDispatch(orderId) {
    Utils.Modal.close();
    Router.go('/dispatch');
  }

  function openCreateModal() {
    const products = Store.get.products().filter(p => p.quantity > 0);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

    Utils.Modal.open('Create New Order', `
      <form id="create-order-form">
        <!-- Quick Auto-Fill Header -->
        <div class="flex items-center justify-between mb-4 p-2.5 rounded-lg" style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25)">
          <div class="flex items-center gap-2">
            <span>⚡</span>
            <span class="text-xs text-primary font-bold">Fast Order Helper</span>
          </div>
          <button type="button" class="btn btn-secondary btn-xs font-semibold" onclick="OrdersModule.autoFillSampleData()">
            ⚡ Auto-Fill Sample Order
          </button>
        </div>

        <div class="form-grid form-grid-2 mb-4">
          <div class="form-group"><label class="form-label">Customer Name <span class="required">*</span></label>
            <input id="ord-cust-name" name="customerName" class="form-control" placeholder="Customer or company name" required /></div>
          <div class="form-group"><label class="form-label">Customer Tier</label>
            <select id="ord-cust-tier" name="customerTier" class="form-control">
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="VIP">VIP</option>
            </select></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select id="ord-priority" name="priority" class="form-control">
              <option value="standard">Standard</option>
              <option value="express">Express</option>
              <option value="vip">VIP</option>
            </select></div>
          <div class="form-group"><label class="form-label">Due Date <span class="required">*</span></label>
            <input id="ord-due-date" name="dueDate" type="datetime-local" value="${tomorrow}" class="form-control" required /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Notes</label>
            <input id="ord-notes" name="notes" class="form-control" placeholder="Optional notes…" /></div>
        </div>

        <div class="divider"></div>
        <h5 class="font-semibold mb-3">Order Items</h5>
        <div id="order-items-builder"></div>
        <button type="button" class="btn btn-secondary btn-sm mt-3" onclick="OrdersModule.addItemRow()">
          + Add Item
        </button>
      </form>`, {
      size:'lg',
      footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
              <button class="btn btn-secondary" onclick="OrdersModule.submitCreateOrder(false)">Create Order</button>
              <button class="btn btn-primary font-bold" onclick="OrdersModule.submitCreateOrder(true)">⚡ Create & Auto-Allocate</button>`,
      onOpen: () => addItemRow()
    });
  }

  let orderItemCount = 0;

  function addItemRow(productId = '', qty = 1) {
    const container = document.getElementById('order-items-builder');
    if (!container) return;
    const products = Store.get.products().filter(p => p.quantity > 0);
    const idx = orderItemCount++;
    const row = document.createElement('div');
    row.className = 'order-item-row mb-2';
    row.id = `item-row-${idx}`;
    row.innerHTML = `
      <select name="productId" class="form-control" style="flex:1" onchange="OrdersModule.onProductSelect(this,${idx})">
        <option value="">— Select Product —</option>
        ${products.map(p => `<option value="${p.id}" ${p.id===productId?'selected':''} data-sku="${p.sku}" data-name="${p.name}">${p.name} (${p.sku}) · Stock: ${p.quantity}</option>`).join('')}
      </select>
      <input name="quantity" type="number" min="1" value="${qty}" class="form-control" style="width:80px" placeholder="Qty" />
      <button type="button" class="btn btn-ghost icon-btn" onclick="document.getElementById('item-row-${idx}').remove()" title="Remove">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    container.appendChild(row);
  }

  function autoFillSampleData() {
    const custName = document.getElementById('ord-cust-name');
    const custTier = document.getElementById('ord-cust-tier');
    const priority = document.getElementById('ord-priority');
    const notes    = document.getElementById('ord-notes');
    const itemsBuilder = document.getElementById('order-items-builder');

    if (custName) custName.value = 'Apex Distributors Inc.';
    if (custTier) custTier.value = 'VIP';
    if (priority) priority.value = 'vip';
    if (notes)    notes.value = 'Express customer priority order';

    if (itemsBuilder) {
      itemsBuilder.innerHTML = '';
      const inStock = Store.get.products().filter(p => p.quantity > 5);
      if (inStock.length >= 2) {
        addItemRow(inStock[0].id, 5);
        addItemRow(inStock[1].id, 10);
      } else if (inStock.length >= 1) {
        addItemRow(inStock[0].id, 3);
      }
    }

    Utils.Toast?.info('Form Auto-Filled', 'Sample customer & items populated');
  }

  function onProductSelect(select, idx) {
    // Product selected
  }

  function submitCreateOrder(autoAllocate = false) {
    const form = document.getElementById('create-order-form');
    if (!form?.checkValidity()) { form?.reportValidity(); return; }
    const formData = new FormData(form);
    const data = {
      customerName: formData.get('customerName'),
      customerTier: formData.get('customerTier'),
      priority:     formData.get('priority'),
      dueDate:      formData.get('dueDate'),
      notes:        formData.get('notes') || '',
    };

    // Collect items
    const itemRows = document.querySelectorAll('#order-items-builder .order-item-row');
    const items = [];
    itemRows.forEach(row => {
      const productId = row.querySelector('[name="productId"]')?.value;
      const qty = parseInt(row.querySelector('[name="quantity"]')?.value) || 0;
      if (!productId || qty <= 0) return;
      const product = Store.get.productById(productId);
      if (!product) return;
      items.push({ productId, sku: product.sku, name: product.name, quantity: qty, allocated: 0 });
    });

    if (items.length === 0) { Utils.Toast.error('Add at least one item'); return; }

    data.items = items;
    const order = Store.addOrder(data);
    Utils.Modal.close();
    orderItemCount = 0;

    if (autoAllocate) {
      Store.allocateOrder(order.id);
      Utils.Sound?.playSuccess?.();
      Utils.Toast.success('Order Created & Allocated', `${order.id} created and auto-allocated to stock!`);
    } else {
      Utils.Toast.success('Order Created', `${order.id} created successfully`);
    }

    Router.dispatch();
  }

  function quickOrderPrompt() {
    Utils.Modal.open('⚡ 1-Click Quick Order Presets', `
      <div class="flex flex-col gap-3">
        <p class="text-xs text-muted mb-2">Select a pre-configured order bundle to instantly create, validate, and allocate the order with one single click:</p>
        
        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform" 
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(6,182,212,0.3)"
             onclick="OrdersModule.quickCreateOrder('tech'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-primary">🚀 VIP Tech Hardware Bundle</span>
            <span class="badge priority-vip">VIP Priority</span>
          </div>
          <div class="text-xs text-muted">Customer: Apex Distributors · 5× Arduino Mega + 10× PCB Proto Boards</div>
        </div>

        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform" 
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(245,158,11,0.3)"
             onclick="OrdersModule.quickCreateOrder('hardware'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-warning">🛠️ Industrial Fastener Pack</span>
            <span class="badge priority-express">Express</span>
          </div>
          <div class="text-xs text-muted">Customer: BuildRight Co · 20× M8 Hex Bolts + 20× M8 Hex Nuts</div>
        </div>

        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform" 
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(16,185,129,0.3)"
             onclick="OrdersModule.quickCreateOrder('safety'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-success">📦 Warehouse Safety Supply Kit</span>
            <span class="badge priority-standard">Standard</span>
          </div>
          <div class="text-xs text-muted">Customer: SafeGuard Supply · 10× Nitrile Gloves + 4× Steel Boots</div>
        </div>

        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform" 
             style="background:rgba(168,85,247,0.05);border:1px solid rgba(168,85,247,0.3)"
             onclick="OrdersModule.quickCreateOrder('random'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-purple-400">🎲 Random Live In-Stock Order</span>
            <span class="badge badge-purple" style="background:rgba(168,85,247,0.2);color:#C084FC">Instant</span>
          </div>
          <div class="text-xs text-muted">Automatically pairs random customer with 2 available warehouse products</div>
        </div>
      </div>
    `, { size: 'md' });
  }

  function quickCreateOrder(presetKey) {
    const products = Store.get.products();
    const customers = SeedData.customers || [
      { name: 'Apex Distributors', tier: 'VIP' },
      { name: 'BuildRight Co.', tier: 'Standard' },
      { name: 'SafeGuard Supply', tier: 'VIP' }
    ];

    let orderData = {};
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    if (presetKey === 'tech') {
      const p1 = products.find(p => p.sku === 'ELC-MCU-328') || products[0];
      const p2 = products.find(p => p.sku === 'ELC-PCB-PROTO') || products[1];
      orderData = {
        customerName: 'Apex Distributors', customerTier: 'VIP', priority: 'vip',
        dueDate: tomorrow, notes: '⚡ 1-Click VIP Tech Bundle',
        items: [
          { productId: p1.id, sku: p1.sku, name: p1.name, quantity: 5, allocated: 0 },
          { productId: p2.id, sku: p2.sku, name: p2.name, quantity: 10, allocated: 0 }
        ]
      };
    } else if (presetKey === 'hardware') {
      const p1 = products.find(p => p.sku === 'HRD-BLT-M8x40') || products[2] || products[0];
      const p2 = products.find(p => p.sku === 'HRD-NUT-M8') || products[3] || products[1];
      orderData = {
        customerName: 'BuildRight Co.', customerTier: 'Premium', priority: 'express',
        dueDate: tomorrow, notes: '⚡ 1-Click Hardware Pack',
        items: [
          { productId: p1.id, sku: p1.sku, name: p1.name, quantity: 20, allocated: 0 },
          { productId: p2.id, sku: p2.sku, name: p2.name, quantity: 20, allocated: 0 }
        ]
      };
    } else if (presetKey === 'safety') {
      const p1 = products.find(p => p.sku === 'SAF-GLV-NTL-M') || products[4] || products[0];
      const p2 = products.find(p => p.sku === 'SAF-BOOT-S11') || products[5] || products[1];
      orderData = {
        customerName: 'SafeGuard Supply', customerTier: 'VIP', priority: 'vip',
        dueDate: tomorrow, notes: '⚡ 1-Click Safety Supply Kit',
        items: [
          { productId: p1.id, sku: p1.sku, name: p1.name, quantity: 10, allocated: 0 },
          { productId: p2.id, sku: p2.sku, name: p2.name, quantity: 4, allocated: 0 }
        ]
      };
    } else {
      // Random
      const c = customers[Math.floor(Math.random() * customers.length)];
      const inStock = products.filter(p => p.quantity > 5);
      const p1 = inStock[Math.floor(Math.random() * inStock.length)] || products[0];
      const p2 = inStock[(Math.floor(Math.random() * inStock.length) + 1) % inStock.length] || products[1];
      orderData = {
        customerName: c.name, customerTier: c.tier || 'Standard', priority: c.tier === 'VIP' ? 'vip' : 'standard',
        dueDate: tomorrow, notes: '🎲 Random In-Stock Order',
        items: [
          { productId: p1.id, sku: p1.sku, name: p1.name, quantity: Math.min(8, p1.quantity || 1), allocated: 0 },
          { productId: p2.id, sku: p2.sku, name: p2.name, quantity: Math.min(12, p2.quantity || 1), allocated: 0 }
        ]
      };
    }

    const order = Store.addOrder(orderData);
    Store.allocateOrder(order.id);

    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('⚡ Quick Order Created', `Order ${order.id} created & auto-allocated for ${order.customerName}!`);
    Router.dispatch();
  }

  function setStatusFilter(status) {
    filters.status = status;
    currentView = 'table';
    Router.dispatch();
  }

  function exportOrders() {
    const orders = Store.get.orders().map(o => ({
      ID: o.id, Customer: o.customerName, Tier: o.customerTier,
      Priority: o.priority, Status: o.status, Items: o.items.length,
      Created: Utils.formatDate(o.createdAt), DueDate: Utils.formatDate(o.dueDate),
      Carrier: o.carrier || '', Tracking: o.trackingId || '', Notes: o.notes
    }));
    Utils.exportCSV(orders, 'orders_export.csv');
    Utils.Toast.success('Export Complete', 'orders_export.csv downloaded');
  }

  return { render, renderContent, openOrderDetail, openCreateModal,
           addItemRow, autoFillSampleData, onProductSelect, submitCreateOrder,
           quickOrderPrompt, quickCreateOrder, batchAllocate, batchPrintLabels,
           batchExport, clearSelection,
           allocateOne, goToDispatch, setStatusFilter, exportOrders };
})();
