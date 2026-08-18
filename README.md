# 📦 WarehouseOS — Spatial Intelligence & AGV Fleet Platform

An enterprise-grade **3D Digital Twin & Autonomous AGV Fleet Operations platform** built for warehouse managers, operations directors, and logistics engineers to monitor, simulate, and optimize floor logistics.

---

## 🚀 Live Demo & Interfaces

Run the local web server to access the three standalone interfaces:

1. **🏢 Core Platform Interface**: **[http://localhost:8080](http://localhost:8080)** (`index.html`)  
   *The primary control center featuring the Frosted Glass Dashboard, 3D Digital Twin Map, Staff Directory, AI Help Copilot, and Predictive ML demand matrix.*
2. **🎯 Standalone AGV Simulator**: **[http://localhost:8080/agv_sim.html](http://localhost:8080/agv_sim.html)**  
   *A self-contained simulation playground for testing prioritized Space-Time A\* dispatching, spline curved kinematics, and manual delay/E-stop injections.*
3. **🎬 Walkthrough Video Player**: **[http://localhost:8080/video_walkthrough.html](http://localhost:8080/video_walkthrough.html)**  
   *Frosted glass interactive media player showcasing operations, server booting, order flow, and forecast updates.*

---

## ⚡ How to Run Locally in 15 Seconds

### 1. Open Terminal / PowerShell
Navigate to the workspace folder:
```powershell
cd "c:\Users\veera\OneDrive\Documents\smart houseware"
```

### 2. Boot Local Python Server
Start the lightweight web server on port `8080`:
```powershell
python -m http.server 8080
```

### 3. Open in Browser
Visit **[http://localhost:8080](http://localhost:8080)** in Google Chrome, Microsoft Edge, or Safari.

---

## 🔑 Demo Access Credentials

Click **`[ 🔐 Login / Register ]`** in the top header (or navigate to `#/login`) to switch between role profiles:

| Profile Role | Email Address | Password | Privileges / Clearance |
| :--- | :--- | :--- | :--- |
| 👑 **Root Admin** | `admin@warehouse.os` | `admin` | **Veera Govind** (Executive operations controls, full edit rights) |
| 👷 **Floor Picker** | `alex@warehouse.os` | `staff` | **Alex Rivera** (Order picking, bin counts, task verification) |
| 📦 **Supervisor** | `dana@warehouse.os` | `staff` | **Dana Patel** (Analytics audits, packing stations, dispatch) |

---

## 📁 Complete Repository Directory & File Structure

```
smart houseware/
├── index.html                   # Primary application HTML shell and module container
├── agv_sim.html                 # Standalone Space-Time A* & SLA delay simulator
├── video_walkthrough.html       # Standalone interactive video walkthrough player
├── warehouse-logo.jpg           # Cyber-Tech theme brandmark logo
├── README.md                    # Platform documentation and technical guide
├── css/                         # CSS Layout & Glassmorphism Design System
│   ├── base.css                 # CSS variables, global resets, and app layout shell
│   ├── typography.css           # Google Fonts (Space Grotesk, JetBrains Mono) & font tokens
│   ├── components.css           # Frosted glass buttons, badges, modals, and input controls
│   ├── dynamic.css              # Ambient drifting orbs, glow transitions, and clock styles
│   ├── map.css                  # HUD, tooltip, and overlay layouts for the 3D map
│   ├── ar.css                   # Styles for AR space camera overlays
│   ├── copilot.css              # Side panel chat bubbles and input styles
│   ├── cdc.css                  # CDC mutation log rows and network statistics styling
│   └── modules.css              # Analytics charts, inventory matrices, and alert grids
└── js/                          # Application Logic & Modules
    ├── data.js                  # Initial mock database (SKUs, orders, workforce roster)
    ├── store.js                 # Reactive state store managing mutations and trigger events
    ├── utils.js                 # Helper library (Toasts, Sound effects, Modal helpers, Date formatters)
    ├── router.js                # Hash-based SPA client router (#/dashboard, #/map, etc.)
    ├── app.js                   # Application bootstrap, navigation list, and clock updater
    └── modules/                 # Modular controller views
        ├── auth.js              # User session, login page, and signup registration
        ├── staff.js             # workforce roster management and add new staff wizard
        ├── warehouseMap.js      # Three.js 3D isometric map grid, A* kinematics, & bin tooltip
        ├── videoGuide.js        # Simulated walkthrough HD player with Sweet Voice narration
        ├── cdcPipeline.js       # Simulated PostgreSQL logical replication mutation logs
        ├── markovPredictor.js   # 48-Hour predictive matrix demand surge math models
        ├── dataIntelligence.js  # Unified split control hub for ML metrics
        ├── picking.js           # Order pick verification and barcode checkout
        ├── alerts.js            # Active safety and inventory alerts manager
        ├── dispatch.js          # Delivery carrier assignment and shipping tracking
        └── analytics.js         # Operations SLA statistics and CSV analytics exports
```

---

## 🛠️ In-Depth Technical Architecture & Code Specifications

### 1. The Reactive State Manager (`js/store.js`)
* **Purpose**: Acts as the single-source-of-truth database for the application runtime.
* **Mutations**: Exposes secure methods to modify stock (`adjustStock`), manage alerts (`addAlert`, `resolveAlert`), change order status (`setOrderStatus`), and onboard personnel (`addStaff`, `deleteStaff`).
* **Reactivity**: Operates on an event-emitter pattern (`on`, `emit`). For instance, when a product quantity changes, `Store.emit('products:changed')` triggers, prompting the top header KPIs to recalculate and redraw automatically.

### 2. Space-Time A* Pathfinding Algorithm (`js/modules/warehouseMap.js` & `agv_sim.html`)
* **The NavGrid**: Represents the warehouse floor as a grid with $1.5\text{m}$ resolution. Wireframe racks are registered as solid obstacles.
* **Temporal Collision Avoidance**: Integrates a space-time reservation table `(x, z, t)`. When an AGV computes a path, it reserves specific coordinates at designated tick windows. If a conflict is detected at an intersection, the lower-priority AGV will choose to yield (wait in place) or calculate a detour route.
* **Kinematics Curve Smoothing**: Raw waypoint steps are passed through `THREE.CatmullRomCurve3`. The AGV chassis position is updated along this spline curve with smooth heading alignment using Quaternion spherical linear interpolation (`THREE.Quaternion.slerp`).

### 3. Change Data Capture Ingestion (`js/modules/cdcPipeline.js`)
* **Log Replication**: Simulates logical decoding logs streaming from a PostgreSQL database (releasing mutations at a rate of 42 transactions per second).
* **Telemetry**: Details active LSN positions, buffer memory consumption, replication slot status, and latency offsets (in milliseconds).

### 4. Markov Demand Prediction Matrix (`js/modules/markovPredictor.js`)
* **Surge Forecasts**: Implements a transition matrix modeling customer purchase patterns across 6 categories (Electronics, Hardware, Packaging, Raw Materials, Optical, Staging).
* **Equilibrium Vectors**: Computes steady-state probabilities to predict zone load distributions 48 hours in advance, triggering automated replenishment warnings.
