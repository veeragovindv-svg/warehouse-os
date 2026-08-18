/* ============================================================
   WarehouseOS — modules/dispatch.js
   Order Fulfillment & Dispatch Tracking Module
   ============================================================ */

const DispatchModule = (() => {

  let selectedCarriers = {};

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
  }

  function buildHTML() {
    const dispatches  = Store.get.dispatches();
    const packedOrders = Store.get.ordersByStatus('packed');
    const inTransit   = dispatches.filter(d => ['scheduled','picked_up','in_transit'].includes(d.status));
    const delivered   = dispatches.filter(d => d.status === 'delivered');

    return `
    <div class="dispatch-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Fulfillment & Dispatch</h2>
          <p class="section-sub">${packedOrders.length} ready to dispatch · ${inTransit.length} in transit</p>
        </div>
        <div class="section-actions">
          ${packedOrders.length > 0 ? `
          <button class="btn btn-primary" onclick="DispatchModule.batchDispatch()">
            🚚 Batch Dispatch All (${packedOrders.length})
          </button>` : ''}
        </div>
      </div>

      <!-- KPI Row -->
      <div class="data-grid data-grid-4 mb-6">
        <div class="kpi-card">
          <div class="kpi-icon">📦</div>
          <div class="kpi-label">Ready to Dispatch</div>
          <div class="kpi-value" style="color:var(--clr-warning-text)">${packedOrders.length}</div>
          <div class="kpi-sub">Packed, awaiting carrier</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🚚</div>
          <div class="kpi-label">In Transit</div>
          <div class="kpi-value" style="color:var(--clr-purple)">${inTransit.length}</div>
          <div class="kpi-sub">Active shipments</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">✅</div>
          <div class="kpi-label">Delivered</div>
          <div class="kpi-value" style="color:var(--clr-success-text)">${delivered.length}</div>
          <div class="kpi-sub">Completed shipments</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📊</div>
          <div class="kpi-label">Fill Rate</div>
          <div class="kpi-value" style="color:var(--clr-primary-light)">
            ${Store.get.orders().length ? Math.round(([...inTransit,...delivered].length / Store.get.orders().length)*100) : 0}%
          </div>
          <div class="kpi-sub">Orders dispatched</div>
        </div>
      </div>

      <!-- Ready Queue -->
      ${packedOrders.length > 0 ? `
      <div class="card mb-6">
        <div class="card-header">
          <h4 class="card-title">📦 Dispatch Queue</h4>
          <span class="badge badge-warning">${packedOrders.length} orders ready</span>
        </div>
        <div class="card-body" style="padding:0">
          ${packedOrders.map(order => dispatchQueueItemHTML(order)).join('')}
        </div>
      </div>` : ''}

      <!-- Active Shipments -->
      <div class="card mb-6">
        <div class="card-header">
          <h4 class="card-title">🚚 Active Shipments</h4>
          <span class="badge badge-purple">${inTransit.length} in transit</span>
        </div>
        <div class="card-body" style="padding:0">
          ${inTransit.length === 0 ? `<div class="p-6 text-center text-muted text-sm">No active shipments</div>` :
            inTransit.map(d => shipmentRowHTML(d)).join('')}
        </div>
      </div>

      <!-- Delivery History -->
      <div class="card">
        <div class="card-header">
          <h4 class="card-title">✅ Delivery History</h4>
          <span class="badge badge-success">${delivered.length} delivered</span>
        </div>
        <div class="card-body" style="padding:0">
          ${delivered.length === 0 ? `<div class="p-6 text-center text-muted text-sm">No deliveries yet</div>` :
            delivered.map(d => deliveredRowHTML(d)).join('')}
        </div>
      </div>
    </div>`;
  }

  function dispatchQueueItemHTML(order) {
    const carriers = ['FedEx','UPS','DHL','Local'];
    return `
    <div class="dispatch-card" style="border-radius:0;border:none;border-bottom:1px solid var(--clr-border)">
      <div class="flex items-start gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${order.id}</span>
            <span class="badge priority-${order.priority}">${Utils.priorityLabel(order.priority)}</span>
            <span class="badge status-packed">Packed</span>
          </div>
          <div class="font-semibold">${order.customerName}</div>
          <div class="text-xs text-muted">${order.items.length} items · ${Utils.dueLabel(order.dueDate)}</div>
        </div>

        <div class="flex-1">
          <div class="text-xs text-muted mb-2 font-semibold">Select Carrier</div>
          <div class="carrier-selector" id="carrier-sel-${order.id}">
            ${carriers.map(c => `
              <div class="carrier-option ${selectedCarriers[order.id]===c?'selected':''}"
                   onclick="DispatchModule.selectCarrier('${order.id}','${c}')">
                ${Utils.carrierIcon(c)} ${c}
              </div>`).join('')}
          </div>
        </div>

        <div class="flex flex-col gap-2 items-end">
          <button class="btn btn-primary" onclick="DispatchModule.dispatchOrder('${order.id}')"
                  ${!selectedCarriers[order.id]?'disabled':''}>
            🚚 Dispatch
          </button>
          <button class="btn btn-ghost btn-sm" onclick="DispatchModule.printLabel('${order.id}')">
            🖨️ Print Label
          </button>
        </div>
      </div>
    </div>`;
  }

  function shipmentRowHTML(dispatch) {
    const order = Store.get.orderById(dispatch.orderId);
    const statusSteps = ['scheduled','picked_up','in_transit','delivered'];
    const stepIdx = statusSteps.indexOf(dispatch.status);
    const statusLabels = ['Scheduled','Picked Up','In Transit','Delivered'];

    return `
    <div class="dispatch-card" style="border-radius:0;border:none;border-bottom:1px solid var(--clr-border)">
      <div class="flex items-start gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${dispatch.orderId}</span>
            <span class="tracking-id">${dispatch.trackingId}</span>
            <span class="chip">${Utils.carrierIcon(dispatch.carrier)} ${dispatch.carrier}</span>
          </div>
          <div class="font-semibold">${order?.customerName || '—'}</div>
          <div class="text-xs text-muted">Dispatched: ${Utils.formatDateTime(dispatch.dispatchedAt)}</div>
        </div>

        <!-- Progress Steps -->
        <div class="flex-1">
          <div class="flex items-center gap-1">
            ${statusSteps.map((s,i) => `
              <div class="flex items-center gap-1">
                <div style="width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;
                  background:${i<stepIdx?'var(--clr-success)':i===stepIdx?'var(--clr-primary)':'var(--clr-surface-4)'};
                  color:${i<=stepIdx?'white':'var(--clr-text-muted)'}">${i<stepIdx?'✓':i+1}</div>
                ${i<3?`<div style="height:2px;width:20px;background:${i<stepIdx?'var(--clr-success)':'var(--clr-border)'}"></div>`:''}
              </div>`).join('')}
          </div>
          <div class="flex gap-1 mt-1">
            ${statusSteps.map((s,i) => `<span style="flex:1;font-size:9px;color:${i===stepIdx?'var(--clr-primary-light)':'var(--clr-text-muted)'};text-align:center">${statusLabels[i]}</span>`).join('')}
          </div>
        </div>

        <div class="flex flex-col gap-2 items-end">
          ${dispatch.status !== 'delivered' ? `
          <button class="btn btn-secondary btn-sm" onclick="DispatchModule.advanceStatus('${dispatch.id}')">
            Advance →
          </button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="DispatchModule.viewTracking('${dispatch.id}')">
            📍 Track
          </button>
        </div>
      </div>
    </div>`;
  }

  function deliveredRowHTML(dispatch) {
    const order = Store.get.orderById(dispatch.orderId);
    return `
    <div style="padding:var(--sp-4);border-bottom:1px solid var(--clr-border);display:flex;align-items:center;gap:var(--sp-4)">
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="font-mono text-sm font-bold" style="color:var(--clr-primary-light)">${dispatch.orderId}</span>
          <span class="tracking-id text-xs">${dispatch.trackingId}</span>
          <span class="chip">${Utils.carrierIcon(dispatch.carrier)} ${dispatch.carrier}</span>
        </div>
        <div class="text-sm">${order?.customerName || '—'}</div>
      </div>
      <div class="text-xs text-muted text-right">
        <div>Delivered: ${Utils.formatDate(dispatch.deliveredAt)}</div>
        <div>Dispatched: ${Utils.formatDate(dispatch.dispatchedAt)}</div>
      </div>
      <span class="badge badge-success">✅ Delivered</span>
    </div>`;
  }

  // ─── ACTIONS ───────────────────────────────────────────────
  function selectCarrier(orderId, carrier) {
    selectedCarriers[orderId] = carrier;
    // Update UI
    const sel = document.getElementById(`carrier-sel-${orderId}`);
    if (sel) {
      sel.querySelectorAll('.carrier-option').forEach(opt => {
        opt.classList.toggle('selected', opt.textContent.trim().includes(carrier));
      });
    }
    // Enable dispatch button
    const btn = sel?.closest('.dispatch-card')?.querySelector('.btn-primary');
    if (btn) btn.removeAttribute('disabled');
  }

  function dispatchOrder(orderId) {
    const carrier = selectedCarriers[orderId];
    if (!carrier) { Utils.Toast.error('Select a carrier first'); return; }

    // Create dispatch record
    const existing = Store.get.dispatches().find(d => d.orderId === orderId);
    if (existing) {
      Store.dispatchOrder(existing.id);
    } else {
      const d = Store.createDispatch(orderId, carrier);
      Store.dispatchOrder(d.id);
    }
    delete selectedCarriers[orderId];
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Order Dispatched', `Carrier: ${carrier} · Tracking ID generated`);
    Router.dispatch();
  }

  function batchDispatch() {
    const packed = Store.get.ordersByStatus('packed');
    if (packed.length === 0) return;
    const defaultCarrier = 'FedEx';
    packed.forEach(order => {
      const carrier = selectedCarriers[order.id] || defaultCarrier;
      const existing = Store.get.dispatches().find(d => d.orderId === order.id);
      if (existing) Store.dispatchOrder(existing.id);
      else {
        const d = Store.createDispatch(order.id, carrier);
        Store.dispatchOrder(d.id);
      }
    });
    selectedCarriers = {};
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Batch Dispatch Complete', `${packed.length} orders dispatched via ${defaultCarrier}`);
    Router.dispatch();
  }

  function advanceStatus(dispatchId) {
    const dispatch = Store.get.dispatchById(dispatchId);
    if (!dispatch) return;
    const steps = ['scheduled','picked_up','in_transit','delivered'];
    const idx = steps.indexOf(dispatch.status);
    if (idx < steps.length - 1) {
      Store.updateDispatchStatus(dispatchId, steps[idx + 1]);
      Utils.Sound?.playScan?.();
      Utils.Toast.success('Status Updated', `→ ${steps[idx+1].replace('_',' ')}`);
      Router.dispatch();
    }
  }

  function printLabel(orderId) {
    const order = Store.get.orderById(orderId);
    const carrier = selectedCarriers[orderId] || 'FedEx Priority';
    const tracking = 'TRK-' + (order?.id || '000').replace(/[^0-9]/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    Utils.Sound?.playScan?.();
    Utils.Modal.open(`Shipping Label — ${orderId}`, `
      <div style="background:#FFFFFF;color:#0F172A;padding:24px;border-radius:12px;border:2px solid #0F172A;font-family:var(--font-sans)">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #0F172A;padding-bottom:12px;margin-bottom:12px">
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:900;letter-spacing:-0.03em">${carrier.toUpperCase()} EXPRESS</h3>
            <p style="margin:2px 0 0;font-size:10px;color:#64748B">STANDARD OVERNIGHT · AIR FREIGHT</p>
          </div>
          <div style="text-align:right">
            <span style="font-family:var(--font-mono);font-size:14px;font-weight:800;background:#0F172A;color:#FFFFFF;padding:4px 8px;border-radius:4px">ZONE A</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;margin-bottom:16px">
          <div>
            <span style="font-size:9px;color:#64748B;text-transform:uppercase;font-weight:700">Ship From:</span>
            <div style="font-weight:700">Central Distribution Hub</div>
            <div>Bay 4, Logistics Way</div>
            <div>Warehouse Sector 7</div>
          </div>
          <div>
            <span style="font-size:9px;color:#64748B;text-transform:uppercase;font-weight:700">Ship To:</span>
            <div style="font-weight:700">${order?.customerName || 'Valued Customer'}</div>
            <div>Order ID: ${orderId}</div>
            <div>Priority: ${order?.priority?.toUpperCase() || 'STANDARD'}</div>
          </div>
        </div>

        <div style="text-align:center;padding:16px 0;background:#F8FAFC;border-radius:8px;border:1px dashed #CBD5E1">
          <!-- Barcode simulation -->
          <div style="display:inline-flex;align-items:flex-end;gap:2px;height:48px;margin-bottom:6px">
            ${[3,1,4,2,1,5,2,4,1,3,2,5,1,4,2,3,1,4,2,5,1,3,2,4,1,5].map((w,i)=>`<div style="width:${w}px;height:${30+(i%4)*5}px;background:#0F172A"></div>`).join('')}
          </div>
          <div style="font-family:var(--font-mono);font-size:13px;font-weight:800;letter-spacing:0.15em">${tracking}</div>
        </div>
      </div>`,
      {
        footer: `<button class="btn btn-ghost" onclick="Utils.Modal.close()">Close</button>
                 <button class="btn btn-primary" onclick="window.print();Utils.Toast.success('Printing...','Label sent to thermal printer');Utils.Modal.close()">🖨️ Print to Thermal Printer</button>`
      }
    );
  }

  function viewTracking(dispatchId) {
    const d = Store.get.dispatchById(dispatchId);
    if (!d) return;
    const order = Store.get.orderById(d.orderId);
    const statusTimeline = [
      { label:'Order Placed',     time: Utils.formatDateTime(order?.createdAt),  done:true },
      { label:'Packed & Ready',   time: null,                                      done:true },
      { label:'Carrier Pickup',   time: d.dispatchedAt ? Utils.formatDateTime(d.dispatchedAt) : null, done:!!d.dispatchedAt },
      { label:'In Transit',       time: null, done: ['in_transit','delivered'].includes(d.status) },
      { label:'Delivered',        time: d.deliveredAt ? Utils.formatDateTime(d.deliveredAt) : null, done:!!d.deliveredAt },
    ];

    Utils.Modal.open(`Tracking — ${d.trackingId}`, `
      <div class="kv-list mb-5">
        <div class="kv-item"><span class="kv-key">Order</span><span class="kv-val font-mono">${d.orderId}</span></div>
        <div class="kv-item"><span class="kv-key">Carrier</span><span class="kv-val">${Utils.carrierIcon(d.carrier)} ${d.carrier}</span></div>
        <div class="kv-item"><span class="kv-key">Tracking ID</span><span class="tracking-id">${d.trackingId}</span></div>
        <div class="kv-item"><span class="kv-key">Customer</span><span class="kv-val">${order?.customerName||'—'}</span></div>
      </div>
      <h5 class="font-semibold mb-3">Shipment Timeline</h5>
      <div class="timeline">
        ${statusTimeline.map(ev => `
        <div class="timeline-item">
          <div class="timeline-dot ${ev.done?'done':''}"></div>
          <div class="timeline-content">
            <div class="timeline-label">${ev.label}</div>
            ${ev.time ? `<div class="timeline-time">${ev.time}</div>` : '<div class="timeline-time text-muted">Pending</div>'}
          </div>
        </div>`).join('')}
      </div>`);
  }

  function bindEvents(container) {
    // Bound via inline handlers
  }

  return { render, selectCarrier, dispatchOrder, batchDispatch,
           advanceStatus, printLabel, viewTracking };
})();
