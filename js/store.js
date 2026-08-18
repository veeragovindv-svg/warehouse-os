/* ============================================================
   WarehouseOS — store.js
   Reactive in-memory state store with LocalStorage persistence
   ============================================================ */

const Store = (() => {
  const STORAGE_KEY = 'warehouseos_state_v2';

  // ─── STATE ─────────────────────────────────────────────────
  let state = {
    products:   [],
    orders:     [],
    staff:      [],
    movements:  [],
    alerts:     [],
    incidents:  [],
    pickTasks:  [],
    dispatches: [],
    settings: {
      theme: 'dark',
      currency: 'USD',
      warehouseName: 'Central Distribution Hub',
    }
  };

  // ─── EVENT EMITTER ─────────────────────────────────────────
  const listeners = {};

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return () => off(event, cb);
  }

  function off(event, cb) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(fn => fn !== cb);
    }
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
    (listeners['*'] || []).forEach(cb => cb({ event, data }));
  }

  // ─── PERSISTENCE ───────────────────────────────────────────
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {

    }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved state with defaults
        state = { ...state, ...parsed };
        return true;
      }
    } catch (e) {

    }
    return false;
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    initFromSeed();
  }

  // ─── INIT ──────────────────────────────────────────────────
  function initFromSeed() {
    state.products   = JSON.parse(JSON.stringify(SeedData.products));
    state.orders     = JSON.parse(JSON.stringify(SeedData.orders));
    state.staff      = JSON.parse(JSON.stringify(SeedData.staff));
    state.movements  = JSON.parse(JSON.stringify(SeedData.movements));
    state.alerts     = JSON.parse(JSON.stringify(SeedData.alerts));
    state.incidents  = JSON.parse(JSON.stringify(SeedData.incidents));
    state.pickTasks  = JSON.parse(JSON.stringify(SeedData.pickTasks));
    state.dispatches = JSON.parse(JSON.stringify(SeedData.dispatches));
    save();
    emit('init', state);
  }

  function init() {
    const hasSaved = load();
    if (!hasSaved || !state.products || state.products.length === 0) {
      initFromSeed();
    } else {
      // Ensure all state arrays are valid and non-empty
      if (!state.products || state.products.length === 0) state.products = JSON.parse(JSON.stringify(SeedData.products));
      if (!state.orders || state.orders.length === 0) state.orders = JSON.parse(JSON.stringify(SeedData.orders));
      if (!state.staff || state.staff.length === 0) state.staff = JSON.parse(JSON.stringify(SeedData.staff));
      if (!state.movements) state.movements = JSON.parse(JSON.stringify(SeedData.movements));
      if (!state.alerts) state.alerts = JSON.parse(JSON.stringify(SeedData.alerts));
      if (!state.incidents) state.incidents = JSON.parse(JSON.stringify(SeedData.incidents));
      if (!state.pickTasks || state.pickTasks.length === 0) state.pickTasks = JSON.parse(JSON.stringify(SeedData.pickTasks));
      if (!state.dispatches || state.dispatches.length === 0) state.dispatches = JSON.parse(JSON.stringify(SeedData.dispatches));
      save();
      emit('init', state);
    }
    // Auto-check alerts on startup
    setTimeout(checkAutoAlerts, 100);
  }

  // ─── GETTERS ───────────────────────────────────────────────
  const get = {
    products()   { return state.products; },
    orders()     { return state.orders; },
    staff()      { return state.staff; },
    movements()  { return state.movements; },
    alerts()     { return state.alerts; },
    incidents()  { return state.incidents; },
    pickTasks()  { return state.pickTasks; },
    dispatches() { return state.dispatches; },
    settings()   { return state.settings; },

    productById(id)   { return state.products.find(p => p.id === id); },
    orderById(id)     { return state.orders.find(o => o.id === id); },
    staffById(id)     { return state.staff.find(s => s.id === id); },
    pickTaskById(id)  { return state.pickTasks.find(t => t.id === id); },
    dispatchById(id)  { return state.dispatches.find(d => d.id === id); },
    incidentById(id)  { return state.incidents.find(i => i.id === id); },

    productsByZone(zone) { return state.products.filter(p => p.zone === zone); },
    ordersByStatus(status) { return state.orders.filter(o => o.status === status); },
    openAlerts() { return state.alerts.filter(a => a.status !== 'resolved'); },
    openIncidents() { return state.incidents.filter(i => i.status !== 'resolved'); },

    stockSummary() {
      const total = state.products.length;
      const outOfStock = state.products.filter(p => p.quantity === 0).length;
      const lowStock   = state.products.filter(p => p.quantity > 0 && p.quantity <= p.reorderPoint).length;
      const healthy    = total - outOfStock - lowStock;
      return { total, outOfStock, lowStock, healthy };
    },

    orderSummary() {
      const counts = {};
      ['pending','allocated','picking','packed','dispatched','delivered'].forEach(s => {
        counts[s] = state.orders.filter(o => o.status === s).length;
      });
      counts.total = state.orders.length;
      return counts;
    },

    kpiSummary() {
      const orders = state.orders;
      const dispatched = orders.filter(o => ['dispatched','delivered'].includes(o.status));
      const delivered  = orders.filter(o => o.status === 'delivered');
      const fillRate   = orders.length ? Math.round((dispatched.length / orders.length) * 100) : 0;
      const openAlerts = state.alerts.filter(a => a.status !== 'resolved').length;
      const activeStaff = state.staff.filter(s => s.status === 'active').length;
      const pendingPicks = state.pickTasks.filter(t => t.status !== 'completed').length;
      return { fillRate, dispatched: dispatched.length, delivered: delivered.length,
               openAlerts, activeStaff, pendingPicks, totalOrders: orders.length };
    }
  };

  // ─── PRODUCT ACTIONS ───────────────────────────────────────
  function addProduct(data) {
    const id = 'PRD-' + String(state.products.length + 51).padStart(3,'0');
    const product = { id, ...data, status: 'active',
                      lastRestocked: new Date().toISOString().slice(0,10) };
    state.products.push(product);
    addMovement({ productId: id, type: 'in', quantity: data.quantity,
                  note: 'Initial stock entry', by: 'System' });
    checkAutoAlerts();
    save();
    emit('products:changed', state.products);
    return product;
  }

  function updateProduct(id, data) {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const old = state.products[idx];
    state.products[idx] = { ...old, ...data };
    if (data.quantity !== undefined && data.quantity !== old.quantity) {
      const diff = data.quantity - old.quantity;
      addMovement({ productId: id, type: diff > 0 ? 'in' : 'adj',
                    quantity: Math.abs(diff), note: 'Manual stock adjustment', by: 'System' });
      checkAutoAlerts();
    }
    save();
    emit('products:changed', state.products);
    return state.products[idx];
  }
  /** @param {string} productId - Product ID @param {number} delta - Quantity change (negative for deductions) @param {string} note - Reason description @param {string} by - Operator name */
  function adjustStock(productId, delta, note = 'Adjustment', by = 'System') {
    const product = get.productById(productId);
    if (!product) return;
    const newQty = Math.max(0, product.quantity + delta);
    updateProduct(productId, { quantity: newQty });
    addMovement({ productId, type: delta > 0 ? 'in' : 'out',
                  quantity: Math.abs(delta), note, by });
  }

  // ─── MOVEMENT ACTIONS ──────────────────────────────────────
  function addMovement(data) {
    const id = 'MOV-' + String(Date.now()).slice(-6);
    const mv = { id, ...data, date: new Date().toISOString() };
    state.movements.unshift(mv);
    if (state.movements.length > 200) state.movements = state.movements.slice(0,200);
    save();
    emit('movements:changed', state.movements);
    return mv;
  }

  // ─── ORDER ACTIONS ─────────────────────────────────────────
  /** @param {Object} data - Order data including customer, priority, items array @returns {Object} Created order record with pending status */
  function addOrder(data) {
    const num = state.orders.length + 1;
    const id = 'ORD-' + String(num).padStart(3,'0');
    const order = {
      id, status: 'pending', carrier: null, trackingId: null, dispatchedAt: null,
      createdAt: new Date().toISOString(),
      ...data
    };
    order.items = order.items.map(item => ({ ...item, allocated: 0 }));
    state.orders.unshift(order);
    save();
    emit('orders:changed', state.orders);
    return order;
  }

  function updateOrderStatus(orderId, status) {
    const order = get.orderById(orderId);
    if (!order) return;
    order.status = status;
    if (status === 'dispatched') {
      order.dispatchedAt = new Date().toISOString();
    }
    save();
    emit('orders:changed', state.orders);
    emit('order:status:changed', { orderId, status });
    return order;
  }

  function executeDecision(decisionType, payload = {}) {
    if (decisionType === 'reallocate_priority') {
      // Reclaim stock from lower priority order and assign to urgent order
      const targetOrder = get.orderById(payload.urgentOrderId || 'ORD-001');
      const donorOrder  = get.orderById(payload.donorOrderId || 'ORD-004');
      const product     = state.products.find(p => p.sku === (payload.sku || 'ELC-MCU-001')) || state.products[0];

      if (targetOrder && product) {
        // Boost stock in bin for urgent order
        product.quantity = Math.max(product.quantity, 10);
        targetOrder.status = 'allocated';
        targetOrder.items.forEach(i => { i.allocated = i.quantity; });

        if (donorOrder) {
          donorOrder.status = 'pending';
        }

        // Create picking task for urgent order
        const taskId = 'PCK-' + String(Date.now()).slice(-5);
        state.pickTasks.unshift({
          id: taskId,
          orderId: targetOrder.id,
          assignedTo: 'Marcus Vance (Priority AGV)',
          status: 'assigned',
          createdAt: new Date().toISOString(),
          items: targetOrder.items.map(i => ({ ...i, picked: false }))
        });

        addMovement({
          productId: product.id,
          type: 'adj',
          quantity: 3,
          note: `Autonomous AI Decision: Reallocated 3 units from ${donorOrder ? donorOrder.id : 'Low Priority'} -> ${targetOrder.id} (VIP Urgent)`,
          by: 'AI Engine'
        });

        save();
        emit('orders:changed', state.orders);
        emit('products:changed', state.products);
        emit('pickTasks:changed', state.pickTasks);
        return { success: true, message: `Reallocated stock to urgent order ${targetOrder.id} (100% fulfilled)` };
      }
    } else if (decisionType === 'split_shipment') {
      const targetOrder = get.orderById(payload.urgentOrderId || 'ORD-001');
      if (targetOrder) {
        targetOrder.status = 'allocated';
        targetOrder.items.forEach(i => { i.allocated = Math.min(i.quantity, 7); });
        save();
        emit('orders:changed', state.orders);
        return { success: true, message: `Split-shipment generated (7 units shipped, 3 units auto-backordered)` };
      }
    } else if (decisionType === 'cross_zone_transfer') {
      const product = state.products.find(p => p.sku === (payload.sku || 'ELC-MCU-001')) || state.products[0];
      if (product) {
        product.quantity += 5;
        save();
        emit('products:changed', state.products);
        return { success: true, message: `Transferred 5 units from Zone E High-Value Buffer to Zone A Bin A02` };
      }
    }
    return { success: false, message: 'Invalid decision payload' };
  }

  function updateOrder(orderId, data) {
    const idx = state.orders.findIndex(o => o.id === orderId);
    if (idx === -1) return null;
    state.orders[idx] = { ...state.orders[idx], ...data };
    save();
    emit('orders:changed', state.orders);
    return state.orders[idx];
  }

  // ─── ALLOCATION ────────────────────────────────────────────
  function allocateOrder(orderId) {
    const order = get.orderById(orderId);
    if (!order || order.status !== 'pending') return { success: false, reason: 'Order not pending' };

    let allFullyAllocated = true;
    const changes = [];

    for (const item of order.items) {
      const product = get.productById(item.productId);
      if (!product) { allFullyAllocated = false; continue; }

      const canAllocate = Math.min(product.quantity, item.quantity - item.allocated);
      if (canAllocate > 0) {
        item.allocated += canAllocate;
        product.quantity -= canAllocate;
        changes.push({ productId: item.productId, qty: canAllocate });
      }
      if (item.allocated < item.quantity) allFullyAllocated = false;
    }

    if (changes.length > 0) {
      changes.forEach(c => {
        addMovement({ productId: c.productId, type: 'out',
                      quantity: c.qty, note: `Allocated to ${orderId}`, by: 'System' });
      });
      order.status = allFullyAllocated ? 'allocated' : 'allocated'; // partial still allocated
      checkAutoAlerts();
      save();
      emit('orders:changed', state.orders);
      emit('products:changed', state.products);

      // Create pick task
      if (!state.pickTasks.find(t => t.orderId === orderId)) {
        createPickTask(order);
      }

      return { success: true, partial: !allFullyAllocated, changes };
    }

    return { success: false, reason: 'No stock available for any item' };
  }

  function allocateAll() {
    const pending = state.orders.filter(o => o.status === 'pending');
    const results = pending.map(o => ({ orderId: o.id, ...allocateOrder(o.id) }));
    return results;
  }

  // ─── PICK TASK ACTIONS ─────────────────────────────────────
  function createPickTask(order) {
    const id = 'PCK-' + String(state.pickTasks.length + 1).padStart(3,'0');
    const task = {
      id, orderId: order.id,
      assignedTo: null, status: 'pending',
      items: order.items.filter(i => i.allocated > 0).map(i => {
        const p = get.productById(i.productId);
        return { productId: i.productId, sku: i.sku, name: i.name,
                 zone: p ? p.zone : '?', bin: p ? p.bin : '?',
                 quantity: i.allocated, picked: false };
      }),
      startedAt: null, completedAt: null
    };
    // Sort items by zone then bin for optimal route
    task.items.sort((a, b) => a.zone.localeCompare(b.zone) || a.bin.localeCompare(b.bin));
    state.pickTasks.push(task);
    save();
    emit('pickTasks:changed', state.pickTasks);
    return task;
  }

  function assignPickTask(taskId, staffId) {
    const task = get.pickTaskById(taskId);
    if (!task) return;
    task.assignedTo = staffId;
    if (task.status === 'pending') task.status = 'pending';
    save();
    emit('pickTasks:changed', state.pickTasks);
    return task;
  }

  function startPickTask(taskId) {
    const task = get.pickTaskById(taskId);
    if (!task) return;
    task.status = 'in_progress';
    task.startedAt = new Date().toISOString();
    save();
    emit('pickTasks:changed', state.pickTasks);
  }

  function markItemPicked(taskId, productId) {
    const task = get.pickTaskById(taskId);
    if (!task) return;
    const item = task.items.find(i => i.productId === productId);
    if (item) {
      item.picked = !item.picked;
      if (task.status === 'pending') startPickTask(taskId);
      // Check if all picked
      if (task.items.every(i => i.picked)) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        updateOrderStatus(task.orderId, 'packed');
        emit('order:packed', task.orderId);
        // Update staff stats
        const staff = get.staffById(task.assignedTo);
        if (staff) { staff.tasksCompleted++; }
      }
      save();
      emit('pickTasks:changed', state.pickTasks);
    }
    return task;
  }

  // ─── ALERT ACTIONS ─────────────────────────────────────────
  /** @param {Object} data - Alert data including type, severity, title, message @returns {Object} Created alert with active status */
  function addAlert(data) {
    // Deduplicate: don't add same type+productId if already open
    const existing = state.alerts.find(a =>
      a.type === data.type && a.productId === data.productId && a.status !== 'resolved'
    );
    if (existing) return existing;

    const id = 'ALT-' + String(Date.now()).slice(-6);
    const alert = { id, status: 'open', acknowledgedBy: null, resolvedAt: null,
                    createdAt: new Date().toISOString(), ...data };
    state.alerts.unshift(alert);
    if (state.alerts.length > 100) state.alerts = state.alerts.slice(0,100);
    save();
    emit('alerts:changed', state.alerts);
    return alert;
  }

  function acknowledgeAlert(alertId, staffId = 'ST-001') {
    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) { alert.status = 'acknowledged'; alert.acknowledgedBy = staffId; }
    save();
    emit('alerts:changed', state.alerts);
  }

  function resolveAlert(alertId) {
    const alert = state.alerts.find(a => a.id === alertId);
    if (alert) { alert.status = 'resolved'; alert.resolvedAt = new Date().toISOString(); }
    save();
    emit('alerts:changed', state.alerts);
  }

  function checkAutoAlerts() {
    state.products.forEach(p => {
      if (p.quantity === 0) {
        addAlert({ type:'stockout', severity:'critical', productId:p.id, sku:p.sku,
                   productName:p.name, message:`${p.name} is out of stock`,
                   quantity:0, threshold:p.reorderPoint });
      } else if (p.quantity <= p.reorderPoint) {
        addAlert({ type:'low_stock', severity:'warning', productId:p.id, sku:p.sku,
                   productName:p.name, message:`${p.name} is below reorder point (${p.quantity}/${p.reorderPoint})`,
                   quantity:p.quantity, threshold:p.reorderPoint });
      }
    });
    emit('alerts:changed', state.alerts);
  }

  // ─── INCIDENT ACTIONS ──────────────────────────────────────
  function addIncident(data) {
    const id = 'INC-' + String(state.incidents.length + 1).padStart(3,'0');
    const incident = { id, status: 'open', resolvedAt: null, stockAdjusted: false,
                       createdAt: new Date().toISOString(), ...data };
    state.incidents.unshift(incident);
    // Auto-add alert
    addAlert({ type: data.type, severity: 'warning', productId: data.productId,
               sku: data.sku, productName: data.productName,
               message: `${data.type === 'damaged' ? 'Damaged' : 'Missing'}: ${data.quantity} × ${data.productName} in ${data.bin}`,
               quantity: data.quantity, threshold: 0 });
    save();
    emit('incidents:changed', state.incidents);
    return incident;
  }

  function updateIncident(id, data) {
    const idx = state.incidents.findIndex(i => i.id === id);
    if (idx === -1) return null;
    state.incidents[idx] = { ...state.incidents[idx], ...data };
    if (data.status === 'resolved') {
      state.incidents[idx].resolvedAt = new Date().toISOString();
      if (!state.incidents[idx].stockAdjusted) {
        adjustStock(state.incidents[idx].productId, -state.incidents[idx].quantity,
                    `Incident ${id} resolved — stock adjusted`, 'System');
        state.incidents[idx].stockAdjusted = true;
      }
    }
    save();
    emit('incidents:changed', state.incidents);
    return state.incidents[idx];
  }

  // ─── DISPATCH ACTIONS ──────────────────────────────────────
  function createDispatch(orderId, carrier) {
    const order = get.orderById(orderId);
    if (!order) return null;
    const carriers = { FedEx: 'FX', UPS: '1Z-UPS', DHL: 'DHL', Local: 'LOC' };
    const prefix = carriers[carrier] || 'TRK';
    const trackingId = `${prefix}-${Math.random().toString(36).substr(2,9).toUpperCase()}`;
    const id = 'DSP-' + String(state.dispatches.length + 1).padStart(3,'0');
    const dispatch = {
      id, orderId, carrier, trackingId, status: 'scheduled',
      scheduledDate: new Date().toISOString(),
      dispatchedAt: null, deliveredAt: null, labelPrinted: false
    };
    state.dispatches.push(dispatch);
    updateOrder(orderId, { carrier, trackingId });
    save();
    emit('dispatches:changed', state.dispatches);
    return dispatch;
  }

  function dispatchOrder(dispatchId) {
    const dispatch = get.dispatchById(dispatchId);
    if (!dispatch) return;
    dispatch.status = 'picked_up';
    dispatch.dispatchedAt = new Date().toISOString();
    dispatch.labelPrinted = true;
    updateOrderStatus(dispatch.orderId, 'dispatched');
    save();
    emit('dispatches:changed', state.dispatches);
    return dispatch;
  }

  function updateDispatchStatus(dispatchId, status) {
    const dispatch = get.dispatchById(dispatchId);
    if (!dispatch) return;
    dispatch.status = status;
    if (status === 'delivered') {
      dispatch.deliveredAt = new Date().toISOString();
      updateOrderStatus(dispatch.orderId, 'delivered');
    }
    save();
    emit('dispatches:changed', state.dispatches);
    return dispatch;
  }

  // ─── STAFF ACTIONS ─────────────────────────────────────────
  /** @param {Object} data - Staff member data including name, role, zone, status @returns {Object} Created staff member record */
  function addStaff(data) {
    const id = 'ST-' + String(state.staff.length + 1).padStart(3, '0');
    const initials = data.name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';
    const member = {
      id,
      name: data.name,
      initials,
      role: data.role || 'Picker',
      zone: data.zone || 'A',
      tasksCompleted: parseInt(data.tasksCompleted) || 0,
      accuracy: parseFloat(data.accuracy) || 99.0,
      avgPickTime: parseFloat(data.avgPickTime) || 4.0,
      status: data.status || 'active',
      shift: data.shift || 'Morning (06:00 - 14:00)',
      accessLevel: data.accessLevel || 'Operator',
      addedAt: new Date().toISOString()
    };
    state.staff.push(member);
    save();
    emit('staff:changed', state.staff);
    return member;
  }

  function updateStaff(id, data) {
    const idx = state.staff.findIndex(s => s.id === id);
    if (idx === -1) return null;
    state.staff[idx] = { ...state.staff[idx], ...data };
    save();
    emit('staff:changed', state.staff);
    return state.staff[idx];
  }

  function setStaffStatus(id, status) {
    return updateStaff(id, { status });
  }

  function deleteStaff(id) {
    state.staff = state.staff.filter(s => s.id !== id);
    save();
    emit('staff:changed', state.staff);
    return true;
  }

  // ─── PUBLIC API ────────────────────────────────────────────
  return {
    init, reset, save, load,
    on, off, emit,
    get,
    addProduct, updateProduct, adjustStock,
    addMovement,
    addOrder, updateOrder, updateOrderStatus,
    allocateOrder, allocateAll, executeDecision,
    createPickTask, assignPickTask, startPickTask, markItemPicked,
    addAlert, acknowledgeAlert, resolveAlert, checkAutoAlerts,
    addIncident, updateIncident,
    createDispatch, dispatchOrder, updateDispatchStatus,
    addStaff, updateStaff, setStaffStatus, deleteStaff,
  };
})();
