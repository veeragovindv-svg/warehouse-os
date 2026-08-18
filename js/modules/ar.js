/* ============================================================
   WarehouseOS — modules/ar.js
   AR Spatial Headset View — Interactive Warehouse Floor Map
   ============================================================ */

const ARModule = (() => {

  let canvas, ctx;
  let zoom = 1;
  let hoveredBin = null;
  let selectedBin = null;
  let selectedZone = null;
  let arContainer = null;
  let animFrame   = null;
  let clockInterval = null;
  let beacons = [];
  let pickRoute = [];
  let routeAnimOffset = 0;

  const CELL_SIZE   = 52;
  const CELL_GAP    = 6;
  const ZONE_PAD    = 16;
  const ZONE_MARGIN = 28;
  const ZONES_PER_ROW = 3;
  const ROWS = 5;
  const COLS = 5;

  // Zone color palette (AR style)
  const zoneColors = {
    A: { border: 'hsl(210,90%,55%)', fill: 'hsl(210,90%,55%,0.06)', label: 'hsl(210,90%,70%)' },
    B: { border: 'hsl(142,70%,48%)', fill: 'hsl(142,70%,48%,0.06)', label: 'hsl(142,70%,65%)' },
    C: { border: 'hsl(38,90%,54%)',  fill: 'hsl(38,90%,54%,0.06)',  label: 'hsl(38,90%,70%)'  },
    D: { border: 'hsl(0,80%,58%)',   fill: 'hsl(0,80%,58%,0.06)',   label: 'hsl(0,80%,75%)'   },
    E: { border: 'hsl(265,70%,60%)', fill: 'hsl(265,70%,60%,0.06)',label: 'hsl(265,70%,75%)' },
    F: { border: 'hsl(180,70%,45%)', fill: 'hsl(180,70%,45%,0.06)',label: 'hsl(180,70%,65%)' },
  };

  function render(container) {
    container.innerHTML = '';
    buildARUI(container);
  }

  function buildARUI(container) {
    arContainer = document.createElement('div');
    arContainer.className = 'ar-container';
    arContainer.id = 'ar-view';
    arContainer.innerHTML = `
      <div class="ar-scan-line"></div>

      <!-- HUD Header -->
      <div class="ar-hud-header">
        <div class="ar-logo">
          <div class="ar-logo-icon">⬡</div>
          <div>
            <div class="ar-system-name">WarehouseOS · AR</div>
            <div class="ar-system-sub">Spatial Operations View</div>
          </div>
        </div>
        <div class="ar-hud-center">
          <div class="ar-timestamp" id="ar-clock">--:--:--</div>
          <div class="ar-date" id="ar-date"></div>
        </div>
        <div class="ar-hud-right">
          <div class="ar-status-row"><div class="ar-status-dot"></div> SYSTEM ONLINE</div>
          <div class="ar-status-row" style="color:hsl(142,60%,50%)">▣ TRACKING ACTIVE</div>
          <div class="ar-status-row">${Store.get.products().length} SKUs MAPPED</div>
        </div>
      </div>

      <!-- Main: Left Panel | Map | Right Panel -->
      <div class="ar-main">
        <!-- Left: Zone Legend + Alerts -->
        <div class="ar-panel" id="ar-left-panel">
          <div class="ar-panel-title">Warehouse Zones</div>
          <div class="ar-zone-legend" id="ar-zone-legend">
            ${SeedData.zones.map(z => {
              const prods = Store.get.productsByZone(z);
              const lowCount = prods.filter(p=>p.quantity<=p.reorderPoint).length;
              return `<div class="ar-zone-item ${selectedZone===z?'active':''}" onclick="ARModule.selectZone('${z}')" data-zone="${z}">
                <div class="ar-zone-dot" style="background:${zoneColors[z]?.border||'#4af'}"></div>
                <span>Zone ${z} — ${SeedData.zoneInfo[z]?.name||z}</span>
                <span class="ar-zone-count">${prods.length} SKU${lowCount?` · <span style="color:hsl(38,90%,60%)">${lowCount}⚠️</span>`:''}</span>
              </div>`;
            }).join('')}
          </div>

          <div class="ar-panel-title" style="margin-top:var(--sp-4)">Live Alerts</div>
          <div id="ar-alerts-list">
            ${Store.get.openAlerts().slice(0,5).map(a => `
            <div class="ar-alert-item">
              <div class="ar-alert-dot ${a.severity}"></div>
              <span class="ar-alert-text">${a.productName || a.message}</span>
            </div>`).join('') || '<div class="ar-alert-text" style="opacity:0.5">No active alerts</div>'}
          </div>

          <div class="ar-panel-title" style="margin-top:var(--sp-4)">Quick Stats</div>
          <div class="ar-stat-widget">
            <div class="ar-stat-label">Total Products</div>
            <div class="ar-stat-value">${Store.get.products().length}</div>
          </div>
          <div class="ar-stat-widget">
            <div class="ar-stat-label">Open Pick Tasks</div>
            <div class="ar-stat-value">${Store.get.pickTasks().filter(t=>t.status!=='completed').length}</div>
          </div>
          <div class="ar-stat-widget">
            <div class="ar-stat-label">Critical Stock</div>
            <div class="ar-stat-value" style="color:hsl(0,80%,70%)">${Store.get.products().filter(p=>p.quantity===0).length}</div>
          </div>
        </div>

        <!-- Center: Map -->
        <div class="ar-map-center">
          <div class="ar-compass">
            <span>◀ WEST</span>
            <span class="ar-compass-arrow">▲ NORTH</span>
            <span>EAST ▶</span>
          </div>
          <div class="ar-map-canvas-wrap">
            <canvas id="ar-map-canvas"></canvas>
          </div>
          <div class="ar-zoom-controls">
            <button class="ar-zoom-btn" onclick="ARModule.zoom(1.2)" title="Zoom In">+</button>
            <button class="ar-zoom-btn" onclick="ARModule.zoom(1/1.2)" title="Zoom Out">−</button>
            <button class="ar-zoom-btn" onclick="ARModule.resetZoom()" title="Reset">↺</button>
          </div>
        </div>

        <!-- Right: Bin Detail + Pick List -->
        <div class="ar-panel right" id="ar-right-panel">
          <div class="ar-panel-title">Bin Details</div>
          <div id="ar-bin-detail-panel">
            <div class="ar-alert-text" style="opacity:0.5">Hover over a bin to see details</div>
          </div>

          <div class="ar-panel-title" style="margin-top:var(--sp-4)">Active Pick List</div>
          <div id="ar-pick-list-panel">
            ${renderARPickList()}
          </div>

          <div class="ar-panel-title" style="margin-top:var(--sp-4)">Route Info</div>
          <div class="ar-stat-widget">
            <div class="ar-stat-label">Items to Pick</div>
            <div class="ar-stat-value">${pickRoute.length}</div>
            <div class="ar-stat-sub">in optimized route order</div>
          </div>
        </div>
      </div>

      <!-- HUD Footer -->
      <div class="ar-hud-footer">
        <div class="ar-footer-controls">
          <div class="ar-footer-key"><span class="ar-key-tag">HOVER</span> Inspect Bin</div>
          <div class="ar-footer-key"><span class="ar-key-tag">CLICK</span> Select Zone</div>
          <div class="ar-footer-key"><span class="ar-key-tag">+/-</span> Zoom</div>
        </div>
        <div>WarehouseOS · AR v2.0 · Central Distribution Hub</div>
        <div style="color:hsl(142,60%,50%)">● CONNECTED</div>
      </div>

      <!-- Exit -->
      <button class="ar-exit-btn" onclick="ARModule.exit()">✕ EXIT AR</button>
    `;

    container.appendChild(arContainer);
    document.body.classList.add('ar-mode');

    // Init clock
    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    // Init canvas after layout
    setTimeout(() => {
      initCanvas();
      buildBeacons();
      buildPickRoute();
      startRenderLoop();
    }, 100);
  }

  function updateClock() {
    const now = new Date();
    const t = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2,'0')).join(':');
    const dateStr = now.toLocaleDateString('en-US', {weekday:'short',year:'numeric',month:'short',day:'numeric'});
    const clockEl = document.getElementById('ar-clock');
    const dateEl  = document.getElementById('ar-date');
    if (clockEl) clockEl.textContent = t;
    if (dateEl)  dateEl.textContent  = dateStr;
  }

  function renderARPickList() {
    const tasks = Store.get.pickTasks().filter(t => t.status !== 'completed');
    if (tasks.length === 0) return '<div class="ar-alert-text" style="opacity:0.5">No active pick tasks</div>';
    const task = tasks[0];
    return task.items.map((item, i) => `
    <div class="ar-pick-item ${item.picked?'done':''}">
      <div class="ar-pick-num ${item.picked?'done':''}">${item.picked?'✓':i+1}</div>
      <div>
        <div>${item.name.substring(0,20)}${item.name.length>20?'…':''}</div>
        <div style="color:hsl(195,40%,45%);margin-top:2px">${item.bin} · ×${item.quantity}</div>
      </div>
    </div>`).join('');
  }

  // ─── CANVAS ────────────────────────────────────────────────
  function initCanvas() {
    canvas = document.getElementById('ar-map-canvas');
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const W = Math.max(300, wrap.offsetWidth || (window.innerWidth - 640));
    const H = Math.max(300, wrap.offsetHeight || (window.innerHeight - 160));
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * (window.devicePixelRatio || 1);
    canvas.height = H * (window.devicePixelRatio || 1);
    ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mouseleave', () => { hoveredBin = null; });
  }

  function getMapLayout(cW, cH) {
    // 6 zones in 2 rows × 3 cols
    const zoneW = (cW - ZONE_MARGIN * (ZONES_PER_ROW - 1)) / ZONES_PER_ROW;
    const zoneH = (cH - ZONE_MARGIN) / 2;
    return SeedData.zones.map((z, i) => {
      const col = i % ZONES_PER_ROW;
      const row = Math.floor(i / ZONES_PER_ROW);
      const x = col * (zoneW + ZONE_MARGIN);
      const y = row * (zoneH + ZONE_MARGIN);
      return { zone: z, x, y, w: zoneW, h: zoneH };
    });
  }

  function buildBeacons() {
    beacons = [];
    Store.get.products().forEach(p => {
      beacons.push({ productId: p.id, zone: p.zone, bin: p.bin,
                     pulse: Math.random() * Math.PI * 2 });
    });
  }

  function buildPickRoute() {
    const tasks = Store.get.pickTasks().filter(t => t.status !== 'completed');
    if (!tasks.length) { pickRoute = []; return; }
    const task = tasks[0];
    pickRoute = task.items.filter(i => !i.picked).map(i => ({
      zone: i.zone, bin: i.bin, productId: i.productId, name: i.name
    }));
  }

  function startRenderLoop() {
    function loop() {
      drawFrame();
      routeAnimOffset = (routeAnimOffset + 0.5) % 20;
      animFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  function drawFrame() {
    if (!canvas || !ctx) return;
    const cW = parseInt(canvas.style.width);
    const cH = parseInt(canvas.style.height);
    ctx.clearRect(0, 0, cW, cH);

    const layout = getMapLayout(cW, cH);

    layout.forEach(({ zone, x, y, w, h }) => {
      drawZone(zone, x, y, w, h);
    });

    // Draw pick route on top
    if (pickRoute.length > 1) drawPickRoute(layout);

    // Beacon pulse animations
    beacons.forEach(b => {
      b.pulse = (b.pulse + 0.04) % (Math.PI * 2);
    });
  }

  function drawZone(zone, x, y, w, h) {
    const colors = zoneColors[zone] || { border:'#4af', fill:'rgba(64,160,255,0.04)', label:'#4af' };
    const isSelected = selectedZone === zone;

    // Zone background
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = isSelected ? colors.fill.replace('0.06','0.12') : colors.fill;
    ctx.fill();
    ctx.strokeStyle = isSelected ? colors.border : colors.border.replace(')',',0.4)').replace('hsl(','hsla(');
    ctx.lineWidth = isSelected ? 1.5 : 0.8;
    ctx.stroke();

    // Zone label
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = colors.label;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0.06em';
    ctx.fillText(`ZONE ${zone}`, x + 10, y + 18);

    const info = SeedData.zoneInfo[zone];
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = 'rgba(150,220,255,0.4)';
    ctx.fillText(info?.name?.toUpperCase() || '', x + 10, y + 30);

    // Draw bins (5×5 grid)
    const cellTotalW = (w - ZONE_PAD * 2) / COLS;
    const cellTotalH = (h - ZONE_PAD * 2 - 30) / ROWS;
    const cellW = cellTotalW - CELL_GAP;
    const cellH = cellTotalH - CELL_GAP;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const binId = `${zone}-0${row+1}-0${col+1}`;
        const product = Store.get.products().find(p => p.bin === binId);
        const bx = x + ZONE_PAD + col * cellTotalW;
        const by = y + 38 + row * cellTotalH;
        drawBin(binId, bx, by, cellW, cellH, product, colors);
      }
    }
  }

  function drawBin(binId, bx, by, bw, bh, product, zoneColors) {
    const isHovered  = hoveredBin  === binId;
    const isSelected = selectedBin === binId;
    const isOnRoute  = pickRoute.some(r => r.bin === binId);
    const isNextPick = pickRoute.length > 0 && pickRoute[0].bin === binId;

    let fillColor, borderColor;
    if (!product) {
      fillColor   = 'rgba(255,255,255,0.03)';
      borderColor = 'rgba(255,255,255,0.06)';
    } else if (product.quantity === 0) {
      fillColor   = 'rgba(220,60,60,0.15)';
      borderColor = 'rgba(220,60,60,0.5)';
    } else if (product.quantity <= product.reorderPoint) {
      fillColor   = 'rgba(240,160,40,0.12)';
      borderColor = 'rgba(240,160,40,0.45)';
    } else {
      fillColor   = 'rgba(50,200,120,0.08)';
      borderColor = 'rgba(50,200,120,0.3)';
    }

    if (isOnRoute)   { fillColor   = 'rgba(0,180,255,0.15)'; borderColor = 'rgba(0,200,255,0.6)'; }
    if (isNextPick)  { fillColor   = 'rgba(0,220,255,0.25)'; borderColor = 'rgba(0,220,255,0.9)'; }
    if (isHovered)   { fillColor   = 'rgba(255,255,255,0.12)'; borderColor = 'rgba(200,240,255,0.8)'; }
    if (isSelected)  { fillColor   = 'rgba(0,200,255,0.2)';  borderColor = 'rgba(0,220,255,1)'; }

    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, 3);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isHovered || isSelected ? 1.2 : 0.6;
    ctx.stroke();

    // Stock level bar
    if (product && product.maxCapacity > 0) {
      const pct = product.quantity / product.maxCapacity;
      const barW = bw - 6;
      const barH = 3;
      const barY = by + bh - 5;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(bx + 3, barY, barW, barH);
      ctx.fillStyle = product.quantity === 0 ? '#e04040' : product.quantity <= product.reorderPoint ? '#f0a028' : '#30c87a';
      ctx.fillRect(bx + 3, barY, barW * pct, barH);
    }

    // Bin label (only when large enough)
    if (bw > 28) {
      const rowCol = binId.split('-').slice(1).join('-');
      ctx.font = `${Math.min(8, bw/4)}px JetBrains Mono, monospace`;
      ctx.fillStyle = 'rgba(150,220,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(rowCol, bx + bw/2, by + 10);
    }

    // Beacon pulse for products on pick route
    if (isOnRoute || isNextPick) {
      const beacon = beacons.find(b => product && b.productId === product.id);
      if (beacon) {
        const pulseAlpha = (Math.sin(beacon.pulse) + 1) / 2;
        const maxRadius = Math.min(bw, bh) * 0.8;
        ctx.beginPath();
        ctx.arc(bx + bw/2, by + bh/2, maxRadius * 0.3 + maxRadius * 0.3 * pulseAlpha, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,220,255,${0.3 * pulseAlpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx + bw/2, by + bh/2, maxRadius * 0.2, 0, Math.PI*2);
        ctx.fillStyle = isNextPick ? 'rgba(0,255,220,0.9)' : 'rgba(0,180,255,0.7)';
        ctx.fill();
      }
    }
  }

  function drawPickRoute(layout) {
    if (pickRoute.length < 2) return;
    const points = pickRoute.map(r => getBinCenter(r.zone, r.bin, layout)).filter(Boolean);
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -routeAnimOffset;
    ctx.strokeStyle = 'rgba(0,200,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);

    // Numbered waypoints
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI*2);
      ctx.fillStyle = i === 0 ? 'rgba(0,255,180,0.9)' : 'rgba(0,180,255,0.7)';
      ctx.fill();
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(i+1, p.x, p.y + 3);
    });
  }

  function getBinCenter(zone, binId, layout) {
    const zoneLayout = layout.find(l => l.zone === zone);
    if (!zoneLayout) return null;
    const parts = binId.split('-');
    const row = parseInt(parts[1]) - 1;
    const col = parseInt(parts[2]) - 1;
    const cellTotalW = (zoneLayout.w - ZONE_PAD * 2) / COLS;
    const cellTotalH = (zoneLayout.h - ZONE_PAD * 2 - 30) / ROWS;
    return {
      x: zoneLayout.x + ZONE_PAD + col * cellTotalW + (cellTotalW - CELL_GAP) / 2,
      y: zoneLayout.y + 38 + row * cellTotalH + (cellTotalH - CELL_GAP) / 2,
    };
  }

  // ─── MOUSE INTERACTION ─────────────────────────────────────
  function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cW = parseInt(canvas.style.width);
    const cH = parseInt(canvas.style.height);
    const layout = getMapLayout(cW, cH);
    const bin = getBinAtPoint(mx, my, layout);
    if (bin !== hoveredBin) {
      hoveredBin = bin;
      if (bin) updateBinDetailPanel(bin);
      else     clearBinDetailPanel();
    }
  }

  function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cW = parseInt(canvas.style.width);
    const cH = parseInt(canvas.style.height);
    const layout = getMapLayout(cW, cH);
    const bin = getBinAtPoint(mx, my, layout);
    selectedBin = bin === selectedBin ? null : bin;
    if (selectedBin) updateBinDetailPanel(selectedBin, true);
  }

  function getBinAtPoint(mx, my, layout) {
    for (const { zone, x, y, w, h } of layout) {
      const cellTotalW = (w - ZONE_PAD * 2) / COLS;
      const cellTotalH = (h - ZONE_PAD * 2 - 30) / ROWS;
      const cellW = cellTotalW - CELL_GAP;
      const cellH = cellTotalH - CELL_GAP;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const bx = x + ZONE_PAD + col * cellTotalW;
          const by = y + 38 + row * cellTotalH;
          if (mx >= bx && mx <= bx + cellW && my >= by && my <= by + cellH) {
            return `${zone}-0${row+1}-0${col+1}`;
          }
        }
      }
    }
    return null;
  }

  function updateBinDetailPanel(binId, pinned = false) {
    const panel = document.getElementById('ar-bin-detail-panel');
    if (!panel) return;
    const product = Store.get.products().find(p => p.bin === binId);
    const isOnRoute = pickRoute.some(r => r.bin === binId);

    if (!product) {
      panel.innerHTML = `
        <div class="ar-bin-detail">
          <div class="ar-bin-id">${binId}</div>
          <div class="ar-bin-product" style="color:hsl(195,40%,45%)">Empty bin</div>
        </div>`;
      return;
    }

    const pct = Math.round(product.quantity / product.maxCapacity * 100);
    const stockColor = product.quantity === 0 ? 'hsl(0,80%,65%)' : product.quantity <= product.reorderPoint ? 'hsl(38,90%,65%)' : 'hsl(142,70%,55%)';
    panel.innerHTML = `
    <div class="ar-bin-detail">
      <div class="ar-bin-id">${binId}</div>
      <div class="ar-bin-product">${product.name}</div>
      <div style="color:hsl(195,40%,45%);font-size:10px;margin-bottom:8px">${product.sku}</div>

      <div class="ar-stat-label">Stock Level</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="ar-stock-bar flex-1">
          <div class="ar-stock-bar-fill" style="width:${pct}%;background:${stockColor}"></div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${stockColor}">${pct}%</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div><div class="ar-stat-label">Qty</div><div style="font-size:14px;font-weight:700;color:${stockColor}">${product.quantity}</div></div>
        <div><div class="ar-stat-label">Reorder Pt.</div><div style="font-size:14px;font-weight:700;color:hsl(195,80%,65%)">${product.reorderPoint}</div></div>
      </div>

      <div class="ar-stat-label">Supplier</div>
      <div style="font-size:10px;color:hsl(195,60%,55%);margin-bottom:8px">${product.supplier}</div>

      ${isOnRoute ? `<div style="color:hsl(195,100%,70%);font-size:10px;font-weight:700;background:rgba(0,200,255,0.1);padding:4px 8px;border-radius:4px;border:1px solid rgba(0,200,255,0.3)">
        📍 ON PICK ROUTE
      </div>` : ''}
    </div>`;
  }

  function clearBinDetailPanel() {
    const panel = document.getElementById('ar-bin-detail-panel');
    if (panel) panel.innerHTML = '<div class="ar-alert-text" style="opacity:0.5">Hover over a bin to see details</div>';
  }

  // ─── CONTROLS ──────────────────────────────────────────────
  function selectZone(zone) {
    selectedZone = selectedZone === zone ? null : zone;
    // Update legend highlights
    Utils.qsa('.ar-zone-item').forEach(el => {
      el.classList.toggle('active', el.dataset.zone === selectedZone);
    });
  }

  function zoom(factor) {
    zoom = Math.max(0.5, Math.min(2.5, zoom * factor));
    if (canvas) { canvas.style.transform = `scale(${zoom})`; }
  }

  function resetZoom() {
    zoom = 1;
    if (canvas) canvas.style.transform = 'scale(1)';
  }

  function cleanup() {
    if (animFrame)     cancelAnimationFrame(animFrame);
    if (clockInterval) clearInterval(clockInterval);
    document.body.classList.remove('ar-mode');
    const existing = document.getElementById('ar-view');
    if (existing) existing.remove();
    arContainer = null; canvas = null; ctx = null;
  }

  function exit() {
    cleanup();
    Router.go('/analytics');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { render, selectZone, zoom, resetZoom, exit, cleanup };
})();
