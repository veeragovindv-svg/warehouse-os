/* ============================================================
   WarehouseOS — modules/analytics.js
   Operational Analytics, Charts & Reporting Module
   ============================================================ */

const AnalyticsModule = (() => {

  let chartRange = '14d'; // '7d' | '14d' | '30d'

  function render(container) {
    container.innerHTML = buildHTML();
    setTimeout(() => renderAllCharts(container), 50);
    bindEvents(container);
  }

  function buildHTML() {
    const kpi = Store.get.kpiSummary();
    const stock = Store.get.stockSummary();
    const orders = Store.get.orders();
    const staff  = Store.get.staff();

    // Compute avg fulfillment time from dispatched orders
    const dispatched = orders.filter(o => o.dispatchedAt);
    const avgFulfill = dispatched.length
      ? Math.round(dispatched.reduce((s,o) => s + (new Date(o.dispatchedAt)-new Date(o.createdAt))/(1000*3600), 0) / dispatched.length)
      : 0;

    return `
    <div class="analytics-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Operational Analytics</h2>
          <p class="section-sub">Real-time warehouse performance metrics</p>
        </div>
        <div class="section-actions">
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm ${chartRange==='7d'?'active':''}" data-range="7d">7D</button>
            <button class="btn btn-secondary btn-sm ${chartRange==='14d'?'active':''}" data-range="14d">14D</button>
            <button class="btn btn-secondary btn-sm ${chartRange==='30d'?'active':''}" data-range="30d">30D</button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="AnalyticsModule.exportReport()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 10v4h12v-4M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Export Report
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="analytics-kpi-grid">
        ${kpiCard('Order Fill Rate', kpi.fillRate + '%', '📊', 'var(--clr-primary-light)', 'Orders dispatched vs total')}
        ${kpiCard('Dispatched', kpi.dispatched, '🚚', 'var(--clr-purple)', 'Shipped out')}
        ${kpiCard('Delivered', kpi.delivered, '✅', 'var(--clr-success-text)', 'Confirmed delivery')}
        ${kpiCard('Avg. Fulfillment', avgFulfill + 'h', '⏱️', 'var(--clr-warning-text)', 'Order to dispatch')}
        ${kpiCard('Open Alerts', kpi.openAlerts, '🚨', kpi.openAlerts>3?'var(--clr-danger-text)':'var(--clr-text)', 'Active alerts')}
      </div>

      <!-- Charts Row 1 -->
      <div class="analytics-grid mb-4">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Order Volume Trend</h4>
            <div class="chart-legend">
              <div class="legend-item"><div class="legend-dot" style="background:hsl(210,90%,62%)"></div>Orders</div>
              <div class="legend-item"><div class="legend-dot" style="background:hsl(142,71%,45%)"></div>Fulfilled</div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-wrap" style="height:200px">
              <canvas id="chart-orders" style="height:200px"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Order Status Mix</h4>
          </div>
          <div class="card-body flex items-center justify-center gap-6" style="flex-direction:column">
            <div class="chart-wrap" style="height:160px;width:160px">
              <canvas id="chart-status-donut" style="height:160px;width:160px"></canvas>
            </div>
            <div id="donut-legend" class="chart-legend" style="justify-content:center;flex-wrap:wrap"></div>
          </div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="analytics-grid mb-6">
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Stock Level by Zone</h4>
            <span class="text-xs text-muted">Average fill % per zone</span>
          </div>
          <div class="card-body">
            <div class="chart-wrap" style="height:180px">
              <canvas id="chart-zone-stock" style="height:180px"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4 class="card-title">Pipeline Bottleneck</h4>
            <span class="text-xs text-muted">Avg. time in each stage</span>
          </div>
          <div class="card-body">
            ${renderBottleneckHTML()}
          </div>
        </div>
      </div>

      <!-- Staff Performance -->
      <div class="card mb-6">
        <div class="card-header">
          <h4 class="card-title">Staff Performance</h4>
          <button class="btn btn-ghost btn-sm" onclick="AnalyticsModule.exportStaffReport()">Export</button>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper staff-perf-table" style="border:none;border-radius:0">
            <table class="data-table">
              <thead><tr>
                <th>Staff Member</th><th>Role</th><th>Zone</th>
                <th class="col-num">Tasks Done</th>
                <th style="min-width:160px">Pick Accuracy</th>
                <th class="col-num">Avg Time/Item</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                ${staff.map(s => `<tr>
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="user-avatar-sm">${s.initials}</div>
                      <span class="font-semibold text-sm">${s.name}</span>
                    </div>
                  </td>
                  <td class="text-muted text-sm">${s.role}</td>
                  <td><span class="product-row-zone zone-${s.zone}">${s.zone}</span></td>
                  <td class="col-num font-mono font-bold">${Utils.number(s.tasksCompleted)}</td>
                  <td>
                    <div class="accuracy-bar">
                      <div class="progress flex-1" style="height:6px">
                        <div class="progress-bar ${s.accuracy>=98?'success':s.accuracy>=95?'warning':'danger'}" style="width:${s.accuracy}%"></div>
                      </div>
                      <span class="font-mono text-xs font-bold ml-2" style="min-width:42px">${s.accuracy}%</span>
                    </div>
                  </td>
                  <td class="col-num font-mono">${s.avgPickTime}m</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div style="width:8px;height:8px;border-radius:50%;background:${s.status==='active'?'var(--clr-success)':'var(--clr-warning)'}"></div>
                      <span class="text-xs">${s.status.charAt(0).toUpperCase()+s.status.slice(1)}</span>
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Stock Health Summary -->
      <div class="card">
        <div class="card-header">
          <h4 class="card-title">Stock Health by Category</h4>
        </div>
        <div class="card-body">
          ${renderCategoryHealthHTML()}
        </div>
      </div>
    </div>`;
  }

  function kpiCard(label, value, icon, color, sub) {
    return `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:${color}1a;color:${color}">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value" style="color:${color};font-size:1.75rem">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  }

  function renderBottleneckHTML() {
    const orders = Store.get.orders();
    const stages = [
      { name:'Pending',    count: orders.filter(o=>o.status==='pending').length,    avgH: 2.4 },
      { name:'Allocated',  count: orders.filter(o=>o.status==='allocated').length,  avgH: 1.2 },
      { name:'Picking',    count: orders.filter(o=>o.status==='picking').length,    avgH: 3.8 },
      { name:'Packed',     count: orders.filter(o=>o.status==='packed').length,     avgH: 1.5 },
      { name:'Dispatched', count: orders.filter(o=>o.status==='dispatched').length, avgH: 0.8 },
    ];
    const maxH = Math.max(...stages.map(s=>s.avgH));
    const bottleneckIdx = stages.reduce((mi, s, i) => s.avgH > stages[mi].avgH ? i : mi, 0);

    return stages.map((s, i) => `
    <div class="bottleneck-row">
      <div class="bottleneck-stage">${s.name}</div>
      <div class="bottleneck-bar-wrap">
        <div class="bottleneck-bar" style="
          width:${Math.round(s.avgH/maxH*100)}%;
          background:${i===bottleneckIdx?'var(--clr-danger)':s.avgH>2.5?'var(--clr-warning)':'var(--clr-success)'}">
        </div>
      </div>
      <div class="bottleneck-time">${s.avgH}h</div>
      ${i===bottleneckIdx?'<span class="badge badge-danger" style="margin-left:4px;font-size:9px">BOTTLENECK</span>':''}
    </div>`).join('');
  }

  function renderCategoryHealthHTML() {
    const products = Store.get.products();
    const categories = [...new Set(products.map(p=>p.category))].sort();
    return `<div class="flex flex-col gap-4">
      ${categories.map(cat => {
        const catProds = products.filter(p=>p.category===cat);
        const healthy  = catProds.filter(p=>p.quantity>p.reorderPoint).length;
        const low      = catProds.filter(p=>p.quantity>0&&p.quantity<=p.reorderPoint).length;
        const out      = catProds.filter(p=>p.quantity===0).length;
        const total    = catProds.length;
        const healthPct= total ? Math.round(healthy/total*100) : 0;
        return `
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold">${cat}</span>
            <div class="flex items-center gap-3 text-xs">
              <span class="text-success">✅ ${healthy}</span>
              <span class="text-warning">⚠️ ${low}</span>
              <span class="text-danger">🚨 ${out}</span>
              <span class="text-muted">${total} total</span>
            </div>
          </div>
          <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--clr-surface-4)">
            <div style="width:${Math.round(healthy/total*100)}%;background:var(--clr-success);transition:width 0.5s"></div>
            <div style="width:${Math.round(low/total*100)}%;background:var(--clr-warning)"></div>
            <div style="width:${Math.round(out/total*100)}%;background:var(--clr-danger)"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ─── CHARTS ────────────────────────────────────────────────
  function renderAllCharts(container) {
    renderOrderTrendChart(container);
    renderStatusDonut(container);
    renderZoneStockChart(container);
  }

  function renderOrderTrendChart(container) {
    const canvas = Utils.qs('#chart-orders', container || document);
    if (!canvas) return;
    const range = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30;
    const orderData    = SeedData.dailyOrders.slice(-range);
    const fulfillData  = SeedData.dailyFulfillment.slice(-range);
    const labels = orderData.map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (orderData.length - 1 - i));
      return d.getDate() + '/' + (d.getMonth()+1);
    });
    Utils.Charts.drawLineChart(canvas, null, {
      labels,
      datasets: [
        { data: orderData,   color: 'hsl(210,90%,62%)',  lineWidth: 2, fill: true },
        { data: fulfillData, color: 'hsl(142,71%,50%)', lineWidth: 2, fill: false },
      ],
      padding: { top:20, right:20, bottom:35, left:40 },
    });
  }

  function renderStatusDonut(container) {
    const canvas = Utils.qs('#chart-status-donut', container || document);
    if (!canvas) return;
    const summary = Store.get.orderSummary();
    const segments = [
      { label:'Pending',    value: summary.pending||0,    color: 'hsl(220,14%,35%)' },
      { label:'Allocated',  value: summary.allocated||0,  color: 'hsl(200,80%,50%)' },
      { label:'Picking',    value: summary.picking||0,    color: 'hsl(38,92%,54%)' },
      { label:'Packed',     value: summary.packed||0,     color: 'hsl(210,90%,52%)' },
      { label:'Dispatched', value: summary.dispatched||0, color: 'hsl(265,75%,65%)' },
      { label:'Delivered',  value: summary.delivered||0,  color: 'hsl(142,71%,45%)' },
    ].filter(s => s.value > 0);

    const total = segments.reduce((s,seg)=>s+seg.value,0);
    Utils.Charts.drawDonut(canvas, null, {
      segments, centerText: total, subText: 'orders', thickness: 22
    });

    // Legend
    const legendEl = Utils.qs('#donut-legend', container || document);
    if (legendEl) {
      legendEl.innerHTML = segments.map(s => `
        <div class="legend-item">
          <div class="legend-dot" style="background:${s.color}"></div>
          <span>${s.label} (${s.value})</span>
        </div>`).join('');
    }
  }

  function renderZoneStockChart(container) {
    const canvas = Utils.qs('#chart-zone-stock', container || document);
    if (!canvas) return;
    const zones = SeedData.zones;
    const values = zones.map(z => {
      const products = Store.get.productsByZone(z);
      if (!products.length) return 0;
      return Math.round(products.reduce((s,p) => s + p.quantity/p.maxCapacity, 0) / products.length * 100);
    });
    const colors = ['hsl(210,80%,55%)','hsl(142,70%,48%)','hsl(38,90%,58%)','hsl(0,80%,60%)','hsl(265,70%,63%)','hsl(180,70%,48%)'];
    Utils.Charts.drawBarChart(canvas, null, {
      labels: zones.map(z => 'Zone '+z),
      values, colors,
      padding: { top:15, right:15, bottom:35, left:40 },
      barRadius: 5, gap: 0.25, gridLines: 4,
    });
  }

  // ─── EXPORT ────────────────────────────────────────────────
  function exportReport() {
    const orders = Store.get.orders().map(o => ({
      OrderID: o.id, Customer: o.customerName, Priority: o.priority,
      Status: o.status, Items: o.items.length,
      Created: Utils.formatDate(o.createdAt), Due: Utils.formatDate(o.dueDate),
      Dispatched: o.dispatchedAt ? Utils.formatDate(o.dispatchedAt) : '',
      Carrier: o.carrier || '', Tracking: o.trackingId || ''
    }));
    Utils.exportCSV(orders, `warehouse_report_${new Date().toISOString().slice(0,10)}.csv`);
    Utils.Toast.success('Report Exported');
  }

  function exportStaffReport() {
    const staff = Store.get.staff().map(s => ({
      ID: s.id, Name: s.name, Role: s.role, Zone: s.zone,
      TasksCompleted: s.tasksCompleted, Accuracy: s.accuracy,
      AvgPickTime: s.avgPickTime, Status: s.status
    }));
    Utils.exportCSV(staff, 'staff_performance.csv');
    Utils.Toast.success('Staff Report Exported');
  }

  // ─── EVENTS ────────────────────────────────────────────────
  function bindEvents(container) {
    Utils.qsa('.btn-group .btn[data-range]', container).forEach(btn => {
      btn.addEventListener('click', () => {
        chartRange = btn.dataset.range;
        Utils.qsa('.btn-group .btn[data-range]', container).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderOrderTrendChart(container);
      });
    });
  }

  return { render, exportReport, exportStaffReport };
})();
