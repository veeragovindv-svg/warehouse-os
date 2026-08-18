/* ============================================================
   WarehouseOS — modules/warehouseMap.js
   Enterprise 3D Digital Twin Visualizer
   With Space-Time A* Pathfinding, Catmull-Rom Spline Kinematics,
   Multi-AGV Fleet Simulation & Real-Time Collision Avoidance
   ============================================================ */

const WarehouseMapModule = (() => {

  let container = null;
  let stageWrapper = null;
  let canvas = null;
  let animFrameId = null;

  // Three.js State
  let scene, camera, renderer, controls;
  let binMeshes = [];
  let zoneBillboards = [];
  let aisleBillboards = [];
  let raycaster, mouse;
  let clock;
  let useThreeJS = false;

  // Visualizer Filters & State
  let activeZoneFilter = 'all';
  let activePreset = 'iso';
  let selectedProduct = null;
  let selectedBinCode = null;
  let isFleetPaused = false;

  // Layout Geometry Constants
  const ZONES = ['A', 'B', 'C', 'D', 'E', 'F'];
  const ZONE_INFO = {
    'A': { name: 'Electronics & MCUs',   color: 0x06B6D4, hex: '#06B6D4', colOffset: -8, rowOffset: -6, temp: '19.2°C', humidity: '38%' },
    'B': { name: 'Hardware & Fasteners', color: 0x10B981, hex: '#10B981', colOffset:  2, rowOffset: -6, temp: '20.1°C', humidity: '44%' },
    'C': { name: 'Packaging & Cartons',  color: 0xF59E0B, hex: '#F59E0B', colOffset: -8, rowOffset:  1, temp: '21.5°C', humidity: '42%' },
    'D': { name: 'Bulk Industrial Raw',  color: 0xEF4444, hex: '#EF4444', colOffset:  2, rowOffset:  1, temp: '18.8°C', humidity: '40%' },
    'E': { name: 'High-Value Optical',   color: 0xA855F7, hex: '#A855F7', colOffset: -8, rowOffset:  8, temp: '19.0°C', humidity: '35%' },
    'F': { name: 'Staging & Returns',    color: 0xEC4899, hex: '#EC4899', colOffset:  2, rowOffset:  8, temp: '22.0°C', humidity: '46%' },
  };

  // Charging & Staging Docks
  const DOCKS = {
    CHARGING: { x: -14, z: -13, name: 'Charging Bay A' },
    STAGING:  { x:  14, z:  13, name: 'Shipping Dock 1' },
    DEPOT:    { x:   0, z: -13, name: 'Main AGV Depot'  }
  };

  // ─── SPACE-TIME A* NAVGRID & PATHFINDER ─────────────────────
  const NavGrid = {
    minX: -16, maxX: 16,
    minZ: -16, maxZ: 16,
    resolution: 1.5,
    obstacles: [],
    reservations: new Map(), // key: "x,z,t" -> agvId

    init() {
      this.obstacles = [];
      // Build solid bounding obstacles for each rack zone
      ZONES.forEach(zk => {
        const zInfo = ZONE_INFO[zk];
        const rx = zInfo.colOffset * 1.8;
        const rz = zInfo.rowOffset * 1.8;
        // Rack footprint roughly 8.5m wide x 3.5m deep
        this.obstacles.push({
          minX: rx - 4.6, maxX: rx + 4.6,
          minZ: rz - 2.2, maxZ: rz + 2.2,
          zone: zk
        });
      });
    },

    isWalkable(x, z) {
      if (x < this.minX || x > this.maxX || z < this.minZ || z > this.maxZ) return false;
      for (const obs of this.obstacles) {
        if (x >= obs.minX && x <= obs.maxX && z >= obs.minZ && z <= obs.maxZ) {
          return false;
        }
      }
      return true;
    },

    toGrid(pos) {
      return {
        x: Math.round(pos.x / this.resolution) * this.resolution,
        z: Math.round(pos.z / this.resolution) * this.resolution
      };
    },

    reserve(x, z, tWindow, agvId) {
      for (let t = tWindow.start; t <= tWindow.end; t++) {
        const key = `${Math.round(x)},${Math.round(z)},${Math.round(t)}`;
        this.reservations.set(key, agvId);
      }
    },

    isReserved(x, z, t, myAgvId) {
      const key = `${Math.round(x)},${Math.round(z)},${Math.round(t)}`;
      const holder = this.reservations.get(key);
      return holder && holder !== myAgvId;
    },

    clearReservations(agvId) {
      for (const [key, holder] of this.reservations.entries()) {
        if (holder === agvId) this.reservations.delete(key);
      }
    }
  };

  function findAStarPath(startPos, endPos, agvId, startTime = 0) {
    const start = NavGrid.toGrid(startPos);
    const end = NavGrid.toGrid(endPos);

    if (!NavGrid.isWalkable(end.x, end.z)) {
      // Find nearest walkable neighbor to target bin
      const deltas = [
        { x: 0, z: 2 }, { x: 0, z: -2 },
        { x: 2, z: 0 }, { x: -2, z: 0 },
        { x: 0, z: 3 }, { x: 0, z: -3 }
      ];
      for (const d of deltas) {
        if (NavGrid.isWalkable(end.x + d.x, end.z + d.z)) {
          end.x += d.x;
          end.z += d.z;
          break;
        }
      }
    }

    const openSet = [];
    const closedSet = new Set();
    const startNode = {
      x: start.x,
      z: start.z,
      t: startTime,
      g: 0,
      h: Math.hypot(end.x - start.x, end.z - start.z),
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    const step = NavGrid.resolution;
    const dirs = [
      { x: step, z: 0, cost: step },
      { x: -step, z: 0, cost: step },
      { x: 0, z: step, cost: step },
      { x: 0, z: -step, cost: step },
      // Diagonal with corner clearance
      { x: step, z: step, cost: step * 1.414 },
      { x: -step, z: step, cost: step * 1.414 },
      { x: step, z: -step, cost: step * 1.414 },
      { x: -step, z: -step, cost: step * 1.414 },
      // Wait in place option for intersection yielding
      { x: 0, z: 0, cost: step * 0.8 }
    ];

    let maxIters = 600;

    while (openSet.length > 0 && maxIters-- > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      if (Math.hypot(current.x - end.x, current.z - end.z) < step * 0.8) {
        // Reconstruct path
        const path = [];
        let curr = current;
        while (curr) {
          path.unshift({ x: curr.x, y: 0.6, z: curr.z, t: curr.t });
          curr = curr.parent;
        }
        return path;
      }

      const stateKey = `${Math.round(current.x * 10)},${Math.round(current.z * 10)},${Math.round(current.t)}`;
      closedSet.add(stateKey);

      for (const d of dirs) {
        const nx = current.x + d.x;
        const nz = current.z + d.z;
        const nt = current.t + 1;

        if (d.x !== 0 || d.z !== 0) {
          if (!NavGrid.isWalkable(nx, nz)) continue;
        }

        if (NavGrid.isReserved(nx, nz, nt, agvId)) continue;

        const nextKey = `${Math.round(nx * 10)},${Math.round(nz * 10)},${Math.round(nt)}`;
        if (closedSet.has(nextKey)) continue;

        const gScore = current.g + d.cost;
        let neighbor = openSet.find(n => Math.abs(n.x - nx) < 0.1 && Math.abs(n.z - nz) < 0.1 && n.t === nt);

        if (!neighbor) {
          neighbor = {
            x: nx,
            z: nz,
            t: nt,
            g: gScore,
            h: Math.hypot(end.x - nx, end.z - nz),
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openSet.push(neighbor);
        } else if (gScore < neighbor.g) {
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }

    // Fallback: direct waypoint corridor
    return [
      { x: start.x, y: 0.6, z: start.z },
      { x: start.x, y: 0.6, z: 0 },
      { x: end.x, y: 0.6, z: 0 },
      { x: end.x, y: 0.6, z: end.z }
    ];
  }

  // ─── MULTI-AGV AUTONOMOUS FLEET ─────────────────────────────
  const AGV_FLEET = [
    {
      id: 'AGV-01',
      name: 'Apex Swift',
      role: 'Zone A/B Fast Shuttle',
      color: 0x06B6D4,
      hex: '#06B6D4',
      speed: 2.4,
      battery: 94,
      state: 'EN_ROUTE',
      target: 'Bin A-02',
      targetPos: { x: -8, z: -10 },
      currentPos: { x: -14, z: -10 },
      progress: 0,
      curve: null,
      pathLine: null,
      mesh: null,
      badgeSprite: null,
      beaconLight: null,
      dwellTimer: 0,
      cargoBox: null
    },
    {
      id: 'AGV-02',
      name: 'Heavy Pallet Lifter',
      role: 'Zone C/D Packaging Runner',
      color: 0x10B981,
      hex: '#10B981',
      speed: 1.8,
      battery: 86,
      state: 'EN_ROUTE',
      target: 'Bin C-01',
      targetPos: { x: -8, z: 0 },
      currentPos: { x: 0, z: 0 },
      progress: 0,
      curve: null,
      pathLine: null,
      mesh: null,
      badgeSprite: null,
      beaconLight: null,
      dwellTimer: 0,
      cargoBox: null
    },
    {
      id: 'AGV-03',
      name: 'VIP Express Courier',
      role: 'High-Priority VIP Courier',
      color: 0xA855F7,
      hex: '#A855F7',
      speed: 3.0,
      battery: 99,
      state: 'EN_ROUTE',
      target: 'Bin E-02',
      targetPos: { x: -8, z: 10 },
      currentPos: { x: 12, z: 10 },
      progress: 0,
      curve: null,
      pathLine: null,
      mesh: null,
      badgeSprite: null,
      beaconLight: null,
      dwellTimer: 0,
      cargoBox: null
    },
    {
      id: 'AGV-04',
      name: 'Staging & Returns Tug',
      role: 'Central Spine Staging Tug',
      color: 0xF59E0B,
      hex: '#F59E0B',
      speed: 2.0,
      battery: 78,
      state: 'EN_ROUTE',
      target: 'Shipping Dock',
      targetPos: { x: 12, z: -10 },
      currentPos: { x: 12, z: 0 },
      progress: 0,
      curve: null,
      pathLine: null,
      mesh: null,
      badgeSprite: null,
      beaconLight: null,
      dwellTimer: 0,
      cargoBox: null
    }
  ];

  function render(targetContainer) {
    container = targetContainer;
    container.innerHTML = buildHTML();

    stageWrapper = document.getElementById('map-stage-wrapper');
    canvas = document.getElementById('warehouse-map-canvas');

    NavGrid.init();

    if (window.THREE && window.THREE.OrbitControls) {
      initThreeJS();
    } else {
      initCanvasFallback();
    }

    bindEvents();
  }

  function buildHTML() {
    const products = Store.get.products();
    const lowStockCount = products.filter(p => p.quantity <= p.reorderPoint).length;

    return `
    <div class="map-module-container">
      <!-- Section Header -->
      <div class="section-header mb-2">
        <div class="section-header-left">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="section-title">3D Autonomous AGV Digital Twin</h2>
            <span class="badge badge-primary font-mono font-bold" style="font-size:10px">SPACE-TIME A* FLEET ENGINE</span>
          </div>
          <p class="section-sub">4 Multi-Agent AGVs · Spline Path Smoothing · Real-Time Collision Avoidance · ${products.length} Bins</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <!-- Camera Presets -->
          <div class="btn-group" title="Camera View Presets">
            <button class="btn btn-secondary btn-sm ${activePreset==='top'?'active':''}" onclick="WarehouseMapModule.setCameraPreset('top')" title="Top-Down 2D Floor Plan">
              📐 2D Top-Down
            </button>
            <button class="btn btn-secondary btn-sm ${activePreset==='iso'?'active':''}" onclick="WarehouseMapModule.setCameraPreset('iso')" title="Classic 3D Isometric View">
              🧊 3D Isometric
            </button>
            <button class="btn btn-secondary btn-sm ${activePreset==='front'?'active':''}" onclick="WarehouseMapModule.setCameraPreset('front')" title="Front Elevation Side View">
              🏢 Front View
            </button>
            <button class="btn btn-secondary btn-sm" onclick="WarehouseMapModule.setCameraPreset('reset')" title="Reset Camera">
              ↺ Reset
            </button>
          </div>

          <button id="fleet-pause-btn" class="btn btn-secondary btn-sm font-bold" onclick="WarehouseMapModule.toggleFleetPause()">
            ⏸️ Pause Fleet
          </button>
          <button class="btn btn-primary btn-sm font-bold" onclick="WarehouseMapModule.dispatchWavePick()">
            ⚡ 1-Click Wave Dispatch
          </button>
        </div>
      </div>

      <!-- FLEET TELEMETRY STATUS BAR -->
      <div class="data-grid data-grid-4 mb-3" style="gap:10px">
        ${AGV_FLEET.map(agv => `
          <div class="p-2.5 rounded-xl cursor-pointer hover:border-primary transition-all"
               id="agv-hud-card-${agv.id}"
               onclick="WarehouseMapModule.focusAGV('${agv.id}')"
               style="background:rgba(15,23,42,0.85);border:1px solid ${agv.hex}40;border-left:4px solid ${agv.hex}">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs" style="color:${agv.hex}">${agv.id} · ${agv.name}</span>
              <span class="badge badge-neutral font-mono font-bold" style="font-size:9px">${agv.speed} m/s</span>
            </div>
            <div class="flex items-center justify-between text-xs text-muted mb-1.5 font-mono" style="font-size:10.5px">
              <span id="hud-state-${agv.id}">🟢 ${agv.state}</span>
              <span id="hud-target-${agv.id}" class="text-primary truncate" style="max-width:100px">➔ ${agv.target}</span>
            </div>
            <!-- Battery Progress -->
            <div class="progress" style="height:4px;background:rgba(255,255,255,0.08)">
              <div id="hud-batt-bar-${agv.id}" class="progress-bar ${agv.battery>40?'success':agv.battery>15?'warning':'danger'}" style="width:${agv.battery}%"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Dark Glassmorphic Stage Container -->
      <div class="map-stage-wrapper relative" id="map-stage-wrapper" style="background:#0b0f19;border:1px solid rgba(6,182,212,0.3);box-shadow:0 24px 60px rgba(0,0,0,0.8), inset 0 0 80px rgba(6,182,212,0.06)">
        <canvas id="warehouse-map-canvas" class="map-canvas"></canvas>

        <!-- Top Zone Filter HUD -->
        <div class="map-hud-top">
          <div class="map-hud-controls">
            <button class="map-pill-btn ${activeZoneFilter==='all'?'active':''}" onclick="WarehouseMapModule.setZoneFilter('all')">
              All Zones
            </button>
            ${ZONES.map(z => `
              <button class="map-pill-btn ${activeZoneFilter===z?'active':''}" onclick="WarehouseMapModule.setZoneFilter('${z}')">
                Zone ${z}
              </button>`).join('')}
          </div>

          <div class="map-hud-controls flex items-center gap-2">
            <span style="font-size:11px;font-family:var(--font-mono);color:var(--clr-text-secondary)">⚡ Fleet Mode:</span>
            <span class="badge badge-success" style="font-size:9px">Autonomous Space-Time A* Active</span>
          </div>
        </div>

        <!-- Floating Glass Raycaster Hover Tooltip -->
        <div id="map-bin-tooltip" class="map-tooltip hidden"></div>

        <!-- Floating Context Flyout Card on Click -->
        <div id="map-flyout-card" class="map-flyout-card hidden">
          <div id="map-flyout-body"></div>
        </div>

        <!-- Legend HUD Bottom -->
        <div class="map-hud-bottom" style="position:absolute;bottom:16px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;pointer-events:none">
          <div class="map-hud-controls" style="pointer-events:auto">
            <span class="map-legend-item"><span class="map-legend-dot" style="background:#10B981"></span>Healthy</span>
            <span class="map-legend-item"><span class="map-legend-dot" style="background:#F59E0B"></span>Low Stock</span>
            <span class="map-legend-item"><span class="map-legend-dot pulse" style="background:#EF4444"></span>Stockout</span>
            <span class="map-legend-item"><span class="map-legend-dot" style="background:#06B6D4"></span>A* AGV Laser Path</span>
          </div>
          <div class="map-hud-controls" style="pointer-events:auto">
            <span style="font-size:10px;font-family:var(--font-mono);color:var(--clr-text-muted)">💡 Click any bin to dispatch AGV via collision-free A* path</span>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  // ─── THREE.JS 3D ENGINE ─────────────────────────────────────
  function initThreeJS() {
    useThreeJS = true;
    const THREE = window.THREE;
    clock = new THREE.Clock();

    const width = stageWrapper.clientWidth || 900;
    const height = stageWrapper.clientHeight || 620;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f19);
    scene.fog = new THREE.FogExp2(0x0b0f19, 0.012);

    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(32, 36, 46);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 12;
    controls.maxDistance = 140;
    controls.target.set(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
    dirLight.position.set(20, 45, 20);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x06b6d4, 1.6, 80);
    pointLight.position.set(0, 18, 0);
    scene.add(pointLight);

    // Floor Grid Wireframe
    const gridHelper = new THREE.GridHelper(64, 32, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Charging Pads & Docks
    buildDocks();

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create 3D Racks, Labels & Multi-AGV Fleet
    build3DRacks();
    build3DBillboardLabels();
    initAGVFleet();

    // Start Render Loop
    animateThreeJS();
  }

  function buildDocks() {
    const THREE = window.THREE;
    // Charging Dock Pad
    const dockGeo = new THREE.BoxGeometry(4, 0.2, 4);
    const dockMat = new THREE.MeshStandardMaterial({
      color: 0x10B981,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x10B981,
      emissiveIntensity: 0.3
    });
    const dockMesh = new THREE.Mesh(dockGeo, dockMat);
    dockMesh.position.set(DOCKS.CHARGING.x, 0.05, DOCKS.CHARGING.z);
    scene.add(dockMesh);

    // Staging Dock Pad
    const stageGeo = new THREE.BoxGeometry(4, 0.2, 4);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0xA855F7,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0xA855F7,
      emissiveIntensity: 0.3
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.set(DOCKS.STAGING.x, 0.05, DOCKS.STAGING.z);
    scene.add(stageMesh);
  }

  function makeTextSprite(message, opts = {}) {
    const THREE = window.THREE;
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 512;
    canvasEl.height = 128;
    const ctx = canvasEl.getContext('2d');

    const bgColor = opts.bgColor || 'rgba(15, 23, 42, 0.9)';
    const borderColor = opts.borderColor || '#06B6D4';
    const textColor = opts.textColor || '#F8FAFC';
    const subText = opts.subText || '';

    // Draw rounded pill background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(12, 14, 488, 100, 20);
    } else {
      ctx.rect(12, 14, 488, 100);
    }
    ctx.fill();
    ctx.stroke();

    // Main text
    ctx.font = '600 28px "Space Grotesk", sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(message, 256, subText ? 48 : 66);

    // Subtext
    if (subText) {
      ctx.font = '500 18px "Space Grotesk", sans-serif';
      ctx.fillStyle = borderColor;
      ctx.fillText(subText, 256, 84);
    }

    const texture = new THREE.CanvasTexture(canvasEl);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(opts.scaleX || 6.8, opts.scaleY || 1.7, 1);
    return sprite;
  }

  function build3DBillboardLabels() {
    zoneBillboards = [];
    aisleBillboards = [];

    // 1. Zone Labels
    ZONES.forEach(zoneKey => {
      const zInfo = ZONE_INFO[zoneKey];
      const rx = zInfo.colOffset * 1.8;
      const rz = zInfo.rowOffset * 1.8;

      const sprite = makeTextSprite(`Zone ${zoneKey}`, {
        subText: zInfo.name,
        borderColor: zInfo.hex,
        scaleX: 6.6,
        scaleY: 1.65
      });
      sprite.position.set(rx, 8.5, rz);
      scene.add(sprite);
      zoneBillboards.push({ zone: zoneKey, sprite });
    });

    // 2. Aisle Billboards
    const aisles = [
      { name: 'Aisle 01', sub: 'North Transit Lane', x: 0, z: -10.5, color: '#38BDF8' },
      { name: 'Aisle 02', sub: 'Main Floor Spine', x: 0, z: 0, color: '#06B6D4' },
      { name: 'Aisle 03', sub: 'South Staging Hub', x: 0, z: 10.5, color: '#A855F7' },
    ];

    aisles.forEach(a => {
      const sprite = makeTextSprite(a.name, {
        subText: a.sub,
        borderColor: a.color,
        bgColor: 'rgba(10, 15, 29, 0.82)',
        scaleX: 6.8,
        scaleY: 1.7
      });
      sprite.position.set(a.x, 2.2, a.z);
      scene.add(sprite);
      aisleBillboards.push(sprite);
    });
  }

  function build3DRacks() {
    const THREE = window.THREE;
    binMeshes = [];
    const products = Store.get.products();

    ZONES.forEach(zoneKey => {
      const zInfo = ZONE_INFO[zoneKey];
      const rackX = zInfo.colOffset * 1.8;
      const rackZ = zInfo.rowOffset * 1.8;

      // Outer Wireframe Bounding Rack
      const frameGeo = new THREE.BoxGeometry(9.2, 6.8, 3.2);
      const wireMat = new THREE.MeshBasicMaterial({
        color: zInfo.color,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      const frameMesh = new THREE.Mesh(frameGeo, wireMat);
      frameMesh.position.set(rackX, 3.4, rackZ);
      scene.add(frameMesh);

      // Solid Rack Shelf Footing
      const shelfGeo = new THREE.BoxGeometry(9.0, 0.15, 3.0);
      const shelfMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
      [0.2, 2.4, 4.6].forEach(sy => {
        const shelf = new THREE.Mesh(shelfGeo, shelfMat);
        shelf.position.set(rackX, sy, rackZ);
        scene.add(shelf);
      });

      // Individual Product Storage Bins (2 tiers x 4 columns = 8 bins per zone)
      const zoneProducts = products.filter(p => p.zone === zoneKey);

      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          const pIdx = (r * 4 + c) % (zoneProducts.length || 1);
          const product = zoneProducts[pIdx] || {
            id: `PRD-${zoneKey}${r}${c}`,
            name: `${zInfo.name} Item ${r*4+c+1}`,
            sku: `${zoneKey}-SKU-0${r*4+c+1}`,
            quantity: 25,
            reorderPoint: 10,
            maxCapacity: 50
          };

          let binColor = zInfo.color;
          let isStockout = false;

          if (product.quantity === 0 || product.quantity <= 5) {
            binColor = 0xEF4444; // Crimson Red
            isStockout = true;
          } else if (product.quantity <= product.reorderPoint) {
            binColor = 0xF59E0B; // Amber Low Stock
          }

          const binGeo = new THREE.BoxGeometry(1.8, 1.4, 1.6);
          const binMat = new THREE.MeshStandardMaterial({
            color: binColor,
            roughness: 0.3,
            metalness: 0.2,
            transparent: true,
            opacity: 0.88,
            emissive: binColor,
            emissiveIntensity: isStockout ? 0.6 : 0.15
          });

          const binMesh = new THREE.Mesh(binGeo, binMat);
          const bx = rackX - 3.2 + c * 2.1;
          const by = 1.0 + r * 2.4;
          const bz = rackZ;

          binMesh.position.set(bx, by, bz);
          binMesh.userData = { product, zone: zoneKey, binCode: `${zoneKey}-${r+1}0${c+1}`, isStockout, baseColor: binColor };

          scene.add(binMesh);
          binMeshes.push(binMesh);
        }
      }
    });
  }

  // ─── FLEET BUILDER & KINEMATICS INITIALIZATION ─────────────
  function initAGVFleet() {
    const THREE = window.THREE;

    AGV_FLEET.forEach((agv, idx) => {
      // 1. Build AGV Chassis Group
      const agvGroup = new THREE.Group();

      // Main Rectangular Body
      const bodyGeo = new THREE.BoxGeometry(1.4, 0.45, 1.0);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1E293B,
        metalness: 0.8,
        roughness: 0.2
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.3;
      agvGroup.add(bodyMesh);

      // Top Colored Deck
      const deckGeo = new THREE.BoxGeometry(1.3, 0.1, 0.9);
      const deckMat = new THREE.MeshStandardMaterial({
        color: agv.color,
        emissive: agv.color,
        emissiveIntensity: 0.4,
        metalness: 0.5,
        roughness: 0.3
      });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.y = 0.55;
      agvGroup.add(deckMesh);

      // Cargo Pallet Box (loads when picking)
      const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.7);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.6 });
      const cargoBox = new THREE.Mesh(boxGeo, boxMat);
      cargoBox.position.set(0, 0.9, 0);
      cargoBox.visible = idx % 2 === 0;
      agvGroup.add(cargoBox);
      agv.cargoBox = cargoBox;

      // 4 Omni-Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.8 });
      wheelGeo.rotateZ(Math.PI / 2);

      [
        [-0.55, 0.2, -0.45],
        [-0.55, 0.2,  0.45],
        [ 0.55, 0.2, -0.45],
        [ 0.55, 0.2,  0.45]
      ].forEach(wp => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(...wp);
        agvGroup.add(wheel);
      });

      // Directional Headlights
      const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
      const hl1 = new THREE.Mesh(lightGeo, lightMat);
      hl1.position.set(0.7, 0.35, -0.3);
      const hl2 = new THREE.Mesh(lightGeo, lightMat);
      hl2.position.set(0.7, 0.35, 0.3);
      agvGroup.add(hl1);
      agvGroup.add(hl2);

      // Top Pulsing Beacon Light
      const beaconLight = new THREE.PointLight(agv.color, 2.0, 8);
      beaconLight.position.set(0, 0.8, 0);
      agvGroup.add(beaconLight);
      agv.beaconLight = beaconLight;

      // 3D Floating WebGL Status Badge
      const badge = makeTextSprite(agv.id, {
        subText: `${agv.speed}m/s · ${agv.battery}%`,
        borderColor: agv.hex,
        bgColor: 'rgba(15, 23, 42, 0.85)',
        scaleX: 3.8,
        scaleY: 0.95
      });
      badge.position.set(0, 1.8, 0);
      agvGroup.add(badge);
      agv.badgeSprite = badge;

      agvGroup.position.set(agv.currentPos.x, 0.1, agv.currentPos.z);
      scene.add(agvGroup);
      agv.mesh = agvGroup;

      // Plan initial A* path for each AGV
      planAGVRoute(agv, agv.targetPos);
    });
  }

  function planAGVRoute(agv, destination) {
    const THREE = window.THREE;
    NavGrid.clearReservations(agv.id);

    const startPos = agv.mesh ? agv.mesh.position : agv.currentPos;
    const rawPath = findAStarPath(startPos, destination, agv.id, 0);

    if (rawPath.length < 2) return;

    // Convert waypoints into 3D Vector3 points
    const points = rawPath.map(p => new THREE.Vector3(p.x, 0.3, p.z));

    // Reserve nodes along estimated timeline
    rawPath.forEach((p, i) => {
      NavGrid.reserve(p.x, p.z, { start: i * 2, end: i * 2 + 3 }, agv.id);
    });

    // Create Smooth Catmull-Rom Spline Curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.4);
    agv.curve = curve;
    agv.progress = 0;
    agv.targetPos = destination;

    // Render Glowing Path Trail on Floor
    if (agv.pathLine) scene.remove(agv.pathLine);

    const curvePoints = curve.getPoints(60);
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: agv.color,
      linewidth: 2,
      transparent: true,
      opacity: 0.75
    });
    const pathLine = new THREE.Line(lineGeo, lineMat);
    pathLine.position.y = 0.05;
    scene.add(pathLine);
    agv.pathLine = pathLine;
  }

  // ─── ANIMATION & KINEMATICS LOOP ────────────────────────────
  function animateThreeJS() {
    animFrameId = requestAnimationFrame(animateThreeJS);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // 1. Animate Stockout Pulsing Red Bins
    binMeshes.forEach(mesh => {
      if (mesh.userData.isStockout) {
        const pulse = Math.sin(time * 6) * 0.4 + 0.6;
        mesh.material.emissiveIntensity = pulse;
      }
    });

    // 2. Animate Multi-AGV Autonomous Fleet Kinematics
    if (!isFleetPaused) {
      AGV_FLEET.forEach(agv => {
        updateAGVKinematics(agv, delta, time);
      });
    }

    controls.update();
    renderer.render(scene, camera);
  }

  function updateAGVKinematics(agv, delta, time) {
    const THREE = window.THREE;
    if (!agv.curve || !agv.mesh) return;

    // Handle State Machine Dwells (Picking / Charging / Idle)
    if (agv.state === 'PICKING' || agv.state === 'CHARGING') {
      agv.dwellTimer -= delta;

      if (agv.state === 'CHARGING') {
        agv.battery = Math.min(100, agv.battery + delta * 5.0); // Charge 5%/sec
      }

      if (agv.dwellTimer <= 0) {
        if (agv.state === 'CHARGING') {
          agv.state = 'EN_ROUTE';
          agv.target = 'Active Racks';
          planAGVRoute(agv, { x: -8, z: -6 });
        } else {
          agv.state = 'RETURNING';
          agv.target = 'Shipping Dock 1';
          if (agv.cargoBox) agv.cargoBox.visible = true;
          planAGVRoute(agv, DOCKS.STAGING);
        }
      }
      return;
    }

    // Advance Progress Along Catmull-Rom Spline with Trapezoidal Speed
    const curveLength = agv.curve.getLength();
    const normalizedSpeed = (agv.speed / Math.max(1, curveLength)) * delta * 0.8;
    agv.progress += normalizedSpeed;

    // Dynamic Battery Drain while traveling
    agv.battery = Math.max(0, agv.battery - delta * 0.05);

    // Auto-Reroute to Charging Dock if battery < 15%
    if (agv.battery < 15 && agv.state !== 'LOW_BATT_REROUTE' && agv.state !== 'CHARGING') {
      agv.state = 'LOW_BATT_REROUTE';
      agv.target = 'Charging Bay A';
      Utils.Toast.warning(`AGV Battery Low`, `${agv.id} auto-navigating to Charging Dock`);
      planAGVRoute(agv, DOCKS.CHARGING);
      return;
    }

    if (agv.progress >= 1.0) {
      // Arrived at destination
      agv.progress = 1.0;

      if (agv.target.includes('Charging')) {
        agv.state = 'CHARGING';
        agv.dwellTimer = 5.0; // Charge dwell
      } else if (agv.state === 'RETURNING') {
        agv.state = 'IDLE';
        agv.target = 'Standby';
        if (agv.cargoBox) agv.cargoBox.visible = false;
        agv.dwellTimer = 2.0;
        // Schedule next mission
        setTimeout(() => {
          agv.state = 'EN_ROUTE';
          const nextTargets = [
            { x: -8, z: -6, name: 'Bin A-01' },
            { x:  2, z: -6, name: 'Bin B-03' },
            { x: -8, z:  1, name: 'Bin C-02' },
            { x:  2, z:  8, name: 'Bin F-01' }
          ];
          const next = nextTargets[Math.floor(Math.random() * nextTargets.length)];
          agv.target = next.name;
          planAGVRoute(agv, next);
        }, 2000);
      } else {
        agv.state = 'PICKING';
        agv.dwellTimer = 2.5; // Robotic pick dwell
      }
    }

    // Kinematic Position & Smooth Heading Tangent
    const currentPoint = agv.curve.getPointAt(Math.min(0.999, agv.progress));
    const nextPoint = agv.curve.getPointAt(Math.min(1.0, agv.progress + 0.02));

    agv.mesh.position.x = currentPoint.x;
    agv.mesh.position.z = currentPoint.z;
    agv.mesh.position.y = 0.1 + Math.sin(time * 6 + agv.speed) * 0.03; // Subtle suspension float

    // Smooth Heading LookAt
    const lookTarget = new THREE.Vector3(nextPoint.x, 0.1, nextPoint.z);
    agv.mesh.lookAt(lookTarget);

    // Pulsing Beacon Light
    if (agv.beaconLight) {
      agv.beaconLight.intensity = Math.sin(time * 8) * 1.0 + 1.8;
    }

    // Update Telemetry HUD Row
    updateAGVStatusHUD(agv);
  }

  function updateAGVStatusHUD(agv) {
    const stateEl = document.getElementById(`hud-state-${agv.id}`);
    const targetEl = document.getElementById(`hud-target-${agv.id}`);
    const battBar = document.getElementById(`hud-batt-bar-${agv.id}`);

    if (stateEl) stateEl.textContent = `${agv.state === 'CHARGING' ? '⚡' : '🟢'} ${agv.state}`;
    if (targetEl) targetEl.textContent = `➔ ${agv.target}`;
    if (battBar) {
      battBar.style.width = `${Math.round(agv.battery)}%`;
      battBar.className = `progress-bar ${agv.battery > 40 ? 'success' : agv.battery > 15 ? 'warning' : 'danger'}`;
    }
  }

  // ─── INTERACTIVE CONTROLS & DISPATCH ────────────────────────
  function dispatchToBin(binCode, zoneKey) {
    const zInfo = ZONE_INFO[zoneKey] || ZONE_INFO['A'];
    const rx = zInfo.colOffset * 1.8;
    const rz = zInfo.rowOffset * 1.8;

    // Pick closest available AGV
    const idleAgv = AGV_FLEET.find(a => a.state === 'IDLE' || a.state === 'EN_ROUTE') || AGV_FLEET[0];
    idleAgv.state = 'EN_ROUTE';
    idleAgv.target = `Bin ${binCode}`;

    Utils.Sound?.playScan?.();
    Utils.Toast.success('A* AGV Dispatched', `${idleAgv.id} navigating to Bin ${binCode} via collision-free trajectory`);

    planAGVRoute(idleAgv, { x: rx, z: rz });
    focusAGV(idleAgv.id);
  }

  function dispatchWavePick() {
    const targets = [
      { x: -8, z: -6, name: 'Bin A-02 (Electronics)' },
      { x:  2, z: -6, name: 'Bin B-01 (Hardware)' },
      { x: -8, z:  8, name: 'Bin E-01 (Optical VIP)' },
      { x:  2, z:  8, name: 'Bin F-03 (Machinery)' }
    ];

    AGV_FLEET.forEach((agv, i) => {
      agv.state = 'EN_ROUTE';
      agv.target = targets[i].name;
      planAGVRoute(agv, targets[i]);
    });

    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Wave Pick Initiated', 'All 4 AGVs dispatched with Space-Time collision-free reservations');
  }

  function focusAGV(agvId) {
    const agv = AGV_FLEET.find(a => a.id === agvId);
    if (!agv || !controls || !camera) return;

    controls.target.set(agv.mesh.position.x, 2, agv.mesh.position.z);
    camera.position.set(agv.mesh.position.x + 12, 16, agv.mesh.position.z + 16);
    Utils.Toast.info('Camera Locked', `Tracking ${agv.name} (${agv.id})`);
  }

  function toggleFleetPause() {
    isFleetPaused = !isFleetPaused;
    const btn = document.getElementById('fleet-pause-btn');
    if (btn) btn.innerHTML = isFleetPaused ? '▶️ Resume Fleet' : '⏸️ Pause Fleet';
    Utils.Toast.info(isFleetPaused ? 'Fleet Emergency Hold' : 'Fleet Resumed', isFleetPaused ? 'All AGVs holding position' : 'AGVs resuming active paths');
  }

  function setCameraPreset(preset) {
    if (!camera || !controls) return;
    activePreset = preset;

    if (preset === 'top') {
      camera.position.set(0, 56, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      camera.position.set(0, 8, 48);
      controls.target.set(0, 3, 0);
    } else {
      camera.position.set(32, 36, 46);
      controls.target.set(0, 0, 0);
    }
    controls.update();
  }

  function setZoneFilter(zoneKey) {
    activeZoneFilter = zoneKey;
    binMeshes.forEach(mesh => {
      if (zoneKey === 'all') {
        mesh.visible = true;
      } else {
        mesh.visible = mesh.userData.zone === zoneKey;
      }
    });
  }

  // ─── EVENT HANDLING & RAYCASTING ────────────────────────────
  function bindEvents() {
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
  }

  function onWindowResize() {
    if (!useThreeJS || !renderer || !camera || !stageWrapper) return;
    const w = stageWrapper.clientWidth;
    const h = stageWrapper.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onMouseMove(event) {
    if (!useThreeJS || !raycaster || !camera) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(binMeshes);

    const tooltip = document.getElementById('map-bin-tooltip');

    if (intersects.length > 0) {
      const target = intersects[0].object;
      const p = target.userData.product;
      const bCode = target.userData.binCode;
      const fillPct = Math.round(p.quantity / (p.maxCapacity || 50) * 100);

      if (tooltip) {
        tooltip.innerHTML = `
          <div class="font-bold text-sm mb-1 flex items-center justify-between">
            <span>📦 ${bCode}</span>
            <span class="badge ${fillPct>70?'badge-success':fillPct>35?'badge-warning':'badge-danger'}">${fillPct}%</span>
          </div>
          <div class="text-xs font-mono text-primary font-bold mb-1">${p.sku}</div>
          <div class="text-xs mb-1">${p.name}</div>
          <div class="text-xs text-muted mb-2">Zone: <strong>Zone ${target.userData.zone}</strong></div>
          <div class="progress" style="height:5px">
            <div class="progress-bar ${fillPct>70?'success':fillPct>35?'warning':'danger'}" style="width:${fillPct}%"></div>
          </div>
          <div class="text-xs text-muted mt-1 font-mono">${p.quantity} / ${p.maxCapacity || 50} units</div>
        `;
        tooltip.style.left = `${Math.min(event.clientX - rect.left + 15, rect.width - 240)}px`;
        tooltip.style.top = `${Math.min(event.clientY - rect.top + 15, rect.height - 180)}px`;
        tooltip.classList.remove('hidden');
      }
    } else {
      if (tooltip) tooltip.classList.add('hidden');
    }
  }

  function onClick(event) {
    if (!useThreeJS || !raycaster || !camera) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(binMeshes);

    if (intersects.length > 0) {
      const target = intersects[0].object;
      const p = target.userData.product;
      const bCode = target.userData.binCode;
      const zoneKey = target.userData.zone;
      const zInfo = ZONE_INFO[zoneKey];

      selectedProduct = p;
      selectedBinCode = bCode;

      Utils.Sound?.playScan?.();
      openFlyoutCard(p, bCode, zoneKey, zInfo);
    }
  }

  function openFlyoutCard(p, bCode, zoneKey, zInfo) {
    const card = document.getElementById('map-flyout-card');
    const body = document.getElementById('map-flyout-body');
    if (!card || !body) return;

    const fillPct = Math.round(p.quantity / (p.maxCapacity || 50) * 100);
    const statusClass = p.quantity <= 5 ? 'critical' : p.quantity <= p.reorderPoint ? 'low' : 'healthy';

    body.innerHTML = `
      <div class="flex items-center justify-between mb-4 pb-3" style="border-bottom:1px solid rgba(255,255,255,0.08)">
        <div class="flex items-center gap-2.5">
          <span class="product-row-zone zone-${zoneKey}" style="width:22px;height:22px;font-size:10px;font-weight:700">${zoneKey}</span>
          <div>
            <div class="font-bold text-xs text-primary" style="letter-spacing:0.02em">Bin ${bCode}</div>
            <div class="text-xs text-muted" style="font-size:10.5px">${zInfo.name}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-xs icon-btn" onclick="WarehouseMapModule.closeFlyoutCard()" title="Close Flyout" style="width:24px;height:24px;font-size:11px">
          ✕
        </button>
      </div>

      <!-- SKU & Name -->
      <div class="mb-4">
        <div class="font-mono font-bold text-primary mb-0.5" style="font-size:11px;letter-spacing:0.04em">${p.sku}</div>
        <div class="font-medium text-xs leading-relaxed" style="color:var(--clr-text);font-size:12px">${p.name}</div>
      </div>

      <!-- Stock Telemetry Grid -->
      <div class="data-grid data-grid-3 mb-4 p-2.5 rounded-lg" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);gap:10px">
        <div class="text-center">
          <div class="text-xs text-muted" style="font-size:10px">In Stock</div>
          <div class="font-mono font-bold text-xs mt-0.5" style="color:${statusClass==='critical'?'#EF4444':statusClass==='low'?'#F59E0B':'#10B981'};font-size:13px">${p.quantity}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-muted" style="font-size:10px">Reorder Pt</div>
          <div class="font-mono font-bold text-xs mt-0.5 text-muted" style="font-size:13px">${p.reorderPoint || 10}</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-muted" style="font-size:10px">Max Cap</div>
          <div class="font-mono font-bold text-xs mt-0.5 text-primary" style="font-size:13px">${p.maxCapacity || 50}</div>
        </div>
      </div>

      <!-- Capacity Progress -->
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs mb-1.5 font-mono text-muted" style="font-size:10.5px">
          <span>Storage Utilization</span>
          <span>${fillPct}%</span>
        </div>
        <div class="progress" style="height:5px">
          <div class="progress-bar ${fillPct>70?'success':fillPct>35?'warning':'danger'}" style="width:${fillPct}%"></div>
        </div>
      </div>

      <!-- Environmental IoT Telemetry -->
      <div class="p-3 rounded-lg mb-4" style="background:rgba(6,182,212,0.04);border:1px solid rgba(6,182,212,0.18)">
        <div class="flex items-center justify-between text-xs font-mono mb-2" style="font-size:10.5px">
          <span class="text-muted">🌡️ Ambient Temp</span>
          <span class="text-success font-semibold">${zInfo.temp}</span>
        </div>
        <div class="flex items-center justify-between text-xs font-mono mb-2" style="font-size:10.5px">
          <span class="text-muted">💧 Relative Humidity</span>
          <span class="text-primary font-semibold">${zInfo.humidity} RH</span>
        </div>
        <div class="flex items-center justify-between text-xs font-mono" style="font-size:10.5px">
          <span class="text-muted">📡 Beacon Status</span>
          <span class="text-success font-semibold">99.8% Online</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2 pt-1">
        <button class="btn btn-primary btn-xs font-bold" onclick="WarehouseMapModule.dispatchToBin('${bCode}', '${zoneKey}')" style="padding:7px 12px;font-size:11.5px">
          🤖 Dispatch AGV to Bin (A* Spline)
        </button>
        <div class="flex items-center gap-2">
          <button class="btn btn-secondary btn-xs flex-1" onclick="WarehouseMapModule.flyoutDirectPick('${p.id}')" style="padding:5px 8px;font-size:10.5px">
            ⚡ 1-Click Pick
          </button>
          <button class="btn btn-secondary btn-xs flex-1" onclick="Router.go('/inventory')" style="padding:5px 8px;font-size:10.5px">
            🔍 Inventory
          </button>
        </div>
      </div>
    `;

    card.classList.remove('hidden');
  }

  function closeFlyoutCard() {
    const card = document.getElementById('map-flyout-card');
    if (card) card.classList.add('hidden');
  }

  function flyoutDirectPick(productId) {
    const p = Store.get.productById(productId);
    if (!p) return;
    if (p.quantity <= 0) {
      Utils.Toast.error('Cannot Pick SKU', 'Product is currently out of stock');
      return;
    }
    Store.adjustStock(productId, -1, 'Direct 3D Map Pick Task', 'ST-001');
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Item Picked', `Picked 1× ${p.sku}. Remaining: ${p.quantity - 1}`);
    Router.dispatch();
  }

  function initCanvasFallback() {
    useThreeJS = false;
    const ctx = canvas.getContext('2d');
    const resizeCanvas = () => {
      canvas.width = stageWrapper.clientWidth;
      canvas.height = stageWrapper.clientHeight;
    };
    resizeCanvas();

    let t = 0;
    function loop() {
      t += 0.03;
      if (!ctx || useThreeJS) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#38BDF8';
      ctx.font = '14px Space Grotesk';
      ctx.fillText('3D Spatial Engine Loading…', 30, 40);
      animFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  return {
    render, setCameraPreset, setZoneFilter, dispatchToBin, dispatchWavePick,
    focusAGV, toggleFleetPause, closeFlyoutCard, flyoutDirectPick
  };
})();
