/* ============================================================
   WarehouseOS — modules/allocation.js
   Inventory Allocation Engine Module
   ============================================================ */

const AllocationModule = (() => {

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
  }

  function buildHTML() {
    const orders   = Store.get.orders();
    const pending  = orders.filter(o => o.status === 'pending')
      .sort((a,b) => Utils.orderPriorityScore(b) - Utils.orderPriorityScore(a));
    const allocated = orders.filter(o => o.status === 'allocated');
    const conflicts = detectConflicts(pending);

    return `
    <div class="allocation-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Inventory Allocation</h2>
          <p class="section-sub">Smart FIFO allocation engine · ${pending.length} orders pending</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-secondary btn-sm" onclick="AllocationModule.runDryRun()">
            🔍 Dry Run
          </button>
          <button class="btn btn-primary" onclick="AllocationModule.allocateAll()" ${pending.length===0?'disabled':''}>
            ⚡ Allocate All Pending
          </button>
        </div>
      </div>

      ${conflicts.length > 0 ? `
      <div class="alert-banner warning mb-4">
        <span class="alert-banner-icon">⚠️</span>
        <div>
          <strong>Allocation Conflicts Detected</strong><br/>
          <span class="text-xs">${conflicts.length} item(s) are competing across multiple orders. Higher-priority orders will be allocated first.</span>
        </div>
      </div>` : ''}

      <!-- Competitive Twist: Autonomous Decision Engine Card -->
      <div class="card card-glow-interactive mb-6" style="background:linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9));border:1px solid rgba(6,182,212,0.4)">
        <div class="card-header" style="border-bottom:1px solid rgba(255,255,255,0.08)">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔥</span>
            <div>
              <h4 class="card-title text-primary" style="font-size:15px">Autonomous Stock Conflict & Decision Engine</h4>
              <p class="text-xs text-muted">AI Conflict Resolver: Real-time decision optimization for competing order allocations</p>
            </div>
          </div>
          <span class="badge badge-primary font-mono" style="font-size:10px">● Live Scenario Active</span>
        </div>
        <div class="card-body">
          <!-- Real-world scenario description matching user prompt -->
          <div class="p-3 mb-4 rounded-lg" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2)">
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-cyan-400 font-mono">⚡ REAL-TIME CONFLICT DETECTED</span>
              <span class="text-xs text-muted font-mono">SKU: ELC-MCU-001 (Microcontroller Unit)</span>
            </div>
            <div class="text-xs text-secondary leading-relaxed mb-3">
              <strong>Scenario Deficit:</strong> Urgent VIP Order <strong>#ORD-001</strong> demands <strong>10 units</strong>, but physical Bin A02 contains only <strong>7 units</strong> (3-unit deficit). A lower-priority Standard Order <strong>#ORD-004</strong> currently holds <strong>5 allocated units</strong> in Bin B02 (un-picked).
            </div>
            <div class="font-bold text-xs text-primary mb-2">🤖 What should the system do? Choose an autonomous decision strategy:</div>
          </div>

          <!-- 3 Decision Recommendation Options -->
          <div class="grid grid-cols-3 gap-3">
            <!-- Option 1: Priority Reallocation -->
            <div class="p-3 rounded-xl flex flex-col justify-between" style="background:rgba(15,23,42,0.7);border:1px solid rgba(16,185,129,0.3)">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-success">Option A (Optimal)</span>
                  <span class="badge badge-success" style="font-size:8.5px">Highest SLA</span>
                </div>
                <div class="font-bold text-xs mb-1">⚡ Priority Reallocation</div>
                <div class="text-xs text-muted mb-3" style="font-size:11px">
                  Reclaim 3 units from #ORD-004 → Assign to Urgent #ORD-001. VIP order fulfills 100% (10/10) instantly. Standard order delayed +24h.
                </div>
              </div>
              <button class="btn btn-primary btn-sm w-full" onclick="AllocationModule.executeDecisionAction('reallocate_priority')">
                ⚡ Execute Reallocation
              </button>
            </div>

            <!-- Option 2: Split Shipment -->
            <div class="p-3 rounded-xl flex flex-col justify-between" style="background:rgba(15,23,42,0.7);border:1px solid rgba(245,158,11,0.3)">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-warning">Option B</span>
                  <span class="badge badge-warning" style="font-size:8.5px">Partial Delivery</span>
                </div>
                <div class="font-bold text-xs mb-1">📦 Split-Ship & Emergency PO</div>
                <div class="text-xs text-muted mb-3" style="font-size:11px">
                  Ship 7 available units to #ORD-001 immediately. Auto-draft priority purchase order (+3 units) with supplier 18h arrival.
                </div>
              </div>
              <button class="btn btn-secondary btn-sm w-full" onclick="AllocationModule.executeDecisionAction('split_shipment')">
                📦 Execute Split-Ship
              </button>
            </div>

            <!-- Option 3: Buffer Transfer -->
            <div class="p-3 rounded-xl flex flex-col justify-between" style="background:rgba(15,23,42,0.7);border:1px solid rgba(168,85,247,0.3)">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-purple-400">Option C</span>
                  <span class="badge badge-purple" style="font-size:8.5px;background:rgba(168,85,247,0.2);color:#C084FC">Cross-Zone</span>
                </div>
                <div class="font-bold text-xs mb-1">🔄 Cross-Zone Buffer Transfer</div>
                <div class="text-xs text-muted mb-3" style="font-size:11px">
                  Transfer 3 units from Zone E High-Value Buffer Stock to Bin A02. Fulfills BOTH orders 100% without delaying either.
                </div>
              </div>
              <button class="btn btn-secondary btn-sm w-full" onclick="AllocationModule.executeDecisionAction('cross_zone_transfer')">
                🔄 Execute Buffer Transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="data-grid" style="grid-template-columns:1fr 1fr;gap:var(--sp-6)">
        <!-- Pending Orders -->
        <div>
          <h4 class="font-semibold mb-4 flex items-center gap-2">
            <span class="badge status-pending">Pending</span>
            <span class="text-muted text-sm">${pending.length} orders</span>
          </h4>
          ${pending.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">✅</div><h4>All orders allocated</h4><p>No pending orders in queue</p></div>` :
            pending.map(o => pendingOrderCard(o, conflicts)).join('')}
        </div>

        <!-- Recently Allocated -->
        <div>
          <h4 class="font-semibold mb-4 flex items-center gap-2">
            <span class="badge status-allocated">Allocated</span>
            <span class="text-muted text-sm">${allocated.length} orders</span>
          </h4>
          ${allocated.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📋</div><h4>No allocated orders</h4></div>` :
            allocated.slice(0, 5).map(o => allocatedOrderCard(o)).join('')}
        </div>
      </div>

      <!-- Stock Availability Table -->
      <div class="card mt-6">
        <div class="card-header">
          <h4 class="card-title">Stock Availability Overview</h4>
          <span class="text-xs text-muted">Products requested by pending orders</span>
        </div>
        <div class="card-body" style="padding:0">
          ${renderStockAvailabilityTable(pending)}
        </div>
      </div>
    </div>`;
  }

  function pendingOrderCard(order, conflicts) {
    const hasConflict = conflicts.some(c => c.orderIds.includes(order.id));
    const score = Utils.orderPriorityScore(order);
    const totalQty = order.items.reduce((s,i)=>s+i.quantity,0);
    const canFulfill = canFullyFulfill(order);

    return `
    <div class="allocation-card ${hasConflict?'conflict':''} mb-3" id="alloc-card-${order.id}">
      <div class="allocation-header">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${order.id}</span>
            <span class="badge priority-${order.priority}">${Utils.priorityLabel(order.priority)}</span>
            ${hasConflict ? '<span class="badge-warning badge">⚠️ Conflict</span>' : ''}
          </div>
          <div class="font-semibold">${order.customerName}</div>
          <div class="text-xs text-muted">${totalQty} units · Due: ${Utils.dueLabel(order.dueDate)} · Score: ${score}</div>
        </div>
        <div class="flex flex-col gap-2 items-end">
          <button class="btn btn-primary btn-sm" onclick="AllocationModule.allocateOne('${order.id}')">
            Allocate
          </button>
          ${!canFulfill ? '<span class="text-xs text-warning">⚠️ Partial only</span>' : '<span class="text-xs text-success">✅ Full fill</span>'}
        </div>
      </div>
      ${order.items.map(item => {
        const product = Store.get.productById(item.productId);
        const avail   = product ? product.quantity : 0;
        const canAlloc= Math.min(avail, item.quantity);
        const statusCls = canAlloc >= item.quantity ? 'text-success' : canAlloc > 0 ? 'text-warning' : 'text-danger';
        return `
        <div class="alloc-item-row">
          <span class="product-row-zone zone-${product?.zone||'A'}">${product?.zone||'?'}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${item.name}</div>
            <div class="font-mono text-xs text-muted">${product?.bin||'?'}</div>
          </div>
          <div class="alloc-qty-wrap">
            <span class="alloc-qty-needed">${item.quantity}</span>
            <span class="alloc-qty-avail text-muted">needed</span>
            <span class="${statusCls} font-mono font-bold text-xs">${avail} avail</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function allocatedOrderCard(order) {
    const task = Store.get.pickTasks().find(t => t.orderId === order.id);
    return `
    <div class="allocation-card success mb-3">
      <div class="allocation-header">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${order.id}</span>
            <span class="badge status-allocated">Allocated</span>
          </div>
          <div class="font-semibold">${order.customerName}</div>
          <div class="text-xs text-muted">${order.items.length} items · ${Utils.dueLabel(order.dueDate)}</div>
        </div>
        <div class="text-xs text-success">
          ✅ ${order.items.reduce((s,i)=>s+i.allocated,0)} units<br/>
          ${task ? `<span class="text-muted">Pick: ${task.id}</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  function renderStockAvailabilityTable(pendingOrders) {
    // Collect all required products
    const required = {};
    pendingOrders.forEach(order => {
      order.items.forEach(item => {
        if (!required[item.productId]) {
          required[item.productId] = { name: item.name, sku: item.sku, needed: 0, orders: [] };
        }
        required[item.productId].needed += item.quantity;
        required[item.productId].orders.push(order.id);
      });
    });

    const rows = Object.entries(required).map(([pid, info]) => {
      const p = Store.get.productById(pid);
      const avail = p ? p.quantity : 0;
      const pct   = Math.min(100, avail === 0 ? 0 : Math.round(avail / info.needed * 100));
      return { pid, ...info, avail, pct, zone: p?.zone || '?', bin: p?.bin || '?' };
    });

    if (rows.length === 0) return `<div class="p-6 text-center text-muted text-sm">No pending orders to analyze</div>`;

    return `<div class="table-wrapper" style="border:none;border-radius:0">
      <table class="data-table">
        <thead><tr>
          <th>Product</th><th>Zone/Bin</th><th class="col-num">Needed</th>
          <th class="col-num">Available</th><th style="min-width:140px">Fill Rate</th><th>Orders</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>
              <div class="font-medium text-sm">${r.name}</div>
              <div class="font-mono text-xs text-muted">${r.sku}</div>
            </td>
            <td><div class="flex items-center gap-2">
              <span class="product-row-zone zone-${r.zone}">${r.zone}</span>
              <span class="font-mono text-xs text-muted">${r.bin}</span>
            </div></td>
            <td class="col-num font-mono font-bold">${r.needed}</td>
            <td class="col-num font-mono ${r.avail===0?'text-danger':r.avail<r.needed?'text-warning':'text-success'}">${r.avail}</td>
            <td>
              <div class="stock-bar-wrap">
                <div class="progress flex-1">
                  <div class="progress-bar ${r.pct===100?'success':r.pct>0?'warning':'danger'}" style="width:${r.pct}%"></div>
                </div>
                <span class="stock-label">${r.pct}%</span>
              </div>
            </td>
            <td class="text-xs text-muted">${r.orders.join(', ')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ─── CONFLICT DETECTION ────────────────────────────────────
  function detectConflicts(pendingOrders) {
    const productOrders = {};
    pendingOrders.forEach(o => {
      o.items.forEach(item => {
        if (!productOrders[item.productId]) productOrders[item.productId] = [];
        productOrders[item.productId].push(o.id);
      });
    });
    return Object.entries(productOrders)
      .filter(([, ids]) => ids.length > 1)
      .map(([productId, orderIds]) => ({ productId, orderIds }));
  }

  function canFullyFulfill(order) {
    return order.items.every(item => {
      const p = Store.get.productById(item.productId);
      return p && p.quantity >= item.quantity;
    });
  }

  // ─── ACTIONS ───────────────────────────────────────────────
  function allocateOne(orderId) {
    const result = Store.allocateOrder(orderId);
    if (result.success) {
      Utils.Toast[result.partial?'warning':'success'](
        result.partial ? 'Partially Allocated' : 'Order Allocated',
        result.partial ? 'Some items unavailable — pick task created for available stock'
                       : 'All items allocated — pick task created'
      );
    } else {
      Utils.Toast.error('Allocation Failed', result.reason);
    }
    Router.dispatch();
  }

  function allocateAll() {
    const results = Store.allocateAll();
    const success = results.filter(r => r.success).length;
    const failed  = results.filter(r => !r.success).length;
    const partial = results.filter(r => r.success && r.partial).length;
    if (success > 0) {
      Utils.Toast.success('Batch Allocation Complete',
        `${success} orders allocated · ${partial} partial · ${failed} failed`);
    } else {
      Utils.Toast.warning('No Orders Allocated', 'Insufficient stock for all pending orders');
    }
    Router.dispatch();
  }

  function runDryRun() {
    const pending = Store.get.orders().filter(o => o.status === 'pending');
    if (pending.length === 0) { Utils.Toast.info('No Pending Orders', 'Nothing to analyze'); return; }

    // Simulate without modifying state
    const simStock = {};
    Store.get.products().forEach(p => { simStock[p.id] = p.quantity; });

    let rows = [];
    const sorted = [...pending].sort((a,b) => Utils.orderPriorityScore(b) - Utils.orderPriorityScore(a));
    sorted.forEach(order => {
      let canFill = true;
      order.items.forEach(item => {
        const avail = simStock[item.productId] || 0;
        const alloc = Math.min(avail, item.quantity);
        simStock[item.productId] = Math.max(0, avail - alloc);
        if (alloc < item.quantity) canFill = false;
      });
      rows.push({ orderId: order.id, customer: order.customerName, priority: order.priority, canFill });
    });

    Utils.Modal.open('Dry Run — Allocation Preview', `
      <p class="text-sm text-muted mb-4">Simulated allocation result without modifying stock (sorted by priority score):</p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Priority</th><th>Result</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td class="font-mono font-bold text-sm">${r.orderId}</td>
              <td>${r.customer}</td>
              <td><span class="badge priority-${r.priority}">${Utils.priorityLabel(r.priority)}</span></td>
              <td>${r.canFill ? '<span class="badge badge-success">✅ Full Fill</span>' : '<span class="badge badge-warning">⚠️ Partial</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="alert-banner info mt-4">
        <span class="alert-banner-icon">ℹ️</span>
        <span>This is a preview only. No stock has been modified. Click "Allocate All Pending" to execute.</span>
      </div>`, { size:'lg' });
  }

  function executeDecisionAction(decisionType) {
    const res = Store.executeDecision(decisionType);
    if (res.success) {
      Utils.Sound?.playSuccess?.();
      Utils.Toast.success('Autonomous Decision Executed', res.message);
    } else {
      Utils.Toast.warning('Decision Notice', res.message);
    }
    Router.dispatch();
  }

  function bindEvents(container) {
    // Events bound via inline handlers
  }

  return {
    render, allocateOne, allocateAll, runDryRun, executeDecisionAction
  };
})();
