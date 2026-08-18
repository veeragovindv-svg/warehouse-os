/* ============================================================
   WarehouseOS — modules/dataIntelligence.js
   Unified Data Intelligence Hub — Divided into CDC & Markov Engines
   ============================================================ */

const DataIntelligenceModule = (() => {

  let activeTab = 'split'; // 'split' | 'cdc' | 'markov'

  function render(container) {
    container.innerHTML = buildHTML();

    if (activeTab === 'split') {
      setTimeout(() => {
        if (window.CDCPipelineModule?.startCDCStream) {
          CDCPipelineModule.startCDCStream();
        }
      }, 50);
    } else if (activeTab === 'cdc') {
      const wrap = document.getElementById('cdc-embedded-wrap');
      if (wrap && window.CDCPipelineModule?.render) {
        CDCPipelineModule.render(wrap);
      }
    } else if (activeTab === 'markov') {
      const wrap = document.getElementById('markov-embedded-wrap');
      if (wrap && window.MarkovPredictorModule?.render) {
        MarkovPredictorModule.render(wrap);
      }
    }
  }

  function getInitialCDCHTML() {
    if (window.CDCPipelineModule?.generateSampleEventHTML) {
      return CDCPipelineModule.generateSampleEventHTML();
    }
    return `
      <div class="cdc-json-event cdc-op-update">
        <div class="flex justify-between font-bold mb-1">
          <span>[UPDATE] Partition 0 · Offset #142850</span>
          <span class="text-muted">${new Date().toLocaleTimeString()}</span>
        </div>
        <pre style="margin:0;font-size:10.5px;color:var(--clr-text-secondary);white-space:pre-wrap">{\n  "schema": "warehouse.inventory.Value",\n  "payload": {\n    "before": { "id": "PRD-001", "sku": "ELC-MCU-328", "quantity": 15 },\n    "after": { "id": "PRD-001", "sku": "ELC-MCU-328", "quantity": 20 },\n    "source": { "connector": "debezium-mysql", "name": "warehouse_db" },\n    "op": "u", "ts_ms": ${Date.now()}\n  }\n}</pre>
      </div>
    `;
  }

  function buildHTML() {
    return `
    <div class="data-intel-module">
      <div class="section-header mb-4">
        <div class="section-header-left">
          <h2 class="section-title">🧠 Data Intelligence Platform</h2>
          <p class="section-sub">Divided Architecture: CDC Analytics Stream ║ Markov-Chain Predictive Engine</p>
        </div>
        <div class="section-actions">
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm ${activeTab==='split'?'active':''}" onclick="DataIntelligenceModule.setTab('split')">
              📑 Split 2-Column View
            </button>
            <button class="btn btn-secondary btn-sm ${activeTab==='cdc'?'active':''}" onclick="DataIntelligenceModule.setTab('cdc')">
              ⚡ 1. CDC Stream
            </button>
            <button class="btn btn-secondary btn-sm ${activeTab==='markov'?'active':''}" onclick="DataIntelligenceModule.setTab('markov')">
              🔮 2. Markov Predictor
            </button>
          </div>
        </div>
      </div>

      ${activeTab === 'split' ? `
        <!-- Divided 2-Column View -->
        <div class="data-grid" style="grid-template-columns: 1fr 1fr; gap: var(--sp-5)">
          <!-- Section 1: CDC Analytics -->
          <div class="card card-glow-interactive">
            <div class="card-header flex items-center justify-between" style="border-bottom: 1px solid rgba(6, 182, 212, 0.3)">
              <div class="flex items-center gap-2">
                <span class="text-xl">⚡</span>
                <div>
                  <h4 class="card-title text-primary">1. CDC Real-Time Stream Engine</h4>
                  <p class="text-xs text-muted">Debezium MySQL Binlog → Kafka → InfluxDB</p>
                </div>
              </div>
              <button class="btn btn-ghost btn-xs" onclick="Router.go('/cdc')">Maximize ↗</button>
            </div>
            <div class="card-body">
              <div class="flex justify-between text-xs mb-3 font-mono">
                <span>Throughput: <strong class="text-success" id="cdc-tps">1,840 evt/s</strong></span>
                <span>Latency: <strong class="text-primary">1.2ms</strong></span>
              </div>
              <div class="cdc-json-stream" id="cdc-json-stream-body" style="height:320px">
                ${getInitialCDCHTML()}
              </div>
            </div>
          </div>

          <!-- Section 2: Markov-Chain Predictor -->
          <div class="card card-glow-interactive">
            <div class="card-header flex items-center justify-between" style="border-bottom: 1px solid rgba(168, 85, 247, 0.3)">
              <div class="flex items-center gap-2">
                <span class="text-xl">🔮</span>
                <div>
                  <h4 class="card-title text-purple-400">2. Markov Demand Predictor</h4>
                  <p class="text-xs text-muted">Pre-Rush Co-Purchase Slotting Prompts</p>
                </div>
              </div>
              <button class="btn btn-ghost btn-xs" onclick="Router.go('/markov')">Maximize ↗</button>
            </div>
            <div class="card-body">
              <div class="p-3 rounded-lg mb-3" style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3)">
                <div class="font-bold text-xs text-purple-300 mb-1">🤖 Staff Slotting Recommendation</div>
                <div class="text-xs text-muted">
                  Co-purchase probability: <strong>88%</strong> (ELC-MCU-328 + ELC-PWR-24V5A).<br/>
                  Move 35 units from <strong>Zone E → Zone A (Front)</strong>.
                </div>
                <button class="btn btn-primary btn-xs mt-2" onclick="MarkovPredictorModule.executeAutoSlotting()">
                  ⚡ Execute Relocation
                </button>
              </div>

              <div class="text-xs font-bold text-muted mb-2">Transition Matrix Probability Table P(B|A)</div>
              <div style="overflow-x:auto">
                <table class="markov-matrix-table">
                  <thead>
                    <tr>
                      <th>Anchor SKU</th>
                      <th>ELC-MCU</th>
                      <th>ELC-PWR</th>
                      <th>HRD-BLT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="font-weight:700;color:var(--clr-primary)">ELC-MCU-328</td>
                      <td class="markov-cell-high">100%</td>
                      <td class="markov-cell-high">88%</td>
                      <td class="markov-cell-medium">30%</td>
                    </tr>
                    <tr>
                      <td style="font-weight:700;color:var(--clr-primary)">HRD-BLT-M8</td>
                      <td class="markov-cell-medium">20%</td>
                      <td class="markov-cell-low">10%</td>
                      <td class="markov-cell-high">94%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ` : activeTab === 'cdc' ? `
        <div id="cdc-embedded-wrap"></div>
      ` : `
        <div id="markov-embedded-wrap"></div>
      `}
    </div>`;
  }

  function setTab(tab) {
    activeTab = tab;
    render(document.getElementById('page-content') || document.body);
  }

  return { render, setTab };
})();
