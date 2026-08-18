/* ============================================================
   WarehouseOS — modules/inventory.js
   Inventory & Stock Monitoring Module
   ============================================================ */

const InventoryModule = (() => {

  let currentFilters = { search:'', zone:'all', category:'all', status:'all' };
  let sortState = { key:'name', dir:'asc' };
  let currentView = 'table'; // 'table' | 'grid'
  let rowDensity = 'compact'; // 'compact' | 'comfortable'
  let currentPage = 1;
  let pageSize = 10; // 10 | 25 | 50 | 'all'
  let selectedProductIds = new Set();

  // ─── RENDER ────────────────────────────────────────────────
  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    renderTable(container);
    renderSummaryCards(container);
  }

  function setFilterStatus(status) {
    currentFilters.status = status;
    currentPage = 1;
  }

  function buildHTML() {
    const summary = Store.get.stockSummary();
    const products = Store.get.products();
    const zones = [...new Set(products.map(p => p.zone))].sort();
    const categories = [...new Set(products.map(p => p.category))].sort();

    return `
    <div class="inventory-module">
      <!-- Section Header -->
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Inventory & Stock</h2>
          <p class="section-sub">${products.length} products across ${zones.length} zones</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <button id="inv-export-btn" class="btn btn-secondary btn-sm" aria-label="Export inventory to CSV">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 10v4h12v-4M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            Export CSV
          </button>
          <button id="inv-add-btn" class="btn btn-primary btn-sm" aria-label="Add new product">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div id="inv-summary-cards" class="inventory-grid"></div>

      <!-- Filter Bar with Density & View Controls -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input type="search" id="inv-search" placeholder="Search name, SKU, bin…" value="${currentFilters.search}" aria-label="Search inventory" />
        </div>
        <select id="inv-zone-filter" class="filter-select" aria-label="Filter by zone">
          <option value="all">All Zones</option>
          ${zones.map(z => `<option value="${z}" ${currentFilters.zone===z?'selected':''}>Zone ${z} — ${SeedData.zoneInfo[z]?.name||z}</option>`).join('')}
        </select>
        <select id="inv-cat-filter" class="filter-select" aria-label="Filter by category">
          <option value="all">All Categories</option>
          ${categories.map(c => `<option value="${c}" ${currentFilters.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <select id="inv-status-filter" class="filter-select" aria-label="Filter by status">
          <option value="all">All Stock</option>
          <option value="healthy" ${currentFilters.status==='healthy'?'selected':''}>✅ Healthy</option>
          <option value="low" ${currentFilters.status==='low'?'selected':''}>⚠️ Low Stock</option>
          <option value="out" ${currentFilters.status==='out'?'selected':''}>🚨 Out of Stock</option>
        </select>

        <div class="ml-auto flex items-center gap-2">
          <!-- Row Density Controls -->
          <div class="btn-group" title="Table Row Density">
            <button class="btn btn-secondary btn-sm ${rowDensity==='compact'?'active':''}" id="density-compact-btn" title="Compact density (tight rows)" aria-label="Compact row density">
              ⊟ Compact
            </button>
            <button class="btn btn-secondary btn-sm ${rowDensity==='comfortable'?'active':''}" id="density-comfortable-btn" title="Comfortable density (relaxed rows)" aria-label="Comfortable row density">
              ⊞ Comfortable
            </button>
          </div>

          <!-- Table / Grid Switcher -->
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm ${currentView==='table'?'active':''}" id="view-table-btn" title="Table view" aria-label="Table view">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <button class="btn btn-secondary btn-sm ${currentView==='grid'?'active':''}" id="view-grid-btn" title="Grid view" aria-label="Grid view">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Table / Grid -->
      <div id="inv-content"></div>

      <!-- Floating Batch Selection Actions Bar -->
      <div id="inv-batch-bar" class="batch-actions-bar ${selectedProductIds.size>0?'show':''}">
        <span class="badge badge-primary font-mono font-bold" id="batch-count-badge" style="font-size:11px">
          ${selectedProductIds.size} Selected
        </span>
        <button class="btn btn-primary btn-xs font-bold" onclick="InventoryModule.batchReorder()" aria-label="Bulk reorder selected items">
          ⚡ Bulk Reorder (+25)
        </button>
        <button class="btn btn-secondary btn-xs" onclick="InventoryModule.batchExport()" aria-label="Export selected items to CSV">
          🏷️ Export Selected
        </button>
        <button class="btn btn-secondary btn-xs" onclick="InventoryModule.batchMarkInspected()" aria-label="Mark selected items as inspected">
          📦 Mark Inspected
        </button>
        <button class="btn btn-ghost btn-xs text-muted" onclick="InventoryModule.clearSelection()" aria-label="Clear selection">
          ✕ Clear
        </button>
      </div>

      <!-- Movement History -->
      <div class="card mt-6">
        <div class="card-header">
          <h4 class="card-title">Recent Stock Movements</h4>
          <span class="text-xs text-muted">Last 10 transactions</span>
        </div>
        <div class="card-body" style="padding:0">
          <div class="table-wrapper" style="border:none;border-radius:0">
            <table class="data-table ${rowDensity==='compact'?'table-compact':'table-comfortable'}">
              <thead><tr>
                <th>Time</th><th>Product</th><th>Type</th><th class="col-num">Qty</th><th>Note</th><th>By</th>
              </tr></thead>
              <tbody id="mov-tbody">
                ${renderMovementsHTML()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderTable(container) {
    const products = Utils.filterProducts(Store.get.products(), currentFilters);
    const sorted   = Utils.sortBy(products, sortState.key, sortState.dir);
    const contentEl = Utils.qs('#inv-content', container);
    if (!contentEl) return;

    if (currentView === 'grid') {
      contentEl.innerHTML = renderGridHTML(sorted);
      return;
    }

    const totalItems = sorted.length;
    const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
    const pageProducts = pageSize === 'all' ? sorted : sorted.slice(startIndex, startIndex + pageSize);
    const isAllSelected = pageProducts.length > 0 && pageProducts.every(p => selectedProductIds.has(p.id));

    contentEl.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table ${rowDensity==='compact'?'table-compact':'table-comfortable'}" id="inv-table">
        <thead><tr>
          <th style="width:36px;text-align:center">
            <input type="checkbox" id="inv-select-all" ${isAllSelected?'checked':''} title="Select all on this page" aria-label="Select all products on this page" />
          </th>
          ${thSort('sku','SKU')} ${thSort('name','Product Name')}
          <th>Category</th><th>Zone / Bin</th>
          ${thSort('quantity','Stock')} <th style="min-width:130px">Level</th>
          <th>Reorder Pt.</th><th>Unit Price</th><th>Supplier</th>
          <th class="col-actions">Actions</th>
        </tr></thead>
        <tbody>
          ${pageProducts.length === 0 ? `<tr><td colspan="12"><div class="empty-state"><div class="empty-state-icon">📭</div><h4>No products found</h4><p>Try adjusting filters</p></div></td></tr>` :
            pageProducts.map(p => productRowHTML(p)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Pagination & Density Bar -->
    <div class="pagination-controls">
      <div class="flex items-center gap-3">
        <span>Showing <strong>${totalItems ? startIndex + 1 : 0}–${Math.min(startIndex + pageProducts.length, totalItems)}</strong> of <strong>${totalItems}</strong> items</span>
        <div class="flex items-center gap-1.5 ml-3">
          <span>Rows per page:</span>
          <select id="inv-page-size" class="filter-select" style="padding:2px 8px;font-size:11px;height:26px" aria-label="Rows per page">
            <option value="10" ${pageSize===10?'selected':''}>10</option>
            <option value="25" ${pageSize===25?'selected':''}>25</option>
            <option value="50" ${pageSize===50?'selected':''}>50</option>
            <option value="all" ${pageSize==='all'?'selected':''}>All</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-xs" id="inv-prev-page" ${currentPage<=1?'disabled':''} aria-label="Previous page">
          ◀ Prev
        </button>
        <span>Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
        <button class="btn btn-secondary btn-xs" id="inv-next-page" ${currentPage>=totalPages?'disabled':''} aria-label="Next page">
          Next ▶
        </button>
      </div>
    </div>`;

    // Bind Select All checkbox
    const selectAllEl = document.getElementById('inv-select-all');
    if (selectAllEl) {
      selectAllEl.addEventListener('change', e => {
        const checked = e.target.checked;
        pageProducts.forEach(p => {
          if (checked) selectedProductIds.add(p.id);
          else selectedProductIds.delete(p.id);
        });
        updateBatchBar();
        renderTable(container);
      });
    }

    // Bind Row Checkboxes
    Utils.qsa('.inv-row-checkbox', contentEl).forEach(cb => {
      cb.addEventListener('change', e => {
        const id = e.target.value;
        if (e.target.checked) selectedProductIds.add(id);
        else selectedProductIds.delete(id);
        updateBatchBar();
      });
    });

    // Bind Pagination clicks
    Utils.qs('#inv-prev-page', contentEl)?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderTable(container); }
    });
    Utils.qs('#inv-next-page', contentEl)?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderTable(container); }
    });
    Utils.qs('#inv-page-size', contentEl)?.addEventListener('change', e => {
      pageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
      currentPage = 1;
      renderTable(container);
    });

    // Sort header clicks
    Utils.qsa('.sortable', contentEl).forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'asc'; }
        renderTable(container);
      });
    });
  }

  function updateBatchBar() {
    const bar = document.getElementById('inv-batch-bar');
    const badge = document.getElementById('batch-count-badge');
    if (!bar) return;
    if (selectedProductIds.size > 0) {
      bar.classList.add('show');
      if (badge) badge.textContent = `${selectedProductIds.size} Selected`;
    } else {
      bar.classList.remove('show');
    }
  }

  function clearSelection() {
    selectedProductIds.clear();
    updateBatchBar();
    renderTable(document.getElementById('page-content') || document.body);
  }

  function batchReorder() {
    if (selectedProductIds.size === 0) return;
    selectedProductIds.forEach(id => {
      Store.adjustStock(id, 25, 'Bulk reorder replenishing (+25 units)', 'Veera Govind');
    });
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Bulk Reorder Executed', `Replenished 25 units across ${selectedProductIds.size} selected products`);
    clearSelection();
    Router.dispatch();
  }

  function batchExport() {
    if (selectedProductIds.size === 0) return;
    const selectedProds = Store.get.products().filter(p => selectedProductIds.has(p.id));
    Utils.exportCSV(selectedProds, 'selected_inventory.csv');
    Utils.Toast.success('Export Complete', `Exported ${selectedProds.length} selected items to CSV`);
  }

  function batchMarkInspected() {
    Utils.Toast.info('Inspection Complete', `Marked ${selectedProductIds.size} items verified in cycle count audit`);
    clearSelection();
  }

  function thSort(key, label) {
    const active = sortState.key === key;
    const arrow  = sortState.dir === 'asc' ? '↑' : '↓';
    return `<th class="sortable ${active?'sorted':''}" data-key="${key}">${label}<span class="sort-icon">${active?arrow:'↕'}</span></th>`;
  }

  function productRowHTML(p) {
    const lvl   = Utils.stockLevel(p.quantity, p.maxCapacity);
    const cls   = Utils.stockClass(p.quantity, p.reorderPoint);
    const urgency = cls === 'critical' ? 'stock-critical' : cls === 'low' ? 'stock-low' : 'stock-healthy';
    const isChecked = selectedProductIds.has(p.id);

    return `
    <tr class="${isChecked?'row-selected':''}">
      <td style="text-align:center">
        <input type="checkbox" class="inv-row-checkbox" value="${p.id}" ${isChecked?'checked':''} aria-label="Select product ${Utils.escapeHtml ? Utils.escapeHtml(p.name) : p.name}" />
      </td>
      <td class="col-sku">${p.sku}</td>
      <td><div class="flex items-center gap-2"><span class="font-semibold text-sm" style="color:var(--clr-text)">${p.name}</span></div></td>
      <td><span class="chip">${p.category}</span></td>
      <td><div class="flex items-center gap-2">
        <span class="product-row-zone zone-${p.zone}">${p.zone}</span>
        <span class="font-mono text-xs text-muted">${p.bin}</span>
      </div></td>
      <td class="col-num"><span class="font-mono font-bold" style="color:${cls==='critical'?'var(--clr-danger-text)':cls==='low'?'var(--clr-warning-text)':'var(--clr-text)'}">
        ${Utils.number(p.quantity)}
      </span></td>
      <td>
        <div class="${urgency} stock-bar-wrap">
          <div class="progress flex-1">
            <div class="progress-bar ${cls==='critical'?'danger':cls==='low'?'warning':'success'}" style="width:${lvl}%"></div>
          </div>
          <span class="stock-label">${lvl}%</span>
        </div>
      </td>
      <td class="col-num text-muted">${Utils.number(p.reorderPoint)}</td>
      <td class="col-num">${Utils.currency(p.unitPrice)}</td>
      <td class="text-xs text-muted truncate" style="max-width:120px">${p.supplier}</td>
      <td class="col-actions">
        <button class="btn btn-ghost btn-sm icon-btn" onclick="InventoryModule.openEditModal('${p.id}')" title="Edit" aria-label="Edit ${Utils.escapeHtml ? Utils.escapeHtml(p.name) : p.name}">✏️</button>
        <button class="btn btn-ghost btn-sm icon-btn" onclick="InventoryModule.openAdjustModal('${p.id}')" title="Adjust Stock" aria-label="Adjust stock for ${Utils.escapeHtml ? Utils.escapeHtml(p.name) : p.name}">📊</button>
      </td>
    </tr>`;
  }

  function renderGridHTML(products) {
    if (products.length === 0) return `<div class="empty-state"><div class="empty-state-icon">📭</div><h4>No products found</h4></div>`;
    return `<div class="data-grid data-grid-auto">${products.map(p => {
      const cls = Utils.stockClass(p.quantity, p.reorderPoint);
      const lvl = Utils.stockLevel(p.quantity, p.maxCapacity);
      return `
      <div class="card card-interactive" onclick="InventoryModule.openEditModal('${p.id}')">
        <div class="card-body" style="padding:var(--sp-4)">
          <div class="flex items-center justify-between mb-2">
            <span class="product-row-zone zone-${p.zone}">${p.zone}</span>
            <span class="stock-status-indicator ${cls}"></span>
          </div>
          <div class="font-semibold text-sm mb-1 truncate" title="${p.name}">${p.name}</div>
          <div class="font-mono text-xs text-muted mb-3">${p.sku}</div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-muted">Stock Level</span>
            <span class="font-mono text-xs font-bold" style="color:${cls==='critical'?'var(--clr-danger-text)':cls==='low'?'var(--clr-warning-text)':'var(--clr-success-text)'}">${Utils.number(p.quantity)}</span>
          </div>
          <div class="progress" style="height:6px">
            <div class="progress-bar ${cls==='critical'?'danger':cls==='low'?'warning':'success'}" style="width:${lvl}%"></div>
          </div>
          <div class="flex justify-between mt-2">
            <span class="chip">${p.bin}</span>
            <span class="text-xs text-muted">${Utils.currency(p.unitPrice)}</span>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderMovementsHTML() {
    const mvs = Store.get.movements().slice(0, 10);
    if (mvs.length === 0) return `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">No movements recorded</td></tr>`;
    return mvs.map(m => {
      const product = Store.get.productById(m.productId);
      const typeClass = m.type === 'in' ? 'in' : m.type === 'out' ? 'out' : 'adj';
      const typeLabel = { in:'+IN', out:'−OUT', adj:'ADJ' }[m.type] || m.type;
      return `<tr>
        <td class="font-mono text-xs text-muted">${Utils.formatDateTime(m.date)}</td>
        <td><span class="text-sm font-medium">${product ? product.name : m.productId}</span></td>
        <td><span class="movement-tag ${typeClass}">${typeLabel}</span></td>
        <td class="col-num font-mono font-bold">${m.type === 'adj' && m.quantity < 0 ? '-' : m.type === 'out' ? '-' : '+'}${Math.abs(m.quantity)}</td>
        <td class="text-xs text-muted">${m.note}</td>
        <td class="text-xs text-muted">${m.by}</td>
      </tr>`;
    }).join('');
  }

  function renderSummaryCards(container) {
    const s = Store.get.stockSummary();
    const products = Store.get.products();
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

    const cards = [
      { label:'Total Products', value: s.total, icon:'📦', color: 'var(--clr-primary-light)', sub:`${SeedData.zones.length} zones`, filter:'all' },
      { label:'Healthy Stock',  value: s.healthy, icon:'✅', color: 'var(--clr-success-text)', sub:`${Math.round(s.healthy/s.total*100)}% of catalog`, filter:'healthy' },
      { label:'Low Stock',      value: s.lowStock, icon:'⚠️', color: 'var(--clr-warning-text)', sub:'Below reorder point', filter:'low' },
      { label:'Out of Stock',   value: s.outOfStock, icon:'🚨', color: 'var(--clr-danger-text)', sub:'Needs immediate action', filter:'out' },
    ];

    Utils.setHTML('#inv-summary-cards', cards.map(c => `
      <div class="kpi-card" style="cursor:pointer" onclick="InventoryModule.setFilterStatus('${c.filter}');Router.dispatch()" title="Click to filter by ${c.label}">
        <div class="kpi-icon" style="background:${c.color}1a">${c.icon}</div>
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value" style="color:${c.color}">${c.value}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`).join('') + `
      <div class="kpi-card" style="cursor:default">
        <div class="kpi-icon" style="background:var(--clr-purple)1a">💰</div>
        <div class="kpi-label">Inventory Value</div>
        <div class="kpi-value" style="font-size:1.4rem;color:var(--clr-purple)">${Utils.currency(totalValue)}</div>
        <div class="kpi-sub">On-hand valuation</div>
      </div>`, container);
  }

  // ─── EVENTS ────────────────────────────────────────────────
  function bindEvents(container) {
    const searchInput = Utils.qs('#inv-search', container);
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(e => {
        currentFilters.search = e.target.value;
        currentPage = 1;
        renderTable(container);
      }, 200));
    }

    ['inv-zone-filter','inv-cat-filter','inv-status-filter'].forEach(id => {
      const el = Utils.qs(`#${id}`, container);
      if (!el) return;
      el.addEventListener('change', e => {
        if (id === 'inv-zone-filter')   currentFilters.zone     = e.target.value;
        if (id === 'inv-cat-filter')    currentFilters.category = e.target.value;
        if (id === 'inv-status-filter') currentFilters.status   = e.target.value;
        currentPage = 1;
        renderTable(container);
      });
    });

    Utils.qs('#inv-add-btn', container)?.addEventListener('click', openAddModal);
    Utils.qs('#inv-export-btn', container)?.addEventListener('click', exportInventory);
    Utils.qs('#view-table-btn', container)?.addEventListener('click', () => { currentView = 'table'; renderTable(container); });
    Utils.qs('#view-grid-btn', container)?.addEventListener('click', () => { currentView = 'grid'; renderTable(container); });

    // Density toggle buttons
    Utils.qs('#density-compact-btn', container)?.addEventListener('click', () => {
      rowDensity = 'compact';
      Utils.qs('#density-compact-btn', container)?.classList.add('active');
      Utils.qs('#density-comfortable-btn', container)?.classList.remove('active');
      renderTable(container);
    });
    Utils.qs('#density-comfortable-btn', container)?.addEventListener('click', () => {
      rowDensity = 'comfortable';
      Utils.qs('#density-comfortable-btn', container)?.classList.add('active');
      Utils.qs('#density-compact-btn', container)?.classList.remove('active');
      renderTable(container);
    });
  }

  // ─── MODALS ────────────────────────────────────────────────
  function openAddModal() {
    const zones = SeedData.zones;
    const categories = [...new Set(Store.get.products().map(p=>p.category))].sort();
    Utils.Modal.open('Add New Product', `
      <form id="add-product-form" class="form-grid form-grid-2" style="gap:var(--sp-4)">
        <div class="form-group"><label class="form-label">SKU <span class="required">*</span></label>
          <input name="sku" class="form-control" placeholder="e.g. ELC-MCU-001" required /></div>
        <div class="form-group"><label class="form-label">Product Name <span class="required">*</span></label>
          <input name="name" class="form-control" placeholder="Product name" required /></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select name="category" class="form-control">
            ${categories.map(c=>`<option>${c}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Zone</label>
          <select name="zone" class="form-control">${zones.map(z=>`<option value="${z}">Zone ${z}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Bin Location</label>
          <input name="bin" class="form-control" placeholder="e.g. A-01-02" /></div>
        <div class="form-group"><label class="form-label">Initial Quantity <span class="required">*</span></label>
          <input name="quantity" type="number" class="form-control" min="0" value="0" required /></div>
        <div class="form-group"><label class="form-label">Reorder Point</label>
          <input name="reorderPoint" type="number" class="form-control" min="0" value="10" /></div>
        <div class="form-group"><label class="form-label">Max Capacity</label>
          <input name="maxCapacity" type="number" class="form-control" min="1" value="100" /></div>
        <div class="form-group"><label class="form-label">Unit Price ($)</label>
          <input name="unitPrice" type="number" class="form-control" step="0.01" min="0" value="0.00" /></div>
        <div class="form-group"><label class="form-label">Supplier</label>
          <input name="supplier" class="form-control" placeholder="Supplier name" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Weight (kg)</label>
          <input name="weight" type="number" class="form-control" step="0.01" min="0" value="0.1" /></div>
      </form>`,
      { size:'lg',
        footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
                <button class="btn btn-primary" onclick="InventoryModule.submitAddProduct()">Add Product</button>` }
    );
  }

  function submitAddProduct() {
    const form = document.getElementById('add-product-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form));
    ['quantity','reorderPoint','maxCapacity','unitPrice','weight'].forEach(k => data[k] = parseFloat(data[k])||0);
    Store.addProduct(data);
    Utils.Modal.close();
    Utils.Toast.success('Product Added', `${data.name} added to inventory`);
    Router.dispatch();
  }

  function openEditModal(productId) {
    const p = Store.get.productById(productId);
    if (!p) return;
    const zones = SeedData.zones;
    const categories = [...new Set(Store.get.products().map(p=>p.category))].sort();
    Utils.Modal.open(`Edit — ${p.name}`, `
      <form id="edit-product-form" class="form-grid form-grid-2" style="gap:var(--sp-4)">
        <div class="form-group"><label class="form-label">SKU</label>
          <input name="sku" class="form-control" value="${p.sku}" /></div>
        <div class="form-group"><label class="form-label">Product Name</label>
          <input name="name" class="form-control" value="${Utils.escapeHtml ? Utils.escapeHtml(p.name) : p.name}" /></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select name="category" class="form-control">${categories.map(c=>`<option ${c===p.category?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Zone</label>
          <select name="zone" class="form-control">${zones.map(z=>`<option value="${z}" ${z===p.zone?'selected':''}>Zone ${z}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Bin Location</label>
          <input name="bin" class="form-control" value="${p.bin}" /></div>
        <div class="form-group"><label class="form-label">Quantity</label>
          <input name="quantity" type="number" class="form-control" value="${p.quantity}" /></div>
        <div class="form-group"><label class="form-label">Reorder Point</label>
          <input name="reorderPoint" type="number" class="form-control" value="${p.reorderPoint}" /></div>
        <div class="form-group"><label class="form-label">Max Capacity</label>
          <input name="maxCapacity" type="number" class="form-control" value="${p.maxCapacity}" /></div>
        <div class="form-group"><label class="form-label">Unit Price ($)</label>
          <input name="unitPrice" type="number" class="form-control" step="0.01" value="${p.unitPrice}" /></div>
        <div class="form-group"><label class="form-label">Supplier</label>
          <input name="supplier" class="form-control" value="${p.supplier}" /></div>
      </form>`,
      { size:'lg',
        footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
                <button class="btn btn-primary" onclick="InventoryModule.submitEditProduct('${productId}')">Save Changes</button>` }
    );
  }

  function submitEditProduct(productId) {
    const form = document.getElementById('edit-product-form');
    const data = Object.fromEntries(new FormData(form));
    ['quantity','reorderPoint','maxCapacity','unitPrice','weight'].forEach(k => {
      if (data[k] !== undefined) data[k] = parseFloat(data[k]) || 0;
    });
    Store.updateProduct(productId, data);
    Utils.Modal.close();
    Utils.Toast.success('Product Updated', 'Changes saved successfully');
    Router.dispatch();
  }

  function openAdjustModal(productId) {
    const p = Store.get.productById(productId);
    if (!p) return;
    Utils.Modal.open(`Adjust Stock — ${p.name}`, `
      <div class="kv-list mb-4">
        <div class="kv-item"><span class="kv-key">Current Stock</span><span class="kv-val font-mono">${Utils.number(p.quantity)} units</span></div>
        <div class="kv-item"><span class="kv-key">Reorder Point</span><span class="kv-val font-mono">${Utils.number(p.reorderPoint)} units</span></div>
        <div class="kv-item"><span class="kv-key">Max Capacity</span><span class="kv-val font-mono">${Utils.number(p.maxCapacity)} units</span></div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Adjustment Type</label>
        <select id="adj-type" class="form-control">
          <option value="set">Set absolute quantity</option>
          <option value="add">Add to current stock</option>
          <option value="sub">Subtract from current stock</option>
        </select>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Quantity</label>
        <input id="adj-qty" type="number" class="form-control" min="0" value="0" />
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input id="adj-note" class="form-control" placeholder="e.g. Cycle count correction, Damage write-off…" />
      </div>`,
      { footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
                <button class="btn btn-primary" onclick="InventoryModule.submitAdjustStock('${productId}')">Apply Adjustment</button>` }
    );
  }

  function submitAdjustStock(productId) {
    const type  = document.getElementById('adj-type')?.value;
    const qty   = parseInt(document.getElementById('adj-qty')?.value) || 0;
    const note  = document.getElementById('adj-note')?.value || 'Manual adjustment';
    const p = Store.get.productById(productId);
    if (!p) return;
    let newQty = p.quantity;
    if (type === 'set') newQty = qty;
    else if (type === 'add') newQty = p.quantity + qty;
    else if (type === 'sub') newQty = Math.max(0, p.quantity - qty);
    Store.updateProduct(productId, { quantity: newQty });
    Store.addMovement({ productId, type: newQty > p.quantity ? 'in' : 'adj',
                        quantity: Math.abs(newQty - p.quantity), note, by:'System' });
    Utils.Modal.close();
    Utils.Toast.success('Stock Adjusted', `${p.name}: ${p.quantity} → ${newQty}`);
    Router.dispatch();
  }

  // ─── EXPORT ────────────────────────────────────────────────
  function exportInventory() {
    const products = Store.get.products().map(p => ({
      ID:p.id, SKU:p.sku, Name:p.name, Category:p.category,
      Zone:p.zone, Bin:p.bin, Quantity:p.quantity,
      ReorderPoint:p.reorderPoint, MaxCapacity:p.maxCapacity,
      UnitPrice:p.unitPrice, Supplier:p.supplier, Status:p.status
    }));
    Utils.exportCSV(products, 'inventory_export.csv');
    Utils.Toast.success('Export Complete', 'inventory_export.csv downloaded');
  }

  return { render, openAddModal, submitAddProduct, openEditModal, submitEditProduct,
           openAdjustModal, submitAdjustStock, batchReorder, batchExport,
           batchMarkInspected, clearSelection, setFilterStatus };
})();
