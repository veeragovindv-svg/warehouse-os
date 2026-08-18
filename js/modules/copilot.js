/* ============================================================
   WarehouseOS — modules/copilot.js
   Floating Glassmorphic AI Warehouse Copilot Widget
   ============================================================ */

const AICopilotModule = (() => {

  let isOpen = false;
  let isThinking = false;
  let messages = [
    {
      role: 'assistant',
      text: '👋 **Warehouse AI Copilot Online.** I can autonomously optimize pick paths, forecast inventory stockouts, and rebalance zone slotting. Choose a quick action below or ask me anything.',
      timestamp: new Date()
    }
  ];

  function init() {
    renderWidget();
    bindEvents();
  }

  function renderWidget() {
    // Remove if already exists
    document.getElementById('ai-copilot-container')?.remove();

    const container = document.createElement('div');
    container.id = 'ai-copilot-container';
    container.innerHTML = `
      <!-- Launcher Button -->
      <div id="copilot-launcher" class="copilot-launcher" title="Open AI Warehouse Copilot">
        <span class="copilot-launcher-icon">✨</span>
        <span>AI Copilot</span>
      </div>

      <!-- Copilot Drawer Panel -->
      <div id="copilot-panel" class="copilot-panel">
        <!-- Header -->
        <div class="copilot-header">
          <div class="copilot-header-left">
            <div class="copilot-avatar">🤖</div>
            <div>
              <div class="copilot-title">Warehouse AI Copilot</div>
              <div class="copilot-status">
                <span class="copilot-status-dot"></span>
                <span>Neural Routing Engine v4.2</span>
              </div>
            </div>
          </div>
          <button class="copilot-close-btn" id="copilot-close-btn" title="Close">✕</button>
        </div>

        <!-- Quick Action Chips -->
        <div class="copilot-chips-bar">
          <button class="copilot-chip" onclick="AICopilotModule.triggerAction('optimize_routes')">
            ⚡ Optimize Pick Routes
          </button>
          <button class="copilot-chip" onclick="AICopilotModule.triggerAction('forecast_stock')">
            🔮 Forecast Out-of-Stock SKUs
          </button>
          <button class="copilot-chip" onclick="AICopilotModule.triggerAction('rebalance_inventory')">
            ⚖️ Rebalance Zone Inventory
          </button>
          <button class="copilot-chip" onclick="AICopilotModule.triggerAction('dispatch_carriers')">
            🚚 Dispatch Optimizer
          </button>
        </div>

        <!-- Messages Body -->
        <div id="copilot-body" class="copilot-body">
          ${renderMessagesHTML()}
        </div>

        <!-- Footer Input -->
        <form id="copilot-form" class="copilot-footer" onsubmit="AICopilotModule.handleUserSubmit(event)">
          <input type="text" id="copilot-input" class="copilot-input" placeholder="Ask AI Copilot to analyze stock, routes, or dispatch…" autocomplete="off" />
          <button type="submit" class="copilot-send-btn" title="Send">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 7.5l4.5 2 2 4.5L14 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(container);
  }

  function renderMessagesHTML() {
    return messages.map(m => `
      <div class="copilot-msg ${m.role}">
        <div class="copilot-bubble">
          ${m.html || formatMarkdown(m.text)}
        </div>
      </div>
    `).join('') + (isThinking ? `
      <div class="copilot-msg assistant">
        <div class="copilot-bubble copilot-typing">
          <div class="copilot-typing-dot"></div>
          <div class="copilot-typing-dot"></div>
          <div class="copilot-typing-dot"></div>
        </div>
      </div>
    ` : '');
  }

  function formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="font-mono text-xs font-bold" style="color:var(--clr-primary)">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  function scrollToBottom() {
    const body = document.getElementById('copilot-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function togglePanel(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    const panel = document.getElementById('copilot-panel');
    const launcher = document.getElementById('copilot-launcher');
    if (panel && launcher) {
      panel.classList.toggle('visible', isOpen);
      launcher.classList.toggle('open', isOpen);
      if (isOpen) {
        Utils.Sound?.playScan?.();
        document.getElementById('copilot-input')?.focus();
        scrollToBottom();
      }
    }
  }

  // ─── AI SIMULATED ACTIONS ──────────────────────────────────
  function triggerAction(actionKey) {
    if (isThinking) return;

    togglePanel(true);

    if (actionKey === 'optimize_routes') {
      addUserMessage('⚡ Optimize active warehouse pick routes using 2-opt TSP algorithm.');
      simulateRouteOptimization();
    } else if (actionKey === 'forecast_stock') {
      addUserMessage('🔮 Forecast out-of-stock SKUs and high-depletion risk items for the next 48h.');
      simulateStockForecast();
    } else if (actionKey === 'rebalance_inventory') {
      addUserMessage('⚖️ Analyze zone slotting and suggest inventory rebalance for fastest pick velocity.');
      simulateZoneRebalance();
    } else if (actionKey === 'dispatch_carriers') {
      addUserMessage('🚚 Evaluate packed orders and recommend lowest cost SLA carrier matches.');
      simulateDispatchOptimization();
    }
  }

  function addUserMessage(text) {
    messages.push({ role: 'user', text, timestamp: new Date() });
    updateUI();
  }

  function simulateRouteOptimization() {
    isThinking = true;
    updateUI();

    const tasks = Store.get.pickTasks().filter(t => t.status !== 'completed');
    const totalItems = tasks.reduce((s, t) => s + t.items.length, 0);

    setTimeout(() => {
      isThinking = false;
      const html = `
        <div>
          <div class="font-semibold mb-2">⚡ <strong>Pick Route Optimization Complete</strong></div>
          <p class="text-xs text-muted mb-3">Evaluated ${tasks.length} active waves (${totalItems} bin stops) across Zones A–F using dynamic snake routing.</p>
          
          <div class="copilot-steps-container">
            <div class="copilot-step-item">
              <span class="copilot-step-icon text-success">✓</span>
              <span><strong>Step 1:</strong> Clustered bin stops by spatial proximity</span>
            </div>
            <div class="copilot-step-item">
              <span class="copilot-step-icon text-success">✓</span>
              <span><strong>Step 2:</strong> Eliminated aisle backtracking & vertical dwell</span>
            </div>
            <div class="copilot-step-item">
              <span class="copilot-step-icon text-success">✓</span>
              <span><strong>Step 3:</strong> Generated contiguous snake pick sequence (A → B → C → D)</span>
            </div>
          </div>

          <div class="copilot-metric-card">
            <div class="copilot-metric-title">📊 Visual Before / After Metric</div>
            <div class="copilot-metric-grid">
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Walking Distance</div>
                <div class="copilot-metric-val before">1,420 m</div>
              </div>
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Optimized Path</div>
                <div class="copilot-metric-val after">860 m</div>
              </div>
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Avg Pick / Order</div>
                <div class="copilot-metric-val before">8.4 min</div>
              </div>
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Target Efficiency</div>
                <div class="copilot-metric-val after">5.1 min</div>
              </div>
            </div>
            <div class="copilot-metric-gain">🚀 Efficiency Gain: +39.4% Time & Distance Saved</div>
            <button class="btn btn-primary btn-sm w-full" onclick="AICopilotModule.applyRouteOptimization()">
              ✓ Apply Optimized Routes to Floor Waves
            </button>
          </div>
        </div>
      `;
      messages.push({ role: 'assistant', html, timestamp: new Date() });
      Utils.Sound?.playSuccess?.();
      updateUI();
    }, 1400);
  }

  function simulateStockForecast() {
    isThinking = true;
    updateUI();

    const products = Store.get.products();
    const critical = products.filter(p => p.quantity <= p.reorderPoint);

    setTimeout(() => {
      isThinking = false;
      const html = `
        <div>
          <div class="font-semibold mb-2">🔮 <strong>48-Hour Stockout Risk Forecast</strong></div>
          <p class="text-xs text-muted mb-3">Model calculated burn-rates against active VIP orders and supplier lead times.</p>

          <div class="copilot-steps-container">
            <div class="copilot-step-item">
              <span class="copilot-step-icon text-danger">⚠️</span>
              <span><strong>${critical.length} SKUs</strong> currently below safety threshold</span>
            </div>
            <div class="copilot-step-item">
              <span class="copilot-step-icon text-warning">⚡</span>
              <span>Peak depletion window: Next 18–36 hours</span>
            </div>
          </div>

          <div class="copilot-metric-card">
            <div class="copilot-metric-title">📦 Recommended Reorders</div>
            <div class="flex flex-col gap-2 mb-3">
              ${critical.slice(0, 3).map(p => `
                <div class="flex justify-between items-center text-xs" style="border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:4px">
                  <div>
                    <div class="font-bold">${p.sku}</div>
                    <div class="text-muted">${p.name}</div>
                  </div>
                  <div class="text-right font-mono">
                    <span class="text-danger font-bold">${p.quantity} left</span>
                    <div class="text-success">+${p.maxCapacity - p.quantity} order</div>
                  </div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary btn-sm w-full" onclick="Router.go('/alerts');AICopilotModule.togglePanel(false)">
              🛒 Open Reorder Recommendations →
            </button>
          </div>
        </div>
      `;
      messages.push({ role: 'assistant', html, timestamp: new Date() });
      Utils.Sound?.playAlert?.();
      updateUI();
    }, 1300);
  }

  function simulateZoneRebalance() {
    isThinking = true;
    updateUI();

    setTimeout(() => {
      isThinking = false;
      const html = `
        <div>
          <div class="font-semibold mb-2">⚖️ <strong>Zone Slotting Rebalance Analysis</strong></div>
          <p class="text-xs text-muted mb-3">Identified high-velocity fast movers stored in rear aisles (Zone E).</p>

          <div class="copilot-metric-card">
            <div class="copilot-metric-title">🔄 Recommended Slotting Relocation</div>
            <div class="text-xs mb-3">
              Move top 3 fast-moving SKUs from <strong>Zone E (High-Value Rear)</strong> to <strong>Zone A (Front Golden Zone)</strong> adjacent to packing line.
            </div>
            <div class="copilot-metric-grid">
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Staging Latency</div>
                <div class="copilot-metric-val before">4.2 hrs</div>
              </div>
              <div class="copilot-metric-box">
                <div class="copilot-metric-label">Post-Slotting</div>
                <div class="copilot-metric-val after">1.0 hr</div>
              </div>
            </div>
            <button class="btn btn-primary btn-sm w-full" onclick="AICopilotModule.executeRebalance()">
              ⚡ Generate Slotting Transfer Orders
            </button>
          </div>
        </div>
      `;
      messages.push({ role: 'assistant', html, timestamp: new Date() });
      Utils.Sound?.playSuccess?.();
      updateUI();
    }, 1200);
  }

  function simulateDispatchOptimization() {
    isThinking = true;
    updateUI();

    const packed = Store.get.ordersByStatus('packed');

    setTimeout(() => {
      isThinking = false;
      const html = `
        <div>
          <div class="font-semibold mb-2">🚚 <strong>Multi-Carrier Rate & SLA Matcher</strong></div>
          <p class="text-xs text-muted mb-3">Matched ${packed.length} packed shipments against carrier rate matrices.</p>

          <div class="copilot-metric-card">
            <div class="copilot-metric-title">Optimal Carrier Allocations</div>
            <div class="text-xs mb-2">
              • <strong>VIP Orders:</strong> DHL Express (99.8% Next-Day SLA)<br/>
              • <strong>Standard Orders:</strong> FedEx Priority & UPS Ground (18% rate reduction)
            </div>
            <button class="btn btn-primary btn-sm w-full mt-2" onclick="Router.go('/dispatch');AICopilotModule.togglePanel(false)">
              🚀 Proceed to Batch Dispatch Console
            </button>
          </div>
        </div>
      `;
      messages.push({ role: 'assistant', html, timestamp: new Date() });
      Utils.Sound?.playSuccess?.();
      updateUI();
    }, 1000);
  }

  function handleUserSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('copilot-input');
    if (!input || !input.value.trim() || isThinking) return;

    const query = input.value.trim();
    input.value = '';
    addUserMessage(query);

    isThinking = true;
    updateUI();

    // Natural answer resolution based on live state
    setTimeout(() => {
      isThinking = false;
      const q = query.toLowerCase();
      let reply = '';

      if (q.includes('stock') || q.includes('inventory') || q.includes('sku')) {
        const s = Store.get.stockSummary();
        reply = `📦 **Inventory Status:** We have **${s.total} total products**, with **${s.healthy} healthy**, **${s.lowStock} low stock**, and **${s.outOfStock} stockouts**. Would you like me to forecast replenishment requirements?`;
      } else if (q.includes('order') || q.includes('pending') || q.includes('vip')) {
        const o = Store.get.orderSummary();
        reply = `🛒 **Order Fulfillment Pipeline:** Currently **${o.pending} pending allocation**, **${o.allocated} in picking**, **${o.packed} packed**, and **${o.dispatched} dispatched**.`;
      } else if (q.includes('pick') || q.includes('route') || q.includes('wave')) {
        reply = `👷 **Pick Wave Optimization:** Active picking tasks are sequenced across Zones A–F. I can re-run the 2-opt snake path routing for an immediate 39% distance reduction.`;
      } else if (q.includes('alert') || q.includes('critical') || q.includes('incident') || q.includes('damaged')) {
        const a = Store.get.openAlerts();
        reply = `🚨 **Exception Alert Center:** There are **${a.length} active alerts**. You can file new incident reports or acknowledge alerts directly from the Alert Center.`;
      } else if (q.includes('label') || q.includes('print') || q.includes('thermal') || q.includes('dispatch')) {
        reply = `🚚 **Shipping Label Help:** Navigate to **Dispatch** (#/dispatch). Select packed shipments and click **Print Shipping Label** for realistic 4×6 203 DPI barcode printing.`;
      } else if (q.includes('map') || q.includes('3d') || q.includes('zone')) {
        reply = `🗺️ **3D Floor Map Guide:** Go to **3D Floor Map** (#/map). Drag to pan, scroll to zoom, toggle 3D ⇄ 2D, and hover over bins to inspect stock levels in real time.`;
      } else {
        reply = `🤖 **Autonomous Copilot:** I analyzed the warehouse floor metrics. All 6 zones (A–F) are actively communicating telemetry. How else can I assist your operations?`;
      }

      messages.push({ role: 'assistant', text: reply, timestamp: new Date() });
      Utils.Sound?.playSuccess?.();
      updateUI();
    }, 800);
  }

  function renderPage(container) {
    container.innerHTML = `
      <div class="copilot-page-module">
        <div class="section-header">
          <div class="section-header-left">
            <h2 class="section-title">✨ AI Help & Copilot Center</h2>
            <p class="section-sub">Autonomous Neural Operations Assistant & Interactive Help Center</p>
          </div>
          <div class="section-actions">
            <button class="btn btn-primary" onclick="AICopilotModule.triggerAction('optimize_routes')">⚡ Optimize Pick Routes</button>
            <button class="btn btn-secondary" onclick="AICopilotModule.triggerAction('forecast_stock')">🔮 Forecast Stockouts</button>
          </div>
        </div>

        <div class="data-grid" style="grid-template-columns: 2fr 1fr; gap: var(--sp-5)">
          <!-- Left: AI Chat Interface -->
          <div class="card card-glow-interactive" style="min-height:550px;display:flex;flex-direction:column">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <div class="copilot-avatar" style="width:28px;height:28px;font-size:14px">🤖</div>
                <h4 class="card-title">Interactive AI Assistant</h4>
              </div>
              <span class="badge badge-success" style="font-size:9px">● Neural Model Active</span>
            </div>

            <!-- Quick Suggestions -->
            <div class="p-3 border-b border-glass flex flex-wrap gap-2" style="background:rgba(255,255,255,0.02)">
              <button class="copilot-chip" onclick="AICopilotModule.triggerAction('optimize_routes')">⚡ Pick Route Optimization</button>
              <button class="copilot-chip" onclick="AICopilotModule.triggerAction('forecast_stock')">🔮 48h Stockout Forecast</button>
              <button class="copilot-chip" onclick="AICopilotModule.triggerAction('rebalance_inventory')">⚖️ Zone Slotting Rebalance</button>
              <button class="copilot-chip" onclick="AICopilotModule.triggerAction('dispatch_carriers')">🚚 Multi-Carrier Rate Match</button>
            </div>

            <!-- Main Chat Area -->
            <div id="page-copilot-body" class="copilot-body flex-1 p-4 overflow-y-auto">
              ${renderMessagesHTML()}
            </div>

            <!-- Page Input -->
            <form class="copilot-footer p-3" onsubmit="AICopilotModule.handlePageSubmit(event)">
              <input type="text" id="page-copilot-input" class="copilot-input" placeholder="Type a question or command (e.g. 'How to print shipping labels?', 'Optimize routes')…" autocomplete="off" />
              <button type="submit" class="copilot-send-btn">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 2L2 7.5l4.5 2 2 4.5L14 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </form>
          </div>

          <!-- Right: Knowledge Base & Quick FAQ -->
          <div class="flex flex-col gap-4">
            <!-- FAQ Accordion -->
            <div class="card card-glow-interactive">
              <div class="card-header">
                <h4 class="card-title">📖 Warehouse Operations FAQ</h4>
              </div>
              <div class="card-body flex flex-col gap-3 text-xs">
                <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                  <div class="font-bold text-primary mb-1">⚡ How does Stock Allocation work?</div>
                  <div class="text-muted">Orders pending allocation are matched against Zone A–F bin quantities using First-In-First-Served priority logic.</div>
                </div>
                <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                  <div class="font-bold text-primary mb-1">🗺️ How do I view 3D Floor Maps?</div>
                  <div class="text-muted">Click <strong>3D Floor Map</strong> in the sidebar. Bins pulse red when stock is critical and neon cyan paths outline pick routes.</div>
                </div>
                <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                  <div class="font-bold text-primary mb-1">🚚 How to print Thermal Labels?</div>
                  <div class="text-muted">Open <strong>Dispatch Console</strong> (#/dispatch). Select packed orders and click <strong>Print Thermal Label</strong> for 203 DPI barcode printing.</div>
                </div>
                <div class="p-2.5 rounded-lg" style="background:var(--glass-bg-subtle);border:var(--glass-border)">
                  <div class="font-bold text-primary mb-1">🚨 How to report broken stock?</div>
                  <div class="text-muted">Go to <strong>Alert Center</strong> (#/alerts) and click <strong>+ Report Incident</strong> to log damaged or missing items.</div>
                </div>
              </div>
            </div>

            <!-- Neural System Card -->
            <div class="card card-glow-interactive">
              <div class="card-header">
                <h4 class="card-title">🧠 Neural Engine Telemetry</h4>
              </div>
              <div class="card-body text-xs flex flex-col gap-2 font-mono">
                <div class="flex justify-between">
                  <span class="text-muted">Model Architecture:</span>
                  <span class="font-bold text-primary">WarehouseOS Copilot v4.2</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Solver Algorithm:</span>
                  <span class="font-bold text-success">2-Opt TSP Snake Path</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Telemetry Status:</span>
                  <span class="font-bold text-success">● 6 Zones Active</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted">Response Latency:</span>
                  <span class="font-bold text-primary">&lt; 14ms (Local Engine)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function handlePageSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('page-copilot-input');
    if (!input || !input.value.trim() || isThinking) return;

    const query = input.value.trim();
    input.value = '';
    addUserMessage(query);

    isThinking = true;
    updatePageUI();

    setTimeout(() => {
      isThinking = false;
      const q = query.toLowerCase();
      let reply = '';

      if (q.includes('stock') || q.includes('inventory') || q.includes('sku')) {
        const s = Store.get.stockSummary();
        reply = `📦 **Inventory Status:** We have **${s.total} total products**, with **${s.healthy} healthy**, **${s.lowStock} low stock**, and **${s.outOfStock} stockouts**.`;
      } else if (q.includes('order') || q.includes('pending')) {
        const o = Store.get.orderSummary();
        reply = `🛒 **Order Fulfillment Pipeline:** Currently **${o.pending} pending allocation**, **${o.allocated} in picking**, **${o.packed} packed**, and **${o.dispatched} dispatched**.`;
      } else if (q.includes('label') || q.includes('print')) {
        reply = `🚚 **Shipping Label Help:** Navigate to **Dispatch** (#/dispatch). Select packed shipments and click **Print Thermal Label**.`;
      } else {
        reply = `🤖 **AI Assistant:** Evaluated floor metrics across Zones A–F. All warehouse subsystems are running at peak fill rate.`;
      }

      messages.push({ role: 'assistant', text: reply, timestamp: new Date() });
      Utils.Sound?.playSuccess?.();
      updatePageUI();
    }, 600);
  }

  function updatePageUI() {
    updateUI();
    const pageBody = document.getElementById('page-copilot-body');
    if (pageBody) {
      pageBody.innerHTML = renderMessagesHTML();
      pageBody.scrollTop = pageBody.scrollHeight;
    }
  }

  function applyRouteOptimization() {
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Routes Optimized', 'Applied 2-opt snake paths to all active floor pickers (+39.4% gain)');
    if (window.WarehouseMapModule?.simulateSurgePick) {
      window.WarehouseMapModule.simulateSurgePick();
    }
  }

  function executeRebalance() {
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Work Orders Generated', '3 Internal zone replenishment work orders created for Zone A');
  }

  function updateUI() {
    const body = document.getElementById('copilot-body');
    if (body) {
      body.innerHTML = renderMessagesHTML();
      scrollToBottom();
    }
    const pageBody = document.getElementById('page-copilot-body');
    if (pageBody) {
      pageBody.innerHTML = renderMessagesHTML();
      pageBody.scrollTop = pageBody.scrollHeight;
    }
  }

  function bindEvents() {
    document.getElementById('copilot-launcher')?.addEventListener('click', () => togglePanel());
    document.getElementById('copilot-close-btn')?.addEventListener('click', () => togglePanel(false));
  }

  return {
    init, togglePanel, triggerAction, handleUserSubmit, handlePageSubmit,
    renderPage, applyRouteOptimization, executeRebalance
  };
})();
