/* ============================================================
   WarehouseOS — modules/alerts.js
   Alert Center + Incident Handling Module
   ============================================================ */

const AlertsModule = (() => {

  let currentTab = 'alerts'; // 'alerts' | 'incidents'
  let alertFilter = 'all'; // 'all' | 'critical' | 'warning' | 'open' | 'resolved'

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    renderAlertList(container);
  }

  function buildHTML() {
    const alerts    = Store.get.alerts();
    const incidents = Store.get.incidents();
    const open = alerts.filter(a => a.status !== 'resolved');
    const critical = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved');

    return `
    <div class="alerts-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Alert Center</h2>
          <p class="section-sub">${open.length} open alerts · ${critical.length} critical</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-secondary btn-sm" onclick="AlertsModule.acknowledgeAll()">✓ Acknowledge All</button>
          <button class="btn btn-primary btn-sm" onclick="AlertsModule.openReportIncident()">⚠️ Report Incident</button>
        </div>
      </div>

      <!-- Summary -->
      <div class="data-grid data-grid-4 mb-6">
        <div class="kpi-card" style="border-left:3px solid var(--clr-danger)">
          <div class="kpi-label">Critical</div>
          <div class="kpi-value text-danger">${alerts.filter(a=>a.severity==='critical'&&a.status!=='resolved').length}</div>
          <div class="kpi-sub">Needs immediate action</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid var(--clr-warning)">
          <div class="kpi-label">Warnings</div>
          <div class="kpi-value text-warning">${alerts.filter(a=>a.severity==='warning'&&a.status!=='resolved').length}</div>
          <div class="kpi-sub">Monitor closely</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid var(--clr-info)">
          <div class="kpi-label">Incidents</div>
          <div class="kpi-value text-primary">${incidents.filter(i=>i.status!=='resolved').length}</div>
          <div class="kpi-sub">Under investigation</div>
        </div>
        <div class="kpi-card" style="border-left:3px solid var(--clr-success)">
          <div class="kpi-label">Resolved Today</div>
          <div class="kpi-value text-success">${alerts.filter(a=>a.status==='resolved').length}</div>
          <div class="kpi-sub">All-time count</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="line-tabs mb-0">
        <button class="line-tab-btn ${currentTab==='alerts'?'active':''}" data-tab="alerts">
          🔔 Alerts (${alerts.length})
        </button>
        <button class="line-tab-btn ${currentTab==='incidents'?'active':''}" data-tab="incidents">
          ⚠️ Incidents (${incidents.length})
        </button>
        <button class="line-tab-btn ${currentTab==='reorder'?'active':''}" data-tab="reorder">
          🛒 Reorder Recommendations
        </button>
      </div>

      <!-- Filter (alerts only) -->
      <div id="alert-filter-bar" class="filter-bar mb-4 mt-4">
        ${['all','critical','warning','open','resolved'].map(f => `
          <button class="btn btn-secondary btn-sm ${alertFilter===f?'active':''}" data-filter="${f}" onclick="AlertsModule.setFilter('${f}')">
            ${f.charAt(0).toUpperCase()+f.slice(1)}
          </button>`).join('')}
      </div>

      <!-- Content -->
      <div id="alert-content"></div>
    </div>`;
  }

  function renderAlertList(container) {
    const content = Utils.qs('#alert-content', container || document);
    if (!content) return;

    if (currentTab === 'alerts') {
      content.innerHTML = renderAlertsHTML();
    } else if (currentTab === 'incidents') {
      content.innerHTML = renderIncidentsHTML();
    } else if (currentTab === 'reorder') {
      content.innerHTML = renderReorderHTML();
    }
  }

  function renderAlertsHTML() {
    let alerts = Store.get.alerts();
    if (alertFilter === 'critical')  alerts = alerts.filter(a => a.severity === 'critical');
    if (alertFilter === 'warning')   alerts = alerts.filter(a => a.severity === 'warning');
    if (alertFilter === 'open')      alerts = alerts.filter(a => a.status !== 'resolved');
    if (alertFilter === 'resolved')  alerts = alerts.filter(a => a.status === 'resolved');

    if (alerts.length === 0) return `<div class="empty-state"><div class="empty-state-icon">🎉</div><h4>No alerts matching filter</h4></div>`;

    const icons = { stockout:'🚨', low_stock:'⚠️', damaged:'💔', missing:'🔍' };
    return `<div class="alert-list">
      ${alerts.map(a => `
      <div class="alert-item ${a.severity} ${a.status==='resolved'?'resolved':''}">
        <div class="alert-icon-wrap ${a.severity}">${icons[a.type]||'⚠️'}</div>
        <div class="alert-content flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="alert-id-tag font-mono font-bold text-xs">${a.id}</span>
            <span class="alert-message font-semibold">${a.message}</span>
          </div>
          <div class="alert-detail text-xs">
            ${a.sku ? `<span class="font-mono text-xs font-semibold">${a.sku}</span> · ` : ''}
            ${a.quantity !== undefined && a.threshold ? `Qty: <strong>${a.quantity}</strong> / Threshold: ${a.threshold} · ` : ''}
            ${a.acknowledgedBy ? `Ack'd by ${a.acknowledgedBy} · ` : ''}
            <span class="alert-time">${Utils.timeAgo(a.createdAt)}</span>
          </div>
        </div>
        <div class="alert-actions">
          <span class="badge ${
            a.severity==='critical'?'badge-danger':
            a.severity==='warning' ?'badge-warning':'badge-info'}">
            ${a.severity.toUpperCase()}
          </span>
          <span class="badge ${a.status==='resolved'?'badge-success':a.status==='acknowledged'?'badge-primary':'badge-neutral'}">
            ${a.status.toUpperCase()}
          </span>
          ${a.status === 'open' ? `<button class="btn btn-ghost btn-sm" onclick="AlertsModule.acknowledgeOne('${a.id}')">Ack</button>` : ''}
          ${a.status !== 'resolved' ? `<button class="btn btn-secondary btn-sm" onclick="AlertsModule.resolveOne('${a.id}')">Resolve</button>` : ''}
        </div>
      </div>`).join('')}
    </div>`;
  }

  function renderIncidentsHTML() {
    const incidents = Store.get.incidents();
    if (incidents.length === 0) return `<div class="empty-state"><div class="empty-state-icon">✅</div><h4>No incidents reported</h4></div>`;

    const stageMap = { open:['Open','Under Review','Resolved'], reviewing:['Open','Under Review','Resolved'] };
    return `<div class="flex flex-col gap-4">
      ${incidents.map(inc => {
        const stepIdx = { open:0, reviewing:1, resolved:2 }[inc.status] || 0;
        const reporter = Store.get.staffById(inc.reportedBy);
        return `
        <div class="incident-card ${inc.type} ${inc.status==='resolved'?'resolved':''}">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${inc.id}</span>
                <span class="badge ${inc.type==='damaged'?'badge-danger':'badge-warning'}">${inc.type}</span>
                <span class="badge ${inc.status==='resolved'?'badge-success':inc.status==='reviewing'?'badge-primary':'badge-neutral'}">${inc.status}</span>
              </div>
              <div class="font-semibold text-sm">${inc.productName}</div>
              <div class="text-xs text-muted">${inc.sku} · Zone ${inc.zone} · Bin ${inc.bin} · ${inc.quantity} unit${inc.quantity!==1?'s':''}</div>
            </div>
            <div class="flex gap-2">
              ${inc.status === 'open' ? `<button class="btn btn-secondary btn-sm" onclick="AlertsModule.updateIncidentStatus('${inc.id}','reviewing')">Start Review</button>` : ''}
              ${inc.status === 'reviewing' ? `<button class="btn btn-success btn-sm" onclick="AlertsModule.updateIncidentStatus('${inc.id}','resolved')">Mark Resolved</button>` : ''}
            </div>
          </div>
          <p class="text-sm text-secondary mb-3">${inc.description}</p>
          <div class="investigation-steps">
            ${['Open','Under Review','Resolved'].map((step,i) => `
              <span class="inv-step ${i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}">
                ${i < stepIdx ? '✓' : i === stepIdx ? '●' : '○'} ${step}
              </span>
              ${i < 2 ? '<span class="inv-step-arrow">→</span>' : ''}`).join('')}
          </div>
          <div class="flex items-center justify-between mt-3 text-xs text-muted">
            <span>Reported by ${reporter?.name||inc.reportedBy} · ${Utils.timeAgo(inc.createdAt)}</span>
            ${inc.stockAdjusted ? '<span class="text-success">✓ Stock adjusted</span>' : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderReorderHTML() {
    const products = Store.get.products().filter(p => p.quantity <= p.reorderPoint);
    const sorted   = [...products].sort((a,b) => a.quantity/a.reorderPoint - b.quantity/b.reorderPoint);

    if (sorted.length === 0) return `<div class="empty-state"><div class="empty-state-icon">✅</div><h4>All products above reorder point</h4></div>`;

    return `
    <div class="alert-banner info mb-4">
      <span class="alert-banner-icon">ℹ️</span>
      <span>${sorted.length} products require reordering. Quantities are auto-calculated to restore 80% capacity.</span>
    </div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th>Product</th><th>Zone/Bin</th><th class="col-num">Current</th>
          <th class="col-num">Reorder Pt.</th><th class="col-num">Suggested Order</th>
          <th>Supplier</th><th>Urgency</th>
        </tr></thead>
        <tbody>
          ${sorted.map(p => {
            const suggested = Math.ceil(p.maxCapacity * 0.8) - p.quantity;
            const isOut = p.quantity === 0;
            return `<tr>
              <td>
                <div class="font-semibold text-sm">${p.name}</div>
                <div class="font-mono text-xs text-muted">${p.sku}</div>
              </td>
              <td><span class="product-row-zone zone-${p.zone}">${p.zone}</span>
                  <span class="font-mono text-xs text-muted ml-2">${p.bin}</span></td>
              <td class="col-num font-mono font-bold ${isOut?'text-danger':p.quantity<=p.reorderPoint/2?'text-warning':'text-warning'}">${Utils.number(p.quantity)}</td>
              <td class="col-num font-mono text-muted">${Utils.number(p.reorderPoint)}</td>
              <td class="col-num font-mono font-bold text-primary">${Utils.number(Math.max(0,suggested))}</td>
              <td class="text-xs text-muted">${p.supplier}</td>
              <td>
                <span class="badge ${isOut?'badge-danger':p.quantity<=p.reorderPoint/2?'badge-warning':'badge-warning'}">
                  ${isOut?'🚨 Out of Stock':p.quantity<=p.reorderPoint/2?'⚠️ Critical Low':'⚠️ Low Stock'}
                </span>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ─── INCIDENT REPORT MODAL ─────────────────────────────────
  function openReportIncident() {
    const products = Store.get.products();
    const staff    = Store.get.staff();
    Utils.Modal.open('Report Incident', `
      <form id="incident-form" class="form-grid form-grid-2" style="gap:var(--sp-4)">
        <div class="form-group"><label class="form-label">Incident Type</label>
          <select name="type" class="form-control">
            <option value="damaged">Damaged Item</option>
            <option value="missing">Missing Item</option>
          </select></div>
        <div class="form-group"><label class="form-label">Product <span class="required">*</span></label>
          <select name="productId" class="form-control" required onchange="AlertsModule.onIncidentProductChange(this)">
            <option value="">— Select Product —</option>
            ${products.map(p=>`<option value="${p.id}" data-zone="${p.zone}" data-bin="${p.bin}" data-sku="${p.sku}" data-name="${p.name}">${p.name} (${p.sku})</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Zone</label>
          <input name="zone" id="inc-zone" class="form-control" placeholder="Zone" /></div>
        <div class="form-group"><label class="form-label">Bin Location</label>
          <input name="bin" id="inc-bin" class="form-control" placeholder="Bin location" /></div>
        <div class="form-group"><label class="form-label">Quantity Affected <span class="required">*</span></label>
          <input name="quantity" type="number" class="form-control" min="1" value="1" required /></div>
        <div class="form-group"><label class="form-label">Reported By</label>
          <select name="reportedBy" class="form-control">
            ${staff.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description <span class="required">*</span></label>
          <textarea name="description" class="form-control" placeholder="Describe the incident in detail…" required></textarea></div>
      </form>`,
      { size:'lg',
        footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
                <button class="btn btn-danger" onclick="AlertsModule.submitIncident()">Submit Report</button>` }
    );
  }

  function onIncidentProductChange(select) {
    const opt = select.options[select.selectedIndex];
    document.getElementById('inc-zone').value = opt.dataset.zone || '';
    document.getElementById('inc-bin').value  = opt.dataset.bin  || '';
  }

  function submitIncident() {
    const form = document.getElementById('incident-form');
    if (!form?.checkValidity()) { form?.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form));
    data.quantity = parseInt(data.quantity);
    const product = Store.get.productById(data.productId);
    data.sku = product?.sku || '';
    data.productName = product?.name || '';
    Store.addIncident(data);
    Utils.Modal.close();
    Utils.Toast.warning('Incident Reported', `${data.type} incident reported for ${data.productName}`);
    Router.dispatch();
  }

  // ─── ACTIONS ───────────────────────────────────────────────
  function acknowledgeOne(alertId) {
    Store.acknowledgeAlert(alertId);
    Utils.Toast.info('Alert Acknowledged');
    Router.dispatch();
  }

  function resolveOne(alertId) {
    Store.resolveAlert(alertId);
    Utils.Toast.success('Alert Resolved');
    Router.dispatch();
  }

  function acknowledgeAll() {
    Store.get.alerts().filter(a=>a.status==='open').forEach(a => Store.acknowledgeAlert(a.id));
    Utils.Toast.success('All Alerts Acknowledged');
    Router.dispatch();
  }

  function updateIncidentStatus(incidentId, status) {
    Store.updateIncident(incidentId, { status });
    if (status === 'resolved') {
      Utils.Toast.success('Incident Resolved', 'Stock has been adjusted automatically');
    } else {
      Utils.Toast.info('Status Updated', `Incident moved to ${status}`);
    }
    Router.dispatch();
  }

  function setFilter(filter) {
    alertFilter = filter;
    renderAlertList();
  }

  function bindEvents(container) {
    Utils.qsa('.line-tab-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.line-tab-btn', container).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        const filterBar = Utils.qs('#alert-filter-bar', container);
        if (filterBar) filterBar.style.display = currentTab === 'alerts' ? 'flex' : 'none';
        renderAlertList(container);
      });
    });
  }

  return { render, acknowledgeOne, resolveOne, acknowledgeAll,
           openReportIncident, onIncidentProductChange, submitIncident,
           updateIncidentStatus, setFilter };
})();
