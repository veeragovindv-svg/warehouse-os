/* ============================================================
   WarehouseOS — modules/cdcPipeline.js
   Change Data Capture (CDC) Real-Time Analytics Pipeline (Kafka + Debezium)
   ============================================================ */

const CDCPipelineModule = (() => {

  let streamInterval = null;
  let chartInterval = null;
  let eventCounter = 142850;
  let isRunning = true;
  let throughputHistory = [1200, 1450, 1600, 1840, 1750, 1920, 2100, 1840];
  let activeTopic = 'warehouse-cdc-inventory';

  const TOPICS = [
    'warehouse-cdc-inventory',
    'warehouse-cdc-orders',
    'warehouse-cdc-picks',
    'warehouse-cdc-dispatches'
  ];

  function render(container) {
    container.innerHTML = buildHTML();
    setTimeout(() => {
      startCDCStream();
    }, 50);
  }

  function generateSampleEventHTML() {
    const products = Store.get.products() || [];
    const p1 = products[0] || { id: 'PRD-001', sku: 'ELC-MCU-328', quantity: 15 };
    const p2 = products[1] || { id: 'PRD-002', sku: 'HRD-BLT-M8x40', quantity: 80 };

    return `
      <div class="cdc-json-event cdc-op-update">
        <div class="flex justify-between font-bold mb-1">
          <span>[UPDATE] Partition 0 · Offset #${eventCounter}</span>
          <span class="text-muted">${new Date().toLocaleTimeString()}</span>
        </div>
        <pre style="margin:0;font-size:10.5px;color:var(--clr-text-secondary);white-space:pre-wrap">${JSON.stringify({
          schema: "warehouse.inventory.Value",
          payload: {
            before: { id: p1.id, sku: p1.sku, quantity: p1.quantity },
            after: { id: p1.id, sku: p1.sku, quantity: p1.quantity + 5 },
            source: { version: "2.4.0", connector: "debezium-mysql", name: "warehouse_db", topic: activeTopic, ts_ms: Date.now() },
            op: "u", ts_ms: Date.now()
          }
        }, null, 2)}</pre>
      </div>
      <div class="cdc-json-event cdc-op-insert">
        <div class="flex justify-between font-bold mb-1">
          <span>[CREATE/INSERT] Partition 1 · Offset #${eventCounter - 1}</span>
          <span class="text-muted">${new Date(Date.now() - 2000).toLocaleTimeString()}</span>
        </div>
        <pre style="margin:0;font-size:10.5px;color:var(--clr-text-secondary);white-space:pre-wrap">${JSON.stringify({
          schema: "warehouse.inventory.Value",
          payload: {
            before: null,
            after: { id: p2.id, sku: p2.sku, quantity: p2.quantity },
            source: { version: "2.4.0", connector: "debezium-mysql", name: "warehouse_db", topic: activeTopic, ts_ms: Date.now() - 2000 },
            op: "c", ts_ms: Date.now() - 2000
          }
        }, null, 2)}</pre>
      </div>
    `;
  }

  function buildHTML() {
    return `
    <div class="cdc-container">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">⚡ Change Data Capture (CDC) Pipeline</h2>
          <p class="section-sub">Debezium MySQL Binlog → Apache Kafka → InfluxDB Time-Series Telemetry Engine</p>
        </div>
        <div class="section-actions">
          <button class="btn btn-secondary btn-sm" id="cdc-toggle-btn" onclick="CDCPipelineModule.toggleStream()">
            ${isRunning ? '⏸ Pause Stream' : '▶ Resume Stream'}
          </button>
          <button class="btn btn-primary btn-sm" onclick="CDCPipelineModule.triggerManualEvent()">
            ⚡ Trigger Mutation Event
          </button>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="data-grid data-grid-4 mb-4">
        <div class="kpi-card">
          <div class="kpi-icon">⚡</div>
          <div class="kpi-label">Ingestion Throughput</div>
          <div class="kpi-value text-success" id="cdc-tps">1,840 evt/s</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">⏱️</div>
          <div class="kpi-label">End-to-End Latency</div>
          <div class="kpi-value text-primary">1.2 ms</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🛡️</div>
          <div class="kpi-label">DB Load Reduction</div>
          <div class="kpi-value text-success">98.4%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📊</div>
          <div class="kpi-label">InfluxDB Bucket</div>
          <div class="kpi-value font-mono text-xs text-muted" style="margin-top:8px">warehouse_telemetry</div>
        </div>
      </div>

      <!-- Topic Filter Chips -->
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs font-bold text-muted uppercase tracking-wider">Kafka Topics:</span>
        ${TOPICS.map(t => `
          <button class="chip ${activeTopic===t?'chip-primary':''}" onclick="CDCPipelineModule.setTopic('${t}')">
            📡 ${t}
          </button>
        `).join('')}
      </div>

      <div class="data-grid" style="grid-template-columns: 1fr 1fr; gap: var(--sp-5)">
        <!-- Left: Debezium Binlog JSON Stream -->
        <div class="card card-glow-interactive">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-xl">📜</span>
              <h4 class="card-title">Debezium Row-Level Event Stream</h4>
            </div>
            <span class="badge badge-primary font-mono" id="cdc-topic-badge" style="font-size:9px">Topic: ${activeTopic}</span>
          </div>
          <div class="card-body">
            <div class="cdc-json-stream" id="cdc-json-stream-body">
              ${generateSampleEventHTML()}
            </div>
          </div>
        </div>

        <!-- Right: InfluxDB Real-Time Time-Series Chart & Architecture -->
        <div class="flex flex-col gap-4">
          <div class="card card-glow-interactive">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-xl">📈</span>
                <h4 class="card-title">InfluxDB Time-Series Throughput (evt/s)</h4>
              </div>
              <span class="badge badge-success font-mono" style="font-size:9px">Live Stream</span>
            </div>
            <div class="card-body">
              <div id="cdc-chart-container" style="height:140px;width:100%">
                ${renderSVGChart(throughputHistory)}
              </div>
            </div>
          </div>

          <div class="card card-glow-interactive">
            <div class="card-header">
              <h4 class="card-title">🏗️ Kafka Pipeline Architecture</h4>
            </div>
            <div class="card-body text-xs leading-relaxed">
              <div class="p-3 rounded-lg mb-2" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                <div class="font-bold text-primary mb-1">1. MySQL / PostgreSQL Transaction DB</div>
                <div class="text-muted">Row-level binlog events capture zero-overhead transactional mutations.</div>
              </div>
              <div class="p-3 rounded-lg mb-2" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                <div class="font-bold text-success mb-1">2. Debezium CDC Connector</div>
                <div class="text-muted">Streams raw `before` and `after` row states into Kafka topic partitions.</div>
              </div>
              <div class="p-3 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                <div class="font-bold text-purple-400 mb-1">3. InfluxDB Time-Series Metrics</div>
                <div class="text-muted">Aggregates split-second fill rate telemetry without locking transactional tables.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderSVGChart(history) {
    const data = (Array.isArray(history) && history.length >= 2) ? history : [1200, 1450, 1600, 1840];
    const W = 400;
    const H = 120;
    const maxVal = Math.max(...data, 2500);
    const minVal = Math.min(...data, 1000);

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * W;
      const range = (maxVal - minVal) || 1;
      const y = H - ((val - minVal) / range) * (H - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPoints = `0,${H} ${points} ${W},${H}`;

    return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cdc-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10B981" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#10B981" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#cdc-chart-grad)" />
      <polyline points="${points}" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
  }

  function setTopic(topic) {
    activeTopic = topic;
    const badge = document.getElementById('cdc-topic-badge');
    if (badge) badge.textContent = `Topic: ${topic}`;
    addStreamEvent();
  }

  function toggleStream() {
    isRunning = !isRunning;
    const btn = document.getElementById('cdc-toggle-btn');
    if (btn) btn.textContent = isRunning ? '⏸ Pause Stream' : '▶ Resume Stream';
    if (isRunning) startCDCStream();
    else {
      if (streamInterval) clearInterval(streamInterval);
      if (chartInterval) clearInterval(chartInterval);
    }
  }

  function triggerManualEvent() {
    addStreamEvent();
    updateChartData();
    Utils.Toast?.info('CDC Event Captured', `Mutation payload emitted on ${activeTopic}`);
  }

  function startCDCStream() {
    if (streamInterval) clearInterval(streamInterval);
    if (chartInterval) clearInterval(chartInterval);

    if (!isRunning) return;

    streamInterval = setInterval(() => {
      if (isRunning) addStreamEvent();
    }, 1500);

    chartInterval = setInterval(() => {
      if (isRunning) updateChartData();
    }, 2000);
  }

  function updateChartData() {
    const newTPS = Math.floor(1600 + Math.random() * 600);
    throughputHistory.push(newTPS);
    if (throughputHistory.length > 12) throughputHistory.shift();

    const tpsEl = document.getElementById('cdc-tps');
    if (tpsEl) tpsEl.textContent = `${newTPS.toLocaleString()} evt/s`;

    const chartEl = document.getElementById('cdc-chart-container');
    if (chartEl) chartEl.innerHTML = renderSVGChart(throughputHistory);
  }

  function addStreamEvent() {
    const streamEl = document.getElementById('cdc-json-stream-body');
    if (!streamEl) return;

    eventCounter++;
    const ops = ['u', 'c', 'u', 'd'];
    const opNames = { u: 'UPDATE', c: 'CREATE/INSERT', d: 'DELETE' };
    const opCls = { u: 'cdc-op-update', c: 'cdc-op-insert', d: 'cdc-op-delete' };
    const randomOp = ops[Math.floor(Math.random() * ops.length)];
    const products = Store.get.products() || [];
    const defaultProd = { id: 'PRD-001', sku: 'ELC-MCU-328', quantity: 15 };
    const p = products.length ? products[Math.floor(Math.random() * products.length)] : defaultProd;

    const eventJSON = {
      schema: `warehouse.${activeTopic.replace('warehouse-cdc-','')}.Value`,
      payload: {
        before: { id: p.id, sku: p.sku, quantity: p.quantity },
        after: { id: p.id, sku: p.sku, quantity: Math.max(0, p.quantity + (Math.random() > 0.5 ? 5 : -3)) },
        source: { version: "2.4.0", connector: "debezium-mysql", name: "warehouse_db", topic: activeTopic, ts_ms: Date.now(), snapshot: "false" },
        op: randomOp,
        ts_ms: Date.now()
      }
    };

    const node = document.createElement('div');
    node.className = `cdc-json-event ${opCls[randomOp]}`;
    node.innerHTML = `
      <div class="flex justify-between font-bold mb-1">
        <span>[${opNames[randomOp]}] Partition 0 · Offset #${eventCounter}</span>
        <span class="text-muted">${new Date().toLocaleTimeString()}</span>
      </div>
      <pre style="margin:0;font-size:10.5px;color:var(--clr-text-secondary);white-space:pre-wrap">${JSON.stringify(eventJSON.payload, null, 2)}</pre>
    `;

    streamEl.prepend(node);

    while (streamEl.children.length > 6) {
      streamEl.removeChild(streamEl.lastChild);
    }
  }

  window.CDCPipelineModule = { render, startCDCStream, setTopic, toggleStream, triggerManualEvent, generateSampleEventHTML };
  return window.CDCPipelineModule;
})();
